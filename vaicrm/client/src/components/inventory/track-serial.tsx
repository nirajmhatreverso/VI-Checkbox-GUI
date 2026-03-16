// src/components/track-serial/TrackSerial.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Download, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// ---------- API Data Types ----------

type Place = {
  id: string;
  plant: string;
  sloc: string;
  baseType: string;
  schemaLocation?: string;
  type: string;
  referredType?: string;
};

type RelatedParty = {
  SoldToParty?: string;
  ShipToParty?: string | null;
};

type StockSerialItem = {
  id: string; // MAT ID (e.g. 59)
  href?: string;
  creationDate: string; // YYYYMMDD
  description: string;
  lastInventoryDate?: string;
  lastUpdate?: string;
  name: string;
  stockLevelCategory: string;
  place: Place;
  productStockStatusType: string;
  relatedParty: RelatedParty;
  baseType?: string;
  type?: string;
  channel?: {
    DebitCredit?: string;
  };
};

// Type used for the UI Table
type SearchResult = {
  id: string;
  creationDate?: string;
  description?: string;
  name?: string;
  stockLevelCategory?: string;
  serialNumber: string;
  materialName: string;
  documentNo?: string;
  businessPartner?: string;
  plant?: string;
  sloc?: string;
  debitCredit?: string;
};

// --- Helper Functions ---

function parseDateString(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("T") || dateStr.includes("-")) return dateStr;

  // Handle YYYYMMDD
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`).toISOString();
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

// Format for display
const formatCreationDate = (d?: string) => {
  if (!d) return "N/A";
  const iso = parseDateString(d);
  if (!iso) return d;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
};

export default function TrackSerial() {
  const [serialSearchTerm, setSerialSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  // Added state to track whether user explicitly clicked "Track"
  const [hasSearched, setHasSearched] = useState(false);
  // Message to show when search completed but no results (separate from apiError)
  const [noResultsMessage, setNoResultsMessage] = useState<string>("");

  const handleSearch = async () => {
    const q = serialSearchTerm.trim();
    if (!q) return;

    // Mark that a user-initiated search happened
    setHasSearched(true);
    setIsSearching(true);
    setApiError("");
    setNoResultsMessage("");
    setSearchResults([]);

    try {
      // Call API (Payload: { "material": "..." })
      const response = await apiRequest('/inventory/track-serial-no', 'POST', {
        material: q
      });

      // Check for 'SerialHistory' in data
      if (response.status === "SUCCESS" && response.data?.SerialHistory && Array.isArray(response.data.SerialHistory) && response.data.SerialHistory.length > 0) {
        const apiList = response.data.SerialHistory as StockSerialItem[];

        const mappedResults: SearchResult[] = apiList.map((item) => {
          return {
            id: item.id, // MAT ID
            creationDate: item.creationDate,
            description: item.description,
            name: item.name, // Movement Name
            stockLevelCategory: item.stockLevelCategory, // Movement ID
            serialNumber: item.place?.id || "N/A",
            materialName: item.place?.type || "N/A",
            documentNo: item.place?.baseType || item.baseType || "N/A",
            businessPartner: item.relatedParty?.SoldToParty || "N/A",
            plant: item.place?.plant || "N/A",
            sloc: item.place?.sloc || "N/A",
            debitCredit: item.channel?.DebitCredit || "N/A",
          };
        });

        mappedResults.sort((a, b) => {
          const dateA = new Date(parseDateString(a.creationDate || "")).getTime();
          const dateB = new Date(parseDateString(b.creationDate || "")).getTime();
          return dateB - dateA;
        });

        setSearchResults(mappedResults);
        setNoResultsMessage("");
      } else {
        // If API returned success but no serial history, surface a friendly "no results" message
        if (response.status === "SUCCESS") {
          setSearchResults([]);
          setNoResultsMessage(response.statusMessage || `No history found for serial number "${q}"`);
          setApiError("");
        } else {
          // Non-success -> show api error card
          setSearchResults([]);
          setApiError(response.statusMessage || "No records found");
          setNoResultsMessage("");
        }
      }
    } catch (error: any) {
      setSearchResults([]);
      setNoResultsMessage("");
      setApiError(error?.statusMessage || error?.message || "An error occurred while searching");
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportCSV = () => {
    if (searchResults.length === 0) return;

    const headers = [
      "Serial Number",
      "Material Name",
      "Document No.",
      "MAT ID",
      "Creation Date",
      "Movement Name",
      "Movement ID",
      "Business Partner",
      "Plant",
      "SLOC",
      "Debit/Credit"
    ];

    const rows = searchResults.map((result) => [
      result.serialNumber,
      result.materialName,
      result.documentNo,
      result.id,
      formatCreationDate(result.creationDate),
      result.name || "N/A",
      result.stockLevelCategory || "N/A",
      result.businessPartner || "N/A",
      result.plant || "N/A",
      result.sloc || "N/A",
      result.debitCredit || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `serial-tracking-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Debounce search input
  useEffect(() => {
    if (!serialSearchTerm.trim()) {
      // When user clears the input, reset to initial state (no explicit search)
      setSearchResults([]);
      setApiError("");
      setNoResultsMessage("");
      setHasSearched(false);
      return;
    }
    const timeout = setTimeout(() => {
      // Optional: Auto search logic could go here (intentionally left empty to prevent auto-search)
    }, 350);
    return () => clearTimeout(timeout);
  }, [serialSearchTerm]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Serial Number Tracking</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Track inventory items and their movement history
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white border border-blue-200 rounded-lg p-2 shadow-sm">
        <div className="flex flex-row items-center gap-3 w-auto">
          <div className="relative w-auto max-w-xs">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <Input
              id="serialSearch"
              value={serialSearchTerm}
              onChange={(e) => setSerialSearchTerm(e.target.value)}
              placeholder="Enter serial number..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoComplete="off"
              className="pl-8 pr-10 bg-gray-50 border border-gray-300 focus:border-blue-400"
              aria-label="Serial Number Search"
            />
            {serialSearchTerm && (
              <button
                type="button"
                aria-label="Clear"
                className="absolute right-2 top-0 text-gray-400 hover:text-gray-600 h-full px-2"
                onClick={() => {
                  setSerialSearchTerm("");
                  setSearchResults([]);
                  setApiError("");
                  setNoResultsMessage("");
                  setHasSearched(false);
                }}
              >
                ×
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            disabled={isSearching || !serialSearchTerm.trim()}
            className="bg-azam-blue hover:bg-azam-blue/90 min-w-[90px] h-9"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <LoaderSpinner />
                Searching...
              </span>
            ) : (
              "Track"
            )}
          </Button>
        </div>
      </div>

      {/* API Error Message */}
      {apiError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">Search Error</p>
                <p className="text-red-700 text-sm">{apiError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results (Table View) */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Search Results ({searchResults.length})</CardTitle>
              <Button
                onClick={handleExportCSV}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">Serial Number</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Material Name</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">Document No.</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">MAT ID</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">Creation Date</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Movement Name</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Movement ID</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Business Partner</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Plant</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">SLOC</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Debit/Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((result, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-mono text-gray-900 font-medium">{result.serialNumber}</td>
                      <td className="px-4 py-2 text-gray-700">{result.materialName}</td>
                      <td className="px-4 py-2 font-mono text-gray-700">{result.documentNo}</td>
                      <td className="px-4 py-2 font-mono text-gray-700">{result.id}</td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatCreationDate(result.creationDate)}</td>
                      <td className="px-4 py-2 text-gray-700">{result.name}</td>
                      <td className="px-4 py-2 font-mono text-gray-700">{result.stockLevelCategory || "N/A"}</td>
                      <td className="px-4 py-2 text-gray-700 text-xs">{result.businessPartner}</td>
                      <td className="px-4 py-2 text-gray-700">{result.plant}</td>
                      <td className="px-4 py-2 text-gray-700">{result.sloc}</td>
                      <td className="px-4 py-2 text-gray-700">{result.debitCredit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                    <div>
                      <span className="text-xs text-gray-500 block">Serial Number</span>
                      <span className="font-mono font-medium text-blue-700 break-all">{result.serialNumber}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs text-gray-500 block">Date</span>
                      <span className="text-sm font-medium">{formatCreationDate(result.creationDate)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500 block">Material</span>
                      <span className="text-gray-900 font-medium">{result.materialName}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">MAT ID</span>
                      <span className="font-mono text-gray-700">{result.id}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">Document No.</span>
                      <span className="font-mono text-gray-700 break-all">{result.documentNo}</span>
                    </div>

                    <div className="col-span-2 bg-white p-2 rounded border border-gray-100">
                      <span className="text-xs text-gray-500 block">Movement</span>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-medium">{result.name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">{result.stockLevelCategory || "N/A"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">Location</span>
                      <span className="text-gray-700">{result.plant} / {result.sloc}</span>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 block">Debit/Credit</span>
                      <span className={`font-medium ${result.debitCredit === 'S' ? 'text-green-600' : result.debitCredit === 'H' ? 'text-red-600' : 'text-gray-700'}`}>
                        {result.debitCredit || "N/A"}
                      </span>
                    </div>

                    {result.businessPartner && result.businessPartner !== "N/A" && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 block">Business Partner</span>
                        <span className="text-gray-700 text-xs">{result.businessPartner}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State / Initial State */}
      {!serialSearchTerm && !isSearching && searchResults.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2 text-yellow-600" />
              Serial History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Enter a serial number above to view tracking details.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Found State */}
      {hasSearched && !isSearching && searchResults.length === 0 && !apiError && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">
              {noResultsMessage ? noResultsMessage : `No history found for serial number "${serialSearchTerm}"`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoaderSpinner() {
  return <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>;
}
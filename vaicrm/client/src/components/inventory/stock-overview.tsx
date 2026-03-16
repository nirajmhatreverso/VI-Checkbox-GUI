import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, RefreshCw, Warehouse, Store, Loader2, Info, Eye, Download, Globe, Search } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useHwProducts, usePlants, useStockDetails, useStockSerialDetailsMutation, useStoreLocationsByPlant, type SerialDetail } from "@/hooks/use-inventory-data";
import { useCountries } from "@/hooks/use-center-data";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

type StockOverviewItem = {
  id: string;
  name: string;
  description: string;
  maxStockLevel: { unit: string; };
  place: { plant: string; sloc: string; };
  productStockStatusType: string;
};

type HwProduct = { productId: string; productName: string; };

const statusToBadgeVariant = (status?: string): "success" | "warning" | "danger" | "muted" => {
  const s = String(status || "").toLowerCase();
  if (s === 'available') return "success";
  if (s === 'allocated') return "warning";
  if (s === 'faulty' || s === 'damaged') return "danger";
  return "muted";
};

export default function StockOverview() {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedStoreLocation, setSelectedStoreLocation] = useState("all");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockOverviewItem | null>(null);

  // New state for serial search
  const [serialSearchQuery, setSerialSearchQuery] = useState("");

  const serialDetailsMutation = useStockSerialDetailsMutation();

  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { data: plants, isLoading: plantsLoading } = usePlants();

  const { data: storeLocations, isLoading: storeLocationsLoading } = useStoreLocationsByPlant(selectedPlant);

  const { data: hwProducts = [], isLoading: hwProductsLoading } = useHwProducts();

  // --- Deduplication Logic ---

  const uniqueCountries = useMemo(() => {
    if (!countries) return [];
    const seen = new Map<string, any>();
    countries.forEach((country: any) => { if (typeof country.country === 'string' && country.country && !seen.has(country.country)) { seen.set(country.country, country); } });
    return Array.from(seen.values());
  }, [countries]);

  const uniquePlants = useMemo(() => {
    if (!plants) return [];
    const seen = new Map<string, any>();
    plants.forEach((plant: any) => { if (plant?.plant && !seen.has(plant.plant)) { seen.set(plant.plant, plant); } });
    return Array.from(seen.values());
  }, [plants]);

  const uniqueStoreLocations = useMemo(() => {
    if (!storeLocations) return [];
    const seen = new Map<string, any>();
    storeLocations.forEach((loc: any) => { const key = loc.code; if (typeof key === 'string' && key && !seen.has(key)) { seen.set(key, loc); } });
    return Array.from(seen.values());
  }, [storeLocations]);

  const uniqueMaterials = useMemo(() => {
    if (!hwProducts) return [];
    const seen = new Set();
    return hwProducts.filter((p: any) => {
      const id = String(p.productId);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [hwProducts]);


  const { data: inventory = [], isLoading: stockLoading, refetch, isFetching } = useStockDetails({
    plant: selectedPlant,
    material: selectedMaterial,
    storageLocation: selectedStoreLocation === "all" ? "" : selectedStoreLocation,
  });

  // Filter out items with stock quantity of 0
  const filteredInventory = useMemo(() => {
    return inventory.filter((item: StockOverviewItem) => {
      const stockQty = parseInt(item.maxStockLevel?.unit || "0", 10);
      return stockQty > 0;
    });
  }, [inventory]);

  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedPlant("");
    setSelectedStoreLocation("all");
    setCurrentPage(1);
  };
  const handlePlantChange = (value: string) => {
    setSelectedPlant(value);
    setSelectedStoreLocation("all");
    setCurrentPage(1);
  };
  const handleMaterialChange = (value: string) => { setSelectedMaterial(value); setCurrentPage(1); };
  const handleStoreLocationChange = (value: string) => { setSelectedStoreLocation(value); setCurrentPage(1); };

  const openDetailModal = (item: StockOverviewItem) => {
    setSerialSearchQuery(""); // Reset search query when opening modal
    setSelectedItem(item);
    setDetailModalOpen(true);

    serialDetailsMutation.mutate({
      itemId: item.id,
      plant: selectedPlant,
      material: selectedMaterial,
      storageLocation: item.place?.sloc || (selectedStoreLocation === "all" ? undefined : selectedStoreLocation),
    });
  };

  // Auto-select single options
  useEffect(() => {
    if (uniqueCountries.length === 1 && !selectedCountry) {
      setSelectedCountry(uniqueCountries[0].country);
      setSelectedPlant("");
      setSelectedStoreLocation("all");
      setCurrentPage(1);
    }
  }, [uniqueCountries, selectedCountry]);

  useEffect(() => {
    if (uniquePlants.length === 1 && !selectedPlant) {
      setSelectedPlant(uniquePlants[0].plant);
      setSelectedStoreLocation("all");
      setCurrentPage(1);
    }
  }, [uniquePlants, selectedPlant]);

  useEffect(() => {
    if (uniqueMaterials.length === 1 && !selectedMaterial) {
      setSelectedMaterial(uniqueMaterials[0].productId);
      setCurrentPage(1);
    }
  }, [uniqueMaterials, selectedMaterial]);

  const uniqueSerialDetails = useMemo(() => {
    if (!serialDetailsMutation.data) return [];
    const seen = new Set();
    return serialDetailsMutation.data.filter((row: SerialDetail) => {
      const id = String(row.placeId || "");
      // If there is no serial number (placeId is empty), we might want to keep it or unique-ify it. 
      // Assuming we want to filter out exact duplicate serial strings.
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [serialDetailsMutation.data]);

  // Filtered list based on search query
  const filteredSerialDetails = useMemo(() => {
    if (!uniqueSerialDetails) return [];
    if (!serialSearchQuery.trim()) return uniqueSerialDetails;

    const query = serialSearchQuery.toLowerCase();

    return uniqueSerialDetails.filter((item) => {
      const serialNo = String(item.placeId || "").toLowerCase();
      const mfgSerialNo = String(item.manufacturerSrNo || "").toLowerCase();

      // Search in Serial No OR Manufacturer Serial No
      return serialNo.includes(query) || mfgSerialNo.includes(query);
    });
  }, [uniqueSerialDetails, serialSearchQuery]);

  const exportDetails = (format: "csv") => {
    const dataToExport = uniqueSerialDetails; // Export all data, not just filtered
    if (!dataToExport || dataToExport.length === 0) return;

    const filenameBase = (selectedItem?.name || selectedItem?.id || "stock-details").replace(/[^\w-]/g, "_");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");

    const keys: (keyof SerialDetail)[] = ["matId", "name", "placeId", "plant", "sloc", "manufacturer", "manufacturerSrNo"];
    const header = keys.join(",");
    const rows = dataToExport.map((d) =>
      keys.map((k) => `"${String(d[k] ?? "").replace(/"/g, '""')}"`).join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}-serials-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: DataTableColumn<StockOverviewItem>[] = [
    { key: "name", label: "Product", render: (_: any, item) => (<div><div className="font-medium">{item.name || "N/A"}</div><div className="text-xs text-gray-500">{item.description || "No description"}</div></div>) },
    { key: "maxStockLevel", label: "Stock Qty", render: (_: any, item) => (<span className="font-semibold text-lg text-center block">{item.maxStockLevel?.unit || "0"}</span>), },
    { key: "productStockStatusType", label: "Status", render: (_: any, item) => (<Badge variant={statusToBadgeVariant(item.productStockStatusType)} size="sm">{item.productStockStatusType || "-"}</Badge>), },
    {
      key: "plant" as any,
      label: "Plant",
      render: (_: any, item) => {
        const plantName = uniquePlants.find((p: any) => p.plant === item.place?.plant)?.plantName || "";
        return (
          <div className="font-mono text-sm">
            {plantName ? `${plantName} (${item.place?.plant})` : item.place?.plant || "N/A"}
          </div>
        );
      },
    },
    {
      key: "store" as any,
      label: "Store",
      render: (_: any, item) => {
        const slocName = uniqueStoreLocations.find((l: any) => l.code === item.place?.sloc)?.name || "";
        return (
          <div className="font-mono text-sm text-gray-600">
            {slocName ? `${slocName} (${item.place?.sloc})` : item.place?.sloc || "N/A"}
          </div>
        );
      },
    },
    { key: "action" as any, label: "Action", render: (_: any, item) => (<Button size="xs" variant="outline" onClick={() => openDetailModal(item)}><Eye className="w-4 h-4 mr-1" />View Serials</Button>) }
  ];

  // Helper to extract error message safely
  const getMutationError = () => {
    if (!serialDetailsMutation.isError) return null;
    const error = serialDetailsMutation.error as any;
    // Prioritize statusMessage (from backend JSON), then message (standard Error), then fallback
    const message = error?.statusMessage || error?.message || "An unknown error occurred.";
    const isNotFound = message.toLowerCase().includes("not found") || error?.statusCode === 404;

    return { message, isNotFound };
  };

  const mutationError = getMutationError();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
        <CardContent className="p-4"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><div className="bg-white/10 p-2 rounded-lg"><Package className="h-6 w-6" /></div><div><h1 className="text-xl font-bold">Stock Overview</h1><p className="text-blue-100 text-xs mt-0.5">View aggregated stock levels by material and location</p></div></div><Button size="sm" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" onClick={() => refetch()} disabled={isFetching || (!selectedPlant || !selectedMaterial)}>{isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Refresh</Button></div></CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</label>
              <Select value={selectedCountry} onValueChange={handleCountryChange} disabled={countriesLoading}>
                <SelectTrigger uiSize="sm"><div className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-500" /><SelectValue placeholder={countriesLoading ? "Loading..." : "Select Country"} /></div></SelectTrigger>
                <SelectContent>{uniqueCountries.map((c: any) => <SelectItem key={c.country} value={c.country}>{c.country}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plant</label>
              <Select value={selectedPlant} onValueChange={handlePlantChange} disabled={!selectedCountry || plantsLoading}>
                <SelectTrigger uiSize="sm"><div className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-gray-500" /><SelectValue placeholder={plantsLoading ? "Loading..." : "Select Plant"} /></div></SelectTrigger>
                <SelectContent>{uniquePlants.map((p: any) => <SelectItem key={p.plant} value={p.plant}>{p.plantName} ({p.plant})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Store Location</label>
              <Select value={selectedStoreLocation} onValueChange={handleStoreLocationChange} disabled={!selectedPlant || storeLocationsLoading}>
                <SelectTrigger uiSize="sm"><div className="flex items-center gap-2"><Store className="h-4 w-4 text-gray-500" /><SelectValue placeholder={storeLocationsLoading ? "Loading..." : "All Store Locations"} /></div></SelectTrigger>
                <SelectContent><SelectItem value="all">All Store Locations</SelectItem>{uniqueStoreLocations.map((loc: any) => <SelectItem key={loc.code} value={loc.code}>{loc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Material</label>
              <Select value={selectedMaterial} onValueChange={handleMaterialChange} disabled={hwProductsLoading}>
                <SelectTrigger uiSize="sm"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-gray-500" /><SelectValue placeholder={hwProductsLoading ? "Loading..." : "Select Material"} /></div></SelectTrigger>
                <SelectContent>{uniqueMaterials.map((p: any) => <SelectItem key={p.productId} value={p.productId}>{p.productName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {(!selectedPlant || !selectedMaterial) && (
        <Card className="text-center p-8 border-dashed"><Info className="mx-auto h-8 w-8 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Select Filters to View Stock</h3><p className="mt-1 text-sm text-gray-500">Please select a Plant and Material to fetch stock details.</p></Card>
      )}

      {(selectedPlant && selectedMaterial) && (
        <DataTable<StockOverviewItem> columns={columns} data={paginatedInventory} loading={stockLoading || isFetching} totalCount={totalItems} manualPagination pageIndex={currentPage - 1} pageSize={itemsPerPage} pageCount={totalPages} onPageChange={(idx) => setCurrentPage(idx + 1)} onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} onRefresh={refetch} title="Stock Details" subtitle={`Displaying results for the selected filters`} />
      )}

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Stock Serial Number Details</DialogTitle>
            <DialogDescription>
              Individual serial numbers for product: {selectedItem?.name || "N/A"}
            </DialogDescription>
          </DialogHeader>

          {serialDetailsMutation.isPending && (
            <div className="py-20 flex items-center justify-center">
              <LoadingSpinner label="Loading serial numbers..." />
            </div>
          )}

          {mutationError && (
            mutationError.isNotFound ? (
              <div className="py-20 text-center text-sm text-gray-500">
                {mutationError.message}
              </div>
            ) : (
              <Alert variant="destructive" className="m-4">
                <AlertTitle>Error Fetching Details</AlertTitle>
                <AlertDescription>{mutationError.message}</AlertDescription>
              </Alert>
            )
          )}

          {serialDetailsMutation.isSuccess && (
            <>
              {(!uniqueSerialDetails || uniqueSerialDetails.length === 0) ? (
                <div className="py-20 text-center text-sm text-gray-500">No serial number details found for this item.</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search Serial No..."
                        value={serialSearchQuery}
                        onChange={(e) => setSerialSearchQuery(e.target.value)}
                        className="pl-8 h-9 w-full"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing {filteredSerialDetails.length} of {uniqueSerialDetails.length} items
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto md:border md:rounded-md">
                    {/* Desktop/Tablet Table View */}
                    <table className="w-full text-sm border-collapse hidden md:table">
                      <thead className="sticky top-0 bg-muted z-10">
                        <tr className="border-b">
                          {[
                            "MAT ID", "Material Name", "Serial No", "Plant",
                            "Storage Location", "Manufacturer", "Model / Mfr Sr No",
                          ].map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left font-semibold text-gray-700 border-r last:border-r-0 whitespace-nowrap bg-muted"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredSerialDetails.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No serial numbers match your search "{serialSearchQuery}".
                            </td>
                          </tr>
                        ) : (
                          filteredSerialDetails.map((row: SerialDetail, idx: number) => (
                            <tr
                              key={idx}
                              className={`border-b last:border-0 transition-colors hover:bg-muted/40 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"
                                }`}
                            >
                              <td className="px-4 py-3 border-r last:border-r-0 font-mono">{row.matId}</td>
                              <td className="px-4 py-3 border-r last:border-r-0">{row.name}</td>
                              <td className="px-4 py-3 border-r last:border-r-0 font-mono font-medium text-blue-700">
                                {row.placeId}
                              </td>
                              <td className="px-4 py-3 border-r last:border-r-0">{row.plant}</td>
                              <td className="px-4 py-3 border-r last:border-r-0">{row.sloc}</td>
                              <td className="px-4 py-3 border-r last:border-r-0">{row.manufacturer || "—"}</td>
                              <td className="px-4 py-3 border-r last:border-r-0">{row.manufacturerSrNo || "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                      {filteredSerialDetails.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No serial numbers match your search "{serialSearchQuery}".
                        </div>
                      ) : (
                        filteredSerialDetails.map((row: SerialDetail, idx: number) => (
                          <div key={idx} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-start border-b pb-2">
                              <div>
                                <div className="text-xs text-muted-foreground">Serial No</div>
                                <div className="font-mono font-medium text-blue-700 break-all">{row.placeId}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">MAT ID</div>
                                <div className="font-mono text-sm">{row.matId}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Material Name</div>
                                <div className="font-medium">{row.name}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Plant</div>
                                <div>{row.plant}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Storage Location</div>
                                <div>{row.sloc}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Manufacturer</div>
                                <div>{row.manufacturer || "—"}</div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs text-muted-foreground">Model / Mfr Sr No</div>
                                <div>{row.manufacturerSrNo || "—"}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => exportDetails("csv")} disabled={!uniqueSerialDetails || uniqueSerialDetails.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export as CSV
              </Button>
              <Button size="sm" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
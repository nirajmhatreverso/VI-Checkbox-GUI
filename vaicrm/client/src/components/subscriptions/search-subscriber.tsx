import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Eye, RefreshCw, Loader2 } from "lucide-react";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

type SearchType = "sapBpId" | "macId" | "mobile" | "firstName";

interface SearchResult {
  id?: string; // Add unique ID for better row key
  displayName: string;
  sapBpId: string;
  sapCaId: string;
  contractNo: string | null;
  macId: string;
  actions?: null;
}

export default function SearchSubscriber() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("macId");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [fullApiResponse, setFullApiResponse] = useState<any[]>([]);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [_, setLocation] = useLocation();

  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;

  const searchMutation = useMutation({
    mutationFn: (searchData: { type: SearchType; term: string }) => {
      const apiPayload = { [searchData.type]: searchData.term, salesOrg: currentSalesOrg || "", };
      return apiRequest('/subscriptions/search-customers', 'POST', apiPayload);
    },
    onSuccess: (response) => {
      if (response.status !== "SUCCESS" || !response.data || response.data.length === 0) {
        toast({ title: "No Results", description: "No customer records found for the given criteria.", variant: "destructive" });
        setSearchResults([]);
        setFullApiResponse([]);
        return;
      }

      const customerDetails = response.data.customerDetails;
      setFullApiResponse(customerDetails);

      const flattenedResults: SearchResult[] = customerDetails.map((detail: any, idx: number) => ({
        id: `${detail.relatedParty?.[0]?.sapBpId || idx}-${detail.relatedParty?.[0]?.contractNo || idx}`, // Unique ID
        displayName: `${detail.firstName || ''} ${detail.lastName || ''}`.trim(),
        sapBpId: detail.relatedParty?.[0]?.sapBpId || 'N/A',
        sapCaId: detail.relatedParty?.[0]?.sapCaId || 'N/A',
        contractNo: detail.relatedParty?.[0]?.contractNo || null,
        macId: detail.relatedParty?.[0]?.Mac || 'N/A',
        actions: null,
      }));
      setSearchResults(flattenedResults);
    },
    onError: (error: any) => {
      const searchTypeLabel =
        searchType === 'sapBpId' ? 'SAP BP ID' :
          searchType === 'macId' ? 'Smart Card No' :
            searchType === 'mobile' ? 'Mobile Number' :
              'First Name';

      const errorMessage = error.statusMessage?.includes('Not Found') || error.statusMessage?.includes('null')
        ? `Customer Details Not Found For ${searchTypeLabel}: ${searchTerm}`
        : error.statusMessage || "An unexpected error occurred.";

      toast({ title: "Search Error", description: errorMessage, variant: "destructive" });
      setSearchResults([]);
      setFullApiResponse([]);
    },
    onSettled: () => {
      setLoadingRowId(null);
    }
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast({ title: "Validation Error", description: "Please enter a search term.", variant: "destructive" });
      return;
    }
    setSearchResults([]);
    setFullApiResponse([]);
    searchMutation.mutate({ type: searchType, term: searchTerm });
  };

  const handleSelectResult = (item: SearchResult) => {
  const uniqueRowId = `${item.sapBpId}-${item.contractNo || 'null'}`;
  setLoadingRowId(uniqueRowId);

  setTimeout(() => {
    // ✅ Find the specific record from fullApiResponse that matches the clicked item
    const selectedRecord = fullApiResponse.find((detail: any) => {
      const bpId = detail.relatedParty?.[0]?.sapBpId;
      const caId = detail.relatedParty?.[0]?.sapCaId;
      const contract = detail.relatedParty?.[0]?.contractNo;
      
      return bpId === item.sapBpId && 
             caId === item.sapCaId && 
             (contract || '') === (item.contractNo || '');
    });

    // ✅ Pass filtered data with selected record first, or just the matching records
    const filteredCustomerData = selectedRecord 
      ? [selectedRecord, ...fullApiResponse.filter((d: any) => d !== selectedRecord)]
      : fullApiResponse;

    setLocation(`/subscriber-view`, {
      state: {
        customerData: filteredCustomerData,
        selectedContractNo: item.contractNo,
        selectedBpId: item.sapBpId,  // ✅ Also pass BP ID for accurate matching
        selectedCaId: item.sapCaId,  // ✅ Also pass CA ID for accurate matching
      },
    });
    setLoadingRowId(null);
  }, 300);
};

  const handleClear = () => {
    setSearchTerm("");
    setSearchResults([]);
    setFullApiResponse([]);
    searchMutation.reset();
  };

  const searchColumns: DataTableColumn<SearchResult>[] = [
    { key: "displayName", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "sapCaId", label: "CA ID", sortable: true },
    { key: "contractNo", label: "Contract", sortable: true },
    { key: "macId", label: "Smart Card No", render: (value) => <Badge variant="secondary">{value}</Badge> },
    {
      key: "actions",
      label: "Action",
      render: (value, item) => {
        const uniqueRowId = `${item.sapBpId}-${item.contractNo || 'null'}`;
        const isLoading = loadingRowId === uniqueRowId;

        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSelectResult(item)}
            disabled={searchMutation.isPending}
            className="h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
  ];

  const isBusy = searchMutation.isPending;
  const buttonText = "Searching...";

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-bold">Search Subscriber</h1>
          <p className="text-blue-100 text-xs mt-0.5">Find and view subscriber information directly</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Subscriber Search</CardTitle>
          <CardDescription>Search by SAP BP ID, Smart Card No, or Mobile Number to find customer contracts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col w-full md:w-2/5">
              <Label htmlFor="search-term">Search Term</Label>
              <Input
                id="search-term"
                placeholder={
                  searchType === 'sapBpId' ? 'Enter SAP BP ID...' :
                    searchType === 'macId' ? 'Enter Smart Card No...' :
                      searchType === 'firstName' ? 'Enter First Name...' :
                        'Enter Mobile Number...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/5">
              <Label htmlFor="search-type">Search By</Label>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} disabled={isBusy}>
                <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="macId">Smart Card No</SelectItem>
                  <SelectItem value="sapBpId">SAP BP ID</SelectItem>
                  <SelectItem value="mobile">Mobile Number</SelectItem>
                  <SelectItem value="firstName">First Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button size="xs" onClick={handleSearch} disabled={isBusy}>
                {isBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{buttonText}</> : <><Search className="h-4 w-4 mr-2" />Find</>}
              </Button>
              <Button size="xs" onClick={handleClear} variant="outline" disabled={isBusy}><RefreshCw className="h-4 w-4 mr-2" />Clear</Button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4">
              <DataTable
                key={`search-results-${searchResults.length}`} // Force re-render on data change
                title="Search Results"
                subtitle="Select a record to view the subscriber's details."
                data={searchResults}
                columns={searchColumns}
                showCount
                totalCount={searchResults.length}
                emptyMessage="No customer records found for the given criteria."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
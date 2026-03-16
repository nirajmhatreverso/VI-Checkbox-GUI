// src/components/provisioning/ProvisioningCommandTab.tsx

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Terminal, 
  Search, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  UserCheck, 
  Building, 
  Layers, 
  Send,
  Power,
  PowerOff,
  AlertTriangle
} from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Types ---
type SearchType = "sapBpId" | "macId" | "mobile";
type CommandType = "SUSPEND_ALL" | "RECONNECT_ALL";

interface SearchResult {
  displayName: string;
  sapBpId: string;
  sapCaId: string;
  contractNo: string | null;
  macId: string;
  stbNo: string;
  division: string;
  salesOrg: string;
  mobile: string;
  actions?: null;
}

interface DropdownOption {
  name: string;
  value: string;
  country?: string;
}

interface OnboardingDropdowns {
  salesOrg: DropdownOption[];
  division: DropdownOption[];
}

// Command Options
const COMMAND_OPTIONS = [
  { 
    value: "SUSPEND_ALL", 
    label: "Suspend All", 
    description: "Suspend all services for the subscriber",
    icon: PowerOff,
    color: "text-red-600"
  },
  { 
    value: "RECONNECT_ALL", 
    label: "Reactivate All", 
    description: "Reactivate all services for the subscriber",
    icon: Power,
    color: "text-green-600"
  }
];

export default function ProvisioningCommandTab() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const userCountry = user?.country;

  // --- Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("sapBpId");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // --- Form States ---
  const [smartCardNo, setSmartCardNo] = useState("");
  const [stbNo, setStbNo] = useState("");
  const [selectedSalesOrg, setSelectedSalesOrg] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [commandType, setCommandType] = useState<CommandType | "">("");
  const [loading, setLoading] = useState(false);

  // Selected Context
  const [selectedContext, setSelectedContext] = useState<{
    division: string;
    salesOrg: string;
    sapBpId: string;
    sapCaId: string;
    displayName: string;
  } | null>(null);

  // Fetch dropdown data
  const { data: dropdownData, isLoading: isLoadingDropdowns } = useQuery<OnboardingDropdowns>({
    queryKey: ['dropdowns', 'onboarding'],
    queryFn: async () => {
      const response = await apiRequest('/dropdowns/onboarding', 'GET');
      if (response.status === 'SUCCESS' && response.data) {
        return {
          salesOrg: response.data.salesOrg || [],
          division: response.data.division || []
        };
      }
      return { salesOrg: [], division: [] };
    },
    staleTime: 1000 * 60 * 30,
  });

  // Filter salesOrg based on user's country
  const filteredSalesOrgOptions = dropdownData?.salesOrg?.filter(
    (org) => org.country === userCountry
  ) || [];

  const divisionOptions = dropdownData?.division || [];

  // Auto-select if only one option exists
  useEffect(() => {
    if (filteredSalesOrgOptions.length === 1 && !selectedSalesOrg) {
      setSelectedSalesOrg(filteredSalesOrgOptions[0].value);
    }
  }, [filteredSalesOrgOptions, selectedSalesOrg]);

  useEffect(() => {
    if (divisionOptions.length === 1 && !selectedDivision) {
      setSelectedDivision(divisionOptions[0].value);
    }
  }, [divisionOptions, selectedDivision]);

  // --- Search Mutation ---
  const searchMutation = useMutation({
    mutationFn: (searchData: { type: SearchType; term: string }) => {
      const apiPayload = {
        [searchData.type]: searchData.term,
        salesOrg: currentSalesOrg || "",
      };
      return apiRequest('/subscriptions/search-customers', 'POST', apiPayload);
    },
    onSuccess: (response) => {
      if (response.status !== "SUCCESS" || !response.data || !response.data.customerDetails || response.data.customerDetails.length === 0) {
        toast({ title: "No Results", description: "No customer records found.", variant: "destructive" });
        setSearchResults([]);
        return;
      }

      const customerDetails = response.data.customerDetails;
      const flattenedResults: SearchResult[] = [];

      customerDetails.forEach((customer: any) => {
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const mobileObj = customer.contactMedium?.find((c: any) => c.type === 'mobile');
        const mobile = mobileObj ? mobileObj.value : 'N/A';

        if (customer.relatedParty && Array.isArray(customer.relatedParty)) {
          customer.relatedParty.forEach((rp: any) => {
            flattenedResults.push({
              displayName: name,
              sapBpId: rp.sapBpId || 'N/A',
              sapCaId: rp.sapCaId || 'N/A',
              contractNo: rp.contractNo || 'N/A',
              macId: rp.Mac || 'N/A',
              stbNo: rp.stbNo || rp.STBNo || 'N/A',
              division: rp.division || '11',
              salesOrg: rp.salesOrg || currentSalesOrg || '',
              mobile: mobile,
            });
          });
        }
      });
      setSearchResults(flattenedResults);
    },
    onError: (error: any) => {
      toast({ title: "Search Error", description: error.statusMessage || "Error searching subscriber.", variant: "destructive" });
      setSearchResults([]);
    }
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setSearchResults([]);
    setSelectedContext(null);
    searchMutation.mutate({ type: searchType, term: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    searchMutation.reset();
  };

  // --- Select Subscriber Handler ---
  const handleSelectSubscriber = (item: SearchResult) => {
    setSmartCardNo(item.macId);
    setStbNo(item.stbNo);
    
    // Find the matching salesOrg option
    const matchingSalesOrg = filteredSalesOrgOptions.find(org => 
      org.value === item.salesOrg || org.name === item.salesOrg
    );
    if (matchingSalesOrg) {
      setSelectedSalesOrg(matchingSalesOrg.value);
    }

    // Find the matching division option
    const matchingDivision = divisionOptions.find(div => 
      div.value === item.division || div.name === item.division
    );
    if (matchingDivision) {
      setSelectedDivision(matchingDivision.value);
    }

    setSelectedContext({
      division: item.division,
      salesOrg: item.salesOrg,
      sapBpId: item.sapBpId,
      sapCaId: item.sapCaId,
      displayName: item.displayName
    });

    toast({
      title: "Subscriber Selected",
      description: `Selected ${item.displayName} - ${item.macId}`
    });

    // Scroll to form
    document.getElementById('command-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Execute Command Handler ---
  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!smartCardNo) {
  toast({
    title: "Validation Error",
    description: "Please provide Smart Card No.",
    variant: "destructive"
  });
  return;
}

    if (!selectedSalesOrg || !selectedDivision) {
      toast({
        title: "Validation Error",
        description: "Please select both Sales Org and Division.",
        variant: "destructive"
      });
      return;
    }

    if (!commandType) {
      toast({
        title: "Validation Error",
        description: "Please select a command to execute.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Get the display name for salesOrg
    const salesOrgOption = filteredSalesOrgOptions.find(org => org.value === selectedSalesOrg);
    const salesOrgName = salesOrgOption?.name || selectedSalesOrg;

    // Get the display name for division
    const divisionOption = divisionOptions.find(div => div.value === selectedDivision);
    const divisionName = divisionOption?.name || selectedDivision;

    const payload = {
      operation: "SUSPEND_ALL",
      smartCardNo: smartCardNo,
      stbNo: stbNo,
      division: divisionName,
      salesOrg: salesOrgName,
       // SUSPEND_ALL or REACTIVATE_ALL
    };

    try {
      const response = await apiRequest("/provisioning/reconnect-suspend", "POST", payload);
      
      if (response.status === "SUCCESS") {
       toast({
  title: commandType === "SUSPEND_ALL" ? "Suspend All Successful" : "Reactivate All Successful",
  description: response.data?.message || `Command executed successfully for ${smartCardNo}.`,
  duration: 5000
});

        // Reset command selection after success
        setCommandType("");
      } else {
        throw new Error(response.statusMessage || "Command execution failed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.statusMessage || error.message || "Failed to execute command.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setSmartCardNo("");
    setStbNo("");
    setCommandType("");
    setSelectedContext(null);
    // Only reset if multiple options exist
    if (filteredSalesOrgOptions.length > 1) {
      setSelectedSalesOrg("");
    }
    if (divisionOptions.length > 1) {
      setSelectedDivision("");
    }
  };

  // --- Table Columns ---
  const searchColumns: DataTableColumn<SearchResult>[] = [
    { key: "displayName", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "division", label: "Division", render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge> },
    { key: "macId", label: "Smart Card", render: (val) => <span className="font-mono text-xs">{val}</span> },
    { key: "stbNo", label: "STB No", render: (val) => <span className="font-mono text-xs">{val || 'N/A'}</span> },
    {
      key: "actions",
      label: "Select",
      render: (_, item) => (
        <Button
          variant={smartCardNo === item.macId ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => handleSelectSubscriber(item)}
          title="Select this subscriber"
        >
          {smartCardNo === item.macId ? <CheckCircle className="h-4 w-4" /> : <UserCheck className="h-4 w-4 text-blue-600" />}
        </Button>
      ),
    },
  ];

  const isBusy = searchMutation.isPending;
  const isFormValid = smartCardNo && selectedSalesOrg && selectedDivision && commandType;
  const selectedCommand = COMMAND_OPTIONS.find(c => c.value === commandType);

  return (
    <div className="space-y-4">

      {/* 1. Search Section */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-purple-500" />
            Find Subscriber
          </CardTitle>
          <CardDescription className="text-xs">Search for a subscriber to execute provisioning commands.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex flex-col w-full md:w-1/3">
              <Label htmlFor="search-term" className="text-xs mb-1">Search Term</Label>
              <Input
                id="search-term"
                className="h-8 text-sm"
                placeholder={
                  searchType === 'sapBpId' ? 'Enter BP ID...' :
                    searchType === 'macId' ? 'Enter MAC/Smart Card ID...' :
                      'Enter Mobile...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/4">
              <Label htmlFor="search-type" className="text-xs mb-1">Search By</Label>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} disabled={isBusy}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sapBpId">SAP BP ID</SelectItem>
                  <SelectItem value="macId">MAC / Smart Card ID</SelectItem>
                  <SelectItem value="mobile">Mobile Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={handleSearch} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                Search
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={handleClearSearch} disabled={isBusy}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md overflow-hidden">
              <DataTable
                data={searchResults}
                columns={searchColumns}
                showCount={false}
                emptyMessage="No results found."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Command Execution Form */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm" id="command-form-section">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5 text-purple-600" />
            Provisioning Command
          </CardTitle>
          {selectedContext && (
            <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded w-fit mt-1">
              <CheckCircle className="h-3 w-3" />
              Selected: <b>{selectedContext.displayName}</b> | Division: <b>{selectedContext.division}</b>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleExecuteCommand} className="space-y-6">

            {/* Row 1: Smart Card No, STB No */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Smart Card No */}
             <div className="space-y-2">
  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    Smart Card No <span className="text-red-500">*</span>
  </Label>
  <Input
    value={smartCardNo}
    onChange={e => setSmartCardNo(e.target.value)}
    placeholder="Enter Smart Card Number"
    required
    className="font-mono"
  />
  <p className="text-xs text-gray-500 dark:text-gray-400">
    Select from search above or enter manually
  </p>
</div>

{/* STB No */}
<div className="space-y-2">
  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    STB No <span className="text-gray-400 text-xs font-normal">(Optional)</span>
  </Label>
  <Input
    value={stbNo}
    onChange={e => setStbNo(e.target.value)}
    placeholder="Enter STB Number"
    className="font-mono"
  />
</div>
            </div>

            {/* Row 2: Sales Org, Division */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales Org Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Sales Org <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    value={selectedSalesOrg}
                    onValueChange={setSelectedSalesOrg}
                    disabled={isLoadingDropdowns || filteredSalesOrgOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 pl-10">
                      <SelectValue placeholder={
                        isLoadingDropdowns ? "Loading..." :
                          filteredSalesOrgOptions.length === 0 ? "No options available" :
                            "Select Sales Org"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSalesOrgOptions.map((org) => (
                        <SelectItem key={org.value} value={org.value}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>

              {/* Division Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Division <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    value={selectedDivision}
                    onValueChange={setSelectedDivision}
                    disabled={isLoadingDropdowns || divisionOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 pl-10">
                      <SelectValue placeholder={
                        isLoadingDropdowns ? "Loading..." :
                          divisionOptions.length === 0 ? "No options available" :
                            "Select Division"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionOptions.map((div) => (
                        <SelectItem key={div.value} value={div.value}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>
            </div>

            {/* Row 3: Command Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Select Command <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMMAND_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = commandType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCommandType(option.value as CommandType)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? option.value === "SUSPEND_ALL"
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isSelected
                          ? option.value === "SUSPEND_ALL"
                            ? "bg-red-100 dark:bg-red-900/40"
                            : "bg-green-100 dark:bg-green-900/40"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <Icon className={`h-5 w-5 ${option.color}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${isSelected ? option.color : "text-gray-900 dark:text-gray-100"}`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className={`h-5 w-5 ml-auto ${option.color}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning Alert for Suspend */}
            {commandType === "SUSPEND_ALL" && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This will suspend ALL services for the subscriber. The subscriber will lose access to all channels until reactivated.
                </AlertDescription>
              </Alert>
            )}

            {/* Success Info for Reactivate */}
            {commandType === "RECONNECT_ALL" && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
    <Power className="h-4 w-4 text-green-600" />
    <AlertTitle className="text-green-800 dark:text-green-200">Reactivation</AlertTitle>
    <AlertDescription className="text-green-700 dark:text-green-300">
      This will reactivate ALL suspended services for the subscriber, restoring their access.
    </AlertDescription>
  </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearForm}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={loading || !isFormValid}
                className={`text-white focus-visible:ring-purple-600/50 disabled:opacity-60 ${
                  commandType === "SUSPEND_ALL" 
                    ? "bg-red-600 hover:bg-red-700 disabled:bg-red-600" 
                    : commandType === "RECONNECT_ALL"
                    ? "bg-green-600 hover:bg-green-700 disabled:bg-green-600"
                    : "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Executing...
                  </>
                ) : (
                  <>
                    {selectedCommand && <selectedCommand.icon className="h-4 w-4 mr-2" />}
                    {!selectedCommand && <Send className="h-4 w-4 mr-2" />}
                    {selectedCommand ? `Execute ${selectedCommand.label}` : "Execute Command"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
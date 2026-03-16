import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent,  } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import { 
  Calendar as CalendarIcon, CreditCard, 
  Search, User, XCircle, Wallet, AlertCircle 
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal"; 
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";

import { apiRequest } from "@/lib/queryClient"; 

// --- 1. Type Definitions ---
interface PaymentInfo {
  createdDate: string; 
  Remark: string;
  TxnDate: string;
  drAmount: number | null;
  crAmount: number | null;
  balance: number | null;
}

interface CommissionDetailsResponse {
  status: string;
  statusCode: number;
  statusMessage: string;
  data: {
    agentCommissionDetailsClientResponses: {
      status: string;
      AgentName: string;
      currency: string;
      fromDate: string;
      ToDate: string;
      openingBalance: number | null;
      closingBalance: number | null;
      latestcommisionAmount: number;
      paymentInfo: PaymentInfo[];
    }
  } | null;
}

// --- 2. Helper to parse API dates ---
const parseApiDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return null;
  try {
    return parse(dateStr, 'yyyyMMdd', new Date());
  } catch (e) {
    return null;
  }
};

export default function AgentCommission() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  
  // UI States
  const [activeTab, setActiveTab] = useState("payment");
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  
  // Filter States
  const [selectedAgent, setSelectedAgent] = useState<AgentApiItem | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Query Trigger State
  const [searchParams, setSearchParams] = useState<{
    sapBpId: string;
    fromDate: string;
    toDate: string;
  } | null>(null);

  // Error message state
  const [apiError, setApiError] = useState<string | null>(null);

  // --- Logic to handle Permissions ---
  const isAdmin = (user?.allAccess || "N") === "Y";
  const loggedInBpId = user?.sapBpId || user?.parentSapBpId;

  // ✅ Auto-select agent for non-admins
  useEffect(() => {
    if (!isAdmin && loggedInBpId) {
      const currentUserAgent: Partial<AgentApiItem> = {
        agentName: user?.name || "My Account",
        sapBpId: loggedInBpId,
      };
      setSelectedAgent(currentUserAgent as AgentApiItem);
    }
  }, [isAdmin, loggedInBpId, user?.name]);

  // --- 3. The Fetch Function ---
  const fetchCommissionDetails = async (): Promise<CommissionDetailsResponse | null> => {
    if (!searchParams) return null;

    try {
      const response = await apiRequest(
        "/agent/commission-details", 
        "POST", 
        searchParams
      );

      // ✅ Check if the response indicates failure and throw the API's statusMessage
      if (response && response.status === "FAILURE") {
        throw new Error(response.statusMessage || "Agent Commission Details Process Failed");
      }

      return response as CommissionDetailsResponse;
    } catch (error: any) {
  throw new Error(error?.statusMessage || error?.message || "Failed to fetch commission details");
}
  };

  // --- React Query Hook ---
  const { 
    data: apiResponse, 
    isLoading, 
    isError,
    error 
  } = useQuery<CommissionDetailsResponse | null, Error>({
    queryKey: ["commission-details", searchParams],
    queryFn: fetchCommissionDetails,
    enabled: !!searchParams,
    retry: false
  });

  // ✅ Handle error state with useEffect - using error.message
  useEffect(() => {
    if (isError && error) {
      setApiError(error.message || "Could not fetch data");
    } else if (!isError && apiResponse) {
      setApiError(null);
    }
  }, [isError, error, apiResponse]);

  // Extract Data for UI
  const details = apiResponse?.data?.agentCommissionDetailsClientResponses;
  const rawPaymentList = details?.paymentInfo || [];
  
  // ✅ FIX: Get currency from API response - NO HARDCODING
  const currency = details?.currency || "";

  // --- 4. Data Mapping for DataTable ---
  const paymentRows = rawPaymentList.map((item, index) => {
    const rawDate = item.TxnDate || item.createdDate;
    const dateObj = parseApiDate(rawDate);
    
    const crAmt = item.crAmount ?? 0;
const drAmt = item.drAmount ?? 0;
const isCredit = crAmt !== 0;
const isDebit = drAmt !== 0;
const amount = isCredit ? crAmt : (isDebit ? -drAmt : 0);
const type = isCredit ? "Credit" : (isDebit ? "Debit" : "N/A");

    return {
      id: index,
      date: dateObj ? format(dateObj, "yyyy-MM-dd") : "N/A",
      description: item.Remark,
      type: item.crAmount !== null ? "Credit" : "Debit",
      amount: amount,
      balance: item.balance ?? 0
    };
  });

  const handleSearch = () => {
  if (!selectedAgent) {
    toast({ title: "Agent Required", description: "Please select an agent.", variant: "destructive" });
    return;
  }
  if (!dateFrom || !dateTo) {
    toast({ title: "Dates Required", description: "Please select both From and To dates.", variant: "destructive" });
    return;
  }
  
  // ✅ ADD THIS:
  if (dateFrom > dateTo) {
    toast({ title: "Invalid Date Range", description: "From date cannot be after To date.", variant: "destructive" });
    return;
  }

    setApiError(null);

    setSearchParams({
      sapBpId: selectedAgent.sapBpId,
      fromDate: format(dateFrom, "yyyy-MM-dd"),
      toDate: format(dateTo, "yyyy-MM-dd"),
    });
  };

  const clearFilters = () => {
    if (isAdmin) {
      setSelectedAgent(null);
    }
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchParams(null);
    setApiError(null);
  };

 

  // ✅ FIX: Define Columns with DYNAMIC currency from API
  const paymentColumns: DataTableColumn<any>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { 
      key: "type", 
      label: "Type", 
      sortable: true,
      render: (val) => (
        <Badge variant={val === "Credit" ? "default" : "secondary"} className={val === "Credit" ? "bg-green-600" : "bg-red-500"}>
          {val}
        </Badge>
      )
    },
    { 
      key: "amount", 
      label: "Amount", 
      sortable: true, 
      render: (val) => (
        <span className={Number(val) > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {currency} {Math.abs(Number(val)).toLocaleString()}
        </span>
      ) 
    },
    { 
      key: "balance", 
      label: "Balance", 
      sortable: true, 
      render: (val) => `${currency ? `${currency} ` : ''}${Number(val).toLocaleString()}` 
    },
  ];

  // ✅ Determine the error message to display - using error.message
  const errorMessage = apiError || (isError && error ? error.message : "Could not fetch data");

  return (
    <div className="min-h-screen p-4">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Financial Records</h1>
              <p className="text-blue-100 text-xs mt-0.5">Payments and Commission Ledger</p>
            </div>
            {details && (
              <div className="flex gap-4 text-right">
                 <div className="bg-white/10 p-2 rounded">
                    <p className="text-[10px] text-blue-200 uppercase">Closing Balance</p>
                    {/* ✅ FIX: Using dynamic currency from API */}
                    <p className="text-lg font-bold">{(details.closingBalance ?? 0).toLocaleString()} {details.currency}</p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Error State Display - Shows API statusMessage */}
        {(isError || apiError) && searchParams && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards - Only Opening and Closing Balance */}
        {details && !isError && !apiError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(details.openingBalance ?? 0).toLocaleString()} {details.currency}
                </div>
              </CardContent>
            </Card>
           
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {(details.closingBalance ?? 0).toLocaleString()} {details.currency}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Card */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
            
            {/* Filter Section */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-b mx-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                {/* Agent Search */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                    <User className="inline h-4 w-4 mr-1" /> Agent
                  </label>
                  <div className="flex gap-2">
                    <Input
                      // @ts-ignore
                      uiSize="sm"
                      readOnly
                      placeholder={isAdmin ? "Select Agent..." : "Current Agent"}
                      value={selectedAgent ? `${selectedAgent.agentName} (${selectedAgent.sapBpId})` : ""}
                      className={cn(
                        "text-sm", 
                        isAdmin 
                          ? "bg-white dark:bg-gray-700 cursor-pointer" 
                          : "bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0"
                      )}
                      onClick={() => isAdmin && setIsAgentModalOpen(true)}
                    />
                    
                    {isAdmin && (
                      <Button size="xs" variant="secondary" onClick={() => setIsAgentModalOpen(true)}>
                        <Search className="w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* From Date */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                    <CalendarIcon className="inline h-4 w-4 mr-1" /> From
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 border-gray-300",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
  mode="single"
  selected={dateFrom}
  onSelect={setDateFrom}
  initialFocus
  disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
/>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* To Date */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                    <CalendarIcon className="inline h-4 w-4 mr-1" /> To
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 border-gray-300",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        maxYear={2030}
                        minYear={2020}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-2 flex gap-2">
                  <Button
                    size="xs"
                    className="flex-1 bg-azam-blue hover:bg-blue-700 text-white"
                    onClick={handleSearch}
                    disabled={isLoading}
                  >
                    {isLoading ? "..." : <><Search className="h-4 w-4 mr-2" /> Search</>}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={clearFilters}
                    className="px-3"
                    title="Clear"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Ledger Content */}
            <TabsContent value="payment" className="p-1">
              {!searchParams ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50">
                  <Search className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">Select dates to view records</p>
                </div>
              ) : (isError || apiError) ? (
                <div className="flex flex-col items-center justify-center py-16 text-red-500 border-2 border-red-200 rounded-lg bg-red-50/50">
                  <AlertCircle className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No Data Found</p>
                  <p className="text-xs mt-1 text-red-400">{errorMessage}</p>
                </div>
              ) : (
                <DataTable
                  title={details ? `Ledger for ${details.AgentName}` : "Search Results"}
                  data={paymentRows}
                  columns={paymentColumns}
                  loading={isLoading}
                  showCount={true}
                  emptyMessage="No transactions found for this period"
                  className="mt-2"
                />
              )}
            </TabsContent>

            <TabsContent value="commission">
              <div className="p-4 text-center text-gray-500 text-sm">
                Commission details mapping not specified in provided JSON response.
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Agent Modal */}
      <ParentAgentSearchModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onSelect={(agent) => {
          setSelectedAgent(agent);
          setSearchParams(null); 
        }}
        isSubCollection="N"
      />
    </div>
  );
}
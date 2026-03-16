import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerPaymentApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Download, SlidersHorizontal, X, Calendar as CalendarIcon, Loader2, AlertCircle, FileText, Printer, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { generateReceiptHtmlFromApi } from "@/utils/receipt-utils";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Props now accepts the full customerData object
interface PaymentTransactionsTableProps {
  customerData: any;
}

// Helper types and functions for filtering
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

type PaymentFilters = {
  transactionId: string;
  status: string;
  paymentMethod: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "transactionId" | "status" | "paymentMethod" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

// Type for our combined and mapped transaction data
type MappedTransaction = {
  date: string;
  time: string;
  transactionId: string;
  name: string;
  paymentMethod: string;
  paymentType: 'HARDWARE' | 'SUBSCRIPTION';
  amount: number;
  currency: string;
  status: string;
  description: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
  original: any;
};

// Main Component
export default function PaymentTransactionsTable({ customerData }: PaymentTransactionsTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<MappedTransaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptRow, setReceiptRow] = useState<any | null>(null);
  const { toast } = useToast();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 15); return toYmd(d); }, []);
  const initialTo = useMemo(() => toYmd(new Date()), []);
  const [filters, setFilters] = useState<PaymentFilters>({ transactionId: "", status: "", paymentMethod: "", fromDate: initialFrom, toDate: initialTo });
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500);

  const paymentQuery = useQuery({
    queryKey: ['paymentTransactions', customerData.sapBpId, 'ALL', debouncedFilters, pageIndex, pageSize],
    queryFn: () => apiRequest('/customer-payments/search', 'POST', {
      sapBpId: customerData.sapBpId,
      payType: '', // Blank sends both
      fromDate: debouncedFilters.fromDate,
      toDate: debouncedFilters.toDate,
      transId: debouncedFilters.transactionId,
      status: debouncedFilters.status,
      payMode: debouncedFilters.paymentMethod,
      isSpecificTransaction: "N",
      limit: pageSize,
      offSet: pageIndex * pageSize,
      type: "CUSTOMER",
    }),
    enabled: !!customerData.sapBpId,
     staleTime: 0,                    // Data is immediately stale
    refetchOnMount: 'always',        // Always refetch when component mounts
    refetchOnWindowFocus: false,     // Optional: refetch when window regains focus
    gcTime: 0,  
  });


  const isLoading = paymentQuery.isLoading;

  const displayError = useMemo(() => {
    if (!paymentQuery.isError) return undefined;
    const statusCode = (paymentQuery.error as any)?.statusCode;
    if (statusCode === 404) return undefined;
    return "Failed to load transactions.";
  }, [paymentQuery]);


  // 2. This logic is updated to handle 404 errors gracefully when combining data.
  const allTransactions = useMemo((): MappedTransaction[] => {
    if (isLoading || !paymentQuery.data) return [];

    const txData = paymentQuery.data?.data?.agentHwPaymentDetails || [];

    return txData.map((tx: any) => ({
      date: format(new Date(tx.createDt), "MM/dd/yyyy"),
      time: new Date(tx.createTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      transactionId: tx.transId,
      name: tx.name || "-",
      paymentMethod: tx.payMode,
      paymentType: tx.payType,
      amount: tx.totalAmount,
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      cmStatus: tx.cmStatus,
      cmStatusMsg: tx.cmStatusMsg,
      cmErrorReason: tx.cmErrorReason,
      original: tx,
    })).sort((a: MappedTransaction, b: MappedTransaction) => new Date(b.original.createTs).getTime() - new Date(a.original.createTs).getTime());
  }, [paymentQuery, isLoading]);

  // 3. This logic is updated to correctly calculate the total count.
  useEffect(() => {
    if (!isLoading) {
      if (paymentQuery.isSuccess) {
        setTotalCount(paymentQuery.data?.data?.totalRecordCount || 0);
      } else if (paymentQuery.isError && (paymentQuery.error as any)?.statusCode === 404) {
        setTotalCount(0);
      }
    }
  }, [paymentQuery, isLoading]);

  // --- END OF CHANGE ---

  useEffect(() => { setPageIndex(0); }, [debouncedFilters]);

  const openReceiptDialog = (tx: MappedTransaction) => {
    setReceiptRow(tx.original);
    setReceiptDialogOpen(true);
  };

  const printReceipt = () => {
    if (!receiptRow) return;
    const html = generateReceiptHtmlFromApi(receiptRow);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;visibility:hidden;height:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => document.body.removeChild(iframe), 500);
        }
      }, 150);
    }
  };

  const handleView = (tx: MappedTransaction) => {
    setSelectedPayment(tx);
    setIsViewModalOpen(true);
  };

  const columns: DataTableColumn<MappedTransaction>[] = [
    { key: "date", label: "Date & Time", sortable: false, render: (_, item) => `${item.date} ${item.time}` },
    { key: "transactionId", label: "Transaction ID", sortable: false, render: (v) => <span className="text-blue-600 font-medium">{v}</span> },
    { key: "name", label: "Name", sortable: false },
    { key: "paymentType", label: "Type", sortable: false, render: (v) => <Badge variant={v === 'HARDWARE' ? 'outline' : 'secondary'}>{v}</Badge> },
    { key: "paymentMethod", label: "Payment Method", sortable: false },
    { key: "amount", label: "Amount", sortable: false, render: (v, item) => <span className="font-medium">{item.currency} {Number(v ?? 0).toLocaleString()}</span> },
    { key: "status", label: "Status", sortable: false, render: (v: string) => <Badge className={`text-xs capitalize ${v === "SUCCESS" ? "bg-green-100 text-green-800" : v === "INPROCESS" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{v.toLowerCase()}</Badge> },
    {
      key: "cmStatus" as keyof MappedTransaction, label: "CM Status", sortable: false, render: (_v, row) => {
        const s = row.cmStatus;
        const title = row.cmStatusMsg || row.cmErrorReason || s || "N/A";
        if (!s) return <span className="text-xs text-gray-500 px-3 py-1 rounded-full">-</span>;
        const label = s === 'S' ? 'Success' : s === 'P' ? 'Inprocess' : s === 'F' ? 'Failed' : s === 'E' ? 'Error' : s;
        const bgColor = s === 'S' ? 'bg-green-100' : s === 'P' ? 'bg-blue-100' : 'bg-red-100';
        return (
          <div className={`${bgColor} px-3 py-1 rounded-full flex items-center gap-2 w-fit`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    {s === 'S' ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : s === 'P' ? <Info className="h-4 w-4 text-blue-600" />
                        : s === 'F' ? <AlertTriangle className="h-4 w-4 text-red-600" />
                          : s === 'E' ? <AlertTriangle className="h-4 w-4 text-red-600" />
                            : <Info className="h-4 w-4 text-blue-600" />
                    }
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">{label}</div>
                    {(row.cmStatusMsg || row.cmErrorReason) && (
                      <div className="text-xs space-y-1">
                        {row.cmStatusMsg && (
                          <div><span className="font-medium">Message:</span> {row.cmStatusMsg}</div>
                        )}
                        {row.cmErrorReason && (
                          <div><span className="font-medium">Reason:</span> {row.cmErrorReason}</div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs font-mono">{label}</span>
          </div>
        );
      }
    },
  ];

  const actions: DataTableAction<MappedTransaction>[] = [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: handleView },
    {
      label: "Receipt",
      icon: <FileText className="h-4 w-4 text-red-600" />,
      onClick: openReceiptDialog,
      show: (item) => item.status?.toUpperCase() === "SUCCESS",
    },
  ];

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  };

  const handleReset = () => {
    setFilters({ transactionId: "", status: "", paymentMethod: "", fromDate: initialFrom, toDate: initialTo });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setPageIndex(0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">Payment Transactions</CardTitle>
                <CardDescription className="text-sm text-gray-500">View and export payment history</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
                <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-2" />Advanced</Button>
                <Button size="sm" variant="ghost" onClick={handleReset}><X className="h-4 w-4 mr-2" />Reset Filters</Button>
              </div>
            </div>

            {!useAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-gray-50">
                <div>
                  <LabelSmall>Transaction ID</LabelSmall>
                  <Input value={filters.transactionId} onChange={(e) => setFilters(f => ({ ...f, transactionId: e.target.value }))} placeholder="Search Transaction ID..." className="h-7 text-xs" />
                </div>
                <div>
                  <LabelSmall>Date Range</LabelSmall>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => {
                        setBasicRange(range);
                        setFilters(f => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" }));
                      }} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {useAdvanced && <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} transactions={allTransactions} />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<MappedTransaction>
            data={allTransactions}
            columns={columns}
            actions={actions}
            loading={isLoading}
            error={displayError} // 4. Use the new displayError value here
            emptyMessage="No payment transactions found for the selected filters"
            enableExport
            manualPagination={true}
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={Math.ceil(totalCount / pageSize)}
            onPageChange={setPageIndex}
            onPageSizeChange={handlePageSizeChange}
            totalCount={totalCount}
            showCount={true}
          />
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-green-600" />Transaction Details</DialogTitle>
            <DialogDescription>{selectedPayment?.transactionId}</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 pt-4 text-sm">
              {/* New CM Status block */}
              {(selectedPayment.cmStatus || selectedPayment.cmStatusMsg || selectedPayment.cmErrorReason) && (
                <Card className={`border shadow-sm ${selectedPayment.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' :
                  selectedPayment.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' :
                    selectedPayment.cmStatus === 'F' || selectedPayment.cmStatus === 'E' ? 'bg-red-50/60 border-red-200' :
                      'bg-blue-50/60 border-blue-200'
                  }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {selectedPayment.cmStatus === 'S' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : selectedPayment.cmStatus === 'P' ? (
                          <Info className="h-5 w-5 text-blue-600" />
                        ) : (selectedPayment.cmStatus === 'F' || selectedPayment.cmStatus === 'E') ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="space-y-1 w-full">
                        <h4 className={`font-semibold text-sm ${selectedPayment.cmStatus === 'S' ? 'text-green-900' :
                          selectedPayment.cmStatus === 'P' ? 'text-blue-900' :
                            selectedPayment.cmStatus === 'F' || selectedPayment.cmStatus === 'E' ? 'text-red-900' : 'text-blue-900'
                          }`}>
                          CM Status: {selectedPayment.cmStatus === 'S' ? 'Success' : selectedPayment.cmStatus === 'P' ? 'Inprocess' : selectedPayment.cmStatus === 'F' ? 'Failed' : selectedPayment.cmStatus === 'E' ? 'Error' : selectedPayment.cmStatus}
                        </h4>

                        {selectedPayment.cmStatusMsg && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Message: </span>
                            {selectedPayment.cmStatusMsg}
                          </div>
                        )}

                        {selectedPayment.cmErrorReason && (
                          <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800">
                            <span className="font-medium text-red-900">Error Reason: </span>
                            {selectedPayment.cmErrorReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Transaction ID" value={selectedPayment.transactionId} />
                <InfoItem label="Date & Time" value={`${selectedPayment.date} ${selectedPayment.time}`} />
                <InfoItem label="Amount" value={`${selectedPayment.currency} ${Number(selectedPayment.amount ?? 0).toLocaleString()}`} />
                <InfoItem label="Payment Type" value={selectedPayment.paymentType} />
                <InfoItem label="Payment Method" value={selectedPayment.paymentMethod} />
                <InfoItem label="Status" value={<Badge className={`capitalize ${selectedPayment.status === "SUCCESS" ? "bg-green-100 text-green-800" : selectedPayment.status === "INPROCESS" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{selectedPayment.status.toLowerCase()}</Badge>} />
                <InfoItem label="Receipt No." value={selectedPayment.original.receiptNo || 'N/A'} />
                <InfoItem label="Collected By (ID)" value={selectedPayment.original.collectedBy || 'N/A'} />
              </div>
              {selectedPayment.description && (
                <InfoItem label="Description" value={selectedPayment.description} fullWidth />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Receipt Details</DialogTitle>
            <Button size="sm" variant="ghost" disabled={!receiptRow || receiptLoading} onClick={printReceipt} >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogHeader>
          {receiptLoading ? (
            <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : receiptRow ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoItem label="Transaction ID" value={receiptRow.transId} />
              <InfoItem label="Status" value={<Badge className="capitalize bg-green-100 text-green-800">{receiptRow.status?.toLowerCase()}</Badge>} />
              <InfoItem label="Customer BP" value={receiptRow.sapBpId || "-"} />
              <InfoItem label="Customer Name" value={receiptRow.name || "-"} />
              <InfoItem
                label="Amount"
                value={`${receiptRow.currency || ""} ${Number(receiptRow.totalAmount ?? receiptRow.payAmount ?? 0).toLocaleString()}`}
              />
              <InfoItem label="Receipt No" value={receiptRow.receiptNo || "-"} />
            </div>
          ) : (
            <div className="text-sm text-gray-600">No receipt data found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

const InfoItem = ({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="text-xs font-medium text-gray-500">{label}</label>
    <div className="mt-1 p-2 bg-gray-50 rounded-md border text-gray-800">{value}</div>
  </div>
);

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, transactions }: { advFilters: AdvancedFilter[], setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>, setFilters: React.Dispatch<React.SetStateAction<PaymentFilters>>, initialFrom: string, initialTo: string, transactions: MappedTransaction[] }) {

  const uniqueStatuses = useMemo(() => Array.from(new Set(transactions.map(t => t.status).filter(Boolean))), [transactions]);
  //const uniqueMethods = useMemo(() => Array.from(new Set(transactions.map(t => t.paymentMethod).filter(Boolean))), [transactions]);

  const STATUS_OPTIONS = ["SUCCESS", "INPROCESS", "FAILED", "ERROR", "PENDING"];
  const PAYMENT_METHOD_OPTIONS = ["CASH", "CHEQUE", "BANK DEPOSIT", "MOBILE MONEY", "CARD"];

  // You can keep Payment Methods dynamic, or hardcode them too if you know the list (e.g., ["TIGOPESA", "MPESA", "AIRTELMONEY", "HALOPESA"])
  // For now, we will leave payment methods dynamic but fallback to an empty array if needed.
  const uniqueMethods = useMemo(() => {
    const methods = Array.from(new Set(transactions.map(t => t.paymentMethod).filter(Boolean)));
    return methods.length > 0 ? methods : [];
  }, [transactions]);

  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" | "select"; options?: string[] }[] = [
    { value: "transactionId", label: "Transaction ID", type: "text" },
    { value: "status", label: "Status", type: "select", options: STATUS_OPTIONS }, // Use the static list here
    { value: "paymentMethod", label: "Payment Method", type: "select", options: uniqueMethods },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];



  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined, };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    const nextFilters: PaymentFilters = { transactionId: "", status: "", paymentMethod: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "transactionId": nextFilters.transactionId = f.value || ""; break;
        case "status": nextFilters.status = f.value || ""; break;
        case "paymentMethod": nextFilters.paymentMethod = f.value || ""; break;
        case "dateRange":
          if (f.dateRange?.from) {
            nextFilters.fromDate = toYmd(f.dateRange.from);
            nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    setFilters(nextFilters);
  }, [advFilters, setFilters, initialFrom, initialTo]);

  return (
    <div className="space-y-3 border p-3 rounded-md bg-white/50">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" className="h-7 text-xs w-56 justify-between"><span>Add filter...</span><SlidersHorizontal className="h-4 w-4" /></Button></PopoverTrigger>
          <PopoverContent className="w-56 p-0"><div className="py-1">{FILTER_FIELD_OPTIONS.map((opt) => (<button key={opt.value} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => addAdvFilter(opt.value)}>{opt.label}</button>))}</div></PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        {advFilters.length === 0 && (<div className="text-xs text-muted-foreground">No advanced filters added.</div>)}
        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3"><Input value={fieldMeta.label} readOnly className="h-7 text-xs bg-gray-50" /></div>
              <div className="col-span-8">
                {fieldMeta.type === "text" && (<Input className="h-7 text-xs" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder="Enter value..." />)}
                {fieldMeta.type === "select" && (
                  <Select value={af.value || ""} onValueChange={(val) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: val } : x)))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={`Select ${fieldMeta.label}`} /></SelectTrigger>
                    <SelectContent>{(fieldMeta.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}><X className="h-4 w-4 text-red-500" /></Button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
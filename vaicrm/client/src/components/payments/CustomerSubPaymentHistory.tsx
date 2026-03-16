import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle, Clock, X, Info, SlidersHorizontal, Calendar as CalendarIcon, FileText, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuthContext } from "@/context/AuthProvider";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { generateReceiptHtmlFromApi } from "@/utils/receipt-utils";
import { apiRequest } from "@/lib/queryClient";

// Helper functions and types
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ANY = "__ANY__";

type PaymentDetail = {
  id: string;
  transId: string;
  name: string;
  sapBpId: string;
  payAmount: number;
  payMode: string;
  currency: string;
  status: string;
  raw: any;
  details?: string;
};

type HistoryFilters = {
  transId: string;
  sapBpId: string;
  payMode: string;
  payType: string;
  collectionCenter: string;
  fromDate: string;
  toDate: string;
};
type FilterFieldKey = "transId" | "sapBpId" | "payType" | "payMode" | "collectionCenter" | "dateRange";
type FilterOp = "equals" | "contains" | "between";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  op: FilterOp;
  value?: string;
  dateRange?: DateRange;
};

export default function CustomerSubPaymentHistory() {
  const { user } = useAuthContext();
  
  // Access Logic
  const isAdmin = (user?.allAccess || "N") === "Y";
  // Determine which BP ID to enforce for non-admins
  const restrictedBpId = user?.sapBpId || user?.parentSapBpId;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();
  const [filters, setFilters] = useState<HistoryFilters>({
    transId: "",
    sapBpId: "",
    payMode: "",
    payType: "SUBSCRIPTION",
    collectionCenter: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customer-sub-payments-history", filters, pageIndex, pageSize],
    enabled: !!user,
    queryFn: () =>
      apiRequest('/customer-sub-payments/search', 'POST', {
        transId: filters.transId || null,
        // CORE LOGIC: If admin, use filter input; otherwise force restricted ID
        sapBpId: isAdmin ? (filters.sapBpId || null) : restrictedBpId,
        payMode: filters.payMode || null,
        collectionCenter: filters.collectionCenter || null,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        payType: "SUBSCRIPTION",
        isSpecificTransaction: "Y",
        status: "", // Fetch all statuses for history
        offSet: pageIndex * pageSize,
        limit: pageSize,
        type: "CUSTOMER",
      }),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const payments: PaymentDetail[] = useMemo(() => {
    if (data?.status !== "SUCCESS") return [];
    return data?.data?.agentHwPaymentDetails?.map((p: any) => ({
      id: p.payId,
      transId: p.transId,
      name: p.name || "",
      sapBpId: p.sapBpId,
      payAmount: Number(p.payAmount ?? 0),
      payMode: p.payMode,
      currency: p.currency,
      status: p.status,
      raw: p,
    })) || [];
  }, [data]);
  
  const totalCount = data?.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptRow, setReceiptRow] = useState<any | null>(null);

  const openReceiptDialog = async (transId: string) => {
    setReceiptDialogOpen(true);
    setReceiptLoading(true);
    try {
      const res = await apiRequest('/customer-sub-payments/search', 'POST', { 
        transId, 
        isSpecificTransaction: "Y", 
        limit: 1, 
        type: "CUSTOMER", 
        payType: "SUBSCRIPTION",
        // Enforce restricted BP ID for receipt search as well
        sapBpId: isAdmin ? null : restrictedBpId
      });      
      if (res?.data?.agentHwPaymentDetails?.length) {
        setReceiptRow(res.data.agentHwPaymentDetails[0]);
      } else {
        toast({ title: "Not found", variant: "destructive" });
        setReceiptDialogOpen(false);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setReceiptDialogOpen(false);
    } finally {
      setReceiptLoading(false);
    }
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

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED": case "SUCCESS":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "PENDING": case "INPROCESS":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "CANCELLED": case "REJECTED":
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: DataTableColumn<PaymentDetail>[] = [
    { key: "transId", label: "Txn ID", sortable: true },
    { key: "name", label: "Customer", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "payAmount", label: "Amount", sortable: true, render: (v, r) => `${r.currency} ${r.payAmount.toLocaleString()}` },
    { key: "payMode", label: "Mode", sortable: true },
    { key: "status", label: "Status", sortable: true, render: (v, r) => getStatusBadge(r.status) },
    {
      key: "details",
      label: "Details",
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r.raw); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
    {
      key: "id",
      label: "Receipt",
      render: (_v, r) =>
        r.status?.toUpperCase() === "SUCCESS" ? (
          <Button size="iconSm" variant="ghost" onClick={() => openReceiptDialog(r.transId)}>
            <FileText className="h-4 w-4 text-red-600" />
          </Button>
        ) : null,
    },
  ];

  const handleSearch = () => {
    setPageIndex(0);
    refetch();
  };

  const handleReset = () => {
    setFilters({ transId: "", sapBpId: "", payMode: "", payType: "SUBSCRIPTION", collectionCenter: "", fromDate: initialFrom, toDate: initialTo });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
          <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
          <Button size="sm" onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {!useAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border p-2 rounded-md">
          <div className="md:col-span-2"><LabelSmall>Trans ID</LabelSmall><Input value={filters.transId} onChange={(e) => setFilters(f => ({ ...f, transId: e.target.value }))} className="h-7 text-xs"/></div>
          
          {/* ONLY SHOW SAP BP ID FOR ADMIN */}
          {isAdmin && (
            <div className="md:col-span-2"><LabelSmall>SAP BP ID</LabelSmall><Input value={filters.sapBpId} onChange={(e) => setFilters(f => ({ ...f, sapBpId: e.target.value }))} className="h-7 text-xs"/></div>
          )}

          <div className="md:col-span-2"><LabelSmall>Pay Mode</LabelSmall>
            <Select value={filters.payMode || ANY} onValueChange={(v) => setFilters(f => ({ ...f, payMode: v === ANY ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><LabelSmall>Collection Center</LabelSmall><Input value={filters.collectionCenter} onChange={(e) => setFilters(f => ({ ...f, collectionCenter: e.target.value }))} className="h-7 text-xs"/></div>
          <div className="md:col-span-4">
            <LabelSmall>Date Range</LabelSmall>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" selected={basicRange} onSelect={(r) => { setBasicRange(r); setFilters(f => ({...f, fromDate: r?.from ? toYmd(r.from) : "", toDate: r?.to ? toYmd(r.to) : ""})) }} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      
      {useAdvanced && (
        <AdvancedFiltersComponent 
          advFilters={advFilters} 
          setAdvFilters={setAdvFilters} 
          setFilters={setFilters} 
          initialFrom={initialFrom} 
          initialTo={initialTo} 
          isAdmin={isAdmin}
        />
      )}
      
      <DataTable<PaymentDetail>
        title="Subscription Payment History"
        subtitle="All customer subscription payment transactions"
        icon={<Receipt className="h-5 w-5" />}
        showCount
        totalCount={totalCount}
        data={payments}
        columns={columns}
        loading={isLoading}
        manualPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />
      
      {/* PAYMENT DETAILS DIALOG - UPDATED */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
          {!detailsRow ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div><div className="text-gray-500">Transaction ID</div><div className="font-medium">{detailsRow.transId || "-"}</div></div>
                <div><div className="text-gray-500">Status</div><div className="font-medium">{detailsRow.status || "-"}</div></div>
                <div><div className="text-gray-500">SAP BP ID</div><div className="font-medium">{detailsRow.sapBpId || "-"}</div></div>
                <div><div className="text-gray-500">SAP CA ID</div><div className="font-medium">{detailsRow.sapCaId || "-"}</div></div>
                <div><div className="text-gray-500">Pay Mode</div><div className="font-medium">{detailsRow.payMode || "-"}</div></div>
                <div><div className="text-gray-500">Trans Type</div><div className="font-medium">{detailsRow.transType || "-"}</div></div>
                <div><div className="text-gray-500">Sales Org</div><div className="font-medium">{detailsRow.salesOrg || "-"}</div></div>
                <div><div className="text-gray-500">Division</div><div className="font-medium">{detailsRow.division || "-"}</div></div>
                <div><div className="text-gray-500">Collection Center</div><div className="font-medium">{detailsRow.collectionCenter || "-"}</div></div>
                <div><div className="text-gray-500">Collected By</div><div className="font-medium">{detailsRow.collectedBy || "-"}</div></div>
                <div><div className="text-gray-500">Create ID</div><div className="font-medium">{detailsRow.createId || "-"}</div></div>
                
                {/* CASH MODE */}
                {String(detailsRow.payMode || "").toUpperCase() === "CASH" && ( 
                  <div><div className="text-gray-500">Receipt No</div><div className="font-medium">{detailsRow.receiptNo || "-"}</div></div> 
                )}
                
                {/* CHEQUE MODE */}
                {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                  <>
                    <div><div className="text-gray-500">Cheque No</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                    <div><div className="text-gray-500">Cheque Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                    <div><div className="text-gray-500">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                    <div><div className="text-gray-500">Branch Name</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                    <div><div className="text-gray-500">Approved By</div><div className="font-medium">{detailsRow.approvedBy || "-"}</div></div>
                  </>
                )}
                
                {/* BANK_DEPOSIT MODE - UPDATED: Added Deposit Date */}
               {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
  <>
    <div><div className="text-gray-500">Bank Deposit ID</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
    <div><div className="text-gray-500">Bank Deposit Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
    <div><div className="text-gray-500">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div> 
    <div><div className="text-gray-500">Branch Name</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
  </>
)}

                <div className="col-span-2 my-1 border-b"></div>

                {/* CM Info */}
                <div><div className="text-gray-500">CM Status</div><div className="font-medium">{detailsRow.cmStatus || "-"}</div></div>
                <div><div className="text-gray-500">CM Code</div><div className="font-medium">{detailsRow.cmStatusCode || "-"}</div></div>
                <div className="col-span-2"><div className="text-gray-500">CM Message</div><div className="font-medium">{detailsRow.cmStatusMsg || "-"}</div></div>
                {detailsRow.cmErrorReason && (
                  <div className="col-span-2"><div className="text-gray-500 text-red-600">CM Error</div><div className="font-medium text-red-600">{detailsRow.cmErrorReason}</div></div>
                )}

                <div className="col-span-2 my-1 border-b"></div>

                {/* Reason & Description */}
                <div><div className="text-gray-500">Reason</div><div className="font-medium">{detailsRow.reason || "-"}</div></div>
                <div className="col-span-2"><div className="text-gray-500">Description</div><div className="font-medium">{detailsRow.description || "-"}</div></div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
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
              <div><div className="text-gray-500">Transaction ID</div><div className="font-medium">{receiptRow.transId}</div></div>
              <div><div className="text-gray-500">Status</div><div className="font-medium">{receiptRow.status || "-"}</div></div>
              <div><div className="text-gray-500">Customer BP</div><div className="font-medium">{receiptRow.sapBpId || "-"}</div></div>
              <div><div className="text-gray-500">Customer Name</div><div className="font-medium">{receiptRow.name || "-"}</div></div>
              <div><div className="text-gray-500">Amount</div><div className="font-medium">{receiptRow.currency || ""} {Number(receiptRow.totalAmount ?? receiptRow.payAmount ?? 0).toLocaleString()}</div></div>
              <div><div className="text-gray-500">Receipt No</div><div className="font-medium">{receiptRow.receiptNo || "-"}</div></div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No receipt data.</div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-medium text-gray-700">{children}</label>;

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, isAdmin }: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<HistoryFilters>>;
  initialFrom: string;
  initialTo: string;
  isAdmin: boolean;
}) {
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange"; }[] = [
    { value: "transId", label: "Trans ID", type: "text" },
    // Only show SAP BP ID option if Admin
    ...(isAdmin ? [{ value: "sapBpId", label: "SAP BP ID", type: "text" }] as const : []),
    { value: "payType", label: "Pay Type", type: "text" },
    { value: "payMode", label: "Pay Mode", type: "select" },
    { value: "collectionCenter", label: "Collection Center", type: "text" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some(f => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      op: field === 'dateRange' ? 'between' : 'contains',
      value: "",
      dateRange: field === 'dateRange' ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined
    };
    setAdvFilters(prev => [...prev, newFilter]);
  };
  const removeAdvFilter = (id: string) => setAdvFilters(prev => prev.filter(f => f.id !== id));
  
  useEffect(() => {
    const nextFilters: HistoryFilters = { transId: "", sapBpId: "", payMode: "", payType: "SUBSCRIPTION", collectionCenter: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f: AdvancedFilter) => {
      switch (f.field) {
        case "transId": nextFilters.transId = f.value || ""; break;
        case "sapBpId": nextFilters.sapBpId = f.value || ""; break;
        case "payMode": nextFilters.payMode = f.value || ""; break;
        case "payType": nextFilters.payType = f.value || ""; break;
        case "collectionCenter": nextFilters.collectionCenter = f.value || ""; break;
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
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Select onValueChange={(v: FilterFieldKey) => addAdvFilter(v)}>
          <SelectTrigger className="h-7 text-xs w-56"><SelectValue placeholder="Choose field..." /></SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No advanced filters added.</div>}
        {advFilters.map(af => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find(f => f.value === af.field);
          if (!fieldMeta) return null; // Skip rendering if field invalid (e.g. not admin anymore)
          
          const ops = fieldMeta.type === 'text' ? ["contains", "equals"] : ["equals"];
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3"><Select value={af.field} disabled><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger></Select></div>
              <div className="col-span-2"><Select value={af.op} onValueChange={(v: FilterOp) => setAdvFilters(p => p.map(x => x.id === af.id ? {...x, op: v} : x))}><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger><SelectContent>{ops.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-6">
                {fieldMeta.type === 'text' && <Input className="h-7 text-xs" value={af.value} onChange={e => setAdvFilters(p => p.map(x => x.id === af.id ? {...x, value: e.target.value} : x))} />}
                {fieldMeta.type === 'select' && af.field === 'payMode' && <Select value={af.value} onValueChange={v => setAdvFilters(p => p.map(x => x.id === af.id ? {...x, value: v} : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select pay mode"/></SelectTrigger><SelectContent><SelectItem value="CASH">CASH</SelectItem><SelectItem value="CHEQUE">CHEQUE</SelectItem><SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem></SelectContent></Select>}
                {fieldMeta.type === 'daterange' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        selected={af.dateRange}
                        onSelect={(range) => setAdvFilters(p => p.map(x => (x.id === af.id ? { ...x, dateRange: range } : x)))}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}><X className="h-4 w-4 text-red-500" /></Button></div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
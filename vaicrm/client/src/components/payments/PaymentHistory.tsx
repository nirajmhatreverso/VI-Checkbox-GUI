// src/components/payments/PaymentHistory.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Receipt, SlidersHorizontal, Calendar as CalendarIcon, Info, X, Filter, FileText, Loader2, Printer } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { generateReceiptHtmlFromApi } from "@/utils/receipt-utils";

type FilterFieldKey = "transId" | "sapBpId" | "payMode" | "collectionCenter" | "dateRange";
type FilterOp = "equals" | "contains" | "startsWith" | "endsWith" | "between";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  op: FilterOp;
  value?: string;
  value2?: string;
  dateRange?: DateRange;
};

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const ANY = "__ANY__";

function getStatusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED" || s === "SUCCESS" || s === "COMPLETED") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">Success</span>;
  if (s === "REJECTED" || s === "FAILED" || s === "CANCELLED") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-red-50 text-red-700 border border-red-200">Rejected</span>;
  if (s === "INPROCESS" || s === "PENDING") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200">Pending</span>;
  return <Badge variant="secondary">{status}</Badge>;
}

function LabelSmall({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-700 block mb-1">{children}</label>;
}

export default function PaymentHistory() {
  const { user } = useAuthContext();
  
  // Access Logic
  const isAdmin = (user?.allAccess || "N") === "Y";
  
  // Determine which BP ID to enforce for non-admins
  // If Agent/OTC: uses sapBpId. If Subagent: uses parentSapBpId.
  const restrictedBpId = user?.sapBpId || user?.parentSapBpId;

  const today = new Date();
  const initialFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const initialTo = today;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  // Main filter state used for the API query
  const [filters, setFilters] = useState({
    transId: "",
    sapBpId: "", // Logic applied in useQuery for this field
    payMode: "",
    collectionCenter: "",
    fromDate: toYmd(initialFrom),
    toDate: toYmd(initialTo),
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialFrom,
    to: initialTo,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);

  // --- Receipt Logic ---
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptRow, setReceiptRow] = useState<any | null>(null);

  const openReceiptDialog = async (transId: string) => {
    setReceiptDialogOpen(true);
    setReceiptLoading(true);
    try {
      const res = await apiRequest('/agent-payments/search', 'POST', {
        transId,
        isSpecificTransaction: "Y",
        limit: 1,
        type: "AGENT",
        payType: "HARDWARE",
        // Even for receipt search, we should pass the correct BP ID context
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
    } else {
      document.body.removeChild(iframe);
    }
  };
  // ---------------------

  const handleReset = () => {
    setFilters({
      transId: "",
      sapBpId: "",
      payMode: "",
      collectionCenter: "",
      fromDate: toYmd(initialFrom),
      toDate: toYmd(initialTo),
    });
    setDateRange({ from: initialFrom, to: initialTo });
    setAdvFilters([]);
    setUseAdvanced(false);
    setPageIndex(0);
  };

  const addAdvFilter = (field: FilterFieldKey) => {
    // Prevent adding date range twice
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    
    const defOp: FilterOp = field === "dateRange" ? "between" : field === "payMode" ? "equals" : "contains";
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      op: defOp,
      value: "",
      // Initialize with current global dates if adding a date range
      dateRange: field === "dateRange" ? { from: new Date(filters.fromDate), to: new Date(filters.toDate) } : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  const computeFiltersFromAdvanced = () => {
    const next = {
      transId: "",
      sapBpId: "",
      payMode: "",
      collectionCenter: "",
      fromDate: filters.fromDate, 
      toDate: filters.toDate,     
    };

    advFilters.forEach((f) => {
      const val = f.value?.toString().trim() ?? "";
      switch (f.field) {
        case "transId": next.transId = val; break;
        case "sapBpId": next.sapBpId = val; break;
        case "payMode": next.payMode = val; break;
        case "collectionCenter": next.collectionCenter = val; break;
        case "dateRange":
          if (f.dateRange?.from) {
            next.fromDate = toYmd(f.dateRange.from);
            next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    return next;
  };

  const handleSearch = () => {
    setPageIndex(0);
    if (useAdvanced) {
      const next = computeFiltersFromAdvanced();
      if (JSON.stringify(next) === JSON.stringify(filters)) {
        refetch();
      } else {
        setFilters(next); 
      }
    } else {
      refetch();
    }
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payment-history", "HARDWARE", filters, pageIndex, pageSize],
    queryFn: () =>
      apiRequest("/agent-payments/search", "POST", {
        transId: filters.transId || null,
        // CORE LOGIC CHANGE:
        // If Admin (allAccess="Y"), use the filter input or null.
        // If Not Admin, force the logged in User's ID (or parent ID).
        sapBpId: isAdmin ? (filters.sapBpId || null) : restrictedBpId,
        payType: "HARDWARE",
        payMode: filters.payMode === ANY ? null : (filters.payMode || null),
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        collectionCenter: filters.collectionCenter || null,
        isSpecificTransaction: "N",
        status: "",
        offSet: pageIndex * pageSize,
        limit: pageSize,
        type: "AGENT",
      }),
    staleTime: 30000,
  });

  const totalCount = data?.data?.totalCount ?? 0;
  const rawData = data?.data?.agentHwPaymentDetails ?? [];

  const columns: DataTableColumn<any>[] = [
    { key: "transId", label: "Txn ID", sortable: true },
    { key: "collectedBy", label: "Collected By", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    {
      key: "payAmount",
      label: "Amount",
      render: (val: any, row: any) => `${row.currency || ''} ${Number(val || 0).toLocaleString()}`
    },
    { key: "payMode", label: "Mode", sortable: true },
    {
      key: "createDt",
      label: "Date",
      sortable: true,
      render: (v: string) => v ? new Date(v).toLocaleDateString() : "-"
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => getStatusBadge(val)
    },
    {
      key: "details",
      label: "Details",
      sortable: false,
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
    {
      key: "id",
      label: "Receipt",
      render: (_v, r) =>
        (r.status?.toUpperCase() === "SUCCESS" || r.status?.toUpperCase() === "APPROVED" || r.status?.toUpperCase() === "COMPLETED") ? (
          <Button size="iconSm" variant="ghost" onClick={() => openReceiptDialog(r.transId)}>
            <FileText className="h-4 w-4 text-red-600" />
          </Button>
        ) : null,
    },
  ];

  const controlClasses = "h-7 text-xs";

  return (
    <div className="space-y-3">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1">
            <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)} className="h-8 text-xs">
              Basic
            </Button>
            <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)} className="h-8 text-xs">
              <SlidersHorizontal className="h-3 w-3 mr-1" /> Adv
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs">
            Reset
          </Button>
          <Button size="sm" onClick={handleSearch} className="h-8 text-xs bg-azam-blue hover:bg-blue-700">
            <Filter className="h-3 w-3 mr-1" /> Search
          </Button>
        </div>
      </div>

      {/* BASIC FILTERS */}
      {!useAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 bg-gray-50 p-3 rounded-lg border">
          <div className="col-span-1 md:col-span-2">
            <LabelSmall>Trans ID</LabelSmall>
            <Input placeholder="Search ID..." className={controlClasses} value={filters.transId} onChange={(e) => setFilters(p => ({ ...p, transId: e.target.value }))} />
          </div>
          
          {/* ONLY SHOW SAP BP ID FILTER FOR ADMINS */}
          {isAdmin && (
            <div className="col-span-1 md:col-span-2">
              <LabelSmall>SAP BP ID</LabelSmall>
              <Input placeholder="1000..." className={controlClasses} value={filters.sapBpId} onChange={(e) => setFilters(p => ({ ...p, sapBpId: e.target.value }))} />
            </div>
          )}

          <div className="col-span-1 md:col-span-2">
            <LabelSmall>Center</LabelSmall>
            <Input placeholder="Center..." className={controlClasses} value={filters.collectionCenter} onChange={(e) => setFilters(p => ({ ...p, collectionCenter: e.target.value }))} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <LabelSmall>Pay Mode</LabelSmall>
            <Select value={filters.payMode || ANY} onValueChange={(v) => setFilters(p => ({ ...p, payMode: v }))}>
              <SelectTrigger className={controlClasses}><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
                {/* <SelectItem value="POS">POS</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-4">
            <LabelSmall>Date Range</LabelSmall>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-full justify-start text-left font-normal ${controlClasses}`}>
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dateRange?.from ? (
                    dateRange.to ? <span className="truncate">{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</span> : format(dateRange.from, "LLL dd")
                  ) : <span>Pick dates</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from) {
                      setFilters(p => ({ ...p, fromDate: toYmd(range.from!), toDate: range.to ? toYmd(range.to) : toYmd(range.from!) }));
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* ADVANCED FILTERS */}
      {useAdvanced && (
        <AdvancedFilters 
          advFilters={advFilters} 
          setAdvFilters={setAdvFilters} 
          addAdvFilter={addAdvFilter} 
          removeAdvFilter={removeAdvFilter}
          isAdmin={isAdmin}
        />
      )}

      <DataTable
        title="Hardware History"
        subtitle="View historical payment records"
        icon={<Receipt className="h-5 w-5" />}
        headerVariant="gradient"
        showCount
        totalCount={totalCount}
        data={rawData}
        columns={columns}
        loading={isLoading || isFetching}
        manualPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={Math.max(1, Math.ceil(totalCount / pageSize))}
        onPageChange={setPageIndex}
        onPageSizeChange={(ps) => { setPageSize(ps); setPageIndex(0); }}
      />

      {/* DETAILS MODAL */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader><DialogTitle>Hardware Payment Details</DialogTitle></DialogHeader>
          {!detailsRow ? <div className="text-sm text-gray-600">No data</div> : (
            <div className="space-y-2 text-sm border rounded-md p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><div className="text-[10px] text-gray-500 uppercase">Transaction ID</div><div className="font-medium truncate" title={detailsRow.transId}>{detailsRow.transId || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Status</div><div className="font-medium">{getStatusBadge(detailsRow.status)}</div></div>

                {/* --- REASON & REJECTED BY --- */}
                {detailsRow.reason && (
                  <>
                    <div><div className="text-[10px] text-gray-500 uppercase">Reason</div><div className="font-medium text-red-600">{detailsRow.reason}</div></div>
                    {detailsRow.rejectedBy && (
                      <div><div className="text-[10px] text-gray-500 uppercase">Rejected By</div><div className="font-medium">{detailsRow.rejectedBy}</div></div>
                    )}
                  </>
                )}
                {/* ---------------------------- */}

                {/* --- CM STATUS FIELDS --- */}
                <div><div className="text-[10px] text-gray-500 uppercase">CM Status</div><div className="font-medium">{detailsRow.cmStatus || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">CM Message</div><div className="font-medium">{detailsRow.cmStatusMsg || "-"}</div></div>
                {/* ------------------------ */}

                <div className="col-span-2 border-t my-1"></div>
                <div><div className="text-[10px] text-gray-500 uppercase">SAP BP ID</div><div className="font-medium">{detailsRow.sapBpId || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">SAP CA ID</div><div className="font-medium">{detailsRow.sapCaId || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Amount</div><div className="font-medium">{detailsRow.currency} {Number(detailsRow.totalAmount || detailsRow.payAmount).toLocaleString()}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Pay Mode</div><div className="font-medium">{detailsRow.payMode || "-"}</div></div>
                <div className="col-span-2 border-t my-1"></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Division</div><div className="font-medium">{detailsRow.division || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Collection Center</div><div className="font-medium truncate" title={detailsRow.collectionCenter}>{detailsRow.collectionCenter || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Collected By</div><div className="font-medium">{detailsRow.collectedBy || "-"}</div></div>
                <div><div className="text-[10px] text-gray-500 uppercase">Created By</div><div className="font-medium">{detailsRow.createId || "-"}</div></div>
                
                {/* CASH - Receipt No */}
                {String(detailsRow.payMode || "").toUpperCase() === "CASH" && (
                  <div className="col-span-2"><div className="text-[10px] text-gray-500 uppercase">Receipt No</div><div className="font-medium">{detailsRow.receiptNo || "-"}</div></div>
                )}
                
                {/* CHEQUE Details */}
                {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                  <>
                    <div><div className="text-[10px] text-gray-500 uppercase">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Branch</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Cheque No</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Cheque Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                  </>
                )}
                
                {/* BANK_DEPOSIT Details - Shows Bank Deposit ID from chequeNo field */}
                {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
                  <>
                    <div><div className="text-[10px] text-gray-500 uppercase">Bank Deposit ID</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Branch</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                    <div><div className="text-[10px] text-gray-500 uppercase">Bank Deposit Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                  </>
                )}

                <div className="col-span-2 mt-2"><div className="text-[10px] text-gray-500 uppercase">Description</div><div className="text-xs bg-white p-2 rounded border max-h-20 overflow-y-auto">{detailsRow.description || "No description"}</div></div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline" size="sm">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECEIPT DIALOG */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Payment Receipt Details</DialogTitle>
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
              <div><div className="text-gray-500">Agent/Customer</div><div className="font-medium">{receiptRow.sapBpId || "-"}</div></div>
              <div><div className="text-gray-500">Name</div><div className="font-medium">{receiptRow.name || "-"}</div></div>
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

function AdvancedFilters({ advFilters, setAdvFilters, addAdvFilter, removeAdvFilter, isAdmin }: any) {
  const FILTER_FIELD_OPTIONS = [
    { value: "transId", label: "Trans ID", type: "text" },
    // Only allow SAP BP ID filtering if user is admin
    ...(isAdmin ? [{ value: "sapBpId", label: "SAP BP ID", type: "text" }] : []),
    { value: "payMode", label: "Pay Mode", type: "select" },
    { value: "collectionCenter", label: "Collection Center", type: "text" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  // Helper to update a specific filter row
  const updateFilterRow = (id: string, updates: any) => {
    setAdvFilters((prev: any) => prev.map((row: any) =>
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-gray-50">
      {/* HEADER: ADD FILTER DROPDOWN */}
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Select 
          onValueChange={(v: any) => addAdvFilter(v)}
          value=""
        >
          <SelectTrigger className="h-7 text-xs w-56 bg-white">
            <SelectValue placeholder="Choose field..." />
          </SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => {
              // Disable options already added (except generally date range handled in add function)
              const isSelected = advFilters.some((f: any) => f.field === opt.value && f.field !== 'dateRange');
              return (
                <SelectItem key={opt.value} value={opt.value} disabled={isSelected}>
                  {opt.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* FILTER ROWS LIST */}
      <div className="space-y-2">
        {advFilters.length === 0 && (
          <div className="text-xs text-center text-gray-500 py-2">No advanced filters added.</div>
        )}

        {advFilters.map((af: any) => {
          // Find configuration for the current field
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field);
          // If a field exists in state but is no longer valid (e.g. not admin anymore), skip rendering or handle gracefully
          if (!fieldMeta) return null;

          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">

              {/* COL 1: FIELD SELECTOR (Span 4) */}
              <div className="col-span-4">
                <Select
                  value={af.field}
                  onValueChange={(newField) => {
                    // Reset value when field type changes
                    updateFilterRow(af.id, {
                      field: newField,
                      value: "",
                      dateRange: newField === 'dateRange' ? { from: new Date(), to: new Date() } : undefined
                    });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_FIELD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* COL 2: VALUE INPUT/SELECT (Span 7) */}
              <div className="col-span-7">
                {af.field === "payMode" ? (
                  <Select
                    value={af.value || ""}
                    onValueChange={(v) => updateFilterRow(af.id, { value: v })}
                  >
                    <SelectTrigger className="h-7 text-xs bg-white">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                      <SelectItem value="BANK_DEPOSIT">BANK DEPOSIT</SelectItem>
                      {/* <SelectItem value="POS">POS</SelectItem> */}
                    </SelectContent>
                  </Select>
                ) : af.field === "dateRange" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (
                          af.dateRange.to ?
                            `${format(af.dateRange.from, "LLL dd")} - ${format(af.dateRange.to, "LLL dd")}`
                            : format(af.dateRange.from, "LLL dd")
                        ) : (
                          <span>Pick a range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={af.dateRange?.from}
                        selected={af.dateRange}
                        onSelect={(range) => updateFilterRow(af.id, { dateRange: range })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    className="h-7 text-xs bg-white"
                    value={af.value || ""}
                    onChange={(e) => updateFilterRow(af.id, { value: e.target.value })}
                    placeholder={`Enter ${fieldMeta?.label || 'value'}...`}
                  />
                )}
              </div>

              {/* COL 3: REMOVE BUTTON (Span 1) */}
              <div className="col-span-1 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeAdvFilter(af.id)}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
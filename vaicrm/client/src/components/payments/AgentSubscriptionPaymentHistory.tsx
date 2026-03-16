// src/components/customer-payments/AgentSubscriptionPaymentHistory.tsx

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
  DialogDescription,
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
import { Receipt, SlidersHorizontal, Calendar as CalendarIcon, Info, X, Filter, FileText, Printer, Loader2 } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { generateReceiptHtmlFromApi } from "@/utils/receipt-utils";
import { Separator } from "@/components/ui/separator";

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
  if (s === "APPROVED" || s === "SUCCESS") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">Success</span>;
  if (s === "REJECTED" || s === "FAILED") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-red-50 text-red-700 border border-red-200">Rejected</span>;
  if (s === "INPROCESS" || s === "PENDING") return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200">Pending</span>;
  return <Badge variant="secondary">{status}</Badge>;
}

function LabelSmall({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-700 block mb-1">{children}</label>;
}

// Helper Component for Details View
const DetailItem = ({ label, value, className }: { label: string; value: any; className?: string }) => (
  <div className={className}>
    <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{label}</div>
    <div className="font-medium text-sm truncate text-gray-900" title={String(value || "")}>
      {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
    </div>
  </div>
);

export default function AgentSubscriptionPaymentHistory() {
  const { user } = useAuthContext();
  
  // Access Logic
  const isAdmin = (user?.allAccess || "N") === "Y";
  
  // Determine which BP ID to enforce for non-admins
  const restrictedBpId = user?.sapBpId || user?.parentSapBpId;

  const today = new Date();
  const initialFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const initialTo = today;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const [filters, setFilters] = useState({
    transId: "",
    sapBpId: "", 
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
        payType: "SUBSCRIPTION",
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
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const defOp: FilterOp = field === "dateRange" ? "between" : field === "payMode" ? "equals" : "contains";
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      op: defOp,
      value: "",
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
      switch (f.field) {
        case "transId": next.transId = f.value?.toString().trim() ?? ""; break;
        case "sapBpId": next.sapBpId = f.value?.toString().trim() ?? ""; break;
        case "payMode": next.payMode = f.value?.toString().trim() ?? ""; break;
        case "collectionCenter": next.collectionCenter = f.value?.toString().trim() ?? ""; break;
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
    if (useAdvanced) {
      const next = computeFiltersFromAdvanced();
      setFilters(next);
    }
    setPageIndex(0);
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["subscription-payment-history", "SUBSCRIPTION", filters, pageIndex, pageSize],
    queryFn: () =>
      apiRequest("/agent-payments/search", "POST", {
        transId: filters.transId || null,
        sapBpId: isAdmin ? (filters.sapBpId || null) : restrictedBpId,
        payType: "SUBSCRIPTION",
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
        (r.status?.toUpperCase() === "SUCCESS" || r.status?.toUpperCase() === "APPROVED") ? (
          <Button size="iconSm" variant="ghost" onClick={() => openReceiptDialog(r.transId)}>
            <FileText className="h-4 w-4 text-red-600" />
          </Button>
        ) : null,
    },
  ];

  const controlClasses = "h-7 text-xs";

  // Helper to get the date label based on payment mode
  const getDateLabel = (payMode: string) => {
    const mode = (payMode || "").toUpperCase();
    if (mode === "BANK_DEPOSIT") return "Bank Deposit Date";
    if (mode === "CHEQUE") return "Cheque Date";
    return "Date";
  };

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
          filters={filters} 
          addAdvFilter={addAdvFilter} 
          removeAdvFilter={removeAdvFilter}
          isAdmin={isAdmin}
        />
      )}

      <DataTable
        title="Subscription History"
        subtitle="View historical subscription payment records"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Payment Details</DialogTitle>
            <DialogDescription>
              Transaction: {detailsRow?.transId} • BP: {detailsRow?.sapBpId}
            </DialogDescription>
          </DialogHeader>

          {detailsRow && (
            <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm text-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Transaction ID" value={detailsRow.transId} />
                <DetailItem label="Pay ID" value={detailsRow.payId} />
                <DetailItem label="Status" value={detailsRow.status} />
                <DetailItem label="Created Date" value={detailsRow.createDt} />
                <DetailItem label="Created TS" value={detailsRow.createTs} />
                <DetailItem label="Created By" value={detailsRow.createId} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Agent Name" value={detailsRow.name} />
                <DetailItem label="SAP BP ID" value={detailsRow.sapBpId} />
                <DetailItem label="SAP CA ID" value={detailsRow.sapCaId} />
                <DetailItem label="Module" value={detailsRow.module} />
                <DetailItem label="Module ID" value={detailsRow.moduleId} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Pay Amount" value={`${detailsRow.currency || ''} ${detailsRow.payAmount}`} />
                <DetailItem label="VAT Amount" value={detailsRow.vatAmount} />
                <DetailItem label="Total Amount" value={`${detailsRow.currency || ''} ${detailsRow.totalAmount}`} />
                <DetailItem label="Pay Type" value={detailsRow.payType} />
                <DetailItem label="Pay Mode" value={detailsRow.payMode} />
                <DetailItem label="Trans Type" value={detailsRow.transType} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Receipt No" value={detailsRow.receiptNo} />
                
                {/* Show Cheque No only for CHEQUE mode */}
                {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                  <DetailItem label="Cheque No" value={detailsRow.chequeNo} />
                )}
                
                {/* Show Bank Deposit ID for BANK_DEPOSIT mode (comes from chequeNo field) */}
                {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
                  <DetailItem label="Bank Deposit ID" value={detailsRow.chequeNo} />
                )}
                
                {/* Show dynamic date label based on payment mode */}
                {(String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" || 
                  String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT") && (
                  <DetailItem label={getDateLabel(detailsRow.payMode)} value={detailsRow.chequeDate} />
                )}
                
                {/* Show Bank Name and Branch for CHEQUE and BANK_DEPOSIT modes */}
                {(String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" || 
                  String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT") && (
                  <>
                    <DetailItem label="Bank Name" value={detailsRow.bankName} />
                    <DetailItem label="Branch Name" value={detailsRow.branchName} />
                  </>
                )}
                
                <DetailItem label="Online PG ID" value={detailsRow.onlPgId} />
                <DetailItem label="Online Trans ID" value={detailsRow.onlTransId} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Sales Org" value={detailsRow.salesOrg} />
                <DetailItem label="Division" value={detailsRow.division} />
                <DetailItem label="Collected By" value={detailsRow.collectedBy} />
                <DetailItem label="Collection Center" value={detailsRow.collectionCenter} />
                <DetailItem label="Coll. Center Code" value={detailsRow.collectionCenterCode} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Approved By" value={detailsRow.approvedBy} />
                <DetailItem label="Rejected By" value={detailsRow.rejectedBy} />
                <DetailItem label="Reason" value={detailsRow.reason} />
                <DetailItem label="CM Status" value={detailsRow.cmStatus} />
                <DetailItem label="CM Status Code" value={detailsRow.cmStatusCode} />
                <DetailItem label="CM Error Reason" value={detailsRow.cmErrorReason} />
                <DetailItem label="Updated By" value={detailsRow.updateId} />
                <DetailItem label="Updated TS" value={detailsRow.updateTs} />
              </div>

              <Separator />

              <div>
                <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">Description</div>
                <div className="p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap break-words">
                  {detailsRow.description || "No description provided"}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
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
              <div><div className="text-gray-500">Agent BP</div><div className="font-medium">{receiptRow.sapBpId || "-"}</div></div>
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
  const FILTER_FIELD_OPTIONS = useMemo(() => [
    { value: "transId", label: "Trans ID", type: "text" },
    ...(isAdmin ? [{ value: "sapBpId", label: "SAP BP ID", type: "text" }] : []),
    { value: "payMode", label: "Pay Mode", type: "select" },
    { value: "collectionCenter", label: "Collection Center", type: "text" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ], [isAdmin]);

  const [addSelectValue, setAddSelectValue] = useState("");

  const handleAddSelect = (val: string) => {
    addAdvFilter(val as FilterFieldKey);
    setAddSelectValue("");
  };

  const updateFilterRow = (id: string, updates: any) => {
    setAdvFilters((prev: any) => prev.map((row: any) =>
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-gray-50">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Select value={addSelectValue} onValueChange={handleAddSelect}>
          <SelectTrigger className="h-7 text-xs w-56">
            <SelectValue placeholder="Choose field..." />
          </SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No filters added yet.</div>}
        
        {advFilters.map((af: any) => {
           const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field);
           if (!fieldMeta) return null;

           return (
            <div key={af.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border rounded-md p-2 bg-white shadow-sm">
              <div className="md:col-span-3">
                <LabelSmall>Field</LabelSmall>
                <Select 
                    value={af.field} 
                    onValueChange={(newField) => updateFilterRow(af.id, { 
                        field: newField, 
                        value: "",
                        dateRange: newField === 'dateRange' ? { from: new Date(), to: new Date() } : undefined 
                    })}
                >
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder={fieldMeta.label} />
                    </SelectTrigger>
                    <SelectContent>
                        {FILTER_FIELD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <LabelSmall>Operator</LabelSmall>
                <Select value={af.op} onValueChange={(v) => updateFilterRow(af.id, { op: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["equals", "contains", "startsWith"].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-6">
                <LabelSmall>Value</LabelSmall>
                {af.field === "payMode" ? (
                  <Select value={af.value} onValueChange={(v) => updateFilterRow(af.id, { value: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CASH">CASH</SelectItem>
                        <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                        <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
                        {/* <SelectItem value="POS">POS</SelectItem> */}
                    </SelectContent>
                  </Select>
                ) : af.field === "dateRange" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs truncate px-2">
                        <CalendarIcon className="mr-2 h-3 w-3 flex-shrink-0" />
                        {af.dateRange?.from ? (
                          af.dateRange.to ? (
                            <span className="truncate">{format(af.dateRange.from, "MMM dd")} - {format(af.dateRange.to, "MMM dd")}</span>
                          ) : (
                            format(af.dateRange.from, "MMM dd, y")
                          )
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
                    className="h-7 text-xs" 
                    placeholder="Enter value..." 
                    value={af.value || ""} 
                    onChange={(e) => updateFilterRow(af.id, { value: e.target.value })} 
                  />
                )}
              </div>
              
              <div className="md:col-span-1 flex justify-end items-end h-full pt-4">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeAdvFilter(af.id)}>
                    <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
}
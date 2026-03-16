import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerPaymentApi } from "@/lib/api-client";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Info, SlidersHorizontal, Calendar as CalendarIcon, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Helper functions and types
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ANY = "__ANY__";

type AdjustmentDetail = {
  transId: string;
  adjustmentId: string;
  createTs: string;
  customerName: string;
  sapBpId: string;
  receiptNo: string;
  adjustmentType: string;
  totalAmount: number;
  status: string;
  cmStatus: string;
  approvedBy: string;
  reason: string;
  remark: string;
  module: string;
  currency: string;
  raw: any;
};

type AdjustmentFilters = {
  transId: string;
  sapBpId: string;
  status: string;
  actionType: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "transId" | "sapBpId" | "status" | "actionType" | "dateRange";
type FilterOp = "equals" | "contains" | "between";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  op: FilterOp;
  value?: string;
  dateRange?: DateRange;
};

export default function AdjustmentHistoryTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<AdjustmentFilters>({
    transId: "",
    sapBpId: "",
    status: "",
    actionType: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo)
  });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adjustment-history', filters, pageIndex, pageSize],
    queryFn: async () => {
      const payload: any = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        offSet: String(pageIndex * pageSize),
        limit: String(pageSize),
      };

      if (filters.transId) payload.transId = filters.transId;
      if (filters.sapBpId) payload.sapBpId = filters.sapBpId;
      if (filters.status && filters.status !== ANY) payload.status = filters.status;
      if (filters.actionType && filters.actionType !== ANY) payload.actionType = filters.actionType;

      const response = await customerPaymentApi.fetchAdjustmentDetails(payload);
      return response.data;
    }
  });

  const adjustments: AdjustmentDetail[] = useMemo(() => {
    const list = data?.adjustmentDetails || [];
    return list.map((item: any) => ({
      transId: item.transId,
      adjustmentId: item.id || item.transId,
      createTs: item.createTs,
      customerName: item.customerName,
      sapBpId: item.sapBpId,
      receiptNo: item.receiptNo,
      adjustmentType: item.adjustmentType,
      totalAmount: Number(item.totalAmount || 0),
      status: item.status,
      cmStatus: item.cmStatus,
      approvedBy: item.approvedBy,
      reason: item.adjustmentReason,
      remark: item.remark,
      module: item.module,
      currency: item.currency || "",
      raw: item,
    }));
  }, [data]);

  const totalCount = data?.data?.totalRecordCount || 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearch = () => {
    setPageIndex(0);
    refetch();
  };

  const handleReset = () => {
    setFilters({
      transId: "",
      sapBpId: "",
      status: "",
      actionType: "",
      fromDate: initialFrom,
      toDate: initialTo,
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SUCCESS':
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED':
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING': return <Clock className="h-3 w-3 mr-1" />;
      case 'SUCCESS':
      case 'APPROVED': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'REJECTED':
      case 'FAILED': return <XCircle className="h-3 w-3 mr-1" />;
      default: return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };

  const getTypeColor = (type: string) => {
    const t = type?.toUpperCase();
    return t === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatCurrency = (amount: number, currency: string = "TZS") => {
  const currencyLocaleMap: Record<string, string> = {
    TZS: "en-TZ",
    MWK: "en-MW",
    USD: "en-US",
    KES: "en-KE",
    UGX: "en-UG",
  };
  
  const locale = currencyLocaleMap[currency] || "en-US";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "yyyy-MM-dd HH:mm:ss");
    } catch (e) {
      return date;
    }
  };

  const columns: DataTableColumn<AdjustmentDetail>[] = [
    { key: "transId", label: "Transaction ID", sortable: true },
    { key: "createTs", label: "Date", sortable: true, render: (v) => formatDate(v) },
    { key: "customerName", label: "Customer", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    { key: "module", label: "Module", sortable: true },
    { key: "adjustmentType", label: "Type", sortable: true, render: (v) => <Badge className={getTypeColor(v)}>{v}</Badge> },
   {
  key: "totalAmount",
  label: "Amount",
  sortable: true,
  render: (v, row) => `${row.currency} ${Number(v).toLocaleString()}`
},
    { key: "status", label: "Status", sortable: true, render: (v) => <Badge className={getStatusColor(v)}>{getStatusIcon(v)}<span>{v}</span></Badge> },
    {
      key: "cmStatus",
      label: "CM Status",
      sortable: true,
      render: (v) => {
        let label = v;
        let color = "bg-gray-100 text-gray-800";
        if (v === 'S') { label = 'Success'; color = "bg-green-100 text-green-800"; }
        else if (v === 'P') { label = 'Inprocess'; color = "bg-yellow-100 text-yellow-800"; }
        else if (v === 'F') { label = 'Failed'; color = "bg-red-100 text-red-800"; }
        return <Badge className={color}>{label || "-"}</Badge>;
      }
    },
    {
      key: "raw",
      label: "Details",
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r.raw); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
  ];

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
          <div className="md:col-span-3"><LabelSmall>Transaction ID</LabelSmall><Input value={filters.transId} onChange={(e) => setFilters(f => ({ ...f, transId: e.target.value }))} className="h-7 text-xs" /></div>
          <div className="md:col-span-2"><LabelSmall>SAP BP ID</LabelSmall><Input value={filters.sapBpId} onChange={(e) => setFilters(f => ({ ...f, sapBpId: e.target.value }))} className="h-7 text-xs" /></div>
          <div className="md:col-span-2">
            <LabelSmall>Status</LabelSmall>
            <Select value={filters.status || ANY} onValueChange={(v) => setFilters(f => ({ ...f, status: v === ANY ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All Statuses</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
                <SelectItem value="INPROCESS">INPROCESS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <LabelSmall>Type</LabelSmall>
            <Select value={filters.actionType || ANY} onValueChange={(v) => setFilters(f => ({ ...f, actionType: v === ANY ? "" : v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All Types</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
                <SelectItem value="Debit">Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <LabelSmall>Date Range</LabelSmall>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" selected={basicRange} onSelect={(r) => { setBasicRange(r); setFilters(f => ({ ...f, fromDate: r?.from ? toYmd(r.from) : "", toDate: r?.to ? toYmd(r.to) : "" })) }} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {useAdvanced && (
        <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />
      )}

      <DataTable<AdjustmentDetail>
        title="Adjustment Records"
        subtitle="View history of all adjustments"
        data={adjustments}
        columns={columns}
        loading={isLoading}
        manualPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjustment Details</DialogTitle></DialogHeader>
          {!detailsRow ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-gray-500">Transaction ID</div><div className="font-medium">{detailsRow.id || detailsRow.transId || "-"}</div></div>
              <div><div className="text-gray-500">Date</div><div className="font-medium">{formatDate(detailsRow.createTs)}</div></div>
              <div><div className="text-gray-500">Customer</div><div className="font-medium">{detailsRow.customerName || "-"}</div></div>
              <div><div className="text-gray-500">SAP BP ID</div><div className="font-medium">{detailsRow.sapBpId || "-"}</div></div>
              <div><div className="text-gray-500">Type</div><div className="font-medium">{detailsRow.adjustmentType || "-"}</div></div>
              <div>
  <div className="text-gray-500">Amount</div>
  <div className="font-medium">{detailsRow.currency} {Number(detailsRow.totalAmount).toLocaleString()}</div>
</div>
              <div><div className="text-gray-500">Status</div><div className="font-medium">{detailsRow.status || "-"}</div></div>
              <div><div className="text-gray-500">CM Status</div><div className="font-medium">{detailsRow.cmStatus || "N/A"}</div></div>
              <div><div className="text-gray-500">Invoice / Receipt</div><div className="font-medium">{detailsRow.receiptNo || "-"}</div></div>
              <div><div className="text-gray-500">Approved By</div><div className="font-medium">{detailsRow.approvedBy || "-"}</div></div>
              <div className="col-span-2"><div className="text-gray-500">Reason</div><div className="font-medium">{detailsRow.adjustmentReason || "-"}</div></div>
              <div className="col-span-2"><div className="text-gray-500">Remark</div><div className="font-medium">{detailsRow.remark || "-"}</div></div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-medium text-gray-700">{children}</label>;

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<AdjustmentFilters>>;
  initialFrom: string;
  initialTo: string;
}) {
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange"; }[] = [
    { value: "transId", label: "Transaction ID", type: "text" },
    { value: "sapBpId", label: "SAP BP ID", type: "text" },
    { value: "status", label: "Status", type: "select" },
    { value: "actionType", label: "Type", type: "select" },
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
    const nextFilters: AdjustmentFilters = { transId: "", sapBpId: "", status: "", actionType: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f: AdvancedFilter) => {
      switch (f.field) {
        case "transId": nextFilters.transId = f.value || ""; break;
        case "sapBpId": nextFilters.sapBpId = f.value || ""; break;
        case "status": nextFilters.status = f.value || ""; break;
        case "actionType": nextFilters.actionType = f.value || ""; break;
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
          const fieldMeta = FILTER_FIELD_OPTIONS.find(f => f.value === af.field)!;
          const ops = fieldMeta.type === 'text' ? ["contains", "equals"] : ["equals"];
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3"><Select value={af.field} onValueChange={(v: FilterFieldKey) => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, field: v, value: "", op: 'contains' } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FILTER_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2"><Select value={af.op} onValueChange={(v: FilterOp) => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, op: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{ops.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-6">
                {fieldMeta.type === 'text' && <Input className="h-7 text-xs" value={af.value} onChange={e => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, value: e.target.value } : x))} />}
                {fieldMeta.type === 'select' && af.field === 'status' && <Select value={af.value} onValueChange={v => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, value: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select Status" /></SelectTrigger><SelectContent><SelectItem value="SUCCESS">SUCCESS</SelectItem><SelectItem value="PENDING">PENDING</SelectItem><SelectItem value="FAILED">FAILED</SelectItem></SelectContent></Select>}
                {fieldMeta.type === 'select' && af.field === 'actionType' && <Select value={af.value} onValueChange={v => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, value: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select Type" /></SelectTrigger><SelectContent><SelectItem value="Credit">Credit</SelectItem><SelectItem value="Debit">Debit</SelectItem></SelectContent></Select>}
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
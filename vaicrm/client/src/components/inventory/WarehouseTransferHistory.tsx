// src/components/inventory/WarehouseTransferHistory.tsx

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CheckCircle2, AlertTriangle, FileText, Info, SlidersHorizontal, Calendar as CalendarIcon, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { useStockHistory } from "@/hooks/use-inventory-data";
import { Badge } from "@/components/ui/badge";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type StockItemRaw = {
  srId: string;
  requestId: string;
  createDt: string;
  status: string;
  fromPlantName: string;
  toPlantName: string;
  fromStoreLocation: string | null;
  toStoreLocation: string | null;
  material: string;
  itemQty: string;
  itemType: string;
  remark: string | null;
  country: string;
  salesOrg: string;
  createId: string;
  description: string | null;
  isFileUpload: string | null;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
};

type AggregatedRow = {
  requestId: string;
  createDt: string;
  status: string;
  fromPlant: string;
  toPlant: string;
  fromStore: string | null;
  toStore: string | null;
  totalItems: number;
  raw: StockItemRaw[];
  country: string;
  salesOrg: string;
  createId: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
};

function aggregate(details: StockItemRaw[]): AggregatedRow[] {
  const map = new Map<string, StockItemRaw[]>();
  (details || []).forEach((ln) => {
    if (!map.has(ln.requestId)) map.set(ln.requestId, []);
    map.get(ln.requestId)!.push(ln);
  });

  const rows: AggregatedRow[] = [];
  map.forEach((arr, reqId) => {
    const first = arr[0];
    rows.push({
      requestId: reqId,
      createDt: first.createDt,
      status: first.status,
      fromPlant: first.fromPlantName,
      toPlant: first.toPlantName,
      fromStore: first.fromStoreLocation,
      toStore: first.toStoreLocation,
      totalItems: arr.length,
      country: first.country,
      salesOrg: first.salesOrg,
      createId: first.createId,
      cmStatus: first.cmStatus,
      cmStatusMsg: first.cmStatusMsg,
      cmErrorReason: first.cmErrorReason,
      raw: arr,
    });
  });
  rows.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
  return rows;
}

type FilterState = {
  requestId: string;
  fromPlantName: string;
  toPlantName: string;
  status: string;
  fromDate: string;
  toDate: string;
  material: string;
};

// Updated Filter Keys
type FilterFieldKey = "requestId" | "fromPlantName" | "toPlantName" | "status" | "dateRange" | "material";

type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function WarehouseTransferHistory({ statusFilter }: { statusFilter?: string }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AggregatedRow | null>(null);
  const [useAdvanced, setUseAdvanced] = useState(false);

  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<FilterState>({
    requestId: "",
    fromPlantName: "",
    toPlantName: "",
    status: statusFilter || "",
    fromDate: initialFrom,
    toDate: initialTo,
    material: "",
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status: statusFilter || ""
    }));
  }, [statusFilter]);

  const debouncedFilters = useDebounce(filters, 500);
  const { material: _material, ...apiParams } = debouncedFilters;

  const effectiveParams = {
    ...apiParams,
    status: statusFilter ? statusFilter : apiParams.status,
    type: "WT"
  };

  const { data: rawData = [], isLoading } = useStockHistory(effectiveParams);

  const allRows = useMemo(() => {
    let processedData = rawData;

    if (statusFilter) {
      processedData = rawData.filter((item: StockItemRaw) => item.isFileUpload === 'N');
    }

    let rows = aggregate(processedData);

    if (filters.material) {
      const search = filters.material.trim().toLowerCase();
      rows = rows.filter(row =>
        row.raw.some(item => 
          (item.material || "").toLowerCase().includes(search) || 
          (item.itemType || "").toLowerCase().includes(search)
        )
      );
    }
    return rows;
  }, [rawData, filters.material, statusFilter]);

  const totalCount = allRows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  
  const pagedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters, statusFilter]);

  const handleReset = () => {
    setFilters({
      requestId: "",
      fromPlantName: "",
      toPlantName: "",
      status: statusFilter || "",
      fromDate: initialFrom,
      toDate: initialTo,
      material: "",
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
  };

  const columns: DataTableColumn<AggregatedRow>[] = [
    { key: "requestId", label: "Request ID", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: "fromPlant", label: "From Plant", sortable: true },
    { key: "toPlant", label: "To Plant", sortable: true },
    // ADDED: Material Column
    {
      key: "raw", 
      label: "Material",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{row.raw[0].itemType}</span>
          <span className="text-[10px] text-muted-foreground">{row.raw[0].material}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={v === "APPROVED" ? "default" : v === "REJECTED" ? "destructive" : "secondary"} className="text-[10px]">
          {v}
        </Badge>
      )
    },
    { key: "createDt", label: "Date", sortable: true },
    {
      key: "totalItems",
      label: "Action",
      render: (_, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r); setDetailsOpen(true); }} className="h-7 text-xs">
          <Info className="h-3 w-3 mr-1" /> View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)} className="h-8 text-xs">Basic</Button>
          <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)} className="h-8 text-xs">
            <SlidersHorizontal className="h-3 w-3 mr-1" /> Advanced
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs w-full sm:w-auto">Reset Filters</Button>
      </div>

      {/* Basic Filters */}
      {!useAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 border p-3 rounded-md bg-gray-50/50">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Request ID</label>
            <Input value={filters.requestId} onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))} placeholder="WT..." className="h-8 text-xs bg-white" />
          </div>
          
          {/* Material Input */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
            <Input value={filters.material} onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))} placeholder="Material name/code..." className="h-8 text-xs bg-white" />
          </div>

          {!statusFilter && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "ALL" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="INPROCESS">INPROCESS</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs bg-white">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd")} - ${format(basicRange.to, "LLL dd")}` : format(basicRange.from, "LLL dd")) : <span>Pick a range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange}
                  onSelect={(range) => {
                    setBasicRange(range);
                    setFilters((f) => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" }));
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {useAdvanced && (
        <AdvancedFilters filters={filters} advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} statusFilter={statusFilter} />
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            title={statusFilter ? "Active Transfers" : "Transfer History"}
            subtitle={statusFilter ? "Track transfers currently in process" : "Complete history of warehouse transfers"}
            icon={<FileText className="h-4 w-4" />}
            headerVariant="gradient"
            showCount
            totalCount={totalCount}
            data={pagedData}
            columns={columns}
            loading={isLoading}
            manualPagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-azam-blue" /> Transfer Details</DialogTitle>
            <DialogDescription>ID: <span className="font-mono text-xs text-black">{detailsRow?.requestId}</span></DialogDescription>
          </DialogHeader>
          {detailsRow && (
            <div className="space-y-4 text-sm">
              {/* CM Status Block */}
              {(detailsRow.cmStatus || detailsRow.cmStatusMsg || detailsRow.cmErrorReason) && (
                <Card className={`border shadow-sm ${detailsRow.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' :
                  detailsRow.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' :
                    detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E' ? 'bg-red-50/60 border-red-200' :
                      'bg-blue-50/60 border-blue-200'
                  }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {detailsRow.cmStatus === 'S' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : detailsRow.cmStatus === 'P' ? (
                          <Info className="h-5 w-5 text-blue-600" />
                        ) : (detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E') ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="space-y-1 w-full">
                        <h4 className={`font-semibold text-sm ${detailsRow.cmStatus === 'S' ? 'text-green-900' :
                          detailsRow.cmStatus === 'P' ? 'text-blue-900' :
                            detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E' ? 'text-red-900' : 'text-blue-900'
                          }`}>
                          CM Status: {detailsRow.cmStatus === 'S' ? 'Success' : detailsRow.cmStatus === 'P' ? 'Inprocess' : detailsRow.cmStatus === 'F' ? 'Failed' : detailsRow.cmStatus === 'E' ? 'Error' : detailsRow.cmStatus}
                        </h4>

                        {detailsRow.cmStatusMsg && (
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Message: </span>
                            {detailsRow.cmStatusMsg}
                          </div>
                        )}

                        {detailsRow.cmErrorReason && (
                          <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800">
                            <span className="font-medium text-red-900">Error Reason: </span>
                            {detailsRow.cmErrorReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* DETAILS GRID: Updated with Store Locations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
                <div><div className="text-xs text-gray-500 uppercase">Country</div><div className="font-medium">{detailsRow.country || '-'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Sales Org</div><div className="font-medium">{detailsRow.salesOrg || '-'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Created By</div><div className="font-medium">{detailsRow.createId || '-'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Date</div><div className="font-medium">{detailsRow.createDt}</div></div>
                
                <div><div className="text-xs text-gray-500 uppercase">From Plant</div><div className="font-medium">{detailsRow.fromPlant}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">From Store</div><div className="font-medium">{detailsRow.fromStore || '-'}</div></div>
                
                <div><div className="text-xs text-gray-500 uppercase">To Plant</div><div className="font-medium">{detailsRow.toPlant}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">To Store</div><div className="font-medium">{detailsRow.toStore || '-'}</div></div>
                
                <div className="col-span-2 md:col-span-4"><div className="text-xs text-gray-500 uppercase">Status</div><Badge className="mt-1 h-5 text-[10px]">{detailsRow.status}</Badge></div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-sm">Items ({detailsRow.totalItems})</h4>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 border-b">
                      <tr><th className="p-2 font-medium">Material</th><th className="p-2 font-medium">Type</th><th className="p-2 font-medium text-right">Qty</th><th className="p-2 font-medium">Description</th><th className="p-2 font-medium">Remark</th><th className="p-2 font-medium">Upload?</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {detailsRow.raw.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.material}</td><td className="p-2">{item.itemType}</td><td className="p-2 text-right font-mono">{item.itemQty}</td><td className="p-2 text-gray-600">{item.description || '-'}</td><td className="p-2 text-gray-500 italic">{item.remark || '-'}</td>
                          <td className="p-2 text-xs">{item.isFileUpload || 'N'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline" size="sm">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvancedFilters({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, filters, statusFilter }: any) {
  const FIELDS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    { value: "material", label: "Material", type: "text" }, // Added
    { value: "fromPlantName", label: "From Plant", type: "text" },
    { value: "toPlantName", label: "To Plant", type: "text" },
    ...(statusFilter ? [] : [{ value: "status" as FilterFieldKey, label: "Status", type: "select" as const }]), // Fixed Type Error
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addFilter = (field: string) => {
    if (field === "dateRange" && advFilters.some((f: any) => f.field === "dateRange")) return;
    const newF = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined };
    setAdvFilters((prev: any) => [...prev, newF]);
  };

  const removeFilter = (id: string) => setAdvFilters((prev: any) => prev.filter((f: any) => f.id !== id));

  useEffect(() => {
    const next = { requestId: "", fromPlantName: "", toPlantName: "", status: statusFilter || "", fromDate: initialFrom, toDate: initialTo, material: "" };
    advFilters.forEach((f: any) => {
      if (f.field === "dateRange" && f.dateRange?.from) {
        next.fromDate = toYmd(f.dateRange.from); next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
      } else if (f.field === "status") {
        next.status = f.value === "ALL" ? "" : f.value;
      } else {
        // @ts-ignore
        next[f.field] = f.value;
      }
    });
    setFilters(next);
  }, [advFilters, initialFrom, initialTo, setFilters, statusFilter]);

  return (
    <div className="border p-3 rounded-md space-y-3 bg-gray-50/50">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Add Filter:</span>
        <Select onValueChange={addFilter}>
          <SelectTrigger className="h-7 text-xs w-48 bg-white"><SelectValue placeholder="Select field..." /></SelectTrigger>
          <SelectContent>
            {FIELDS.map(f => {
              // Disable already selected options (except status if managed elsewhere)
              const isDisabled = advFilters.some((af: any) => af.field === f.value);
              return <SelectItem key={f.value} value={f.value} disabled={isDisabled}>{f.label}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {advFilters.map((af: any) => {
          const def = FIELDS.find(f => f.value === af.field);
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center bg-white p-1 rounded border">
              <div className="col-span-4 sm:col-span-3 text-xs font-medium px-2">{def?.label}</div>
              <div className="col-span-7 sm:col-span-8">
                {def?.type === "text" && <Input className="h-7 text-xs border-none shadow-none focus-visible:ring-0" placeholder={`Enter ${def.label}...`} value={af.value} onChange={(e) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: e.target.value } : p))} />}
                {def?.type === "select" && <Select value={af.value || "ALL"} onValueChange={(v) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: v } : p))}><SelectTrigger className="h-7 text-xs border-none shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="INPROCESS">INPROCESS</SelectItem><SelectItem value="APPROVED">APPROVED</SelectItem><SelectItem value="REJECTED">REJECTED</SelectItem></SelectContent></Select>}
                {def?.type === "daterange" && <Popover><PopoverTrigger asChild><Button variant="ghost" className="w-full justify-start text-left h-7 text-xs px-2">{af.dateRange?.from ? `${format(af.dateRange.from, "MMM dd")} - ${af.dateRange.to ? format(af.dateRange.to, "MMM dd") : "..."}` : "Pick date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, dateRange: range } : p))} numberOfMonths={2} /></PopoverContent></Popover>}
              </div>
              <div className="col-span-1 flex justify-end"><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFilter(af.id)}><X className="h-3 w-3" /></Button></div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
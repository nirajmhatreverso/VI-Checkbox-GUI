import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, FileText, Info, SlidersHorizontal, Calendar as CalendarIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { useStockHistory } from "@/hooks/use-inventory-data";
import { useAuthContext } from "@/context/AuthProvider";

// --- Helpers ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const getStatusBadgeStyles = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS" || s === "APPROVED") {
    return "bg-green-100 text-green-700 hover:bg-green-100";
  }
  if (s === "INPROCESS" || s === "PENDING" || s === "TRANSIT") {
    return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  }
  if (s === "REJECTED") {
    return "bg-red-100 text-red-700 hover:bg-red-100";
  }
  return "bg-gray-100 text-gray-700 hover:bg-gray-100";
};

// --- Types ---
type StockItemRaw = {
  srId: string;
  requestId: string;
  createDt: string;
  status: string;
  fromPlantName: string;
  toPlantName: string;
  fromStoreLocation: string;
  toStoreLocation: string | null;
  material: string;
  approvedItemQty: string;
  itemQty:string;
  itemType: string;
  remark: string | null;
  country: string;
  salesOrg: string;
  createId: string;
  description: string | null;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
  receiverApprovedItemQty?: string;
  reason?:string;
};

type AggregatedRow = {
  requestId: string;
  createDt: string;
  status: string;
  fromPlant: string;
  toPlant: string;
  fromStore: string | null; // Added
  toStore: string | null;   // Added
  totalItems: number;
  raw: StockItemRaw[];
  country: string;
  salesOrg: string;
  createId: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
};

// --- Aggregation Logic ---
function aggregate(details: StockItemRaw[]): AggregatedRow[] {
  // Currently mapping 1-to-1 as per previous logic, but structured for potential grouping
  const rows: AggregatedRow[] = (details || []).map((item) => ({
    requestId: item.requestId,
    createDt: item.createDt,
    status: item.status,
    fromPlant: item.fromPlantName,
    toPlant: item.toPlantName,
    fromStore: item.fromStoreLocation, // Map Store
    toStore: item.toStoreLocation,     // Map Store
    totalItems: 1,
    country: item.country,
    salesOrg: item.salesOrg,
    createId: item.createId,
    cmStatus: item.cmStatus,
    cmStatusMsg: item.cmStatusMsg,
    cmErrorReason: item.cmErrorReason,
    raw: [item],
  }));

  rows.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
  return rows;
}

// --- Filter Types ---
type FilterState = {
  requestId: string;
  fromPlantName: string;
  toPlantName: string;
  status: string;
  fromDate: string;
  toDate: string;
  material: string;
};

// Updated Filter Field Keys
type FilterFieldKey = "requestId" | "fromPlantName" | "toPlantName" | "status" | "dateRange" | "material";

type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function StockRequestHistory() {
  // Pagination State
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
const { user } = useAuthContext();
const shouldSendSapBpId = user?.isOtc === "Y" || user?.isMainPlant === "Y";
  // UI State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AggregatedRow | null>(null);
  const [useAdvanced, setUseAdvanced] = useState(false);

  // Filter State
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<FilterState>({
    requestId: "",
    fromPlantName: "",
    toPlantName: "",
    status: "",
    fromDate: initialFrom,
    toDate: initialTo,
    material: "",
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  // Debounce
  const debouncedFilters = useDebounce(filters, 500);
  const { material: _material, ...apiParams } = debouncedFilters;

  // API Query
  const { data: rawData = [], isLoading } = useStockHistory({
    ...apiParams,
    type: "SR",
    ...(shouldSendSapBpId ? { sapBpId: user?.sapBpId || null } : {}),
  });

  // Process Data (Client-side filtering for Material)
  const allRows = useMemo(() => {
    let rows = aggregate(rawData);

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
  }, [rawData, filters.material]);

  // Client-Side Pagination Logic
  const totalCount = allRows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  
  const pagedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, pageIndex, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters]);

  // Handlers
  const handleReset = () => {
    setFilters({
      requestId: "",
      fromPlantName: "",
      toPlantName: "",
      status: "",
      fromDate: initialFrom,
      toDate: initialTo,
      material: "",
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
  };

  // Columns Definition
  const columns: DataTableColumn<AggregatedRow>[] = [
    { key: "requestId", label: "Request ID", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: "fromPlant", label: "From Plant", sortable: true },
    { key: "toPlant", label: "To Plant", sortable: true },
    // NEW MATERIAL COLUMN
    {
      key: "raw", // Accessing raw data for display
      label: "Material",
      render: (_, row) => (
        <div className="flex flex-col">
          {/* Displaying first item's details since we group 1-to-1 currently */}
          <span className="font-medium text-xs">{row.raw[0].itemType}</span>
          <span className="text-[10px] text-muted-foreground">{row.raw[0].material}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${getStatusBadgeStyles(v)} border-transparent font-medium`}
        >
          {v}
        </Badge>
      )
    },
    { key: "createDt", label: "Date", sortable: true },
    {
      key: "totalItems",
      label: "Action",
      render: (_, r) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            setDetailsRow(r);
            setDetailsOpen(true);
          }}
          className="h-7 text-xs"
        >
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
          <Button
            variant={!useAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setUseAdvanced(false)}
            className="h-8 text-xs"
          >
            Basic
          </Button>
          <Button
            variant={useAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setUseAdvanced(true)}
            className="h-8 text-xs"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Advanced
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs w-full sm:w-auto">
          Reset Filters
        </Button>
      </div>

      {/* Basic Filters */}
      {!useAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 border p-3 rounded-md bg-gray-50/50">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Request ID</label>
            <Input
              value={filters.requestId}
              onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
              placeholder="SR..."
              className="h-8 text-xs bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
            <Input
              value={filters.material}
              onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))}
              placeholder="Material..."
              className="h-8 text-xs bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="INPROCESS">INPROCESS</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs bg-white">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {basicRange?.from ? (
                    basicRange.to ? (
                      `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}`
                    ) : (
                      format(basicRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={basicRange?.from}
                  selected={basicRange}
                  onSelect={(range) => {
                    setBasicRange(range);
                    setFilters((f) => ({
                      ...f,
                      fromDate: range?.from ? toYmd(range.from) : "",
                      toDate: range?.to ? toYmd(range.to) : "",
                    }));
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Advanced Filters Component */}
      {useAdvanced && (
        <AdvancedFilters
          filters={filters}
          advFilters={advFilters}
          setAdvFilters={setAdvFilters}
          setFilters={setFilters}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            title="Request History"
            subtitle="Track submitted stock requests"
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
            <DialogTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-azam-blue" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              ID: <span className="font-mono text-xs text-black">{detailsRow?.requestId}</span>
            </DialogDescription>
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

              {/* Header Info - Updated grid to include Store Locations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Country</div>
                  <div className="font-medium">{detailsRow.country || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Sales Org</div>
                  <div className="font-medium">{detailsRow.salesOrg || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Created By</div>
                  <div className="font-medium">{detailsRow.createId || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Date</div>
                  <div className="font-medium">{detailsRow.createDt}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase">From Plant</div>
                  <div className="font-medium">{detailsRow.fromPlant}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">From Store</div>
                  <div className="font-medium">{detailsRow.fromStore || '-'}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase">To Plant</div>
                  <div className="font-medium">{detailsRow.toPlant}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">To Store</div>
                  <div className="font-medium">{detailsRow.toStore || '-'}</div>
                </div>

                <div className="col-span-2 md:col-span-4">
                  <div className="text-xs text-gray-500 uppercase">Status</div>
                  <Badge variant="outline" className={`mt-1 h-5 text-[10px] ${getStatusBadgeStyles(detailsRow.status)} border-transparent font-medium`}>{detailsRow.status}</Badge>
                </div>
              </div>

              {/* Items Table */}
              <div>
  <h4 className="font-semibold mb-2 text-sm">Items ({detailsRow.totalItems})</h4>
  <div className="border rounded overflow-hidden">
    <table className="w-full text-left text-xs">
      <thead className="bg-gray-100 border-b">
        <tr>
          <th className="p-2 font-medium">Material</th>
          <th className="p-2 font-medium">Type</th>
          <th className="p-2 font-medium text-right">Requested Qty</th>
          <th className="p-2 font-medium text-right">Approved Qty</th>
          <th className="p-2 font-medium text-right">Receiver Qty</th>
          <th className="p-2 font-medium">Reason</th>
          <th className="p-2 font-medium">Description</th>
          <th className="p-2 font-medium">Remark</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {detailsRow.raw.map((item, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="p-2 font-medium">{item.material}</td>
            <td className="p-2">{item.itemType}</td>

            <td className="p-2 text-right font-mono">{item.itemQty || "-"}</td>
            <td className="p-2 text-right font-mono">{item.approvedItemQty || "-"}</td>
            <td className="p-2 text-right font-mono">{item.receiverApprovedItemQty || "-"}</td>

            <td className="p-2">{item.reason || "-"}</td>
            <td className="p-2 text-gray-600">{item.description || "-"}</td>
            <td className="p-2 text-gray-500 italic">{item.remark || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-Components ---

function AdvancedFilters({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, filters }: any) {
  // Added Material to fields
  const FIELDS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    { value: "material", label: "Material", type: "text" }, // Added
    { value: "fromPlantName", label: "From Plant", type: "text" },
    { value: "toPlantName", label: "To Plant", type: "text" },
    { value: "status", label: "Status", type: "select" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addFilter = (field: string) => {
    // Prevent duplicates
    if (advFilters.some((f: any) => f.field === field)) return;

    const newF = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined
    };
    setAdvFilters((prev: any) => [...prev, newF]);
  };

  const removeFilter = (id: string) => setAdvFilters((prev: any) => prev.filter((f: any) => f.id !== id));

  // Sync Advanced Filters to Main Filter State
  useEffect(() => {
    const next = {
      requestId: "", fromPlantName: "", toPlantName: "", status: "", fromDate: initialFrom, toDate: initialTo, material: ""
    };

    advFilters.forEach((f: any) => {
      if (f.field === "dateRange" && f.dateRange?.from) {
        next.fromDate = toYmd(f.dateRange.from);
        next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
      } else if (f.field === "status") {
        next.status = f.value === "ALL" ? "" : f.value;
      } else {
        // @ts-ignore
        next[f.field] = f.value;
      }
    });
    setFilters(next);
  }, [advFilters, initialFrom, initialTo, setFilters]);

  return (
    <div className="border p-3 rounded-md space-y-3 bg-gray-50/50">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Add Filter:</span>
        <Select onValueChange={addFilter}>
          <SelectTrigger className="h-7 text-xs w-48 bg-white"><SelectValue placeholder="Select field..." /></SelectTrigger>
          <SelectContent>
            {FIELDS.map(f => {
              // Disable if already selected
              const isDisabled = advFilters.some((af: any) => af.field === f.value);
              return <SelectItem key={f.value} value={f.value} disabled={isDisabled}>{f.label}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-gray-400 italic">No active filters</div>}
        {advFilters.map((af: any) => {
          const def = FIELDS.find(f => f.value === af.field);
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center bg-white p-1 rounded border">
              <div className="col-span-4 sm:col-span-3 text-xs font-medium px-2">{def?.label}</div>
              <div className="col-span-7 sm:col-span-8">
                {def?.type === "text" && (
                  <Input
                    className="h-7 text-xs border-none shadow-none focus-visible:ring-0"
                    placeholder={`Enter ${def?.label}...`}
                    value={af.value}
                    onChange={(e) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: e.target.value } : p))}
                  />
                )}
                {def?.type === "select" && (
                  <Select value={af.value || "ALL"} onValueChange={(v) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: v } : p))}>
                    <SelectTrigger className="h-7 text-xs border-none shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="INPROCESS">INPROCESS</SelectItem>
                      <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {def?.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-left h-7 text-xs px-2">
                        {af.dateRange?.from ? `${format(af.dateRange.from, "MMM dd")} - ${af.dateRange.to ? format(af.dateRange.to, "MMM dd") : "..."}` : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange}
                        onSelect={(range) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, dateRange: range } : p))}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFilter(af.id)}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
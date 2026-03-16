import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileText, Info, SlidersHorizontal, X, Calendar as CalendarIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthContext } from "@/context/AuthProvider";

// 1. Better Type Definitions
interface HwOrderDetail {
  requestId: string;
  sapBpId: string;
  status: string;
  createDt: string;
  currency: string;
  itemAmount: string | number;
  itemQty: string | number;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
  itemType?: string;
  material?: string;
  priceType?: string;
  module?: string;
  plantName?: string;
  sapSoId?: string;
  sapCaId?: string;
  remark?: string;
}

type HistoryRow = {
  requestId: string;
  sapBpId: string;
  totalAmount: number;
  currency: string;
  status: string;
  createDt: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  cmErrorReason?: string;
  raw: HwOrderDetail[];
  details?: string;
};

// 2. Safer Date Utils
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
};
const todayYmd = () => format(new Date(), "yyyy-MM-dd");
const daysAgoYmd = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return format(d, "yyyy-MM-dd");
};

function aggregate(details: HwOrderDetail[]): HistoryRow[] {
  const map = new Map<string, HwOrderDetail[]>();
  (details || []).forEach((ln) => {
    if (!map.has(ln.requestId)) map.set(ln.requestId, []);
    map.get(ln.requestId)!.push(ln);
  });
  const rows: HistoryRow[] = [];
  map.forEach((arr, reqId) => {
    const first = arr[0];
    rows.push({
      requestId: reqId,
      sapBpId: first?.sapBpId || "",
      status: (first?.status || "").toUpperCase(),
      createDt: first?.createDt || "",
      currency: first?.currency || "",
      totalAmount: arr.reduce((sum, a) => sum + (Number(a.itemAmount) || 0), 0),
      cmStatus: first?.cmStatus || "",
      cmStatusMsg: first?.cmStatusMsg || "",
      cmErrorReason: first?.cmErrorReason || "",
      raw: arr,
    });
  });
  rows.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
  return rows;
}

type HistoryFilters = {
  requestId: string;
  sapBpId: string;
  status: "ALL" | "INPROCESS" | "SUCCESS" | "REJECTED";
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "requestId" | "sapBpId" | "status" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function HardwareSaleHistory() {
  const { user } = useAuthContext();

  // --- User Role Detection ---
  // Admin: allAccess === "Y"
  // Non-Admin: allAccess === "N" (includes Main Plant users and regular Agents)
  const isAdminUser = user?.allAccess === "Y";
  const isMainPlantUser = user?.isMainPlant === "Y";
  const loggedInUserBpId = user?.sapBpId || "";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<HistoryRow | null>(null);

  const aggregatedItems = useMemo(() => {
    if (!detailsRow?.raw) return [];
    const map = new Map<string, any>();
    (detailsRow.raw || []).forEach((item: any) => {
      const name = item.itemType || item.material || "";
      const pType = item.priceType || "";
      const amt = Number(item.itemAmount || 0);
      const curr = item.currency || "";
      const key = `${name}|${pType}|${curr}`;

      if (map.has(key)) {
        const ex = map.get(key);
        ex.itemQty = (Number(ex.itemQty) || 0) + (Number(item.itemQty) || 0);
        ex.displayAmount = (Number(ex.displayAmount) || 0) + amt;
      } else {
        map.set(key, {
          ...item,
          itemQty: Number(item.itemQty) || 0,
          displayAmount: amt
        });
      }
    });
    return Array.from(map.values());
  }, [detailsRow]);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<HistoryFilters>({
    requestId: "",
    sapBpId: "",
    status: "ALL",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const debouncedFilters = useDebounce(filters, 500);

  // --- Query with proper sapBpId handling ---
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hw-history-rows-agent", debouncedFilters, loggedInUserBpId, isAdminUser],
    staleTime: 15_000,
    // For Admin: run immediately
    // For Non-Admin: only run when sapBpId is available
    enabled: !!user && (isAdminUser || !!loggedInUserBpId),
    queryFn: () => {
      // For Admin: use filter value or null
      // For Non-Admin (Main Plant / Agent): always use their logged-in sapBpId
      const sapBpIdToSend = isAdminUser
        ? (debouncedFilters.sapBpId || null)
        : loggedInUserBpId;

      const payload = {
        requestId: debouncedFilters.requestId || null,
        sapBpId: sapBpIdToSend,
        module: "AGENT",
        fromDate: debouncedFilters.fromDate || null,
        toDate: debouncedFilters.toDate || null,
        status: debouncedFilters.status === "ALL" ? null : debouncedFilters.status,
        requestType: "HARDWARE_SALE",
      };



      return apiRequest('/agent-hardware-sales/details', 'POST', payload);
    },
  });

  const allRows: HistoryRow[] = useMemo(() => aggregate(data?.data?.hwOrderDetails || []), [data]);
  const totalCount = allRows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const paged = allRows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters]);

  const columns: DataTableColumn<HistoryRow>[] = [
    { key: "requestId", label: "Request ID", sortable: true },
    { key: "sapBpId", label: "Agent BP", sortable: true },
    {
      key: "totalAmount",
      label: "Total",
      sortable: true,
      render: (_v, r) => `${r.currency} ${Number(r.totalAmount).toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_v, r) => (
        <span className={`font-semibold ${r.status === 'SUCCESS' ? 'text-green-600' : r.status === 'REJECTED' ? 'text-red-600' : 'text-orange-600'}`}>
          {r.status}
        </span>
      )
    },
    {
      key: "cmStatus", label: "CM Status", sortable: false, render: (_v, row) => {
        const s = row?.cmStatus;
        if (!s) return <span className="text-xs text-gray-400">-</span>;
        const label = s === 'S' ? 'Success' : s === 'P' ? 'Inprocess' : s === 'F' ? 'Failed' : s === 'E' ? 'Error' : s;
        const bgColor = s === 'S' ? 'bg-green-100 border-green-200 text-green-800' : s === 'P' ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-red-100 border-red-200 text-red-800';
        return (
          <div className={`${bgColor} border px-3 py-1 rounded-full flex items-center gap-2 w-fit`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    {s === 'S' ? <CheckCircle2 className="h-4 w-4" />
                      : s === 'P' ? <Info className="h-4 w-4" />
                        : <AlertTriangle className="h-4 w-4" />
                    }
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">{label}</div>
                    {(row?.cmStatusMsg || row?.cmErrorReason) && (
                      <div className="text-xs space-y-1">
                        {row?.cmStatusMsg && (
                          <div><span className="font-medium">Message:</span> {row.cmStatusMsg}</div>
                        )}
                        {row?.cmErrorReason && (
                          <div><span className="font-medium">Reason:</span> {row.cmErrorReason}</div>
                        )}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs font-mono font-medium">{label}</span>
          </div>
        );
      }
    },

    { key: "createDt", label: "Create Date", sortable: true, render: (v) => fmtDate(v) },
    {
      key: "details",
      label: "Details",
      render: (_v, r) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            setDetailsRow(r);
            setDetailsOpen(true);
          }}
        >
          <Info className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  const handleSearch = () => {
    setPageIndex(0);
    refetch();
  };

  const handleReset = () => {
    setFilters({
      requestId: "",
      sapBpId: "",
      status: "ALL",
      fromDate: initialFrom,
      toDate: initialTo,
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-azam-blue" />
          Sales History
        </CardTitle>
        <CardDescription>View agent hardware sale requests and their status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={!useAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAdvanced(false)}
            >
              Basic
            </Button>
            <Button
              variant={useAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAdvanced(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Advanced
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </div>

        {!useAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border p-2 rounded-md">
            <div>
              <LabelSmall>Request ID</LabelSmall>
              <Input
                value={filters.requestId}
                onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
                placeholder="HS..."
                className="h-7 text-xs"
              />
            </div>

            {/* Only Admin can search by SAP BP ID */}
            {isAdminUser ? (
              <div>
                <LabelSmall>SAP BP ID</LabelSmall>
                <Input
                  value={filters.sapBpId}
                  onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))}
                  placeholder="100..."
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div>
                <LabelSmall>Your BP ID</LabelSmall>
                <Input
                  value={loggedInUserBpId}
                  readOnly
                  disabled
                  className="h-7 text-xs bg-gray-100 cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <LabelSmall>Status</LabelSmall>
              <Select
                value={filters.status}
                onValueChange={(v: HistoryFilters["status"]) => setFilters((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="INPROCESS">INPROCESS</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <LabelSmall>Date Range</LabelSmall>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {basicRange?.from ? (
                      basicRange.to ? (
                        `${format(basicRange.from, "LLL dd, y")} - ${format(
                          basicRange.to,
                          "LLL dd, y"
                        )}`
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
                      if (range?.from) {
                        setFilters((f) => ({
                          ...f,
                          fromDate: toYmd(range.from!),
                          toDate: range.to ? toYmd(range.to) : toYmd(range.from!),
                        }));
                      }
                    }}
                    numberOfMonths={2}
                  />
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
            isAdminUser={isAdminUser}
          />
        )}

        <DataTable<HistoryRow>
          title="All Sales"
          subtitle="Complete audit of hardware sales"
          icon={<FileText className="h-5 w-5" />}
          headerVariant="gradient"
          showCount
          totalCount={totalCount}
          data={paged}
          columns={columns}
          loading={isLoading}
          manualPagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
        {isError && <div className="text-xs text-red-600">Failed to load history.</div>}
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sale Request Details</DialogTitle>
            <DialogDescription>
              {detailsRow?.requestId} • {detailsRow?.sapBpId}
            </DialogDescription>
          </DialogHeader>
          {detailsRow && (
            <div className="space-y-3 text-sm">
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

              {detailsRow?.raw?.[0] && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border p-2 rounded">
                    <div>
                      <div className="text-gray-500">SAP CA ID</div>
                      <div className="font-medium">{detailsRow.raw[0].sapCaId || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Module</div>
                      <div className="font-medium">{detailsRow.raw[0].module || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Plant Name</div>
                      <div className="font-medium">{detailsRow.raw[0].plantName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">SAP SO ID</div>
                      <div className="font-medium">{detailsRow.raw[0].sapSoId || "-"}</div>
                    </div>
                    <div className="col-span-full">
                      <div className="text-gray-500">Remark</div>
                      <div className="font-medium">{detailsRow.raw[0].remark || "-"}</div>
                    </div>
                  </div>
                  <div className="font-semibold mt-2">Items</div>
                  <div className="border rounded max-h-60 overflow-auto">
                    {aggregatedItems.map((item: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 p-2 border-b last:border-0 text-xs">
                        <div>
                          <div className="text-gray-500">Item</div>
                          <div>{item.itemType || item.material}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-center">Quantity</div>
                          <div className="text-center">{item.itemQty}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Price Type</div>
                          <div>{item.priceType}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Amount</div>
                          <div>
                            {item.currency} {Number(item.displayAmount || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700">{children}</label>
);

function AdvancedFiltersComponent({
  advFilters,
  setAdvFilters,
  setFilters,
  initialFrom,
  initialTo,
  isAdminUser,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<HistoryFilters>>;
  initialFrom: string;
  initialTo: string;
  isAdminUser: boolean;
}) {
  // Only show sapBpId filter for Admin users
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    ...(isAdminUser ? [{ value: "sapBpId" as FilterFieldKey, label: "SAP BP ID", type: "text" as const }] : []),
    { value: "status", label: "Status", type: "select" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    const nextFilters: HistoryFilters = {
      requestId: "",
      sapBpId: "",
      status: "ALL",
      fromDate: initialFrom,
      toDate: initialTo,
    };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "requestId":
          nextFilters.requestId = f.value || "";
          break;
        case "sapBpId":
          nextFilters.sapBpId = f.value || "";
          break;
        case "status":
          nextFilters.status = (f.value as HistoryFilters["status"]) || "ALL";
          break;
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
          <SelectTrigger className="h-7 text-xs w-56">
            <SelectValue placeholder="Choose field..." />
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

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No advanced filters added.</div>}

        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field);
          if (!fieldMeta) return null;

          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Select
                  value={af.field}
                  onValueChange={(v: FilterFieldKey) =>
                    setAdvFilters((p) =>
                      p.map((x) =>
                        x.id === af.id
                          ? {
                            ...x,
                            field: v,
                            value: "",
                            dateRange: v === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined,
                          }
                          : x
                      )
                    )
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
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

              <div className="col-span-8">
                {fieldMeta.type === "text" && (
                  <Input
                    className="h-7 text-xs"
                    value={af.value || ""}
                    onChange={(e) =>
                      setAdvFilters((p) =>
                        p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                    placeholder={`Enter ${fieldMeta.label.toLowerCase()}...`}
                  />
                )}

                {fieldMeta.type === "select" && af.field === "status" && (
                  <Select
                    value={(af.value as HistoryFilters["status"]) || "ALL"}
                    onValueChange={(v: HistoryFilters["status"]) =>
                      setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: v } : x)))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ALL</SelectItem>
                      <SelectItem value="INPROCESS">INPROCESS</SelectItem>
                      <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (
                          af.dateRange.to ? (
                            `${format(af.dateRange.from, "LLL dd, y")} - ${format(
                              af.dateRange.to,
                              "LLL dd, y"
                            )}`
                          ) : (
                            format(af.dateRange.from, "LLL dd, y")
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
                        onSelect={(range) =>
                          setAdvFilters((p) =>
                            p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x))
                          )
                        }
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="col-span-1">
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
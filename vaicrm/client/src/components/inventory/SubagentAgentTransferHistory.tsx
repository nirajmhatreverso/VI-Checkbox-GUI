import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CheckCircle2, AlertTriangle, FileText, Info, SlidersHorizontal, Calendar as CalendarIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Helpers ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// --- Types ---
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
    fromPlantName?: string;
    toPlantName?: string;
    transferFrom?: string;
    transferTo?: string;
    fromAgentName?: string;
    toAgentName?: string;
}

type AggregatedRow = {
    requestId: string;
    sapBpId: string;
    totalAmount: number;
    currency: string;
    status: string;
    createDt: string;
    cmStatus?: string;
    cmStatusMsg?: string;
    cmErrorReason?: string;
    transferFrom?: string;
    transferTo?: string;
    fromAgentName?: string;
    toAgentName?: string;
    raw: HwOrderDetail[];
};

// --- Aggregation Logic ---
function aggregate(details: HwOrderDetail[]): AggregatedRow[] {
    // Map each item directly to a row to ensure that duplicate requestId records 
    // are shown as separate entries in the history table instead of being grouped.
    const rows: AggregatedRow[] = (details || []).map((ln) => ({
        requestId: ln.requestId,
        sapBpId: ln.sapBpId || "",
        status: (ln.status || "").toUpperCase(),
        createDt: ln.createDt || "",
        currency: ln.currency || "",
        totalAmount: Number(ln.itemAmount) || 0,
        cmStatus: ln.cmStatus || "",
        cmStatusMsg: ln.cmStatusMsg || "",
        cmErrorReason: ln.cmErrorReason || "",
        transferFrom: ln.transferFrom || "",
        transferTo: ln.transferTo || "",
        fromAgentName: ln.fromAgentName || "",
        toAgentName: ln.toAgentName || "",
        raw: [ln],
    }));

    rows.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
    return rows;
}

// --- Filter Types ---
type FilterState = {
    requestId: string;
    fromAgentName: string;
    toSubAgentName: string;
    status: string;
    fromDate: string;
    toDate: string;
    material: string;
};

type FilterFieldKey = "requestId" | "fromAgentName" | "toSubAgentName" | "status" | "dateRange" | "material";

type AdvancedFilter = {
    id: string;
    field: FilterFieldKey;
    value?: string;
    dateRange?: DateRange;
};

export default function SubagentAgentTransferHistory() {
    const { user } = useAuthContext();
    const isAdminUser = user?.allAccess === "Y";
    const loggedInUserBpId = user?.onbId || "";

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRow, setDetailsRow] = useState<AggregatedRow | null>(null);
    const [useAdvanced, setUseAdvanced] = useState(false);

    const initialFrom = daysAgoYmd(30);
    const initialTo = todayYmd();

    const [filters, setFilters] = useState<FilterState>({
        requestId: "",
        fromAgentName: "",
        toSubAgentName: "",
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

    const debouncedFilters = useDebounce(filters, 500);

    // --- Query with proper sapBpId handling ---
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["subagent-agent-transfer-history", debouncedFilters, loggedInUserBpId, isAdminUser],
        staleTime: 15_000,
        enabled: !!user && (isAdminUser || !!loggedInUserBpId),
        queryFn: () => {
            const payload = {
                requestId: debouncedFilters.requestId || null,
                sapBpId: isAdminUser ? null : loggedInUserBpId,
                module: "AGENT",
                fromDate: debouncedFilters.fromDate || null,
                toDate: debouncedFilters.toDate || null,
                status: debouncedFilters.status === "" ? null : debouncedFilters.status,
                requestType: "STOCK_TRANSFER",
            };

            return apiRequest('/inventory/subagent-agent-transfer-history', 'POST', payload);
        },
    });

    const allRows = useMemo(() => {
        let rows = aggregate(data?.data?.hwOrderDetails || []);
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
    }, [data, filters.material]);

    const totalCount = allRows.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

    const pagedData = useMemo(() => {
        const start = pageIndex * pageSize;
        return allRows.slice(start, start + pageSize);
    }, [allRows, pageIndex, pageSize]);

    useEffect(() => {
        setPageIndex(0);
    }, [debouncedFilters]);

    const handleReset = () => {
        setFilters({
            requestId: "",
            fromAgentName: "",
            toSubAgentName: "",
            status: "",
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
        {
            key: "raw",
            label: "Material/Item Type",
            render: (_, row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-xs">{row.raw[0].itemType || row.raw[0].material} - {row.raw[0].material}</span>
                </div>
            )
        },
        {
            key: "transferFrom",
            label: "From Sub-agent",
            sortable: true,
            render: (_v, r) => r.raw[0].transferFrom,
        },
        {
            key: "transferTo",
            label: "To Agent",
            sortable: true,
            render: (_v, r) => r.raw[0].transferTo,
        },
        {
            key: "status",
            label: "Status",
            render: (v) => (
                <Badge
                    variant="outline"
                    className={`text-[10px] border-none ${v === "APPROVED" || v === "SUCCESS"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : v === "INPROCESS"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            : v === "REJECTED"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }`}
                >
                    {v}
                </Badge>
            )
        },
        {
            key: "cmStatus",
            label: "CM Status",
            render: (_v, row) => {
                const s = row?.cmStatus;
                if (!s) return <span className="text-xs text-gray-400">-</span>;
                const label = s === 'S' ? 'Success' : s === 'P' ? 'Inprocess' : s === 'F' ? 'Failed' : s === 'E' ? 'Error' : s;
                const color = s === 'S' ? 'text-green-600' : s === 'P' ? 'text-blue-600' : 'text-red-600';
                return (
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className={`text-[10px] font-semibold cursor-help underline decoration-dotted ${color}`}>{label}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-[10px]">
                                        {row.cmStatusMsg && <div>Message: {row.cmStatusMsg}</div>}
                                        {row.cmErrorReason && <div>Reason: {row.cmErrorReason}</div>}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                );
            }
        },
        { key: "createDt", label: "Date", sortable: true, render: (v) => v ? format(new Date(v), "MMM dd, yyyy") : "-" },
        {
            key: "requestId",
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)} className="h-8 text-xs">Basic</Button>
                    <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)} className="h-8 text-xs">
                        <SlidersHorizontal className="h-3 w-3 mr-1" />Advanced
                    </Button>
                </div>
                <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs w-full sm:w-auto">Reset Filters</Button>
            </div>

            {!useAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 border p-3 rounded-md bg-gray-50/50">
                    <div><label className="text-xs font-medium text-gray-700 mb-1 block">Request ID</label><Input value={filters.requestId} onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))} placeholder="ST..." className="h-8 text-xs bg-white" /></div>
                    <div><label className="text-xs font-medium text-gray-700 mb-1 block">Material</label><Input value={filters.material} onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))} placeholder="Material/code..." className="h-8 text-xs bg-white" /></div>
                    <div><label className="text-xs font-medium text-gray-700 mb-1 block">Status</label><Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "ALL" ? "" : v }))}><SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="INPROCESS">INPROCESS</SelectItem><SelectItem value="APPROVED">APPROVED</SelectItem><SelectItem value="REJECTED">REJECTED</SelectItem></SelectContent></Select></div>
                    <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs bg-white"><CalendarIcon className="mr-2 h-3 w-3" />{basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => { setBasicRange(range); setFilters((f) => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" })); }} numberOfMonths={2} /></PopoverContent></Popover></div>
                </div>
            )}

            {useAdvanced && <AdvancedFilters advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />}

            {isError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-800 text-sm">
                    <AlertTriangle className="h-5 w-5" />
                    <span>{(error as any)?.statusMessage || (error as any)?.message || "Failed to load transfer history. Please try again later."}</span>
                    <Button variant="outline" size="xs" onClick={() => refetch()} className="ml-auto border-red-200 text-red-800 hover:bg-red-100">Retry</Button>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <DataTable title="Transfer History (Subagent to Agent)" subtitle="Track agent To Agent transfer requests" icon={<FileText className="h-4 w-4" />} headerVariant="gradient" showCount totalCount={totalCount} data={pagedData} columns={columns} loading={isLoading} manualPagination pageIndex={pageIndex} pageSize={pageSize} pageCount={pageCount} onPageChange={setPageIndex} onPageSizeChange={setPageSize} />
                </CardContent>
            </Card>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-azam-blue" />Transfer Details</DialogTitle><DialogDescription>ID: <span className="font-mono text-xs text-black">{detailsRow?.requestId}</span></DialogDescription></DialogHeader>

                    {detailsRow && (
                        <div className="space-y-4 text-sm">
                            {(detailsRow.cmStatus || detailsRow.cmStatusMsg || detailsRow.cmErrorReason) && (
                                <Card className={`border shadow-sm ${detailsRow.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' : detailsRow.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' : 'bg-red-50/60 border-red-200'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">{detailsRow.cmStatus === 'S' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : detailsRow.cmStatus === 'P' ? <Info className="h-5 w-5 text-blue-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}</div>
                                            <div className="space-y-1 w-full"><h4 className={`font-semibold text-sm`}>CM Status: {detailsRow.cmStatus === 'S' ? 'Success' : detailsRow.cmStatus === 'P' ? 'Inprocess' : detailsRow.cmStatus === 'F' ? 'Failed' : detailsRow.cmStatus === 'E' ? 'Error' : detailsRow.cmStatus}</h4>{detailsRow.cmStatusMsg && <div className="text-sm text-gray-700"><span className="font-medium">Message: </span>{detailsRow.cmStatusMsg}</div>}{detailsRow.cmErrorReason && <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800"><span className="font-medium text-red-900">Error Reason: </span>{detailsRow.cmErrorReason}</div>}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
                                <div><div className="text-xs text-gray-500 uppercase">Agent BP</div><div className="font-medium">{detailsRow.sapBpId || '-'}</div></div>
                                <div><div className="text-xs text-gray-500 uppercase">Currency</div><div className="font-medium">{detailsRow.currency || '-'}</div></div>
                                <div><div className="text-xs text-gray-500 uppercase">Total Amount</div><div className="font-medium">{detailsRow.currency} {detailsRow.totalAmount.toLocaleString()}</div></div>
                                <div><div className="text-xs text-gray-500 uppercase">Date</div><div className="font-medium">{detailsRow.createDt}</div></div>
                                <div className="col-span-2 md:col-span-4"><div className="text-xs text-gray-500 uppercase">Status</div><Badge className="mt-1 h-5 text-[10px]">{detailsRow.status}</Badge></div>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Items ({detailsRow.raw.length})</h4>
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-100 border-b"><tr><th className="p-2 font-medium">Material</th><th className="p-2 font-medium">Type</th><th className="p-2 font-medium text-right">Qty</th><th className="p-2 font-medium">Price Type</th><th className="p-2 font-medium text-right">Amount</th><th className="p-2 font-medium">Remark</th></tr></thead>
                                        <tbody className="divide-y">{detailsRow.raw.map((item, idx) => (<tr key={idx} className="hover:bg-gray-50"><td className="p-2 font-medium">{item.material}</td><td className="p-2">{item.itemType}</td><td className="p-2 text-right font-mono">{item.itemQty}</td><td className="p-2">{item.priceType || '-'}</td><td className="p-2 text-right">{item.currency} {Number(item.itemAmount).toLocaleString()}</td><td className="p-2 text-gray-500 italic">{item.remark || '-'}</td></tr>))}</tbody>
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

function AdvancedFilters({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: any) {
    const FIELDS = [
        { value: "requestId", label: "Request ID", type: "text" },
        { value: "material", label: "Material", type: "text" },
        { value: "status", label: "Status", type: "select" },
        { value: "dateRange", label: "Date Range", type: "daterange" }
    ];
    const addFilter = (field: string) => { if (advFilters.some((f: any) => f.field === field)) return; setAdvFilters((prev: any) => [...prev, { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined }]); };
    const removeFilter = (id: string) => setAdvFilters((prev: any) => prev.filter((f: any) => f.id !== id));
    useEffect(() => {
        const next: any = { requestId: "", fromAgentName: "", toSubAgentName: "", status: "", fromDate: initialFrom, toDate: initialTo, material: "" };
        advFilters.forEach((f: any) => { if (f.field === "dateRange" && f.dateRange?.from) { next.fromDate = toYmd(f.dateRange.from); next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from); } else if (f.field === "status") { next.status = f.value === "ALL" ? "" : f.value; } else { next[f.field] = f.value; } });
        setFilters(next);
    }, [advFilters, initialFrom, initialTo, setFilters]);
    return (
        <div className="border p-3 rounded-md space-y-3 bg-gray-50/50">
            <div className="flex items-center gap-2"><span className="text-xs font-medium">Add Filter:</span><Select onValueChange={addFilter}><SelectTrigger className="h-7 text-xs w-48 bg-white"><SelectValue placeholder="Select field..." /></SelectTrigger><SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value} disabled={advFilters.some((af: any) => af.field === f.value)}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2">
                {advFilters.length === 0 && <div className="text-xs text-gray-400 italic">No active filters</div>}
                {advFilters.map((af: any) => {
                    const def: any = FIELDS.find(f => f.value === af.field);
                    return (
                        <div key={af.id} className="grid grid-cols-12 gap-2 items-center bg-white p-1 rounded border">
                            <div className="col-span-4 sm:col-span-3 text-xs font-medium px-2">{def?.label}</div>
                            <div className="col-span-7 sm:col-span-8">
                                {def?.type === "text" && <Input className="h-7 text-xs border-none" placeholder={`Enter ${def.label}...`} value={af.value} onChange={(e) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: e.target.value } : p))} />}
                                {def?.type === "select" && <Select value={af.value || "ALL"} onValueChange={(v) => setAdvFilters((prev: any) => prev.map((p: any) => p.id === af.id ? { ...p, value: v } : p))}><SelectTrigger className="h-7 text-xs border-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="INPROCESS">INPROCESS</SelectItem><SelectItem value="APPROVED">APPROVED</SelectItem><SelectItem value="REJECTED">REJECTED</SelectItem></SelectContent></Select>}
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

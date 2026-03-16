// src/components/subscriptions/ServiceActionsTable.tsx

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, X, Calendar as CalendarIcon, SlidersHorizontal, CheckCircle2, AlertTriangle, Info, FileText, CalendarX, Loader2 } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table";
import { format, subDays } from 'date-fns';
import { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

type ServiceActionFilters = {
    search: string;
    actionSubtype: string;
    requestId: string;
    planName: string;
    division: string;
    salesOrg: string;
    agentSapBpId: string;
    sapContractId: string;
    smartCardNo: string;
    stbNo: string;
    sapCaId: string;
    status: string;
    fromDate: string;
    toDate: string;
    cmStatus?: string;
    cmStatusMsg?: string;
    cmErrorReason?: string;
};

type FilterFieldKey = "requestId" | "planName" | "smartCardNo" | "stbNo" | "sapContractId" | "sapCaId" | "agentSapBpId" | "division" | "salesOrg" | "status" | "actionSubtype" | "dateRange";
type AdvancedFilter = {
    id: string;
    field: FilterFieldKey;
    value?: string;
    dateRange?: DateRange;
};

interface ServiceActionsTableProps {
    customerData: any;
}

export default function ServiceActionsTable({ customerData }: ServiceActionsTableProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [useAdvanced, setUseAdvanced] = useState(false);

    // State for Details Modal
    const [selectedAction, setSelectedAction] = useState<any | null>(null);

    // ✅ State for Cancel Confirmation Modal
    const [scheduleToCancel, setScheduleToCancel] = useState<string | null>(null);

    const initialFrom = useMemo(() => toYmd(subDays(new Date(), 30)), []);
    const initialTo = useMemo(() => toYmd(new Date()), []);

    const [filters, setFilters] = useState<ServiceActionFilters>({
        search: "", actionSubtype: "", requestId: "", planName: "", division: "", salesOrg: "", agentSapBpId: "", sapContractId: "", smartCardNo: "", stbNo: "", sapCaId: "", status: "",
        fromDate: initialFrom, toDate: initialTo,
    });

    const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
    const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
    const debouncedFilters = useDebounce(filters, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { data: serviceDetailsResponse, isLoading, isError, error } = useQuery({
        queryKey: ['serviceDetails', customerData?.sapBpId, debouncedFilters, currentPage, itemsPerPage],
        queryFn: () => {
            const payload: any = { sapBpId: customerData.sapBpId };
            Object.entries(debouncedFilters).forEach(([key, value]) => {
                if (value && key !== 'search') { payload[key] = value; }
            });
            payload.offSet = ((currentPage - 1) * itemsPerPage).toString();
            payload.limit = itemsPerPage.toString();
            return apiRequest('/subscriptions/service-details', 'POST', payload);
        },
        enabled: !!customerData?.sapBpId,
        placeholderData: (prev) => prev,
        staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    gcTime: 0,
    });

    const serviceActions = serviceDetailsResponse?.data?.serviceDetails || [];
    const totalRecordCount = serviceDetailsResponse?.data?.totalRecordCount || 0;
    const totalPages = Math.ceil(totalRecordCount / itemsPerPage);

    const handleReset = () => {
        setFilters({ search: "", actionSubtype: "", requestId: "", planName: "", division: "", salesOrg: "", agentSapBpId: "", sapContractId: "", smartCardNo: "", stbNo: "", sapCaId: "", status: "", fromDate: initialFrom, toDate: initialTo });
        setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
        setAdvFilters([]);
        setUseAdvanced(false);
        setCurrentPage(1);
        setItemsPerPage(10);
    };

    // ✅ Mutation for Canceling Schedule
    const cancelScheduleMutation = useMutation<any, Error, string>({
        mutationFn: (requestId: string) => {
            return apiRequest('/subscriptions/cancel-schedule', 'POST', {
                sapBpId: customerData.sapBpId,
                requestId: requestId
            });
        },
        onSuccess: (data) => {
            const msg = data?.data?.message || data?.statusMessage || "Schedule cancelled successfully.";
            toast({ title: "Success", description: msg });
            setScheduleToCancel(null); // Close dialog
            queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
            queryClient.invalidateQueries({ queryKey: ['serviceDetails'] });
        },
        onError: (error: any) => {
            toast({
                title: "Cancellation Failed",
                description: error?.statusMessage || error.message || "Could not cancel schedule.",
                variant: "destructive"
            });
        }
    });

    const columns: DataTableColumn<any>[] = [
        { key: "createTs", label: "Date & Time", sortable: true, render: (v) => format(new Date(v), "dd MMM, yyyy HH:mm") },
        { key: "actionType", label: "Action", sortable: true, render: (v) => <Badge variant="outline">{v}</Badge> },
        { key: "smartCardNo", label: "Smart Card", sortable: true, render: (v) => <span className="font-mono">{v}</span> },
        { key: "planName", label: "Details", sortable: true },
        { key: "status", label: "Status", sortable: true, render: (v) => <Badge className={`${v?.toLowerCase() === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs`}>{v}</Badge> },
        {
            key: "cmStatus", label: "CM Status", sortable: false, render: (_v, row) => {
                const s = row?.cmStatus;
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
                                                    : <Info className="h-4 w-4 text-blue-600" />
                                        }
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3">
                                    <div className="space-y-2">
                                        <div className="font-semibold text-sm">{label}</div>
                                        {(row?.cmStatusMsg || row?.cmErrorReason) && (
                                            <div className="text-xs space-y-1">
                                                {row?.cmStatusMsg && <div><span className="font-medium">Message:</span> {row.cmStatusMsg}</div>}
                                                {row?.cmErrorReason && <div><span className="font-medium">Reason:</span> {row.cmErrorReason}</div>}
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
        { key: "requestId", label: "Request ID", sortable: true, render: (v) => <span className="text-xs font-mono">{v}</span> },
    ];

    const actions: DataTableAction<any>[] = [
        { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: (item) => setSelectedAction(item) },
        {
            label: "Cancel Schedule",
            icon: <CalendarX className="h-4 w-4 text-red-600" />,
            onClick: (item) => setScheduleToCancel(item.requestId),
            show: (item) => {
                const actionType = (item.actionType || "").toUpperCase();
                const actionSubtype = (item.actionSubtype || "").toLowerCase();
                const cmStatus = (item.cmStatus || "").toUpperCase();

                // ✅ Check for schedulable action types
                const schedulableActions = [
                    'PLAN_CHANGE',
                    'OFFER_CHANGE',
                    'PLAN_ADDON',
                ];

                const isSchedulableAction = schedulableActions.includes(actionType);
                const isScheduleSubtype = actionSubtype === 'schedule';
                const isScheduledStatus = cmStatus === 'SCHEDULED';
                return isSchedulableAction && isScheduleSubtype && isScheduledStatus;
            }
        }
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold text-gray-800">Service Action History</CardTitle>
                                <CardDescription className="text-sm text-gray-500">Operational history and service events for this customer</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
                                <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-2" />Advanced</Button>
                                <Button size="sm" variant="ghost" onClick={handleReset}><X className="h-4 w-4 mr-2" />Reset Filters</Button>
                            </div>
                        </div>

                        {!useAdvanced && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-gray-50">
                                <div><LabelSmall>Search</LabelSmall><Input value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Action, Plan, Smart Card, Request ID..." className="h-7 text-xs" /></div>
                                <div><LabelSmall>Date Range</LabelSmall><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white"><CalendarIcon className="mr-2 h-4 w-4" />{basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a date range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange} onSelect={(range) => { setBasicRange(range); setFilters(f => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" })); }} numberOfMonths={2} /></PopoverContent></Popover></div>
                            </div>
                        )}
                        {useAdvanced && <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable<any> title="Service Action History" headerVariant="gradient" data={serviceActions} columns={columns} actions={actions} loading={isLoading} error={(error as any)?.message} emptyMessage="No service actions found for the selected filters." enableExport manualPagination pageCount={totalPages} pageIndex={currentPage - 1} pageSize={itemsPerPage} onPageChange={(page) => setCurrentPage(page + 1)} onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} showCount totalCount={totalRecordCount} />
                </CardContent>
            </Card>

            {/* ✅ Details Dialog */}
            <Dialog open={!!selectedAction} onOpenChange={(isOpen) => !isOpen && setSelectedAction(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" />Service Action Details</DialogTitle><DialogDescription>Request ID: {selectedAction?.requestId}</DialogDescription></DialogHeader>
                    {selectedAction && (
                        <>
                            {(selectedAction.cmStatus || selectedAction.cmStatusMsg || selectedAction.cmErrorReason || selectedAction.cmStatusCode) && (
                                <div className="col-span-2">
                                    <Card className={`border shadow-sm ${selectedAction.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' : selectedAction.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' : 'bg-red-50/60 border-red-200'}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 shrink-0">{selectedAction.cmStatus === 'S' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : selectedAction.cmStatus === 'P' ? <Info className="h-5 w-5 text-blue-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}</div>
                                                <div className="space-y-1 w-full">
                                                    <h4 className="font-semibold text-sm">CM Status: {selectedAction.cmStatus === 'S' ? 'Success' : selectedAction.cmStatus === 'P' ? 'Inprocess' : selectedAction.cmStatus === 'SCHEDULED' ? 'Scheduled' : // Text Label
                                                        'Failed'}</h4>
                                                    {selectedAction.cmStatusMsg && <div className="text-sm text-gray-700"><span className="font-medium">Message: </span>{selectedAction.cmStatusMsg}</div>}
                                                    {selectedAction.cmErrorReason && <div className="text-sm bg-white/60 p-2 rounded border border-red-100 mt-2 text-red-800"><span className="font-medium text-red-900">Error Reason: </span>{selectedAction.cmErrorReason}</div>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 text-sm">
                                <div><Label>Action Type</Label><p className="bg-gray-50 p-2 rounded">{selectedAction.actionType || 'N/A'}</p></div>
                                <div><Label>Action Subtype</Label><p className="bg-gray-50 p-2 rounded">{selectedAction.actionSubtype || 'N/A'}</p></div>
                                <div><Label>Plan ID</Label><p className="font-mono bg-gray-50 p-2 rounded">{selectedAction.planId || 'N/A'}</p></div>
                                <div>
                                    <Label>Plan Amount</Label>
                                    <p className="bg-gray-50 p-2 rounded">
                                        {selectedAction.currency || ''} {selectedAction.planAmount?.toLocaleString() || '0'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ✅ Confirmation Dialog for Schedule Cancellation */}
            <Dialog open={!!scheduleToCancel} onOpenChange={(open) => !open && setScheduleToCancel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Cancel Scheduled Action
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this scheduled action? <br />
                            <span className="font-mono text-xs text-gray-500">Request ID: {scheduleToCancel}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setScheduleToCancel(null)} disabled={cancelScheduleMutation.isPending}>
                            No, Keep it
                        </Button>
                        <Button variant="destructive" onClick={() => scheduleToCancel && cancelScheduleMutation.mutate(scheduleToCancel)} disabled={cancelScheduleMutation.isPending}>
                            {cancelScheduleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                            Yes, Cancel Schedule
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (<label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>);

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: { advFilters: AdvancedFilter[], setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>, setFilters: React.Dispatch<React.SetStateAction<ServiceActionFilters>>, initialFrom: string, initialTo: string }) {
    // (Existing filter component code remains unchanged)
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
        { value: "requestId", label: "Request ID", type: "text" },
        { value: "planName", label: "Plan Name", type: "text" },
        { value: "smartCardNo", label: "Smart Card No.", type: "text" },
        { value: "stbNo", label: "STB No.", type: "text" },
        { value: "sapContractId", label: "Contract ID", type: "text" },
        { value: "sapCaId", label: "CA ID", type: "text" },
        { value: "agentSapBpId", label: "Agent BP ID", type: "text" },
        { value: "division", label: "Division", type: "text" },
        { value: "salesOrg", label: "Sales Org", type: "text" },
        { value: "status", label: "Status", type: "text" },
        { value: "actionSubtype", label: "Action Type", type: "text" },
        { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

    const addAdvFilter = (field: FilterFieldKey) => {
        if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
        const newFilter: AdvancedFilter = { id: `${field}-${Date.now()}`, field, value: "", dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined, };
        setAdvFilters((prev) => [...prev, newFilter]);
    };

    const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

    useEffect(() => {
        const nextFilters: ServiceActionFilters = { search: "", actionSubtype: "", requestId: "", planName: "", division: "", salesOrg: "", agentSapBpId: "", sapContractId: "", smartCardNo: "", stbNo: "", sapCaId: "", status: "", fromDate: initialFrom, toDate: initialTo };
        advFilters.forEach((f) => {
            const key = f.field;
            if (key === 'dateRange') {
                if (f.dateRange?.from) {
                    nextFilters.fromDate = toYmd(f.dateRange.from);
                    nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
                }
            } else {
                (nextFilters as any)[key] = f.value || "";
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
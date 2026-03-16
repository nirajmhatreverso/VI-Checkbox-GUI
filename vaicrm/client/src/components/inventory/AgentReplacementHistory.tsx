import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileText, Info, SlidersHorizontal, X, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { agentReplacementApi } from "@/lib/api-client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthContext } from "@/context/AuthProvider";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
};
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type ReplacementDetail = any;

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
    raw: ReplacementDetail[];
    details?: string;
    deviceType?: string;
};

function aggregate(details: ReplacementDetail[]): HistoryRow[] {
    const map = new Map<string, ReplacementDetail[]>();
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
            deviceType: first?.deviceType || "",
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

type UserType = "ADMIN" | "OTC" | "MAIN_PLANT" | "EMPLOYEE" | "UNKNOWN";

interface UserAccessInfo {
    isAdmin: boolean;
    isOtc: boolean;
    isMainPlant: boolean;
    isEmployee: boolean;
    sapBpId: string;
    requiresSapBpIdFilter: boolean;
    userType: UserType;
    userTypeLabel: string;
}

// Helper function to determine user type and access
// Priority: isMainPlant > isOtc > isEmployee > allAccess (Admin)
function getUserAccessInfo(user: any): UserAccessInfo {
    const sapBpId = user?.sapBpId || "";

    // Check specific user types FIRST (these take priority over allAccess)
    const isMainPlant = user?.isMainPlant === "Y";
    const isOtc = user?.isOtc === "Y";
    const isEmployee = user?.isEmployee === "Y";

    // Only consider admin if NONE of the specific types are set
    const hasSpecificType = isMainPlant || isOtc || isEmployee;
    const isAdmin = !hasSpecificType && user?.allAccess === "Y";

    // Determine user type with priority
    let userType: UserType = "UNKNOWN";
    let userTypeLabel = "Unknown";

    if (isMainPlant) {
        userType = "MAIN_PLANT";
        userTypeLabel = "Main Plant";
    } else if (isOtc) {
        userType = "OTC";
        userTypeLabel = "OTC";
    } else if (isEmployee) {
        userType = "EMPLOYEE";
        userTypeLabel = "Employee";
    } else if (isAdmin) {
        userType = "ADMIN";
        userTypeLabel = "Admin";
    }

    // Non-admin users must filter by their sapBpId
    const requiresSapBpIdFilter = !isAdmin;

    return {
        isAdmin,
        isOtc,
        isMainPlant,
        isEmployee,
        sapBpId,
        requiresSapBpIdFilter,
        userType,
        userTypeLabel
    };
}

export default function AgentReplacementHistory() {
    const { user } = useAuthContext();

    // Get user access info
    const userAccess = useMemo(() => getUserAccessInfo(user), [user]);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRow, setDetailsRow] = useState<HistoryRow | null>(null);

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

    // Build the search sapBpId based on user type
    const getSearchSapBpId = (): string => {
        // Admin can search any BP - use filter value
        if (userAccess.isAdmin) {
            return debouncedFilters.sapBpId || "";
        }

        // For MainPlant, OTC, Employee - always use their own sapBpId
        // They can only see their own data
        return userAccess.sapBpId;
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["agent-replacement-history", debouncedFilters, userAccess.sapBpId, userAccess.userType],
        staleTime: 15_000,
        queryFn: () =>
            agentReplacementApi.searchReplacements({
                sapBpId: getSearchSapBpId(),
                sapCaId: "",
                requestId: debouncedFilters.requestId || "",
                fromDate: debouncedFilters.fromDate || "",
                toDate: debouncedFilters.toDate || "",
                status: debouncedFilters.status === "ALL" ? "" : debouncedFilters.status,
                cmStatus: "",
                offSet: "0",
                limit: "100"
            }),
        retry: false,
        enabled: !!user
    });

    const allRows: HistoryRow[] = useMemo(() => aggregate(data?.data?.replacementRequestBeanList || []), [data]);
    const totalCount = allRows.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const paged = allRows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

    useEffect(() => {
        setPageIndex(0);
    }, [debouncedFilters]);

    const columns: DataTableColumn<HistoryRow>[] = [
        { key: "requestId", label: "Request ID", sortable: true },
        { key: "sapBpId", label: "Agent BP", sortable: true },
        { key: "deviceType", label: "Device Type", sortable: true },
        {
            key: "totalAmount",
            label: "Total Charge",
            sortable: true,
            render: (_v, r) => `${r.currency} ${Number(r.totalAmount).toLocaleString()}`,
        },
        { key: "status", label: "Status", sortable: true },
        {
            key: "cmStatus", label: "CM Status", sortable: false, render: (_v, row) => {
                const s = row?.cmStatus;
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
                                                : (s === 'F' || s === 'E') ? <AlertTriangle className="h-4 w-4 text-red-600" />
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

    // Check if SAP BP ID filter should be shown (only for admin)
    const showSapBpIdFilter = userAccess.isAdmin;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-azam-blue" />
                    Replacement History
                </CardTitle>
                <CardDescription>
                    View agent replacement requests and their status
                    {!userAccess.isAdmin && userAccess.userType !== "UNKNOWN" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {userAccess.userTypeLabel} • {userAccess.sapBpId}
                        </span>
                    )}
                </CardDescription>
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
                    <div className={`grid grid-cols-1 gap-2 border p-2 rounded-md ${showSapBpIdFilter ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                        <div>
                            <LabelSmall>Request ID</LabelSmall>
                            <Input
                                value={filters.requestId}
                                onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
                                placeholder="REP..."
                                className="h-7 text-xs"
                            />
                        </div>

                        {/* Admin: Editable SAP BP ID filter */}
                        {showSapBpIdFilter && (
                            <div>
                                <LabelSmall>SAP BP ID</LabelSmall>
                                <Input
                                    value={filters.sapBpId}
                                    onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))}
                                    placeholder="Search any BP..."
                                    className="h-7 text-xs"
                                />
                            </div>
                        )}

                        {/* Non-admin: Locked SAP BP ID display */}
                        {!showSapBpIdFilter && (
                            <div>
                                <LabelSmall>SAP BP ID (Locked)</LabelSmall>
                                <Input
                                    value={userAccess.sapBpId}
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

                        <div className={showSapBpIdFilter ? 'md:col-span-2' : 'md:col-span-1'}>
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

                {useAdvanced && (
                    <AdvancedFiltersComponent
                        advFilters={advFilters}
                        setAdvFilters={setAdvFilters}
                        setFilters={setFilters}
                        initialFrom={initialFrom}
                        initialTo={initialTo}
                        showSapBpIdFilter={showSapBpIdFilter}
                        userAccess={userAccess}
                    />
                )}

                <DataTable<HistoryRow>
                    title="All Replacements"
                    subtitle="Complete audit of replacement requests"
                    icon={<RefreshCw className="h-5 w-5" />}
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
                {isError && <div className="text-xs text-red-600">Failed to load history. Please check API.</div>}
            </CardContent>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Replacement Details</DialogTitle>
                        <DialogDescription>
                            {detailsRow?.requestId} • {detailsRow?.sapBpId}
                        </DialogDescription>
                    </DialogHeader>
                    {detailsRow && (
                        <div className="space-y-3 text-sm">
                            {/* CM Status Block */}
                            {(detailsRow.cmStatus || detailsRow.cmStatusMsg || detailsRow.cmErrorReason) && (
                                <Card className={`border shadow-sm ${detailsRow.cmStatus === 'S' ? 'bg-green-50/60 border-green-200' :
                                    detailsRow.cmStatus === 'P' ? 'bg-blue-50/60 border-blue-200' :
                                        (detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E') ? 'bg-red-50/60 border-red-200' :
                                            'bg-blue-50/60 border-blue-200'
                                    }`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">
                                                {detailsRow.cmStatus === 'S' ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    : detailsRow.cmStatus === 'P' ? <Info className="h-5 w-5 text-blue-600" />
                                                        : (detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E') ? <AlertTriangle className="h-5 w-5 text-red-600" />
                                                            : <Info className="h-5 w-5 text-blue-600" />
                                                }
                                            </div>
                                            <div className="space-y-1 w-full">
                                                <h4 className={`font-semibold text-sm ${detailsRow.cmStatus === 'S' ? 'text-green-900' :
                                                    detailsRow.cmStatus === 'P' ? 'text-blue-900' :
                                                        (detailsRow.cmStatus === 'F' || detailsRow.cmStatus === 'E') ? 'text-red-900' : 'text-blue-900'
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
                                        {detailsRow.raw.map((item: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-4 gap-2 p-2 border-b last:border-0 text-xs">
                                                <div>
                                                    <div className="text-gray-500">Item</div>
                                                    <div>{item.itemType || item.material}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Old Serial</div>
                                                    <div className="font-mono">{item.oldItemSerialNo || "-"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">New Serial</div>
                                                    <div className="font-mono">{item.itemSerialNo || "-"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Amount</div>
                                                    <div>
                                                        {item.currency} {Number(item.itemAmount || 0).toLocaleString()}
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

interface AdvancedFiltersProps {
    advFilters: AdvancedFilter[];
    setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
    setFilters: React.Dispatch<React.SetStateAction<HistoryFilters>>;
    initialFrom: string;
    initialTo: string;
    showSapBpIdFilter: boolean;
    userAccess: UserAccessInfo;
}

function AdvancedFiltersComponent({
    advFilters,
    setAdvFilters,
    setFilters,
    initialFrom,
    initialTo,
    showSapBpIdFilter,
    userAccess,
}: AdvancedFiltersProps) {
    // Filter options based on user access
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange" }[] = [
        { value: "requestId", label: "Request ID", type: "text" },
        // Only show SAP BP ID filter option for admin
        ...(showSapBpIdFilter
            ? [{ value: "sapBpId" as FilterFieldKey, label: "SAP BP ID", type: "text" as const }]
            : []
        ),
        { value: "status", label: "Status", type: "select" },
        { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

    const addAdvFilter = (field: FilterFieldKey) => {
        // Prevent duplicate dateRange filters
        if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
        // Prevent duplicate sapBpId filters
        if (field === "sapBpId" && advFilters.some((f) => f.field === "sapBpId")) return;
        // Prevent duplicate status filters
        if (field === "status" && advFilters.some((f) => f.field === "status")) return;

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
            {/* Show locked BP ID info for non-admin users */}
            {!showSapBpIdFilter && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span>
                        Viewing data for: <strong>{userAccess.userTypeLabel}</strong> -
                        SAP BP ID: <strong>{userAccess.sapBpId}</strong>
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2">
                <LabelSmall>Add filter</LabelSmall>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-7 text-xs w-56 justify-between">
                            <span>Add filter...</span>
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                        <div className="py-1">
                            {FILTER_FIELD_OPTIONS.map((opt) => {
                                // Check if filter already exists
                                const isDisabled = advFilters.some((f) => f.field === opt.value);
                                return (
                                    <button
                                        key={opt.value}
                                        className={`w-full text-left px-3 py-2 text-sm ${isDisabled
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'hover:bg-gray-50'
                                            }`}
                                        onClick={() => !isDisabled && addAdvFilter(opt.value)}
                                        disabled={isDisabled}
                                    >
                                        {opt.label}
                                        {isDisabled && <span className="ml-2 text-xs">(added)</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                {advFilters.length === 0 && (
                    <div className="text-xs text-muted-foreground">No advanced filters added.</div>
                )}

                {advFilters.map((af) => {
                    const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field);
                    if (!fieldMeta) return null;

                    return (
                        <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                                <Input
                                    value={fieldMeta.label}
                                    readOnly
                                    className="h-7 text-xs bg-gray-50"
                                />
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
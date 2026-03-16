import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Pencil, Info, SlidersHorizontal, X, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agentReplacementApi } from "@/lib/api-client";
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

type ApprovalRow = {
    requestId: string;
    sapBpId: string;
    sapCaId?: string;
    salesOrg?: string;
    isWarranty?: string;
    plantName?: string | null;
    plant?: string | null;
    status: string;
    createdDate: string;
    createDt: string;
    totalAmount: number;
    currency: string;
    raw: ReplacementDetail[];
    details?: string;
    actions?: string;
    reason?: string;
    deviceType?: string;
};

function aggregate(details: ReplacementDetail[]): ApprovalRow[] {
    const map = new Map<string, ReplacementDetail[]>();
    (details || []).forEach((ln) => {
        if (!map.has(ln.requestId)) map.set(ln.requestId, []);
        map.get(ln.requestId)!.push(ln);
    });
    const rows: ApprovalRow[] = [];
    map.forEach((arr, reqId) => {
        const first = arr[0];
        rows.push({
            requestId: reqId,
            sapBpId: first?.sapBpId || "",
            sapCaId: first?.sapCaId || "",
            salesOrg: first?.salesOrg || "",
            isWarranty: first?.isWarranty || "",
            plantName: first?.plantName || null,
            plant: first?.plant || null,
            status: (first?.status || "").toUpperCase(),
            createdDate: first?.createdDate || "",
            createDt: first?.createDt || "",
            currency: first?.currency || "",
            totalAmount: arr.reduce((sum, a) => sum + (Number(a.itemAmount) || 0), 0),
            reason: first?.reason || "",
            deviceType: first?.deviceType || "",
            raw: arr,
        });
    });
    rows.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    return rows;
}

type ApprovalFilters = {
    requestId: string;
    sapBpId: string;
    fromDate: string;
    toDate: string;
};

type FilterFieldKey = "requestId" | "sapBpId" | "dateRange";
type AdvancedFilter = {
    id: string;
    field: FilterFieldKey;
    value?: string;
    dateRange?: DateRange;
};

type DropdownOption = { name: string; value: string };

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

export default function AgentReplacementApprovalQueue() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuthContext();

    // Get user access info
    const userAccess = useMemo(() => getUserAccessInfo(user), [user]);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [rowToAct, setRowToAct] = useState<ApprovalRow | null>(null);
    const [remark, setRemark] = useState("");
    const [reason, setReason] = useState("");

    const [useAdvanced, setUseAdvanced] = useState(false);
    const initialFrom = daysAgoYmd(30);
    const initialTo = todayYmd();

    const [filters, setFilters] = useState<ApprovalFilters>({
        requestId: "",
        sapBpId: "",
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

    // Using the new API endpoint
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["agent-replacement-approval", debouncedFilters, userAccess.sapBpId, userAccess.userType],
        staleTime: 15_000,
        queryFn: () =>
            agentReplacementApi.searchReplacements({
                sapBpId: getSearchSapBpId(),
                sapCaId: "",
                requestId: debouncedFilters.requestId || "",
                fromDate: debouncedFilters.fromDate || "",
                toDate: debouncedFilters.toDate || "",
                status: "INPROCESS",
                cmStatus: "",
                offSet: "0",
                limit: "100"
            }),
        retry: false,
        enabled: !!user
    });

    const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();
    const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
    const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

    const rows = useMemo(() => aggregate(data?.data?.replacementRequestBeanList || []), [data]);
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const pagedData = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    useEffect(() => {
        setPageIndex(0);
    }, [debouncedFilters]);

    // Mutations
    const approveMutation = useMutation({
        mutationFn: (vars: { row: ApprovalRow; remark: string; reason: string }) =>
            agentReplacementApi.approveReplacement({
                requestId: vars.row.requestId,
                status: "APPROVED",
                remark: vars.remark,
                reason: vars.reason,
                sapBpId: vars.row.sapBpId,
            }),
        onSuccess: (res) => {
            toast({ title: "Success", description: res?.data?.message || "Request approved" });
            setOverrideOpen(false);
            setReason("");
            setRemark("");
            queryClient.invalidateQueries({ queryKey: ["agent-replacement-approval"] });
        },
        onError: (err: any) =>
            toast({ title: "Error", description: err?.statusMessage || "Approval failed", variant: "destructive" }),
    });

    const rejectMutation = useMutation({
        mutationFn: (vars: { row: ApprovalRow; remark: string; reason: string }) =>
            agentReplacementApi.approveReplacement({
                requestId: vars.row.requestId,
                status: "REJECTED",
                remark: vars.remark,
                reason: vars.reason,
                sapBpId: vars.row.sapBpId,
            }),
        onSuccess: (res) => {
            toast({ title: "Success", description: res?.data?.message || "Request rejected" });
            setRejectOpen(false);
            setReason("");
            setRemark("");
            queryClient.invalidateQueries({ queryKey: ["agent-replacement-approval"] });
        },
        onError: (err: any) =>
            toast({ title: "Error", description: err?.statusMessage || "Rejection failed", variant: "destructive" }),
    });

    const columns: DataTableColumn<ApprovalRow>[] = [
        { key: "requestId", label: "Request ID", sortable: true },
        { key: "sapBpId", label: "Agent BP", sortable: true },
        { key: "deviceType", label: "Device Type", sortable: true },
        {
            key: "totalAmount",
            label: "Total Charge",
            sortable: true,
            render: (_v, r) => `${r.currency} ${r.totalAmount.toLocaleString()}`,
        },
        { key: "createdDate", label: "Date", sortable: true, render: (v) => fmtDate(v) },
        { key: "status", label: "Status", sortable: true },
        {
            key: "details",
            label: "Details",
            render: (_v, r) => (
                <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                        setRowToAct(r);
                        setDetailsOpen(true);
                    }}
                >
                    <Info className="h-4 w-4 mr-1" /> View
                </Button>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (_v, r) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="xs"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                            setRowToAct(r);
                            setRemark("");
                            setReason("");
                            setOverrideOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => {
                            setRowToAct(r);
                            setRemark("");
                            setReason("");
                            setRejectOpen(true);
                        }}
                    >
                        Reject
                    </Button>
                </div>
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
                    <CheckCircle className="h-5 w-5 text-azam-blue" />
                    Replacement Approval Queue
                </CardTitle>
                <CardDescription>
                    Review and approve agent replacement requests
                    {!userAccess.isAdmin && userAccess.userType !== "UNKNOWN" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {userAccess.userTypeLabel} • {userAccess.sapBpId}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Filters Section */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>
                            Basic
                        </Button>
                        <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}>
                            <SlidersHorizontal className="h-4 w-4 mr-1" />
                            Advanced
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
                        <Button size="sm" onClick={handleSearch}>Search</Button>
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
                        
                        <div className={showSapBpIdFilter ? 'md:col-span-3' : 'md:col-span-2'}>
                            <LabelSmall>Date Range</LabelSmall>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {basicRange?.from ? (
                                            basicRange.to 
                                                ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` 
                                                : format(basicRange.from, "LLL dd, y")
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

                <DataTable<ApprovalRow>
                    title="Pending Approvals"
                    data={pagedData}
                    columns={columns}
                    loading={isLoading}
                    manualPagination
                    headerVariant="gradient"
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    pageCount={pageCount}
                    onPageChange={setPageIndex}
                    onPageSizeChange={setPageSize}
                    totalCount={rows.length}
                    showCount
                />

                {isError && (
                    <div className="text-xs text-red-600">
                        Failed to load approvals. Please check API configuration.
                    </div>
                )}
            </CardContent>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Replacement Request Details</DialogTitle>
                        <DialogDescription>
                            {rowToAct?.requestId} • {rowToAct?.sapBpId}
                        </DialogDescription>
                    </DialogHeader>
                    {rowToAct?.raw?.[0] && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border p-2 rounded">
                                <div>
                                    <div className="text-gray-500">SAP CA ID</div>
                                    <div className="font-medium">{rowToAct.raw[0].sapCaId || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Sales Org</div>
                                    <div className="font-medium">{rowToAct.raw[0].salesOrg || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Warranty</div>
                                    <div className="font-medium">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                            rowToAct.raw[0].isWarranty === 'Y' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {rowToAct.raw[0].isWarranty === 'Y' ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Plant Name</div>
                                    <div className="font-medium">{rowToAct.raw[0].plantName || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">SAP SO ID</div>
                                    <div className="font-medium">{rowToAct.raw[0].sapSoId || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Reason</div>
                                    <div className="font-medium">{rowToAct.raw[0].reason || "-"}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-gray-500">Remark</div>
                                    <div className="font-medium">{rowToAct.raw[0].remark || "-"}</div>
                                </div>
                            </div>
                            <div className="font-semibold mt-2">Items</div>
                            <div className="border rounded max-h-60 overflow-auto">
                                {rowToAct.raw.map((item: any, idx: number) => (
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
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="approval-reason">
                                Reason <span className="text-red-500">*</span>
                            </Label>
                            <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                                <SelectTrigger id="approval-reason">
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvalReasons.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approval-remark">Comments</Label>
                            <Textarea 
                                id="approval-remark" 
                                placeholder="Comments..." 
                                value={remark} 
                                onChange={(e) => setRemark(e.target.value)} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button 
                            onClick={() => rowToAct && approveMutation.mutate({ 
                                row: rowToAct, 
                                reason, 
                                remark: remark.trim() 
                            })} 
                            disabled={!reason || approveMutation.isPending}
                        >
                            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejection-reason">
                                Reason <span className="text-red-500">*</span>
                            </Label>
                            <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                                <SelectTrigger id="rejection-reason">
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rejectReasons.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rejection-remark">
                                Comments <span className="text-red-500">*</span>
                            </Label>
                            <Textarea 
                                id="rejection-remark" 
                                placeholder="Rejection comments..." 
                                value={remark} 
                                onChange={(e) => setRemark(e.target.value)} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button 
                            variant="destructive" 
                            onClick={() => rowToAct && rejectMutation.mutate({ 
                                row: rowToAct, 
                                reason, 
                                remark: remark.trim() 
                            })} 
                            disabled={!reason || !remark.trim() || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Reject
                        </Button>
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
    setFilters: React.Dispatch<React.SetStateAction<ApprovalFilters>>;
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
    userAccess
}: AdvancedFiltersProps) {
    // Filter options based on user access
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
        { value: "requestId", label: "Request ID", type: "text" },
        // Only show SAP BP ID filter option for admin
        ...(showSapBpIdFilter 
            ? [{ value: "sapBpId" as FilterFieldKey, label: "SAP BP ID", type: "text" as const }] 
            : []
        ),
        { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

    const addAdvFilter = (field: FilterFieldKey) => {
        // Prevent duplicate dateRange filters
        if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
        // Prevent duplicate sapBpId filters
        if (field === "sapBpId" && advFilters.some((f) => f.field === "sapBpId")) return;
        
        const newFilter: AdvancedFilter = {
            id: `${field}-${Date.now()}`,
            field,
            value: "",
            dateRange: field === "dateRange" 
                ? { from: new Date(initialFrom), to: new Date(initialTo) } 
                : undefined,
        };
        setAdvFilters((prev) => [...prev, newFilter]);
    };

    const removeAdvFilter = (id: string) => {
        setAdvFilters((prev) => prev.filter((f) => f.id !== id));
    };

    useEffect(() => {
        const nextFilters: ApprovalFilters = { 
            requestId: "", 
            sapBpId: "", 
            fromDate: initialFrom, 
            toDate: initialTo 
        };
        
        advFilters.forEach((f) => {
            switch (f.field) {
                case "requestId": 
                    nextFilters.requestId = f.value || ""; 
                    break;
                case "sapBpId": 
                    nextFilters.sapBpId = f.value || ""; 
                    break;
                case "dateRange":
                    if (f.dateRange?.from) {
                        nextFilters.fromDate = toYmd(f.dateRange.from);
                        nextFilters.toDate = f.dateRange.to 
                            ? toYmd(f.dateRange.to) 
                            : toYmd(f.dateRange.from);
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
                                        className={`w-full text-left px-3 py-2 text-sm ${
                                            isDisabled 
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
                    <div className="text-xs text-muted-foreground">
                        No advanced filters added.
                    </div>
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
                                                p.map((x) => 
                                                    x.id === af.id 
                                                        ? { ...x, value: e.target.value } 
                                                        : x
                                                )
                                            )
                                        }
                                        placeholder="Enter value..."
                                    />
                                )}
                                {fieldMeta.type === "daterange" && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className="w-full justify-start text-left font-normal h-7 text-xs"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {af.dateRange?.from ? (
                                                    af.dateRange.to
                                                        ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}`
                                                        : format(af.dateRange.from, "LLL dd, y")
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
                                                        p.map((x) => 
                                                            x.id === af.id 
                                                                ? { ...x, dateRange: range } 
                                                                : x
                                                        )
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
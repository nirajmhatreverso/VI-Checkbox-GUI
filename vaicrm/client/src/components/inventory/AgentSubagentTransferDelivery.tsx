import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Truck, Upload, Download, Loader2, SlidersHorizontal, X, Calendar as CalendarIcon, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useDebounce } from "@/hooks/use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

// --- Helper Functions ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type StockItem = any;

// --- Filter Types ---
type StockDeliveryFilters = {
    requestId: string;
    fromPlantName: string;
    toPlantName: string;
    material: string;
    fromDate: string;
    toDate: string;
    sapBpId: string;
};

type FilterFieldKey = "requestId" | "fromPlantName" | "toPlantName" | "material" | "dateRange" | "sapBpId";

type AdvancedFilter = {
    id: string;
    field: FilterFieldKey;
    value?: string;
    dateRange?: DateRange;
};

export default function AgentSubagentTransferDelivery() {
    const { toast } = useToast();

    const { user } = useAuthContext();
    const queryClient = useQueryClient();

    // --- User Role Detection ---
    const isAdminUser = user?.allAccess === "Y";
    const isMainPlantUser = user?.isMainPlant === "Y";
    const isNonAdmin = !isAdminUser;
    const loggedInUserBpId = user?.onbId || "";

    const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsItem, setDetailsItem] = useState<StockItem | null>(null);

    // --- Pagination State ---
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // --- State for Filtering ---
    const [useAdvanced, setUseAdvanced] = useState(false);
    const initialFrom = daysAgoYmd(30);
    const initialTo = todayYmd();

    const [filters, setFilters] = useState<StockDeliveryFilters>({
        requestId: "",
        fromPlantName: "",
        toPlantName: "",
        material: "",
        fromDate: initialFrom,
        toDate: initialTo,
        sapBpId: isNonAdmin ? loggedInUserBpId : "",
    });

    const [basicRange, setBasicRange] = useState<DateRange | undefined>({
        from: new Date(initialFrom),
        to: new Date(initialTo),
    });

    const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
    const debouncedFilters = useDebounce(filters, 500);

    // Effect to set sapBpId for non-admin users
    useEffect(() => {
        if (user && isNonAdmin && loggedInUserBpId) {
            setFilters((prev) => ({
                ...prev,
                sapBpId: loggedInUserBpId
            }));
        }
    }, [user, isNonAdmin, loggedInUserBpId]);

    // Reset pagination when filters change
    useEffect(() => {
        setPageIndex(0);
    }, [debouncedFilters]);

    // Fetch Data
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["agent-subagent-transfer-delivery-queue", debouncedFilters, loggedInUserBpId, isNonAdmin],
        queryFn: () => {
            const sapBpIdToSend = isNonAdmin && loggedInUserBpId ? loggedInUserBpId : (debouncedFilters.sapBpId || null);
            return apiRequest('/inventory/agent-subagent-transfer-history', 'POST', {
                requestId: debouncedFilters.requestId || null,
                sapBpId: sapBpIdToSend,
                module: "Sub-Agent",
                fromDate: debouncedFilters.fromDate,
                toDate: debouncedFilters.toDate,
                status: "SUCCESS",
                requestType: "STOCK_TRANSFER",
            });
        },
        enabled: !!user && (isAdminUser || (isNonAdmin && !!loggedInUserBpId)),
        staleTime: 60_000,
    });

    const uploadMutation = useMutation({
        mutationFn: async (vars: { row: StockItem; file: File }) => {
            const formData = new FormData();
            formData.append("excelFile", vars.file);
            const jsonData = {
                requestId: vars.row.requestId,
                material: vars.row.material,
                operation: "AGENT_HW",
            };
            formData.append("uploadSerialNoSubAgentRequest", JSON.stringify(jsonData));
            return apiRequest('/inventory/upload-serials-subagent', 'POST', formData);
        },
        onSuccess: (res, vars) => {
            if (res && (res.status === "SUCCESS" || res.statusCode === 200 || res.statusMessage?.includes("Success"))) {
                toast({
                    title: res.statusMessage || res.status || "Success",
                });
                setSelectedFiles((prev) => {
                    const next = { ...prev };
                    delete next[getUniqueRowKey(vars.row)];
                    return next;
                });
                queryClient.invalidateQueries({ queryKey: ["agent-subagent-transfer-delivery-queue"] });
            } else {
                toast({
                    title: res.statusMessage || res.status || "Error",
                    variant: "destructive",
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: error.statusMessage || error.message || "Error",
                variant: "destructive",
            });
        },
    });

    const getUniqueRowKey = (row: StockItem) => `${row.requestId}-${row.material}`;

    const handleFileChange = (row: StockItem, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFiles((prev) => ({ ...prev, [getUniqueRowKey(row)]: file }));
    };

    const handleDownloadTemplate = () => {
        const data = [{ SR_NO: "A123" }];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SerialNumbers");
        XLSX.writeFile(workbook, "stock_serial_template.xlsx");
    };

    // --- Client-Side Filtering ---
    const deliveryItems = useMemo((): StockItem[] => {
        const rawList = data?.data?.hwOrderDetails || [];

        return rawList.filter((item: StockItem) => {
            // Adjusting filter for hwOrderDetails structure
            // In hwOrderDetails, we might not have isFileUpload directly, but we can check if it's already delivered or similar
            // For now, matching the previous logic as closely as possible
            if (item.status !== "SUCCESS" || item.isFileUpload !== "N" || Number(item.itemQty) <= 0 || (item.itemSerialNo && item.itemSerialNo.toString().trim() !== "")) {
                return false;
            }
            if (filters.requestId) {
                if (!item.requestId?.toLowerCase().includes(filters.requestId.toLowerCase())) return false;
            }
            if (filters.fromPlantName) {
                if (!item.fromPlantName?.toLowerCase().includes(filters.fromPlantName.toLowerCase())) return false;
            }
            if (filters.toPlantName) {
                if (!item.toPlantName?.toLowerCase().includes(filters.toPlantName.toLowerCase())) return false;
            }
            if (filters.material) {
                const search = filters.material.toLowerCase();
                const matCode = (item.material || "").toLowerCase();
                const matName = (item.itemType || "").toLowerCase();
                if (!matCode.includes(search) && !matName.includes(search)) {
                    return false;
                }
            }
            return true;
        });
    }, [data, filters]);

    // --- Pagination Logic ---
    const totalCount = deliveryItems.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

    const pagedData = useMemo(() => {
        const start = pageIndex * pageSize;
        return deliveryItems.slice(start, start + pageSize);
    }, [deliveryItems, pageIndex, pageSize]);

    const handleSearch = () => refetch();

    const handleReset = () => {
        setFilters({
            requestId: "",
            fromPlantName: "",
            toPlantName: "",
            material: "",
            fromDate: initialFrom,
            toDate: initialTo,
            sapBpId: isNonAdmin ? loggedInUserBpId : "",
        });
        setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
        setAdvFilters([]);
        setUseAdvanced(false);
        setTimeout(() => refetch(), 100);
    };

    const columns: DataTableColumn<StockItem>[] = [
        { key: "requestId", label: "Request ID" },
        { key: "createDt", label: "Date" },
        { key: "transferFrom", label: "From Agent" },
        { key: "transferTo", label: "To Sub Agent" },
        {
            key: "material",
            label: "Material",
            render: (_v, row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-xs">{row.itemType} - {row.material}</span>
                </div>
            )
        },
        {
            key: "itemQty",
            label: "Qty",
            render: (value) => String(value || 0)
        },
        {
            key: "status",
            label: "Status",
            render: (status) => <Badge variant="success">{status}</Badge>,
        },
        {
            key: "actions",
            label: "Actions",
            render: (_v, row) => {
                const uniqueKey = getUniqueRowKey(row);
                const isUploading = uploadMutation.isPending && uploadMutation.variables?.row.requestId === row.requestId && uploadMutation.variables?.row.material === row.material;
                const selectedFile = selectedFiles[uniqueKey];

                const isUploadEnabled = row.isFileUpload === "N";

                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="xs"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                                setDetailsItem(row);
                                setDetailsOpen(true);
                            }}
                        >
                            <Info className="h-4 w-4 text-azam-blue" />
                        </Button>
                        <Button asChild size="xs" variant="outline" disabled={!isUploadEnabled}>
                            <label className={`cursor-pointer ${!isUploadEnabled ? "pointer-events-none opacity-50" : ""}`}>
                                <Upload className="h-3 w-3 mr-1" /> Choose File
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileChange(row, e)} disabled={!isUploadEnabled} />
                            </label>
                        </Button>
                        <Button
                            size="xs"
                            className="bg-azam-blue text-white hover:bg-azam-blue/90"
                            disabled={!selectedFile || isUploading || !isUploadEnabled}
                            onClick={() => { if (selectedFile) { uploadMutation.mutate({ row, file: selectedFile }); } }}
                        >
                            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload"}
                        </Button>
                        {selectedFile && <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={selectedFile.name}>{selectedFile.name}</span>}
                    </div>
                );
            },
        },
    ];

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Truck className="h-5 w-5 text-azam-blue" />
                            Pending Deliveries (Agent to Subagent)
                            <span className="text-[10px] font-normal text-muted-foreground ml-2 px-1.5 py-0.5 bg-gray-100 rounded">
                                ({isAdminUser ? "Admin" : isMainPlantUser ? "Main Plant" : "Agent"} | BP: {loggedInUserBpId || "N/A"})
                            </span>
                        </CardTitle>
                        <CardDescription>Upload serial numbers for approved agent to sub-agent transfers to complete delivery.</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="h-4 w-4 mr-2" /> Download Template
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                {/* Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                        <Button variant={!useAdvanced ? "default" : "ghost"} size="sm" onClick={() => setUseAdvanced(false)} className={!useAdvanced ? "bg-azam-blue" : ""}>Basic</Button>
                        <Button variant={useAdvanced ? "default" : "ghost"} size="sm" onClick={() => setUseAdvanced(true)} className={useAdvanced ? "bg-azam-blue" : ""}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
                        <Button size="sm" onClick={handleSearch} className="bg-azam-blue hover:bg-azam-blue/90">Search</Button>
                    </div>
                </div>

                {!useAdvanced && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border p-2 rounded-md">
                        <div>
                            <LabelSmall>Request ID</LabelSmall>
                            <Input value={filters.requestId} onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))} placeholder="ST..." className="h-8 text-xs" />
                        </div>
                        <div>
                            <LabelSmall>Material</LabelSmall>
                            <Input value={filters.material} onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))} placeholder="Material..." className="h-8 text-xs" />
                        </div>
                        <div>
                            <LabelSmall>From Plant</LabelSmall>
                            <Input value={filters.fromPlantName} onChange={(e) => setFilters((f) => ({ ...f, fromPlantName: e.target.value }))} placeholder="From Plant..." className="h-8 text-xs" />
                        </div>
                        <div>
                            <LabelSmall>To Plant</LabelSmall>
                            <Input value={filters.toPlantName} onChange={(e) => setFilters((f) => ({ ...f, toPlantName: e.target.value }))} placeholder="To Plant..." className="h-8 text-xs" />
                        </div>
                        {isAdminUser && (
                            <div>
                                <LabelSmall>Agent BP ID</LabelSmall>
                                <Input value={filters.sapBpId} onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))} placeholder="100..." className="h-8 text-xs" />
                            </div>
                        )}
                        {!isAdminUser && (
                            <div>
                                <LabelSmall>Your BP ID</LabelSmall>
                                <Input value={loggedInUserBpId} readOnly className="h-8 text-xs bg-gray-100" />
                            </div>
                        )}
                        <div className="col-span-1">
                            <LabelSmall>Date Range</LabelSmall>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange}
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

                {useAdvanced && (
                    <AdvancedFiltersComponent
                        advFilters={advFilters}
                        setAdvFilters={setAdvFilters}
                        setFilters={setFilters}
                        initialFrom={initialFrom}
                        initialTo={initialTo}
                        isAdminUser={isAdminUser}
                        loggedInUserBpId={isNonAdmin ? loggedInUserBpId : ""}
                    />)}

                <DataTable
                    title="Pending Serial Uploads"
                    data={pagedData}
                    columns={columns}
                    loading={isLoading}
                    error={isError ? (error as any)?.statusMessage || (error as any)?.message : undefined}
                    showCount
                    totalCount={totalCount}
                    headerVariant="gradient"
                    manualPagination
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    pageCount={pageCount}
                    onPageChange={setPageIndex}
                    onPageSizeChange={setPageSize}
                />

                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-azam-blue" />
                                Item Details
                            </DialogTitle>
                            <DialogDescription>
                                Request ID: <span className="font-mono text-black">{detailsItem?.requestId}</span>
                            </DialogDescription>
                        </DialogHeader>

                        {detailsItem && (
                            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Material</div>
                                    <div className="font-medium">{detailsItem.material}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Quantity</div>
                                    <div className="font-medium">{detailsItem.itemQty}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Type</div>
                                    <div className="font-medium">{detailsItem.itemType || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Description</div>
                                    <div className="font-medium">{detailsItem.description || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">From Plant</div>
                                    <div className="font-medium">{detailsItem.fromPlantName}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">To Plant</div>
                                    <div className="font-medium">{detailsItem.toPlantName}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">From Store</div>
                                    <div className="font-medium">{detailsItem.fromStoreLocation || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">To Store</div>
                                    <div className="font-medium">{detailsItem.toStoreLocation || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Created By</div>
                                    <div className="font-medium">{detailsItem.createId || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Date</div>
                                    <div className="font-medium">{detailsItem.createDt}</div>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <div className="text-xs text-gray-500 uppercase">Remark</div>
                                    <div className="p-2 bg-gray-50 rounded italic text-gray-600">{detailsItem.remark || 'No remarks'}</div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

function AdvancedFiltersComponent({
    advFilters,
    setAdvFilters,
    setFilters,
    initialFrom,
    initialTo,
    isAdminUser,
    loggedInUserBpId,
}: {
    advFilters: AdvancedFilter[];
    setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
    setFilters: React.Dispatch<React.SetStateAction<StockDeliveryFilters>>;
    initialFrom: string;
    initialTo: string;
    isAdminUser: boolean;
    loggedInUserBpId: string;
}) {
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
        { value: "requestId", label: "Request ID", type: "text" },
        { value: "material", label: "Material", type: "text" },
        { value: "fromPlantName", label: "From Plant", type: "text" },
        { value: "toPlantName", label: "To Plant", type: "text" },
        ...(isAdminUser ? [{ value: "sapBpId" as FilterFieldKey, label: "Agent BP ID", type: "text" as const }] : []),
        { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

    const addAdvFilter = (field: FilterFieldKey) => {
        if (advFilters.some((f) => f.field === field)) return;
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
        const nextFilters: StockDeliveryFilters = {
            requestId: "",
            fromPlantName: "",
            toPlantName: "",
            material: "",
            fromDate: initialFrom,
            toDate: initialTo,
            sapBpId: loggedInUserBpId,
        };
        advFilters.forEach((f) => {
            switch (f.field) {
                case "requestId": nextFilters.requestId = f.value || ""; break;
                case "material": nextFilters.material = f.value || ""; break;
                case "fromPlantName": nextFilters.fromPlantName = f.value || ""; break;
                case "toPlantName": nextFilters.toPlantName = f.value || ""; break;
                case "sapBpId": if (isAdminUser) nextFilters.sapBpId = f.value || ""; break;
                case "dateRange":
                    if (f.dateRange?.from) {
                        nextFilters.fromDate = toYmd(f.dateRange.from);
                        nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
                    }
                    break;
            }
        });
        setFilters(nextFilters);
    }, [advFilters, setFilters, initialFrom, initialTo, isAdminUser, loggedInUserBpId]);

    return (
        <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
            <div className="flex items-center gap-2">
                <LabelSmall>Add filter</LabelSmall>
                <Select onValueChange={(v: FilterFieldKey) => addAdvFilter(v)}>
                    <SelectTrigger className="h-8 text-xs w-56 bg-white"><SelectValue placeholder="Choose field..." /></SelectTrigger>
                    <SelectContent>
                        {FILTER_FIELD_OPTIONS.map((opt) => {
                            const isDisabled = advFilters.some((f) => f.field === opt.value);
                            return (
                                <SelectItem key={opt.value} value={opt.value} disabled={isDisabled}>
                                    {opt.label}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                {advFilters.length === 0 && <div className="text-xs text-muted-foreground italic">No advanced filters added.</div>}
                {advFilters.map((af) => {
                    const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
                    return (
                        <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                                <Input value={fieldMeta.label} readOnly className="h-8 text-xs bg-gray-100 font-medium" />
                            </div>
                            <div className="col-span-8">
                                {fieldMeta.type === "text" && (
                                    <Input className="h-8 text-xs bg-white" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder="Enter value..." />
                                )}
                                {fieldMeta.type === "daterange" && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs bg-white">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                            <div className="col-span-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAdvFilter(af.id)}><X className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

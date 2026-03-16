
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, X, Info, SlidersHorizontal, Calendar as CalendarIcon, FileText, Loader2, Printer, ArrowRightLeft, Check, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateReceiptHtmlFromApi } from "@/utils/receipt-utils";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Helper functions and types
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ANY = "__ANY__";

type PaymentDetail = {
    id: number | string;
    transId: string;
    name: string;
    sapBpId: string;
    payAmount: number;
    payMode: string;
    currency: string;
    collectionCenter: string;
    collectedBy: string;
    createDt: string;
    status: string;
    raw: any;
    details?: string;
    actions?: string;
    targetBpId?: string;
};

type HistoryFilters = {
    transId: string;
    sapBpId: string;
    payMode: string;
    collectionCenter: string;
    fromDate: string;
    toDate: string;
};
type FilterFieldKey = "transId" | "sapBpId" | "payMode" | "collectionCenter" | "dateRange";
type FilterOp = "equals" | "contains" | "between";
type AdvancedFilter = {
    id: string;
    field: FilterFieldKey;
    op: FilterOp;
    value?: string;
    dateRange?: DateRange;
};

// Helper Component for Details View
const DetailItem = ({ label, value, className }: { label: string; value: any; className?: string }) => (
    <div className={className}>
        <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{label}</div>
        <div className="font-medium text-sm truncate text-gray-900" title={String(value || "")}>
            {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
        </div>
    </div>
);

export default function CustomerTransferApprovalQueue() {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsRow, setDetailsRow] = useState<any | null>(null);

    // Dialog states for approval/rejection
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);
    const [selectedTransfer, setSelectedTransfer] = useState<PaymentDetail | null>(null);
    const [reason, setReason] = useState("");

    const [useAdvanced, setUseAdvanced] = useState(false);
    const initialFrom = daysAgoYmd(30);
    const initialTo = todayYmd();
    const [filters, setFilters] = useState<HistoryFilters>({
        transId: "",
        sapBpId: "",
        payMode: "",
        collectionCenter: "",
        fromDate: initialFrom,
        toDate: initialTo,
    });
    const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
    const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["customer-transfer-approval", filters, pageIndex, pageSize],
        enabled: !!user,
        queryFn: () =>
            apiRequest('/customer-payments/search', 'POST', {
                transId: filters.transId || null,
                sapBpId: filters.sapBpId || null,
                payMode: filters.payMode || null,
                payType: "PAY_TRANSFER",
                status: "INPROCESS",
                collectionCenter: filters.collectionCenter || null,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                isSpecificTransaction: "N",
                offSet: pageIndex * pageSize,
                limit: pageSize,
                module: "CUSTOMER",
                type: "CUSTOMER",
            }),
        staleTime: 10_000,
        placeholderData: (prev) => prev,
    });

    const approvalMutation = useMutation({
        mutationFn: async (payload: { sapBpId: string; transId: string; description: string; status: string; reason: string }) => {
            return apiRequest('/customer-payments/transfer-approval', 'POST', payload);
        },
        onSuccess: () => {
            toast({ title: "Success", description: `Transfer ${actionType === 'APPROVED' ? 'approved' : 'rejected'} successfully.` });
            setConfirmDialogOpen(false);
            setSelectedTransfer(null);
            setReason("");
            // Refresh via reload to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to process transfer request", variant: "destructive" });
        }
    });

    const handleAction = (transfer: PaymentDetail, type: "APPROVED" | "REJECTED") => {
        setSelectedTransfer(transfer);
        setActionType(type);
        setReason(type === 'APPROVED' ? "Approved" : ""); // Default reason for approval
        setConfirmDialogOpen(true);
    };

    const submitAction = () => {
        if (!selectedTransfer || !actionType) return;
        if (actionType === 'REJECTED' && !reason.trim()) {
            toast({ title: "Required", description: "Please provide a reason for rejection.", variant: "destructive" });
            return;
        }

        // Use targetBpId if available, as 'sapBpId' in the row might be the Source BP which is invalid for approval action
        const bpIdToUse = selectedTransfer.targetBpId || selectedTransfer.sapBpId;

        approvalMutation.mutate({
            sapBpId: bpIdToUse,
            transId: selectedTransfer.transId,
            description: "Payment transfer",
            status: actionType,
            reason: reason
        });
    };

    const payments: PaymentDetail[] = useMemo(() => {
        if (data?.status !== "SUCCESS") return [];
        return data?.data?.agentHwPaymentDetails?.map((p: any) => ({
            id: p.payId,
            transId: p.transId,
            name: p.name || "",
            sapBpId: p.sapBpId,
            payAmount: Number(p.payAmount ?? 0),
            payMode: p.payMode,
            currency: p.currency,
            collectionCenter: p.collectionCenter,
            collectedBy: p.collectedBy,
            createDt: p.createDt,
            status: p.status,
            targetBpId: p.toSapBpId || p.targetBpId || p.targetSapBpId, // Try to capture target BP if available
            raw: p,
        })) || [];
    }, [data]);

    const totalCount = data?.data?.totalCount ?? 0;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const [receiptRow, setReceiptRow] = useState<any | null>(null);

    const openReceiptDialog = async (transId: string) => {
        setReceiptDialogOpen(true);
        setReceiptLoading(true);
        try {
            const res = await apiRequest('/customer-payments/search', 'POST', { transId, isSpecificTransaction: "Y", limit: 1, type: "CUSTOMER", payType: "SUBSCRIPTION" });
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

    const getStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case "COMPLETED": case "SUCCESS":
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
            case "APPROVED":
                return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
            case "PENDING": case "INPROCESS": case "PAY_TRANSFER":
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case "CANCELLED": case "REJECTED":
                return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns: DataTableColumn<PaymentDetail>[] = [
        { key: "transId", label: "Txn ID", sortable: true },
        { key: "name", label: "Customer", sortable: true },
        { key: "sapBpId", label: "BP ID", sortable: true },
        { key: "payAmount", label: "Amount", sortable: true, render: (v, r) => `${r.currency} ${r.payAmount.toLocaleString()}` },
        { key: "payMode", label: "Mode", sortable: true },
        { key: "status", label: "Status", sortable: true, render: (v, r) => getStatusBadge(r.status) },
        {
            key: "details",
            label: "DETAILS",
            render: (_v, r) => (
                <Button size="sm" variant="outline" className="h-8" onClick={() => { setDetailsRow(r.raw); setDetailsOpen(true); }}>
                    <Info className="h-3.5 w-3.5 mr-2" /> View
                </Button>
            ),
        },
        {
            key: "actions",
            label: "ACTIONS",
            render: (_v, r) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-4" onClick={() => handleAction(r, 'APPROVED')}>
                        Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 px-4" onClick={() => handleAction(r, 'REJECTED')}>
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
        setFilters({ transId: "", sapBpId: "", payMode: "", collectionCenter: "", fromDate: initialFrom, toDate: initialTo });
        setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
        setAdvFilters([]);
        setUseAdvanced(false);
        setTimeout(() => refetch(), 100);
    };

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
                    <div className="md:col-span-2"><LabelSmall>Trans ID</LabelSmall><Input value={filters.transId} onChange={(e) => setFilters(f => ({ ...f, transId: e.target.value }))} className="h-7 text-xs" /></div>
                    <div className="md:col-span-2"><LabelSmall>SAP BP ID</LabelSmall><Input value={filters.sapBpId} onChange={(e) => setFilters(f => ({ ...f, sapBpId: e.target.value }))} className="h-7 text-xs" /></div>
                    <div className="md:col-span-2"><LabelSmall>Pay Mode</LabelSmall>
                        <Select value={filters.payMode || ANY} onValueChange={(v) => setFilters(f => ({ ...f, payMode: v === ANY ? "" : v }))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY}>Any</SelectItem>
                                <SelectItem value="CASH">CASH</SelectItem>
                                <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                                <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-4">
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

            <DataTable<PaymentDetail>
                title="Transfer Approval Queue"
                subtitle="Pending subscription transfers needing approval"
                icon={<ArrowRightLeft className="h-5 w-5" />}
                showCount
                totalCount={totalCount}
                data={payments}
                columns={columns}
                loading={isLoading}
                manualPagination
                pageIndex={pageIndex}
                pageSize={pageSize}
                pageCount={pageCount}
                onPageChange={setPageIndex}
                onPageSizeChange={setPageSize}
            />
            {isError && <p className="text-xs text-red-600">Failed to load transfer approval queue.</p>}

            {/* VIEW DETAILS DIALOG */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-7xl max-h-[100vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Transfer Details</DialogTitle>
                        <DialogDescription>
                            Transaction: {detailsRow?.transId} • BP: {detailsRow?.sapBpId}
                        </DialogDescription>
                    </DialogHeader>

                    {detailsRow && (
                        <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm text-sm">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <DetailItem label="Transaction ID" value={detailsRow.transId} />
                                <DetailItem label="Pay ID" value={detailsRow.payId} />
                                <DetailItem label="Status" value={detailsRow.status} />
                                <DetailItem label="Created Date" value={detailsRow.createDt} />
                                <DetailItem label="Created TS" value={detailsRow.createTs} />
                                <DetailItem label="Created By" value={detailsRow.createId} />
                            </div>

                            <Separator />

                            {/* Customer Info */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <DetailItem label="Customer Name" value={detailsRow.name} />
                                <DetailItem label="SAP BP ID" value={detailsRow.sapBpId} />
                                <DetailItem label="SAP CA ID" value={detailsRow.sapCaId} />
                                <DetailItem label="Module" value={detailsRow.module} />
                                <DetailItem label="Module ID" value={detailsRow.moduleId} />
                            </div>

                            <Separator />

                            {/* Payment Amounts & Types */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <DetailItem label="Pay Amount" value={`${detailsRow.currency || ''} ${detailsRow.payAmount}`} />
                                <DetailItem label="VAT Amount" value={detailsRow.vatAmount} />
                                <DetailItem label="Total Amount" value={`${detailsRow.currency || ''} ${detailsRow.totalAmount}`} />
                                <DetailItem label="Pay Type" value={detailsRow.payType} />
                                <DetailItem label="Pay Mode" value={detailsRow.payMode} />
                                <DetailItem label="Trans Type" value={detailsRow.transType} />
                            </div>

                            <Separator />

                            {/* Payment Instrument Details */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <DetailItem label="Receipt No" value={detailsRow.receiptNo} />
                                <DetailItem label="Cheque No" value={detailsRow.chequeNo} />
                                <DetailItem label="Cheque Date" value={detailsRow.chequeDate} />
                                <DetailItem label="Bank Name" value={detailsRow.bankName} />
                                <DetailItem label="Branch Name" value={detailsRow.branchName} />
                                <DetailItem label="Online PG ID" value={detailsRow.onlPgId} />
                                <DetailItem label="Online Trans ID" value={detailsRow.onlTransId} />
                            </div>

                            <Separator />

                            {/* Org & Location */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <DetailItem label="Sales Org" value={detailsRow.salesOrg} />
                                <DetailItem label="Division" value={detailsRow.division} />
                                <DetailItem label="Collected By" value={detailsRow.collectedBy} />
                                <DetailItem label="Collection Center" value={detailsRow.collectionCenter} />
                                <DetailItem label="Coll. Center Code" value={detailsRow.collectionCenterCode} />
                            </div>

                            <Separator />

                            {/* Status & Updates */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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

                            {/* Description */}
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">Description</div>
                                <div className="p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap break-words">
                                    {detailsRow.description || "No description provided"}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* APPROVE/REJECT CONFIRMATION DIALOG */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'APPROVED' ? 'Approve Transfer' : 'Reject Transfer'}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {actionType === 'APPROVED' ? 'approve' : 'reject'} this transfer request?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-md">
                            <div><span className="text-gray-500 text-xs uppercase">Transaction ID</span><div className="font-medium">{selectedTransfer?.transId}</div></div>
                            <div><span className="text-gray-500 text-xs uppercase">BP ID</span><div className="font-medium">{selectedTransfer?.sapBpId}</div></div>
                            <div><span className="text-gray-500 text-xs uppercase">Amount</span><div className="font-medium">{selectedTransfer?.currency} {selectedTransfer?.payAmount}</div></div>
                            <div><span className="text-gray-500 text-xs uppercase">Customer</span><div className="font-medium">{selectedTransfer?.name}</div></div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {actionType === 'APPROVED' ? 'Approval Note (Optional)' : 'Rejection Reason (Required)'}
                            </label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={actionType === 'APPROVED' ? "Enter approval notes..." : "Enter reason for rejection..."}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={submitAction}
                            variant={actionType === 'REJECTED' ? "destructive" : "default"}
                            disabled={approvalMutation.isPending}
                        >
                            {approvalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionType === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            <div><div className="text-gray-500">Customer BP</div><div className="font-medium">{receiptRow.sapBpId || "-"}</div></div>
                            <div><div className="text-gray-500">Customer Name</div><div className="font-medium">{receiptRow.name || "-"}</div></div>
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

const LabelSmall = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-medium text-gray-700">{children}</label>;

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: {
    advFilters: AdvancedFilter[];
    setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
    setFilters: React.Dispatch<React.SetStateAction<HistoryFilters>>;
    initialFrom: string;
    initialTo: string;
}) {
    const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange"; }[] = [
        { value: "transId", label: "Trans ID", type: "text" },
        { value: "sapBpId", label: "SAP BP ID", type: "text" },
        { value: "payMode", label: "Pay Mode", type: "select" },
        { value: "collectionCenter", label: "Collection Center", type: "text" },
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
        setAdvFilters((prev: AdvancedFilter[]) => [...prev, newFilter]);
    };
    const removeAdvFilter = (id: string) => setAdvFilters((prev: AdvancedFilter[]) => prev.filter((f: AdvancedFilter) => f.id !== id));

    useEffect(() => {
        const nextFilters: HistoryFilters = { transId: "", sapBpId: "", payMode: "", collectionCenter: "", fromDate: initialFrom, toDate: initialTo };
        advFilters.forEach((f: AdvancedFilter) => {
            switch (f.field) {
                case "transId": nextFilters.transId = f.value || ""; break;
                case "sapBpId": nextFilters.sapBpId = f.value || ""; break;
                case "payMode": nextFilters.payMode = f.value || ""; break;
                case "collectionCenter": nextFilters.collectionCenter = f.value || ""; break;
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
                {advFilters.map((af: AdvancedFilter) => {
                    const fieldMeta = FILTER_FIELD_OPTIONS.find(f => f.value === af.field)!;
                    const ops = fieldMeta.type === 'text' ? ["contains", "equals"] : ["equals"];
                    return (
                        <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3"><Select value={af.field} onValueChange={(v: FilterFieldKey) => setAdvFilters((p: AdvancedFilter[]) => p.map(x => x.id === af.id ? { ...x, field: v, value: "", op: 'contains' } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FILTER_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                            <div className="col-span-2"><Select value={af.op} onValueChange={(v: FilterOp) => setAdvFilters((p: AdvancedFilter[]) => p.map(x => x.id === af.id ? { ...x, op: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{ops.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                            <div className="col-span-6">
                                {fieldMeta.type === 'text' && <Input className="h-7 text-xs" value={af.value} onChange={e => setAdvFilters((p: AdvancedFilter[]) => p.map(x => x.id === af.id ? { ...x, value: e.target.value } : x))} />}
                                {fieldMeta.type === 'select' && af.field === 'payMode' && <Select value={af.value} onValueChange={v => setAdvFilters((p: AdvancedFilter[]) => p.map(x => x.id === af.id ? { ...x, value: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select pay mode" /></SelectTrigger><SelectContent><SelectItem value="CASH">CASH</SelectItem><SelectItem value="CHEQUE">CHEQUE</SelectItem><SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem></SelectContent></Select>}
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
                                                onSelect={(range) => setAdvFilters((p: AdvancedFilter[]) => p.map(x => (x.id === af.id ? { ...x, dateRange: range } : x)))}
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

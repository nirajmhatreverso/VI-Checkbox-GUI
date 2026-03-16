import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CheckCircle, XCircle, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRange } from "react-day-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CheckSquare } from "lucide-react";

// Helper for date formatting
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

export default function ValidityExtensionApprovalPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<"approve" | "reject">("approve");
    const [remarks, setRemarks] = useState("");
    const [reason, setReason] = useState("");

    // Filters State
    const initialFrom = useMemo(() => toYmd(subDays(new Date(), 180)), []);
    const initialTo = useMemo(() => toYmd(new Date()), []);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });

    const debouncedSearch = useDebounce(searchTerm, 500);

    // No specific BP/CA filter for the global page
    const sapBpId = undefined;
    const sapCaId = undefined;

    const { data: requestsData, isLoading, refetch } = useQuery({
        queryKey: ['extensionRequests', 'all', 'all', debouncedSearch, dateRange],
        queryFn: () => {
            const payload: any = {
                actionSubtype: 'PLAN_EXTENSION',
                status: 'INPROCESS',
                limit: 100,
                fromDate: dateRange?.from ? toYmd(dateRange.from) : initialFrom,
                toDate: dateRange?.to ? toYmd(dateRange.to) : (dateRange?.from ? toYmd(dateRange.from) : initialTo),
            };

            if (debouncedSearch) {
                payload.search = debouncedSearch;
            }

            return apiRequest('/subscriptions/service-details', 'POST', payload);
        },
        enabled: true,
    });

    const requests = (requestsData?.data?.serviceDetails || []).map((item: any) => ({
        ...item,
        createTs: item.createTs,
        requestedEndDate: item.endDate || item.details || "",
        reason: item.reason || item.remarks || "No reason provided",
        createdBy: item.createId || item.createdBy || "System",
    }));

    const actionMutation = useMutation({
        mutationFn: (payload: any) => apiRequest('/crm/v1/planEx/approval', 'POST', payload),
        onSuccess: () => {
            toast({ title: "Success", description: `Request ${activeTab === 'approve' ? 'approved' : 'rejected'} successfully.` });
            queryClient.invalidateQueries({ queryKey: ['extensionRequests'] });
            refetch();
            handleCloseDialog();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Action failed.", variant: "destructive" });
        }
    });

    const handleReset = () => {
        setSearchTerm("");
        setDateRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    };

    const handleActionClick = (request: any, type: "APPROVE" | "REJECT") => {
        setSelectedRequest(request);
        setActiveTab(type === 'APPROVE' ? 'approve' : 'reject');
        setRemarks("");
        setReason(type === "APPROVE" ? "APPROVED" : "REJECTED");
    };

    const handleCloseDialog = () => {
        setSelectedRequest(null);
        setRemarks("");
        setReason("");
    };

    const handleSubmitAction = () => {
        if (!selectedRequest) return;

        const payload = {
            requestId: selectedRequest.requestId,
            status: activeTab === 'approve' ? 'APPROVED' : 'REJECTED',
            remark: remarks,
            reason: reason
        };


        actionMutation.mutate(payload);
    };

    const columns: DataTableColumn<any>[] = [
        { key: "createTs", label: "Created On", sortable: true, render: (v) => format(new Date(v), "dd-MM-yyyy") },
        { key: "requestId", label: "Request ID", sortable: true, render: (v) => <span className="font-mono text-xs">{v}</span> },
        { key: "sapBpId", label: "BP ID", sortable: true, render: (v) => <span className="font-mono text-xs text-gray-500">{v || "-"}</span> },
        { key: "smartCardNo", label: "Smart Card", sortable: true, render: (v) => <span className="font-mono text-xs text-gray-500">{v || "-"}</span> },
        { key: "requestedEndDate", label: "Extend Validity Date", sortable: true, render: (v) => format(new Date(v), "dd-MM-yyyy") },
        { key: "division", label: "Division", sortable: true },
        { key: "createdBy", label: "Created By", sortable: true },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (v) => (
                <Badge
                    className={`${v?.toLowerCase() === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs border-0`}
                >
                    {v}
                </Badge>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="xs"
                        className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm"
                        onClick={() => handleActionClick(row, "APPROVE")}
                    >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                        size="xs"
                        className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
                        onClick={() => handleActionClick(row, "REJECT")}
                    >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Page Header */}
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <CheckSquare className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Extend Plan Validity Approvals</h1>
                            <p className="text-blue-100 text-xs mt-0.5">Review and action pending plan validity extension requests</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Card (with filters and table) */}
            <Card>
                <CardHeader className="p-4 border-b">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded-md bg-gray-50">
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">Search</label>
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Request ID, BP ID, Reason..."
                                    className="h-7 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs bg-white">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                                        {format(dateRange.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pick a date range</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable
                        title="Pending Requests"
                        data={requests}
                        columns={columns}
                        emptyMessage="No pending extension requests found."
                        loading={isLoading}
                    />
                </CardContent>
            </Card>

            {/* Approval/Rejection Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Extension Approval Action</DialogTitle>
                        <DialogDescription>
                            Review and take action on the extension request for {selectedRequest?.requestId}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-100 p-1 rounded-md">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("approve");
                                    setReason("APPROVED");
                                }}
                                className={`flex-1 p-2 text-sm font-medium rounded transition-all ${activeTab === "approve" ? "bg-orange-500 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("reject");
                                    setReason("REJECTED");
                                }}
                                className={`flex-1 p-2 text-sm font-medium rounded transition-all ${activeTab === "reject" ? "bg-red-600 text-white shadow" : "text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                Reject
                            </button>
                        </div>

                        <div className="space-y-2">
                            <Label>Action Reason <span className="text-red-500">*</span></Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeTab === 'approve' ? (
                                        <SelectItem value="APPROVED">APPROVED</SelectItem>
                                    ) : (
                                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Additional Remarks
                                {activeTab === 'reject' ? <span className="text-red-500 ml-1">(Required)</span> : <span className="text-gray-400 ml-1">(Optional)</span>}
                            </Label>
                            <Textarea
                                placeholder="Enter remarks..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog} disabled={actionMutation.isPending} type="button">Cancel</Button>
                        <Button
                            type="button"
                            onClick={handleSubmitAction}
                            disabled={actionMutation.isPending || !reason || (activeTab === 'reject' && !remarks.trim())}
                            className={activeTab === 'approve' ? "bg-orange-500 hover:bg-orange-600" : "bg-red-600 hover:bg-red-700"}
                        >
                            {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {activeTab === 'approve' ? "Submit Approval" : "Submit Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

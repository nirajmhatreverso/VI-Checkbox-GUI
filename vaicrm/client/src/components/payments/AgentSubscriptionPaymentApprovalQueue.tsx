// src/components/payments/subscription/AgentSubscriptionPaymentApprovalQueue.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, CheckSquare, Info, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type DropdownOption = { name: string; value: string };

type PaymentRecord = {
  id: number;
  transactionId: string;
  sapBpId: string;
  agentName: string;
  collectionCenter: string;
  payMode: string;
  currency: string;
  amount: number;
  status: string;
  createDt: string;
  collectedBy?: string | null;
  raw: any;
  details?: string;
};

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const ANY = "__ANY__";

// Helper for Detail View
const DetailItem = ({ label, value, className }: { label: string; value: any; className?: string }) => (
  <div className={className}>
    <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{label}</div>
    <div className="font-medium text-sm truncate text-gray-900" title={String(value || "")}>
      {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
    </div>
  </div>
);

function getStatusBadge(status: string) {
  const up = (status || "").toUpperCase();
  if (up === "SUCCESS" || up === "APPROVED")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">
        Success
      </span>
    );
  if (up === "INPROCESS" || up === "PENDING")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200">
        Pending
      </span>
    );
  if (up === "REJECTED")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-50 text-gray-700 border border-gray-200">
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-red-50 text-red-700 border border-red-200">
      {status}
    </span>
  );
}

export default function AgentSubscriptionPaymentApprovalQueue() {
  const queryClient = useQueryClient();
  
  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Date range (default: last 10 days)
  const today = new Date();
  const initialTo = toYmd(today);
  const initialFrom = toYmd(new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000));

  // Filters
  const [filters, setFilters] = useState({
    transId: "",
    sapBpId: "",
    payMode: "",
    collectionCenter: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(filters.fromDate),
    to: new Date(filters.toDate),
  });

  const dateRangeValid = useMemo(() => {
    const from = new Date(filters.fromDate);
    const to = new Date(filters.toDate);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays <= 10 && diffDays >= 0;
  }, [filters.fromDate, filters.toDate]);

  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [recToApprove, setRecToApprove] = useState<PaymentRecord | null>(null);
  const [approveReason, setApproveReason] = useState("");
  const [approveRemark, setApproveRemark] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [recToReject, setRecToReject] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Load dropdown options
  const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();
  const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
  const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

  // Auto-select if only one reason
  useEffect(() => {
    if (approvalReasons.length === 1 && !approveReason) {
      setApproveReason(approvalReasons[0].value);
    }
  }, [approvalReasons, approveReason]);

  useEffect(() => {
    if (rejectReasons.length === 1 && !rejectReason) {
      setRejectReason(rejectReasons[0].value);
    }
  }, [rejectReasons, rejectReason]);

  // SAME API as PaymentApprovalQueue.tsx for SUBSCRIPTION type
  const { data, isLoading, isError } = useQuery({
    queryKey: ["subscription-approvals", filters, pageIndex, pageSize],
    queryFn: () => apiRequest('/agent-payments/search', 'POST', {
      transId: filters.transId || null,
      sapBpId: filters.sapBpId || null,
      payType: "SUBSCRIPTION", // Fixed to SUBSCRIPTION
      payMode: filters.payMode || null,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      collectionCenter: filters.collectionCenter || null,
      isSpecificTransaction: "N",
      status: "INPROCESS",
      offSet: pageIndex * pageSize,
      limit: pageSize,
      type: "AGENT",
    }),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const totalCount = data?.data?.totalCount ?? 0;
  const rowsApi = data?.data?.agentHwPaymentDetails ?? [];

  const mappedRows: PaymentRecord[] = useMemo(
    () =>
      rowsApi.map((row: any, idx: number) => ({
        id: row.payId ? Number(row.payId) : Date.now() + idx,
        transactionId: row.transId,
        sapBpId: row.sapBpId,
        agentName: row.name || "",
        collectionCenter: row.collectionCenter || "",
        payMode: row.payMode || "CASH",
        currency: row.currency || "",
        amount: Number(row.totalAmount ?? row.payAmount ?? 0),
        status: row.status || "INPROCESS",
        createDt: row.createTs
          ? new Date(row.createTs).toISOString()
          : row.createDt
            ? new Date(row.createDt).toISOString()
            : new Date().toISOString(),
        collectedBy: row.collectedBy || null,
        raw: row,
      })),
    [rowsApi]
  );

  // SAME APPROVE ENDPOINT as PaymentApprovalQueue.tsx for SUBSCRIPTION
  // Uses: /agent-payments/agentapprove (maps to /payments/v1/customerSub/paymentApproval)
  const approveMutation = useMutation({
    mutationFn: (vars: { rec: PaymentRecord; reason: string; remark: string }) => {
      setApprovingId(vars.rec.id);
      return apiRequest("/agent-payments/agentapprove", "POST", {
        sapBpId: vars.rec.sapBpId,
        transId: vars.rec.transactionId,
        description: vars.remark || vars.reason,
        status: "APPROVED",
        reason: vars.reason,
      });
    },
    onSuccess: (res, { rec }) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-approvals"] });
      toast({
        title: "Approved",
        description: (res as any)?.data?.message || `Payment ${rec.transactionId} approved.`,
      });
      setApproveDialogOpen(false);
      setDetailsOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e?.statusMessage || "Approval failed",
        variant: "destructive",
      }),
    onSettled: () => setApprovingId(null),
  });

  // SAME REJECT ENDPOINT as PaymentApprovalQueue.tsx for SUBSCRIPTION
  // Uses: /agent-payments/agentapprove (maps to /payments/v1/customerSub/paymentApproval)
  const rejectMutation = useMutation({
    mutationFn: (vars: { rec: PaymentRecord; reason: string; remark: string }) => {
      setRejectingId(vars.rec.id);
      return apiRequest("/agent-payments/agentapprove", "POST", {
        sapBpId: vars.rec.sapBpId,
        transId: vars.rec.transactionId,
        description: vars.remark,
        status: "REJECTED",
        reason: vars.reason,
      });
    },
    onSuccess: (res, { rec }) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-approvals"] });
      toast({
        title: "Rejected",
        description: (res as any)?.data?.message || `Payment ${rec.transactionId} rejected.`,
      });
      setRejectDialogOpen(false);
      setDetailsOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e?.statusMessage || "Rejection failed",
        variant: "destructive",
      }),
    onSettled: () => setRejectingId(null),
  });

  const handleReset = () => {
    setFilters({
      transId: "",
      sapBpId: "",
      payMode: "",
      collectionCenter: "",
      fromDate: initialFrom,
      toDate: initialTo,
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setPageIndex(0);
  };

  const handleSearch = () => {
    if (!dateRangeValid) {
      toast({
        title: "Invalid date range",
        description: "Please select a range of 10 days or less.",
        variant: "destructive",
      });
      return;
    }
    setPageIndex(0);
  };

  const controlClasses = "h-7 text-xs";

  const columns: DataTableColumn<PaymentRecord>[] = [
    { key: "transactionId", label: "Txn ID", sortable: true },
    { key: "agentName", label: "Name", sortable: true },
    { key: "sapBpId", label: "BP ID", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (_v, r) => `${r.currency} ${r.amount.toLocaleString()}`,
    },
    { key: "payMode", label: "Mode", sortable: true },
    {
      key: "createDt",
      label: "Date",
      sortable: true,
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_v, r) => getStatusBadge(r.status),
    },
    {
      key: "details",
      label: "Details",
      sortable: false,
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r.raw); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (_v, r) => (
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => { 
              setRecToApprove(r); 
              setApproveReason(""); 
              setApproveRemark(""); 
              setApproveDialogOpen(true); 
            }}
            disabled={approvingId === r.id || rejectingId === r.id}
          >
            {approvingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => { 
              setRecToReject(r); 
              setRejectReason(""); 
              setRejectRemark(""); 
              setRejectDialogOpen(true); 
            }}
            disabled={approvingId === r.id || rejectingId === r.id}
          >
            {rejectingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
          </Button>
        </div>
      ),
    },
  ];

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
        <div className="md:col-span-2">
          <LabelSmall>Trans ID</LabelSmall>
          <Input
            value={filters.transId}
            onChange={(e) => setFilters((f) => ({ ...f, transId: e.target.value }))}
            placeholder="Search ID..."
            className={controlClasses}
          />
        </div>
        <div className="md:col-span-2">
          <LabelSmall>SAP BP ID</LabelSmall>
          <Input
            value={filters.sapBpId}
            onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))}
            placeholder="1000..."
            className={controlClasses}
          />
        </div>
        <div className="md:col-span-2">
          <LabelSmall>Center</LabelSmall>
          <Input
            value={filters.collectionCenter}
            onChange={(e) => setFilters((f) => ({ ...f, collectionCenter: e.target.value }))}
            placeholder="Center..."
            className={controlClasses}
          />
        </div>
        <div className="md:col-span-2">
          <LabelSmall>Pay Mode</LabelSmall>
          <Select
            value={filters.payMode || ANY}
            onValueChange={(v) => setFilters((f) => ({ ...f, payMode: v === ANY ? "" : v }))}
          >
            <SelectTrigger className={controlClasses}>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              <SelectItem value="CASH">CASH</SelectItem>
              <SelectItem value="CHEQUE">CHEQUE</SelectItem>
              <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
              {/* <SelectItem value="POS">POS</SelectItem> */}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-4">
          <LabelSmall>Date Range</LabelSmall>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`w-full justify-start text-left font-normal ${controlClasses}`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {basicRange?.from ? (
                  basicRange.to ? (
                    <>
                      {format(basicRange.from, "LLL dd, y")} - {format(basicRange.to, "LLL dd, y")}
                    </>
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
                  setBasicRange(range || undefined);
                  setFilters((f) => ({
                    ...f,
                    fromDate: range?.from ? toYmd(range.from) : "",
                    toDate: range?.to ? toYmd(range.to) : range?.from ? toYmd(range.from) : "",
                  }));
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {!dateRangeValid && (
            <p className="text-xs text-red-600 mt-1">Select a range of 10 days or less.</p>
          )}
        </div>
      </div>

      <DataTable<PaymentRecord>
        title="Subscription Approvals"
        subtitle="Review and process pending subscription payments"
        icon={<CheckSquare className="h-5 w-5" />}
        headerVariant="gradient"
        showCount
        totalCount={totalCount}
        data={mappedRows}
        columns={columns}
        loading={isLoading}
        manualPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={(pi) => setPageIndex(pi)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPageIndex(0);
        }}
      />
      {isError && <div className="text-sm text-red-600">Failed to load approvals</div>}

      {/* DETAILS MODAL */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription Payment Details</DialogTitle>
            <DialogDescription>Review transaction details before approval</DialogDescription>
          </DialogHeader>
          {!detailsRow ? (
            <div className="text-sm text-gray-600">No data</div>
          ) : (
            <div className="space-y-2 text-sm border rounded-md p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <DetailItem label="Transaction ID" value={detailsRow.transId} />
                <DetailItem label="Status" value={getStatusBadge(detailsRow.status)} />

                <div className="col-span-2 border-t my-1"></div>

                <DetailItem label="SAP BP ID" value={detailsRow.sapBpId} />
                <DetailItem label="SAP CA ID" value={detailsRow.sapCaId} />

                <DetailItem label="Amount" value={`${detailsRow.currency} ${Number(detailsRow.totalAmount || detailsRow.payAmount).toLocaleString()}`} />
                <DetailItem label="Pay Mode" value={detailsRow.payMode} />

                <div className="col-span-2 border-t my-1"></div>

                <DetailItem label="Division" value={detailsRow.division} />
                <DetailItem label="Collection Center" value={detailsRow.collectionCenter} />
                <DetailItem label="Collected By" value={detailsRow.collectedBy} />
                <DetailItem label="Created By" value={detailsRow.createId} />

                {String(detailsRow.payMode || "").toUpperCase() === "CASH" && (
                  <DetailItem label="Receipt No" value={detailsRow.receiptNo} className="col-span-2" />
                )}

                {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                  <>
                    <DetailItem label="Bank Name" value={detailsRow.bankName} />
                    <DetailItem label="Branch" value={detailsRow.branchName} />
                    <DetailItem label="Cheque No" value={detailsRow.chequeNo} />
                    <DetailItem label="Cheque Date" value={detailsRow.chequeDate} />
                  </>
                )}

                {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
                  <>
                    <DetailItem label="Bank Deposit ID" value={detailsRow.chequeNo} />
                    <DetailItem label="Bank Name" value={detailsRow.bankName} />
                    <DetailItem label="Branch" value={detailsRow.branchName} />
                    <DetailItem label="Bank Deposit Date" value={detailsRow.chequeDate} />
                  </>
                )}

                <div className="col-span-2 mt-2">
                  <DetailItem label="Description" value={detailsRow.description || "No description"} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
            {detailsRow && (
              <>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const rec = mappedRows.find(r => r.transactionId === detailsRow.transId);
                    if (rec) {
                      setRecToReject(rec);
                      setRejectReason("");
                      setRejectRemark("");
                      setRejectDialogOpen(true);
                    }
                  }}
                >
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    const rec = mappedRows.find(r => r.transactionId === detailsRow.transId);
                    if (rec) {
                      setRecToApprove(rec);
                      setApproveReason("");
                      setApproveRemark("");
                      setApproveDialogOpen(true);
                    }
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE MODAL */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Payment</DialogTitle></DialogHeader>
          <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-800 mb-2">
            You are approving <strong>{recToApprove?.transactionId}</strong> for <strong>{recToApprove?.currency} {recToApprove?.amount.toLocaleString()}</strong>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={approveReason} onValueChange={setApproveReason} disabled={dropdownsLoading}>
                <SelectTrigger id="approval-reason">
                  <SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} />
                </SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && approvalReasons.length === 0 && (
                    <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>
                  )}
                  {approvalReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-remark">Comments (Optional)</Label>
              <Textarea 
                id="approval-remark" 
                rows={3} 
                placeholder="Enter approval comments..." 
                value={approveRemark} 
                onChange={(e) => setApproveRemark(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={approveMutation.isPending}>Cancel</Button>
            </DialogClose>
            <Button 
              onClick={() => { 
                if (recToApprove) { 
                  approveMutation.mutate({ 
                    rec: recToApprove, 
                    reason: approveReason, 
                    remark: approveRemark.trim() 
                  }); 
                } 
              }} 
              disabled={approveMutation.isPending || !approveReason}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT MODAL */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800 mb-2">
            You are rejecting <strong>{recToReject?.transactionId}</strong> for <strong>{recToReject?.currency} {recToReject?.amount.toLocaleString()}</strong>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={rejectReason} onValueChange={setRejectReason} disabled={dropdownsLoading}>
                <SelectTrigger id="rejection-reason">
                  <SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} />
                </SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && rejectReasons.length === 0 && (
                    <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>
                  )}
                  {rejectReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-remark">Comments (Required)</Label>
              <Textarea 
                id="rejection-remark" 
                rows={3} 
                placeholder="Enter rejection reason" 
                value={rejectRemark} 
                onChange={(e) => setRejectRemark(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={rejectMutation.isPending}>Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => { 
                if (recToReject && rejectReason && rejectRemark.trim()) { 
                  rejectMutation.mutate({ 
                    rec: recToReject, 
                    reason: rejectReason, 
                    remark: rejectRemark.trim() 
                  }); 
                } 
              }} 
              disabled={rejectMutation.isPending || !rejectReason || !rejectRemark.trim()}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabelSmall({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-700">{children}</label>;
}
// src/components/payments/PaymentApprovalQueue.tsx

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle,
  Loader2,
  X,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  Info,
} from "lucide-react";
import { Label } from "../ui/label";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";

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

type ApprovalFilters = {
  transId: string;
  sapBpId: string;
  payMode: string;
  collectionCenter: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey =
  | "transId"
  | "sapBpId"
  | "payMode"
  | "collectionCenter"
  | "dateRange";
type FilterOp = "equals" | "contains" | "startsWith" | "endsWith" | "between";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  op: FilterOp;
  value?: string;
  value2?: string;
  dateRange?: DateRange;
};
type DropdownOption = { name: string; value: string };

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

export default function PaymentApprovalQueue() {
  const queryClient = useQueryClient();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const today = new Date();
  const initialTo = toYmd(today);
  const initialFrom = toYmd(new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000));
  const [useAdvanced, setUseAdvanced] = useState(false);

  const [filters, setFilters] = useState<ApprovalFilters>({
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
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const dateRangeValid = useMemo(() => {
    const from = new Date(filters.fromDate);
    const to = new Date(filters.toDate);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays <= 10 && diffDays >= 0;
  }, [filters.fromDate, filters.toDate]);

  const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();

  const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
  const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const defOp: FilterOp = field === "dateRange" ? "between" : field === "payMode" ? "equals" : "contains";
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      op: defOp,
      value: "",
      dateRange:
        field === "dateRange"
          ? { from: new Date(filters.fromDate), to: new Date(filters.toDate) }
          : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };
  
  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  const computeFiltersFromAdvanced = (): ApprovalFilters => {
    const next: ApprovalFilters = {
      transId: "",
      sapBpId: "",
      payMode: "",
      collectionCenter: "",
      fromDate: initialFrom,
      toDate: initialTo,
    };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "transId": next.transId = f.value?.toString().trim() ?? ""; break;
        case "sapBpId": next.sapBpId = f.value?.toString().trim() ?? ""; break;
        case "payMode": next.payMode = f.value?.toString().trim() ?? ""; break;
        case "collectionCenter": next.collectionCenter = f.value?.toString().trim() ?? ""; break;
        case "dateRange":
          if (f.dateRange?.from) {
            next.fromDate = toYmd(f.dateRange.from);
            next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    return next;
  };

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
    setAdvFilters([]);
    setUseAdvanced(false);
    setPageIndex(0);
  };

  const handleSearch = () => {
    if (useAdvanced) {
      const next = computeFiltersFromAdvanced();
      const from = new Date(next.fromDate);
      const to = new Date(next.toDate);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays > 10 || diffDays < 0) {
        toast({
          title: "Invalid date range",
          description: "Please select a range of 10 days or less.",
          variant: "destructive",
        });
        return;
      }
      setFilters(next);
      setPageIndex(0);
      return;
    }

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-approvals", "HARDWARE", filters, pageIndex, pageSize],
    queryFn: () => apiRequest('/agent-payments/search', 'POST', {
      transId: filters.transId || null,
      sapBpId: filters.sapBpId || null,
      payType: "HARDWARE",
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

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [recToApprove, setRecToApprove] = useState<PaymentRecord | null>(null);
  const [approveReason, setApproveReason] = useState("");
  const [approveRemark, setApproveRemark] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [recToReject, setRecToReject] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");

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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);

  const approveMutation = useMutation({
    mutationFn: (vars: { rec: PaymentRecord; reason: string; remark: string }) => {
      setApprovingId(vars.rec.id);
      return apiRequest("/agent-payments/approve", "POST", {
        sapBpId: vars.rec.sapBpId,
        transId: vars.rec.transactionId,
        description: vars.remark || vars.reason,
        status: "APPROVED",
        reason: vars.reason,
      });
    },
    onSuccess: (res, { rec }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-approvals"] });
      toast({
        title: "Approved",
        description: (res as any)?.data?.message || `Payment ${rec.transactionId} approved.`,
      });
      setApproveDialogOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e?.statusMessage || "Approval failed",
        variant: "destructive",
      }),
    onSettled: () => setApprovingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { rec: PaymentRecord; reason: string; remark: string }) => {
      setRejectingId(vars.rec.id);
      return apiRequest("/agent-payments/approve", "POST", {
        sapBpId: vars.rec.sapBpId,
        transId: vars.rec.transactionId,
        description: vars.remark,
        status: "REJECTED",
        reason: vars.reason,
      });
    },
    onSuccess: (res, { rec }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-approvals"] });
      toast({
        title: "Rejected",
        description: (res as any)?.data?.message || `Payment ${rec.transactionId} rejected.`,
      });
      setRejectDialogOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Error",
        description: e?.statusMessage || "Rejection failed",
        variant: "destructive",
      }),
    onSettled: () => setRejectingId(null),
  });

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
            onClick={() => { setRecToApprove(r); setApproveReason(""); setApproveRemark(""); setApproveDialogOpen(true); }}
            disabled={approvingId === r.id || rejectingId === r.id}
          >
            {approvingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => { setRecToReject(r); setRejectReason(""); setRejectRemark(""); setRejectDialogOpen(true); }}
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

      {/* Basic filters */}
      {!useAdvanced && (
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
          {/* Collection Center */}
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
      )}

      {/* Advanced filters */}
      {useAdvanced && (
        <AdvancedFilters
          advFilters={advFilters}
          setAdvFilters={setAdvFilters}
          filters={filters}
          addAdvFilter={addAdvFilter}
          removeAdvFilter={removeAdvFilter}
        />
      )}

      <DataTable<PaymentRecord>
        title="Hardware Approvals"
        subtitle="Review and process pending hardware payments"
        icon={<CheckCircle className="h-5 w-5" />}
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
            <DialogTitle>Hardware Payment Details</DialogTitle>
          </DialogHeader>
          {!detailsRow ? (
            <div className="text-sm text-gray-600">No data</div>
          ) : (
            <div className="space-y-2 text-sm border rounded-md p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><div className="text-xs text-gray-500 uppercase">Transaction ID</div><div className="font-medium">{detailsRow.transId || "-"}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Status</div><div className="font-medium">{getStatusBadge(detailsRow.status)}</div></div>

                <div className="col-span-2 border-t my-1"></div>

                <div><div className="text-xs text-gray-500 uppercase">SAP BP ID</div><div className="font-medium">{detailsRow.sapBpId || "-"}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">SAP CA ID</div><div className="font-medium">{detailsRow.sapCaId || "-"}</div></div>

                <div><div className="text-xs text-gray-500 uppercase">Amount</div><div className="font-medium">{detailsRow.currency} {Number(detailsRow.totalAmount || detailsRow.payAmount).toLocaleString()}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Pay Mode</div><div className="font-medium">{detailsRow.payMode || "-"}</div></div>

                <div className="col-span-2 border-t my-1"></div>

                <div><div className="text-xs text-gray-500 uppercase">Division</div><div className="font-medium">{detailsRow.division || "-"}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Collection Center</div><div className="font-medium">{detailsRow.collectionCenter || "-"}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Collected By</div><div className="font-medium">{detailsRow.collectedBy || "-"}</div></div>
                <div><div className="text-xs text-gray-500 uppercase">Created By</div><div className="font-medium">{detailsRow.createId || "-"}</div></div>

                {String(detailsRow.payMode || "").toUpperCase() === "CASH" && (
                  <div className="col-span-2"><div className="text-xs text-gray-500 uppercase">Receipt No</div><div className="font-medium">{detailsRow.receiptNo || "-"}</div></div>
                )}

                {/* CHEQUE Details */}
                {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                  <>
                    <div><div className="text-xs text-gray-500 uppercase">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Branch</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Cheque No</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Cheque Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                  </>
                )}

                {/* BANK_DEPOSIT Details */}
                {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
                  <>
                    <div><div className="text-xs text-gray-500 uppercase">Bank Deposit ID</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Branch</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                    <div><div className="text-xs text-gray-500 uppercase">Bank Deposit Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                  </>
                )}

                <div className="col-span-2 mt-2"><div className="text-xs text-gray-500 uppercase">Description</div><div className="text-xs bg-white p-2 rounded border">{detailsRow.description || "No description"}</div></div>
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
                  {!dropdownsLoading && approvalReasons.length === 0 && <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>}
                  {approvalReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-remark">Comments (Optional)</Label>
              <Textarea id="approval-remark" rows={3} placeholder="Enter approval comments..." value={approveRemark} onChange={(e) => setApproveRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={approveMutation.isPending}>Cancel</Button></DialogClose>
            <Button onClick={() => { if (recToApprove) { approveMutation.mutate({ rec: recToApprove, reason: approveReason, remark: approveRemark.trim() }); } }} disabled={approveMutation.isPending || !approveReason}>
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
                  {!dropdownsLoading && rejectReasons.length === 0 && <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>}
                  {rejectReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-remark">Comments (Required)</Label>
              <Textarea id="rejection-remark" rows={3} placeholder="Enter rejection reason" value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={rejectMutation.isPending}>Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => { if (recToReject && rejectReason && rejectRemark.trim()) { rejectMutation.mutate({ rec: recToReject, reason: rejectReason, remark: rejectRemark.trim() }); } }} disabled={rejectMutation.isPending || !rejectReason || !rejectRemark.trim()}>
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

function AdvancedFilters({
  advFilters,
  setAdvFilters,
  filters,
  addAdvFilter,
  removeAdvFilter,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  filters: ApprovalFilters;
  addAdvFilter: (field: FilterFieldKey) => void;
  removeAdvFilter: (id: string) => void;
}) {
  const FILTER_FIELD_OPTIONS: {
    value: FilterFieldKey;
    label: string;
    type: "text" | "select" | "daterange";
  }[] = [
      { value: "transId", label: "Trans ID", type: "text" },
      { value: "sapBpId", label: "SAP BP ID", type: "text" },
      { value: "payMode", label: "Pay Mode", type: "select" },
      { value: "collectionCenter", label: "Collection Center", type: "text" },
      { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

  return (
    <div className="space-y-3">
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
        {advFilters.length === 0 && (
          <div className="text-xs text-muted-foreground">No filters added yet.</div>
        )}

        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          const ops =
            fieldMeta.type === "text"
              ? ["contains", "equals", "startsWith", "endsWith"]
              : fieldMeta.type === "select"
                ? ["equals"]
                : ["between"];

          return (
            <div key={af.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border rounded-md p-2">
              <div className="md:col-span-3">
                <LabelSmall>Field</LabelSmall>
                <Select
                  value={af.field}
                  onValueChange={(v: FilterFieldKey) =>
                    setAdvFilters((prev) =>
                      prev.map((x) =>
                        x.id === af.id
                          ? {
                            ...x,
                            field: v,
                            op: v === "dateRange" ? "between" : v === "payMode" ? "equals" : "contains",
                            value: "",
                            value2: "",
                            dateRange:
                              v === "dateRange"
                                ? { from: new Date(filters.fromDate), to: new Date(filters.toDate) }
                                : undefined,
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

              <div className="md:col-span-2">
                <LabelSmall>Operator</LabelSmall>
                <Select
                  value={af.op}
                  onValueChange={(v: FilterOp) =>
                    setAdvFilters((prev) => prev.map((x) => (x.id === af.id ? { ...x, op: v } : x)))
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ops.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fieldMeta.type === "text" && (
                <div className="md:col-span-6">
                  <LabelSmall>Value</LabelSmall>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Enter value"
                    value={af.value ?? ""}
                    onChange={(e) =>
                      setAdvFilters((prev) =>
                        prev.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                  />
                </div>
              )}

              {fieldMeta.type === "select" && af.field === "payMode" && (
                <div className="md:col-span-6">
                  <LabelSmall>Value</LabelSmall>
                  <Select
                    value={af.value ?? ""}
                    onValueChange={(v) =>
                      setAdvFilters((prev) => prev.map((x) => (x.id === af.id ? { ...x, value: v } : x)))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select pay mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                      <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
                      {/* <SelectItem value="POS">POS</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fieldMeta.type === "daterange" && (
                <div className="md:col-span-6">
                  <LabelSmall>Value</LabelSmall>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (
                          af.dateRange.to ? (
                            <>
                              {format(af.dateRange.from, "LLL dd, y")} - {format(af.dateRange.to, "LLL dd, y")}
                            </>
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
                          setAdvFilters((prev) =>
                            prev.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x))
                          )
                        }
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="md:col-span-1 flex items-end justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeAdvFilter(af.id)}
                  title="Remove filter"
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
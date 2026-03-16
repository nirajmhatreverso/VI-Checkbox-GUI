// src/pages/customer-payment-subscription/CustomerSubPaymentApprovalQueue.tsx

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerPaymentApi, customerSubPaymentApi, onboardingApi } from "@/lib/api-client";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, X, Search, Clock, Info, SlidersHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest } from "@/lib/queryClient";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";

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
};

type ApprovalFilters = {
  transId: string;
  sapBpId: string;
  payMode: string;
  payType: string;
  collectionCenter: string;
  fromDate: string;
  toDate: string;
};
type FilterFieldKey = "transId" | "sapBpId" | "payType" | "payMode" | "collectionCenter" | "dateRange";
type FilterOp = "equals" | "contains" | "between";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  op: FilterOp;
  value?: string;
  dateRange?: DateRange;
};
type DropdownOption = { name: string; value: string };

export default function CustomerSubPaymentApprovalQueue() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const controlClasses = "h-7 text-xs";

  // Access Logic - Check all user types
  const isAdmin = (user?.allAccess || "N") === "Y";
  const isWarehouseUser = (user?.isMainPlant || "N") === "Y";
  const isOtcUser = (user?.isOtc || "N") === "Y";
  
  // Admin and Warehouse can search all agents, others are restricted to their own BP ID
  const canSearchAllAgents = isAdmin || isWarehouseUser;
  
  // Determine which BP ID to enforce for restricted users (OTC, Agent, Sub-Agent)
  const restrictedBpId = user?.sapBpId || user?.parentSapBpId;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<any | null>(null);

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();
  const [filters, setFilters] = useState<ApprovalFilters>({
    transId: "",
    sapBpId: "",
    payMode: "",
    payType: "SUBSCRIPTION",
    collectionCenter: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  // 1. QUERY KEY DEFINITION - Include user access in key
  const queryKey = ["customer-sub-payments-approval", filters, pageIndex, pageSize, canSearchAllAgents, restrictedBpId];

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: queryKey,
    enabled: !!user,
    queryFn: () =>
      apiRequest('/customer-sub-payments/search', 'POST', {
        transId: filters.transId || null,
        // CORE LOGIC: If admin/warehouse, use filter input; otherwise force restricted ID
        sapBpId: canSearchAllAgents ? (filters.sapBpId || null) : restrictedBpId,
        payMode: filters.payMode || null,
        payType: "SUBSCRIPTION",
        collectionCenter: filters.collectionCenter || null,
        fromDate: filters.fromDate,
        isSpecificTransaction: "N",
        toDate: filters.toDate,
        status: "INPROCESS",
        offSet: pageIndex * pageSize,
        limit: pageSize,
        type: "CUSTOMER",
        module: "CUSTOMER",
      }),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();

  const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
  const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

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
      raw: p,
    })) || [];
  }, [data]);

  const totalCount = data?.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const [approvingId, setApprovingId] = useState<number | string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PaymentDetail | null>(null);
  const [approveRemark, setApproveRemark] = useState("");
  const [approveReason, setApproveReason] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PaymentDetail | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (approveDialogOpen && approvalReasons.length === 1) {
      setApproveReason(approvalReasons[0].value);
    }
  }, [approveDialogOpen, approvalReasons]);

  useEffect(() => {
    if (rejectDialogOpen && rejectReasons.length === 1) {
      setRejectReason(rejectReasons[0].value);
    }
  }, [rejectDialogOpen, rejectReasons]);

  // 2. FIXED OPTIMISTIC UPDATE
  const removeRowOptimistically = (transId: string) => {
    // Use the exact same queryKey logic as the useQuery hook
    queryClient.setQueryData(
      queryKey, 
      (old: any) => {
        if (!old?.data?.agentHwPaymentDetails) return old;
        
        const filtered = old.data.agentHwPaymentDetails.filter((r: any) => r.transId !== transId);
        
        return { 
          ...old, 
          data: { 
            ...old.data, 
            agentHwPaymentDetails: filtered, 
            // Decrease count locally so pagination doesn't look weird immediately
            totalCount: Math.max(0, (old.data.totalCount ?? 1) - 1) 
          } 
        };
      }
    );
  };

  const approveMutation = useMutation({
    mutationFn: async ({ payment, remark, reason }: { payment: PaymentDetail, remark: string, reason: string }) => {
      setApprovingId(payment.id);
      return apiRequest('/customer-sub-payments/customer-approve', 'POST', {
        sapBpId: payment.sapBpId,
        transId: payment.transId,
        status: "APPROVED",
        description: remark,
        reason: reason
      });
    },
    onSuccess: (res, { payment }) => {
      removeRowOptimistically(payment.transId);
      // Force refresh in background to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["customer-sub-payments-approval"] });
      toast({ title: "Approved", description: res?.data?.message || "Payment approved successfully" });
      setApproveDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.statusMessage || "Approval failed", variant: "destructive" }),
    onSettled: () => setApprovingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ payment, remark, reason }: { payment: PaymentDetail; remark: string, reason: string }) => {
      setRejectingId(payment.id);
      return apiRequest('/customer-sub-payments/customer-approve', 'POST', {
        sapBpId: payment.sapBpId,
        transId: payment.transId,
        status: "REJECTED",
        description: remark,
        reason: reason
      });
    },
    onSuccess: (res, { payment }) => {
      removeRowOptimistically(payment.transId);
      // Force refresh in background to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["customer-sub-payments-approval"] });
      toast({ title: "Rejected", description: res?.data?.message || "Payment rejected successfully" });
      setRejectDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e?.statusMessage || "Rejection failed", variant: "destructive" }),
    onSettled: () => setRejectingId(null),
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED": case "SUCCESS":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "INPROCESS":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />In Process</Badge>;
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
      label: "Details",
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setDetailsRow(r.raw); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_v, r) => (
        <div className="flex gap-2">
          <Button size="xs" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setApproveTarget(r); setApproveReason(""); setApproveRemark(""); setApproveDialogOpen(true); }} disabled={approvingId === r.id || rejectingId === r.id}>
            {approvingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button size="xs" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { setRejectTarget(r); setRejectReason(""); setRejectRemark(""); setRejectDialogOpen(true); }} disabled={approvingId === r.id || rejectingId === r.id}>
            {rejectingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
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
    setFilters({ transId: "", sapBpId: "", payMode: "", payType: "SUBSCRIPTION", collectionCenter: "", fromDate: initialFrom, toDate: initialTo });
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
          <div className="md:col-span-2"><LabelSmall>Trans ID</LabelSmall><Input value={filters.transId} onChange={(e) => setFilters(f => ({ ...f, transId: e.target.value }))} className={controlClasses} /></div>
          
          {/* ONLY SHOW SAP BP ID FOR ADMIN AND WAREHOUSE USERS */}
          {canSearchAllAgents && (
            <div className="md:col-span-2"><LabelSmall>SAP BP ID</LabelSmall><Input value={filters.sapBpId} onChange={(e) => setFilters(f => ({ ...f, sapBpId: e.target.value }))} className={controlClasses} /></div>
          )}
          
          <div className="md:col-span-2"><LabelSmall>Pay Mode</LabelSmall>
            <Select value={filters.payMode || ANY} onValueChange={(v) => setFilters(f => ({ ...f, payMode: v === ANY ? "" : v }))}>
              <SelectTrigger className={controlClasses}><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                <SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><LabelSmall>Collection Center</LabelSmall><Input value={filters.collectionCenter} onChange={(e) => setFilters(f => ({ ...f, collectionCenter: e.target.value }))} className={controlClasses} /></div>
          <div className={`${canSearchAllAgents ? 'md:col-span-4' : 'md:col-span-6'}`}>
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
        <AdvancedFiltersComponent 
          advFilters={advFilters} 
          setAdvFilters={setAdvFilters} 
          setFilters={setFilters} 
          initialFrom={initialFrom} 
          initialTo={initialTo}
          canSearchAllAgents={canSearchAllAgents}
        />
      )}

      <DataTable<PaymentDetail>
        title="Pending Approvals"
        subtitle="Approve or reject customer subscription payments"
        icon={<CheckCircle className="h-5 w-5" />}
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
      {isError && <p className="text-xs text-red-600">Failed to load approvals.</p>}

      {/* PAYMENT DETAILS DIALOG - UPDATED */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
          {!detailsRow ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-gray-500">Transaction ID</div><div className="font-medium">{detailsRow.transId || "-"}</div></div>
              <div><div className="text-gray-500">Status</div><div className="font-medium">{detailsRow.status || "-"}</div></div>
              <div><div className="text-gray-500">SAP BP ID</div><div className="font-medium">{detailsRow.sapBpId || "-"}</div></div>
              <div><div className="text-gray-500">SAP CA ID</div><div className="font-medium">{detailsRow.sapCaId || "-"}</div></div>
              <div><div className="text-gray-500">Pay Mode</div><div className="font-medium">{detailsRow.payMode || "-"}</div></div>
              <div><div className="text-gray-500">Trans Type</div><div className="font-medium">{detailsRow.transType || "-"}</div></div>
              <div><div className="text-gray-500">Sales Org</div><div className="font-medium">{detailsRow.salesOrg || "-"}</div></div>
              <div><div className="text-gray-500">Division</div><div className="font-medium">{detailsRow.division || "-"}</div></div>
              <div><div className="text-gray-500">Collected By</div><div className="font-medium">{detailsRow.collectedBy || "-"}</div></div>
              <div><div className="text-gray-500">Create ID</div><div className="font-medium">{detailsRow.createId || "-"}</div></div>
              
              {/* CASH MODE */}
              {String(detailsRow.payMode || "").toUpperCase() === "CASH" && (
                <div><div className="text-gray-500">Receipt No</div><div className="font-medium">{detailsRow.receiptNo || "-"}</div></div>
              )}
              
              {/* CHEQUE MODE */}
              {String(detailsRow.payMode || "").toUpperCase() === "CHEQUE" && (
                <>
                  <div><div className="text-gray-500">Cheque No</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
                  <div><div className="text-gray-500">Cheque Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
                  <div><div className="text-gray-500">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
                  <div><div className="text-gray-500">Branch Name</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
                  <div><div className="text-gray-500">Approved By</div><div className="font-medium">{detailsRow.approvedBy || "-"}</div></div>
                </>
              )}
              
              {/* BANK_DEPOSIT MODE - UPDATED: Added Deposit Date */}
              {String(detailsRow.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
  <>
    <div><div className="text-gray-500">Bank Deposit ID</div><div className="font-medium">{detailsRow.chequeNo || "-"}</div></div>
    <div><div className="text-gray-500">Bank Deposit Date</div><div className="font-medium">{detailsRow.chequeDate || "-"}</div></div>
    <div><div className="text-gray-500">Bank Name</div><div className="font-medium">{detailsRow.bankName || "-"}</div></div>
    <div><div className="text-gray-500">Branch Name</div><div className="font-medium">{detailsRow.branchName || "-"}</div></div>
  </>
)}

              <div className="col-span-2 border-t pt-2 mt-2">
                <div className="text-gray-500">Description</div>
                <div className="font-medium">{detailsRow.description || "-"}</div>
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{approveTarget?.name} • {approveTarget?.transId}</p>
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
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { if (approveTarget) { approveMutation.mutate({ payment: approveTarget, reason: approveReason, remark: approveRemark.trim() }); } }} disabled={approveMutation.isPending || !approveReason}>
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{rejectTarget?.name} • {rejectTarget?.transId}</p>
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
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (rejectTarget && rejectReason && rejectRemark.trim()) { rejectMutation.mutate({ payment: rejectTarget, reason: rejectReason, remark: rejectRemark.trim() }); } }} disabled={rejectMutation.isPending || !rejectReason || !rejectRemark.trim()}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-medium text-gray-700">{children}</label>;

function AdvancedFiltersComponent({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo, canSearchAllAgents }: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<ApprovalFilters>>;
  initialFrom: string;
  initialTo: string;
  canSearchAllAgents: boolean;
}) {
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "select" | "daterange"; }[] = [
    { value: "transId", label: "Trans ID", type: "text" },
    // Only show SAP BP ID option if Admin or Warehouse user
    ...(canSearchAllAgents ? [{ value: "sapBpId", label: "SAP BP ID", type: "text" }] as const : []),
    { value: "payType", label: "Pay Type", type: "text" },
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
    setAdvFilters(prev => [...prev, newFilter]);
  };
  const removeAdvFilter = (id: string) => setAdvFilters(prev => prev.filter(f => f.id !== id));

  useEffect(() => {
    const nextFilters: ApprovalFilters = { transId: "", sapBpId: "", payMode: "", payType: "SUBSCRIPTION", collectionCenter: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f: AdvancedFilter) => {
      switch (f.field) {
        case "transId": nextFilters.transId = f.value || ""; break;
        case "sapBpId": nextFilters.sapBpId = f.value || ""; break;
        case "payMode": nextFilters.payMode = f.value || ""; break;
        case "payType": nextFilters.payType = f.value || ""; break;
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
        {advFilters.map(af => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find(f => f.value === af.field)!;
          const ops = fieldMeta.type === 'text' ? ["contains", "equals"] : ["equals"];
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3"><Select value={af.field} onValueChange={(v: FilterFieldKey) => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, field: v, value: "", op: 'contains' } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{FILTER_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2"><Select value={af.op} onValueChange={(v: FilterOp) => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, op: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{ops.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-6">
                {fieldMeta.type === 'text' && <Input className="h-7 text-xs" value={af.value} onChange={e => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, value: e.target.value } : x))} />}
                {fieldMeta.type === 'select' && af.field === 'payMode' && <Select value={af.value} onValueChange={v => setAdvFilters(p => p.map(x => x.id === af.id ? { ...x, value: v } : x))}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select pay mode" /></SelectTrigger><SelectContent><SelectItem value="CASH">CASH</SelectItem><SelectItem value="CHEQUE">CHEQUE</SelectItem><SelectItem value="BANK_DEPOSIT">BANK_DEPOSIT</SelectItem></SelectContent></Select>}
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
                        onSelect={(range) => setAdvFilters(p => p.map(x => (x.id === af.id ? { ...x, dateRange: range } : x)))}
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
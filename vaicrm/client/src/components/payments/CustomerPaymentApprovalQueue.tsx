// src/components/payments/CustomerPaymentApprovalQueue.tsx

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Pencil, Info, SlidersHorizontal, X, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
};
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type HwOrderDetail = any;

type ApprovalRow = {
  transactionId: string;
  sapBpId: string;
  customerName: string;
  status: string;
  createDt: string;
  totalAmount: number;
  currency: string;
  payMode: string;
  raw: HwOrderDetail;
  details?: string;
  actions?: string;
};

function mapApiDataToRows(details: HwOrderDetail[]): ApprovalRow[] {
  if (!details || !Array.isArray(details)) {
    return [];
  }
  return details.map(item => ({
    transactionId: item.transId || "N/A",
    sapBpId: item.sapBpId || "",
    customerName: item.name || "N/A",
    status: (item.status || "").toUpperCase(),
    createDt: item.createDt || "",
    currency: item.currency || "",
    payMode: item.payMode || "",
    totalAmount: Number(item.totalAmount ?? item.payAmount ?? 0),
    raw: item,
  }));
}

type ApprovalFilters = {
  requestId: string;
  sapBpId: string;
  payMode: string;
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

const DetailItem = ({ label, value, className }: { label: string; value: any; className?: string }) => (
  <div className={className}>
    <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{label}</div>
    <div className="font-medium text-sm truncate text-gray-900" title={String(value || "")}>
      {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
    </div>
  </div>
);

// Helper to get the date label based on payment mode
const getDateLabel = (payMode: string) => {
  const mode = (payMode || "").toUpperCase();
  if (mode === "BANK_DEPOSIT") return "Bank Deposit Date";
  if (mode === "CHEQUE") return "Cheque Date";
  return "Date";
};

export default function CustomerPaymentApprovalQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rowToAct, setRowToAct] = useState<ApprovalRow | null>(null);
  const [remark, setRemark] = useState("");
  const [reason, setReason] = useState("");

  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<ApprovalFilters>({
    requestId: "",
    sapBpId: "",
    payMode: "ALL",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const debouncedFilters = useDebounce(filters, 500);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer-hw-approval-details", debouncedFilters],
    staleTime: 15_000,
    queryFn: () =>
      apiRequest('/customer-payments/search', 'POST', {
        transId: debouncedFilters.requestId || null,
        requestId: debouncedFilters.requestId || null,
        sapBpId: debouncedFilters.sapBpId || null,
        payMode: debouncedFilters.payMode === "ALL" ? null : debouncedFilters.payMode,
        module: "CUSTOMER",
        payType: "HARDWARE",
        isSpecificTransaction: "N",
        fromDate: debouncedFilters.fromDate || null,
        toDate: debouncedFilters.toDate || null,
        status: "INPROCESS",
        offSet: pageIndex * pageSize,
        limit: pageSize,
        type: "CUSTOMER",
      }),
  });

  const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();

  const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
  const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

  const rows: ApprovalRow[] = useMemo(() => mapApiDataToRows(data?.data?.agentHwPaymentDetails || []), [data]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedData = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters]);

  const approveMutation = useMutation({
    mutationFn: (vars: { row: ApprovalRow; remark: string; reason: string }) =>
      apiRequest('/customer-payments/approve', 'POST', {
        transId: vars.row.transactionId,
        sapBpId: vars.row.sapBpId,
        status: "APPROVED",
        remark: vars.remark,
        reason: vars.reason,
      }),
    onSuccess: (res: any) => {
      toast({ title: "Success", description: res?.statusMessage || "Request approved" });
      setApproveOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer-hw-approval-details"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.statusMessage || "Approval failed", variant: "destructive" }),
  });


  const rejectMutation = useMutation({
    mutationFn: (vars: { row: ApprovalRow; remark: string; reason: string }) =>
      apiRequest('/customer-payments/approve', 'POST', {
        transId: vars.row.transactionId,
        sapBpId: vars.row.sapBpId,
        status: "REJECTED",
        remark: vars.remark,
        reason: vars.reason,
      }),
    onSuccess: (res: any) => {
      toast({ title: "Success", description: res?.statusMessage || "Request rejected" });
      setRejectOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer-hw-approval-details"] });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err?.statusMessage || "Rejection failed", variant: "destructive" }),
  });

  const columns: DataTableColumn<ApprovalRow>[] = [
    { key: "transactionId", label: "Request ID", sortable: true },
    { key: "customerName", label: "Customer Name", sortable: true },
    { key: "sapBpId", label: "Customer BP", sortable: true },
    { key: "payMode", label: "Pay Mode", sortable: true },
    { key: "totalAmount", label: "Total", sortable: true, render: (_v, r) => `${r.currency} ${r.totalAmount.toLocaleString()}` },
    { key: "createDt", label: "Date", sortable: true, render: (v) => fmtDate(v) },
    { key: "status", label: "Status", sortable: true },
    {
      key: "details", label: "Details",
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setRowToAct(r); setDetailsOpen(true); }} >
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
    {
      key: "actions", label: "Actions",
      render: (_v, r) => (
        <div className="flex items-center gap-2">
          <Button size="xs" className="bg-green-600 hover:bg-green-700" onClick={() => { setRowToAct(r); setRemark(""); setReason(""); setApproveOpen(true); }} >
            <Pencil className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="xs" variant="destructive" onClick={() => { setRowToAct(r); setRemark(""); setReason(""); setRejectOpen(true); }} >
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
    const resetFilters: ApprovalFilters = {
      requestId: "",
      sapBpId: "",
      payMode: "ALL",
      fromDate: initialFrom,
      toDate: initialTo,
    };
    setFilters(resetFilters);
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-azam-blue" />
          Approval Queue
        </CardTitle>
        <CardDescription>Review and approve customer payment requests (In-Process only)</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border p-2 rounded-md">
            <div>
              <LabelSmall>Request ID</LabelSmall>
              <Input
                value={filters.requestId}
                onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
                placeholder="HS..."
                className="h-7 text-xs"
              />
            </div>
            <div>
              <LabelSmall>SAP BP ID</LabelSmall>
              <Input
                value={filters.sapBpId}
                onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))}
                placeholder="100..."
                className="h-7 text-xs"
              />
            </div>
            <div>
              <LabelSmall>Payment Mode</LabelSmall>
              <Select 
                value={filters.payMode} 
                onValueChange={(val) => setFilters((f) => ({ ...f, payMode: val }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Modes</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
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

        {isError && <div className="text-xs text-red-600">Failed to load approvals. Please try again.</div>}
      </CardContent>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Transaction: {rowToAct?.transactionId} • BP: {rowToAct?.sapBpId}
            </DialogDescription>
          </DialogHeader>

          {rowToAct?.raw && (
            <div className="space-y-4 border p-4 rounded-lg bg-white shadow-sm text-sm">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Transaction ID" value={rowToAct.raw.transId} />
                <DetailItem label="Pay ID" value={rowToAct.raw.payId} />
                <DetailItem label="Status" value={rowToAct.raw.status} />
                <DetailItem label="Created Date" value={rowToAct.raw.createDt} />
                <DetailItem label="Created TS" value={rowToAct.raw.createTs} />
                <DetailItem label="Created By" value={rowToAct.raw.createId} />
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Customer Name" value={rowToAct.raw.name} />
                <DetailItem label="SAP BP ID" value={rowToAct.raw.sapBpId} />
                <DetailItem label="SAP CA ID" value={rowToAct.raw.sapCaId} />
                <DetailItem label="Module" value={rowToAct.raw.module} />
                <DetailItem label="Module ID" value={rowToAct.raw.moduleId} />
              </div>

              <Separator />

              {/* Payment Amounts & Types */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Pay Amount" value={`${rowToAct.raw.currency || ''} ${rowToAct.raw.payAmount}`} />
                <DetailItem label="VAT Amount" value={rowToAct.raw.vatAmount} />
                <DetailItem label="Total Amount" value={`${rowToAct.raw.currency || ''} ${rowToAct.raw.totalAmount}`} />
                <DetailItem label="Pay Type" value={rowToAct.raw.payType} />
                <DetailItem label="Pay Mode" value={rowToAct.raw.payMode} />
                <DetailItem label="Trans Type" value={rowToAct.raw.transType} />
              </div>

              <Separator />

              {/* Payment Instrument Details - Updated with dynamic date label */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <DetailItem label="Receipt No" value={rowToAct.raw.receiptNo} />
  
  {/* Show Cheque No only for CHEQUE mode */}
  {String(rowToAct.raw.payMode || "").toUpperCase() === "CHEQUE" && (
    <DetailItem label="Cheque No" value={rowToAct.raw.chequeNo} />
  )}
  
  {/* Show Bank Deposit ID for BANK_DEPOSIT mode (comes from chequeNo field) */}
  {String(rowToAct.raw.payMode || "").toUpperCase() === "BANK_DEPOSIT" && (
    <DetailItem label="Bank Deposit ID" value={rowToAct.raw.chequeNo} />
  )}
  
  {/* Show dynamic date label based on payment mode */}
  {(String(rowToAct.raw.payMode || "").toUpperCase() === "CHEQUE" || 
    String(rowToAct.raw.payMode || "").toUpperCase() === "BANK_DEPOSIT") && (
    <DetailItem label={getDateLabel(rowToAct.raw.payMode)} value={rowToAct.raw.chequeDate} />
  )}
  
  {/* Show Bank Name and Branch for CHEQUE and BANK_DEPOSIT modes */}
  {(String(rowToAct.raw.payMode || "").toUpperCase() === "CHEQUE" || 
    String(rowToAct.raw.payMode || "").toUpperCase() === "BANK_DEPOSIT") && (
    <>
      <DetailItem label="Bank Name" value={rowToAct.raw.bankName} />
      <DetailItem label="Branch Name" value={rowToAct.raw.branchName} />
    </>
  )}
  
  <DetailItem label="Online PG ID" value={rowToAct.raw.onlPgId} />
  <DetailItem label="Online Trans ID" value={rowToAct.raw.onlTransId} />
</div>

              <Separator />

              {/* Org & Location */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Sales Org" value={rowToAct.raw.salesOrg} />
                <DetailItem label="Division" value={rowToAct.raw.division} />
                <DetailItem label="Collected By" value={rowToAct.raw.collectedBy} />
                <DetailItem label="Collection Center" value={rowToAct.raw.collectionCenter} />
                <DetailItem label="Coll. Center Code" value={rowToAct.raw.collectionCenterCode} />
              </div>

              <Separator />

              {/* Status & Updates */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Approved By" value={rowToAct.raw.approvedBy} />
                <DetailItem label="Rejected By" value={rowToAct.raw.rejectedBy} />
                <DetailItem label="Reason" value={rowToAct.raw.reason} />
                <DetailItem label="CM Status" value={rowToAct.raw.cmStatus} />
                <DetailItem label="CM Status Code" value={rowToAct.raw.cmStatusCode} />
                <DetailItem label="CM Error Reason" value={rowToAct.raw.cmErrorReason} />
                <DetailItem label="Updated By" value={rowToAct.raw.updateId} />
                <DetailItem label="Updated TS" value={rowToAct.raw.updateTs} />
              </div>

              <Separator />

              {/* Description */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider mb-1">Description</div>
                <div className="p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap break-words">
                  {rowToAct.raw.description || "No description provided"}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ... Other Dialogs for Approve/Reject ... */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{rowToAct?.customerName} • {rowToAct?.transactionId}</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                <SelectTrigger id="approval-reason"><SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} /></SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && approvalReasons.length === 0 && <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>}
                  {approvalReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-remark">Comments (Optional)</Label>
              <Textarea id="approval-remark" rows={3} placeholder="Enter approval comments..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={approveMutation.isPending}>Cancel</Button></DialogClose>
            <Button onClick={() => { if (rowToAct) { approveMutation.mutate({ row: rowToAct, reason: reason, remark: remark.trim() }); } }} disabled={approveMutation.isPending || !reason}>
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{rowToAct?.customerName} • {rowToAct?.transactionId}</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                <SelectTrigger id="rejection-reason"><SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} /></SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && rejectReasons.length === 0 && <div className="p-2 text-center text-sm text-gray-500">No reasons available</div>}
                  {rejectReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-remark">Comments (Required)</Label>
              <Textarea id="rejection-remark" rows={3} placeholder="Enter rejection reason" value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={rejectMutation.isPending}>Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => { if (rowToAct && reason && remark.trim()) { rejectMutation.mutate({ row: rowToAct, reason: reason, remark: remark.trim() }); } }} disabled={rejectMutation.isPending || !reason || !remark.trim()}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
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

function AdvancedFiltersComponent({
  advFilters,
  setAdvFilters,
  setFilters,
  initialFrom,
  initialTo,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<ApprovalFilters>>;
  initialFrom: string;
  initialTo: string;
}) {
  const FILTER_FIELD_OPTIONS: {
    value: FilterFieldKey;
    label: string;
    type: "text" | "daterange";
  }[] = [
      { value: "requestId", label: "Request ID", type: "text" },
      { value: "sapBpId", label: "SAP BP ID", type: "text" },
      { value: "dateRange", label: "Date Range", type: "daterange" },
    ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange:
        field === "dateRange"
          ? { from: new Date(initialFrom), to: new Date(initialTo) }
          : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    const nextFilters: ApprovalFilters = {
      requestId: "",
      sapBpId: "",
      payMode: "ALL",
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
              {FILTER_FIELD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => addAdvFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && (
          <div className="text-xs text-muted-foreground">No advanced filters added.</div>
        )}

        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Input value={fieldMeta.label} readOnly className="h-7 text-xs bg-gray-50" />
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
                    placeholder="Enter value..."
                  />
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
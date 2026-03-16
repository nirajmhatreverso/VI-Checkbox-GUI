// src/pages/customer-hardware-sale/CustomerHwPaymentApproval.tsx

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { agentHwSaleApi, customerHwSaleApi, onboardingApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Pencil, Info, SlidersHorizontal, X, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDebounce } from "@/hooks/use-debounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { useAuthContext } from "@/context/AuthProvider";

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
  requestId: string;
  sapBpId: string;
  plantName?: string | null;
  status: string;
  createDt: string;
  totalAmount: number;
  currency: string;
  raw: HwOrderDetail[];
  details?: string;
  actions?: string;
};

function aggregate(details: HwOrderDetail[]): ApprovalRow[] {
  const map = new Map<string, HwOrderDetail[]>();
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
      plantName: first?.plantName || null,
      status: (first?.status || "").toUpperCase(),
      createDt: first?.createDt || "",
      currency: first?.currency || "",
      totalAmount: arr.reduce((sum, a) => sum + (Number(a.itemAmount) || 0), 0),
      raw: arr,
    });
  });
  rows.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
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

export default function CustomerHwSaleApprovalQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // --- User Role Detection ---
  const isAdminUser = user?.allAccess === "Y";
  const isMainPlantUser = user?.isMainPlant === "Y";
  const loggedInUserBpId = user?.sapBpId || user?.parentSapBpId || "";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
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
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: new Date(initialFrom), to: new Date(initialTo) });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  const debouncedFilters = useDebounce(filters, 500);

  // --- Query with proper sapBpId handling ---
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["hw-approval-details-customer", debouncedFilters, loggedInUserBpId, isAdminUser],
    staleTime: 15_000,
    enabled: !!user && (isAdminUser || !!loggedInUserBpId),
    queryFn: () => {
      // For Admin: use filter value or null
      // For Non-Admin (Main Plant / Agent): always use their logged-in sapBpId
      const sapBpIdToSend = isAdminUser
        ? (debouncedFilters.sapBpId || null)
        : loggedInUserBpId;

      const payload = {
        requestId: debouncedFilters.requestId || null,
        sapBpId: sapBpIdToSend,
        module: "CUSTOMER",
        fromDate: debouncedFilters.fromDate || null,
        toDate: debouncedFilters.toDate || null,
        status: "INPROCESS",
      };



      return apiRequest('/hardware-sales/details', 'POST', payload);
    },
  });

  const { data: dropdownsData, isLoading: dropdownsLoading } = useOnboardingDropdowns();

  const approvalReasons: DropdownOption[] = dropdownsData?.approvalReason || [];
  const rejectReasons: DropdownOption[] = dropdownsData?.rejectReason || [];

  const rows = useMemo(() => aggregate(data?.data?.hwOrderDetails || []), [data]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedData = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const approveOrRejectMutation = useMutation({
    mutationFn: (vars: { row: ApprovalRow; remark: string; reason: string; status: 'APPROVED' | 'REJECTED' }) =>
      apiRequest('/hardware-sales/customer/approve', 'POST', {
        requestId: vars.row.requestId,
        sapBpId: vars.row.sapBpId,
        status: vars.status,
        remark: vars.remark,
        reason: vars.reason,
      }),
    onSuccess: (res: any, vars) => {
      toast({ title: "Success", description: res?.data?.message || `Request ${vars.status.toLowerCase()}` });
      if (vars.status === 'APPROVED') setApproveOpen(false);
      else setRejectOpen(false);
      refetch();
    },
    onError: (err: any, vars) =>
      toast({ title: "Error", description: err?.statusMessage || `${vars.status === 'APPROVED' ? 'Approval' : 'Rejection'} failed`, variant: "destructive" }),
  });

  const { mutate: approveMutation, isPending: isApproving } = approveOrRejectMutation;
  const { mutate: rejectMutation, isPending: isRejecting } = approveOrRejectMutation;

  const columns: DataTableColumn<ApprovalRow>[] = [
    { key: "requestId", label: "Request ID", sortable: true },
    { key: "sapBpId", label: "Customer BP", sortable: true },
    { key: "totalAmount", label: "Total", sortable: true, render: (_v, r) => `${r.currency} ${r.totalAmount.toLocaleString()}` },
    { key: "createDt", label: "Date", sortable: true, render: (v) => fmtDate(v) },
    { key: "status", label: "Status", sortable: true },
    {
      key: "details",
      label: "Details",
      render: (_v, r) => (
        <Button size="xs" variant="outline" onClick={() => { setRowToAct(r); setDetailsOpen(true); }}>
          <Info className="h-4 w-4 mr-1" /> View
        </Button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_v, r) => (
        <div className="flex items-center gap-2">
          <Button size="xs" className="bg-green-600 hover:bg-green-700" onClick={() => { setRowToAct(r); setRemark(""); setReason(""); setApproveOpen(true); }}>
            <Pencil className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="xs" variant="destructive" onClick={() => { setRowToAct(r); setRemark(""); setReason(""); setRejectOpen(true); }}>
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
    setFilters({ requestId: "", sapBpId: "", fromDate: initialFrom, toDate: initialTo });
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
        <CardDescription>Approve or reject customer hardware sale requests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
            <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-1" />Advanced
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
            <Button size="sm" onClick={handleSearch}>Search</Button>
          </div>
        </div>

        {!useAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border p-2 rounded-md">
            <div>
              <LabelSmall>Request ID</LabelSmall>
              <Input value={filters.requestId} onChange={(e) => setFilters(f => ({ ...f, requestId: e.target.value }))} placeholder="HS..." className="h-7 text-xs" />
            </div>
            {/* Only Admin can search by SAP BP ID */}
            {isAdminUser ? (
              <div>
                <LabelSmall>SAP BP ID</LabelSmall>
                <Input
                  value={filters.sapBpId}
                  onChange={(e) => setFilters(f => ({ ...f, sapBpId: e.target.value }))}
                  placeholder="100..."
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div>
                <LabelSmall>Your BP ID</LabelSmall>
                <Input
                  value={loggedInUserBpId}
                  readOnly
                  disabled
                  className="h-7 text-xs bg-gray-100 cursor-not-allowed"
                />
              </div>
            )}
            <div className="md:col-span-3">
              <LabelSmall>Date Range</LabelSmall>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a range</span>}
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
                      setFilters(f => ({
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
            isAdminUser={isAdminUser}
          />
        )}

        <DataTable<ApprovalRow>
          title="Pending Approvals"
          icon={<CheckCircle className="h-5 w-5" />}
          headerVariant="gradient"
          showCount
          totalCount={rows.length}
          data={pagedData}
          columns={columns}
          loading={isLoading || isFetching}
          manualPagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
        {isError && <div className="text-xs text-red-600">Failed to load approvals.</div>}
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Request Details</DialogTitle>
            <DialogDescription>{rowToAct?.requestId} • {rowToAct?.sapBpId}</DialogDescription>
          </DialogHeader>
          {rowToAct?.raw?.[0] && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border p-2 rounded">
                <div><div className="text-gray-500">Plant Name</div><div className="font-medium">{rowToAct.raw[0].plantName || "-"}</div></div>
                <div><div className="text-gray-500">Module</div><div className="font-medium">{rowToAct.raw[0].module || "-"}</div></div>
                <div><div className="text-gray-500">Sales Org</div><div className="font-medium">{rowToAct.raw[0].salesOrg || "-"}</div></div>
                <div><div className="text-gray-500">Division</div><div className="font-medium">{rowToAct.raw[0].division || "-"}</div></div>
                <div className="col-span-full"><div className="text-gray-500">Remark</div><div className="font-medium">{rowToAct.raw[0].remark || "-"}</div></div>
              </div>
              <div className="font-semibold mt-2">Items</div>
              <div className="border rounded max-h-60 overflow-auto">
                {rowToAct.raw.map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 p-2 border-b last:border-0 text-xs">
                    <div><div className="text-gray-500">Item</div><div>{item.itemType || item.material}</div></div>
                    <div><div className="text-gray-500">Quantity</div><div>{item.itemQty}</div></div>
                    <div><div className="text-gray-500">Price Type</div><div>{item.priceType}</div></div>
                    <div><div className="text-gray-500">Amount</div><div>{item.currency} {Number(item.itemAmount || 0).toLocaleString()}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                <SelectTrigger id="approval-reason">
                  <SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} />
                </SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && approvalReasons.length === 0 && <div className="text-sm text-center text-gray-500 p-2">No reasons available</div>}
                  {approvalReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-remark">Comments (Optional)</Label>
              <Textarea id="approval-remark" placeholder="Approval comments..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => rowToAct && approveMutation({ row: rowToAct, reason, remark: remark.trim(), status: 'APPROVED' })} disabled={!reason || isApproving}>
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason} disabled={dropdownsLoading}>
                <SelectTrigger id="rejection-reason">
                  <SelectValue placeholder={dropdownsLoading ? "Loading..." : "Select a reason"} />
                </SelectTrigger>
                <SelectContent>
                  {!dropdownsLoading && rejectReasons.length === 0 && <div className="text-sm text-center text-gray-500 p-2">No reasons available</div>}
                  {rejectReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-remark">Comments (Required)</Label>
              <Textarea id="rejection-remark" placeholder="Rejection comments..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => rowToAct && rejectMutation({ row: rowToAct, reason, remark: remark.trim(), status: 'REJECTED' })} disabled={!reason || !remark.trim() || isRejecting}>
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-medium text-gray-700">{children}</label>;

function AdvancedFiltersComponent({
  advFilters,
  setAdvFilters,
  setFilters,
  initialFrom,
  initialTo,
  isAdminUser,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<ApprovalFilters>>;
  initialFrom: string;
  initialTo: string;
  isAdminUser: boolean;
}) {
  // Only show sapBpId filter for Admin users
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    ...(isAdminUser ? [{ value: "sapBpId" as FilterFieldKey, label: "SAP BP ID", type: "text" as const }] : []),
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
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
    const nextFilters: ApprovalFilters = { requestId: "", sapBpId: "", fromDate: initialFrom, toDate: initialTo };
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
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No advanced filters added.</div>}

        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field);
          if (!fieldMeta) return null;

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
                    onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))}
                    placeholder={`Enter ${fieldMeta.label.toLowerCase()}...`}
                  />
                )}

                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (
                          af.dateRange.to ? (
                            `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}`
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
                        onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="col-span-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}>
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
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Users,
  Eye,
  X,
  Check,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import AgentDetailsModal from "@/components/agents/agent-details-modal";
import AgentApproveModal from "@/components/agents/agent-approve-modal"; 
import { useDebounce } from "@/hooks/use-debounce";
// 1. IMPORT useQueryClient
import { useQuery, useQueryClient } from "@tanstack/react-query";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "brand";

type Agent = {
  agentId: number;
  onbId?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  mobile?: string;
  phone?: string;
  fax?: string;
  email?: string;
  type?: string;
  role?: string;
  region?: string;
  agentStage?: string;
  addressOne?: string;
  addressTwo?: string;
  ward?: string;
  country?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  pinCode?: string;
  pincode?: string;
  tinNo?: string;
  vrnNo?: string;
  currency?: string;
  commValue?: string | number;
  commission?: string | number;
  sapBpId?: string;
  sapCaId?: string | null;
  salesOrg?: string;
  division?: string;
  isSubCollection?: string | boolean;
  kycDocNo?: string | null; 
  poaDocNo?: string | null; 
  createDt?: string;
  createId?: string;
  parentId?: string | number;
};

const statusToVariant = (status: string): BadgeVariant => {
  switch ((status || "").toLowerCase()) {
    case "success":
    case "active":
    case "completed":
    case "approved":
      return "success";
    case "pending":
    case "captured":
    case "retry":
    case "release_to_cm":
    case "release_to_kyc":
      return "warning";
    case "inactive":
    case "draft":
      return "muted";
    case "suspended":
    case "rejected":
    case "failed":
      return "danger";
    default:
      return "muted";
  }
};

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString() : "-");
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

type BasicFilters = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  type: string;
  status: string; 
};

type AdvancedFilterField =
  | "firstName"
  | "lastName"
  | "email"
  | "mobile"
  | "type"
  | "dateRange";
type AdvancedFilter = {
  id: string;
  field: AdvancedFilterField;
  value?: string;
  dateRange?: DateRange;
};

export default function KYCVerification() {
  const { toast } = useToast();
  // 2. INITIALIZE QueryClient
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [basic, setBasic] = useState<BasicFilters>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    type: "all",
    status: "RELEASE_TO_KYC",
  });
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const [addField, setAddField] = useState<AdvancedFilterField | "">("");
  const initialFrom = new Date(Date.now() - 30 * 86400000);
  const initialTo = new Date();
  const [basicRange, setBasicRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo });
  const debouncedFirst = useDebounce(basic.firstName, 500);
  const debouncedLast = useDebounce(basic.lastName, 500);
  const debouncedEmail = useDebounce(basic.email, 500);
  const debouncedMobile = useDebounce(basic.mobile, 500);
  const debouncedType = useDebounce(basic.type, 300);
  const debouncedStatus = useDebounce(basic.status, 300);
  const debouncedBasicFilters = useDebounce(basic, 500);
  const debouncedAdvFilters = useDebounce(advFilters, 500);
  const debouncedRange = useDebounce(basicRange, 500);

  const rangeKey = useMemo(() => {
    const from = basicRange?.from ? toYmd(basicRange.from) : "";
    const to = basicRange?.to ? toYmd(basicRange.to) : basicRange?.from ? toYmd(basicRange.from) : "";
    return `${from}|${to}`;
  }, [basicRange?.from, basicRange?.to]);
  const debouncedRangeKey = useDebounce(rangeKey, 500);
  
  const advKey = useMemo(
    () => JSON.stringify(advFilters.map((f) => ({ field: f.field, value: f.value || "", from: f.dateRange?.from ? toYmd(f.dateRange.from) : "", to: f.dateRange?.to ? toYmd(f.dateRange.to) : f.dateRange?.from ? toYmd(f.dateRange.from) : "" }))),
    [advFilters]
  );
  const debouncedAdvKey = useDebounce(advKey, 500);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approveAgent, setApproveAgent] = useState<Agent | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const queryFilters = useMemo(() => {
  let filters: any = {};
  if (useAdvanced) {
    // Always set agentStage to RELEASE_TO_KYC
    filters.agentStage = ["RELEASE_TO_KYC"];
    
    debouncedAdvFilters.forEach((f) => {
      if (f.field === 'dateRange') {
        if (f.dateRange?.from) filters.fromDate = toYmd(f.dateRange.from);
        if (f.dateRange?.to) filters.toDate = toYmd(f.dateRange.to);
      } else if (f.value) {
        filters[f.field] = f.value;
      }
    });
  } else {
    filters = {
      firstName: debouncedBasicFilters.firstName,
      lastName: debouncedBasicFilters.lastName,
      email: debouncedBasicFilters.email,
      mobile: debouncedBasicFilters.mobile,
      type: debouncedBasicFilters.type === 'all' ? '' : debouncedBasicFilters.type,
      agentStage: ["RELEASE_TO_KYC"], // Always RELEASE_TO_KYC
      fromDate: debouncedRange?.from ? toYmd(debouncedRange.from) : '',
      toDate: debouncedRange?.to ? toYmd(debouncedRange.to) : '',
    }
  }
  return { ...filters, offSet: (page - 1) * pageSize, limit: pageSize };
}, [useAdvanced, debouncedAdvFilters, debouncedBasicFilters, debouncedRange, page, pageSize]);

  const { data: queryData, isLoading, refetch } = useQuery({
  queryKey: ['agentsForKyc', queryFilters],
  queryFn: () => apiRequest('/kyc/fetch-agents', 'POST', queryFilters),
  refetchInterval: 30000, // Auto-refetch every 30 seconds
  refetchOnWindowFocus: true, // Refetch when user returns to tab
  staleTime: 5000, // Consider data stale after 5 seconds
  refetchOnMount: true, // Always refetch on component mount
});

  const agents = useMemo(() => queryData?.data?.data || [], [queryData]);
  const total = useMemo(() => queryData?.data?.totalRecordCount || 0, [queryData]);

  // 3. UPDATED SUCCESS HANDLER - Optimistic Update
  const handleApproveSuccess = () => {
    setShowApproveModal(false);
    
    // 1. Optimistic update for KYC list (Existing code)
    queryClient.setQueryData(['agentsForKyc', queryFilters], (oldData: any) => {
       // ... existing logic to remove from KYC list ...
       if (!oldData || !oldData.data || !oldData.data.data) return oldData;
       const removedId = approveAgent?.agentId;
       const newAgentsList = oldData.data.data.filter((a: Agent) => a.agentId !== removedId);
       return {
        ...oldData,
        data: { ...oldData.data, data: newAgentsList, totalRecordCount: Math.max(0, oldData.data.totalRecordCount - 1) }
      };
    });

    setApproveAgent(null);

    // 2. FIX REQ 8: Invalidate the MAIN Agent List query
    // This ensures that when you go back to "agent-onboarding.tsx", the data is fresh.
    queryClient.invalidateQueries({ queryKey: ["agents"] }); // <--- ADD THIS LINE
    
    // 3. Invalidate KYC list background fetch
    queryClient.invalidateQueries({ queryKey: ['agentsForKyc'] });

    if (page > 1 && agents.length === 1) {
         setPage(p => Math.max(1, p - 1));
    }
  };

  const buildRequestBody = () => {
    let firstName = "", lastName = "", email = "", mobile = "", type = "", agentStageArr: string[] | null = null, fromDate = "", toDate = "";

    if (useAdvanced) {
      advFilters.forEach((f) => {
        switch (f.field) {
          case "firstName": firstName = f.value || ""; break;
          case "lastName": lastName = f.value || ""; break;
          case "email": email = f.value || ""; break;
          case "mobile": mobile = f.value || ""; break;
          case "type": type = (f.value || "") === "all" ? "" : f.value || ""; break;
          case "dateRange":
          if (f.dateRange?.from) { fromDate = toYmd(f.dateRange.from); toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from); }
          break;
        }
      });
    } else {
      firstName = debouncedFirst; lastName = debouncedLast; email = debouncedEmail; mobile = debouncedMobile;
      type = debouncedType === "all" ? "" : debouncedType;
      agentStageArr = debouncedStatus === "all" ? null : [debouncedStatus];
      const [fromK, toK] = debouncedRangeKey.split("|");
      fromDate = fromK; toDate = toK;
    }

    const offSet = (page - 1) * pageSize;
    return { firstName, lastName, email, mobile, type, agentStage: agentStageArr, fromDate, toDate, offSet, limit: pageSize };
  };

  const canAct = (stage?: string) => {
    const up = (stage || "").toUpperCase();
    return up === "RELEASE_TO_KYC" || up === "CAPTURED";
  };

  const columns: DataTableColumn<Agent>[] = [
    { key: "onbId", label: "Agent ID", sortable: true, render: (v, a) => <span className="font-mono">{v || a.agentId || "-"}</span> },
    { key: "firstName", label: "Name", sortable: true, render: (_v, a) => { const sal = a.salutation ? a.salutation + " " : ""; const nm = [a.firstName, a.lastName].filter(Boolean).join(" ") || "-"; return sal + nm; } },
    { key: "email", label: "Email", sortable: true },
    { key: "mobile", label: "Mobile", sortable: true },
    { key: "type", label: "Type", sortable: true },
    { key: "region", label: "Region", sortable: true },
    { key: "createDt", label: "Created", sortable: true, render: (v) => fmt(v as string) },
    { key: "createId", label: "Created By", sortable: true },
    { key: "agentStage", label: "Status", sortable: true, render: (_v, a) => <Badge variant={statusToVariant(a.agentStage || "")} size="sm">{a.agentStage || "-"}</Badge> },
    {
      key: "agentId",
      label: "Actions",
      render: (_v, a) => (
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => { setSelectedAgent(a); setShowDetails(true); }}>
            <Eye className="h-4 w-4 mr-1" /> Details
          </Button>
          {canAct(a.agentStage) && (
            <Button
              size="xs"
              variant="secondary"
              className="default text-white"
              onClick={() => {
                setApproveAgent(a);
                setShowApproveModal(true);
              }}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Action
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statusOptions = [    
    { value: "RELEASE_TO_KYC", name: "Release to KYC" },   
  ];

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!isLoading && agents.length === 0 && page > 1) {
      setPage((prev) => prev - 1);
    }
  }, [agents.length, isLoading, page]);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">KYC Verification</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 hidden sm:block">Review agent records and approve or reject their KYC documents</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-azam-blue" />Registered Agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
              <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button>
            </div>
          </div>

   {!useAdvanced && (
  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 border p-2 rounded-md">
    <div>
      <label className="text-xs font-medium text-gray-700">First Name</label>
      <Input 
        uiSize="sm" 
        value={basic.firstName} 
        maxLength={50}
        onChange={(e) => { 
          setPage(1); 
          setBasic((s) => ({ ...s, firstName: e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50) })); 
        }} 
      />
    </div>
    <div>
      <label className="text-xs font-medium text-gray-700">Last Name</label>
      <Input 
        uiSize="sm" 
        value={basic.lastName} 
        maxLength={50}
        onChange={(e) => { 
          setPage(1); 
          setBasic((s) => ({ ...s, lastName: e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50) })); 
        }} 
      />
    </div>
    <div>
      <label className="text-xs font-medium text-gray-700">Email</label>
      <Input 
        uiSize="sm" 
        value={basic.email} 
        onChange={(e) => { 
          setPage(1); 
          setBasic((s) => ({ ...s, email: e.target.value.replace(/[^A-Za-z0-9@._-]/g, "") })); 
        }} 
      />
    </div>
    <div>
      <label className="text-xs font-medium text-gray-700">Mobile</label>
      <Input 
        uiSize="sm" 
        value={basic.mobile} 
        maxLength={14}
        onChange={(e) => { 
          setPage(1); 
          setBasic((s) => ({ ...s, mobile: e.target.value.replace(/[^0-9]/g, "").slice(0, 14) })); 
        }} 
      />
    </div>
    <div>
      <label className="text-xs font-medium text-gray-700">Type</label>
      <Select value={basic.type} onValueChange={(v) => { setPage(1); setBasic((s) => ({ ...s, type: v })); }}>
        <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="AGENT">Agent</SelectItem>
          <SelectItem value="SUB_AGENT">Sub-Agent</SelectItem>
          <SelectItem value="EMPLOYEE">Employee</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div>
      <label className="text-xs font-medium text-gray-700">Status</label>
      <Input 
        uiSize="sm" 
        value="Release to KYC" 
        disabled 
        className="bg-gray-100 cursor-not-allowed"
      />
    </div>
  </div>
)}

          {useAdvanced && (
            <AdvancedFilters advFilters={advFilters} setAdvFilters={setAdvFilters} setPage={setPage} addField={addField} setAddField={setAddField} />
          )}

          <div className="overflow-x-auto">
            <DataTable<Agent>
              title="KYC Review"
              subtitle="Search and review agents to approve or reject KYC"
              icon={<Users className="h-5 w-5" />}
              headerVariant="gradient"
              showCount
              totalCount={total}
              data={agents}
              columns={columns}
              loading={isLoading}
              manualPagination
              pageIndex={page - 1}
              pageSize={pageSize}
              pageCount={pageCount}
              onPageChange={(idx) => setPage(idx + 1)}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      <AgentDetailsModal agent={selectedAgent as any} isOpen={showDetails} onClose={() => setShowDetails(false)} />

      <AgentApproveModal
        agent={approveAgent}
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onSuccess={handleApproveSuccess} 
      />
    </div>
  );
}

function AdvancedFilters({
  advFilters,
  setAdvFilters,
  setPage,
  addField,
  setAddField,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setPage: (p: number) => void;
  addField: AdvancedFilterField | "";
  setAddField: (v: AdvancedFilterField | "") => void;
}) {
  // Remove agentStage from options since status is fixed to RELEASE_TO_KYC
  const FIELD_OPTIONS: { value: AdvancedFilterField; label: string; type: "text" | "select" | "daterange"; inputType?: string; maxLength?: number }[] = [
    { value: "firstName", label: "First Name", type: "text", inputType: "alpha", maxLength: 50 },
    { value: "lastName", label: "Last Name", type: "text", inputType: "alpha", maxLength: 50 },
    { value: "email", label: "Email", type: "text", inputType: "email" },
    { value: "mobile", label: "Mobile", type: "text", inputType: "numeric", maxLength: 14 },
    { value: "type", label: "Type", type: "select" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  // Sanitization helpers with maxLength support
  const sanitizeInput = (value: string, inputType?: string, maxLength?: number): string => {
    let sanitized: string;
    switch (inputType) {
      case "alpha":
        sanitized = value.replace(/[^A-Za-z\s]/g, "");
        break;
      case "numeric":
        sanitized = value.replace(/[^0-9]/g, "");
        break;
      case "email":
        sanitized = value.replace(/[^A-Za-z0-9@._-]/g, "");
        break;
      default:
        sanitized = value.replace(/[^A-Za-z0-9]/g, "");
    }
    return maxLength ? sanitized.slice(0, maxLength) : sanitized;
  };

  const handleSelectField = (val: AdvancedFilterField) => {
    if (advFilters.some((f) => f.field === val)) {
      setAddField(""); 
      return;
    }

    const f: AdvancedFilter = {
      id: `${val}-${Date.now()}`,
      field: val,
      value: "",
      dateRange: val === "dateRange" ? { from: new Date(Date.now() - 30 * 86400000), to: new Date() } : undefined,
    };
    setAdvFilters((p) => [...p, f]);
    setAddField("");
    setPage(1);
  };

  const removeFilter = (id: string) => {
    setAdvFilters((p) => p.filter((x) => x.id !== id));
    setPage(1);
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select value={addField || ""} onValueChange={handleSelectField}>
            <SelectTrigger uiSize="sm" className="h-7 text-xs w-56">
              <SelectValue placeholder="Add Filter..." />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((opt) => {
                const isSelected = advFilters.some((f) => f.field === opt.value);
                return (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={isSelected} 
                    className={isSelected ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {opt.label} {isSelected && "(Added)"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No advanced filters added.</div>}

          {advFilters.map((af) => {
            const meta = FIELD_OPTIONS.find((o) => o.value === af.field)!;
            return (
              <div key={af.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded">
                <div className="col-span-3">
                  <Select
                    value={af.field}
                    onValueChange={(v: AdvancedFilterField) => {
                      const isTaken = advFilters.some((f) => f.field === v && f.id !== af.id);
                      if (isTaken) return;

                      setAdvFilters((p) =>
                        p.map((x) =>
                          x.id === af.id
                            ? {
                                ...x,
                                field: v,
                                value: "",
                                dateRange: v === "dateRange" ? { from: new Date(Date.now() - 30 * 86400000), to: new Date() } : undefined,
                              }
                            : x
                        )
                      );
                    }}
                  >
                    <SelectTrigger uiSize="sm" className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((opt) => {
                         const isTaken = advFilters.some((f) => f.field === opt.value && f.id !== af.id);
                         return (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={isTaken}
                          >
                            {opt.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-8">
                  {meta.type === "text" && (
                    <Input
                      uiSize="sm"
                      value={af.value || ""}
                      maxLength={meta.maxLength}
                      onChange={(e) => {
                        const sanitizedValue = sanitizeInput(e.target.value, meta.inputType, meta.maxLength);
                        setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: sanitizedValue } : x)));
                        setPage(1);
                      }}
                      placeholder={`Enter ${meta.label.toLowerCase()}...`}
                    />
                  )}

                  {meta.type === "select" && af.field === "type" && (
                    <Select
                      value={af.value || "all"}
                      onValueChange={(v) => {
                        setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: v } : x)));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger uiSize="sm" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="AGENT">Agent</SelectItem>
                        <SelectItem value="SUB_AGENT">Sub-Agent</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {meta.type === "daterange" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {af.dateRange?.from
                            ? af.dateRange.to
                              ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}`
                              : format(af.dateRange.from, "LLL dd, y")
                            : "Pick a range"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={af.dateRange?.from}
                          selected={af.dateRange}
                          onSelect={(range) =>
                            setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))
                          }
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div className="col-span-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFilter(af.id)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
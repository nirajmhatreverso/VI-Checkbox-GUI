// src/components/agents/agents-data-grid.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Edit2, RefreshCw, ShieldCheck, Info, Users, KeyRound, PlusCircle } from "lucide-react";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { agentApi } from "@/lib/agentApi";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

export interface Agent {
  agentId: number;
  onbId?: string;
  firstName?: string;
  lastName?: string;
  salutation?: string;
  email?: string;
  mobile?: string;
  type?: string;
  region?: string;
  agentStage?: string;
  status?: string;
  statusMsg?: string;
  remark?: string;
  reason?: string;
  createDt?: string;
  tinName?: string;
  userName?: string;
  sapBpId?: string;
  parentSapBpId?: string;
  [key: string]: any;
}

function stageToBadgeVariant(stage?: string): "success" | "warning" | "danger" | "muted" | "info" {
  switch ((stage || "").toUpperCase()) {
    case "SUCCESS":
    case "ACTIVE":
    case "COMPLETED":
    case "APPROVED":
      return "success";
    case "PENDING":
    case "INPROCESS":
    case "CAPTURED":
    case "RETRY":
    case "RELEASE_TO_CM":
      return "warning";
    case "SUSPENDED":
    case "REJECTED":
    case "FAILED":
      return "danger";
    case "INACTIVE":
    default:
      return "muted";
  }
}

const statusInfo: Record<string, { title: string; desc: string }> = {
  REJECTED: { title: "Rejected", desc: "This agent was rejected during onboarding." },
  CAPTURED: { title: "Captured", desc: "Agent data captured, pending approval." },
  RETRY: { title: "Retry", desc: "Retry onboarding due to previous failure." },
  FAILED: { title: "Failed", desc: "Onboarding failed due to an error." },
  RELEASE_TO_CM: { title: "Release to CM", desc: "Released to Contract Management." },
  COMPLETED: { title: "Completed", desc: "Onboarding completed successfully." },
  APPROVED: { title: "Approved", desc: "Agent has been approved." },
  PENDING: { title: "Pending", desc: "Onboarding is pending." },
};

const titleCase = (s: string) =>
  s.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "")).join(" ").trim();

const cleanNameLike = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ").replace(/\d+/g, " ").replace(/\s+/g, " ").trim();

const getAgentName = (a: Partial<Agent> & Record<string, any>) => {
  const sal = a.salutation || "";
  const fn = a.firstName || "";
  const ln = a.lastName || "";
  const composed = `${sal ? sal + " " : ""}${[fn, ln].filter(Boolean).join(" ")}`.trim();
  if (composed) return composed;
  const email = a.email || "";
  if (email.includes("@")) {
    const local = email.split("@")[0] || "";
    const derived = titleCase(cleanNameLike(local));
    if (derived) return derived;
  }
  return "-";
};

const getAgentEmail = (a: Partial<Agent> & Record<string, any>) => a.email ?? "-";
const getAgentMobile = (a: Partial<Agent> & Record<string, any>) => a.mobile ?? "-";

// Helper to check if agent has any status info to show
const hasStatusInfo = (a: Agent) => {
  return !!(a.remark || a.reason);
};

interface AgentsDataGridProps {
  agents: Agent[];
  isLoading: boolean;
  total: number;
  page: number; // 1-based
  pageSize: number;
  onPageChange: (page: number) => void; // 1-based
  onPageSizeChange: (size: number) => void;
  onEdit?: (agent: Agent) => void;
  onView?: (agent: Agent) => void;
  onApproveReject?: (agent: Agent) => void;
  onResetPassword?: (agent: Agent) => void;
}

export default function AgentsDataGrid({
  agents,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onView,
  onApproveReject,
  onResetPassword,
}: AgentsDataGridProps) {
  const { user } = useAuthContext();
  const isAdmin = user?.allAccess === "Y";
  const { toast } = useToast();
  const [retryLoadingId, setRetryLoadingId] = useState<number | null>(null);

  const handleRetry = async (agentId: number) => {
    if (retryLoadingId === agentId) return;

    setRetryLoadingId(agentId);

    try {
      await agentApi.retryAgent(agentId);
      toast({
        title: "Retry initiated",
        description: `Retry process started for agent #${agentId}`
      });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error?.statusMessage || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setRetryLoadingId(null);
    }
  };

  const handleAddToTask = (agent: Agent) => {
    try {
      const savedTasks = localStorage.getItem("dashboard_my_tasks");
      let tasks = [];
      if (savedTasks) {
        tasks = JSON.parse(savedTasks);
      }

      const agentName = getAgentName(agent);
      const taskText = `Review Agent: ${agentName} (${agent.onbId || agent.agentId})`;

      const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        dueDate: new Date().toISOString(),
        meta: {
          email: getAgentEmail(agent),
          mobile: getAgentMobile(agent),
          region: agent.region,
          status: agent.agentStage,
          sapBpId: agent.sapBpId
        }
      };

      tasks.unshift(newTask);
      localStorage.setItem("dashboard_my_tasks", JSON.stringify(tasks));

      // Dispatch event to update MyTasks component
      window.dispatchEvent(new Event("dashboard_my_tasks_updated"));

      toast({
        title: "Task Added",
        description: `Agent ${agentName} added to your tasks.`
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task.",
        variant: "destructive"
      });
    }
  };

  const columns: DataTableColumn<Agent>[] = [
  { 
    key: "onbId", 
    label: "Agent ID", 
    sortable: true, 
    render: (v) => <span className="font-mono">{v || "-"}</span> 
  },
  { 
    key: "sapBpId", 
    label: "BP ID", 
    sortable: true, 
    render: (v, a) => (
      <span className="font-mono">
        {a.type === "Sub-Agent" || a.type === "Employee" ? (a.parentSapBpId || "-") : (v || "-")}
      </span>
    ) 
  },
  { 
    key: "userName", 
    label: "User Name", 
    sortable: true, 
    render: (value, agent) => (
      <span className="font-mono text-sm">{String(agent.userName ?? "-")}</span>
    )
  },
  { 
    key: "firstName", 
    label: "Name", 
    sortable: true, 
    render: (_v, a) => getAgentName(a) 
  },
  { 
    key: "email", 
    label: "Email", 
    sortable: true, 
    render: (_v, a) => getAgentEmail(a) 
  },
  { 
    key: "mobile", 
    label: "Mobile", 
    sortable: true, 
    render: (_v, a) => getAgentMobile(a) 
  },
  { key: "type", label: "Type", sortable: true },
  { key: "region", label: "Region", sortable: true },
  { 
    key: "createDt", 
    label: "Created", 
    sortable: true, 
    render: (v) => (v ? new Date(v).toLocaleDateString() : "-") 
  },
    {
      key: "agentStage",
      label: "Status",
      sortable: true,
      render: (_v, a) => {
        const stage = (a.agentStage || "").toUpperCase();
        const info = statusInfo[stage];
        const showInfoButton = hasStatusInfo(a);
        const isRejected = stage === "REJECTED";
        const isFailed = stage === "FAILED";
        const isSuccess = ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(stage);

        return (
          <div className="inline-flex items-center gap-1">
            <Badge variant={stageToBadgeVariant(a.agentStage)} size="sm">
              {a.agentStage || "-"}
            </Badge>

            {showInfoButton && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="h-5 w-5 p-0 hover:bg-gray-100"
                  >
                    <Info className={`h-3.5 w-3.5 ${isRejected || isFailed
                      ? "text-red-500"
                      : isSuccess
                        ? "text-green-500"
                        : "text-gray-500 hover:text-gray-700"
                      }`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-3">
                    {/* Status Header */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Badge variant={stageToBadgeVariant(a.agentStage)} size="sm">
                        {a.agentStage || "-"}
                      </Badge>
                      {info && (
                        <span className="text-xs text-gray-500">{info.title}</span>
                      )}
                    </div>

                    {/* Reason (Approval/Rejection reason given by user) */}
                    {a.reason && (
                      <div>
                        <span className="text-xs font-medium text-gray-700">
                          {isRejected ? "Rejection Reason:" : "Approval Reason:"}
                        </span>
                        <p className={`mt-1 text-xs break-words p-2 rounded ${isRejected
                          ? "text-red-600 bg-red-50"
                          : "text-green-600 bg-green-50"
                          }`}>
                          {a.reason}
                        </p>
                      </div>
                    )}

                    {/* Remark (Additional remarks) */}
                    {a.remark && (
                      <div>
                        <span className="text-xs font-medium text-gray-700">
                          Remark:
                        </span>
                        <p className={`mt-1 text-xs break-words p-2 rounded ${isRejected || isFailed
                          ? "text-red-600 bg-red-50"
                          : "text-gray-600 bg-gray-50"
                          }`}>
                          {a.remark}
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      }
    },
    {
      key: "agentId",
      label: "Actions",
      sortable: false,
      render: (_v, a) => {
        const stage = (a.agentStage || "").toUpperCase();
        const isPostApproval = ["RELEASE_TO_CM", "COMPLETED", "APPROVED"].includes(stage);
        const canResetPassword = ["COMPLETED", "RELEASE_TO_CM"].includes(stage);

        return (
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="iconSm" onClick={() => onView?.(a)} title="View Details">
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>

            {(!isPostApproval || isAdmin) && (
              <Button variant="ghost" size="iconSm" onClick={() => onEdit?.(a)} title="Edit Agent">
                {isPostApproval ? <Edit className="h-4 w-4 text-green-600" /> : <Edit2 className="h-4 w-4 text-orange-600" />}
              </Button>
            )}

            {isAdmin && canResetPassword && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => onResetPassword?.(a)}
                title="Send/Reset Password"
              >
                <KeyRound className="h-4 w-4 text-purple-600" />
              </Button>
            )}

            {stage === "CAPTURED" && (
              <Button variant="ghost" size="iconSm" onClick={() => onApproveReject?.(a)} title="Approve/Reject">
                <ShieldCheck className="h-4 w-4 text-yellow-600" />
              </Button>
            )}

            {stage === "RETRY" && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => handleRetry(a.agentId)}
                title="Retry"
                disabled={retryLoadingId === a.agentId}
              >
                <RefreshCw className={`h-4 w-4 text-yellow-600 ${retryLoadingId === a.agentId ? "animate-spin" : ""}`} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => handleAddToTask(a)}
              title="Add to My Tasks"
            >
              <PlusCircle className="h-4 w-4 text-azam-blue" />
            </Button>
          </div>
        )
      },
    },
  ];

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {agents.map((a) => {
          const stage = (a.agentStage || "").toUpperCase();
          const isPostApproval = ["RELEASE_TO_CM", "COMPLETED", "APPROVED"].includes(stage);
          const canResetPassword = ["COMPLETED", "RELEASE_TO_CM"].includes(stage);
          const showInfoButton = hasStatusInfo(a);
          const isRejected = stage === "REJECTED";
          const isFailed = stage === "FAILED";
          const isSuccess = ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(stage);

          return (
            <div key={a.agentId} className="rounded-md border p-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{getAgentName(a)}</div>
                  <div className="text-xs text-gray-500 font-mono">{a.onbId || "-"}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={stageToBadgeVariant(a.agentStage)} size="sm">
                    {a.agentStage || "-"}
                  </Badge>
                  {showInfoButton && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          className="h-5 w-5 p-0"
                        >
                          <Info className={`h-3.5 w-3.5 ${isRejected || isFailed
                            ? "text-red-500"
                            : isSuccess
                              ? "text-green-500"
                              : "text-gray-500"
                            }`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3" align="end">
                        <div className="space-y-3">
                          {/* Status Header */}
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Badge variant={stageToBadgeVariant(a.agentStage)} size="sm">
                              {a.agentStage || "-"}
                            </Badge>
                          </div>

                          {/* Reason */}
                          {a.reason && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                {isRejected ? "Rejection Reason:" : "Approval Reason:"}
                              </span>
                              <p className={`mt-1 text-xs break-words p-2 rounded ${isRejected
                                ? "text-red-600 bg-red-50"
                                : "text-green-600 bg-green-50"
                                }`}>
                                {a.reason}
                              </p>
                            </div>
                          )}

                          {/* Remark */}
                          {a.remark && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Remark:
                              </span>
                              <p className={`mt-1 text-xs break-words p-2 rounded ${isRejected || isFailed
                                ? "text-red-600 bg-red-50"
                                : "text-gray-600 bg-gray-50"
                                }`}>
                                {a.remark}
                              </p>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-gray-500">Email</div><div className="truncate">{getAgentEmail(a)}</div>
                <div className="text-gray-500">Mobile</div><div>{getAgentMobile(a)}</div>
                <div className="text-gray-500">Region</div><div>{a.region || "-"}</div>
                <div className="text-gray-500">Created</div><div>{a.createDt ? new Date(a.createDt).toLocaleDateString() : "-"}</div>
              </div>

              {/* Show reason prominently */}
              {a.reason && (
                <div className="mt-3 pt-2 border-t border-dashed">
                  <div className={`text-xs font-semibold ${isRejected ? "text-red-700" : "text-green-700"}`}>
                    {isRejected ? "Rejection Reason:" : "Approval Reason:"}
                  </div>
                  <p className={`text-xs p-2 rounded mt-1 break-words ${isRejected ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"
                    }`}>
                    {a.reason}
                  </p>
                </div>
              )}

              {/* Show remark prominently */}
              {a.remark && (
                <div className={`mt-3 pt-2 ${!a.reason ? "border-t border-dashed" : ""}`}>
                  <div className={`text-xs font-semibold ${isRejected || isFailed ? "text-red-700" : "text-gray-700"}`}>
                    Remark:
                  </div>
                  <p className={`text-xs p-2 rounded mt-1 break-words ${isRejected || isFailed ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50"
                    }`}>
                    {a.remark}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-1">
                <Button variant="ghost" size="iconSm" onClick={() => onView?.(a)}>
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>

                {(!isPostApproval || isAdmin) && (
                  <Button variant="ghost" size="iconSm" onClick={() => onEdit?.(a)}>
                    {isPostApproval ? <Edit className="h-4 w-4 text-green-600" /> : <Edit2 className="h-4 w-4 text-orange-600" />}
                  </Button>
                )}

                {isAdmin && canResetPassword && (
                  <Button variant="ghost" size="iconSm" onClick={() => onResetPassword?.(a)}>
                    <KeyRound className="h-4 w-4 text-purple-600" />
                  </Button>
                )}

                {stage === "CAPTURED" && (
                  <Button variant="ghost" size="iconSm" onClick={() => onApproveReject?.(a)}>
                    <ShieldCheck className="h-4 w-4 text-yellow-600" />
                  </Button>
                )}

                {stage === "RETRY" && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleRetry(a.agentId)}
                    title="Retry"
                    disabled={retryLoadingId === a.agentId}
                  >
                    <RefreshCw className={`h-4 w-4 text-yellow-600 ${retryLoadingId === a.agentId ? "animate-spin" : ""}`} />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => handleAddToTask(a)}
                  title="Add to My Tasks"
                >
                  <PlusCircle className="h-4 w-4 text-azam-blue" />
                </Button>
              </div>
            </div>
          )
        })}
        {agents.length === 0 && !isLoading && <div className="text-center text-sm text-gray-500 py-8">No agents found.</div>}
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Page {page} of {pageCount}</div>
            <Pagination className="py-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-gray-600">Rows:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger uiSize="sm" className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Desktop/tablet: DataTable */}
      <div className="hidden md:block">
        <DataTable<Agent>
          title="Registered Agents"
          subtitle="Manage onboarded agents, approvals, and retries"
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
          onPageChange={(idx) => onPageChange(idx + 1)}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
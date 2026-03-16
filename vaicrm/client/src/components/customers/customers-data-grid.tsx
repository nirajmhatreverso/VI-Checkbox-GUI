// src/components/customers/customers-data-grid.tsx

import {
  DataTable,
  type DataTableColumn,
  type DataTableAction,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Edit2, RefreshCw, ShieldCheck, Users, Info, KeyRound } from "lucide-react";
import type { Customer } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthContext } from "@/context/AuthProvider";

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

const stageToVariant = (stage?: string | null): BadgeVariant => {
  switch ((stage || "").toLowerCase()) {
    case "approved":
    case "completed":
    case "release_to_cm":
      return "success";
    case "captured":
    case "pending":
    case "release_to_kyc":
      return "warning";
    case "rejected":
    case "failed":
      return "danger";
    case "retry":
      return "info";
    default:
      return "muted";
  }
};

const getCustomerName = (c: Partial<Customer>) =>
  `${c.firstName || ""} ${c.lastName || ""}`.trim() || "-";

const isPostApproval = (stage?: string | null) =>
  ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(String(stage || "").toUpperCase());

interface CustomersDataGridProps {
  customers: Customer[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  onApproveReject?: (customer: Customer) => void;
  onRetry?: (customer: Customer) => void;
  retryingId?: number | string | null;
  userName?: string;
  onResetPassword?: (customer: Customer) => void;
}

export default function CustomersDataGrid({
  customers,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onView,
  onApproveReject,
  onRetry,
  retryingId,
  onResetPassword,
}: CustomersDataGridProps) {
  const { user } = useAuthContext();
  const isAdmin = user?.allAccess === "Y";

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "custId",
      label: "Onboarding ID",
      render: (_v, c) => (c as any).onbId ?? c.custId ?? "-",
    },
    { key: "sapBpId", label: "BP ID", sortable: true, render: (v, c) => v || "-" },
    { 
  key: "userName", 
  label: "User Name", 
  sortable: true,
  render: (v) => {
    if (!v) return "-";
    // Force return as string to prevent any date auto-parsing
    return <span>{String(v)}</span>;
  }
},
    { key: "firstName", label: "Name", render: (_v, c) => getCustomerName(c) },
    { key: "email", label: "Email", render: (v) => v || "-" },
    { key: "mobile", label: "Mobile", render: (v) => v || "-" },
    { key: "region", label: "Region" },
    { key: "customerType", label: "Division", render: (_v, c) => (c as any).division || "-" },
    {
      key: "createDt" as unknown as keyof Customer,
      label: "Created",
      render: (_v, c) =>
        (c as any).createDt ? new Date(String((c as any).createDt)).toLocaleDateString() : "-",
    },
    {
      key: "customerStage",
      label: "Status",
      render: (_v, customer) => {
        const stage = (customer as any).customerStage;
        const remark = (customer as any).remark;
        const isRejectedWithRemark = (stage || "").toUpperCase() === "REJECTED" && remark;

        return (
          <div className="flex items-center gap-1">
            <Badge variant={stageToVariant(stage)} size="sm">
              {stage || "UNKNOWN"}
            </Badge>
            {isRejectedWithRemark && (
              <Popover>
                <PopoverTrigger asChild>
                  <button>
                    <Info className="h-4 w-4 text-red-500 cursor-pointer" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="font-semibold text-red-700 mb-2">Rejection Reason</div>
                  <p className="text-sm text-gray-700 break-words">{remark}</p>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      },
    },
  ];

  const actions: DataTableAction<Customer>[] = [
    // View: Available for everyone
    {
      label: "View",
      icon: <Eye className="h-4 w-4 text-blue-600" />,
      onClick: (c) => onView?.(c)
    },

    // Pre-approval edit (orange Edit2): 
    // - For Admin: Show for all pre-approval statuses
    // - For Agent: Show ONLY for CAPTURED status
    {
      label: "Edit",
      icon: <Edit2 className="h-4 w-4 text-orange-600" />,
      onClick: (c) => onEdit?.(c),
      show: (c) => {
        const stage = String(c.customerStage || "").toUpperCase();
        const isPreApproval = !isPostApproval(c.customerStage);

        if (isAdmin) {
          // Admin can edit all pre-approval statuses
          return isPreApproval;
        } else {
          // Agent can only edit CAPTURED status
          return stage === "CAPTURED";
        }
      }
    },

    // Post-approval edit (green Edit): ONLY for Admin
    {
      label: "Edit",
      icon: <Edit className="h-4 w-4 text-green-600" />,
      onClick: (c) => onEdit?.(c),
      show: (c) => isPostApproval(c.customerStage) && isAdmin,
    },

    // Approve/Reject: Available for both Admin and Agent
    {
      label: "Approve/Reject",
      icon: <ShieldCheck className="h-4 w-4 text-yellow-600" />,
      onClick: (c) => onApproveReject?.(c),
      show: (c) => isAdmin && ["CAPTURED", "RELEASE_TO_KYC"].includes(String(c.customerStage).toUpperCase()),
    },

    // Retry: Available for both Admin and Agent
    {
      label: "Retry",
      icon: <RefreshCw className="h-4 w-4 text-yellow-600" />,
      onClick: (c) => onRetry?.(c),
      show: (c) => String(c.customerStage).toUpperCase() === "RETRY",
    },

    // Reset Password: ONLY for Admin on approved customers
    {
      label: "Reset Password",
      icon: <KeyRound className="h-4 w-4 text-purple-600" />,
      onClick: (c) => onResetPassword?.(c),
      show: (c) => isAdmin && ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(String(c.customerStage).toUpperCase()),
    },
  ];

  return (
    <DataTable<Customer>
      title="Registered Customers"
      subtitle="Search and View Customers"
      icon={<Users className="h-5 w-5" />}
      headerVariant="gradient"
      showCount
      totalCount={total}
      data={customers}
      columns={columns}
      actions={actions}
      loading={isLoading}
      manualPagination
      pageIndex={page - 1}
      pageSize={pageSize}
      pageCount={Math.ceil(total / pageSize)}
      onPageChange={(idx) => onPageChange(idx + 1)}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/context/AuthProvider";

import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  ArrowRight,
  FileText,
  Building,
  Users,
  Wrench,
  Eye,
  Search,
  RefreshCw,
  Calendar,
  CheckSquare,
  MessageSquare,
  Download,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStockHistory } from "@/hooks/use-inventory-data";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Types
type InventoryRequest = {
  id: string;
  requestId: string;
  status: string;
  requestType: "STOCK_REQUEST" | "TRANSFER" | "EMERGENCY_REQUEST" | "REPLENISHMENT" | string;
  itemType: string;
  material: string;
  itemQty: number;
  approvedItemQty?: number;
  totalAmount?: number;
  vatAmount?: number;
  module: "OTC" | "WAREHOUSE" | "AGENT" | string;
  transferFrom?: string;
  transferTo?: string;
  sapSoId?: string;
  sapBpId?: string;
  createDt?: string; // ISO
  createId?: string;
  updateDt?: string; // ISO
  itemSerialNo?: string; // comma-separated
  reason?: string;
  rejectionRemarks?: string;

  // new: per-item detail lines (itemType + material + qty) — used when splitting rows
  itemDetails?: { itemType: string; material: string; qty: number; approvedQty?: number }[];
};

type StockItemRaw = {
  srId: string;
  requestId: string;
  createDt: string;
  updateDt?: string;
  status: string;
  fromPlantName: string;
  toPlantName: string;
  fromStoreLocation: string;
  material: string;
  itemQty: string;
  approvedItemQty?: string;
  itemType: string;
  remark: string | null;
  country: string;
  salesOrg: string;
  createId: string;
  description: string | null;
  toStoreLocation: string | null;
};

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const daysAgoYmd = (n: number) => toYmd(new Date(Date.now() - n * 24 * 60 * 60 * 1000));

// Utilities for variants/icons (no tailwind color overrides)
const statusToBadgeVariant = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending") || s.includes("transit") || s.includes("process")) return "warning" as const;
  if (s === "approved" || s === "success") return "success" as const;
  if (s === "rejected") return "danger" as const;
  return "muted" as const;
};

const priorityToBadgeVariant = (priority: "high" | "medium" | "low") => {
  if (priority === "high") return "danger" as const;
  if (priority === "medium") return "warning" as const;
  return "success" as const;
};

const statusIcon = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return <Clock className="w-4 h-4" />;
  if (s.includes("transit") || s.includes("process")) return <Package className="w-4 h-4" />;
  if (s === "approved" || s === "success") return <CheckCircle className="w-4 h-4" />;
  if (s === "rejected") return <XCircle className="w-4 h-4" />;
  return <AlertTriangle className="w-4 h-4" />;
};

const getRequestTypeDisplay = (requestType: string) => {
  switch (requestType) {
    case "STOCK_REQUEST": return "Stock Request";
    case "TRANSFER": return "Stock Transfer";
    default: return requestType;
  }
};

const getLocationIcon = (location: string) => {
  const v = location || "";
  if (v.includes("WH") || v.includes("Warehouse")) return <Building className="w-4 h-4" />;
  if (v.includes("AGENT") || v.includes("Agent")) return <Users className="w-4 h-4" />;
  if (v.includes("REPAIR") || v.includes("Repair")) return <Wrench className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

const getPriorityLevel = (req: InventoryRequest): "high" | "medium" | "low" => {
  if (req.totalAmount && req.totalAmount > 1000000) return "high";
  if (req.itemQty && req.itemQty > 10) return "medium";
  return "low";
};

function aggregateToInventoryRequests(details: StockItemRaw[], type: "STOCK_REQUEST" | "TRANSFER"): InventoryRequest[] {
  // helper: detect ISO / date-like strings so we can avoid using those as "material"
  const isIsoLikeDate = (s?: string) => {
    if (!s) return false;
    // quick regex for common ISO / yyyy-mm-dd patterns and timestamps
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T|\s|$)/;
    if (isoDateRegex.test(s)) return true;
    const parsed = Date.parse(s);
    // treat as date-like if parsing yields a valid date and string contains a dash (to avoid numbers)
    return !isNaN(parsed) && s.includes("-");
  };

  const map = new Map<string, StockItemRaw[]>();
  (details || []).forEach((ln) => {
    // Group by RequestID + Status so that if a single request has split statuses 
    // (some items approved, some pending), they appear as separate entries.
    const key = `${ln.requestId}||${ln.status || "PENDING"}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ln);
  });

  const requests: InventoryRequest[] = [];
  map.forEach((arr) => {
    const first = arr[0];
    // Calculate total qty
    const totalQty = arr.reduce((sum, item) => sum + (parseFloat(item.itemQty) || 0), 0);
    const totalApprovedQty = arr.reduce((sum, item) => sum + (parseFloat(item.approvedItemQty || "0") || 0), 0);
    // Join item types if multiple
    const itemTypes = Array.from(new Set(arr.map(i => i.itemType))).join(", ");

    // Choose material(s) but prefer non-date-like values (some payloads send dates into material)
    const rawMaterials = Array.from(new Set(arr.map(i => i.material || "")));
    const nonDateMaterials = rawMaterials.filter(m => !isIsoLikeDate(m) && m.trim() !== "");
    const materials = (nonDateMaterials.length ? nonDateMaterials : rawMaterials).join(", ") || "Unknown";

    // Build per-item details by grouping raw lines by itemType + material
    const detailsMap = new Map<string, { itemType: string; material: string; qty: number; approvedQty: number }>();
    arr.forEach((ln) => {
      const key = `${ln.itemType || ""}||${ln.material || ""}`;
      const qty = parseFloat(ln.itemQty || "0") || 0;
      const approvedQty = parseFloat(ln.approvedItemQty || "0") || 0;
      if (!detailsMap.has(key)) {
        detailsMap.set(key, { itemType: ln.itemType || "Unknown", material: ln.material || "Unknown", qty, approvedQty });
      } else {
        const cur = detailsMap.get(key)!;
        cur.qty += qty;
        cur.approvedQty += approvedQty;
        detailsMap.set(key, cur);
      }
    });
    const itemDetails = Array.from(detailsMap.values());

    // Map Status
    const status = first.status || "PENDING";

    requests.push({
      id: first.srId || first.requestId, // use srId if available, else requestId (duplicate logic handled by composite grouping usually implies unique rows)
      requestId: first.requestId,
      status: status,
      requestType: type,
      itemType: itemTypes || "Unknown",
      material: materials,
      itemQty: totalQty,
      approvedItemQty: totalApprovedQty,
      itemDetails, // attach per-item quantities for later splitting
      totalAmount: 0, // Not provided in API
      vatAmount: 0,
      module: first.salesOrg || "Inventory",
      transferFrom: first.fromPlantName,
      transferTo: first.toPlantName,
      createDt: first.createDt,
      updateDt: first.updateDt,
      createId: first.createId,
      reason: first.remark || "",
      // Store raw items if needed for details
    });
  });
  return requests;
}

// Helper to choose a light background for status badges
const statusBgColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("pending")) return "#FFF7E0";
  if (s.includes("transit") || s.includes("process")) return "#E0F2FF";
  if (s === "approved" || s === "success") return "#E6F9EA";
  if (s === "rejected") return "#FFE6E6";
  return "#F3F4F6";
};

const statusTextColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "rejected") return "#B91C1C";
  if (s === "approved" || s === "success") return "#15803D";
  if (s.includes("pending")) return "#B45309";
  if (s.includes("transit") || s.includes("process")) return "#2563EB";
  return "#374151";
};

// Custom Table Component
function CustomTable({
  data,
  columns,
  emptyMessage = "No data",
  onRowAction,
}: {
  data: InventoryRequest[];
  columns: any[];
  emptyMessage?: string;
  onRowAction?: (action: string, row: InventoryRequest) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold text-black border-r border-gray-200 last:border-r-0">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-black border-r border-gray-200 last:border-r-0">
                  {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Custom Mobile Card Component
function MobileRequestCard({ item, onApprove, onReject }: { item: InventoryRequest; onApprove: (item: InventoryRequest) => void; onReject: (item: InventoryRequest) => void }) {
  return (
    <Card className="mb-3 border-l-4" style={{ borderLeftColor: statusBgColor(item.status) }}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header with ID and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Request ID</p>
              <p className="font-mono text-sm font-semibold">{item.requestId}</p>
            </div>
            <Badge
              variant={statusToBadgeVariant(item.status)}
              size="sm"
              style={{
                backgroundColor: statusBgColor(item.status),
                color: statusTextColor(item.status)
              }}
            >
              {item.status}
            </Badge>
          </div>

          {/* Type and Item */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-xs font-medium">{getRequestTypeDisplay(item.requestType)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Item</p>
              <p className="text-xs font-medium">{item.itemType}</p>
            </div>
          </div>

          {/* Material and Qty */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Material</p>
              <p className="text-xs">{item.material ?? "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Qty</p>
              <p className="text-xs font-semibold">
                {((item.status || "").toLowerCase() === "approved" || (item.status || "").toLowerCase() === "success") && item.approvedItemQty !== undefined
                  ? item.approvedItemQty
                  : item.itemQty}
              </p>
            </div>
          </div>

          {/* Route */}
          {(item.transferFrom || item.transferTo) && (
            <div>
              <p className="text-xs text-gray-500">Route</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {item.transferFrom && (
                  <span className="flex items-center gap-1">
                    {getLocationIcon(item.transferFrom)}
                    <span>{item.transferFrom}</span>
                  </span>
                )}
                {item.transferFrom && item.transferTo && <ArrowRight className="w-3 h-3" />}
                {item.transferTo && (
                  <span className="flex items-center gap-1">
                    {getLocationIcon(item.transferTo)}
                    <span>{item.transferTo}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Module and Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Module</p>
              <p className="text-xs font-medium">{item.module}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-xs">{item.createDt ? format(new Date(item.createDt), "MMM dd") : "N/A"}</p>
            </div>
          </div>

          {/* Actions */}
          {((item.status || "").toLowerCase() === "pending" || (item.status || "").toLowerCase().includes("transit") || (item.status || "").toLowerCase().includes("process")) && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                onClick={() => onApprove(item)}
              >
                <CheckCircle className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 h-8 text-xs"
                onClick={() => onReject(item)}
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StockApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
  const [remark, setRemark] = useState("");
  const [reason, setReason] = useState("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
const { user } = useAuthContext();
const userSalesOrg = user?.salesOrg || "";
  // New: additional filters
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");
  const [minQty, setMinQty] = useState<string>("");
  const [maxQty, setMaxQty] = useState<string>("");

  // New: pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // New: approval quantity (can be decreased by user)
  const [approvalQty, setApprovalQty] = useState<number>(0);

  const [inventoryRequests, setInventoryRequests] = useState<InventoryRequest[]>([]);
  const { toast } = useToast();

  const approvalReasons = [
    { value: "Available", name: "Available" },
    { value: "Verified", name: "Verified" },
  ];

  const rejectReasons = [
    { value: "Not Available", name: "Not Available" },
    { value: "Not Verified", name: "Not Verified" },
  ];

  // API Data
  const { data: srDataRaw = [], refetch: refetchSr } = useStockHistory({
    type: "SR",
    fromDate: daysAgoYmd(365), // Fetch last 365 days
    toDate: toYmd(new Date())
  });


  const { data: stDataRaw = [], refetch: refetchSt } = useStockHistory({
    type: "ST",
    fromDate: daysAgoYmd(365),
    toDate: toYmd(new Date())
  });

  // Merge and set data
  useEffect(() => {
    const srRequests = aggregateToInventoryRequests(srDataRaw, "STOCK_REQUEST");
    const stRequests = aggregateToInventoryRequests(stDataRaw, "TRANSFER");
    const combined = [...srRequests, ...stRequests].sort((a, b) => {
      return new Date(b.createDt || 0).getTime() - new Date(a.createDt || 0).getTime();
    });
    setInventoryRequests(combined);
  }, [srDataRaw, stDataRaw]);

  const safeInventoryRequests = Array.isArray(inventoryRequests) ? inventoryRequests : [];

  // compute dynamic module options from data
  const moduleOptions = useMemo(() => {
  // If user has a salesOrg, only show that option (no "all")
  if (userSalesOrg) {
    return [userSalesOrg];
  }
  // Fallback for admin or users without salesOrg
  const setMods = new Set<string>();
  (safeInventoryRequests || []).forEach((r) => {
    if (r.module) setMods.add(r.module);
  });
  return ["all", ...Array.from(setMods).sort()];
}, [safeInventoryRequests, userSalesOrg]);
useEffect(() => {
  if (userSalesOrg && moduleFilter !== userSalesOrg) {
    setModuleFilter(userSalesOrg);
  }
}, [userSalesOrg]);

  const moduleLabel = (m: string) => {
    if (!m || m === "all") return "All Modules";
    // map common keys to nicer labels
    if (m.toUpperCase() === "WAREHOUSE") return "Warehouse";
    if (m.toUpperCase() === "AGENT") return "Agent";
    if (m.toUpperCase() === "OTC") return "OTC";
    return m;
  };

  // Reset page when filters/search/tab change (removed dateFilter)
  useEffect(() => {
    setPage(1);
  }, [searchTerm, moduleFilter, requestTypeFilter, minQty, maxQty, activeTab]);

  // Extend filtering to include new filters (requestType + qty)
  const getFilteredRequests = (statusKey: "pending" | "approved" | "rejected") => {
    let filtered = safeInventoryRequests.filter((req) => {
      const s = (req.status || "").toLowerCase();
      if (statusKey === "pending") return s === "pending" || s.includes("transit") || s.includes("process");
      if (statusKey === "approved") {
        const isApproved = s === "approved" || s === "success";
        if (!isApproved) return false;
        // Don't show approved items with 0 quantity
        const val = req.approvedItemQty !== undefined ? req.approvedItemQty : req.itemQty;
        const n = typeof val === "number" ? val : parseFloat(String(val || "0"));
        return n > 0;
      }
      if (statusKey === "rejected") return s === "rejected";
      return true;
    });

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.requestId?.toLowerCase().includes(q) ||
          req.itemType?.toLowerCase().includes(q) ||
          (req.module || "").toLowerCase().includes(q) ||
          (req.material || "").toLowerCase().includes(q)
      );
    }

    // module filtering (unchanged logic)
    if (moduleFilter !== "all") {
      filtered = filtered.filter((req) => req.module === moduleFilter);
    }

    if (requestTypeFilter !== "all") {
      filtered = filtered.filter((req) => req.requestType === requestTypeFilter);
    }

    // qty filters
    const minQ = parseFloat(minQty || "0");
    const hasMin = minQty !== "" && !Number.isNaN(minQ);
    const maxQ = parseFloat(maxQty || "0");
    const hasMax = maxQty !== "" && !Number.isNaN(maxQ);

    if (hasMin) {
      filtered = filtered.filter((req) => (typeof req.itemQty === "number" ? req.itemQty : parseFloat(String(req.itemQty || "0"))) >= minQ);
    }
    if (hasMax) {
      filtered = filtered.filter((req) => (typeof req.itemQty === "number" ? req.itemQty : parseFloat(String(req.itemQty || "0"))) <= maxQ);
    }

    return filtered;
  };

  // Ensure tab counts are available (were referenced in UI but missing)
  const pendingRequests = getFilteredRequests("pending");
  const approvedRequests = getFilteredRequests("approved");
  const rejectedRequests = getFilteredRequests("rejected");

  // New: paginated data for current active tab
  const paginated = useMemo(() => {
    const all = getFilteredRequests(activeTab as any);
    const total = all.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.min(Math.max(1, page), pageCount);
    const start = (clampedPage - 1) * pageSize;
    const end = start + pageSize;
    return {
      all,
      pageData: all.slice(start, end),
      total,
      pageCount,
      currentPage: clampedPage,
      start,
      end: Math.min(end, total),
    };
  }, [safeInventoryRequests, activeTab, searchTerm, moduleFilter, requestTypeFilter, minQty, maxQty, page, pageSize]);

  // Keep page state consistent with computed clamped page
  useEffect(() => {
    if (paginated.currentPage !== page) setPage(paginated.currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginated.currentPage]);

  // Add missing tab-change handler referenced by Tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Table columns (reintroduced)
  const tableColumns = useMemo(
    () => {
      const cols = [
        { key: "requestId", label: "Request ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
        {
          key: "status",
          label: "Status",
          render: (_: any, item: InventoryRequest) => (
            <Badge
              variant={statusToBadgeVariant(item.status)}
              size="sm"
              style={{
                backgroundColor: statusBgColor(item.status),
                color: statusTextColor(item.status)
              }}
            >
              {item.status}
            </Badge>
          ),
        },
        { key: "requestType", label: "Type", render: (v: string) => <span className="text-xs">{getRequestTypeDisplay(v)}</span> },
        { key: "createId", label: "Created By", render: (v: string) => <span className="text-xs">{v || "N/A"}</span> },
        { key: "itemType", label: "Item", render: (v: string) => <span className="text-xs">{v}</span> },
        {
          key: "material",
          label: "Material",
          render: (_: any, item: InventoryRequest) => <span className="text-xs whitespace-normal max-w-xs">{item.material ?? "N/A"}</span>
        },
        {
          key: "itemQty",
          label: "Qty",
          render: (v: any, item: InventoryRequest) => {
            const s = (item.status || "").toLowerCase();
            const isApproved = s === "approved" || s === "success";
            const valToUse = (isApproved && item.approvedItemQty !== undefined) ? item.approvedItemQty : v;
            const n = typeof valToUse === "number" ? valToUse : parseFloat(String(valToUse || "0"));
            return <span className="text-xs font-medium">{Number.isNaN(n) ? "0" : n}</span>;
          }
        },
        {
          key: "transferFrom",
          label: "Route",
          render: (_: any, item: InventoryRequest) => (
            <div className="flex items-center gap-1 text-xs">
              {item.transferFrom && (
                <span className="flex items-center gap-1">
                  {getLocationIcon(item.transferFrom)}
                  <span>{item.transferFrom}</span>
                </span>
              )}
              {item.transferFrom && item.transferTo && <ArrowRight className="w-3 h-3" />}
              {item.transferTo && (
                <span className="flex items-center gap-1">
                  {getLocationIcon(item.transferTo)}
                  <span>{item.transferTo}</span>
                </span>
              )}
            </div>
          ),
        },
        {
          key: "createDt",
          label: "Date",
          render: (_: string, item: InventoryRequest) => {
            const s = (item.status || "").toLowerCase();
            const isClosed = s === "approved" || s === "success" || s === "rejected";
            // Use updateDt if approved/rejected, else createDt. Fallback to createDt if updateDt is missing.
            const dateVal = isClosed ? (item.updateDt || item.createDt) : item.createDt;
            return <span className="text-xs">{dateVal ? format(new Date(dateVal), "yyyy-MM-dd") : "N/A"}</span>;
          }
        },
      ];

      if (activeTab === "pending") {
        cols.push({
          key: "id",
          label: "Actions",
          render: (_: string, item: InventoryRequest) => {
            const s = (item.status || "").toLowerCase();
            const isPending = s === "pending" || s.includes("transit") || s.includes("process");
            if (isPending) {
              return (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2"
                    onClick={() => handleApprove(item)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs px-2"
                    onClick={() => handleReject(item)}
                  >
                    Reject
                  </Button>
                </div>
              );
            }
            return null;
          },
        } as any);
      }

      if (activeTab === "rejected") {
        cols.push({
          key: "reason", // or rejectionRemarks
          label: "Remark",
          render: (_: any, item: InventoryRequest) => {
            const r = item.rejectionRemarks || item.reason || "-";
            return <span className="text-xs text-black max-w-xs block truncate" title={r}>{r}</span>;
          }
        } as any);
      }

      return cols;
    },
    [activeTab]
  );

  // Handlers for approve/reject flows (updated to call backend)
  const approveMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("/inventory/stock-approval", "POST", payload),
    onSuccess: (_res, variables) => {
      // optimistic local update similar to previous behavior
      const reqId = variables?.requestId;
      setInventoryRequests((prev) =>
        prev.map((r) =>
          r.requestId === reqId
            ? {
              ...r,
              status: "APPROVED",
              updateDt: new Date().toISOString(),
              reason: (variables?.reason || "") + (variables?.remark ? ` - ${variables.remark}` : ""),
            }
            : r
        )
      );
      toast({ title: "Request Approved", description: "The stock request has been approved." });
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setRemark("");
      setReason("");
      // refresh source hooks
      try { refetchSr(); refetchSt(); } catch (e) { /* ignore */ }
    },
    onError: (err: any) => {
      toast({ title: "Approve failed", description: err?.data?.statusMessage || err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("/inventory/stock-approval", "POST", payload),
    onSuccess: (_res, variables) => {
      const reqId = variables?.requestId;
      setInventoryRequests((prev) =>
        prev.map((r) =>
          r.requestId === reqId
            ? { ...r, status: "REJECTED", updateDt: new Date().toISOString(), rejectionRemarks: variables?.remark, reason: variables?.reason }
            : r
        )
      );
      toast({ title: "Request Rejected", description: "The stock request has been rejected." });
      setRejectionModalOpen(false);
      setSelectedRequest(null);
      setRemark("");
      setReason("");
      try { refetchSr(); refetchSt(); } catch (e) { /* ignore */ }
    },
    onError: (err: any) => {
      toast({ title: "Reject failed", description: err?.data?.statusMessage || err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const handleApprove = (req: InventoryRequest) => {
    setSelectedRequest(req);
    setApprovalQty(req.itemQty ?? 0); // Initialize with full qty
    setRemark("");
    setReason("");
    setApproveModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!reason) {
      toast({ title: "Please select an approval reason", variant: "destructive" });
      return;
    }
    if (!selectedRequest) return;

    // prepare payload using approval qty (can be less than full qty)
    const payload = {
      requestId: selectedRequest.requestId,
      materialId: selectedRequest.material,
      itemType: selectedRequest.itemType,
      approvedItemQty: String(approvalQty),
      status: "APPROVED",
      remark: remark || "",
      reason: reason || "",
      type: selectedRequest.requestType === "STOCK_REQUEST" ? "SR" : "ST"
    };

    // use react-query mutation (no direct fetch)
    approveMutation.mutate(payload);
  };

  const handleReject = (req: InventoryRequest) => {
    setSelectedRequest(req);
    setApprovalQty(req.itemQty ?? 0); // Initialize with full qty
    setRemark("");
    setReason("");
    setRejectionModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!reason) {
      toast({ title: "Please select a rejection reason", variant: "destructive" });
      return;
    }
    if (!remark.trim()) {
      toast({ title: "Please provide rejection remarks", variant: "destructive" });
      return;
    }
    if (!selectedRequest) return;

    const payload = {
      requestId: selectedRequest.requestId,
      materialId: selectedRequest.material,
      itemType: selectedRequest.itemType,
      approvedItemQty: String(approvalQty),
      status: "REJECTED",
      remark: remark || "",
      reason: reason || "",
      type: selectedRequest.requestType === "STOCK_REQUEST" ? "SR" : "ST"
    };

    rejectMutation.mutate(payload);
  };

  // Export should use full filtered collection (not just current page)
  const exportToCsv = () => {
    const rows = paginated.all; // use filtered all
    if (!rows || rows.length === 0) {
      toast({ title: "Nothing to export", description: "No records in the current view." });
      return;
    }
    const headers = ["requestId", "status", "requestType", "itemType", "material", "itemQty", "module", "transferFrom", "transferTo", "sapSoId", "createDt"];
    const csv = [headers.join(",")]
      .concat(
        rows.map((r) =>
          headers
            .map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-approvals-${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // New: expand aggregated requests into one row per item/material
  const expandRowsForDisplay = (rows: InventoryRequest[]) => {
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((r) => {
      let expanded: InventoryRequest[] = [];
      // Prefer itemDetails (accurate per-item qty) if available
      if (Array.isArray(r.itemDetails) && r.itemDetails.length > 0) {
        expanded = r.itemDetails.map((d) => ({
          ...r,
          itemType: d.itemType || "Unknown",
          material: d.material || "Unknown",
          itemQty: d.qty ?? (typeof r.itemQty === "number" ? r.itemQty : parseFloat(String(r.itemQty || "0"))),
          approvedItemQty: d.approvedQty ?? r.approvedItemQty,
        }));
      } else {
        // fallback: split itemType and material by comma (preserve original qty)
        const items = String(r.itemType || "Unknown").split(",").map(s => s.trim()).filter(Boolean);
        const materials = String(r.material || "Unknown").split(",").map(s => s.trim()).filter(Boolean);

        // ensure at least one value
        const iArr = items.length ? items : ["Unknown"];
        const mArr = materials.length ? materials : ["Unknown"];

        const count = Math.max(iArr.length, mArr.length);

        // create one row per index; keep all other fields identical
        const out: InventoryRequest[] = [];
        for (let i = 0; i < count; i++) {
          out.push({
            ...r,
            // set single item/material for this row (fallback to first if index out of range)
            itemType: iArr[i] ?? iArr[0],
            material: mArr[i] ?? mArr[0],
            // keep itemQty unchanged per previous fallback behavior
          });
        }
        expanded = out;
      }

      // Filter out 0 qty items for approved requests
      return expanded.filter(row => {
        const s = (row.status || "").toLowerCase();
        if (s === "approved" || s === "success") {
          const val = row.approvedItemQty !== undefined ? row.approvedItemQty : row.itemQty;
          const n = typeof val === "number" ? val : parseFloat(String(val || "0"));
          return n > 0;
        }
        return true;
      });
    });
  };

  // New: display rows for current paginated page
  // Use only the current page data for display
  const displayRows = useMemo(() => expandRowsForDisplay(paginated.pageData), [paginated.pageData]);

  return (
    <div className="p-2 sm:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Stock Approval Center</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Review and approve inventory requests with advanced workflow
            </p>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9">
        <Card>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <CardHeader className="pb-2">
              {/* Filters in main content */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ID, item, module..."
                      uiSize="sm"
                      leftIcon={<Search className="w-4 h-4" />}
                      className="min-w-[180px]"
                    />
                  </div>
                  <div>
  <Label htmlFor="module-filter">Module</Label>
  <Select 
    value={moduleFilter} 
    onValueChange={setModuleFilter}
    disabled={!!userSalesOrg}
  >
    <SelectTrigger uiSize="sm" className={`min-w-[120px] ${userSalesOrg ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
      <SelectValue placeholder="All modules" />
    </SelectTrigger>
    <SelectContent>
      {moduleOptions.map((m) => (
        <SelectItem key={m} value={m}>
          {moduleLabel(m)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
                  {/* Removed Date filter UI */}
                  {/* ...existing request type and qty filters ... */}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      refetchSr();
                      refetchSt();
                      toast({ title: "Refreshed", description: "Data reloaded from API." });
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="xs" onClick={exportToCsv}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="relative -mx-2 sm:mx-0 overflow-x-auto">
                  <TabsList className="inline-flex w-max gap-2 px-2">
                    <TabsTrigger
                      value="pending"
                      className={`whitespace-nowrap flex items-center gap-2 text-sm font-medium data-[state=active]:bg-azam-orange data-[state=active]:text-white`}
                    >
                      <Clock className="w-4 h-4" />
                      Pending ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="approved"
                      className={`whitespace-nowrap flex items-center gap-2 text-sm font-medium data-[state=active]:bg-azam-orange data-[state=active]:text-white`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approved ({approvedRequests.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="rejected"
                      className={`whitespace-nowrap flex items-center gap-2 text-sm font-medium data-[state=active]:bg-azam-orange data-[state=active]:text-white`}
                    >
                      <XCircle className="w-4 h-4" />
                      Rejected ({rejectedRequests.length})
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <TabsContent value="pending" className="mt-0">
                  <CustomTable
                    data={displayRows}
                    columns={tableColumns as any}
                    emptyMessage="No pending requests"
                  />
                </TabsContent>
                <TabsContent value="approved" className="mt-0">
                  <CustomTable
                    data={displayRows}
                    columns={tableColumns as any}
                    emptyMessage="No approved requests"
                  />
                </TabsContent>
                <TabsContent value="rejected" className="mt-0">
                  <CustomTable
                    data={displayRows}
                    columns={tableColumns as any}
                    emptyMessage="No rejected requests"
                  />
                </TabsContent>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden">
                <TabsContent value="pending" className="mt-0">
                  {displayRows.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-500 text-sm">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayRows.map((item, idx) => (
                        <MobileRequestCard
                          key={idx}
                          item={item}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="approved" className="mt-0">
                  {displayRows.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-500 text-sm">No approved requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayRows.map((item, idx) => (
                        <MobileRequestCard
                          key={idx}
                          item={item}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="rejected" className="mt-0">
                  {displayRows.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-500 text-sm">No rejected requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayRows.map((item, idx) => (
                        <MobileRequestCard
                          key={idx}
                          item={item}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-gray-200 gap-4">
                <div className="text-xs text-gray-600">
                  Showing {paginated.start + 1} to {paginated.end} of {paginated.total} records
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="page-size" className="text-xs">Rows per page:</Label>
                    <Select value={String(pageSize)} onValueChange={(val) => {
                      setPageSize(parseInt(val));
                      setPage(1);
                    }}>
                      <SelectTrigger id="page-size" uiSize="sm" className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={paginated.currentPage === 1}
                      onClick={() => setPage(Math.max(1, paginated.currentPage - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-700 min-w-max">
                      Page {paginated.currentPage} of {paginated.pageCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={paginated.currentPage === paginated.pageCount}
                      onClick={() => setPage(Math.min(paginated.pageCount, paginated.currentPage + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Quantity Section */}
            <div className="space-y-2">
              <Label htmlFor="approval-qty">Approved Quantity <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApprovalQty(Math.max(0, approvalQty - 1))}
                >
                  −
                </Button>
                <Input
                  id="approval-qty"
                  type="number"
                  value={approvalQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    const max = selectedRequest?.itemQty ?? 0;
                    setApprovalQty(Math.min(val, max));
                  }}
                  min="0"
                  max={selectedRequest?.itemQty ?? 0}
                  className="text-center"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApprovalQty(Math.min(approvalQty + 1, selectedRequest?.itemQty ?? 0))}
                >
                  +
                </Button>
                <span className="text-xs text-gray-500 ml-2">
                  (Max: {selectedRequest?.itemQty ?? 0})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="approval-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
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
            <Button onClick={handleApproveConfirm} disabled={!reason || approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Quantity Section */}
            <div className="space-y-2">
              <Label htmlFor="reject-qty">Rejected Quantity <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApprovalQty(Math.max(0, approvalQty - 1))}
                >
                  −
                </Button>
                <Input
                  id="reject-qty"
                  type="number"
                  value={approvalQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    const max = selectedRequest?.itemQty ?? 0;
                    setApprovalQty(Math.min(val, max));
                  }}
                  min="0"
                  max={selectedRequest?.itemQty ?? 0}
                  className="text-center"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApprovalQty(Math.min(approvalQty + 1, selectedRequest?.itemQty ?? 0))}
                >
                  +
                </Button>
                <span className="text-xs text-gray-500 ml-2">
                  (Max: {selectedRequest?.itemQty ?? 0})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason <span className="text-red-500">*</span></Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="rejection-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
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
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!reason || !remark.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Request Details #{selectedRequest?.requestId}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Status + Priority */}
              <div className="flex items-center justify-between">
                <Badge variant={statusToBadgeVariant(selectedRequest.status)} size="md">
                  {statusIcon(selectedRequest.status)}
                  <span className="ml-1">{selectedRequest.status}</span>
                </Badge>
                <Badge variant={priorityToBadgeVariant(getPriorityLevel(selectedRequest))} size="md">
                  {getPriorityLevel(selectedRequest).toUpperCase()} PRIORITY
                </Badge>
              </div>

              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Request Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Request Type</p>
                        <p className="text-sm font-medium">{getRequestTypeDisplay(selectedRequest.requestType)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Module</p>
                        <p className="text-sm font-medium">{selectedRequest.module}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Item Type</p>
                        <p className="text-sm">{selectedRequest.itemType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-semibold">{selectedRequest.itemQty}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Financial Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="text-sm font-semibold">
                          {selectedRequest.totalAmount ? `TSH ${selectedRequest.totalAmount.toLocaleString()}` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">VAT Amount</p>
                        <p className="text-sm">
                          {selectedRequest.vatAmount ? `TSH ${selectedRequest.vatAmount.toLocaleString()}` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">SAP Order ID</p>
                        <p className="text-sm font-mono">{selectedRequest.sapSoId || "Pending"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">BP ID</p>
                        <p className="text-sm font-mono">{selectedRequest.sapBpId || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{selectedRequest.createDt ? new Date(selectedRequest.createDt).toLocaleString() : "N/A"}</span>
                  </div>
                  {selectedRequest.updateDt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4" />
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">{new Date(selectedRequest.updateDt).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Serials */}
              {selectedRequest.itemSerialNo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Serial Numbers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.itemSerialNo.split(",").map((serial, idx) => (
                        <Badge key={idx} variant="outline" size="sm">
                          {serial.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reason/Remarks */}
              {selectedRequest.reason && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Request Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.reason}</p>
                  </CardContent>
                </Card>
              )}
              {selectedRequest.rejectionRemarks && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Rejection Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.rejectionRemarks}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
                  Close Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
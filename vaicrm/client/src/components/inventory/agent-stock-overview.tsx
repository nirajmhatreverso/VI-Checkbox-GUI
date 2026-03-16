import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/lib/api-client";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  RefreshCw,
  Info,
  Loader2,
  Filter as FilterIcon,
  CheckCircle2,
  ArrowLeftRight,
  AlertCircle,
} from "lucide-react";
import ParentAgentSearchModal, {
  AgentApiItem,
} from "@/components/agents/ParentAgentSearchModal";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface AgentStockItem {
  invId: string;
  deviceName: string;
  deviceModel: string;
  deviceType: string;
  deviceSubType: string;
  deviceSerialNo: string;
  deviceOwner: string;
  purchaseTs: string;
  status: string;
  salesOrg: string;
  material: string;
  remark?: string;
  createTs: string;
  orderFlag?: string;
  [key: string]: any;
}

interface StatusConfigItem {
  name: string;
  value: string;
  validation: string;
  validation2: string | null;
}

// Default filter values
const DEFAULT_FILTERS = {
  sapBpId: "",
  deviceSerialNo: "",
  material: "",
  deviceName: "",
  status: "",
};

export default function AgentStockOverview() {
  const { user, isAdmin } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAgentModal, setShowAgentModal] = useState(false);
  const isAgent = !isAdmin && !!user?.sapBpId;

  // Filters
  const [selectedAgent, setSelectedAgent] = useState<AgentApiItem | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Status Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<AgentStockItem | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  // Fetch stock data
  const {
    data: stockResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["agentStockFilter", filters, pageIndex, pageSize],
    queryFn: () => {
      const payload: any = {
        sapBpId: filters.sapBpId,
        offSet: pageIndex * pageSize,
        limit: pageSize,
      };

      if (filters.deviceSerialNo.trim()) {
        payload.deviceSerialNo = filters.deviceSerialNo.trim();
      }
      if (filters.material.trim()) {
        payload.material = filters.material.trim();
      }
      if (filters.deviceName.trim()) {
        payload.deviceName = filters.deviceName.trim();
      }
      if (filters.status) {
        payload.status = filters.status;
      }

      return stockApi.fetchAgentStockFilter(payload);
    },
    enabled: !!filters.sapBpId,
  });

  // Fetch status configuration
  const { data: statusConfigResponse, isLoading: isConfigLoading } = useQuery({
    queryKey: ["agentStockStatusConfig"],
    queryFn: () => stockApi.fetchStatusConfig(),
    staleTime: 1000 * 60 * 30,
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: (payload: {
      consignmentStockDetailsList: Array<{
        sapBpId: string;
        deviceSerialNo: string;
        currentStatus: string;
        newStatus: string;
      }>;
    }) => stockApi.updateAgentStock(payload),
    onSuccess: (response) => {
      if (response?.status === "SUCCESS") {
        toast({
          title: "Success",
          description: response?.data?.message || "Stock status updated successfully",
        });
        setIsUpdateModalOpen(false);
        setSelectedStockItem(null);
        setNewStatus("");
        queryClient.invalidateQueries({ queryKey: ["agentStockFilter"] });
      } else {
        toast({
          title: "Error",
          description: response?.statusMessage || "Failed to update stock status",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update stock status",
        variant: "destructive",
      });
    },
  });

  const stockData = (stockResponse?.data as any)?.agentStockDetails || [];
  const totalCount = (stockResponse?.data as any)?.totalCount || 0;

  // Get status config list - handle nested structure properly
  const statusConfigList: StatusConfigItem[] = (() => {
    const configData = statusConfigResponse?.data;
    if (!configData) return [];
    
    // Handle the nested structure: data.configItemsList.AGENT_STOCK_STATUS_UPDATE
    const configItemsList = (configData as any)?.configItemsList;
    if (configItemsList?.AGENT_STOCK_STATUS_UPDATE) {
      return configItemsList.AGENT_STOCK_STATUS_UPDATE;
    }
    
    return [];
  })();

  // Debug log to check config data
  useEffect(() => {
    if (statusConfigResponse) {
      console.log("Status Config Response:", statusConfigResponse);
      console.log("Parsed Config List:", statusConfigList);
    }
  }, [statusConfigResponse, statusConfigList]);

  useEffect(() => {
    if (isAgent && user?.sapBpId) {
      setSelectedAgent({
        agentName: user.name || user.username,
        sapBpId: user.sapBpId,
        sapCaId: "",
        country: user.country || "",
        region: "",
        city: "",
        district: "",
        ward: "",
        currency: "",
      });
      setFilters((prev) => ({
        ...prev,
        sapBpId: user.sapBpId!,
      }));
    }
  }, [isAgent, user?.sapBpId]);

  const handleAgentSelect = (agent: AgentApiItem) => {
    setSelectedAgent(agent);
    setFilters({
      ...DEFAULT_FILTERS,
      sapBpId: agent.sapBpId,
    });
    setPageIndex(0);
    setShowAgentModal(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPageIndex(0);
  };

  // Helper function to get available transitions for a status
  const getAvailableTransitions = (currentStatus: string): string[] => {
    if (!currentStatus || statusConfigList.length === 0) {
      console.log("No current status or config list is empty");
      return [];
    }

    const normalizedCurrentStatus = currentStatus.toUpperCase().trim();
    console.log("Looking for status:", normalizedCurrentStatus);
    console.log("Available configs:", statusConfigList);

    const currentStatusConfig = statusConfigList.find(
      (config) => config.value?.toUpperCase().trim() === normalizedCurrentStatus
    );

    console.log("Found config:", currentStatusConfig);

    if (currentStatusConfig && currentStatusConfig.validation) {
      const transitions = currentStatusConfig.validation
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      console.log("Available transitions:", transitions);
      return transitions;
    }
    
    return [];
  };

  // Handle opening the update modal
  const handleOpenUpdateModal = (item: AgentStockItem) => {
    console.log("Opening modal for item:", item);
    console.log("Item status:", item.status);
    
    setSelectedStockItem(item);
    setNewStatus("");

    const transitions = getAvailableTransitions(item.status);
    console.log("Setting available statuses:", transitions);
    setAvailableStatuses(transitions);
    setIsUpdateModalOpen(true);
  };

  // Handle status update submission
  const handleUpdateStatus = () => {
    if (!selectedStockItem || !newStatus || !filters.sapBpId) {
      toast({
        title: "Validation Error",
        description: "Please select a new status",
        variant: "destructive",
      });
      return;
    }

    updateStockMutation.mutate({
      consignmentStockDetailsList: [
        {
          sapBpId: filters.sapBpId,
          deviceSerialNo: selectedStockItem.deviceSerialNo,
          currentStatus: selectedStockItem.status,
          newStatus: newStatus,
        },
      ],
    });
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "FAULTY":
        return "bg-red-100 text-red-800";
      case "BLOCK":
        return "bg-orange-100 text-orange-800";
      case "SOLD":
        return "bg-blue-100 text-blue-800";
      case "IN_TRANSIT":
        return "bg-yellow-100 text-yellow-800";
      case "NEW":
        return "bg-purple-100 text-purple-800";
      case "UNBLOCK":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const columns: DataTableColumn<AgentStockItem>[] = [
   {
    key: "deviceSerialNo",
    label: "Serial Number",
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{value || "-"}</span>
        {row.orderFlag === "Y" && (
          <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5">
            Consignment
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "deviceName",
    label: "Device Name",
  },
    {
      key: "deviceName",
      label: "Device Name",
    },
    {
      key: "deviceModel",
      label: "Model",
      render: (value) => <Badge variant="outline">{value || "-"}</Badge>,
    },
    {
      key: "material",
      label: "Material Code",
      render: (value) => value || "-",
    },
    {
      key: "deviceSubType",
      label: "Sub Type",
      render: (value) => value || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge className={getStatusBadgeClass(value)}>
          {value || "-"}
        </Badge>
      ),
    },
    {
      key: "purchaseTs",
      label: "Purchase Date",
      render: (value) =>
        value ? new Date(value).toLocaleDateString() : "-",
    },
    {
      key: "actions",
      label: "Update Status",
      render: (_, row) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenUpdateModal(row)}
            className="p-2 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
            title="Update Status"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  // Right icon in Agent BP input
  const agentRightIcon = selectedAgent ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : undefined;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Blue gradient header */}
      <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Agent Stock Overview</h1>
                <p className="text-blue-100 text-xs mt-0.5">
                  View hardware allocated to a selected agent and filter by
                  serial number, material, or status.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
              onClick={() => refetch()}
              disabled={isFetching || !filters.sapBpId}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Agent BP selector */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label>
                  Agent BP <span className="text-red-500">*</span>
                </Label>
                {!isAgent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowAgentModal(true)}
                    title="Filter & select Agent"
                  >
                    <FilterIcon className="h-4 w-4 text-blue-600" />
                    <span className="ml-1 text-xs text-blue-700">Filter</span>
                  </Button>
                )}
              </div>
              <Input
                uiSize="sm"
                placeholder={isAgent ? "" : "Click Filter..."}
                value={filters.sapBpId || ""}
                readOnly
                onClick={() => !isAgent && setShowAgentModal(true)}
                className={`${
                  isAgent ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer bg-gray-50"
                } focus:ring-0 text-sm`}
                disabled={isAgent}
                rightIcon={agentRightIcon}
              />
            </div>

            {/* Serial Number filter */}
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                placeholder="Search Serial..."
                value={filters.deviceSerialNo}
                onChange={(e) =>
                  handleFilterChange("deviceSerialNo", e.target.value)
                }
                className="text-sm"
              />
            </div>

            {/* Material Code filter */}
            <div className="space-y-2">
              <Label>Material Code</Label>
              <Input
                placeholder="Material ID..."
                value={filters.material}
                onChange={(e) =>
                  handleFilterChange("material", e.target.value)
                }
                className="text-sm"
              />
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(val) => handleFilterChange("status", val)}
              >
                <SelectTrigger uiSize="sm" className="text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="FAULTY">Faulty</SelectItem>
                  <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="BLOCK">Block</SelectItem>
                  <SelectItem value="UNBLOCK">Unblock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Device Name filter */}
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                placeholder="Search Device Name..."
                value={filters.deviceName}
                onChange={(e) =>
                  handleFilterChange("deviceName", e.target.value)
                }
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info card when no agent selected */}
      {!filters.sapBpId && (
        <Card className="text-center p-8 border-dashed">
          <Info className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Select Agent to View Stock
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Use the Agent BP filter above to load stock details for a specific
            agent.
          </p>
        </Card>
      )}

      {/* DataTable */}
      {filters.sapBpId && (
        <DataTable<AgentStockItem>
          columns={columns}
          data={stockData}
          loading={isLoading || isFetching}
          manualPagination
          pageCount={Math.ceil(totalCount / pageSize)}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
          totalCount={totalCount}
          showCount
          onRefresh={refetch}
          title="Agent Stock Details"
          subtitle="Displaying stock allocated to the selected agent"
          icon={<Package className="h-5 w-5" />}
        />
      )}

      <ParentAgentSearchModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelect={handleAgentSelect}
        isSubCollection="N"
      />

      {/* Status Update Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              Update Stock Status
            </DialogTitle>
            <DialogDescription>
              Change the status of the selected device.
            </DialogDescription>
          </DialogHeader>

          {selectedStockItem && (
            <div className="space-y-4 py-4">
              {/* Device Info */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Serial Number:</span>
                  <span className="font-mono font-medium">
                    {selectedStockItem.deviceSerialNo}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Device Name:</span>
                  <span className="font-medium">{selectedStockItem.deviceName || "-"}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Current Status:</span>
                  <Badge className={getStatusBadgeClass(selectedStockItem.status)}>
                    {selectedStockItem.status}
                  </Badge>
                </div>
              </div>

              {/* Loading state for config */}
              {isConfigLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading status options...</span>
                </div>
              ) : availableStatuses.length > 0 ? (
                /* New Status Selection */
                <div className="space-y-2">
                  <Label htmlFor="newStatus">
                    New Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                /* No transitions available */
                <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    No status transitions available for <strong>{selectedStockItem.status}</strong> status.
                    Only NEW, BLOCK, FAULTY, and UNBLOCK statuses can be updated.
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUpdateModalOpen(false);
                setSelectedStockItem(null);
                setNewStatus("");
                setAvailableStatuses([]);
              }}
              disabled={updateStockMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateStatus}
              disabled={
                !newStatus ||
                availableStatuses.length === 0 ||
                updateStockMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateStockMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
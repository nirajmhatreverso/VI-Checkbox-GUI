import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
    Package,
    RefreshCw,
    Info,
    Loader2,
    Filter as FilterIcon,
    CheckCircle2,
} from "lucide-react";
import SubagentSearchModal, {
    AgentApiItem,
} from "@/components/agents/SubagentSearchModal";
import { useAuthContext } from "@/context/AuthProvider";

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
    [key: string]: any;
}

// Default filter values (onbId will be the sub-agent's Onboarding ID)
const DEFAULT_FILTERS = {
    onbId: "",
    deviceSerialNo: "",
    material: "",
    deviceName: "",
    status: "",
};

export default function SubAgentStockOverview() {
    const { user, isAdmin } = useAuthContext();
    const [showAgentModal, setShowAgentModal] = useState(false);
    const isSubAgent = !isAdmin && !!user?.onbId;

    // Filters
    const [selectedAgent, setSelectedAgent] = useState<AgentApiItem | null>(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    // Pagination
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const {
        data: stockResponse,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["subAgentStockFilter", filters, pageIndex, pageSize],
        queryFn: () => {
            // Use the same endpoint as agent stock overview
            const payload: any = {
                sapBpId: filters.onbId, // The API still expects 'sapBpId' but we pass our onbId
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
        enabled: !!filters.onbId,
    });

    const stockData = (stockResponse?.data as any)?.agentStockDetails || [];
    const totalCount = (stockResponse?.data as any)?.totalCount || 0;

    useEffect(() => {
        if (isSubAgent && user?.onbId) {
            setSelectedAgent({
                agentName: user.name || user.username,
                sapBpId: user.onbId,
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
                onbId: user.onbId!,
            }));
        }
    }, [isSubAgent, user?.onbId]);

    const handleAgentSelect = (agent: AgentApiItem) => {
        setSelectedAgent(agent);
        setFilters({
            ...DEFAULT_FILTERS,
            onbId: agent.sapBpId, // AgentApiItem's sapBpId field contains the onbId for sub-agents
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

    const columns: DataTableColumn<AgentStockItem>[] = [
        {
            key: "deviceSerialNo",
            label: "Serial Number",
            render: (value) => (
                <span className="font-mono font-medium">{value}</span>
            ),
        },
        {
            key: "deviceName",
            label: "Device Name",
        },
        {
            key: "deviceModel",
            label: "Model",
            render: (value) => <Badge variant="outline">{value}</Badge>,
        },
        {
            key: "material",
            label: "Material Code",
            render: (value) => value,
        },
        {
            key: "deviceSubType",
            label: "Sub Type",
        },
        {
            key: "status",
            label: "Status",
            render: (value) => (
                <Badge
                    className={
                        value === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }
                >
                    {value}
                </Badge>
            ),
        },
        {
            key: "purchaseTs",
            label: "Purchase Date",
            render: (value) =>
                value ? new Date(value).toLocaleDateString() : "-",
        },
    ];

    const agentRightIcon = selectedAgent ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : undefined;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Package className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Sub agent Stock Overview</h1>
                                <p className="text-blue-100 text-xs mt-0.5">
                                    View hardware allocated to a selected sub-agent and filter by
                                    serial number, material, or status.
                                </p>
                            </div>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                            onClick={() => refetch()}
                            disabled={isFetching || !filters.onbId}
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

            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="space-y-2 relative">
                            <div className="flex items-center justify-between">
                                <Label>
                                    Sub-agent ONB ID <span className="text-red-500">*</span>
                                </Label>
                                {!isSubAgent && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setShowAgentModal(true)}
                                        title="Filter & select Sub-agent"
                                    >
                                        <FilterIcon className="h-4 w-4 text-blue-600" />
                                        <span className="ml-1 text-xs text-blue-700">Filter</span>
                                    </Button>
                                )}
                            </div>
                            <Input
                                uiSize="sm"
                                placeholder={isSubAgent ? "" : "Click Filter..."}
                                value={filters.onbId || ""}
                                readOnly
                                onClick={() => !isSubAgent && setShowAgentModal(true)}
                                className={`${isSubAgent ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer bg-gray-50"} focus:ring-0 text-sm`}
                                disabled={isSubAgent}
                                rightIcon={agentRightIcon}
                            />
                        </div>

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
                                </SelectContent>
                            </Select>
                        </div>

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

            {!filters.onbId && (
                <Card className="text-center p-8 border-dashed">
                    <Info className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Select Sub-agent to View Stock
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Use the Sub-agent ONB ID filter above to load stock details for a specific
                        sub-agent.
                    </p>
                </Card>
            )}

            {filters.onbId && (
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
                    title="Sub-agent Stock Details"
                    subtitle="Displaying stock allocated to the selected sub-agent"
                    icon={<Package className="h-5 w-5" />}
                />
            )}

            <SubagentSearchModal
                isOpen={showAgentModal}
                onClose={() => setShowAgentModal(false)}
                onSelect={handleAgentSelect}
                isSubCollection="N"
            />
        </div>
    );
}

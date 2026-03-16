import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ShieldOff, Building, Search, AlertTriangle, CheckCircle, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";

interface CenterSTBStatus {
  id: number;
  serialNumber: string;
  centerId: string;
  centerName: string;
  centerType: "WAREHOUSE" | "OTC" | "REPAIR_CENTER";
  location: string;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
  blockReason?: string;
  blockedBy?: string;
  blockDate?: Date;
  lastActivity: Date;
  model: string;
  casId: string;
  assignedTo?: string;
}

// Helpers
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

// Static sample data
const INITIAL_CENTER_STBS: CenterSTBStatus[] = [
  {
    id: 1,
    serialNumber: "STB-CN-0001",
    centerId: "WH_DAR",
    centerName: "Warehouse - Dar es Salaam",
    centerType: "WAREHOUSE",
    location: "Dar es Salaam",
    status: "ACTIVE",
    lastActivity: daysAgo(0),
    model: "HD Set-Top Box",
    casId: "CAS100100000901",
    assignedTo: "Rack A3",
  },
  {
    id: 2,
    serialNumber: "STB-CN-0002",
    centerId: "OTC_MWANZA",
    centerName: "OTC - Mwanza",
    centerType: "OTC",
    location: "Mwanza",
    status: "BLOCKED",
    blockReason: "Inventory discrepancy pending audit",
    blockedBy: "AUDIT_USER",
    blockDate: daysAgo(2),
    lastActivity: daysAgo(2),
    model: "4K Set-Top Box",
    casId: "CAS100100000902",
    assignedTo: "Counter #2",
  },
  {
    id: 3,
    serialNumber: "STB-CN-0003",
    centerId: "REPAIR_CTR",
    centerName: "Repair Center - Central",
    centerType: "REPAIR_CENTER",
    location: "Dodoma",
    status: "SUSPENDED",
    blockReason: "Under technical diagnosis",
    blockedBy: "REPAIR_SUP",
    blockDate: daysAgo(5),
    lastActivity: daysAgo(4),
    model: "HD Set-Top Box",
    casId: "CAS100100000903",
    assignedTo: "Bench #4",
  },
  {
    id: 4,
    serialNumber: "STB-CN-0004",
    centerId: "OTC_ARUSHA",
    centerName: "OTC - Arusha",
    centerType: "OTC",
    location: "Arusha",
    status: "ACTIVE",
    lastActivity: daysAgo(1),
    model: "HD Set-Top Box",
    casId: "CAS100100000904",
    assignedTo: "Counter #1",
  },
  {
    id: 5,
    serialNumber: "STB-CN-0005",
    centerId: "WH_DODOMA",
    centerName: "Warehouse - Dodoma",
    centerType: "WAREHOUSE",
    location: "Dodoma",
    status: "ACTIVE",
    lastActivity: daysAgo(3),
    model: "4K Set-Top Box",
    casId: "CAS100100000905",
    assignedTo: "Rack B1",
  },
  {
    id: 6,
    serialNumber: "STB-CN-0006",
    centerId: "WH_ARUSHA",
    centerName: "Warehouse - Arusha",
    centerType: "WAREHOUSE",
    location: "Arusha",
    status: "BLOCKED",
    blockReason: "Incorrect CAS mapping",
    blockedBy: "SYSTEM",
    blockDate: daysAgo(7),
    lastActivity: daysAgo(7),
    model: "HD Set-Top Box",
    casId: "CAS100100000906",
    assignedTo: "Quarantine Area",
  },
];

// Badge helpers
const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    case "SUSPENDED":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <CheckCircle className="w-4 h-4" />;
    case "BLOCKED":
      return <ShieldOff className="w-4 h-4" />;
    case "SUSPENDED":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Shield className="w-4 h-4" />;
  }
};

const getCenterTypeColor = (type: string) => {
  switch (type) {
    case "WAREHOUSE":
      return "bg-blue-100 text-blue-800";
    case "OTC":
      return "bg-green-100 text-green-800";
    case "REPAIR_CENTER":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const centerTypePill = (type: string) => {
  switch (type) {
    case "WAREHOUSE":
      return "bg-blue-50 text-blue-700 ring-blue-500/20";
    case "OTC":
      return "bg-green-50 text-green-700 ring-green-600/20";
    case "REPAIR_CENTER":
      return "bg-orange-50 text-orange-700 ring-orange-500/20";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-400/20";
  }
};

const statusPill = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-50 text-green-700 ring-green-600/20";
    case "BLOCKED":
      return "bg-red-50 text-red-700 ring-red-600/20";
    case "SUSPENDED":
      return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-400/20";
  }
};

export default function BlockUnblockCenter() {
  const [selectedTab, setSelectedTab] = useState("search");
  const [searchSerial, setSearchSerial] = useState("");
  const [centerSTBList, setCenterSTBList] = useState<CenterSTBStatus[]>(INITIAL_CENTER_STBS);
  const [selectedSTB, setSelectedSTB] = useState<CenterSTBStatus | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionType, setActionType] = useState<"BLOCK" | "UNBLOCK" | null>(null);

  const handleSearch = () => {
    const q = searchSerial.trim().toLowerCase();
    if (!q) return;
    const found =
      centerSTBList.find((s) => s.serialNumber.toLowerCase() === q) ||
      centerSTBList.find((s) => s.serialNumber.toLowerCase().includes(q));
    if (found) {
      setSelectedSTB(found);
      setActionType(null);
      setBlockReason("");
      toast({ title: "STB found" });
    } else {
      setSelectedSTB(null);
      toast({ title: "STB not found in center inventory", variant: "destructive" });
    }
  };

  const handleStatusUpdate = () => {
    if (!selectedSTB || !actionType) return;

    if (actionType === "BLOCK" && !blockReason.trim()) {
      toast({ title: "Please provide a block reason", variant: "destructive" });
      return;
    }

    const updated = centerSTBList.map((s) => {
      if (s.id !== selectedSTB.id) return s;
      if (actionType === "BLOCK") {
        return {
          ...s,
          status: "BLOCKED" as const,
          blockReason,
          blockedBy: "CURRENT_USER",
          blockDate: new Date(),
          lastActivity: new Date(),
        };
      } else {
        // UNBLOCK -> ACTIVE
        const { blockReason, blockedBy, blockDate, ...rest } = s as any;
        return {
          ...rest,
          status: "ACTIVE" as const,
          blockReason: undefined,
          blockedBy: undefined,
          blockDate: undefined,
          lastActivity: new Date(),
        } as CenterSTBStatus;
      }
    });

    const newSelected = updated.find((s) => s.id === selectedSTB.id) || null;
    setCenterSTBList(updated);
    setSelectedSTB(newSelected);
    setActionType(null);
    setBlockReason("");

    toast({
      title: actionType === "BLOCK" ? "Center STB blocked successfully" : "Center STB unblocked successfully",
    });
  };

  // ADD: helper functions to block/unblock directly from table actions
  const blockCenterStb = (id: number) => {
    setCenterSTBList((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "BLOCKED" as const,
              blockReason: "Blocked via table",
              blockedBy: "CURRENT_USER",
              blockDate: new Date(),
              lastActivity: new Date(),
            }
          : s
      )
    );
    toast({ title: "Center STB blocked" });
  };

  const unblockCenterStb = (id: number) => {
    setCenterSTBList((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "ACTIVE" as const,
              blockReason: undefined,
              blockedBy: undefined,
              blockDate: undefined,
              lastActivity: new Date(),
            }
          : s
      )
    );
    toast({ title: "Center STB unblocked" });
  };

  // ADD: DataTable columns & actions for center STBs
  const centerColumns: DataTableColumn<CenterSTBStatus>[] = [
    { key: "serialNumber", label: "Serial" },
    { key: "model", label: "Model" },
    { key: "centerName", label: "Center" },
    { key: "centerType", label: "Center Type" },
    { key: "location", label: "Location" },
    { key: "assignedTo", label: "Assigned To" },
    {
      key: "lastActivity",
      label: "Last Activity",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "N/A"),
    },
    {
      key: "status",
      label: "Status",
      render: (_v, item) => (
        <Badge className={getStatusColor(item.status) + " border font-semibold px-2 py-0.5 text-xs"}>
          {getStatusIcon(item.status)}
          <span className="ml-1">{item.status}</span>
        </Badge>
      ),
    },
    { key: "blockReason", label: "Block Reason" },
  ];

  const activeCenterActions: DataTableAction<CenterSTBStatus>[] = [
    {
      label: "Block",
      icon: <ShieldOff className="w-4 h-4" />,
      variant: "destructive",
      show: (item) => item.status === "ACTIVE",
      onClick: (item) => blockCenterStb(item.id),
    },
    {
      label: "Select",
      icon: <Building className="w-4 h-4" />,
      show: () => true,
      onClick: (item) => {
        setSelectedSTB(item);
        setSelectedTab("search");
        toast({ title: "Selected STB", description: item.serialNumber });
      },
    },
  ];

  const blockedCenterActions: DataTableAction<CenterSTBStatus>[] = [
    {
      label: "Unblock",
      icon: <Shield className="w-4 h-4" />,
      show: (item) => item.status === "BLOCKED",
      onClick: (item) => unblockCenterStb(item.id),
    },
    {
      label: "Select",
      icon: <Building className="w-4 h-4" />,
      show: () => true,
      onClick: (item) => {
        setSelectedSTB(item);
        setSelectedTab("search");
        toast({ title: "Selected STB", description: item.serialNumber });
      },
    },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-3 sm:p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Block / Unblock STB - Center / WH</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Manage STB device access control for centers and warehouses
            </p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        {/* Mobile-friendly Tabs: scrollable row on small screens */}
        <TabsList className="w-full flex gap-2 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
          <TabsTrigger
            value="search"
            className="flex-1 min-w-[140px] text-xs sm:text-sm data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search STB
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="flex-1 min-w-[140px] text-xs sm:text-sm data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Active STBs
          </TabsTrigger>
          <TabsTrigger
            value="blocked"
            className="flex-1 min-w-[140px] text-xs sm:text-sm data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <ShieldOff className="w-4 h-4" />
            Blocked STBs
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <TabsContent value="search" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Search className="w-5 h-5" />
                <span>Search Center STB Device</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form so Enter key submits on mobile keyboards */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="w-full"
              >
                <div className="flex flex-row items-center gap-2 w-full justify-start">
                  <div className="w-full max-w-md">
                    <Input
                      id="searchSerial"
                      value={searchSerial}
                      uiSize="sm"
                      leftIcon={<Search className="h-4 w-4" />}
                      onChange={(e) => setSearchSerial(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Enter or scan STB serial number"
                      list="serial-suggestions"
                      autoComplete="off"
                    />
                    <datalist id="serial-suggestions">
                      {centerSTBList.slice(0, 50).map((s) => (
                        <option key={s.id} value={s.serialNumber}>
                          {s.serialNumber} - {s.model}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <Button
                    type="submit"
                    size="xs"
                    variant="secondary"
                    className="w-auto"
                    aria-label="Search STB"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </form>

              {!selectedSTB && (
                <p className="text-center text-gray-500 text-xs sm:text-sm">
                  
                </p>
              )}

              {selectedSTB && (
                <Card className="mt-2">
                  <CardContent className="pt-6">
                    {/* Responsive info grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Device */}
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-azam-blue/10 rounded-lg">
                          <Building className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate">{selectedSTB.serialNumber}</h3>
                          <p className="text-sm text-gray-600 truncate">{selectedSTB.model}</p>
                          <p className="text-sm text-gray-600 truncate">CAS ID: {selectedSTB.casId}</p>
                        </div>
                      </div>

                      {/* Center info */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Center Information</p>
                        <p className="text-sm text-gray-600 truncate">ID: {selectedSTB.centerId}</p>
                        <p className="text-sm text-gray-600 truncate">Name: {selectedSTB.centerName}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <p className="text-sm text-gray-600 truncate">{selectedSTB.location}</p>
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Assignment</p>
                        <p className="text-sm text-gray-600 truncate">
                          Assigned to: {selectedSTB.assignedTo || "Unassigned"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Last Activity: {new Date(selectedSTB.lastActivity).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="text-left lg:text-right space-y-2">
                        <Badge className={getStatusColor(selectedSTB.status)}>
                          {getStatusIcon(selectedSTB.status)}
                          <span className="ml-1">{selectedSTB.status}</span>
                        </Badge>
                        <div>
                          <Badge className={getCenterTypeColor(selectedSTB.centerType)}>
                            {selectedSTB.centerType}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {selectedSTB.blockReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Block Reason:</p>
                        <p className="text-sm text-red-700">{selectedSTB.blockReason}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Blocked by: {selectedSTB.blockedBy} on{" "}
                          {selectedSTB.blockDate ? new Date(selectedSTB.blockDate).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    )}

                    <Separator className="my-4" />

                    <div className="space-y-4">
                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                          onClick={() => setActionType("BLOCK")}
                          size="xs"
                          disabled={selectedSTB.status === "BLOCKED"}
                          variant={actionType === "BLOCK" ? "default" : "outline"}
                          className="w-full sm:w-auto"
                        >
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Block STB
                        </Button>
                        <Button
                          onClick={() => setActionType("UNBLOCK")}
                          size="xs"
                          disabled={selectedSTB.status === "ACTIVE"}
                          variant={actionType === "UNBLOCK" ? "default" : "outline"}
                          className="w-full sm:w-auto"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Unblock STB
                        </Button>
                      </div>

                      {actionType === "BLOCK" && (
                        <div>
                          <Label htmlFor="blockReason">Block Reason</Label>
                          <Textarea
                            id="blockReason"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Enter reason for blocking this STB"
                            rows={3}
                          />
                        </div>
                      )}

                      {actionType && (
                        <div className="flex justify-end">
                          <Button
                            onClick={handleStatusUpdate}
                            disabled={actionType === "BLOCK" && !blockReason.trim()}
                            className="bg-azam-blue hover:bg-azam-blue/90 w-full sm:w-auto"
                          >
                            {actionType === "BLOCK" ? "Block STB" : "Unblock STB"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="space-y-4">
          <div>
            <DataTable<CenterSTBStatus>
              title="Active Center STBs"
              data={centerSTBList.filter((stb) => stb.status === "ACTIVE")}
              columns={centerColumns}
              actions={activeCenterActions}
              searchableFields={["serialNumber", "model", "centerName", "location", "assignedTo"] as (keyof CenterSTBStatus)[]}
              emptyMessage="No active center STBs found."
              enableExport
              showCount
              icon={<CheckCircle className="w-5 h-5" />}
            />
          </div>
        </TabsContent>

        {/* Blocked */}
        <TabsContent value="blocked" className="space-y-4">
          <div>
            <DataTable<CenterSTBStatus>
              title="Blocked Center STBs"
              data={centerSTBList.filter((stb) => stb.status === "BLOCKED")}
              columns={centerColumns}
              actions={blockedCenterActions}
              searchableFields={["serialNumber", "model", "centerName", "blockReason", "location"] as (keyof CenterSTBStatus)[]}
              emptyMessage="No blocked center STBs found."
              enableExport
              showCount
              icon={<ShieldOff className="w-5 h-5" />}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
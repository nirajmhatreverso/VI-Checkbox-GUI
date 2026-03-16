import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ShieldOff, User, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";

interface STBStatus {
  id: number;
  serialNumber: string;
  agentId: string;
  agentName: string;
  customerName?: string;
  customerPhone?: string;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
  blockReason?: string;
  blockedBy?: string;
  blockDate?: Date;
  lastActivity: Date;
  model: string;
  casId: string;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

const INITIAL_STBS: STBStatus[] = [
  {
    id: 1,
    serialNumber: "STB001234567",
    agentId: "AG001",
    agentName: "John Mwamba",
    customerName: "Alex Doe",
    customerPhone: "xxxx 712 000 111",
    status: "ACTIVE",
    lastActivity: daysAgo(1),
    model: "HD Set-Top Box",
    casId: "CAS100100000001",
  },
  {
    id: 2,
    serialNumber: "STB001234568",
    agentId: "AG002",
    agentName: "Mary Kimaro",
    status: "BLOCKED",
    blockReason: "Payment pending",
    blockedBy: "ADMIN_USER",
    blockDate: daysAgo(2),
    lastActivity: daysAgo(2),
    model: "4K Set-Top Box",
    casId: "CAS100100000002",
  },
  {
    id: 3,
    serialNumber: "STB001234569",
    agentId: "AG003",
    agentName: "Alpha Traders",
    status: "SUSPENDED",
    blockReason: "Compliance review",
    blockedBy: "SUPERVISOR",
    blockDate: daysAgo(5),
    lastActivity: daysAgo(4),
    model: "HD Set-Top Box",
    casId: "CAS100100000003",
  },
  {
    id: 4,
    serialNumber: "STB001234570",
    agentId: "AG004",
    agentName: "Beta Corp",
    customerName: "Jane Smith",
    customerPhone: "xxxx 713 222 333",
    status: "ACTIVE",
    lastActivity: daysAgo(0),
    model: "4K Set-Top Box",
    casId: "CAS100100000004",
  },
];

export default function BlockUnblockAgent() {
  const [selectedTab, setSelectedTab] = useState("search");
  const [searchSerial, setSearchSerial] = useState("");
  const [stbList, setStbList] = useState<STBStatus[]>(INITIAL_STBS);
  const [selectedSTB, setSelectedSTB] = useState<STBStatus | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionType, setActionType] = useState<"BLOCK" | "UNBLOCK" | null>(null);

  const handleSearch = () => {
    const q = searchSerial.trim().toLowerCase();
    if (!q) return;
    const found =
      stbList.find((s) => s.serialNumber.toLowerCase() === q) ||
      stbList.find((s) => s.serialNumber.toLowerCase().includes(q));
    if (found) {
      setSelectedSTB(found);
      setActionType(null);
      setBlockReason("");
      toast({ title: "STB found" });
    } else {
      setSelectedSTB(null);
      toast({ title: "STB not found", variant: "destructive" });
    }
  };

  const handleStatusUpdate = () => {
    if (!selectedSTB || !actionType) return;

    if (actionType === "BLOCK" && !blockReason.trim()) {
      toast({ title: "Please provide a block reason", variant: "destructive" });
      return;
    }

    const updated = stbList.map((s) => {
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
        const { blockReason, blockedBy, blockDate, ...rest } = s;
        return {
          ...rest,
          status: "ACTIVE" as const,
          blockReason: undefined,
          blockedBy: undefined,
          blockDate: undefined,
          lastActivity: new Date(),
        } as STBStatus;
      }
    });

    const newSelected = updated.find((s) => s.id === selectedSTB.id) || null;
    setStbList(updated);
    setSelectedSTB(newSelected);
    setActionType(null);
    setBlockReason("");

    toast({
      title: actionType === "BLOCK" ? "STB blocked successfully" : "STB unblocked successfully",
    });
  };

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

  // ADD: helper functions to block/unblock directly from table actions
  const blockStb = (id: number) => {
    setStbList((prev) =>
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
    toast({ title: "STB blocked" });
  };

  const unblockStb = (id: number) => {
    setStbList((prev) =>
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
    toast({ title: "STB unblocked" });
  };

  // Prepare table columns/actions (reused for both tabs)
  const stbColumns: DataTableColumn<STBStatus>[] = [
    { key: "serialNumber", label: "Serial" },
    { key: "model", label: "Model" },
    { key: "agentName", label: "Agent" },
    { key: "casId", label: "CAS ID" },
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
  ];

  const activeActions: DataTableAction<STBStatus>[] = [
    {
      label: "Block",
      icon: <ShieldOff className="w-4 h-4" />,
      variant: "destructive",
      show: (item) => item.status === "ACTIVE",
      onClick: (item) => blockStb(item.id),
    },
    {
      label: "Select",
      icon: <User className="w-4 h-4" />,
      show: () => true,
      onClick: (item) => {
        setSelectedSTB(item);
        setSelectedTab("search"); // navigate to detail/search tab
        toast({ title: "Selected STB", description: item.serialNumber });
      },
    },
  ];

  const blockedActions: DataTableAction<STBStatus>[] = [
    {
      label: "Unblock",
      icon: <Shield className="w-4 h-4" />,
      show: (item) => item.status === "BLOCKED",
      onClick: (item) => unblockStb(item.id),
    },
    {
      label: "Select",
      icon: <User className="w-4 h-4" />,
      show: () => true,
      onClick: (item) => {
        setSelectedSTB(item);
        setSelectedTab("search");
        toast({ title: "Selected STB", description: item.serialNumber });
      },
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Block / Unblock STB - Agent</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">Manage STB device access control for agents</p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search STB
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Active STBs
          </TabsTrigger>
          <TabsTrigger
            value="blocked"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2"
          >
            <ShieldOff className="w-4 h-4" />
            Blocked STBs
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <TabsContent value="search" className="space-y-6">
          <Card className="shadow-lg border-azam-blue/30">
            <CardHeader className="bg-azam-blue/10 rounded-t-lg pb-2">
              <CardTitle className="flex items-center space-x-2 text-azam-blue">
                <Search className="w-5 h-5" />
                <span>Search STB Device</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
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
                  />
                  <datalist id="serial-suggestions">
                    {stbList.slice(0, 50).map((s) => (
                      <option key={s.id} value={s.serialNumber}>
                        {s.serialNumber} - {s.model}
                      </option>
                    ))}
                  </datalist>
                </div>
                <Button
                  onClick={handleSearch}
                  size="xs"
                  variant="secondary"
                  className="w-auto"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              {selectedSTB ? (
                <div className="mt-2">
                  <Card className="border-azam-blue/30 shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-azam-blue/10 rounded-lg">
                            <User className="w-5 h-5 text-azam-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-azam-blue">{selectedSTB.serialNumber}</h3>
                            <p className="text-sm text-gray-600">{selectedSTB.model}</p>
                            <p className="text-sm text-gray-600">CAS ID: {selectedSTB.casId}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Agent</p>
                          <p className="text-sm text-gray-700">ID: {selectedSTB.agentId}</p>
                          <p className="text-sm text-gray-700">Name: {selectedSTB.agentName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Customer</p>
                          <p className="text-sm text-gray-700">{selectedSTB.customerName || "Not assigned"}</p>
                          <p className="text-sm text-gray-700">{selectedSTB.customerPhone || "N/A"}</p>
                        </div>
                        <Badge className={getStatusColor(selectedSTB.status) + " border font-semibold px-3 py-1"}>
                          {getStatusIcon(selectedSTB.status)}
                          <span className="ml-1">{selectedSTB.status}</span>
                        </Badge>
                      </div>

                      {selectedSTB.blockReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-800">Block Reason:</p>
                          <p className="text-sm text-red-700">{selectedSTB.blockReason}</p>
                          <p className="text-xs text-red-600 mt-1">
                            Blocked by: {selectedSTB.blockedBy} on {selectedSTB.blockDate ? new Date(selectedSTB.blockDate).toLocaleString() : "N/A"}
                          </p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            onClick={() => setActionType("BLOCK")}
                            size="xs"
                            disabled={selectedSTB.status === "BLOCKED"}
                            variant={actionType === "BLOCK" ? "default" : "outline"}
                          >
                            <ShieldOff className="w-4 h-4 mr-2" />
                            Block STB
                          </Button>
                          <Button
                            onClick={() => setActionType("UNBLOCK")}
                            size="xs"
                            disabled={selectedSTB.status === "ACTIVE"}
                            variant={actionType === "UNBLOCK" ? "default" : "outline"}
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
                              className="bg-azam-blue hover:bg-azam-blue/90"
                            >
                              {actionType === "BLOCK" ? "Block STB" : "Unblock STB"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="mt-4 text-center text-gray-400 text-sm">
                  <span>No STB selected. Please search by serial number.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="space-y-4">
          <div>
            <DataTable<STBStatus>
              title="Active STBs"
              data={stbList.filter((stb) => stb.status === "ACTIVE")}
              columns={stbColumns}
              actions={activeActions}
              searchableFields={["serialNumber", "agentName", "model", "casId"]}
              emptyMessage="No active STBs found."
              enableExport
              showCount
              icon={<CheckCircle className="w-5 h-5" />}
            />
          </div>
        </TabsContent>

        {/* Blocked */}
        <TabsContent value="blocked" className="space-y-4">
          <div>
            <DataTable<STBStatus>
              title="Blocked STBs"
              data={stbList.filter((stb) => stb.status === "BLOCKED")}
              columns={stbColumns}
              actions={blockedActions}
              searchableFields={["serialNumber", "agentName", "model", "blockReason", "casId"]}
              emptyMessage="No blocked STBs found."
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
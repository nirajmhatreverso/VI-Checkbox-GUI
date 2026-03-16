import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Package,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  Settings,
  FileText,
  ArrowRight,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";

// Types (local)
type ItemState = "FAULTY" | "REPAIR" | "REPAIRED";
type MaterialType = "STB" | "SMART_CARD" | "REMOTE" | "CABLE" | string;

interface FaultyInventoryItem {
  id: number;
  materialCode: string;
  materialName: string;
  materialType: MaterialType;
  serialNumber: string;
  casId?: string;
  owner: string; // agent id/code
  agentName: string;
  agentBpId?: string;
  state: ItemState;
  faultyReason: string;
  createDt: string; // ISO
}

interface FaultyRepairRecord {
  id: number;
  itemId: number;
  serialNumber: string;
  materialCode: string;
  materialName: string;
  materialType: MaterialType;
  agentName: string;
  agentId?: string; // owner
  agentBpId?: string;
  repairCenter: string;
  processedBy: string;
  repairNotes?: string;
  faultyReason: string;
  currentStatus: ItemState;
  newStatus: ItemState;
  transferDate?: string; // ISO
  processedDate?: string; // ISO
  createDt: string; // ISO
}

// Static seed data
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const INITIAL_FAULTY_INVENTORY: FaultyInventoryItem[] = [
  {
    id: 1,
    materialCode: "STB001",
    materialName: "HD Set-Top Box",
    materialType: "STB",
    serialNumber: "STB001-0001",
    casId: "CAS10010001",
    owner: "AG_BP10001",
    agentName: "John Mwamba",
    agentBpId: "BP10001",
    state: "FAULTY",
    faultyReason: "No power",
    createDt: isoDaysAgo(1),
  },
  {
    id: 2,
    materialCode: "SC001",
    materialName: "Smart Card Basic",
    materialType: "SMART_CARD",
    serialNumber: "SC001-0101",
    owner: "AG_BP10002",
    agentName: "Mary Kimaro",
    agentBpId: "BP10002",
    state: "FAULTY",
    faultyReason: "Card not recognized",
    createDt: isoDaysAgo(3),
  },
  {
    id: 3,
    materialCode: "RC001",
    materialName: "Remote Control",
    materialType: "REMOTE",
    serialNumber: "RMT001-7777",
    owner: "AG_BP10003",
    agentName: "Alpha Trader",
    agentBpId: "BP10003",
    state: "FAULTY",
    faultyReason: "Keys unresponsive",
    createDt: isoDaysAgo(5),
  },
  {
    id: 4,
    materialCode: "CBL001",
    materialName: "HDMI Cable",
    materialType: "CABLE",
    serialNumber: "HDMI-0042",
    owner: "AG_BP10001",
    agentName: "John Mwamba",
    agentBpId: "BP10001",
    state: "FAULTY",
    faultyReason: "Intermittent signal",
    createDt: isoDaysAgo(2),
  },
  {
    id: 5,
    materialCode: "STB002",
    materialName: "4K Set-Top Box",
    materialType: "STB",
    serialNumber: "STB002-0009",
    owner: "AG_BP10002",
    agentName: "Mary Kimaro",
    agentBpId: "BP10002",
    state: "FAULTY",
    faultyReason: "Overheating",
    createDt: isoDaysAgo(7),
  },
];

const INITIAL_REPAIR_HISTORY: FaultyRepairRecord[] = [
  {
    id: 9001,
    itemId: 10,
    serialNumber: "STB001-0099",
    materialCode: "STB001",
    materialName: "HD Set-Top Box",
    materialType: "STB",
    agentName: "John Mwamba",
    agentId: "AG_BP10001",
    agentBpId: "BP10001",
    repairCenter: "REPAIR_CENTER_DAR",
    processedBy: "repair_user",
    faultyReason: "No video output",
    repairNotes: "Board suspected, sent to bench",
    currentStatus: "FAULTY",
    newStatus: "REPAIR",
    transferDate: isoDaysAgo(9),
    processedDate: isoDaysAgo(9),
    createDt: isoDaysAgo(9),
  },
];

const REPAIR_CENTERS = [
  { id: "REPAIR_CENTER_DAR", name: "Repair Center - Dar es Salaam" },
  { id: "REPAIR_CENTER_MWANZA", name: "Repair Center - Mwanza" },
  { id: "REPAIR_CENTER_ARUSHA", name: "Repair Center - Arusha" },
  { id: "REPAIR_CENTER_DODOMA", name: "Repair Center - Dodoma" },
  { id: "REPAIR_CENTER_MBEYA", name: "Repair Center - Mbeya" },
];

export default function AgentFaultyRepairPage() {
  const [selectedTab, setSelectedTab] = useState("faulty-items");
  const [searchSerial, setSearchSerial] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [faultyInventory, setFaultyInventory] = useState<FaultyInventoryItem[]>(INITIAL_FAULTY_INVENTORY);
  const [repairHistory, setRepairHistory] = useState<FaultyRepairRecord[]>(INITIAL_REPAIR_HISTORY);
  const [repairData, setRepairData] = useState({
    repairCenter: "",
    repairNotes: "",
    processedBy: "current_user",
  });

  // Select/deselect tiles
  const handleItemSelect = (itemId: number) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  // Transfer selected items to REPAIR
  const handleTransferToRepair = () => {
    if (selectedItems.length === 0) {
      toast({ title: "Error", description: "Please select at least one item to transfer", variant: "destructive" });
      return;
    }
    if (!repairData.repairCenter) {
      toast({ title: "Error", description: "Please select a repair center", variant: "destructive" });
      return;
    }

    const selectedItemsData = faultyInventory.filter((item) => selectedItems.includes(item.id));
    if (selectedItemsData.length === 0) return;

    // Create history records
    const nowIso = new Date().toISOString();
    const newHistory: FaultyRepairRecord[] = selectedItemsData.map((item) => ({
      id: Date.now() + Math.floor(Math.random() * 10000),
      itemId: item.id,
      serialNumber: item.serialNumber,
      materialCode: item.materialCode,
      materialName: item.materialName,
      materialType: item.materialType,
      agentName: item.agentName,
      agentId: item.owner,
      agentBpId: item.agentBpId,
      repairCenter: repairData.repairCenter,
      processedBy: repairData.processedBy,
      repairNotes: repairData.repairNotes,
      faultyReason: item.faultyReason,
      currentStatus: item.state,
      newStatus: "REPAIR",
      transferDate: nowIso,
      processedDate: nowIso,
      createDt: nowIso,
    }));

    // Update inventory -> set state to REPAIR
    setFaultyInventory((prev) =>
      prev.map((it) => (selectedItems.includes(it.id) ? { ...it, state: "REPAIR" as ItemState } : it))
    );
    // Prepend to history
    setRepairHistory((prev) => [...newHistory, ...prev]);

    // Reset selection and form
    setSelectedItems([]);
    setRepairData({ repairCenter: "", repairNotes: "", processedBy: "current_user" });

    toast({ title: "Success", description: "Items transferred to repair status successfully" });
  };

  // Helpers: badges and icons
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FAULTY":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Faulty
          </Badge>
        );
      case "REPAIR":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Wrench className="w-3 h-3 mr-1" />
            In Repair
          </Badge>
        );
      case "REPAIRED":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Repaired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Package className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "STB":
        return <Package className="w-4 h-4 text-blue-500" />;
      case "SMART_CARD":
        return <Shield className="w-4 h-4 text-purple-500" />;
      case "REMOTE":
        return <Settings className="w-4 h-4 text-gray-500" />;
      case "CABLE":
        return <RefreshCw className="w-4 h-4 text-green-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filters
  const filteredFaultyInventory = useMemo(() => {
    const q = searchSerial.trim().toLowerCase();
    if (!q) return faultyInventory;
    return faultyInventory.filter(
      (item) =>
        item.serialNumber.toLowerCase().includes(q) ||
        item.materialName.toLowerCase().includes(q) ||
        item.agentName.toLowerCase().includes(q)
    );
  }, [faultyInventory, searchSerial]);

  const filteredRepairHistory = useMemo(() => {
    const q = searchSerial.trim().toLowerCase();
    if (!q) return repairHistory;
    return repairHistory.filter(
      (r) =>
        r.serialNumber.toLowerCase().includes(q) ||
        r.materialName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q)
    );
  }, [repairHistory, searchSerial]);

  const faultyColumns: DataTableColumn<FaultyInventoryItem>[] = [
    { key: "serialNumber", label: "Serial" },
    { key: "materialName", label: "Material" },
    { key: "materialCode", label: "Code" },
    { key: "materialType", label: "Type" },
    { key: "agentName", label: "Agent" },
    {
      key: "state",
      label: "Status",
      render: (val) => (val ? getStatusBadge(String(val)) : "-"),
    },
    { key: "faultyReason", label: "Reason" },
    {
      key: "createDt",
      label: "Date",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "-"),
    },
  ];

  const faultyActions: DataTableAction<FaultyInventoryItem>[] = [
    {
      label: "Select / Deselect",
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: (item) => handleItemSelect(item.id),
      // show always
    },
  ];

  const transferColumns: DataTableColumn<FaultyInventoryItem>[] = [
    { key: "serialNumber", label: "Serial" },
    { key: "materialName", label: "Material" },
    { key: "materialCode", label: "Code" },
    { key: "agentName", label: "Agent" },
    {
      key: "state",
      label: "Status",
      render: (val) => (val ? getStatusBadge(String(val)) : "-"),
    },
    {
      key: "createDt",
      label: "Date",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "-"),
    },
  ];

  const transferActions: DataTableAction<FaultyInventoryItem>[] = [
    {
      label: "Remove",
      icon: <XCircle className="w-4 h-4" />,
      onClick: (item) => handleItemSelect(item.id),
    },
  ];

  const historyColumns: DataTableColumn<FaultyRepairRecord>[] = [
    { key: "serialNumber", label: "Serial" },
    { key: "materialName", label: "Material" },
    { key: "materialCode", label: "Code" },
    { key: "materialType", label: "Type" },
    { key: "agentName", label: "Agent" },
    { key: "repairCenter", label: "Repair Center" },
    {
      key: "newStatus",
      label: "New Status",
      render: (val) => (val ? getStatusBadge(String(val)) : "-"),
    },
    {
      key: "transferDate",
      label: "Transfer Date",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "N/A"),
    },
    {
      key: "processedBy",
      label: "Processed By",
    },
    {
      key: "createDt",
      label: "Record Date",
      render: (val) => (val ? new Date(String(val)).toLocaleDateString() : "-"),
    },
  ];

  return (
    <div className="p-4 sm:p-6">      
       <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Agent Faulty to Repair Change</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">Update agent faulty stocks to repair status and manage repair workflow</p>
          </div>
          
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="faulty-items"
            className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
          >
            <AlertTriangle className="w-4 h-4" />
            Faulty Items
          </TabsTrigger>
          <TabsTrigger
            value="repair-transfer"
            className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
          >
            <Wrench className="w-4 h-4" />
            Transfer to Repair
          </TabsTrigger>
          <TabsTrigger
            value="repair-history"
            className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
          >
            <FileText className="w-4 h-4" />
            Repair History
          </TabsTrigger>
        </TabsList>

        {/* Faulty Items */}
        <TabsContent value="faulty-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Agent Faulty Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    uiSize="sm"
                    leftIcon={<Search className="h-4 w-4" />}
                    placeholder="Search by serial number, material name, or agent name"
                    value={searchSerial}
                    onChange={(e) => setSearchSerial(e.target.value)}
                    className="max-w-md h-7 text-xs border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                  />
                </div>

                <div>
                  <DataTable<FaultyInventoryItem>
                    title="Faulty Items"
                    data={filteredFaultyInventory}
                    columns={faultyColumns}
                    actions={faultyActions}
                    showCount
                    emptyMessage="No faulty items found"
                    enableExport
                  />
                </div>

                {selectedItems.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">{selectedItems.length} item(s) selected</p>
                        <p className="text-sm text-blue-700">Click "Transfer to Repair" tab to process these items</p>
                      </div>
                      <Button onClick={() => setSelectedTab("repair-transfer")} className="bg-azam-blue hover:bg-azam-blue/90">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Transfer to Repair
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer to Repair */}
        <TabsContent value="repair-transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Transfer Items to Repair
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No items selected for repair transfer</p>
                    <p className="text-sm text-gray-500 mt-1">Go to "Faulty Items" tab to select items for repair</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <DataTable<FaultyInventoryItem>
                        title="Selected Items"
                        data={faultyInventory.filter((item) => selectedItems.includes(item.id))}
                        columns={transferColumns}
                        actions={transferActions}
                        emptyMessage="No selected items"
                        enableExport={false}
                        showCount
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="repairCenter">Repair Center *</Label>
                        <Select
                          value={repairData.repairCenter}
                          onValueChange={(value) => setRepairData({ ...repairData, repairCenter: value })}
                        >
                          <SelectTrigger className="h-7 text-xs border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm">
                            <SelectValue placeholder="Select repair center" />
                          </SelectTrigger>
                          <SelectContent>
                            {REPAIR_CENTERS.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="processedBy">Processed By</Label>
                        <Input
                          id="processedBy"
                          value={repairData.processedBy}
                          onChange={(e) => setRepairData({ ...repairData, processedBy: e.target.value })}
                          placeholder="Enter processor name"
                          className="h-7 text-xs border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="repairNotes">Repair Notes</Label>
                      <Textarea
                        id="repairNotes"
                        value={repairData.repairNotes}
                        onChange={(e) => setRepairData({ ...repairData, repairNotes: e.target.value })}
                        placeholder="Enter repair notes and instructions"
                        rows={3}
                      />
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Transfer Process</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>1. Items will be updated from FAULTY to REPAIR status</li>
                        <li>2. Inventory records will be updated with repair center assignment</li>
                        <li>3. Repair tracking will be initiated for selected items</li>
                        <li>4. Agent stock will be updated to reflect repair status</li>
                      </ul>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedItems([]);
                          setRepairData({ repairCenter: "", repairNotes: "", processedBy: "current_user" });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleTransferToRepair} className="bg-azam-blue hover:bg-azam-blue/90">
                        Transfer to Repair
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair History */}
        <TabsContent value="repair-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Repair Transfer History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    uiSize="sm"
                    leftIcon={<Search className="h-4 w-4" />}
                    placeholder="Search by serial number, material name, or agent name"
                    value={searchSerial}
                    onChange={(e) => setSearchSerial(e.target.value)}
                    className="max-w-md h-7 text-xs border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black shadow-sm"
                  />
                </div>

                <div>
                  <DataTable<FaultyRepairRecord>
                    title="Repair History"
                    data={filteredRepairHistory}
                    columns={historyColumns}
                    emptyMessage="No repair transfer history found"
                    enableExport
                    showCount
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
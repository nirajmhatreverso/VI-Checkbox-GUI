import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, Search, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  vendorCode: string;
  orderDate: Date;
  expectedDelivery: Date;
  totalAmount: number;
  currency: string;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "CANCELLED";
  items: POItem[];
}

interface POItem {
  id: number;
  materialCode: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  totalPrice: number;
  grnStatus: "PENDING" | "PARTIAL" | "COMPLETE";
}

interface GRNEntry {
  id: number;
  grnNumber: string;
  poNumber: string;
  receivedDate: Date;
  receivedBy: string;
  items: GRNItem[];
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
}

interface GRNItem {
  materialCode: string;
  materialName: string;
  receivedQty: number;
  serialNumbers: string[];
  condition: "GOOD" | "DAMAGED" | "INCOMPLETE";
  remarks?: string;
}

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 1,
    poNumber: "PO-2024-001",
    vendorName: "StarSat Supplies",
    vendorCode: "VEND001",
    orderDate: new Date("2024-06-01"),
    expectedDelivery: new Date("2024-06-15"),
    currency: "TZS",
    totalAmount: 100 * 85000 + 200 * 4000,
    status: "PARTIALLY_RECEIVED",
    items: [
      {
        id: 11,
        materialCode: "STB001",
        materialName: "HD Set-Top Box",
        orderedQty: 100,
        receivedQty: 40,
        unitPrice: 85000,
        totalPrice: 100 * 85000,
        grnStatus: "PARTIAL",
      },
      {
        id: 12,
        materialCode: "SC001",
        materialName: "Smart Card Basic",
        orderedQty: 200,
        receivedQty: 0,
        unitPrice: 4000,
        totalPrice: 200 * 4000,
        grnStatus: "PENDING",
      },
    ],
  },
  {
    id: 2,
    poNumber: "PO-2024-002",
    vendorName: "ElectroHub Imports",
    vendorCode: "VEND002",
    orderDate: new Date("2024-06-03"),
    expectedDelivery: new Date("2024-06-18"),
    currency: "TZS",
    totalAmount: 150 * 12000 + 150 * 8000,
    status: "PENDING",
    items: [
      {
        id: 21,
        materialCode: "RMT001",
        materialName: "Remote Control",
        orderedQty: 150,
        receivedQty: 0,
        unitPrice: 12000,
        totalPrice: 150 * 12000,
        grnStatus: "PENDING",
      },
      {
        id: 22,
        materialCode: "HDMI001",
        materialName: "HDMI Cable",
        orderedQty: 150,
        receivedQty: 0,
        unitPrice: 8000,
        totalPrice: 150 * 8000,
        grnStatus: "PENDING",
      },
    ],
  },
  {
    id: 3,
    poNumber: "PO-2024-003",
    vendorName: "Tech Africa Co.",
    vendorCode: "VEND003",
    orderDate: new Date("2024-05-25"),
    expectedDelivery: new Date("2024-06-05"),
    currency: "TZS",
    totalAmount: 50 * 130000 + 100 * 7000,
    status: "FULLY_RECEIVED",
    items: [
      {
        id: 31,
        materialCode: "STB002",
        materialName: "4K Set-Top Box",
        orderedQty: 50,
        receivedQty: 50,
        unitPrice: 130000,
        totalPrice: 50 * 130000,
        grnStatus: "COMPLETE",
      },
      {
        id: 32,
        materialCode: "SC002",
        materialName: "Smart Card Premium",
        orderedQty: 100,
        receivedQty: 100,
        unitPrice: 7000,
        totalPrice: 100 * 7000,
        grnStatus: "COMPLETE",
      },
    ],
  },
];

const initialGrnEntries: GRNEntry[] = [
  {
    id: 101,
    grnNumber: "GRN-2024-0001",
    poNumber: "PO-2024-003",
    receivedDate: new Date("2024-06-05"),
    receivedBy: "warehouse_mgr",
    status: "APPROVED",
    items: [
      {
        materialCode: "STB002",
        materialName: "4K Set-Top Box",
        receivedQty: 50,
        serialNumbers: ["STB002-1001", "STB002-1002"],
        condition: "GOOD",
      },
      {
        materialCode: "SC002",
        materialName: "Smart Card Premium",
        receivedQty: 100,
        serialNumbers: ["SC002-2001", "SC002-2002"],
        condition: "GOOD",
      },
    ],
  },
  {
    id: 102,
    grnNumber: "GRN-2024-0002",
    poNumber: "PO-2024-001",
    receivedDate: new Date("2024-06-08"),
    receivedBy: "john.doe",
    status: "APPROVED",
    items: [
      {
        materialCode: "STB001",
        materialName: "HD Set-Top Box",
        receivedQty: 40,
        serialNumbers: ["STB001-0001", "STB001-0002"],
        condition: "GOOD",
      },
    ],
  },
];

// --- MOVED: helper color functions placed BEFORE DataTable to avoid hoisting/runtime error ---
function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "PARTIALLY_RECEIVED":
      return "bg-blue-100 text-blue-800";
    case "FULLY_RECEIVED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getGRNStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "PARTIAL":
      return "bg-blue-100 text-blue-800";
    case "COMPLETE":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getConditionColor(cond: string) {
  switch (cond) {
    case "GOOD":
      return "bg-green-100 text-green-800";
    case "DAMAGED":
      return "bg-red-100 text-red-800";
    case "INCOMPLETE":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
// --- end moved helpers ---

// Reusable DataTable component (supports mode="po" or mode="grn")
function DataTable({
  mode,
  poData,
  grnData,
  onOpenPO,
}: {
  mode: "po" | "grn";
  poData?: PurchaseOrder[];
  grnData?: GRNEntry[];
  onOpenPO?: (po: PurchaseOrder) => void;
}) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto bg-white rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {mode === "po" ? (
                <>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Expected</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-left">GRN Number</th>
                  <th className="px-4 py-3 text-left">PO</th>
                  <th className="px-4 py-3 text-left">Received</th>
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {mode === "po" &&
              (poData || []).map((po) => (
                <tr key={po.id} className="border-t last:border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{po.poNumber}</div>
                    <div className="text-xs text-gray-500">{po.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3">{po.vendorName}</td>
                  <td className="px-4 py-3">{new Date(po.expectedDelivery).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {po.currency} {po.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">{po.items.length}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="xs"
                      onClick={() => onOpenPO && onOpenPO(po)}
                      className="bg-azam-blue hover:bg-azam-blue/90"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}

            {mode === "grn" &&
              (grnData || []).map((grn) => (
                <tr key={grn.id} className="border-t last:border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{grn.grnNumber}</div>
                  </td>
                  <td className="px-4 py-3">{grn.poNumber}</td>
                  <td className="px-4 py-3">{new Date(grn.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{grn.receivedBy}</td>
                  <td className="px-4 py-3 text-center">{grn.items.length}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={grn.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {grn.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => toast({ title: `GRN ${grn.grnNumber}`, description: `PO ${grn.poNumber} — ${grn.items.length} items` })}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(mode === "po" ? (poData || []).length === 0 : (grnData || []).length === 0) && (
        <div className="text-center text-gray-500 py-8">No records found</div>
      )}
    </div>
  );
}

export default function POGRNUpdate() {
  const [selectedTab, setSelectedTab] = useState("search");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [grnEntries, setGrnEntries] = useState<GRNEntry[]>(initialGrnEntries);

  const [searchPO, setSearchPO] = useState("");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [grnData, setGrnData] = useState<GRNEntry | null>(null);
  const [updatingItem, setUpdatingItem] = useState<POItem | null>(null);
  const [receivedQty, setReceivedQty] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED" | "INCOMPLETE">("GOOD");
  const [remarks, setRemarks] = useState("");

  const handleSearch = () => {
    const po = purchaseOrders.find(
      (p) => p.poNumber.toLowerCase() === searchPO.trim().toLowerCase()
    ) || purchaseOrders.find(
      (p) => p.poNumber.toLowerCase().includes(searchPO.trim().toLowerCase())
    );

    if (po) {
      setSelectedPO(po);
      setGrnData({
        id: 0,
        grnNumber: `GRN${Date.now()}`,
        poNumber: po.poNumber,
        receivedDate: new Date(),
        receivedBy: "current_user",
        items: [],
        status: "DRAFT",
      });
    } else {
      setSelectedPO(null);
      setGrnData(null);
      toast({ title: "Purchase Order not found", variant: "destructive" });
    }
  };

  const handleItemUpdate = (item: POItem) => {
    setUpdatingItem(item);
    setReceivedQty("");
    setSerialNumbers("");
    setCondition("GOOD");
    setRemarks("");
  };

  const handleSubmitItemUpdate = () => {
    if (!updatingItem || !grnData) return;

    const qty = parseInt(receivedQty, 10);
    if (!qty || qty <= 0) {
      toast({ title: "Please enter a valid received quantity", variant: "destructive" });
      return;
    }

    // Remaining quantity on the PO for this item
    const remaining = updatingItem.orderedQty - updatingItem.receivedQty;
    if (qty > remaining) {
      toast({
        title: `Cannot receive more than remaining (${remaining})`,
        variant: "destructive",
      });
      return;
    }

    const serialNumbersArray = serialNumbers
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    const grnItem: GRNItem = {
      materialCode: updatingItem.materialCode,
      materialName: updatingItem.materialName,
      receivedQty: qty,
      serialNumbers: serialNumbersArray,
      condition,
      remarks,
    };

    const existingIndex = grnData.items.findIndex(
      (i) => i.materialCode === updatingItem.materialCode
    );

    if (existingIndex >= 0) {
      const updated = [...grnData.items];
      updated[existingIndex] = grnItem;
      setGrnData({ ...grnData, items: updated });
    } else {
      setGrnData({ ...grnData, items: [...grnData.items, grnItem] });
    }

    setUpdatingItem(null);
    setReceivedQty("");
    setSerialNumbers("");
    setCondition("GOOD");
    setRemarks("");
  };

  const handleSubmitGRN = () => {
    if (!grnData || !selectedPO) return;

    // Save GRN as SUBMITTED
    const newGRN: GRNEntry = {
      ...grnData,
      id: Date.now(),
      status: "SUBMITTED",
    };
    setGrnEntries((prev) => [newGRN, ...prev]);

    // Update PO items' received quantities and statuses
    const poIndex = purchaseOrders.findIndex((p) => p.poNumber === selectedPO.poNumber);
    if (poIndex >= 0) {
      const updatedPOs = [...purchaseOrders];
      const po = { ...updatedPOs[poIndex] };
      po.items = po.items.map((item) => {
        const receivedForItem = grnData.items.find((gi) => gi.materialCode === item.materialCode);
        if (!receivedForItem) return item;

        const newReceived = Math.min(item.orderedQty, item.receivedQty + receivedForItem.receivedQty);
        const grnStatus: POItem["grnStatus"] =
          newReceived === 0 ? "PENDING" : newReceived < item.orderedQty ? "PARTIAL" : "COMPLETE";

        return { ...item, receivedQty: newReceived, grnStatus };
      });

      // Derive PO status
      const allComplete = po.items.every((it) => it.grnStatus === "COMPLETE");
      const anyReceived = po.items.some((it) => it.receivedQty > 0);
      po.status = allComplete ? "FULLY_RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : "PENDING";

      updatedPOs[poIndex] = po;
      setPurchaseOrders(updatedPOs);
      setSelectedPO(po);
    }

    // Reset GRN draft for next entry
    setGrnData({
      id: 0,
      grnNumber: `GRN${Date.now() + 1}`,
      poNumber: selectedPO.poNumber,
      receivedDate: new Date(),
      receivedBy: "current_user",
      items: [],
      status: "DRAFT",
    });

    toast({ title: "GRN updated successfully" });
  };

  // helper to open PO from table (creates draft grn same as search)
  const openPOFromTable = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setGrnData({
      id: 0,
      grnNumber: `GRN${Date.now()}`,
      poNumber: po.poNumber,
      receivedDate: new Date(),
      receivedBy: "current_user",
      items: [],
      status: "DRAFT",
    });
    setSelectedTab("search");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">PO - GRN Update</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Update Goods Receipt Note (GRN) for Purchase Orders
            </p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            Search PO
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            Pending GRN
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Completed GRN
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Search Purchase Order</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex space-x-2">
                <div className="w-full md:w-1/3">
                  <Input
                  uiSize="sm"
                  leftIcon={<Search className="h-4 w-4" />}
                    id="searchPO"
                    value={searchPO}
                    onChange={(e) => setSearchPO(e.target.value)}
                    placeholder="Enter PO number e.g. PO-2024-001"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} size="xs" className="bg-azam-blue hover:bg-azam-blue/90">
                    Search
                  </Button>
                </div>
              </div>

              {selectedPO && (
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                      <CardTitle>Purchase Order: {selectedPO.poNumber}</CardTitle>
                      <Badge className={getStatusColor(selectedPO.status)}>{selectedPO.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Responsive: stack on mobile, grid on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Vendor Information</p>
                        <p className="text-sm text-gray-600">Name: {selectedPO.vendorName}</p>
                        <p className="text-sm text-gray-600">Code: {selectedPO.vendorCode}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Order Details</p>
                        <p className="text-sm text-gray-600">
                          Date: {new Date(selectedPO.orderDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expected: {new Date(selectedPO.expectedDelivery).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3">Purchase Order Items</h4>
                      {/* Responsive: 1 col on mobile, 2 on sm, 4 on md+ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {selectedPO.items.map((item) => {
                          const remaining = item.orderedQty - item.receivedQty;
                          return (
                            <Card key={item.id} className="border-l-4 border-l-azam-blue">
                              <CardContent className="pt-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{item.materialName}</p>
                                    <p className="text-sm text-gray-600">Code: {item.materialCode}</p>
                                    <p className="text-sm text-gray-600">
                                      Ordered: {item.orderedQty} | Received: {item.receivedQty} | Remaining: {remaining}
                                    </p>
                                  </div>
                                  <div className="text-left md:text-right mt-2 md:mt-0">
                                    <Badge className={getGRNStatusColor(item.grnStatus)}>{item.grnStatus}</Badge>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {selectedPO.currency} {item.totalPrice.toLocaleString()}
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => handleItemUpdate(item)}
                                      className="mt-2 bg-azam-blue hover:bg-azam-blue/90"
                                      disabled={remaining <= 0}
                                    >
                                      Update GRN
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {grnData && grnData.items.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-3">GRN Items Updated</h4>
                          <div className="space-y-2">
                            {grnData.items.map((item, index) => (
                              <Card key={index} className="border-l-4 border-l-green-500">
                                <CardContent className="pt-4">
                                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{item.materialName}</p>
                                      <p className="text-sm text-gray-600">Received: {item.receivedQty}</p>
                                      <p className="text-sm text-gray-600">
                                        Serial Numbers: {item.serialNumbers.join(", ")}
                                      </p>
                                    </div>
                                    <Badge className={getConditionColor(item.condition)}>{item.condition}</Badge>
                                  </div>
                                  {item.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">Remarks: {item.remarks}</p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          <Button onClick={handleSubmitGRN} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                            Submit GRN
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {updatingItem && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Update GRN for {updatingItem.materialName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Responsive: stack on mobile, grid on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="receivedQty">Received Quantity</Label>
                        <Input
                          id="receivedQty"
                          type="number"
                          value={receivedQty}
                          onChange={(e) => setReceivedQty(e.target.value)}
                          placeholder="Enter received quantity"
                          max={updatingItem.orderedQty - updatingItem.receivedQty}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="condition">Condition</Label>
                        <Select value={condition} onValueChange={(value: "GOOD" | "DAMAGED" | "INCOMPLETE") => setCondition(value)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GOOD">Good</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                            <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="serialNumbers">Serial Numbers (comma-separated)</Label>
                      <Textarea
                        id="serialNumbers"
                        value={serialNumbers}
                        onChange={(e) => setSerialNumbers(e.target.value)}
                        placeholder="Enter serial numbers separated by commas"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter any remarks"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
  <Button onClick={() => setUpdatingItem(null)} variant="outline">
    Cancel
  </Button>
  <Button
    onClick={handleSubmitItemUpdate}
    disabled={!receivedQty || !serialNumbers.trim()}
    className="bg-azam-blue hover:bg-azam-blue/90"
  >
    Add to GRN
  </Button>
</div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {/* REPLACED: use DataTable for pending POs */}
          <DataTable
            mode="po"
            poData={purchaseOrders.filter((po) => po.status === "PENDING" || po.status === "PARTIALLY_RECEIVED")}
            onOpenPO={openPOFromTable}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {/* REPLACED: use DataTable for approved GRN entries */}
          <DataTable mode="grn" grnData={grnEntries.filter((g) => g.status === "APPROVED")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
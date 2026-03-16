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
import { RotateCcw, Package, User, Search, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";

interface HardwareReturn {
  id: number;
  returnId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  agentId: string;
  agentName: string;
  returnDate: Date;
  expectedRefund?: number;
  actualRefund?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED" | "COMPLETED";
  items: ReturnItem[];
  reason: string;
  notes?: string;
  processedBy?: string;
  processedDate?: Date;
}

interface ReturnItem {
  id: number;
  materialCode: string;
  materialName: string;
  serialNumber: string;
  condition: "GOOD" | "DAMAGED" | "FAULTY" | "MISSING_ACCESSORIES";
  purchaseDate: Date;
  warrantyStatus: "ACTIVE" | "EXPIRED" | "VOID";
  returnReason: string;
  refundAmount: number;
  approved: boolean;
}

// Static helpers/data
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

const MATERIALS = [
  { code: "STB001", name: "Set Top Box HD" },
  { code: "STB002", name: "Set Top Box 4K" },
  { code: "SC001", name: "Smart Card" },
  { code: "RC001", name: "Remote Control" },
  { code: "PWR001", name: "Power Adapter" },
  { code: "HDMI001", name: "HDMI Cable" },
];

const MATERIAL_NAME: Record<string, string> = Object.fromEntries(
  MATERIALS.map((m) => [m.code, m.name])
);

const STATIC_CUSTOMERS = [
  { id: "CUST001", firstName: "John", lastName: "Mwamba", phone: "xxxx712000111" },
  { id: "CUST002", firstName: "Mary", lastName: "Kimaro", phone: "xxxx713333444" },
  { id: "CUST003", firstName: "Alpha", lastName: "Trader", phone: "xxxx711222333" },
];

const INITIAL_RETURNS: HardwareReturn[] = [
  {
    id: 1,
    returnId: "HR-2025-0001",
    customerId: "CUST001",
    customerName: "John Mwamba",
    customerPhone: "xxxx712000111",
    agentId: "AG001",
    agentName: "Agent Alpha",
    returnDate: daysAgo(2),
    expectedRefund: 65000,
    status: "PENDING",
    reason: "DEFECTIVE",
    notes: "STB not powering on",
    items: [
      {
        id: 1001,
        materialCode: "STB001",
        materialName: MATERIAL_NAME["STB001"],
        serialNumber: "STB001-0001",
        condition: "FAULTY",
        purchaseDate: daysAgo(30),
        warrantyStatus: "ACTIVE",
        returnReason: "No power",
        refundAmount: 65000,
        approved: false,
      },
    ],
  },
  {
    id: 2,
    returnId: "HR-2025-0002",
    customerId: "CUST002",
    customerName: "Mary Kimaro",
    customerPhone: "xxxx713333444",
    agentId: "AG002",
    agentName: "Agent Beta",
    returnDate: daysAgo(5),
    expectedRefund: 15000,
    status: "APPROVED",
    reason: "WRONG_ITEM",
    notes: "Received Smart Card instead of Remote",
    processedBy: "ops_user",
    processedDate: daysAgo(4),
    items: [
      {
        id: 1002,
        materialCode: "SC001",
        materialName: MATERIAL_NAME["SC001"],
        serialNumber: "SC001-0101",
        condition: "GOOD",
        purchaseDate: daysAgo(40),
        warrantyStatus: "ACTIVE",
        returnReason: "Wrong item shipped",
        refundAmount: 15000,
        approved: true,
      },
    ],
  },
  {
    id: 3,
    returnId: "HR-2025-0003",
    customerId: "CUST003",
    customerName: "Alpha Trader",
    customerPhone: "xxxx711222333",
    agentId: "AG003",
    agentName: "Agent Gamma",
    returnDate: daysAgo(7),
    expectedRefund: 20000,
    actualRefund: 20000,
    status: "PROCESSED",
    reason: "NOT_AS_DESCRIBED",
    notes: "Accessories missing",
    processedBy: "ops_user",
    processedDate: daysAgo(6),
    items: [
      {
        id: 1003,
        materialCode: "HDMI001",
        materialName: MATERIAL_NAME["HDMI001"],
        serialNumber: "HDMI-0009",
        condition: "MISSING_ACCESSORIES",
        purchaseDate: daysAgo(60),
        warrantyStatus: "EXPIRED",
        returnReason: "Cable not as described",
        refundAmount: 20000,
        approved: true,
      },
    ],
  },
];

export default function CustomerHardwareReturn() {
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const [selectedTab, setSelectedTab] = useState("create");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [returns, setReturns] = useState<HardwareReturn[]>(INITIAL_RETURNS);

  const [returnData, setReturnData] = useState<Partial<HardwareReturn>>({
    items: [],
    reason: "",
    notes: "",
    status: "PENDING",
  });

  const [currentItem, setCurrentItem] = useState<Partial<ReturnItem>>({
    condition: "GOOD",
    warrantyStatus: "ACTIVE",
    approved: false,
  });

  const isLoading = false; // static

  // Static: search customer locally
  const handleSearchCustomer = () => {
    const q = (searchCustomer || "").trim();
    if (!q) return;
    const found =
      STATIC_CUSTOMERS.find((c) => c.phone === q) ||
      STATIC_CUSTOMERS.find((c) => c.phone.includes(q));
    if (!found) {
      toast({ title: "Customer not found", variant: "destructive" });
      return;
    }
    setSelectedCustomer(found);
    setReturnData((prev) => ({
      ...prev,
      customerId: found.id,
      customerName: `${found.firstName} ${found.lastName}`,
      customerPhone: found.phone,
    }));
  };

  // Add item to return
  const handleAddItem = () => {
    if (!currentItem.materialCode || !currentItem.serialNumber) return;

    const materialName = MATERIAL_NAME[currentItem.materialCode] || currentItem.materialName || "Unknown";
    const refund = typeof currentItem.refundAmount === "number" ? currentItem.refundAmount : parseFloat(String(currentItem.refundAmount || 0));

    if (!currentItem.purchaseDate) {
      toast({ title: "Please select purchase date", variant: "destructive" });
      return;
    }
    if (!currentItem.returnReason) {
      toast({ title: "Please enter item return reason", variant: "destructive" });
      return;
    }

    const newItem: ReturnItem = {
      id: Date.now(),
      materialCode: currentItem.materialCode,
      materialName,
      serialNumber: currentItem.serialNumber,
      condition: currentItem.condition as ReturnItem["condition"],
      purchaseDate: currentItem.purchaseDate,
      warrantyStatus: currentItem.warrantyStatus as ReturnItem["warrantyStatus"],
      returnReason: currentItem.returnReason,
      refundAmount: isNaN(refund) ? 0 : refund,
      approved: !!currentItem.approved,
    };

    setReturnData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));

    setCurrentItem({
      condition: "GOOD",
      warrantyStatus: "ACTIVE",
      approved: false,
    });
  };

  // Submit a new return (local)
  const handleSubmitReturn = () => {
    if (!selectedCustomer) {
      toast({ title: "Select a customer first", variant: "destructive" });
      return;
    }
    if (!returnData.reason) {
      toast({ title: "Please select a return reason", variant: "destructive" });
      return;
    }
    if (!returnData.items || returnData.items.length === 0) {
      toast({ title: "Add at least one return item", variant: "destructive" });
      return;
    }
    const expectedRefund = returnData.items.reduce((sum, item) => sum + item.refundAmount, 0);
    const newReturn: HardwareReturn = {
      id: Date.now(),
      returnId: `HR${Date.now()}`,
      customerId: returnData.customerId!,
      customerName: returnData.customerName!,
      customerPhone: returnData.customerPhone!,
      agentId: returnData.agentId || "AGENT_CURRENT",
      agentName: "Current Agent",
      returnDate: new Date(),
      expectedRefund,
      actualRefund: undefined,
      status: "PENDING",
      items: returnData.items,
      reason: returnData.reason!,
      notes: returnData.notes,
    };
    setReturns((prev) => [newReturn, ...prev]);
    toast({ title: "Hardware return created successfully" });
    resetForm();
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSearchCustomer("");
    setReturnData({
      items: [],
      reason: "",
      notes: "",
      status: "PENDING",
    });
    setCurrentItem({
      condition: "GOOD",
      warrantyStatus: "ACTIVE",
      approved: false,
    });
  };

  const removeItem = (index: number) => {
    setReturnData((prev) => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index),
    }));
  };

  // Update status locally
  const updateReturnStatus = (id: number, newStatus: HardwareReturn["status"]) => {
    setReturns((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (newStatus === "REJECTED") {
          return { ...r, status: "REJECTED", processedBy: "current_user", processedDate: new Date() };
        }
        if (newStatus === "APPROVED") {
          return { ...r, status: "APPROVED", processedBy: "current_user", processedDate: new Date() };
        }
        if (newStatus === "PROCESSED") {
          return {
            ...r,
            status: "PROCESSED",
            processedBy: "current_user",
            processedDate: new Date(),
            actualRefund: r.actualRefund ?? r.expectedRefund,
          };
        }
        if (newStatus === "COMPLETED") {
          return {
            ...r,
            status: "COMPLETED",
            processedBy: "current_user",
            processedDate: new Date(),
            actualRefund: r.actualRefund ?? r.expectedRefund,
          };
        }
        return r;
      })
    );
    toast({ title: `Status updated to ${newStatus}` });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PROCESSED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "GOOD":
        return "bg-green-100 text-green-800";
      case "DAMAGED":
        return "bg-orange-100 text-orange-800";
      case "FAULTY":
        return "bg-red-100 text-red-800";
      case "MISSING_ACCESSORIES":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWarrantyColor = (warranty: string) => {
    switch (warranty) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "VOID":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "APPROVED":
        return <CheckCircle className="w-4 h-4" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4" />;
      case "PROCESSED":
        return <Package className="w-4 h-4" />;
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Add reusable ReturnsDataTable component
  function ReturnsDataTable({
    mode,
    data,
    onApprove,
    onReject,
    onProcess,
    onView,
  }: {
    mode: "pending" | "approved" | "completed";
    data: HardwareReturn[];
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onProcess?: (id: number) => void;
    onView?: (r: HardwareReturn) => void;
  }) {
    return (
      <div className="w-full">
        <div className="overflow-x-auto bg-white rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Return ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Return Date</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t last:border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.returnId}</div>
                    <div className="text-xs text-gray-500">{r.agentName}</div>
                  </td>
                  <td className="px-4 py-3">{r.customerName}</td>
                  <td className="px-4 py-3">{new Date(r.returnDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">{r.items.length}</td>
                  <td className="px-4 py-3 text-right">
                    {currentSalesOrg || ""} {((r.expectedRefund ?? r.actualRefund) ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {mode === "pending" && (
                      <>
                        <Button size="xs" variant="outline" onClick={() => onReject?.(r.id)}>
                          Reject
                        </Button>
                        <Button size="xs" className="bg-azam-blue hover:bg-azam-blue/90" onClick={() => onApprove?.(r.id)}>
                          Approve
                        </Button>
                      </>
                    )}

                    {mode === "approved" && (
                      <Button size="xs" className="bg-azam-blue hover:bg-azam-blue/90" onClick={() => onProcess?.(r.id)}>
                        Process
                      </Button>
                    )}

                    {mode === "completed" && (
                      <Button size="xs" variant="outline" onClick={() => onView?.(r)}>
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && <div className="text-center text-gray-500 py-6">No records</div>}
      </div>
    );
  }

  const pendingReturns = useMemo(
    () => returns.filter((r) => r.status === "PENDING"),
    [returns]
  );
  const approvedReturns = useMemo(
    () => returns.filter((r) => r.status === "APPROVED"),
    [returns]
  );
  const completedReturns = useMemo(
    () => returns.filter((r) => r.status === "COMPLETED" || r.status === "PROCESSED"),
    [returns]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading hardware returns...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer Hardware Return</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">Process customer hardware returns and refunds</p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Create Return
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
          >
            <Package className="w-4 h-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        {/* Create Return */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Customer Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex space-x-2 items-end">
                <div className="flex flex-col">
                  <div className="flex items-center gap-x-3">
                    <Input
                      leftIcon={<Search className="h-4 w-4" />}
                      id="searchCustomer"
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      placeholder="Enter customer phone number"
                      list="cust-suggestions"
                      className="w-auto"
                    />
                    <Button
                      size="xs"
                      onClick={handleSearchCustomer}
                      className="bg-azam-blue hover:bg-azam-blue/90"
                    >
                      Search
                    </Button>
                  </div>
                  <datalist id="cust-suggestions">
                    {STATIC_CUSTOMERS.map((c) => (
                      <option key={c.id} value={c.phone}>
                        {c.phone} - {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>


              {selectedCustomer && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="p-2 bg-azam-blue/10 rounded-lg">
                        <User className="w-5 h-5 text-azam-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {selectedCustomer.firstName} {selectedCustomer.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">Phone: {selectedCustomer.phone}</p>
                        <p className="text-sm text-gray-600">ID: {selectedCustomer.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle>Return Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Responsive: stack on mobile, grid on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <Label htmlFor="reason">Return Reason</Label>
                    <Select
                      value={returnData.reason}
                      onValueChange={(value) => setReturnData((prev) => ({ ...prev, reason: value }))}
                    >
                      <SelectTrigger className="mt-0 h-7 text-s">
                        <SelectValue placeholder="Select return reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFECTIVE">Defective Product</SelectItem>
                        <SelectItem value="WRONG_ITEM">Wrong Item Received</SelectItem>
                        <SelectItem value="DAMAGED_SHIPPING">Damaged During Shipping</SelectItem>
                        <SelectItem value="NOT_AS_DESCRIBED">Not As Described</SelectItem>
                        <SelectItem value="CUSTOMER_CHANGE_MIND">Customer Changed Mind</SelectItem>
                        <SelectItem value="UPGRADE">Upgrade Request</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="agentId">Agent ID</Label>
                    <Input
                      id="agentId"
                      value={returnData.agentId || ""}
                      onChange={(e) => setReturnData((prev) => ({ ...prev, agentId: e.target.value }))}
                      placeholder="Enter agent ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={returnData.notes || ""}
                      onChange={(e) => setReturnData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter any additional notes"
                      rows={2}
                    />
                  </div>
                </div>



                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Add Return Items</h4>
                  {/* Responsive: 1 col on mobile, 2 on sm, 6 on md+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <Label htmlFor="materialCode">Material Code</Label>
                      <Select
                        value={currentItem.materialCode}
                        onValueChange={(value) =>
                          setCurrentItem((prev) => ({
                            ...prev,
                            materialCode: value,
                            materialName: MATERIAL_NAME[value],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-0 h-7 text-s">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIALS.map((m) => (
                            <SelectItem key={m.code} value={m.code}>
                              {m.name} ({m.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="serialNumber">Serial Number</Label>
                      <Input
                        id="serialNumber"
                        value={currentItem.serialNumber || ""}
                        onChange={(e) => setCurrentItem((prev) => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="Enter serial number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition">Condition</Label>
                      <Select
                        value={currentItem.condition}
                        onValueChange={(value: any) => setCurrentItem((prev) => ({ ...prev, condition: value }))}
                      >
                        <SelectTrigger className="mt-0 h-7 text-s">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GOOD">Good</SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                          <SelectItem value="FAULTY">Faulty</SelectItem>
                          <SelectItem value="MISSING_ACCESSORIES">Missing Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="refundAmount">Refund Amount ({currentSalesOrg || ""})</Label>
                      <Input
                        id="refundAmount"
                        type="number"
                        value={currentItem.refundAmount ?? ""}
                        onChange={(e) =>
                          setCurrentItem((prev) => ({ ...prev, refundAmount: parseFloat(e.target.value) }))
                        }
                        placeholder="Enter refund amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={
                          currentItem.purchaseDate
                            ? new Date(currentItem.purchaseDate).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setCurrentItem((prev) => ({ ...prev, purchaseDate: new Date(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="returnReason">Item Return Reason</Label>
                      <Input
                        id="returnReason"
                        value={currentItem.returnReason || ""}
                        onChange={(e) => setCurrentItem((prev) => ({ ...prev, returnReason: e.target.value }))}
                        placeholder="Enter specific reason for this item"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddItem}
                    size="xs"
                    disabled={!currentItem.materialCode || !currentItem.serialNumber}
                    className="mt-4 bg-azam-blue hover:bg-azam-blue/90"
                  >
                    Add Item
                  </Button>
                </div>

                {returnData.items && returnData.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-4">Return Items</h4>
                      <div className="space-y-2">
                        {returnData.items.map((item, index) => (
                          <Card key={index} className="border-l-4 border-l-azam-blue">
                            <CardContent className="pt-4">
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">{item.materialName}</p>
                                  <p className="text-sm text-gray-600">Serial: {item.serialNumber}</p>
                                  <div className="flex space-x-2 mt-2">
                                    <Badge className={getConditionColor(item.condition)}>{item.condition}</Badge>
                                    <Badge className={getWarrantyColor(item.warrantyStatus)}>{item.warrantyStatus}</Badge>
                                  </div>
                                </div>
                                <div className="text-left md:text-right mt-2 md:mt-0">
                                  <p className="font-medium">{currentSalesOrg || ""} {item.refundAmount.toLocaleString()}</p>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => removeItem(index)}
                                    className="mt-2"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-medium text-green-800">
                          Total Expected Refund: {currentSalesOrg || ""}{" "}
                          {returnData.items
                            .reduce((sum, item) => sum + item.refundAmount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="xs"
                        onClick={handleSubmitReturn}
                        disabled={!returnData.reason}
                        className="w-full mt-4 bg-azam-blue hover:bg-azam-blue/90"
                      >
                        Submit Return Request
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="space-y-4">
          {/* REPLACED: use table for pending returns */}
          <ReturnsDataTable
            mode="pending"
            data={pendingReturns}
            onApprove={(id) => updateReturnStatus(id, "APPROVED")}
            onReject={(id) => updateReturnStatus(id, "REJECTED")}
          />
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved" className="space-y-4">
          {/* REPLACED: use table for approved returns */}
          <ReturnsDataTable
            mode="approved"
            data={approvedReturns}
            onProcess={(id) => updateReturnStatus(id, "PROCESSED")}
          />
        </TabsContent>

        {/* Completed (Processed or Completed) */}
        <TabsContent value="completed" className="space-y-4">
          {/* REPLACED: use table for completed returns */}
          <ReturnsDataTable
            mode="completed"
            data={completedReturns}
            onView={(r) =>
              toast({
                title: `${r.returnId}`,
                description: `Customer: ${r.customerName} — Items: ${r.items.length}`,
              })
            }
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
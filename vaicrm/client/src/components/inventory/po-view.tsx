import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Eye, Download, Calendar, Building, DollarSign, Package, ClipboardList, Clock, CheckCircle2, Ban } from "lucide-react";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  vendorCode: string;
  vendorAddress: string;
  vendorContact: string;
  orderDate: Date;
  expectedDelivery: Date;
  actualDelivery?: Date;
  totalAmount: number;
  currency: string;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "CANCELLED";
  createdBy: string;
  approvedBy?: string;
  approvedDate?: Date;
  items: POItem[];
  terms: string;
  notes?: string;
}

interface POItem {
  id: number;
  materialCode: string;
  materialName: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: Date;
  grnStatus: "PENDING" | "PARTIAL" | "COMPLETE";
}

// Helpers
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

// Static sample data
const INITIAL_POs: PurchaseOrder[] = [
  {
    id: 1,
    poNumber: "PO-2025-0001",
    vendorName: "Star Supplies Ltd",
    vendorCode: "STAR001",
    vendorAddress: "P.O. Box 123, Dar es Salaam, TZ",
    vendorContact: "xxxx 712 000 111",
    orderDate: daysAgo(10),
    expectedDelivery: daysAgo(3),
    actualDelivery: daysAgo(2),
    currency: "TZS",
    status: "PARTIALLY_RECEIVED",
    createdBy: "proc_user",
    approvedBy: "finance_mgr",
    approvedDate: daysAgo(9),
    items: [
      {
        id: 11,
        materialCode: "STB001",
        materialName: "HD Set-Top Box",
        description: "HD STB model Z1",
        orderedQty: 50,
        receivedQty: 50,
        unitPrice: 85000,
        totalPrice: 50 * 85000,
        deliveryDate: daysAgo(2),
        grnStatus: "COMPLETE",
      },
      {
        id: 12,
        materialCode: "SC001",
        materialName: "Smart Card Basic",
        description: "Access smart card",
        orderedQty: 100,
        receivedQty: 80,
        unitPrice: 15000,
        totalPrice: 100 * 15000,
        deliveryDate: daysAgo(1),
        grnStatus: "PARTIAL",
      },
      {
        id: 13,
        materialCode: "RMT001",
        materialName: "Remote Control",
        description: "Standard remote",
        orderedQty: 60,
        receivedQty: 60,
        unitPrice: 5000,
        totalPrice: 60 * 5000,
        deliveryDate: daysAgo(2),
        grnStatus: "COMPLETE",
      },
    ],
    totalAmount: 50 * 85000 + 100 * 15000 + 60 * 5000,
    terms:
      "Payment: 30 days net.\nDelivery to Warehouse - Dar es Salaam.\nWarranty: 12 months manufacturer warranty.",
    notes: "Ensure smart cards are packed in batches of 20.",
  },
  {
    id: 2,
    poNumber: "PO-2025-0002",
    vendorName: "Tech Warehouse Co.",
    vendorCode: "TECHW",
    vendorAddress: "Plot 45, Industrial Area, Arusha",
    vendorContact: "xxxx 713 333 444",
    orderDate: daysAgo(3),
    expectedDelivery: daysFromNow(7),
    currency: "TZS",
    status: "PENDING",
    createdBy: "buyer_01",
    items: [
      {
        id: 21,
        materialCode: "LNB-3001",
        materialName: "LNB Single",
        description: "Single LNB unit",
        orderedQty: 120,
        receivedQty: 0,
        unitPrice: 6000,
        totalPrice: 120 * 6000,
        deliveryDate: daysFromNow(7),
        grnStatus: "PENDING",
      },
      {
        id: 22,
        materialCode: "CAB-5001",
        materialName: "Coax Cable 10m",
        description: "RG6 coaxial cable",
        orderedQty: 200,
        receivedQty: 0,
        unitPrice: 2500,
        totalPrice: 200 * 2500,
        deliveryDate: daysFromNow(7),
        grnStatus: "PENDING",
      },
    ],
    totalAmount: 120 * 6000 + 200 * 2500,
    terms:
      "Payment: 45 days net.\nPartial deliveries allowed.\nAll items must include quality certificates.",
  },
  {
    id: 3,
    poNumber: "PO-2025-0003",
    vendorName: "Arusha Logistics",
    vendorCode: "ARULOG",
    vendorAddress: "Arusha CBD, TZ",
    vendorContact: "xxxx 714 222 555",
    orderDate: daysAgo(15),
    expectedDelivery: daysAgo(10),
    currency: "TZS",
    status: "CANCELLED",
    createdBy: "proc_user",
    items: [
      {
        id: 31,
        materialCode: "DST-2001",
        materialName: "Dish 60cm",
        description: "Satellite dish 60cm",
        orderedQty: 40,
        receivedQty: 0,
        unitPrice: 30000,
        totalPrice: 40 * 30000,
        deliveryDate: daysAgo(10),
        grnStatus: "PENDING",
      },
      {
        id: 32,
        materialCode: "MNT-7001",
        materialName: "Mount Kit",
        description: "Dish mounting kit",
        orderedQty: 40,
        receivedQty: 0,
        unitPrice: 8000,
        totalPrice: 40 * 8000,
        deliveryDate: daysAgo(10),
        grnStatus: "PENDING",
      },
    ],
    totalAmount: 40 * 30000 + 40 * 8000,
    terms:
      "Order cancelled prior to dispatch.\nNo charges applicable.\nFuture orders require revised lead times.",
    notes: "Cancelled due to vendor scheduling conflicts.",
  },
  {
    id: 4,
    poNumber: "PO-2025-0004",
    vendorName: "Digital Parts Ltd",
    vendorCode: "DPL001",
    vendorAddress: "Mikocheni Tech Park, DSM",
    vendorContact: "xxxx 715 555 666",
    orderDate: daysAgo(20),
    expectedDelivery: daysAgo(14),
    actualDelivery: daysAgo(13),
    currency: "TZS",
    status: "FULLY_RECEIVED",
    createdBy: "buyer_03",
    approvedBy: "cfo_user",
    approvedDate: daysAgo(19),
    items: [
      {
        id: 41,
        materialCode: "STB002",
        materialName: "4K Set-Top Box",
        description: "4K STB model X2",
        orderedQty: 30,
        receivedQty: 30,
        unitPrice: 120000,
        totalPrice: 30 * 120000,
        deliveryDate: daysAgo(13),
        grnStatus: "COMPLETE",
      },
      {
        id: 42,
        materialCode: "RMT002",
        materialName: "Remote Pro",
        description: "Enhanced remote controller",
        orderedQty: 35,
        receivedQty: 35,
        unitPrice: 7000,
        totalPrice: 35 * 7000,
        deliveryDate: daysAgo(13),
        grnStatus: "COMPLETE",
      },
    ],
    totalAmount: 30 * 120000 + 35 * 7000,
    terms:
      "Payment: 30 days net.\nDelivered to Warehouse - HQ.\nAll packaging to be recyclable.",
  },
];

// Add a reusable DataTable component
function DataTable({
  data,
  onView,
  onDownload,
  calculateProgress,
  getStatusColor,
}: {
  data: PurchaseOrder[];
  onView: (po: PurchaseOrder) => void;
  onDownload: (po: PurchaseOrder) => void;
  calculateProgress: (items: POItem[]) => number;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto bg-white rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">PO Number</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-left">Order Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Items / Progress</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((po) => (
              <tr key={po.id} className="border-t last:border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{po.poNumber}</div>
                  <div className="text-xs text-gray-500">{po.vendorCode}</div>
                </td>
                <td className="px-4 py-3">{po.vendorName}</td>
                <td className="px-4 py-3">{po.orderDate.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {po.currency} {po.totalAmount.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-2">{po.items.length} items</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-azam-blue h-2 rounded-full"
                        style={{ width: `${calculateProgress(po.items)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{calculateProgress(po.items)}%</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    size="xs"
                    onClick={() => onView(po)}
                    className="bg-azam-blue hover:bg-azam-blue/90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => onDownload(po)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center text-gray-500 py-8">No purchase orders found</div>
      )}
    </div>
  );
}

export default function POView() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [purchaseOrders] = useState<PurchaseOrder[]>(INITIAL_POs);

  const filteredPOs = useMemo(() => {
    const list = purchaseOrders.filter((po) => {
      const matchesSearch =
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

      if (selectedTab === "all") return matchesSearch;
      if (selectedTab === "pending") return matchesSearch && po.status === "PENDING";
      if (selectedTab === "received") return matchesSearch && po.status === "FULLY_RECEIVED";
      if (selectedTab === "cancelled") return matchesSearch && po.status === "CANCELLED";
      return matchesSearch;
    });
    // sort newest order date first
    return list.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  }, [purchaseOrders, searchTerm, selectedTab]);

  const getStatusColor = (status: string) => {
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
  };

  const getGRNStatusColor = (status: string) => {
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
  };

  const calculateProgress = (items: POItem[]) => {
    const totalOrdered = items.reduce((sum, item) => sum + item.orderedQty, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.receivedQty, 0);
    return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  };

  const handleViewPO = (po: PurchaseOrder) => setSelectedPO(po);

  const handleDownloadPO = (po: PurchaseOrder) => {
    const blob = new Blob([JSON.stringify(po, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${po.poNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">PO View</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">View and manage purchase orders</p>
          </div>
        </div>
      </div>

      {!selectedPO ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Search Purchase Orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <div className="flex-1">

                  <Input
                    uiSize="sm"
                    leftIcon={<Search className="h-4 w-4" />}
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter PO number or vendor name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
              >
                <ClipboardList className="w-4 h-4" />
                All POs
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="received"
                className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                Received
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-1"
              >
                <Ban className="w-4 h-4" />
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {/* REPLACED: use DataTable instead of mapping cards */}
              <div className="space-y-2">
                <DataTable
                  data={filteredPOs}
                  onView={handleViewPO}
                  onDownload={handleDownloadPO}
                  calculateProgress={calculateProgress}
                  getStatusColor={getStatusColor}
                />
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Purchase Order: {selectedPO.poNumber}</span>
              </CardTitle>
              <div className="flex flex-row gap-2 mt-2 md:mt-0">
                <Button onClick={() => handleDownloadPO(selectedPO)} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setSelectedPO(null)} variant="outline" size="sm">
                  Back to List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <Badge className={`${getStatusColor(selectedPO.status)} text-base px-3 py-1`}>
                {selectedPO.status}
              </Badge>
              <div className="text-left md:text-right">
                <p className="text-lg font-semibold">
                  {selectedPO.currency} {selectedPO.totalAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Amount</p>
              </div>
            </div>

            <Separator />

            {/* Responsive: stack on mobile, grid on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Vendor Information</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Name:</strong> {selectedPO.vendorName}
                  </p>
                  <p>
                    <strong>Code:</strong> {selectedPO.vendorCode}
                  </p>
                  <p>
                    <strong>Address:</strong> {selectedPO.vendorAddress}
                  </p>
                  <p>
                    <strong>Contact:</strong> {selectedPO.vendorContact}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Order Details</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Order Date:</strong> {selectedPO.orderDate.toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Expected Delivery:</strong> {selectedPO.expectedDelivery.toLocaleDateString()}
                  </p>
                  {selectedPO.actualDelivery && (
                    <p>
                      <strong>Actual Delivery:</strong> {selectedPO.actualDelivery.toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <strong>Created By:</strong> {selectedPO.createdBy}
                  </p>
                  {selectedPO.approvedBy && (
                    <p>
                      <strong>Approved By:</strong> {selectedPO.approvedBy}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Order Items</h4>
              <div className="space-y-3">
                {selectedPO.items.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-azam-blue">
                    <CardContent className="pt-4">
                      {/* Responsive flex: stack on mobile, row on md+ */}
                      <div className="flex flex-col md:flex-row items-start justify-between gap-2">
                        <div className="flex-1 w-full">
                          <h5 className="font-medium">{item.materialName}</h5>
                          <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                          <p className="text-sm text-gray-600">Material Code: {item.materialCode}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <p className="font-medium">Ordered Quantity</p>
                              <p className="text-gray-600">{item.orderedQty}</p>
                            </div>
                            <div>
                              <p className="font-medium">Received Quantity</p>
                              <p className="text-gray-600">{item.receivedQty}</p>
                            </div>
                            <div>
                              <p className="font-medium">Unit Price</p>
                              <p className="text-gray-600">
                                {selectedPO.currency} {item.unitPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-left md:text-right ml-0 md:ml-4 mt-4 md:mt-0">
                          <Badge className={getGRNStatusColor(item.grnStatus)}>{item.grnStatus}</Badge>
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>
                              Total: {selectedPO.currency} {item.totalPrice.toLocaleString()}
                            </strong>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Delivery: {item.deliveryDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Terms & Conditions</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{selectedPO.terms}</p>
            </div>

            {selectedPO.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedPO.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
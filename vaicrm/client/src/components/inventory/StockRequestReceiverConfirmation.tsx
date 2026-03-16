// StockRequestReceiverConfirmation.tsx
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Calendar as CalendarIcon,
  Info,
  Search,
  RefreshCw,
  SlidersHorizontal,
  X,
  CheckSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStockHistory } from "@/hooks/use-inventory-data";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

// --- Helper Functions ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const getStatusBadgeStyles = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "RELEASE_TO_RECEIVER" || s === "RELEASE_TO_RECEIVER".toLowerCase().toUpperCase()) {
    return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  }
  if (s === "SUCCESS" || s === "APPROVED" || s === "RECEIVED") {
    return "bg-green-100 text-green-700 hover:bg-green-100";
  }
  if (s === "REJECTED") {
    return "bg-red-100 text-red-700 hover:bg-red-100";
  }
  return "bg-gray-100 text-gray-700 hover:bg-gray-100";
};

// --- Types ---
type StockItemRaw = {
  srId: string;
  requestId: string;
  createDt: string;
  updateDt?: string;
  status: string;
  fromPlantName: string;
  toPlantName: string;
  fromStoreLocation: string;
  toStoreLocation: string | null;
  material: string;
  approvedItemQty: string;
  itemQty: string;
  itemType: string;
  remark: string | null;
  country: string;
  salesOrg: string;
  createId: string;
  description: string | null;
};

type ReceiverConfirmationItem = {
  id: string;
  requestId: string;
  createDt: string;
  status: string;
  fromPlant: string;
  toPlant: string;
  fromStore: string | null;
  toStore: string | null;
  material: string;
  itemType: string;
  itemQty: number;
  approvedItemQty: number;
  country: string;
  salesOrg: string;
  createId: string;
  remark: string | null;
  description: string | null;
  raw: StockItemRaw;
  actions?: never; // enables DataTable column key "actions"
};

type ReasonOption = { name: string; value: string };

// --- Filter Types ---
type FilterState = {
  requestId: string;
  fromPlantName: string;
  toPlantName: string;
  material: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "requestId" | "fromPlantName" | "toPlantName" | "material" | "dateRange";

type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

// --- Transform Data ---
function transformToReceiverItems(details: StockItemRaw[]): ReceiverConfirmationItem[] {
  return (details || []).map((item) => ({
    id: item.srId || item.requestId,
    requestId: item.requestId,
    createDt: item.createDt,
    status: item.status,
    fromPlant: item.fromPlantName,
    toPlant: item.toPlantName,
    fromStore: item.fromStoreLocation,
    toStore: item.toStoreLocation,
    material: item.material,
    itemType: item.itemType,
    itemQty: parseFloat(item.itemQty) || 0,
    approvedItemQty: parseFloat(item.approvedItemQty || "0") || 0,
    country: item.country,
    salesOrg: item.salesOrg,
    createId: item.createId,
    remark: item.remark,
    description: item.description,
    raw: item,
  }));
}

export default function StockRequestReceiverConfirmation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const shouldSendSapBpId = user?.isOtc === "Y" || user?.isMainPlant === "Y";

  // Pagination State
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // UI State
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<ReceiverConfirmationItem | null>(null);

  // Approval/Rejection Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReceiverConfirmationItem | null>(null);
  const [remark, setRemark] = useState("");
  const [reason, setReason] = useState("");
  const [confirmQty, setConfirmQty] = useState<number>(0);

  // IMPORTANT: locally hide processed rows immediately (so they disappear without waiting API)
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const hiddenKeySet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);
  const makeHideKey = (requestId: string, materialId: string) => `${requestId}||${materialId}`;

  // Filter State
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<FilterState>({
    requestId: "",
    fromPlantName: "",
    toPlantName: "",
    material: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  // Dropdowns (approvalReason / rejectReason)
  const { data: dropdownData } = useQuery({
    queryKey: ["dropdowns", "onboarding"],
    queryFn: () => apiRequest("/dropdowns/onboarding", "GET"),
    staleTime: 60 * 60 * 1000,
  });

  const approvalReasons: ReasonOption[] = useMemo(() => {
    const list = dropdownData?.data?.approvalReason || [];
    return (Array.isArray(list) ? list : []).map((item: any) => ({
      value: String(item?.value ?? ""),
      name: String(item?.name ?? item?.value ?? ""),
    }));
  }, [dropdownData]);

  const rejectReasons: ReasonOption[] = useMemo(() => {
    const list = dropdownData?.data?.rejectReason || [];
    return (Array.isArray(list) ? list : []).map((item: any) => ({
      value: String(item?.value ?? ""),
      name: String(item?.name ?? item?.value ?? ""),
    }));
  }, [dropdownData]);

  // Debounce
  const debouncedFilters = useDebounce(filters, 500);

  // API Query - Fetch RELEASE_TO_RECEIVER status
  const { data: rawData = [], isLoading, refetch } = useStockHistory({
    requestId: debouncedFilters.requestId || "",
    fromPlantName: debouncedFilters.fromPlantName || "",
    toPlantName: debouncedFilters.toPlantName || "",
    // requirement said: "release_to_receiver"
    status: "release_to_receiver",
    fromDate: debouncedFilters.fromDate,
    toDate: debouncedFilters.toDate,
    type: "SR",
    ...(shouldSendSapBpId ? { sapBpId: user?.sapBpId || null } : {}),
  });

  // Transform and filter data
  const allItems = useMemo(() => {
    let items = transformToReceiverItems(rawData);

    // hide locally processed rows immediately
    items = items.filter((it) => !hiddenKeySet.has(makeHideKey(it.requestId, it.material)));

    // Client-side material filter
    if (filters.material) {
      const search = filters.material.trim().toLowerCase();
      items = items.filter(
        (item) =>
          (item.material || "").toLowerCase().includes(search) ||
          (item.itemType || "").toLowerCase().includes(search)
      );
    }

    // Sort by date desc
    items.sort((a, b) => new Date(b.createDt).getTime() - new Date(a.createDt).getTime());
    return items;
  }, [rawData, filters.material, hiddenKeySet]);

  // Pagination
  const totalCount = allItems.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  // clamp pageIndex when rows disappear (after approve/reject)
  useEffect(() => {
    const maxIndex = Math.max(0, pageCount - 1);
    if (pageIndex > maxIndex) setPageIndex(maxIndex);
  }, [pageCount, pageIndex]);

  const pagedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [allItems, pageIndex, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters]);

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("/inventory/receiverstock-approval", "POST", payload),
    onSuccess: async (_res, variables) => {
      // ✅ immediate hide from current table (even before refetch completes)
      if (variables?.requestId && variables?.materialId) {
        const key = makeHideKey(variables.requestId, variables.materialId);
        setHiddenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }

      toast({
        title: "Confirmation Successful",
        description: `Request ${variables.requestId} has been confirmed.`,
      });

      setApproveModalOpen(false);
      setSelectedItem(null);
      setRemark("");
      setReason("");

      // ✅ refresh like other tabs
      await queryClient.invalidateQueries({ queryKey: ["inventory", "history"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Confirmation Failed",
        description: err?.data?.statusMessage || err?.message || "Somethin went wrong! Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("/inventory/receiverstock-approval", "POST", payload),
    onSuccess: async (_res, variables) => {
      // ✅ immediate hide from current table
      if (variables?.requestId && variables?.materialId) {
        const key = makeHideKey(variables.requestId, variables.materialId);
        setHiddenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }

      toast({
        title: "Rejection Successful",
        description: `Request ${variables.requestId} has been rejected.`,
      });

      setRejectModalOpen(false);
      setSelectedItem(null);
      setRemark("");
      setReason("");

      // ✅ refresh like other tabs
      await queryClient.invalidateQueries({ queryKey: ["inventory", "history"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Rejection Failed",
        description: err?.data?.statusMessage || err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleConfirm = (item: ReceiverConfirmationItem) => {
    setSelectedItem(item);
    setConfirmQty(item.approvedItemQty || item.itemQty);
    setRemark("");
    setReason("");
    setApproveModalOpen(true);
  };

  const handleReject = (item: ReceiverConfirmationItem) => {
    setSelectedItem(item);
    setConfirmQty(item.approvedItemQty || item.itemQty);
    setRemark("");
    setReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!reason) {
      toast({ title: "Please select a confirmation reason", variant: "destructive" });
      return;
    }
    if (!selectedItem) return;

    const payload = {
      requestId: selectedItem.requestId,
      materialId: selectedItem.material,
      itemType: selectedItem.itemType,
      receiverApprovedItemQty: String(confirmQty),
      status: "APPROVED",
      remark: remark || "",
      reason: reason || "",
      type: "SR"
      
    };

    confirmMutation.mutate(payload);
  };

  const handleRejectSubmit = () => {
    if (!reason) {
      toast({ title: "Please select a rejection reason", variant: "destructive" });
      return;
    }
    if (!remark.trim()) {
      toast({ title: "Please provide rejection remarks", variant: "destructive" });
      return;
    }
    if (!selectedItem) return;

    const payload = {
      requestId: selectedItem.requestId,
      materialId: selectedItem.material,
      itemType: selectedItem.itemType,
      receiverApprovedItemQty: String(confirmQty),
      status: "REJECTED",
      remark: remark || "",
      reason: reason || "",
      type: "SR"
      
    };

    rejectMutation.mutate(payload);
  };

  const handleReset = () => {
    setFilters({
      requestId: "",
      fromPlantName: "",
      toPlantName: "",
      material: "",
      fromDate: initialFrom,
      toDate: initialTo,
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    // optional: clear local hides on reset
    setHiddenKeys([]);
  };

  // Columns
  const columns: DataTableColumn<ReceiverConfirmationItem>[] = [
    {
      key: "requestId",
      label: "Request ID",
      sortable: true,
      render: (v) => <span className="font-mono font-medium text-xs">{v}</span>,
    },
    { key: "fromPlant", label: "From Plant", sortable: true },
    { key: "toPlant", label: "To Plant", sortable: true },
    {
      key: "material",
      label: "Material",
      render: (_v, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{row.itemType}</span>
          <span className="text-[10px] text-muted-foreground">{row.material}</span>
        </div>
      ),
    },
    {
      key: "approvedItemQty",
      label: "Qty",
      render: (v, row) => <span className="font-medium text-xs">{v || row.itemQty}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant="outline" className={`text-[10px] ${getStatusBadgeStyles(v)} border-transparent font-medium`}>
          {v}
        </Badge>
      ),
    },
    {
      key: "createDt",
      label: "Date",
      sortable: true,
      render: (v) => <span className="text-xs">{v}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_v, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => {
              setDetailsItem(row);
              setDetailsOpen(true);
            }}
          >
            <Info className="h-3.5 w-3.5 text-azam-blue" />
          </Button>
          <Button size="xs" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2" onClick={() => handleConfirm(row)}>
            <CheckCircle className="h-3 w-3 mr-1" /> Confirm
          </Button>
          <Button size="xs" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleReject(row)}>
            <XCircle className="h-3 w-3 mr-1" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)} className="h-8 text-xs">
            Basic
          </Button>
          <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)} className="h-8 text-xs">
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Advanced
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs">
            Reset
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Basic Filters */}
      {!useAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 border p-3 rounded-md bg-gray-50/50">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Request ID</label>
            <Input
              value={filters.requestId}
              onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
              placeholder="SR..."
              className="h-8 text-xs bg-white"
              leftIcon={<Search className="h-3 w-3" />}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Material</label>
            <Input
              value={filters.material}
              onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))}
              placeholder="Material..."
              className="h-8 text-xs bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">From Plant</label>
            <Input
              value={filters.fromPlantName}
              onChange={(e) => setFilters((f) => ({ ...f, fromPlantName: e.target.value }))}
              placeholder="Plant name..."
              className="h-8 text-xs bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs bg-white">
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {basicRange?.from ? (
                    basicRange.to ? (
                      `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}`
                    ) : (
                      format(basicRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={basicRange?.from}
                  selected={basicRange}
                  onSelect={(range) => {
                    setBasicRange(range);
                    setFilters((f) => ({
                      ...f,
                      fromDate: range?.from ? toYmd(range.from) : "",
                      toDate: range?.to ? toYmd(range.to) : "",
                    }));
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {useAdvanced && (
        <AdvancedFilters
          filters={filters}
          advFilters={advFilters}
          setAdvFilters={setAdvFilters}
          setFilters={setFilters}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            title="Pending Receiver Confirmations"
            subtitle="Confirm receipt of stock transfers"
            icon={<CheckSquare className="h-4 w-4" />}
            headerVariant="gradient"
            showCount
            totalCount={totalCount}
            data={pagedData}
            columns={columns}
            loading={isLoading}
            manualPagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-azam-blue" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              ID: <span className="font-mono text-xs text-black">{detailsItem?.requestId}</span>
            </DialogDescription>
          </DialogHeader>

          {detailsItem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Country</div>
                  <div className="font-medium">{detailsItem.country || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Sales Org</div>
                  <div className="font-medium">{detailsItem.salesOrg || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Created By</div>
                  <div className="font-medium">{detailsItem.createId || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Date</div>
                  <div className="font-medium">{detailsItem.createDt}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase">From Plant</div>
                  <div className="font-medium">{detailsItem.fromPlant}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">From Store</div>
                  <div className="font-medium">{detailsItem.fromStore || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">To Plant</div>
                  <div className="font-medium">{detailsItem.toPlant}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">To Store</div>
                  <div className="font-medium">{detailsItem.toStore || "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase">Material</div>
                  <div className="font-medium">{detailsItem.material}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Item Type</div>
                  <div className="font-medium">{detailsItem.itemType}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Approved Qty</div>
                  <div className="font-medium">{detailsItem.approvedItemQty || detailsItem.itemQty}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Status</div>
                  <Badge variant="outline" className={`mt-1 h-5 text-[10px] ${getStatusBadgeStyles(detailsItem.status)} border-transparent font-medium`}>
                    {detailsItem.status}
                  </Badge>
                </div>

                {detailsItem.description && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-xs text-gray-500 uppercase">Description</div>
                    <div className="font-medium">{detailsItem.description}</div>
                  </div>
                )}

                {detailsItem.remark && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-xs text-gray-500 uppercase">Remark</div>
                    <div className="font-medium italic">{detailsItem.remark}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleConfirm(detailsItem);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Confirm Receipt
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleReject(detailsItem);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirm Receipt
            </DialogTitle>
            <DialogDescription>
              Confirm receipt of items for request: <span className="font-mono">{selectedItem?.requestId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Material:</span>
                <span className="font-medium">{selectedItem?.itemType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Material Code:</span>
                <span className="font-mono text-xs">{selectedItem?.material}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">From:</span>
                <span>{selectedItem?.fromPlant}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-qty">
                Received Quantity <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmQty(Math.max(0, confirmQty - 1))}>
                  −
                </Button>
                <Input
                  id="confirm-qty"
                  type="number"
                  value={confirmQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    const max = selectedItem?.approvedItemQty || selectedItem?.itemQty || 0;
                    setConfirmQty(Math.min(val, max));
                  }}
                  min="0"
                  max={selectedItem?.approvedItemQty || selectedItem?.itemQty || 0}
                  className="text-center w-24"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmQty(Math.min(confirmQty + 1, selectedItem?.approvedItemQty || selectedItem?.itemQty || 0))
                  }
                >
                  +
                </Button>
                <span className="text-xs text-gray-500 ml-2">(Max: {selectedItem?.approvedItemQty || selectedItem?.itemQty || 0})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-reason">
                Confirmation Reason <span className="text-red-500">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="confirm-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {approvalReasons.map((r: ReasonOption) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-remark">Comments (Optional)</Label>
              <Textarea
                id="confirm-remark"
                placeholder="Add any comments about the received items..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmSubmit} disabled={!reason || confirmMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Delivery
            </DialogTitle>
            <DialogDescription>
              Reject delivery for request: <span className="font-mono">{selectedItem?.requestId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 p-3 rounded-md text-sm space-y-2 border border-red-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Material:</span>
                <span className="font-medium">{selectedItem?.itemType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Material Code:</span>
                <span className="font-mono text-xs">{selectedItem?.material}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expected Qty:</span>
                <span className="font-medium">{selectedItem?.approvedItemQty || selectedItem?.itemQty}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-qty">
                Rejected Quantity <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmQty(Math.max(0, confirmQty - 1))}>
                  −
                </Button>
                <Input
                  id="reject-qty"
                  type="number"
                  value={confirmQty}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    const max = selectedItem?.approvedItemQty || selectedItem?.itemQty || 0;
                    setConfirmQty(Math.min(val, max));
                  }}
                  min="0"
                  max={selectedItem?.approvedItemQty || selectedItem?.itemQty || 0}
                  className="text-center w-24"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmQty(Math.min(confirmQty + 1, selectedItem?.approvedItemQty || selectedItem?.itemQty || 0))
                  }
                >
                  +
                </Button>
                <span className="text-xs text-gray-500 ml-2">(Max: {selectedItem?.approvedItemQty || selectedItem?.itemQty || 0})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reject-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {rejectReasons.map((r: ReasonOption) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-remark">
                Comments <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-remark"
                placeholder="Please describe the issue..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!reason || !remark.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Advanced Filters Component ---
function AdvancedFilters({ advFilters, setAdvFilters, setFilters, initialFrom, initialTo }: any) {
  const FIELDS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    { value: "material", label: "Material", type: "text" },
    { value: "fromPlantName", label: "From Plant", type: "text" },
    { value: "toPlantName", label: "To Plant", type: "text" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addFilter = (field: string) => {
    if (advFilters.some((f: any) => f.field === field)) return;

    const newF = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined,
    };
    setAdvFilters((prev: any) => [...prev, newF]);
  };

  const removeFilter = (id: string) => setAdvFilters((prev: any) => prev.filter((f: any) => f.id !== id));

  useEffect(() => {
    const next: any = {
      requestId: "",
      fromPlantName: "",
      toPlantName: "",
      material: "",
      fromDate: initialFrom,
      toDate: initialTo,
    };

    advFilters.forEach((f: any) => {
      if (f.field === "dateRange" && f.dateRange?.from) {
        next.fromDate = toYmd(f.dateRange.from);
        next.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
      } else {
        next[f.field] = f.value;
      }
    });
    setFilters(next);
  }, [advFilters, initialFrom, initialTo, setFilters]);

  return (
    <div className="border p-3 rounded-md space-y-3 bg-gray-50/50">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Add Filter:</span>
        <Select onValueChange={addFilter}>
          <SelectTrigger className="h-7 text-xs w-48 bg-white">
            <SelectValue placeholder="Select field..." />
          </SelectTrigger>
          <SelectContent>
            {FIELDS.map((f) => {
              const isDisabled = advFilters.some((af: any) => af.field === f.value);
              return (
                <SelectItem key={f.value} value={f.value} disabled={isDisabled}>
                  {f.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-gray-400 italic">No active filters</div>}
        {advFilters.map((af: any) => {
          const def = FIELDS.find((f) => f.value === af.field);
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center bg-white p-1 rounded border">
              <div className="col-span-4 sm:col-span-3 text-xs font-medium px-2">{def?.label}</div>
              <div className="col-span-7 sm:col-span-8">
                {def?.type === "text" && (
                  <Input
                    className="h-7 text-xs border-none shadow-none focus-visible:ring-0"
                    placeholder={`Enter ${def?.label}...`}
                    value={af.value}
                    onChange={(e) =>
                      setAdvFilters((prev: any) => prev.map((p: any) => (p.id === af.id ? { ...p, value: e.target.value } : p)))
                    }
                  />
                )}
                {def?.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-left h-7 text-xs px-2">
                        {af.dateRange?.from
                          ? `${format(af.dateRange.from, "MMM dd")} - ${af.dateRange.to ? format(af.dateRange.to, "MMM dd") : "..."}`
                          : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={af.dateRange?.from}
                        selected={af.dateRange}
                        onSelect={(range) =>
                          setAdvFilters((prev: any) => prev.map((p: any) => (p.id === af.id ? { ...p, dateRange: range } : p)))
                        }
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFilter(af.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Upload, Download, Loader2, SlidersHorizontal, X, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useDebounce } from "@/hooks/use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

// --- Helper Functions ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type HwSaleItem = {
  isFileUpload?: "Y" | "N" | null;
  [key: string]: any;
};

// --- Filter Types ---
type DeliveryFilters = {
  requestId: string;
  sapBpId: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "requestId" | "sapBpId" | "dateRange";
type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function HardwareSaleDelivery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // --- User Role Detection ---
  const isAdminUser = user?.allAccess === "Y";
  const isMainPlantUser = user?.isMainPlant === "Y";
  const isNonAdmin = !isAdminUser;
  const loggedInUserBpId = user?.sapBpId || "";



  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  // --- State for Filtering ---
  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<DeliveryFilters>({
    requestId: "",
    sapBpId: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);

  // CHANGED: Don't debounce sapBpId for non-admin users
  const debouncedRequestId = useDebounce(filters.requestId, 500);
  const debouncedSapBpId = useDebounce(filters.sapBpId, 500);

  // Effect to set sapBpId for non-admin users
  useEffect(() => {
    if (user && isNonAdmin && loggedInUserBpId) {

      setFilters((prev) => ({
        ...prev,
        sapBpId: loggedInUserBpId
      }));
    }
  }, [user, isNonAdmin, loggedInUserBpId]);

  // UPDATED: Build the final payload based on current user state
  const buildQueryPayload = () => {
    // For non-admin users, ALWAYS use their logged-in BP ID
    const sapBpIdToSend = isNonAdmin && loggedInUserBpId
      ? loggedInUserBpId
      : (debouncedSapBpId || null);

    const payload = {
      requestId: debouncedRequestId || null,
      sapBpId: sapBpIdToSend,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      status: "SUCCESS",
      module: "AGENT",
      requestType: "HARDWARE_SALE",
    };



    return payload;
  };

  // Query with proper sapBpId handling
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hw-delivery-queue-agent", debouncedRequestId, debouncedSapBpId, filters.fromDate, filters.toDate, loggedInUserBpId, isNonAdmin],
    queryFn: () => apiRequest('/agent-hardware-sales/details', 'POST', buildQueryPayload()),
    enabled: !!user && (isAdminUser || (isNonAdmin && !!loggedInUserBpId)), // Only run when we have the required data
    staleTime: 60_000,
  });

  const uploadMutation = useMutation({
    mutationFn: (vars: { row: HwSaleItem; file: File }) => {
      const formData = new FormData();
      formData.append("excelFile", vars.file);
      const jsonData = {
        requestId: vars.row.requestId,
        material: vars.row.material,
        operation: "AGENT_HW",
      };
      formData.append(
        "uploadSerialNoRequest",
        new Blob([JSON.stringify(jsonData)], { type: "application/json" })
      );
      return apiRequest('/agent-hardware-sales/upload-serials', 'POST', formData);
    },
    onSuccess: (res, vars) => {
      toast({
        title: "Upload Successful",
        description: res.statusMessage || `Serials for ${vars.row.itemType} have been uploaded.`,
      });
      setSelectedFiles((prev) => ({ ...prev, [getUniqueRowKey(vars.row)]: null }));
      queryClient.invalidateQueries({ queryKey: ["hw-delivery-queue-agent"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.statusMessage || error.message || "An internal error occurred during file upload.",
        variant: "destructive",
      });
    },
  });

  const getUniqueRowKey = (row: HwSaleItem) => `${row.requestId}-${row.material}`;

  const handleFileChange = (row: HwSaleItem, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFiles((prev) => ({ ...prev, [getUniqueRowKey(row)]: file }));
  };

  const handleDownloadTemplate = () => {
    const data = [{ SR_NO: "" }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SerialNumbers");
    XLSX.writeFile(workbook, "serial_number_template.xlsx");
  };

  const deliveryItems = useMemo((): HwSaleItem[] => {
    return (data?.data?.hwOrderDetails || []).filter(
      (item: HwSaleItem) => item.status === "SUCCESS" && !item.itemSerialNo && Number(item.itemQty) !== 1
    );
  }, [data]);

  const handleSearch = () => {

    refetch();
  };

  const handleReset = () => {

    setFilters({
      requestId: "",
      sapBpId: isNonAdmin ? loggedInUserBpId : "",
      fromDate: initialFrom,
      toDate: initialTo
    });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  const columns: DataTableColumn<HwSaleItem>[] = [
    { key: "requestId", label: "Request ID" },
    { key: "sapBpId", label: "Agent BP" },
    { key: "itemType", label: "Item" },
    {
      key: "itemQty",
      label: "Qty",
      render: (value) => String(value || 0)
    },
    {
      key: "status",
      label: "Status",
      render: (status) => <Badge variant="success">{status}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_v, row) => {
        const uniqueKey = getUniqueRowKey(row);
        const isUploading = uploadMutation.isPending && uploadMutation.variables?.row.requestId === row.requestId && uploadMutation.variables?.row.material === row.material;
        const selectedFile = selectedFiles[uniqueKey];
        const isUploadEnabled = row.isFileUpload === "N";

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="xs" variant="outline" disabled={!isUploadEnabled}>
              <label className={`cursor-pointer ${!isUploadEnabled ? "pointer-events-none opacity-50" : ""}`}>
                <Upload className="h-3 w-3 mr-1" /> Choose File
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={(e) => handleFileChange(row, e)}
                  disabled={!isUploadEnabled}
                />
              </label>
            </Button>
            <Button
              size="xs"
              disabled={!selectedFile || isUploading || !isUploadEnabled}
              onClick={() => { if (selectedFile) { uploadMutation.mutate({ row, file: selectedFile }); } }}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload"}
            </Button>
            {selectedFile && <span className="text-xs text-muted-foreground truncate" title={selectedFile.name}>{selectedFile.name}</span>}
          </div>
        );
      },
    },
  ];

  const errorMessage = "Failed to load items for delivery.";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-azam-blue" />
              Hardware Delivery Queue
              {/* DEBUG: Show current user type */}
              <span className="text-xs text-muted-foreground ml-2">
                ({isAdminUser ? "Admin" : isMainPlantUser ? "Main Plant" : "Agent"} | BP: {loggedInUserBpId || "N/A"})
              </span>
            </CardTitle>
            <CardDescription>Upload serial numbers for approved hardware sale items.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant={!useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button>
            <Button variant={useAdvanced ? "default" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
            <Button size="sm" onClick={handleSearch}>Search</Button>
          </div>
        </div>

        {!useAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border p-2 rounded-md">
            <div>
              <LabelSmall>Request ID</LabelSmall>
              <Input
                value={filters.requestId}
                onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))}
                placeholder="HS..."
                className="h-7 text-xs"
              />
            </div>
            {isAdminUser && (
              <div>
                <LabelSmall>SAP BP ID</LabelSmall>
                <Input
                  value={filters.sapBpId}
                  onChange={(e) => setFilters((f) => ({ ...f, sapBpId: e.target.value }))}
                  placeholder="100..."
                  className="h-7 text-xs"
                />
              </div>
            )}
            {/* DEBUG: Show current filter value for non-admin */}
            {!isAdminUser && (
              <div>
                <LabelSmall>Your BP ID (Auto-filtered)</LabelSmall>
                <Input
                  value={loggedInUserBpId}
                  readOnly
                  className="h-7 text-xs bg-gray-100"
                />
              </div>
            )}
            <div className={isAdminUser ? "md:col-span-2" : "md:col-span-2"}>
              <LabelSmall>Date Range</LabelSmall>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd, y")} - ${format(basicRange.to, "LLL dd, y")}` : format(basicRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar initialFocus mode="range" defaultMonth={basicRange?.from} selected={basicRange}
                    onSelect={(range) => {
                      setBasicRange(range);
                      setFilters((f) => ({ ...f, fromDate: range?.from ? toYmd(range.from) : "", toDate: range?.to ? toYmd(range.to) : "" }));
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {useAdvanced && (
          <AdvancedFiltersComponent
            advFilters={advFilters}
            setAdvFilters={setAdvFilters}
            setFilters={setFilters}
            initialFrom={initialFrom}
            initialTo={initialTo}
            isAdminUser={isAdminUser}
            loggedInUserBpId={isNonAdmin ? loggedInUserBpId : ""}
          />
        )}

        <DataTable
          title="Pending Serial Uploads"
          data={deliveryItems}
          columns={columns}
          loading={isLoading}
          error={isError ? errorMessage : undefined}
          showCount
          totalCount={deliveryItems.length}
          headerVariant="gradient"
        />
      </CardContent>
    </Card>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700">{children}</label>
);

function AdvancedFiltersComponent({
  advFilters,
  setAdvFilters,
  setFilters,
  initialFrom,
  initialTo,
  isAdminUser,
  loggedInUserBpId,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<DeliveryFilters>>;
  initialFrom: string;
  initialTo: string;
  isAdminUser: boolean;
  loggedInUserBpId: string;
}) {
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    ...(isAdminUser ? [{ value: "sapBpId" as FilterFieldKey, label: "SAP BP ID", type: "text" as const }] : []),
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    if (field === "dateRange" && advFilters.some((f) => f.field === "dateRange")) return;
    const newFilter: AdvancedFilter = {
      id: `${field}-${Date.now()}`,
      field,
      value: "",
      dateRange: field === "dateRange" ? { from: new Date(initialFrom), to: new Date(initialTo) } : undefined,
    };
    setAdvFilters((prev) => [...prev, newFilter]);
  };

  const removeAdvFilter = (id: string) => setAdvFilters((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    const nextFilters: DeliveryFilters = {
      requestId: "",
      sapBpId: loggedInUserBpId,
      fromDate: initialFrom,
      toDate: initialTo
    };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "requestId": nextFilters.requestId = f.value || ""; break;
        case "sapBpId":
          if (isAdminUser) {
            nextFilters.sapBpId = f.value || "";
          }
          break;
        case "dateRange":
          if (f.dateRange?.from) {
            nextFilters.fromDate = toYmd(f.dateRange.from);
            nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    setFilters(nextFilters);
  }, [advFilters, setFilters, initialFrom, initialTo, isAdminUser, loggedInUserBpId]);

  return (
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Select onValueChange={(v: FilterFieldKey) => addAdvFilter(v)}>
          <SelectTrigger className="h-7 text-xs w-56"><SelectValue placeholder="Choose field..." /></SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground">No advanced filters added.</div>}
        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Input value={fieldMeta.label} readOnly className="h-7 text-xs bg-gray-50" />
              </div>
              <div className="col-span-8">
                {fieldMeta.type === "text" && (
                  <Input className="h-7 text-xs" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder="Enter value..." />
                )}
                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-7 text-xs">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {af.dateRange?.from ? (af.dateRange.to ? `${format(af.dateRange.from, "LLL dd, y")} - ${format(af.dateRange.to, "LLL dd, y")}` : format(af.dateRange.from, "LLL dd, y")) : <span>Pick a range</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdvFilter(af.id)}><X className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
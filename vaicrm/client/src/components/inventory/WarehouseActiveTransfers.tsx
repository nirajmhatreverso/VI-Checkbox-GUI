import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, SlidersHorizontal, X, Calendar as CalendarIcon, Search, RefreshCw, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useDebounce } from "@/hooks/use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

// --- Helper Functions ---
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysAgoYmd = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

type StockItem = {
  requestId: string;
  material: string;
  itemType: string;
  createDt: string;
  fromPlantName: string;
  toPlantName: string;
  itemQty: string;
  status: string;
  isFileUpload: string;
  [key: string]: any;
};

// --- Updated Filter Types ---
type ActiveTransferFilters = {
  requestId: string;
  material: string;
  fromPlant: string;
  toPlant: string;
  fromDate: string;
  toDate: string;
};

type FilterFieldKey = "requestId" | "material" | "fromPlant" | "toPlant" | "dateRange";

type AdvancedFilter = {
  id: string;
  field: FilterFieldKey;
  value?: string;
  dateRange?: DateRange;
};

export default function WarehouseActiveTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<StockItem | null>(null);

  // --- Pagination State ---
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // --- State for Filtering ---
  const [useAdvanced, setUseAdvanced] = useState(false);
  const initialFrom = daysAgoYmd(30);
  const initialTo = todayYmd();

  const [filters, setFilters] = useState<ActiveTransferFilters>({
    requestId: "",
    material: "",
    fromPlant: "",
    toPlant: "",
    fromDate: initialFrom,
    toDate: initialTo,
  });

  const [basicRange, setBasicRange] = useState<DateRange | undefined>({
    from: new Date(initialFrom),
    to: new Date(initialTo),
  });

  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500);

  // Reset pagination when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedFilters]);

  // Fetch Data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["warehouse-active-queue", debouncedFilters],
    queryFn: () => apiRequest('/inventory/history', 'POST', {
      requestId: debouncedFilters.requestId || null,
      material: debouncedFilters.material || null,
      fromDate: debouncedFilters.fromDate,
      toDate: debouncedFilters.toDate,
      status: "",
      type: "WT"
    }),
    staleTime: 60_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (vars: { row: StockItem; file: File }) => {
      const formData = new FormData();
      formData.append("excelFile", vars.file);
      const jsonData = {
        requestId: vars.row.requestId,
        material: vars.row.material,
      };
      formData.append("stockSerialNoUploadRequest", JSON.stringify(jsonData));
      return apiRequest('/inventory/upload-serials', 'POST', formData);
    },
    onSuccess: (res, vars) => {
      if (res && (res.status === "SUCCESS" || res.status === 200 || res.statusMessage?.includes("Success"))) {
        toast({
          title: "Upload Successful",
          description: `Serials for ${vars.row.material} have been uploaded.`,
        });
        setSelectedFiles((prev) => {
          const next = { ...prev };
          delete next[getUniqueRowKey(vars.row)];
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["warehouse-active-queue"] });
      } else {
        toast({
          title: "Upload Warning",
          description: res.statusMessage || "Upload completed with warnings.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.statusMessage || error.message || "An internal error occurred.",
        variant: "destructive",
      });
    },
  });

  const getUniqueRowKey = (row: StockItem) => `${row.requestId}-${row.material}`;

  const handleFileChange = (row: StockItem, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFiles((prev) => ({ ...prev, [getUniqueRowKey(row)]: file }));
  };

  const handleDownloadTemplate = () => {
    const data = [{ SR_NO: "SN001" }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SerialNumbers");
    XLSX.writeFile(workbook, "warehouse_serial_template.xlsx");
  };

  // --- Client-Side Filtering ---
  const activeItems = useMemo((): StockItem[] => {
    const rawList = data?.stockDetails || data?.data?.stockDetails || [];

    return rawList.filter((item: StockItem) => {
      const qty = Number(item.itemQty);

      // 1. Fundamental Active Check
      const isActive = (
        item.isFileUpload === "N" &&
        item.status === "APPROVED" &&
        qty > 0
      );
      if (!isActive) return false;

      // 2. Request ID Filter
      if (filters.requestId) {
        if (!item.requestId?.toLowerCase().includes(filters.requestId.toLowerCase())) {
          return false;
        }
      }

      // 3. Material Filter
      if (filters.material) {
        const search = filters.material.toLowerCase();
        const matCode = (item.material || "").toLowerCase();
        const matName = (item.itemType || "").toLowerCase();
        if (!matCode.includes(search) && !matName.includes(search)) {
          return false;
        }
      }

      // 4. From Plant Filter
      if (filters.fromPlant) {
        const search = filters.fromPlant.toLowerCase();
        if (!item.fromPlantName?.toLowerCase().includes(search)) {
          return false;
        }
      }

      // 5. To Plant Filter
      if (filters.toPlant) {
        const search = filters.toPlant.toLowerCase();
        if (!item.toPlantName?.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Calculate Pagination
  const totalCount = activeItems.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const pagedData = useMemo(() => {
    const start = pageIndex * pageSize;
    return activeItems.slice(start, start + pageSize);
  }, [activeItems, pageIndex, pageSize]);

  const handleSearch = () => refetch();

  const handleReset = () => {
    setFilters({ requestId: "", material: "", fromPlant: "", toPlant: "", fromDate: initialFrom, toDate: initialTo });
    setBasicRange({ from: new Date(initialFrom), to: new Date(initialTo) });
    setAdvFilters([]);
    setUseAdvanced(false);
    setTimeout(() => refetch(), 100);
  };

  const columns: DataTableColumn<StockItem>[] = [
    { key: "requestId", label: "Request ID", sortable: true, render: (v) => <span className="font-mono font-medium">{v}</span> },
    { key: "createDt", label: "Date", sortable: true },
    { key: "fromPlantName", label: "From", sortable: true },
    { key: "toPlantName", label: "To", sortable: true },
    {
      key: "material",
      label: "Material",
      sortable: true,
      render: (_v, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{row.itemType}</span>
          <span className="text-[10px] text-muted-foreground">{row.material}</span>
        </div>
      )
    },
    {
      key: "itemQty",
      label: "Qty",
      render: (value) => <span className="font-bold">{String(value || 0)}</span>
    },
    {
      key: "actions",
      label: "Actions",
      render: (_v, row) => {
        const uniqueKey = getUniqueRowKey(row);
        const isUploading = uploadMutation.isPending && uploadMutation.variables?.row.requestId === row.requestId && uploadMutation.variables?.row.material === row.material;
        const selectedFile = selectedFiles[uniqueKey];

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                setDetailsItem(row);
                setDetailsOpen(true);
              }}
            >
              <Info className="h-4 w-4 text-azam-blue" />
            </Button>

            <Button asChild size="xs" variant="outline" className="h-7 text-xs">
              <label className="cursor-pointer">
                <Upload className="h-3 w-3 mr-1" /> Select
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileChange(row, e)} />
              </label>
            </Button>

            <Button
              size="xs"
              className="h-7 text-xs bg-azam-blue text-white hover:bg-azam-blue/90"
              disabled={!selectedFile || isUploading}
              onClick={() => { if (selectedFile) { uploadMutation.mutate({ row, file: selectedFile }); } }}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload"}
            </Button>

            {selectedFile && (
              <div className="flex items-center max-w-[120px] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                <span className="text-[10px] text-blue-700 truncate" title={selectedFile.name}>{selectedFile.name}</span>
                <X className="w-3 h-3 ml-1 text-blue-400 cursor-pointer hover:text-red-500" onClick={() => setSelectedFiles(p => { const n = { ...p }; delete n[uniqueKey]; return n; })} />
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 space-y-4">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-azam-blue" />
              Pending Serial Uploads
            </h3>
            <p className="text-sm text-muted-foreground">Upload serial numbers for approved active transfers.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="text-xs">
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-2 rounded-md border">
          <div className="flex items-center gap-2">
            <Button variant={!useAdvanced ? "default" : "ghost"} size="sm" onClick={() => setUseAdvanced(false)} className={`h-8 text-xs ${!useAdvanced ? "bg-azam-blue text-white" : ""}`}>Basic</Button>
            <Button variant={useAdvanced ? "default" : "ghost"} size="sm" onClick={() => setUseAdvanced(true)} className={`h-8 text-xs ${useAdvanced ? "bg-azam-blue text-white" : ""}`}><SlidersHorizontal className="h-3 w-3 mr-1" />Advanced</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReset} className="h-8 text-xs">Reset</Button>
            <Button size="sm" onClick={handleSearch} className="h-8 text-xs bg-azam-blue hover:bg-azam-blue/90 text-white flex items-center gap-1">
              <Search className="w-3 h-3" /> Search
            </Button>
          </div>
        </div>

        {!useAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border p-3 rounded-md">
            <div>
              <LabelSmall>Request ID</LabelSmall>
              <Input value={filters.requestId} onChange={(e) => setFilters((f) => ({ ...f, requestId: e.target.value }))} placeholder="WT..." className="h-8 text-xs" />
            </div>
            <div>
              <LabelSmall>Material</LabelSmall>
              <Input value={filters.material} onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))} placeholder="Product Name or ID..." className="h-8 text-xs" />
            </div>
            <div className="md:col-span-2">
              <LabelSmall>Date Range</LabelSmall>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {basicRange?.from ? (basicRange.to ? `${format(basicRange.from, "LLL dd")} - ${format(basicRange.to, "LLL dd")}` : format(basicRange.from, "LLL dd")) : <span>Pick a range</span>}
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
          <AdvancedFiltersComponent advFilters={advFilters} setAdvFilters={setAdvFilters} setFilters={setFilters} initialFrom={initialFrom} initialTo={initialTo} />
        )}

        <DataTable
          title="Active Transfers"
          subtitle="Items awaiting serial number upload"
          data={pagedData}
          columns={columns}
          loading={isLoading}
          showCount
          totalCount={totalCount}
          headerVariant="gradient"
          manualPagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-azam-blue" />
                Item Details
              </DialogTitle>
              <DialogDescription>
                Request ID: <span className="font-mono text-black">{detailsItem?.requestId}</span>
              </DialogDescription>
            </DialogHeader>

            {detailsItem && (
              <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Material</div>
                  <div className="font-medium">{detailsItem.material}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Quantity</div>
                  <div className="font-medium">{detailsItem.itemQty}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Type</div>
                  <div className="font-medium">{detailsItem.itemType || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Description</div>
                  <div className="font-medium">{detailsItem.description || '-'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">From Plant</div>
                  <div className="font-medium">{detailsItem.fromPlantName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">To Plant</div>
                  <div className="font-medium">{detailsItem.toPlantName}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">From Store</div>
                  <div className="font-medium">{detailsItem.fromStoreLocation || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">To Store</div>
                  <div className="font-medium">{detailsItem.toStoreLocation || '-'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Created By</div>
                  <div className="font-medium">{detailsItem.createId || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Date</div>
                  <div className="font-medium">{detailsItem.createDt}</div>
                </div>

                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Remark</div>
                  <div className="p-2 bg-gray-50 rounded italic text-gray-600">{detailsItem.remark || 'No remarks'}</div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);

// --- Reused Advanced Filters Component (Internal) ---
function AdvancedFiltersComponent({
  advFilters,
  setAdvFilters,
  setFilters,
  initialFrom,
  initialTo,
}: {
  advFilters: AdvancedFilter[];
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvancedFilter[]>>;
  setFilters: React.Dispatch<React.SetStateAction<ActiveTransferFilters>>;
  initialFrom: string;
  initialTo: string;
}) {
  const FILTER_FIELD_OPTIONS: { value: FilterFieldKey; label: string; type: "text" | "daterange" }[] = [
    { value: "requestId", label: "Request ID", type: "text" },
    { value: "material", label: "Material", type: "text" },
    { value: "fromPlant", label: "From Plant", type: "text" },
    { value: "toPlant", label: "To Plant", type: "text" },
    { value: "dateRange", label: "Date Range", type: "daterange" },
  ];

  const addAdvFilter = (field: FilterFieldKey) => {
    // Prevent adding duplicates
    if (advFilters.some((f) => f.field === field)) return;

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
    const nextFilters: ActiveTransferFilters = { requestId: "", material: "", fromPlant: "", toPlant: "", fromDate: initialFrom, toDate: initialTo };
    advFilters.forEach((f) => {
      switch (f.field) {
        case "requestId": nextFilters.requestId = f.value || ""; break;
        case "material": nextFilters.material = f.value || ""; break;
        case "fromPlant": nextFilters.fromPlant = f.value || ""; break;
        case "toPlant": nextFilters.toPlant = f.value || ""; break;
        case "dateRange":
          if (f.dateRange?.from) {
            nextFilters.fromDate = toYmd(f.dateRange.from);
            nextFilters.toDate = f.dateRange.to ? toYmd(f.dateRange.to) : toYmd(f.dateRange.from);
          }
          break;
      }
    });
    setFilters(nextFilters);
  }, [advFilters, setFilters, initialFrom, initialTo]);

  return (
    <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
      <div className="flex items-center gap-2">
        <LabelSmall>Add filter</LabelSmall>
        <Select onValueChange={(v: FilterFieldKey) => addAdvFilter(v)}>
          <SelectTrigger className="h-8 text-xs w-56 bg-white"><SelectValue placeholder="Choose field..." /></SelectTrigger>
          <SelectContent>
            {FILTER_FIELD_OPTIONS.map((opt) => {
              // Check if already active
              const isDisabled = advFilters.some((f) => f.field === opt.value);
              return (
                <SelectItem key={opt.value} value={opt.value} disabled={isDisabled}>
                  {opt.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {advFilters.length === 0 && <div className="text-xs text-muted-foreground italic">No advanced filters added.</div>}
        {advFilters.map((af) => {
          const fieldMeta = FILTER_FIELD_OPTIONS.find((f) => f.value === af.field)!;
          return (
            <div key={af.id} className="grid grid-cols-12 gap-2 items-center bg-white p-1 rounded border">
              <div className="col-span-3 sm:col-span-2">
                <div className="text-xs font-semibold px-2">{fieldMeta.label}</div>
              </div>
              <div className="col-span-8 sm:col-span-9">
                {fieldMeta.type === "text" && (
                  <Input className="h-7 text-xs border-none shadow-none focus-visible:ring-0" value={af.value || ""} onChange={(e) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, value: e.target.value } : x)))} placeholder="Enter value..." />
                )}
                {fieldMeta.type === "daterange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-left h-7 text-xs px-2">
                        {af.dateRange?.from ? `${format(af.dateRange.from, "MMM dd")} - ${af.dateRange.to ? format(af.dateRange.to, "MMM dd") : "..."}` : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={af.dateRange?.from} selected={af.dateRange} onSelect={(range) => setAdvFilters((p) => p.map((x) => (x.id === af.id ? { ...x, dateRange: range } : x)))} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => removeAdvFilter(af.id)}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
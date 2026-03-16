import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  Receipt,
  AlertCircle,
  Radio,
  FileText,
  Search,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { DailyReport, TRAReport, TCRAReport } from "@shared/schema";
import { reportsApi, type ReportMasterBean, type FetchReportsRequest, type ReportNameBean } from "@/lib/reportsApi";
import { useAuthContext } from "@/context/AuthProvider";

// ─── Helper: today as YYYY-MM-DD ──────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];

const PAGE_SIZE = 10;

export default function UnifiedReports() {
  const { toast } = useToast();
  const { user } = useAuthContext();

  // ── Addon-Reports (real API) state ────────────────────────────────────────
  const [addonFilters, setAddonFilters] = useState<{
    reportDate: string;
    reportName: string;
    reportId: string;
  }>({
    reportDate: todayStr(),
    reportName: "",
    reportId: "",
  });
  const [addonDateObj, setAddonDateObj] = useState<Date | undefined>(new Date());

  const [addonReports, setAddonReports] = useState<ReportMasterBean[]>([]);
  const [addonTotalCount, setAddonTotalCount] = useState(0);
  const [addonPage, setAddonPage] = useState(0);          // 0-indexed page
  const [addonLoading, setAddonLoading] = useState(false);
  const [addonFetched, setAddonFetched] = useState(false); // track if search was performed

  const [reportNames, setReportNames] = useState<ReportNameBean[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch report names on mount or if salesOrg changes
  useEffect(() => {
    async function getReportNames() {
      if (!user?.salesOrg) return;
      setLoadingNames(true);
      try {
        const res = await reportsApi.fetchReportNames(user.salesOrg);
        if (res.status === "SUCCESS" || res.statusCode === 200) {
          setReportNames(res.data?.reportMasterBeans ?? []);
        }
      } catch (err) { } finally {
        setLoadingNames(false);
      }
    }
    getReportNames();
  }, [user?.salesOrg]);

  const fetchAddonReports = useCallback(async (page = 0) => {
    setAddonLoading(true);
    setAddonReports([]);          // ← clear immediately so stale rows never show
    setAddonTotalCount(0);
    try {
      const payload: FetchReportsRequest = {
        reportDate: addonFilters.reportDate,
        salesOrg: user?.salesOrg || undefined,   // from login session
        reportName: addonFilters.reportName && addonFilters.reportName !== "none" ? addonFilters.reportName : undefined,
        reportId: addonFilters.reportId || undefined,
        offSet: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      };

      const res = await reportsApi.fetchReports(payload);

      if (res.status === "SUCCESS" || res.statusCode === 200) {
        setAddonReports(res.data?.reportMasterBeans ?? []);
        setAddonTotalCount(res.data?.totalRecordCount ?? 0);
        setAddonPage(page);
        setAddonFetched(true);
        if ((res.data?.reportMasterBeans ?? []).length === 0) {
          toast({ title: "No Records", description: "No reports found for the selected filters.", variant: "default" });
        }
      } else {
        // API returned a non-success status — clear any previous data
        setAddonReports([]);
        setAddonTotalCount(0);
        setAddonFetched(true);
        toast({ title: "Error", description: res.statusMessage ?? "Failed to fetch reports.", variant: "destructive" });
      }
    } catch (err: any) {
      // Network / unexpected error — clear any previous data
      setAddonReports([]);
      setAddonTotalCount(0);
      setAddonFetched(true);
      toast({
        title: "Error",
        description: err?.statusMessage ?? err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setAddonLoading(false);
    }
  }, [addonFilters, toast]);

  const totalPages = Math.ceil(addonTotalCount / PAGE_SIZE);

  // ── Download state ────────────────────────────────────────────────────────
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (report: ReportMasterBean) => {
    setDownloadingId(report.drId);
    try {
      await reportsApi.downloadReport(report.fileName, report.filePath);
      toast({ title: "Download Started", description: `${report.fileName} is being downloaded.` });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.message ?? "Could not download the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

  // ── Static TRA / TCRA data (unchanged) ───────────────────────────────────

  const [traFilters, setTraFilters] = useState({ dateFrom: todayStr(), dateTo: todayStr(), reportType: "all" });
  const [tcraFilters, setTcraFilters] = useState({ dateFrom: todayStr(), dateTo: todayStr(), region: "all", reportType: "all" });

  const staticTraReports: TRAReport[] = [];

  const staticTcraReports: TCRAReport[] = [];

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS": return "bg-green-100 text-green-800";
      case "FAILED": return "bg-red-100 text-red-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", minimumFractionDigits: 0 }).format(amount);

  const handleExport = (reportType: string, reportId: number, format: "PDF" | "EXCEL") => {
    toast({ title: "Success", description: `${reportType} report exported as ${format}` });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Reports Management</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Comprehensive reporting system for operational, TRA and TCRA
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="addon" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="addon" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
            <FileSpreadsheet className="w-4 h-4" /> Daily Reports
          </TabsTrigger>
          {/* <TabsTrigger value="tra" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
            <Receipt className="w-4 h-4" /> TRA Reports
          </TabsTrigger>
          <TabsTrigger value="tcra" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
            <Radio className="w-4 h-4" /> TCRA Reports
          </TabsTrigger> */}
        </TabsList>

        {/* ===================== DAILY REPORTS TAB ===================== */}
        <TabsContent value="addon" className="space-y-3">

          {/* ── Filter Row ── */}
          <Card className="py-0">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-end gap-3">
                {/* Report Date */}
                <div className="space-y-1 min-w-[140px] flex-1">
                  <Label className="text-xs font-medium">Report Date *</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-7 text-xs"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {addonDateObj ? format(addonDateObj, "dd MMM yyyy") : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={addonDateObj}
                        onSelect={(date) => {
                          setAddonDateObj(date);
                          setAddonFilters(f => ({ ...f, reportDate: date ? format(date, "yyyy-MM-dd") : todayStr() }));
                          setIsCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>


                {/* Report Name */}
                <div className="space-y-1 min-w-[160px] flex-1">
                  <Label htmlFor="addon-report-name" className="text-xs font-medium">Report Name</Label>
                  <Select
                    value={addonFilters.reportName}
                    onValueChange={(val) => setAddonFilters(f => ({ ...f, reportName: val }))}
                  >
                    <SelectTrigger id="addon-report-name" className="h-7 text-xs">
                      <SelectValue placeholder={loadingNames ? "Loading..." : "Select Report"} />
                    </SelectTrigger>
                    <SelectContent>
                      {reportNames.map((rn) => (
                        <SelectItem key={rn.reportName} value={rn.reportName} className="text-xs">
                          {rn.reportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Report ID */}
                <div className="space-y-1 min-w-[120px] flex-1">
                  <Label htmlFor="addon-report-id" className="text-xs font-medium">Report ID</Label>
                  <Input
                    id="addon-report-id"
                    placeholder="Enter Report ID"
                    className="h-7 text-xs"
                    value={addonFilters.reportId}
                    onChange={(e) => setAddonFilters(f => ({ ...f, reportId: e.target.value }))}
                  />
                </div>

                {/* Fetch Button — aligned to bottom of the row */}
                <div className="flex items-end pb-0">
                  <Button
                    onClick={() => fetchAddonReports(0)}
                    disabled={addonLoading || !addonFilters.reportDate}
                    className="h-7 text-xs bg-azam-blue hover:bg-blue-700 text-white flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {addonLoading
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Search className="w-3.5 h-3.5" />}
                    {addonLoading ? "Fetching…" : "Fetch Reports"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Results — reusable DataTable with server-side pagination ── */}
          <DataTable
            title="Daily Report Results"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            hideHeader={true}
            data={addonReports}
            loading={addonLoading}
            showCount={addonFetched}
            totalCount={addonTotalCount}
            enableExport={false}
            emptyMessage={
              !addonFetched
                ? "Select a date and click Fetch Reports to load data."
                : "No reports found for the selected filters."
            }
            columns={[
              {
                key: "drId",
                label: "Report ID",
                sortable: true,
              },
              {
                key: "reportName",
                label: "Report Name",
                sortable: true,
                render: (v) => (
                  <Badge variant="outline" className="text-[10px]">{v}</Badge>
                ),
              },
              {
                key: "reportDate",
                label: "Report Date",
                sortable: true,
              },
              {
                key: "salesOrg",
                label: "Sales Org",
                sortable: true,
                render: (v) => v || "—",
              },
              {
                key: "fileName",
                label: "File Name",
                sortable: false,
                render: (v) => (
                  <span className="max-w-[200px] truncate block" title={v}>{v}</span>
                ),
              },
              {
                key: "createTs",
                label: "Created At",
                sortable: true,
              },
            ]}
            actions={[
              {
                label: "Download",
                icon: <Download className="w-4 h-4" />,
                onClick: (report) => handleDownload(report),
              },
            ]}
            /* Server-side pagination */
            manualPagination={true}
            pageIndex={addonPage}
            pageSize={PAGE_SIZE}
            pageCount={totalPages}
            onPageChange={(page) => fetchAddonReports(page)}
            searchableFields={["reportName", "salesOrg", "drId"]}
          />
        </TabsContent>

        {/* ======================== TRA REPORTS SECTION ======================== */}
        <TabsContent value="tra" className="space-y-6">
          <DataTable
            title="Generated TRA Reports"
            data={staticTraReports}
            columns={[
              { key: "reportDate", label: "Report Date", sortable: true, render: (v) => new Date(v).toLocaleDateString() },
              { key: "reportType", label: "Type", sortable: true, render: (v) => <Badge variant="outline" className="capitalize">{v.replace(/_/g, " ")}</Badge> },
              { key: "invoiceAmountTotal", label: "VAT Amount", sortable: true, render: (v) => formatCurrency(v) },
              { key: "totalInvoices", label: "Invoices", sortable: true },
              { key: "traApiStatus", label: "TRA Status", sortable: true, render: (v) => <Badge className={getApiStatusColor(v)}>{v}</Badge> },
              { key: "submissionDate", label: "Submitted", sortable: true, render: (v, item) => item.submittedToTRA && v ? <span className="flex items-center gap-1 text-green-600">&#10003; {new Date(v).toLocaleDateString()}</span> : <span className="flex items-center gap-1 text-yellow-600">&#9888; Pending</span> },
            ]}
            actions={[
              { label: "View", icon: <FileText className="w-4 h-4" />, onClick: (r) => window.open(`/reports/tra/${r.id}`, "_blank"), variant: "default" },
              { label: "Export Excel", icon: <FileSpreadsheet className="w-4 h-4" />, onClick: (r) => handleExport("TRA", r.id, "EXCEL"), variant: "default" },
              { label: "Export PDF", icon: <Download className="w-4 h-4" />, onClick: (r) => handleExport("TRA", r.id, "PDF"), variant: "default" },
            ]}
            loading={false}
            searchableFields={["reportType"]}
            emptyMessage="No TRA Reports Generated."
            icon={<Receipt className="w-5 h-5" />}
            enableExport={true}
          />
        </TabsContent>

        {/* ======================== TCRA REPORTS SECTION ======================== */}
        <TabsContent value="tcra" className="space-y-6">
          <DataTable
            title="Generated TCRA Reports"
            data={staticTcraReports}
            columns={[
              { key: "reportDate", label: "Report Date", sortable: true, render: (v) => new Date(v).toLocaleDateString() },
              { key: "reportType", label: "Type", sortable: true, render: (v) => <Badge variant="outline" className="capitalize">{v.replace(/_/g, " ")}</Badge> },
              { key: "region", label: "Region", sortable: true },
              { key: "newActivations", label: "Activations", sortable: true },
              { key: "renewals", label: "Renewals", sortable: true },
              { key: "nagraProvisioningSuccess", label: "NAGRA Status", sortable: true, render: (v, item) => <span className="flex items-center gap-1"><span className="text-green-600">&#10003;</span><span>{v} / {item.nagraApiCalls}</span></span> },
              { key: "tcraApiStatus", label: "TCRA Status", sortable: true, render: (v) => <Badge className={getApiStatusColor(v)}>{v}</Badge> },
              { key: "submissionDate", label: "Submitted", sortable: true, render: (v, item) => item.submittedToTCRA && v ? <span className="flex items-center gap-1 text-green-600">&#10003; {new Date(v).toLocaleDateString()}</span> : <span className="flex items-center gap-1 text-yellow-600">&#9888; Pending</span> },
            ]}
            actions={[
              { label: "View", icon: <FileText className="w-4 h-4" />, onClick: (r) => window.open(`/reports/tcra/${r.id}`, "_blank"), variant: "default" },
              { label: "Export Excel", icon: <FileSpreadsheet className="w-4 h-4" />, onClick: (r) => handleExport("TCRA", r.id, "EXCEL"), variant: "default" },
              { label: "Export PDF", icon: <Download className="w-4 h-4" />, onClick: (r) => handleExport("TCRA", r.id, "PDF"), variant: "default" },
            ]}
            loading={false}
            searchableFields={["reportType", "region"]}
            emptyMessage="No TCRA Reports Generated."
            icon={<Radio className="w-5 h-5" />}
            enableExport={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar as CalendarIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// Placeholder value for "All" options (Radix UI doesn't allow empty string)
const ALL_VALUE = "__ALL__";

// Operation Types for Filter Dropdown
const OPERATION_TYPES = [
  { key: ALL_VALUE, label: "All Operations", type: undefined },
  // Payment Operations
  { key: "PAYMENT", label: "Bulk Payment", type: "PAYMENT" },
  { key: "CREDIT_LIMIT", label: "Bulk Credit Limit", type: "PAYMENT" },
  { key: "INVOICE_REVERSAL", label: "Bulk Invoice Cancel", type: "PAYMENT" },
  { key: "PAYMENT_REVERSAL", label: "Bulk Payment Cancel", type: "PAYMENT" },
  { key: "ADJUSTMENT", label: "Bulk Adjustment", type: "PAYMENT" },
  { key: "SUBSCRIPTION_PAYMENT", label: "Bulk Subscription Payment", type: "PAYMENT" },
  { key: "HARDWARE_PAYMENT", label: "Bulk Hardware Payment", type: "PAYMENT" },
  { key: "AGENT_SUBSCRIPTION_PAYMENT", label: "Agent Subscription Payment", type: "PAYMENT" },
  // Plan Operations
  { key: "OFFER_CHANGE", label: "Bulk Offer Change", type: "PLAN" },
  { key: "PLAN_PURCHASE", label: "Bulk Plan Purchase", type: "PLAN" },
  { key: "PLAN_CHANGE", label: "Bulk Plan Change", type: "PLAN" },
  { key: "PLAN_RENEWAL", label: "Bulk Plan Renewal", type: "PLAN" },
  { key: "PLAN_ADJUSTMENT", label: "Bulk Plan Adjustment", type: "PLAN" },
  { key: "LOCK", label: "Bulk Lock", type: "PLAN" },
  { key: "UNLOCK", label: "Bulk Unlock", type: "PLAN" },
  { key: "RETRACK", label: "Bulk Retrack", type: "PLAN" },
  { key: "PLAN_TERMINATION", label: "Bulk Plan Termination", type: "PLAN" },
  // Stock Operations
  { key: "STOCK_TRANSFER", label: "Stock Transfer", type: "STOCK" },
];

// Status Options
const STATUS_OPTIONS = [
  { key: ALL_VALUE, label: "All Status" },
  { key: "SUCCESS", label: "Success" },
  { key: "FAILED", label: "Failed" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
];

// Interface for Upload File Details
interface UploadFileDetail {
  blkId: number;
  lcoId: string | null;
  fileName: string;
  fileSize: number;
  recordCount: number;
  actionType: string | null;
  actionSubType: string;
  successCount: number | null;
  failureCount: number | null;
  status: string;
  statusMsg: string | null;
  createTs: string;
  createDt: string;
  createId: string;
  updateTs: string | null;
  updateDt: string | null;
  updateId: string | null;
  country: string;
  salesOrg: string | null;
}

// Interface for Bulk Plan Operation Detail
interface BulkPlanOperation {
  bopId: string;
  blkId: string;
  transId: string;
  operation: string;
  action: string;
  agreementType: string | null;
  startDate: string | null;
  exeMode: string | null;
  duration: string | null;
  endDate: string | null;
  lockUnlockReason: string | null;
  sapBpId: string;
  sapCaId: string | null;
  contractId: string | null;
  planVariantId: string;
  smartCardNo: string;
  stbNo: string;
  status: string;
  statusMsg: string | null;
  createTs: string;
  createDt: string;
  createId: string;
  updateTs: string | null;
  updateDt: string | null;
  updateId: string | null;
  cmStatus: string | null;
  cmStatusMsg: string | null;
  ccStatus: string | null;
  ciStatus: string | null;
  fiStatus: string | null;
  retryCount: string | null;
  salesOrg: string | null;
}

// Interface for Bulk Payment Detail
interface BulkPaymentDetail {
  bpyId?: string;
  blrcId?: string;
  blkId: string;
  transId: string;
  operation: string;
  agentId?: string;
  type?: string;
  payerBpId?: string;
  sapBpId?: string;
  smartCardNumber?: string | null;
  amount: number | string;
  currency: string;
  payMode: string;
  chqNo?: string;
  chqDate?: string;
  bankName?: string;
  cardNo?: string | null;
  provRcptNo?: string;
  status: string;
  statusMsg: string | null;
  createTs: string | null;
  createDt: string | null;
  createId: string;
  updateTs?: string | null;
  updateDt?: string | null;
  updateId?: string | null;
  collName?: string | null;
  collCode?: string | null;
  walletType?: string | null;
  salesOrg?: string | null;
  division?: string | null;
  plant?: string | null;
  sloc?: string | null;
  cmStatus: string | null;
  cmStatusMsg: string | null;
  ccStatus?: string | null;
  ciStatus?: string | null;
  fiStatus?: string | null;
  natureOfPayment?: string;
  payerCaId?: string | null;
  contractId?: string | null;
  payeeCaId?: string | null;
  retryCount?: string | null;
  paymentSource?: string | null;
  paymentRole?: string | null;
  retryFlag?: string | null;
  cmUuid?: string | null;
  payChannel?: string | null;
  channelUserId?: string | null;
  securityDeposite?: string | null;
  invoiceNo?: string | null;
}

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to get operation type (PLAN or PAYMENT)
const getOperationType = (actionSubType: string): string => {
  const operation = OPERATION_TYPES.find(op => op.key === actionSubType);
  return operation?.type || "PLAN";
};

// Helper to format date for API (YYYY-MM-DD)
const formatDateForApi = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

// Helper to format date with time for display
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Get default date range (last 30 days)
const getDefaultDateRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  return { fromDate, toDate };
};

// Helper to convert filter value for API (converts ALL_VALUE to undefined/empty)
const getApiValue = (value: string): string | undefined => {
  return value === ALL_VALUE ? undefined : value;
};

export default function BulkUploadTable() {
  const { toast } = useToast();

  // Filter States - use Date objects for calendar
  const [operationType, setOperationType] = useState<string>(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
  const [fromDate, setFromDate] = useState<Date | undefined>(getDefaultDateRange().fromDate);
  const [toDate, setToDate] = useState<Date | undefined>(getDefaultDateRange().toDate);

  // Calendar popover states
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Data States
  const [uploads, setUploads] = useState<UploadFileDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States for Record Details
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<UploadFileDetail | null>(null);
  const [recordDetails, setRecordDetails] = useState<{
    planOperations: BulkPlanOperation[];
    paymentDetails: BulkPaymentDetail[];
  }>({ planOperations: [], paymentDetails: [] });
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailTotalCount, setDetailTotalCount] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize] = useState(20);
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>(ALL_VALUE);

  // Fetch bulk upload details
  const fetchBulkUploadDetails = async () => {
    if (!fromDate || !toDate) {
      toast({
        title: "Validation Error",
        description: "From Date and To Date are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestPayload: {
        fromDate: string;
        toDate: string;
        offSet: number;
        limit: number;
        actionSubType?: string;
        status?: string;
      } = {
        fromDate: formatDateForApi(fromDate),
        toDate: formatDateForApi(toDate),
        offSet: (currentPage - 1) * pageSize,
        limit: pageSize
      };

      // Only add to payload if not "ALL"
      const apiOperationType = getApiValue(operationType);
      const apiStatusFilter = getApiValue(statusFilter);

      if (apiOperationType) {
        requestPayload.actionSubType = apiOperationType;
      }
      if (apiStatusFilter) {
        requestPayload.status = apiStatusFilter;
      }

      const response = await apiRequest("/upload/bulk-upload-details", "POST", requestPayload);

      if (response && response.status === "SUCCESS" && response.data) {
        setUploads(response.data.uploadFileDetails || []);
        setTotalCount(response.data.totalCount || 0);
      } else {
        setUploads([]);
        setTotalCount(0);
        if (response?.statusMessage) {
          setError(response.statusMessage);
        }
      }
    } catch (err: any) {
      setError(err.statusMessage || err.message || "Failed to fetch upload details");
      setUploads([]);
      setTotalCount(0);
      toast({
        title: "Error",
        description: err.statusMessage || "Failed to fetch upload details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch record details for modal
  const fetchBulkRecordDetails = async (upload: UploadFileDetail, page: number = 1, status: string = ALL_VALUE) => {
    setIsLoadingDetails(true);

    try {
      const type = getOperationType(upload.actionSubType);

      const requestPayload: {
        blkId: string;
        type: string;
        offSet: number;
        limit: number;
        actionSubType?: string;
        status?: string;
      } = {
        blkId: String(upload.blkId),
        type,
        offSet: (page - 1) * detailPageSize,
        limit: detailPageSize
      };

      if (upload.actionSubType) {
        requestPayload.actionSubType = upload.actionSubType;
      }

      // Only add status if not "ALL"
      const apiStatus = getApiValue(status);
      if (apiStatus) {
        requestPayload.status = apiStatus;
      }

      const response = await apiRequest("/upload/bulk-record-details", "POST", requestPayload);

      if (response && response.status === "SUCCESS" && response.data) {
        setRecordDetails({
          planOperations: response.data.bulkPlanOperations || [],
          paymentDetails: response.data.bulkPaymentDetails || []
        });
        setDetailTotalCount(response.data.totalCount || 0);
      } else {
        setRecordDetails({ planOperations: [], paymentDetails: [] });
        setDetailTotalCount(0);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.statusMessage || "Failed to fetch record details",
        variant: "destructive"
      });
      setRecordDetails({ planOperations: [], paymentDetails: [] });
      setDetailTotalCount(0);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Initial fetch and refetch when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchBulkUploadDetails();
    }
  }, [currentPage, pageSize, operationType, statusFilter, fromDate, toDate]);

  // Handle View More click
  const handleViewMore = (upload: UploadFileDetail) => {
    setSelectedUpload(upload);
    setDetailPage(1);
    setDetailStatusFilter(ALL_VALUE);
    setIsDetailModalOpen(true);
    fetchBulkRecordDetails(upload, 1, ALL_VALUE);
  };

  // Handle detail modal pagination
  const handleDetailPageChange = (newPage: number) => {
    setDetailPage(newPage);
    if (selectedUpload) {
      fetchBulkRecordDetails(selectedUpload, newPage, detailStatusFilter);
    }
  };

  // Handle detail status filter change
  const handleDetailStatusChange = (status: string) => {
    setDetailStatusFilter(status);
    setDetailPage(1);
    if (selectedUpload) {
      fetchBulkRecordDetails(selectedUpload, 1, status);
    }
  };

  // Handle filter reset
  const handleResetFilters = () => {
    const defaultDates = getDefaultDateRange();
    setOperationType(ALL_VALUE);
    setStatusFilter(ALL_VALUE);
    setFromDate(defaultDates.fromDate);
    setToDate(defaultDates.toDate);
    setCurrentPage(1);
  };

  // Handle refresh
  const handleRefresh = () => {
    setCurrentPage(1);
    fetchBulkUploadDetails();
  };

  // Handle from date selection
  const handleFromDateSelect = (date: Date | undefined) => {
    setFromDate(date);
    setFromDateOpen(false);
  };

  // Handle to date selection
  const handleToDateSelect = (date: Date | undefined) => {
    setToDate(date);
    setToDateOpen(false);
  };

  // Export modal details to Excel
  const handleExportModalDetails = () => {
    if (!selectedUpload) return;

    try {
      const isPlanOperation = recordDetails.planOperations && recordDetails.planOperations.length > 0;
      const isPaymentOperation = recordDetails.paymentDetails && recordDetails.paymentDetails.length > 0;

      if (!isPlanOperation && !isPaymentOperation) {
        toast({
          title: "No Data",
          description: "No data available to export",
          variant: "destructive"
        });
        return;
      }

      let exportData: any[];

      if (isPlanOperation) {
        exportData = recordDetails.planOperations.map(record => ({
          "Trans ID": record.transId || '',
          "Operation": record.operation || '',
          "SAP BP ID": record.sapBpId || '',
          "Smart Card": record.smartCardNo || '',
          "STB No": record.stbNo || '',
          "Plan": record.planVariantId || '',
          "Status": record.status || '',
          "Status Message": record.statusMsg || '',
          "CM Status": record.cmStatus || '',
          "CM Status Message": record.cmStatusMsg || '',
          "Date & Time": formatDateTime(record.createTs)
        }));
      } else {
        exportData = recordDetails.paymentDetails.map(record => ({
          "Trans ID": record.transId || '',
          "Operation": record.operation || '',
          "Agent ID": record.agentId || '',
          "Payer BP ID": record.payerBpId || record.sapBpId || '',
          "Amount": record.amount || 0,
          "Currency": record.currency || '',
          "Pay Mode": record.payMode || '',
          "Status": record.status || '',
          "Status Message": record.statusMsg || '',
          "CM Status": record.cmStatus || '',
          "CM Status Message": record.cmStatusMsg || '',
          "Date & Time": record.createTs ? formatDateTime(record.createTs) : (record.createDt || '')
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");

      const fileName = `bulk_${selectedUpload.blkId}_${selectedUpload.actionSubType}_records_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} records to ${fileName}`
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to export records",
        variant: "destructive"
      });
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const detailTotalPages = Math.ceil(detailTotalCount / detailPageSize);

  // Columns for DataTable - with separate Success and Failed columns
  const columns: DataTableColumn<UploadFileDetail>[] = [
    {
      key: "blkId",
      label: "Bulk ID",
      render: (value) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">#{value}</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "fileName",
      label: "File Name",
      render: (value, row) => (
        <div className="flex items-start min-w-[200px]">
          <FileText className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p
              className="text-sm text-gray-900 dark:text-white font-medium break-words"
              title={value}
            >
              {value}
            </p>
            <p className="text-xs text-gray-500">{formatFileSize(row.fileSize)}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "actionSubType",
      label: "Operation Type",
      render: (value) => {
        const operation = OPERATION_TYPES.find(op => op.key === value);
        return (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {operation?.label || value}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      key: "recordCount",
      label: "Total Records",
      render: (value) => (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{value ?? '-'}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: "successCount",
      label: "Success",
      render: (value) => (
        <div className="text-center">
          {value !== null && value !== undefined ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{value}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "failureCount",
      label: "Failed",
      render: (value) => (
        <div className="text-center">
          {value !== null && value !== undefined ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{value}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "createId",
      label: "Uploaded By",
      render: (value) => (
        <span className="text-sm text-gray-900 dark:text-white">{value}</span>
      ),
      sortable: true,
    },
    {
      key: "createTs",
      label: "Date & Time",
      render: (value) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">
            {new Date(value).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge
          variant={
            value === "PENDING" || value === "PROCESSING"
              ? "secondary"
              : value === "SUCCESS"
                ? "default"
                : "destructive"
          }
          className={
            value === "PENDING" || value === "PROCESSING"
              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
              : value === "SUCCESS"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          }
        >
          <div className="flex items-center gap-1">
            {(value === "PENDING" || value === "PROCESSING") && (
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            )}
            {value === "SUCCESS" && <CheckCircle className="h-3 w-3" />}
            {value === "FAILED" && <XCircle className="h-3 w-3" />}
            <span className="capitalize">{value?.toLowerCase()}</span>
          </div>
        </Badge>
      ),
      sortable: true,
    },
  ];

  // Actions for DataTable
  const actions: DataTableAction<UploadFileDetail>[] = [
    {
      label: "View Details",
      icon: <Eye className="h-3 w-3" />,
      onClick: (item) => handleViewMore(item),
    },
  ];

  // Render Plan Operation Details Table
  const renderPlanOperationsTable = () => {
    if (recordDetails.planOperations.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No plan operation records found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trans ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SAP BP ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Smart Card</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STB No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CM Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CM Status Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {recordDetails.planOperations.map((record, idx) => (
              <tr key={record.bopId || idx} className={idx % 2 === 0 ? "bg-gray-50/50" : ""}>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                  {record.transId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  <Badge variant="outline" className="text-xs">
                    {record.operation}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.sapBpId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.smartCardNo || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.stbNo || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.planVariantId || '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      record.status === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : record.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {record.status || '-'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px]">
                  {record.statusMsg ? (
                    <p className="text-xs text-red-600 truncate" title={record.statusMsg}>
                      {record.statusMsg}
                    </p>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {record.cmStatus ? (
                    <Badge
                      className={
                        record.cmStatus === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : record.cmStatus === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {record.cmStatus}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px]">
                  {record.cmStatusMsg ? (
                    <p className="text-xs text-red-600 truncate" title={record.cmStatusMsg}>
                      {record.cmStatusMsg}
                    </p>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {formatDateTime(record.createTs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render Payment Details Table
  const renderPaymentDetailsTable = () => {
    if (recordDetails.paymentDetails.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No payment records found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trans ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payer BP ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Mode</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CM Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CM Status Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {recordDetails.paymentDetails.map((record, idx) => (
              <tr key={record.bpyId || record.blrcId || idx} className={idx % 2 === 0 ? "bg-gray-50/50" : ""}>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                  {record.transId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  <Badge variant="outline" className="text-xs">
                    {record.operation}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.agentId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.payerBpId || record.sapBpId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                  {record.currency} {Number(record.amount)?.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {record.payMode || '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      record.status === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : record.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {record.status || '-'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px]">
                  {record.statusMsg ? (
                    <p className="text-xs text-red-600 truncate" title={record.statusMsg}>
                      {record.statusMsg}
                    </p>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {record.cmStatus ? (
                    <Badge
                      className={
                        record.cmStatus === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : record.cmStatus === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {record.cmStatus}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px]">
                  {record.cmStatusMsg ? (
                    <p className="text-xs text-red-600 truncate" title={record.cmStatusMsg}>
                      {record.cmStatusMsg}
                    </p>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {record.createTs ? formatDateTime(record.createTs) : (record.createDt || '-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Generate pagination buttons for modal
  const renderDetailPagination = () => {
    if (detailTotalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (detailTotalPages <= maxVisible) {
        for (let i = 1; i <= detailTotalPages; i++) {
          pages.push(i);
        }
      } else {
        if (detailPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(detailTotalPages);
        } else if (detailPage >= detailTotalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = detailTotalPages - 3; i <= detailTotalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = detailPage - 1; i <= detailPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(detailTotalPages);
        }
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between border-t pt-4 mt-4">
        <div className="text-sm text-gray-600">
          Showing {((detailPage - 1) * detailPageSize) + 1} to {Math.min(detailPage * detailPageSize, detailTotalCount)} of {detailTotalCount} records
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDetailPageChange(1)}
            disabled={detailPage === 1 || isLoadingDetails}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDetailPageChange(detailPage - 1)}
            disabled={detailPage === 1 || isLoadingDetails}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, idx) => (
            typeof page === 'number' ? (
              <Button
                key={idx}
                variant={detailPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handleDetailPageChange(page)}
                disabled={isLoadingDetails}
                className="w-9"
              >
                {page}
              </Button>
            ) : (
              <span key={idx} className="px-2 text-gray-500">...</span>
            )
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDetailPageChange(detailPage + 1)}
            disabled={detailPage === detailTotalPages || isLoadingDetails}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDetailPageChange(detailTotalPages)}
            disabled={detailPage === detailTotalPages || isLoadingDetails}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Operation Type Filter */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Operation Type
            </label>
            <Select value={operationType} onValueChange={setOperationType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Operations" />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_TYPES.map(type => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date - Using Calendar with Popover */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              From Date <span className="text-red-500">*</span>
            </label>
            <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "yyyy-MM-dd") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To Date - Using Calendar with Popover */}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              To Date <span className="text-red-500">*</span>
            </label>
            <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "yyyy-MM-dd") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleRefresh}
              className="h-9"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
          <Loader2 className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading upload history...</p>
        </div>
      ) : (
        <DataTable
          title="Upload History & Management"
          subtitle={`Showing ${uploads.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} uploads`}
          data={uploads}
          columns={columns}
          actions={actions}
          loading={isLoading}
          showCount={true}
          totalCount={totalCount}
          emptyMessage="No uploads found for the selected criteria"
          manualPagination={true}
          pageIndex={currentPage - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={(idx) => setCurrentPage(idx + 1)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden"
        />
      )}

      {/* Record Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bulk Upload Record Details
            </DialogTitle>
            <DialogDescription>
              {selectedUpload && (
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span>
                    <strong>Bulk ID:</strong> #{selectedUpload.blkId}
                  </span>
                  <span className="max-w-[300px]">
                    <strong>File:</strong> <span className="break-words">{selectedUpload.fileName}</span>
                  </span>
                  <span>
                    <strong>Operation:</strong> {OPERATION_TYPES.find(op => op.key === selectedUpload.actionSubType)?.label || selectedUpload.actionSubType}
                  </span>
                  <span>
                    <strong>Total Records:</strong> {selectedUpload.recordCount}
                  </span>
                  <span>
                    <strong>Success:</strong> <span className="text-green-600">{selectedUpload.successCount ?? '-'}</span>
                  </span>
                  <span>
                    <strong>Failed:</strong> <span className="text-red-600">{selectedUpload.failureCount ?? '-'}</span>
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Detail Filters & Export */}
          <div className="flex items-center justify-between gap-4 py-3 border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <Select value={detailStatusFilter} onValueChange={handleDetailStatusChange}>
                  <SelectTrigger className="h-8 w-[150px] text-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Status</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-500">
                Total: {detailTotalCount} records
              </div>
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportModalDetails}
              disabled={isLoadingDetails || (recordDetails.planOperations.length === 0 && recordDetails.paymentDetails.length === 0)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>

          {/* Detail Content */}
          <div className="flex-1 overflow-auto py-4">
            {isLoadingDetails ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading record details...</p>
              </div>
            ) : (
              <>
                {/* Show Plan Operations if available */}
                {recordDetails.planOperations.length > 0 && renderPlanOperationsTable()}

                {/* Show Payment Details if available */}
                {recordDetails.paymentDetails.length > 0 && renderPaymentDetailsTable()}

                {/* Empty State */}
                {recordDetails.planOperations.length === 0 && recordDetails.paymentDetails.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No records found for the selected criteria</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail Pagination */}
          {renderDetailPagination()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
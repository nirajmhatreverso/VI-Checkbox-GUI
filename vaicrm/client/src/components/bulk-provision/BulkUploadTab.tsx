// bulkuploadtab.tsx
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

// ✅ Security Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;
const PREVIEW_ROWS = 10;
const MAX_STRING_LENGTH = 500;
const UPLOAD_TIMEOUT = 60000; // 60 seconds

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  '' // Some browsers may not set MIME type, we'll validate extension
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

// Updated BULK_TYPES - Added HARDWARE_PAYMENT and HW_PAYMENT_REVERSAL
const BULK_TYPES = [
  // Existing Types
  { key: "bulk_payment", label: "Bulk Payment", operation: "PAYMENT", isPlanOperation: false },
  { key: "bulk_credit_limit", label: "Bulk Credit Limit", operation: "CREDIT_LIMIT", isPlanOperation: false },
  { key: "bulk_invoice_cancel", label: "Bulk Invoice Cancel", operation: "INVOICE_REVERSAL", isPlanOperation: false },
  { key: "bulk_payment_cancel", label: "Bulk Payment Cancel", operation: "PAYMENT_REVERSAL", isPlanOperation: false },
  { key: "bulk_adjustment", label: "Bulk Adjustment", operation: "ADJUSTMENT", isPlanOperation: false },

  // Subscription Payment
  { key: "bulk_subscription_payment", label: "Bulk Subscription Payment", operation: "SUBSCRIPTION_PAYMENT", isPlanOperation: false },

  // Hardware Payment
  { key: "bulk_hardware_payment", label: "Bulk Hardware Payment", operation: "HARDWARE_PAYMENT", isPlanOperation: false },

  // NEW: Hardware Payment Reversal
  { key: "bulk_hw_payment_reversal", label: "Bulk HW Payment Reversal", operation: "HW_PAYMENT_REVERSAL", isPlanOperation: false },

  // Plan Operations
  { key: "bulk_offer_change", label: "Bulk Offer Change", operation: "OFFER_CHANGE", isPlanOperation: true },
  { key: "bulk_plan_purchase", label: "Bulk Plan Purchase", operation: "PLAN_PURCHASE", isPlanOperation: true },
  { key: "bulk_plan_change", label: "Bulk Plan Change", operation: "PLAN_CHANGE", isPlanOperation: true },
  { key: "bulk_plan_renewal", label: "Bulk Plan Renewal", operation: "PLAN_RENEWAL", isPlanOperation: true },
  { key: "bulk_plan_adjustment", label: "Bulk Plan Adjustment", operation: "PLAN_ADJUSTMENT", isPlanOperation: true },
  { key: "bulk_lock", label: "Bulk Lock", operation: "LOCK", isPlanOperation: true },
  { key: "bulk_unlock", label: "Bulk Unlock", operation: "UNLOCK", isPlanOperation: true },
  { key: "bulk_retrack", label: "Bulk Retrack", operation: "RETRACK", isPlanOperation: true },

  // Plan Termination
  { key: "bulk_plan_termination", label: "Bulk Plan Termination", operation: "PLAN_TERMINATION", isPlanOperation: true },
];

// Exact Column Definitions based on requirements
const BULK_TYPE_COLUMNS: Record<string, { label: string; key: string }[]> = {
  // --- Existing ---
  bulk_payment: [
    { label: "Customer ID", key: "customerId" },
    { label: "Pay Mode", key: "payMode" },
    { label: "Pay Amount", key: "payAmount" },
  ],
  bulk_credit_limit: [
    { label: "SapBpId", key: "sapBpId" },
    { label: "Amount", key: "amount" },
  ],
  bulk_invoice_cancel: [
    { label: "Invoice No", key: "invoiceNo" },
  ],
  bulk_payment_cancel: [
    { label: "Payment ID", key: "paymentId" },
  ],
  bulk_adjustment: [
    { label: "SapBpId", key: "sapBpId" },
    { label: "SmartCard", key: "smartCard" },
    { label: "Amount", key: "amount" },
    { label: "InvoiceNo", key: "invoiceNo" },
  ],

  // Subscription Payment columns
  bulk_subscription_payment: [
    { label: "AgentSapBpId", key: "agentSapBpId" },
    { label: "SapBpId", key: "sapBpId" },
    { label: "Amount", key: "amount" },
    { label: "Currency", key: "currency" },
    { label: "PayMode", key: "payMode" },
    { label: "ChequeNo", key: "chequeNo" },
    { label: "ChequeDate", key: "chequeDate" },
    { label: "BankName", key: "bankName" },
    { label: "TransactionId", key: "transactionId" },
  ],

  // Hardware Payment columns
  bulk_hardware_payment: [
    { label: "SapBpId", key: "sapBpId" },
    { label: "Amount", key: "amount" },
    { label: "Currency", key: "currency" },
    { label: "PayMode", key: "payMode" },
    { label: "ChequeNo", key: "chequeNo" },
    { label: "ChequeDate", key: "chequeDate" },
    { label: "BankName", key: "bankName" },
    { label: "TransactionId", key: "transactionId" },
  ],

  // NEW: Hardware Payment Reversal columns
  bulk_hw_payment_reversal: [
    { label: "SapBpId", key: "sapBpId" },
    { label: "TransactionId", key: "transactionId" },
  ],

  // --- Plan Operations ---
  bulk_offer_change: [
    { label: "Start Date", key: "startDate" },
    { label: "Plan Code", key: "planCode" },
    { label: "SmartCardNo", key: "smartCardNo" },
  ],

  bulk_plan_purchase: [
    { label: "SapBpId", key: "sapBpId" },
    { label: "Plan Code", key: "planCode" },
    { label: "SmartCard", key: "smartCard" },
    { label: "STBNo", key: "stbNo" },
  ],

  bulk_plan_change: [
    { label: "Start Date", key: "startDate" },
    { label: "Plan Code", key: "planCode" },
    { label: "SmartCardNo", key: "smartCardNo" },
  ],

  bulk_plan_renewal: [
    { label: "SmartCard", key: "smartCard" },
    { label: "Duration", key: "duration" },
  ],

  bulk_plan_adjustment: [
    { label: "SmartCard", key: "smartCard" },
    { label: "EndDate", key: "endDate" },
  ],

  bulk_lock: [
    { label: "SmartCardNo", key: "smartCardNo" },
    { label: "EndDate", key: "endDate" },
  ],

  bulk_unlock: [
    { label: "SmartCardNo", key: "smartCardNo" },
    { label: "EndDate", key: "endDate" },
  ],

  bulk_retrack: [
    { label: "SmartCardNo", key: "smartCardNo" },
  ],

  bulk_plan_termination: [
    { label: "SmartCardNo", key: "smartCardNo" },
  ],
};

// ✅ Sanitization Utility - Prevent XSS and injection attacks
const sanitizeExcelData = (data: any[]): any[] => {
  return data.map(row => {
    const sanitized: any = {};
    Object.keys(row).forEach(key => {
      const value = row[key];

      if (typeof value === 'string') {
        let cleanValue = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          .trim();

        sanitized[key] = cleanValue.slice(0, MAX_STRING_LENGTH);
      } else if (typeof value === 'number') {
        sanitized[key] = isFinite(value) ? value : 0;
      } else {
        sanitized[key] = value;
      }
    });
    return sanitized;
  });
};

// ✅ Data Validation Utility - Validate data types and formats
const validateRowData = (data: any[], bulkType: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const MAX_ERRORS = 10;

  for (let idx = 0; idx < data.length && errors.length < MAX_ERRORS; idx++) {
    const row = data[idx];
    const rowNum = idx + 2;

    switch (bulkType) {
      case "bulk_payment":
        if (!row["Customer ID"] || String(row["Customer ID"]).trim() === '') {
          errors.push(`Row ${rowNum}: Customer ID is required`);
        }

        const payAmount = Number(row["Pay Amount"]);
        if (isNaN(payAmount) || payAmount <= 0) {
          errors.push(`Row ${rowNum}: Pay Amount must be a positive number`);
        }

        const validModes = ["CASH", "CHEQUE", "BANK_DEPOSIT", "POS", "MOBILE_MONEY"];
        const payMode = String(row["Pay Mode"] || '').toUpperCase().trim();
        if (!validModes.includes(payMode)) {
          errors.push(`Row ${rowNum}: Invalid Pay Mode. Must be one of: ${validModes.join(", ")}`);
        }
        break;

      case "bulk_credit_limit":
        const creditAmount = Number(row["Amount"]);
        if (isNaN(creditAmount) || creditAmount <= 0) {
          errors.push(`Row ${rowNum}: Amount must be a positive number`);
        }

        const sapBpId = String(row["SapBpId"] || '').trim();
        if (!sapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }
        break;

      case "bulk_invoice_cancel":
        if (!row["Invoice No"] || String(row["Invoice No"]).trim() === '') {
          errors.push(`Row ${rowNum}: Invoice No is required`);
        }
        break;

      case "bulk_payment_cancel":
        if (!row["Payment ID"] || String(row["Payment ID"]).trim() === '') {
          errors.push(`Row ${rowNum}: Payment ID is required`);
        }
        break;

      case "bulk_adjustment":
        const adjSapBpId = String(row["SapBpId"] || '').trim();
        if (!adjSapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }

        if (!row["SmartCard"] || String(row["SmartCard"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCard is required`);
        }

        const adjAmount = Number(row["Amount"]);
        if (isNaN(adjAmount) || adjAmount <= 0) {
          errors.push(`Row ${rowNum}: Amount must be a positive number`);
        }
        break;

      // Subscription Payment validation
      case "bulk_subscription_payment":
        const agentSapBpId = String(row["AgentSapBpId"] || '').trim();
        if (!agentSapBpId) {
          errors.push(`Row ${rowNum}: AgentSapBpId is required`);
        }

        const subPaySapBpId = String(row["SapBpId"] || '').trim();
        if (!subPaySapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }

        const subPayAmount = Number(row["Amount"]);
        if (isNaN(subPayAmount) || subPayAmount <= 0) {
          errors.push(`Row ${rowNum}: Amount must be a positive number`);
        }

        const subPayCurrency = String(row["Currency"] || '').trim();
        if (!subPayCurrency) {
          errors.push(`Row ${rowNum}: Currency is required`);
        }

        const subPayModes = ["CASH", "CHEQUE", "BANK_DEPOSIT", "POS", "MOBILE_MONEY"];
        const subPayMode = String(row["PayMode"] || '').toUpperCase().trim();
        if (!subPayModes.includes(subPayMode)) {
          errors.push(`Row ${rowNum}: Invalid PayMode. Must be one of: ${subPayModes.join(", ")}`);
        }

        if (subPayMode === "CHEQUE") {
          if (!row["ChequeNo"] || String(row["ChequeNo"]).trim() === '') {
            errors.push(`Row ${rowNum}: ChequeNo is required when PayMode is CHEQUE`);
          }

          const chequeDate = String(row["ChequeDate"] || '');
          if (!chequeDate) {
            errors.push(`Row ${rowNum}: ChequeDate is required when PayMode is CHEQUE`);
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(chequeDate)) {
            errors.push(`Row ${rowNum}: ChequeDate must be in YYYY-MM-DD format`);
          }

          if (!row["BankName"] || String(row["BankName"]).trim() === '') {
            errors.push(`Row ${rowNum}: BankName is required when PayMode is CHEQUE`);
          }
        }
        break;

      // Hardware Payment validation
      case "bulk_hardware_payment":
        const hwSapBpId = String(row["SapBpId"] || '').trim();
        if (!hwSapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }

        const hwAmount = Number(row["Amount"]);
        if (isNaN(hwAmount) || hwAmount <= 0) {
          errors.push(`Row ${rowNum}: Amount must be a positive number`);
        }

        const hwCurrency = String(row["Currency"] || '').trim();
        if (!hwCurrency) {
          errors.push(`Row ${rowNum}: Currency is required`);
        }

        const hwPayModes = ["CASH", "CHEQUE", "BANK_DEPOSIT", "POS", "MOBILE_MONEY"];
        const hwPayMode = String(row["PayMode"] || '').toUpperCase().trim();
        if (!hwPayModes.includes(hwPayMode)) {
          errors.push(`Row ${rowNum}: Invalid PayMode. Must be one of: ${hwPayModes.join(", ")}`);
        }

        if (hwPayMode === "CHEQUE") {
          if (!row["ChequeNo"] || String(row["ChequeNo"]).trim() === '') {
            errors.push(`Row ${rowNum}: ChequeNo is required when PayMode is CHEQUE`);
          }

          const hwChequeDate = String(row["ChequeDate"] || '');
          if (!hwChequeDate) {
            errors.push(`Row ${rowNum}: ChequeDate is required when PayMode is CHEQUE`);
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(hwChequeDate)) {
            errors.push(`Row ${rowNum}: ChequeDate must be in YYYY-MM-DD format`);
          }

          if (!row["BankName"] || String(row["BankName"]).trim() === '') {
            errors.push(`Row ${rowNum}: BankName is required when PayMode is CHEQUE`);
          }
        }
        break;

      // NEW: Hardware Payment Reversal validation
      case "bulk_hw_payment_reversal":
        const hwRevSapBpId = String(row["SapBpId"] || '').trim();
        if (!hwRevSapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }

        const hwRevTransactionId = String(row["TransactionId"] || '').trim();
        if (!hwRevTransactionId) {
          errors.push(`Row ${rowNum}: TransactionId is required`);
        }
        break;

      case "bulk_offer_change":
      case "bulk_plan_change":
        const startDate = String(row["Start Date"] || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          errors.push(`Row ${rowNum}: Start Date must be in YYYY-MM-DD format`);
        } else {
          const dateObj = new Date(startDate);
          if (isNaN(dateObj.getTime())) {
            errors.push(`Row ${rowNum}: Start Date is not a valid date`);
          }
        }

        if (!row["Plan Code"] || String(row["Plan Code"]).trim() === '') {
          errors.push(`Row ${rowNum}: Plan Code is required`);
        }

        if (!row["SmartCardNo"] || String(row["SmartCardNo"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCardNo is required`);
        }
        break;

      case "bulk_plan_purchase":
        const purchaseSapBpId = String(row["SapBpId"] || '').trim();
        if (!purchaseSapBpId) {
          errors.push(`Row ${rowNum}: SapBpId is required`);
        }

        if (!row["Plan Code"] || String(row["Plan Code"]).trim() === '') {
          errors.push(`Row ${rowNum}: Plan Code is required`);
        }

        if (!row["SmartCard"] || String(row["SmartCard"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCard is required`);
        }

        if (!row["STBNo"] || String(row["STBNo"]).trim() === '') {
          errors.push(`Row ${rowNum}: STBNo is required`);
        }
        break;

      case "bulk_plan_renewal":
        if (!row["SmartCard"] || String(row["SmartCard"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCard is required`);
        }

        if (!row["Duration"] || String(row["Duration"]).trim() === '') {
          errors.push(`Row ${rowNum}: Duration is required`);
        }
        break;

      case "bulk_plan_adjustment":
        if (!row["SmartCard"] || String(row["SmartCard"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCard is required`);
        }

        if (!row["EndDate"] || String(row["EndDate"]).trim() === '') {
          errors.push(`Row ${rowNum}: EndDate is required`);
        } else {
          const endDate = String(row["EndDate"] || '');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            errors.push(`Row ${rowNum}: EndDate must be in YYYY-MM-DD format`);
          }
        }
        break;

      case "bulk_lock":
      case "bulk_unlock":
        if (!row["SmartCardNo"] || String(row["SmartCardNo"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCardNo is required`);
        }

        if (!row["EndDate"] || String(row["EndDate"]).trim() === '') {
          errors.push(`Row ${rowNum}: EndDate is required`);
        } else {
          const endDate = String(row["EndDate"] || '');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            errors.push(`Row ${rowNum}: EndDate must be in YYYY-MM-DD format`);
          }
        }
        break;

      case "bulk_retrack":
      case "bulk_plan_termination":
        if (!row["SmartCardNo"] || String(row["SmartCardNo"]).trim() === '') {
          errors.push(`Row ${rowNum}: SmartCardNo is required`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
};

// ✅ File extension validation
const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
};

// ✅ File name sanitization
const isValidFileName = (filename: string): boolean => {
  const sanitizedName = filename.replace(/[^a-zA-Z0-9._\-\s()]/g, '');
  return sanitizedName === filename && filename.length <= 255;
};

// Interface for dropdown options
interface DropdownOption {
  name: string;
  value: string;
}

interface CollectedByOption {
  name: string;
  sapBpId: string;
  sapCaId: string | null;
}

interface PlantOption {
  plant: string;
  plantName: string;
  companyCode: string;
  companyCodeName: string;
}

interface StoreLocationOption {
  plant: string;
  StorageLocation: string;
  StorageLocationName: string;
}

export default function BulkUploadTab() {
  const { user } = useAuthContext();

  // ✅ Check User Roles
  const isAgent = user?.allAccess === "N" && !user?.isMainPlant && !user?.isOtc;
  const isOtc = user?.isOtc === "Y";
  const isMainPlant = user?.isMainPlant === "Y"; // Warehouse

  // ✅ Filter Bulk Types based on Role
  const filteredBulkTypes = useMemo(() => {
    // 1. Agent: Only Subscription Payment & Plan Purchase
    if (isAgent) {
      return BULK_TYPES.filter(type =>
        type.key === "bulk_subscription_payment" || type.key === "bulk_plan_purchase"
      );
    }

    // 2. OTC & Warehouse: Disable "Bulk Credit Limit", "Bulk Adjustment", "Bulk Plan Adjustment"
    if (isOtc || isMainPlant) {
      return BULK_TYPES.filter(type =>
        type.key !== "bulk_credit_limit" &&
        type.key !== "bulk_adjustment" &&
        type.key !== "bulk_plan_adjustment"
      );
    }

    // 3. Admin (Default): All Types
    return BULK_TYPES;
  }, [isAgent, isOtc, isMainPlant]);

  // ✅ Initialize State with First Filtered Type
  const [bulkType, setBulkType] = useState(filteredBulkTypes[0]?.key || BULK_TYPES[0].key);

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "validating" | "ready" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Secondary Dropdown States
  const [creditLimitType, setCreditLimitType] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<string>("");
  const [moduleType, setModuleType] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<string>("");

  // Subscription Payment Module State
  const [subscriptionPaymentModule, setSubscriptionPaymentModule] = useState<string>("");

  // Hardware Payment States
  const [hardwarePaymentModule, setHardwarePaymentModule] = useState<string>("");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [plant, setPlant] = useState<string>("");
  const [storeLocation, setStoreLocation] = useState<string>("");

  // Hardware Payment Options
  const [collectedByOptions, setCollectedByOptions] = useState<CollectedByOption[]>([]);
  const [plantOptions, setPlantOptions] = useState<PlantOption[]>([]);
  const [storeLocationOptions, setStoreLocationOptions] = useState<StoreLocationOption[]>([]);

  // Loading States
  const [isLoadingCollectedBy, setIsLoadingCollectedBy] = useState<boolean>(false);
  const [isLoadingPlants, setIsLoadingPlants] = useState<boolean>(false);
  const [isLoadingStoreLocations, setIsLoadingStoreLocations] = useState<boolean>(false);

  // Termination Reason State
  const [terminationReason, setTerminationReason] = useState<string>("");
  const [terminationReasonOptions, setTerminationReasonOptions] = useState<DropdownOption[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState<boolean>(false);

  const { toast } = useToast();

  // ✅ Update bulkType when filteredBulkTypes changes (e.g. login/logout)
  useEffect(() => {
    if (filteredBulkTypes.length > 0 && !filteredBulkTypes.some(t => t.key === bulkType)) {
      setBulkType(filteredBulkTypes[0].key);
    }
  }, [filteredBulkTypes, bulkType]);

  // ✅ Fetch termination reason dropdown when bulk_plan_termination is selected
  useEffect(() => {
    if (bulkType === "bulk_plan_termination") {
      fetchTerminationReasons();
    }
  }, [bulkType]);

  // ✅ Fetch collected by when hardware payment is selected
  useEffect(() => {
    if (bulkType === "bulk_hardware_payment") {
      fetchCollectedBy();
      fetchPlants();
    }
  }, [bulkType]);

  // ✅ Fetch store locations when plant is selected (for CUSTOMER module)
  useEffect(() => {
    if (bulkType === "bulk_hardware_payment" && hardwarePaymentModule === "CUSTOMER" && plant) {
      fetchStoreLocations(plant);
    }
  }, [bulkType, hardwarePaymentModule, plant]);

  // ✅ Reset store location when module changes
  useEffect(() => {
    if (bulkType === "bulk_hardware_payment") {
      setPlant("");
      setStoreLocation("");
      setStoreLocationOptions([]);
    }
  }, [hardwarePaymentModule]);

  const fetchTerminationReasons = async () => {
    setIsLoadingDropdowns(true);
    try {
      const response = await apiRequest("/dropdowns/onboarding", "GET");

      if (response && response.status === "SUCCESS" && response.data?.terminationReason) {
        setTerminationReasonOptions(response.data.terminationReason);
      } else {
        toast({
          title: "Warning",
          description: "Could not load termination reasons. Please try again.",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load termination reasons.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDropdowns(false);
    }
  };

  // Fetch Collected By
  const fetchCollectedBy = async () => {
    setIsLoadingCollectedBy(true);
    try {
      const response = await apiRequest("/data/collected-by", "POST", { type: ["MAIN_PLANT"] });

      if (response && response.status === "SUCCESS" && response.data?.collectedByList) {
        setCollectedByOptions(response.data.collectedByList);
      } else {
        toast({
          title: "Warning",
          description: "Could not load collected by options. Please try again.",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load collected by options.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCollectedBy(false);
    }
  };

  // Fetch Plants
  const fetchPlants = async () => {
    setIsLoadingPlants(true);
    try {
      const response = await apiRequest("/customer-payments/plants", "GET");

      if (response && response.status === "SUCCESS" && response.data?.plantDetails) {
        setPlantOptions(response.data.plantDetails);
      } else {
        toast({
          title: "Warning",
          description: "Could not load plant options. Please try again.",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load plant options.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPlants(false);
    }
  };

  // Fetch Store Locations
  const fetchStoreLocations = async (plantNumber: string) => {
    setIsLoadingStoreLocations(true);
    setStoreLocation(""); // Reset store location when plant changes
    try {
      const response = await apiRequest("/data/store-locations", "POST", {
        plantNumber: plantNumber,
        type: "OTC"
      });

      if (response && response.status === "SUCCESS" && response.data?.storageDetails) {
        setStoreLocationOptions(response.data.storageDetails);
      } else {
        toast({
          title: "Warning",
          description: "Could not load store location options. Please try again.",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load store location options.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStoreLocations(false);
    }
  };

  // ✅ Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setPreviewData([]);
      setFile(null);
      setValidationErrors([]);
    };
  }, []);

  // ✅ Optimized preview rows - only render what's needed
  const previewRows = useMemo(() => {
    return previewData.slice(0, PREVIEW_ROWS);
  }, [previewData]);

  const handleBulkTypeChange = (val: string) => {
    setBulkType(val);
    setFile(null);
    setPreviewData([]);
    setUploadStatus("idle");
    setErrorMsg(null);
    setValidationErrors([]);

    // Reset all secondary dropdowns
    setCreditLimitType("");
    setAdjustmentType("");
    setModuleType("");
    setExecutionMode("");
    setTerminationReason("");
    setSubscriptionPaymentModule("");

    // Reset hardware payment fields
    setHardwarePaymentModule("");
    setCollectedBy("");
    setPlant("");
    setStoreLocation("");
    setCollectedByOptions([]);
    setPlantOptions([]);
    setStoreLocationOptions([]);

    // Clear file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // ✅ Secure file upload handler with comprehensive validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setValidationErrors([]);
    setPreviewData([]);
    setUploadStatus("idle");

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMsg(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB.`);
      setUploadStatus("error");
      e.target.value = '';
      return;
    }

    if (selectedFile.size < 100) {
      setErrorMsg("File appears to be empty or too small.");
      setUploadStatus("error");
      e.target.value = '';
      return;
    }

    const fileExtension = getFileExtension(selectedFile.name);
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      setErrorMsg(`Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`);
      setUploadStatus("error");
      e.target.value = '';
      return;
    }

    if (selectedFile.type && !ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setErrorMsg("Invalid file type. Only Excel files (.xlsx, .xls) are allowed.");
      setUploadStatus("error");
      e.target.value = '';
      return;
    }

    if (!isValidFileName(selectedFile.name)) {
      setErrorMsg("File name contains invalid characters. Please rename the file using only letters, numbers, dots, hyphens, and underscores.");
      setUploadStatus("error");
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setUploadStatus("validating");

    const reader = new FileReader();

    reader.onerror = () => {
      setErrorMsg("Failed to read file. The file may be corrupted or inaccessible.");
      setUploadStatus("error");
      e.target.value = '';
    };

    reader.onabort = () => {
      setErrorMsg("File reading was aborted.");
      setUploadStatus("idle");
    };

    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) {
        setErrorMsg("Failed to read file contents.");
        setUploadStatus("error");
        return;
      }

      try {
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
          cellNF: false,
          cellStyles: false,
          sheetRows: MAX_ROWS + 1,
          raw: false
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setErrorMsg("Invalid Excel file. No worksheets found.");
          setUploadStatus("error");
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          setErrorMsg("Invalid Excel file. Worksheet is empty or corrupted.");
          setUploadStatus("error");
          return;
        }

        const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

        if (json.length === 0) {
          setErrorMsg("File is empty. Please add data rows below the header.");
          setUploadStatus("error");
          return;
        }

        if (json.length > MAX_ROWS) {
          setErrorMsg(`Too many rows. Maximum allowed is ${MAX_ROWS}. Your file has ${json.length} rows. Please split the file into smaller batches.`);
          setUploadStatus("error");
          return;
        }

        const colsDef = BULK_TYPE_COLUMNS[bulkType] || [];
        const requiredCols = colsDef.map(c => c.label);

        const firstRow = json[0] as any;
        const firstRowKeys = Object.keys(firstRow).map(k => k.trim());
        const missingCols = requiredCols.filter(col => !firstRowKeys.includes(col));

        if (missingCols.length > 0) {
          setErrorMsg(`Invalid Template. Missing required columns: ${missingCols.join(", ")}.\n\nExpected columns: ${requiredCols.join(", ")}`);
          setUploadStatus("error");
          return;
        }

        const sanitizedData = sanitizeExcelData(json);

        const validation = validateRowData(sanitizedData, bulkType);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          setErrorMsg(`Data validation failed. Found ${validation.errors.length} error(s).`);
          setUploadStatus("error");
          return;
        }

        setPreviewData(sanitizedData);
        setUploadStatus("ready");
        setValidationErrors([]);

      } catch (err: any) {
        let errorMessage = "Failed to parse Excel file.";
        if (err.message?.includes("password")) {
          errorMessage = "The Excel file is password-protected. Please remove the password and try again.";
        } else if (err.message?.includes("corrupt")) {
          errorMessage = "The Excel file appears to be corrupted. Please try re-saving it.";
        }

        setErrorMsg(errorMessage);
        setUploadStatus("error");
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // ✅ Handle template download
  const handleDownloadTemplate = () => {
    const columns = BULK_TYPE_COLUMNS[bulkType];

    if (!columns) {
      toast({
        title: "Configuration Error",
        description: "No template defined for this operation type.",
        variant: "destructive"
      });
      return;
    }

    try {
      const headers = columns.map(c => c.label);

      const sampleRow: any = {};
      columns.forEach(col => {
        switch (col.key) {
          case 'sapBpId':
            sampleRow[col.label] = '1234567890';
            break;
          case 'agentSapBpId':
            sampleRow[col.label] = '9876543210';
            break;
          case 'amount':
          case 'payAmount':
            sampleRow[col.label] = '1000';
            break;
          case 'currency':
            sampleRow[col.label] = 'TZS';
            break;
          case 'payMode':
            sampleRow[col.label] = 'CASH';
            break;
          case 'chequeNo':
            sampleRow[col.label] = 'CHQ123456';
            break;
          case 'chequeDate':
            sampleRow[col.label] = new Date().toISOString().split('T')[0];
            break;
          case 'bankName':
            sampleRow[col.label] = 'SAMPLE BANK';
            break;
          case 'transactionId':
            sampleRow[col.label] = 'TXN123456789';
            break;
          case 'startDate':
            sampleRow[col.label] = new Date().toISOString().split('T')[0];
            break;
          case 'endDate':
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            sampleRow[col.label] = futureDate.toISOString().split('T')[0];
            break;
          case 'smartCard':
          case 'smartCardNo':
            sampleRow[col.label] = 'SC123456789';
            break;
          case 'duration':
            sampleRow[col.label] = '30';
            break;
          case 'customerId':
            sampleRow[col.label] = 'CUST001';
            break;
          case 'invoiceNo':
            sampleRow[col.label] = 'INV001';
            break;
          case 'paymentId':
            sampleRow[col.label] = 'PAY001';
            break;
          case 'planCode':
            sampleRow[col.label] = 'PLAN001';
            break;
          case 'stbNo':
            sampleRow[col.label] = 'STB001';
            break;
          default:
            sampleRow[col.label] = `Sample_${col.label.replace(/\s+/g, '_')}`;
        }
      });

      const aoa: string[][] = [];
      aoa.push(headers);
      const dataRow = headers.map(header => String(sampleRow[header] || ''));
      aoa.push(dataRow);

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].t = 's';
            ws[cellAddress].z = '@';
            if (ws[cellAddress].v !== undefined) {
              ws[cellAddress].v = String(ws[cellAddress].v);
            }
          }
        }
      }

      const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const cleanTypeName = bulkType.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanTypeName}_template_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName, {
        bookType: 'xlsx',
        type: 'binary'
      });

      const selectedType = BULK_TYPES.find(t => t.key === bulkType);
      toast({
        title: "Template Downloaded",
        description: `Template for ${selectedType?.label} has been downloaded. All columns are in TEXT format.`
      });

    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Failed to generate template. Please try again.",
        variant: "destructive"
      });
    }
  };

  // ✅ Secure upload handler
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const selectedTypeConfig = BULK_TYPES.find(t => t.key === bulkType);

    if (!selectedTypeConfig) {
      toast({
        title: "Configuration Error",
        description: "Invalid operation type selected.",
        variant: "destructive"
      });
      return;
    }

    // Validation for dynamic dropdowns
    if (bulkType === "bulk_credit_limit" && !creditLimitType) {
      toast({
        title: "Validation Error",
        description: "Please select Credit Limit Type (SUB/HW)",
        variant: "destructive"
      });
      return;
    }

    if (bulkType === "bulk_adjustment") {
      if (!adjustmentType) {
        toast({
          title: "Validation Error",
          description: "Please select Adjustment Type (CREDIT/DEBIT)",
          variant: "destructive"
        });
        return;
      }
      if (!moduleType) {
        toast({
          title: "Validation Error",
          description: "Please select Module (SUBSCRIPTION/HARDWARE)",
          variant: "destructive"
        });
        return;
      }
    }

    // Subscription Payment Module validation
    if (bulkType === "bulk_subscription_payment" && !subscriptionPaymentModule) {
      toast({
        title: "Validation Error",
        description: "Please select Module (CUSTOMER/AGENT)",
        variant: "destructive"
      });
      return;
    }

    // Hardware Payment validation
    if (bulkType === "bulk_hardware_payment") {
      if (!hardwarePaymentModule) {
        toast({
          title: "Validation Error",
          description: "Please select Module (CUSTOMER/AGENT)",
          variant: "destructive"
        });
        return;
      }

      if (!collectedBy) {
        toast({
          title: "Validation Error",
          description: "Please select Collected By",
          variant: "destructive"
        });
        return;
      }

      // For CUSTOMER module, plant and store location are required
      if (hardwarePaymentModule === "CUSTOMER") {
        if (!plant) {
          toast({
            title: "Validation Error",
            description: "Please select Plant",
            variant: "destructive"
          });
          return;
        }

        if (!storeLocation) {
          toast({
            title: "Validation Error",
            description: "Please select Store Location",
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Execution Mode validation
    if ((bulkType === "bulk_plan_change" || bulkType === "bulk_offer_change") && !executionMode) {
      toast({
        title: "Validation Error",
        description: "Please select Execution Mode (Immediate/Schedule)",
        variant: "destructive"
      });
      return;
    }

    // Termination Reason validation for Plan Termination
    if (bulkType === "bulk_plan_termination" && !terminationReason) {
      toast({
        title: "Validation Error",
        description: "Please select Termination Reason",
        variant: "destructive"
      });
      return;
    }

    setUploadStatus("uploading");
    setErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, UPLOAD_TIMEOUT);

    try {
      const formData = new FormData();

      // 1. Core Metadata
      formData.append("operation", selectedTypeConfig.operation);
      formData.append("isPlanOperation", String(selectedTypeConfig.isPlanOperation));

      // 2. Payment/Adjustment fields
      formData.append("creditLimitType", creditLimitType);
      formData.append("adjustmentType", adjustmentType);

      // Module handling
      if (bulkType === "bulk_subscription_payment") {
        formData.append("module", subscriptionPaymentModule);
      } else if (bulkType === "bulk_hardware_payment") {
        formData.append("module", hardwarePaymentModule);
        formData.append("collectedBy", collectedBy);
        formData.append("plant", hardwarePaymentModule === "CUSTOMER" ? plant : "");
        formData.append("storeLocation", hardwarePaymentModule === "CUSTOMER" ? storeLocation : "");
      } else if (bulkType === "bulk_hw_payment_reversal") {
        // HW Payment Reversal - module is empty as per requirement
        formData.append("module", "");
      } else {
        formData.append("module", moduleType);
      }

      // 3. Plan Operation fields
      const noExecutionModeOperations = [
        "bulk_plan_purchase",
        "bulk_plan_renewal",
        "bulk_plan_adjustment",
        "bulk_lock",
        "bulk_unlock",
        "bulk_retrack",
        "bulk_plan_termination"
      ];

      let finalExecutionMode = "";
      if (noExecutionModeOperations.includes(bulkType)) {
        finalExecutionMode = "";
      } else {
        finalExecutionMode = executionMode;
      }
      formData.append("executionMode", finalExecutionMode);

      // 4. Termination Reason
      if (bulkType === "bulk_plan_termination") {
        formData.append("terminationReason", terminationReason);
      } else if (
        bulkType === "bulk_plan_renewal" ||
        bulkType === "bulk_plan_adjustment" ||
        bulkType === "bulk_lock" ||
        bulkType === "bulk_unlock" ||
        bulkType === "bulk_retrack"
      ) {
        formData.append("terminationReason", "");
      }

      // 5. File
      formData.append("excelFile", file);

      // 6. Send to BFF
      const res = await apiRequest("/upload/process", "POST", formData);

      clearTimeout(timeoutId);

      if (res && (res.message || res.status === "SUCCESS")) {
        setUploadStatus("success");

        const successCount = res.successRecordCount || previewData.length;
        const failedCount = res.failedRecordCount || 0;

        let description = `Successfully processed ${successCount} record(s).`;
        if (failedCount > 0) {
          description += ` ${failedCount} record(s) failed.`;
        }

        toast({
          title: "Upload Complete",
          description: res.message || description
        });

        // Clear state after successful upload
        setFile(null);
        setPreviewData([]);
        setValidationErrors([]);
        setTerminationReason("");
        setSubscriptionPaymentModule("");
        setHardwarePaymentModule("");
        setCollectedBy("");
        setPlant("");
        setStoreLocation("");

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } else {
        throw new Error(res?.statusMessage || "Unknown response from server");
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      setUploadStatus("error");

      let errorMessage = "There was an error processing your upload.";

      if (err.name === 'AbortError') {
        errorMessage = "Upload timed out. The server took too long to respond. Please try again with a smaller file or contact support.";
      } else if (err.status === 413) {
        errorMessage = "File too large for server. Please reduce the file size.";
      } else if (err.status === 401) {
        errorMessage = "Session expired. Please login again.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to perform this operation.";
      } else if (err.statusMessage) {
        errorMessage = err.statusMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setErrorMsg(errorMessage);

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // ✅ Clear/Reset handler
  const handleClearFile = () => {
    setFile(null);
    setPreviewData([]);
    setUploadStatus("idle");
    setErrorMsg(null);
    setValidationErrors([]);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Check if current bulk type requires any dropdown
  const showCreditLimitDropdown = bulkType === "bulk_credit_limit";
  const showAdjustmentDropdowns = bulkType === "bulk_adjustment";
  const showExecutionModeDropdown = bulkType === "bulk_plan_change" || bulkType === "bulk_offer_change";
  const showTerminationReasonDropdown = bulkType === "bulk_plan_termination";
  const showSubscriptionPaymentModule = bulkType === "bulk_subscription_payment";
  const showHardwarePaymentDropdowns = bulkType === "bulk_hardware_payment";

  return (
    <div className="space-y-6">
      {/* Upload Type Selection and Template Download */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Select Bulk Operation Type
            </label>
            <Select value={bulkType} onValueChange={handleBulkTypeChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredBulkTypes.map(type => (
                  <SelectItem key={type.key} value={type.key}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* DYNAMIC DROPDOWNS SECTION */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Credit Limit Type Dropdown */}
              {showCreditLimitDropdown && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Credit Limit Type <span className="text-red-500">*</span>
                  </label>
                  <Select value={creditLimitType} onValueChange={setCreditLimitType}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUB">Subscription (SUB)</SelectItem>
                      <SelectItem value="HW">Hardware (HW)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Adjustment Module & Type Dropdowns */}
              {showAdjustmentDropdowns && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                      Module <span className="text-red-500">*</span>
                    </label>
                    <Select value={moduleType} onValueChange={setModuleType}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Select Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUBSCRIPTION">SUBSCRIPTION</SelectItem>
                        <SelectItem value="HARDWARE">HARDWARE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                      Adjustment Type <span className="text-red-500">*</span>
                    </label>
                    <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Select Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREDIT">CREDIT</SelectItem>
                        <SelectItem value="DEBIT">DEBIT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Subscription Payment Module Dropdown */}
              {showSubscriptionPaymentModule && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Module <span className="text-red-500">*</span>
                  </label>
                  <Select value={subscriptionPaymentModule} onValueChange={setSubscriptionPaymentModule}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select Module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer Sub Payment</SelectItem>
                      <SelectItem value="AGENT">Agent Sub Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Hardware Payment Dropdowns */}
              {showHardwarePaymentDropdowns && (
                <>
                  {/* Module Dropdown */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                      Module <span className="text-red-500">*</span>
                    </label>
                    <Select value={hardwarePaymentModule} onValueChange={setHardwarePaymentModule}>
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Select Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer HW Payment</SelectItem>
                        <SelectItem value="AGENT">Agent HW Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Collected By Dropdown */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                      Collected By <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={collectedBy}
                      onValueChange={setCollectedBy}
                      disabled={isLoadingCollectedBy}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        {isLoadingCollectedBy ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select Collected By" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {collectedByOptions.map(option => (
                          <SelectItem key={option.sapBpId} value={option.sapBpId}>
                            {option.name} ({option.sapBpId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plant Dropdown - Only for CUSTOMER */}
                  {hardwarePaymentModule === "CUSTOMER" && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                        Plant <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={plant}
                        onValueChange={setPlant}
                        disabled={isLoadingPlants}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          {isLoadingPlants ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Loading...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select Plant" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {plantOptions.map(option => (
                            <SelectItem key={option.plant} value={option.plant}>
                              {option.plantName} ({option.plant})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Store Location Dropdown - Only for CUSTOMER and when plant is selected */}
                  {hardwarePaymentModule === "CUSTOMER" && plant && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                        Store Location <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={storeLocation}
                        onValueChange={setStoreLocation}
                        disabled={isLoadingStoreLocations}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          {isLoadingStoreLocations ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Loading...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select Store Location" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {storeLocationOptions.map(option => (
                            <SelectItem key={option.StorageLocation} value={option.StorageLocation}>
                              {option.StorageLocationName} ({option.StorageLocation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Execution Mode Dropdown (Only for Plan Change and Offer Change) */}
              {showExecutionModeDropdown && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Execution Mode <span className="text-red-500">*</span>
                  </label>
                  <Select value={executionMode} onValueChange={setExecutionMode}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Immediate</SelectItem>
                      <SelectItem value="S">Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Termination Reason Dropdown (Only for Plan Termination) */}
              {showTerminationReasonDropdown && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                    Termination Reason <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={terminationReason}
                    onValueChange={setTerminationReason}
                    disabled={isLoadingDropdowns}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      {isLoadingDropdowns ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select Reason" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {terminationReasonOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              Choose the type of bulk operation you want to perform. Required fields are marked with <span className="text-red-500">*</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Template File</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Download the .xlsx template with required columns (TEXT format)
            </p>
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Limits:</strong> Max {MAX_ROWS} rows, {MAX_FILE_SIZE / 1024 / 1024}MB file size
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-azam-blue" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Upload Excel File</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select your prepared Excel file (.xlsx or .xls)
              </p>
            </div>
          </div>

          {file && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              className="text-gray-500 hover:text-red-500"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <Input
            uiSize="sm"
            className="h-auto cursor-pointer"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploadStatus === "uploading"}
          />

          {uploadStatus === "validating" && (
            <div className="flex items-center gap-2 text-azam-blue p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-4 h-4 border-2 border-azam-blue border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Validating file structure and data...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-400 mb-1">Validation Error</h4>
                  <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap font-sans">
                    {errorMsg}
                  </pre>

                  {validationErrors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                      <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                        Errors found (showing first {Math.min(validationErrors.length, 10)}):
                      </p>
                      <ul className="text-xs text-red-700 dark:text-red-400 space-y-0.5">
                        {validationErrors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                      {validationErrors.length > 10 && (
                        <p className="text-xs text-red-600 mt-1">
                          ... and {validationErrors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {uploadStatus === "ready" && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                    File validated successfully!
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">
                    Ready to upload {previewData.length} record(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                    Upload completed successfully!
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">
                    Your records have been processed. You can upload another file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Data Section */}
      {previewData.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-azam-blue" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Data Preview ({previewData.length} records)
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing first {Math.min(previewRows.length, PREVIEW_ROWS)} rows
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  {(BULK_TYPE_COLUMNS[bulkType] || []).map(col => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {previewRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-700/30" : "bg-white dark:bg-gray-800"}
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {idx + 1}
                    </td>
                    {(BULK_TYPE_COLUMNS[bulkType] || []).map(col => {
                      const value = row[col.label] ??
                        row[Object.keys(row).find(k => k.trim() === col.label) || ''] ??
                        '-';
                      return (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 max-w-xs truncate"
                          title={String(value)}
                        >
                          {String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {previewData.length > PREVIEW_ROWS && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ... and {previewData.length - PREVIEW_ROWS} more records (not shown in preview)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Action */}
      {previewData.length > 0 && uploadStatus !== "success" && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <Button
            onClick={handleUpload}
            disabled={uploadStatus === "uploading"}
            className="px-8 py-2"
            size="lg"
          >
            {uploadStatus === "uploading" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {previewData.length} Records
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By uploading, you confirm that the data is accurate and ready for processing.
          </p>
        </div>
      )}

      {/* Upload Another File - After Success */}
      {uploadStatus === "success" && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleClearFile}
            variant="outline"
            className="px-6"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}
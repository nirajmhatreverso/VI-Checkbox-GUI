// src/pages/subscriber-view/subscriber-view.tsx

import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, FileText, CreditCard, Settings, Receipt, Loader2, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import SubscriberHeader from "./SubscriberHeader";
import CustomerDashboardTab from "./CustomerDashboardTab";
import OperationDialogs from "./OperationDialogs";
import TerminationDialog from "./TerminationDialog";
import KycStatusTab from "./Kyc Status";
import TicketsTable from "@/components/subscriptions/TicketsTable";
import PaymentTransactionsTable from "@/components/subscriptions/PaymentTransactionsTable";
import ServiceActionsTable from "@/components/subscriptions/ServiceActionsTable";
import BillingTable from "@/components/subscriptions/BillingTable";
import LedgerTable from "@/components/subscriptions/LedgerTable";
import ProvisioningHistoryPopup from "./ProvisioningDialog";
import { apiRequest } from "@/lib/queryClient";
import incidentApi from "@/lib/incidentApi";
import { useAuthContext } from "@/context/AuthProvider";
import { ToastAction } from "../ui/toast";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { pollWithBackoff } from "@/utils/polling";

// --- Helper Functions ---
const findContact = (contacts: any[], type: string) => contacts?.find(c => c.type === type)?.value || 'N/A';
const findAddress = (contacts: any[], type: string) => {
  const address = contacts?.find(c => c.type === type);
  return {
    address1: address?.address1 || '', address2: address?.address2 || '',
    region: address?.region || '', ward: address?.ward || '', city: address?.city || '',
    district: address?.district || '', country: address?.country || '', postcode: address?.postcode || '',
  };
};
const calculateWarrantyEndDate = (startDateStr: string) => {
  if (!startDateStr || startDateStr.length !== 8) return "N/A";
  try {
    const year = parseInt(startDateStr.substring(0, 4), 10);
    const month = parseInt(startDateStr.substring(4, 6), 10) - 1;
    const day = parseInt(startDateStr.substring(6, 8), 10);
    const startDate = new Date(year, month, day);
    if (isNaN(startDate.getTime())) return "N/A";
    startDate.setDate(startDate.getDate() + 365);
    return startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch (e) { return "N/A"; }
};
const formatApiDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return "N/A";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year}`;
};
const formatTimestamp = (ts: string | null) => {
  if (!ts) return "N/A";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch (e) { return "N/A"; }
};
const mapSubscriptionStatus = (status: string) => {
  switch (status) {
    case 'A': return 'ACTIVE';
    case 'L': return 'LOCKED';
    case 'T': return 'TERMINATED';
    case 'D': return 'DISCONNECTED';
    default: return 'INACTIVE';
  }
};

export default function SubscriberView() {

  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  const { user } = useAuthContext();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- 1. Initialization Logic ---
  const searchParams = new URLSearchParams(searchString);
  const contractFromUrl = searchParams.get("contract");
  const bpFromUrl = searchParams.get("bp");

  const { state } = window.history;
  const {
    customerData: initialCustomerData = [],
    selectedContractNo: stateContractNo = null,
    fallbackHardwareData: navFallbackHardwareData = null
  } = state || {};

  // Prioritize URL, then State (from Search page)
  const initialContract = contractFromUrl || stateContractNo || null;

  // --- 2. State Initialization ---
  const [activeTab, setActiveTab] = useState("customer");
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    // Invalidate the relevant query when switching to that tab
    switch (newTab) {
      case 'payment-transactions':
        queryClient.invalidateQueries({
          queryKey: ['paymentTransactions', selectedBpId]
        });
        break;
      case 'service-transactions':
        queryClient.invalidateQueries({
          queryKey: ['serviceDetails', selectedBpId]
        });
        break;
      case 'billing':
        queryClient.invalidateQueries({
          queryKey: ['billingDetails', selectedBpId, selectedCaId]
        });
        break;
      case 'ledger':
        queryClient.invalidateQueries({
          queryKey: ['ledgerDetails', selectedBpId, selectedCaId]
        });
        break;
      case 'tickets':
        queryClient.invalidateQueries({
          queryKey: ['customerTickets', selectedBpId]
        });
        break;
    }
  };
  const [activePopup, setActivePopup] = useState<string>("");
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [isProvisioningHistoryOpen, setIsProvisioningHistoryOpen] = useState(false);

  const [selectedBpId, setSelectedBpId] = useState<string>(bpFromUrl || "");
  const [selectedCaId, setSelectedCaId] = useState<string>("");
  const [selectedContractNo, setSelectedContractNo] = useState<string | null>(initialContract);
  const [isRefreshingContract, setIsRefreshingContract] = useState(false);
  const [allCustomerData, setAllCustomerData] = useState<any[]>(initialCustomerData);

  // --- 3. Refresh/Restore Logic ---
  const shouldFetchOnRefresh = allCustomerData.length === 0 && (!!selectedContractNo || !!selectedBpId);

  const { data: refreshedCustomerData, isLoading: isRefetchingCustomer } = useQuery({
    queryKey: ['refreshCustomerData', selectedContractNo, selectedBpId],
    queryFn: () => {
      const payload: any = { salesOrg: user?.salesOrg || "" };
      if (selectedBpId) payload.sapBpId = selectedBpId;
      else if (selectedContractNo) payload.contractNo = selectedContractNo;
      return apiRequest('/subscriptions/search-customers', 'POST', payload);
    },
    enabled: shouldFetchOnRefresh,
    staleTime: 0
  });

  useEffect(() => {
    if (refreshedCustomerData?.status === "SUCCESS" && refreshedCustomerData.data?.customerDetails) {
      setAllCustomerData(refreshedCustomerData.data.customerDetails);
    }
  }, [refreshedCustomerData]);

  // --- 4. Selection Logic ---
  useEffect(() => {
    if (allCustomerData.length > 0) {
      let record = null;
      if (selectedContractNo) record = allCustomerData.find((c: any) => c.relatedParty[0]?.contractNo === selectedContractNo);
      if (!record && selectedBpId) record = allCustomerData.find((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId);
      if (!record && !selectedContractNo && !selectedBpId) record = allCustomerData[0];

      if (record) {
        if (!selectedBpId || selectedBpId !== record.relatedParty[0].sapBpId) setSelectedBpId(record.relatedParty[0].sapBpId);
        if (!selectedCaId || selectedCaId !== record.relatedParty[0].sapCaId) setSelectedCaId(record.relatedParty[0].sapCaId);
        if (!selectedContractNo && record.relatedParty[0].contractNo) setSelectedContractNo(record.relatedParty[0].contractNo);
      }
    }
  }, [allCustomerData, selectedContractNo, selectedBpId]);

  // URL Sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let updated = false;
    if (selectedContractNo && params.get("contract") !== selectedContractNo) { params.set("contract", selectedContractNo); updated = true; }
    if (selectedBpId && params.get("bp") !== selectedBpId) { params.set("bp", selectedBpId); updated = true; }
    if (updated) window.history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedContractNo, selectedBpId]);

  // --- 5. Data Fetching ---
  const { data: dropdownsData } = useQuery({
    queryKey: ['onboardingDropdowns'],
    queryFn: () => apiRequest('/dropdowns/onboarding'),
    staleTime: 1000 * 60 * 60,
    select: (data) => data?.data || {},
  });
  const dropdownOptions = dropdownsData || {};

  // Derived Lists
  const uniqueBpIds = useMemo(() => Array.from(new Set(allCustomerData.map((c: any) => c.relatedParty[0]?.sapBpId).filter(Boolean))) as string[], [allCustomerData]);
  const availableCaIds = useMemo(() => {
    if (!selectedBpId) return [];
    const filtered = allCustomerData.filter((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId);
    return Array.from(new Set(filtered.map((c: any) => c.relatedParty[0]?.sapCaId).filter(Boolean))) as string[];
  }, [selectedBpId, allCustomerData]);
  const availableContractNos = useMemo(() => {
    if (!selectedBpId || !selectedCaId) return [];
    const filtered = allCustomerData.filter((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId && c.relatedParty[0]?.sapCaId === selectedCaId);
    return Array.from(new Set(filtered.map((c: any) => c.relatedParty[0]?.contractNo).filter(Boolean))) as string[];
  }, [selectedBpId, selectedCaId, allCustomerData]);

  const currentCustomerRecord = useMemo(() => {
    if (selectedContractNo) return allCustomerData.find((c: any) => c.relatedParty[0]?.contractNo === selectedContractNo) || allCustomerData[0];
    if (selectedBpId) return allCustomerData.find((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId) || allCustomerData[0];
    return allCustomerData[0] || null;
  }, [selectedContractNo, selectedBpId, allCustomerData]);

  const salesOrg = useMemo(() => currentCustomerRecord?.relatedParty?.[0]?.salesOrg || "Azam Media Ltd", [currentCustomerRecord]);
  const isPostpaid = useMemo(() => currentCustomerRecord?.agreementType?.toUpperCase() === 'POSTPAID', [currentCustomerRecord]);

  const selectedCustomerCurrency = useMemo(() => {
    const record = currentCustomerRecord;
    return record?.relatedParty?.[0]?.currency || 'TZS';
  }, [currentCustomerRecord]);

  const currenciesToFetch = useMemo(() => {
    if (selectedCustomerCurrency === 'ZWG') {
      return ['ZWG', 'USD'];
    }
    return [selectedCustomerCurrency];
  }, [selectedCustomerCurrency]);

  // --- 6. Main Queries ---
  const { data: subscriptionResponse, isLoading: isSubscriptionLoading, error: subscriptionError } = useQuery({
    queryKey: ['subscriptionDetails', selectedBpId, selectedCaId, selectedContractNo],
    queryFn: () => apiRequest('/subscriptions/details', 'POST', {
      sapBpId: selectedBpId,
      sapCaId: selectedCaId,
      contractNo: selectedContractNo,
      salesOrg: salesOrg
    }),
    enabled: !!selectedBpId && !!selectedCaId && !!selectedContractNo,
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (subscriptionError) {
      const errorMsg = (subscriptionError as any)?.statusMessage || "";
      if (errorMsg.toLowerCase().includes('more then two device')) {
        setMultipleDeviceError(errorMsg);
      } else {
        setMultipleDeviceError("");
      }
    } else if (subscriptionResponse?.status === 'FAILURE') {
      const errorMsg = subscriptionResponse?.statusMessage || "";
      if (errorMsg.toLowerCase().includes('more then two device')) {
        setMultipleDeviceError(errorMsg);
      } else {
        setMultipleDeviceError("");
      }
    } else {
      setMultipleDeviceError("");
    }
  }, [subscriptionError, subscriptionResponse]);

  const { data: balanceResponse, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['customerBalances', selectedBpId, selectedCaId, isPostpaid, user?.salesOrg || salesOrg, currenciesToFetch],
    queryFn: async () => {
      const promises = currenciesToFetch.map(async (currencyCode: string) => {
        try {
          if (isPostpaid) {
            const res = await apiRequest('/customer-payments/balance-by-bp', 'POST', {
              salesOrg: user?.salesOrg || salesOrg,
              sapBpId: selectedBpId,
              currency: currencyCode
            });
            return { data: res?.data || res, currency: currencyCode, status: res?.status };
          } else {
            const res = await apiRequest('/customer-payments/balance', 'POST', {
              sapBpId: selectedBpId,
              sapCaId: selectedCaId,
              currency: currencyCode
            });
            return { data: res?.data || res, currency: currencyCode, status: res?.status };
          }
        } catch (e) {
          return { data: null, currency: currencyCode, status: 'ERROR' };
        }
      });
      return Promise.all(promises);
    },
    enabled: !!selectedBpId && (isPostpaid || !!selectedCaId) && !!currentCustomerRecord && currenciesToFetch.length > 0,
    staleTime: 0,
    refetchOnMount: true,
  });

  const balances = useMemo(() => {
    if (!balanceResponse) return [{ hwBalance: '0', subsBalance: '0', currency: selectedCustomerCurrency }];
    return balanceResponse.map((res: any) => {
      const data = res.data;
      const currency = res.currency;
      if (res.status === 'SUCCESS' && data) {
        if (isPostpaid) {
          return { hwBalance: String(data.balance || '0'), subsBalance: '0', currency: data.currency || currency };
        } else {
          return { hwBalance: String(data.hwBalance || '0'), subsBalance: String(data.subsBalance || '0'), currency: data.currency || currency };
        }
      }
      return { hwBalance: '0', subsBalance: '0', currency };
    });
  }, [balanceResponse, isPostpaid, selectedCustomerCurrency]);

  const subscriptionDetails = subscriptionResponse?.data?.subscriptionDetails || [];
  const hasHardwareInSubscription = useMemo(() => subscriptionDetails.some((item: any) => item.ITEM_CATEGORY === 'ZHWO'), [subscriptionDetails]);

  const { data: stbHwDetailsResponse, isLoading: isStbHwLoading, error: stbHwError } = useQuery({
    queryKey: ['stbHwDetails', selectedBpId],
    queryFn: () => apiRequest('/subscriptions/hardware-details', 'POST', { sapBpId: selectedBpId, module: 'CUSTOMER', status: 'ACTIVE' }),
    enabled: !!selectedBpId && (!selectedContractNo || (!isSubscriptionLoading && !hasHardwareInSubscription)),
    retry: false,
  });

  const { data: ticketsData, isLoading: isTicketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['customerTickets', selectedBpId],
    queryFn: () => incidentApi.fetchByCustomer(selectedBpId),
    enabled: !!selectedBpId && activeTab === 'tickets',
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0,
  });

  useEffect(() => {
    if (activeTab === 'tickets' && selectedBpId) {
      refetchTickets();
    }
  }, [activeTab, selectedBpId, refetchTickets]);

  const tickets = useMemo(() => {
    const rawTickets = ticketsData?.data?.data;
    if (!rawTickets || !Array.isArray(rawTickets)) return [];
    return rawTickets.map((t: any) => {
      let dateStr = "N/A", timeStr = "N/A";
      if (t.createTs) {
        const d = new Date(t.createTs);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } else if (t.createDt) dateStr = formatApiDate(t.createDt);
      return {
        id: t.objId, customerId: t.incidentReporter2customer || "", date: dateStr, time: timeStr,
        ticketId: t.idNumber, type: t.incidentCatagory || "N/A", priority: t.incidentPriority || "N/A",
        status: t.incidentStatus || "N/A", agent: t.assignmentGroup || t.incidentContact || "N/A",
        description: t.title || "N/A", resolution: t.caseHistory || "",
      };
    });
  }, [ticketsData]);

  const fallbackHardwareData = stbHwDetailsResponse?.data?.stbHwDetails || navFallbackHardwareData || null;
  const hasContract = useMemo(() => allCustomerData.some((c: any) => !!c.relatedParty[0]?.contractNo), [allCustomerData]);
  const hasHardware = useMemo(() => {
    if (hasHardwareInSubscription) return true;
    return !!fallbackHardwareData && fallbackHardwareData.length > 0;
  }, [hasHardwareInSubscription, fallbackHardwareData]);
  const accountClass = (currentCustomerRecord?.engagedParty?.customerType || '').toUpperCase();
  const isVipOrDemo = ['VIP', 'DEMO'].includes(accountClass);
  const isPostpaidVipOrDemo = isPostpaid && isVipOrDemo;
  const [multipleDeviceError, setMultipleDeviceError] = useState<string>("");

  // Allow purchase if:
  // 1. Standard case: has hardware but no contract
  // 2. Special case: postpaid VIP/DEMO (allow even if balance is low)
  const isPurchaseAllowed = (hasHardware && !hasContract) || isPostpaidVipOrDemo;

  const displayData = useMemo(() => {
    if (!currentCustomerRecord) return null;
    const mainInfo = currentCustomerRecord;
    const partyInfo = mainInfo.relatedParty?.[0] || {};
    const roleInfo = mainInfo.engagedPartyRole?.[0] || {};
    const primarySubscription = subscriptionDetails.find((s: any) => s.ITEM_CATEGORY === 'ZBPO') || {};
    const hardwareInfoFromSub = subscriptionDetails.find((s: any) => s.ITEM_CATEGORY === 'ZHWO') || {};

    let stbSerialNumber = 'N/A', smartCardNumber = 'N/A', stbModel = 'N/A', purchaseDate = 'N/A', warrantyEndDate = 'N/A', condition = 'N/A';

    if (hasHardware) {
      if (hasHardwareInSubscription) {
        stbSerialNumber = hardwareInfoFromSub.TECHNICAL_RES_ID || 'N/A';
        smartCardNumber = primarySubscription.TECHNICAL_RES_ID || 'N/A';
        stbModel = hardwareInfoFromSub.HW_MODEL || hardwareInfoFromSub.PLAN_NAME || 'N/A';
        purchaseDate = formatApiDate(hardwareInfoFromSub.PLAN_START_DT);
        warrantyEndDate = calculateWarrantyEndDate(hardwareInfoFromSub.PLAN_START_DT);
        condition = hardwareInfoFromSub.STATUS === 'A' ? 'WORKING' : 'FAULTY';
      }
      if (fallbackHardwareData && Array.isArray(fallbackHardwareData)) {
        const stb = fallbackHardwareData.find((d: any) => d.deviceModel === 'STB');
        const sc = fallbackHardwareData.find((d: any) => d.deviceModel === 'SC');
        if (stb) {
          stbSerialNumber = stb.deviceSerialNo || stbSerialNumber;
          stbModel = stb.hwModel || stb.deviceModel || stbModel;
          purchaseDate = formatTimestamp(stb.purchaseTs) !== "N/A" ? formatTimestamp(stb.purchaseTs) : purchaseDate;
          warrantyEndDate = formatTimestamp(stb.warrantyExpiryTs) !== "N/A" ? formatTimestamp(stb.warrantyExpiryTs) : warrantyEndDate;
        }
        if (sc) { smartCardNumber = sc.deviceSerialNo || smartCardNumber; }
      }
    }
    const isScheduled = primarySubscription.ZZFIELD1 === 'SCHEDULED';
    const scheduledRequestId = primarySubscription.PROCESS_ID || "";
    return {
      customerId: mainInfo.id,custId: mainInfo.custId || mainInfo.id, 
      onbId: mainInfo.onbId,firstName: mainInfo.firstName, lastName: mainInfo.lastName,kycPoiName: mainInfo.poiDocPath ? mainInfo.poiDocPath.split(/[\\/]/).pop() : null,
      kycPoaName: mainInfo.poaDocPath ? mainInfo.poaDocPath.split(/[\\/]/).pop() : null,
      email: findContact(mainInfo.contactMedium, 'email'), mobile: findContact(mainInfo.contactMedium, 'mobile'),
      customerType: mainInfo.agreementType, accountClass: mainInfo.engagedParty?.customerType,
      custProfile: roleInfo.custProfile || 'N/A', custSegmt: roleInfo.custSegmt || 'N/A',
      billingAddress: findAddress(mainInfo.contactMedium, 'BILLING_ADDRESS'),
      installationAddress: findAddress(mainInfo.contactMedium, 'INSTALLATION_ADDRESS'),
      sapBpId: partyInfo.sapBpId, sapCaId: partyInfo.sapCaId, salesOrg: salesOrg, contractNo: partyInfo.contractNo,
      macId: smartCardNumber, divisionType: partyInfo.division,
      connectionDate: formatApiDate(primarySubscription.CONTRACT_START_DT) !== "N/A" ? formatApiDate(primarySubscription.CONTRACT_START_DT) : (mainInfo.createDt ? new Date(mainInfo.createDt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "N/A"),
      currentSubscription: {
        planName: primarySubscription.PLAN_NAME || "N/A", planType: primarySubscription.ZCONNECTIONTYPE,
        totalAmount: parseFloat(primarySubscription.CHARGE_AMT || 0), startDate: formatApiDate(primarySubscription.PLAN_START_DT),
        endDate: formatApiDate(primarySubscription.PLAN_END_DT), endDateRaw: primarySubscription.PLAN_END_DT,
        status: mapSubscriptionStatus(primarySubscription.STATUS),
        autoRenewal: primarySubscription.AUTO_RENEWAL_FLAG === '1',
        pkgCode: primarySubscription.PKG_CODE, planVarCode: primarySubscription.PLAN_VAR_CODE,
        isScheduled: isScheduled, scheduledRequestId: scheduledRequestId,
      },
      hardware: { stbModel, stbSerialNumber, purchaseDate, warrantyEndDate, condition, agentId: primarySubscription.ZZFIELD2 || hardwareInfoFromSub.ZZFIELD2 || 'N/A', // ✅ Using ZZFIELD2
  dealerAgentCode: primarySubscription.ZZFIELD2 || hardwareInfoFromSub.ZZFIELD2 || 'N/A', assignedTechnician: '' },
      hwBalance: balances[0]?.hwBalance || '0', subsBalance: balances[0]?.subsBalance || '0', walletCurrency: balances[0]?.currency || selectedCustomerCurrency,
      allBalances: balances,
      status: mapSubscriptionStatus(primarySubscription.STATUS), kycStatus: "Verified",kycDate: mainInfo.kycDate,kycApprovedBy: mainInfo.kycApprovedBy,
      cusStatus: primarySubscription.CUS_STATUS || mainInfo?.CUS_STATUS || mainInfo?.cusStatus || 'ACTIVE',
      tickets: tickets,
    };
  }, [currentCustomerRecord, subscriptionDetails, fallbackHardwareData, hasHardwareInSubscription, hasHardware, balances, tickets]);

  const subscriptionItemsForPanel = useMemo(() => {
    return subscriptionDetails.filter((item: any) => item.ITEM_CATEGORY === 'ZBPO' || item.ITEM_CATEGORY === 'ZADO');
  }, [subscriptionDetails]);

  // --- 8. Handlers ---
  const handleBpChange = (bpId: string) => {
    setSelectedBpId(bpId);
    const record = allCustomerData.find((c: any) => c.relatedParty[0]?.sapBpId === bpId);
    if (record) {
      setSelectedCaId(record.relatedParty[0].sapCaId);
      const contractRecord = allCustomerData.find((c: any) => c.relatedParty[0]?.sapBpId === bpId && c.relatedParty[0]?.sapCaId === record.relatedParty[0].sapCaId);
      if (contractRecord) setSelectedContractNo(contractRecord.relatedParty[0].contractNo || null);
    }
  };

  const handleCaChange = (caId: string) => {
    setSelectedCaId(caId);
    const record = allCustomerData.find((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId && c.relatedParty[0]?.sapCaId === caId);
    if (record) setSelectedContractNo(record.relatedParty[0].contractNo || null);
  };

  const openPopup = (popupType: string) => setActivePopup(popupType);
  const closePopup = () => setActivePopup("");

  const handleOperationSuccess = async (
    message: string,
    operationType?: string,
    requestId?: string
  ) => {
    closePopup();

    const synchronousOperations = [
      "PLAN_CHANGE",
      "OFFER_CHANGE",
      "TERMINATION",
      "SUSPENSION",
      "RECONNECTION",
    ];

    const approvalOperations = ["EXTENSION", "EXTEND_VALIDITY"];

    // ✅ Approval operations - no waiting
    if (operationType && approvalOperations.includes(operationType)) {
      toast({
        title: `✅ Request Submitted`,
        description: `${operationType} request sent for approval.`,
        duration: 5000,
        action: (
          <ToastAction
            altText="View Status"
            onClick={() => setActiveTab("service-transactions")}
          >
            View Request
          </ToastAction>
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["subscriptionDetails"] });
      return;
    }

    // ✅ Synchronous operations with intelligent polling
    if (operationType && synchronousOperations.includes(operationType)) {
      setIsRefreshingContract(true);

      const actionLabels: Record<string, string> = {
        PLAN_CHANGE: "Plan Change",
        OFFER_CHANGE: "Offer Change",
        TERMINATION: "Termination",
        SUSPENSION: "Service Suspension",
        RECONNECTION: "Service Reconnection",
      };

      const label = actionLabels[operationType] || "Operation";

      toast({
        title: `Processing ${label}...`,
        description: "Please wait while we update your subscription.",
        duration: 2000,
      });

      // ✅ Create new abort controller for this operation
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const fromDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const toDate = format(new Date(), "yyyy-MM-dd");

      // ✅ Poll with intelligent backoff
      const result = await pollWithBackoff(
        operationType,
        async () => {
          const serviceActionsResponse = await apiRequest(
            "/subscriptions/service-details",
            "POST",
            {
              sapBpId: selectedBpId,
              fromDate,
              toDate,
              offSet: "0",
              limit: "5",
            }
          );

          if (
            serviceActionsResponse?.status === "SUCCESS" &&
            serviceActionsResponse.data?.serviceDetails
          ) {
            const serviceDetails = serviceActionsResponse.data.serviceDetails;

            const targetAction = requestId
              ? serviceDetails.find((action: any) => action.requestId === requestId)
              : serviceDetails.find((action: any) => {
                const type = (action.actionType || "").toUpperCase();
                const apiActionTypeMap: Record<string, string[]> = {
                  PLAN_CHANGE: ["PLAN_CHANGE"],
                  OFFER_CHANGE: ["OFFER_CHANGE"],
                  TERMINATION: ["TERMINATION", "DISCONNECT"],
                  SUSPENSION: ["LOCK", "SUSPEND"],
                  RECONNECTION: ["UNLOCK", "RECONNECT", "RESTORE"],
                };
                return (apiActionTypeMap[operationType] || []).includes(type);
              });

            if (targetAction) {
              const cmStatus = targetAction.cmStatus?.toUpperCase();

              // ✅ Success
              if (["S", "SUCCESS"].includes(cmStatus)) {
                return { found: true, data: targetAction };
              }

              // ❌ Failure
              if (["F", "FAILED"].includes(cmStatus)) {
                setIsRefreshingContract(false);
                toast({
                  title: `❌ ${label} Failed`,
                  description: targetAction.cmStatusMsg || "Operation failed.",
                  variant: "destructive",
                });
                // Return found: true to stop polling, but mark as failure
                return { found: true, data: null };
              }

              // ⏳ Inprocess - continue polling
            }
          }

          return { found: false };
        },
        abortControllerRef.current.signal
      );

      // ✅ Handle result
      if (result.success && result.data) {
        try {
          const refreshedData = await apiRequest(
            "/subscriptions/details",
            "POST",
            {
              sapBpId: selectedBpId,
              sapCaId: selectedCaId,
              contractNo: selectedContractNo,
              salesOrg: salesOrg,
            }
          );

          if (refreshedData?.status === "SUCCESS") {
            queryClient.setQueryData(
              ["subscriptionDetails", selectedBpId, selectedCaId, selectedContractNo],
              refreshedData
            );

            toast({
              title: `✅ ${label} Complete`,
              description: `Operation completed in ${(result.totalTime / 1000).toFixed(1)}s`,
              duration: 3000,
            });
          }
        } catch (e) {
          console.error("Failed to refresh data:", e);
        }
      } else if (!abortControllerRef.current.signal.aborted) {
        // ⚠️ Timeout or failure
        toast({
          title: "⚠️ Processing Delay",
          description: `Operation took longer than expected (${result.attempts} attempts). Please check back shortly.`,
          variant: "default",
          duration: 5000,
        });
      }

      // Always invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["subscriptionDetails"] });
      queryClient.invalidateQueries({ queryKey: ["customerBalance"] });
      queryClient.invalidateQueries({ queryKey: ["serviceDetails"] });

      setIsRefreshingContract(false);
      return;
    }

    // ✅ Purchase operation with intelligent polling
    if (operationType === "PURCHASE") {
      setIsRefreshingContract(true);
      toast({
        title: "Purchase Successful!",
        description: "Updating account...",
        duration: 5000,
      });

      abortControllerRef.current = new AbortController();

      const result = await pollWithBackoff(
        "PURCHASE",
        async () => {
          const refreshedData = await apiRequest(
            "/subscriptions/search-customers",
            "POST",
            { sapBpId: selectedBpId, salesOrg: user?.salesOrg || "" }
          );

          if (
            refreshedData?.status === "SUCCESS" &&
            refreshedData.data?.customerDetails?.length > 0
          ) {
            const newCustomerData = refreshedData.data.customerDetails;
            const recordWithContract = newCustomerData.find(
              (c: any) => c.relatedParty?.[0]?.contractNo
            );

            if (recordWithContract) {
              const newContractNo = recordWithContract.relatedParty[0].contractNo;
              setAllCustomerData(newCustomerData);
              setSelectedCaId(recordWithContract.relatedParty[0].sapCaId);
              setSelectedContractNo(newContractNo);

              const params = new URLSearchParams(window.location.search);
              params.set("contract", newContractNo);
              window.history.replaceState(null, "", `?${params.toString()}`);

              return { found: true, data: newContractNo };
            }
          }

          return { found: false };
        },
        abortControllerRef.current.signal
      );

      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ["subscriptionDetails"] });
        queryClient.invalidateQueries({ queryKey: ["customerBalance"] });
        queryClient.invalidateQueries({ queryKey: ["stbHwDetails"] });

        toast({
          title: "✅ Account Updated!",
          description: `Contract ${result.data} is active (${(result.totalTime / 1000).toFixed(1)}s)`,
          duration: 5000,
        });

        window.dispatchEvent(new Event("storage"));
      } else if (!abortControllerRef.current.signal.aborted) {
        toast({
          title: "⚠️ Refresh Required",
          description: "Purchase successful, contract creation delayed.",
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction
              altText="Refresh Now"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh
            </ToastAction>
          ),
        });
      }

      setIsRefreshingContract(false);
      return;
    }

    // ✅ Default success message
    toast({
      title: "✅ Operation Successful",
      description: message,
      duration: 3000,
    });
    queryClient.invalidateQueries({ queryKey: ["subscriptionDetails"] });
    queryClient.invalidateQueries({ queryKey: ["customerBalance"] });
  };

  const handleRetrack = () => {
    const RETRACK_COOLDOWN_MS = 15 * 60 * 1000;
    const storageKey = `lastRetrackTimestamp_${displayData?.sapBpId}`;
    const lastRetrackTimestamp = localStorage.getItem(storageKey);
    if (lastRetrackTimestamp) {
      const timeSinceLastRetrack = new Date().getTime() - new Date(lastRetrackTimestamp).getTime();
      if (timeSinceLastRetrack < RETRACK_COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((RETRACK_COOLDOWN_MS - timeSinceLastRetrack) / 60000);
        toast({ title: "Cooldown Active", description: `Wait ${remainingMinutes} minutes.`, variant: "destructive" });
        return;
      }
    }
    openPopup('retrack');
  };

  const handleExportCustomer = () => {
    if (!displayData) { toast({ title: "Export Failed", description: "No data available.", variant: "destructive" }); return; }
    const csvContent = [['Field', 'Value'], ['Customer ID', displayData.customerId], ['Name', `${displayData.firstName} ${displayData.lastName}`], ['SAP BP', displayData.sapBpId], ['SAP Contract', displayData.contractNo]].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customer-${displayData.customerId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful" });
  };

  // --- 9. Render Logic ---
  const isLoading = isSubscriptionLoading || isStbHwLoading || isBalanceLoading || isRefetchingCustomer;

  if (!isLoading && (!allCustomerData || allCustomerData.length === 0)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold">Customer Not Found</h3>
        <p className="text-gray-500">Could not retrieve customer details. The contract ID might be invalid.</p>
        <Link href="/search-subscriber"><Button>Go to Search</Button></Link>
      </div>
    );
  }

  if (isLoading || !displayData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
        <span className="ml-3 text-lg text-gray-600">Loading Subscriber Details...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {isRefreshingContract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative"><div className="absolute inset-0 bg-azam-blue/20 rounded-full animate-ping"></div><div className="relative bg-azam-blue/10 p-4 rounded-full"><Loader2 className="h-12 w-12 animate-spin text-azam-blue" /></div></div>
              <div className="text-center space-y-2"><h3 className="text-xl font-bold text-gray-900">🎉 Processing Request</h3><p className="text-sm text-gray-600">Updating subscription details...</p></div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="bg-gradient-to-r from-azam-blue to-blue-600 h-full rounded-full animate-pulse" style={{ width: '75%' }}></div></div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:hidden px-3 py-2">
        <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">Subscriber</div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                <select className="min-w-[120px] bg-gray-100 text-sm rounded px-2 py-1 border border-transparent focus:border-azam-blue" value={selectedBpId} onChange={(e) => handleBpChange(e.target.value)}><option value="">BP ID</option>{uniqueBpIds.map((bp) => (<option key={bp} value={bp}>{bp}</option>))}</select>
                <select className="min-w-[120px] bg-gray-100 text-sm rounded px-2 py-1 border border-transparent focus:border-azam-blue" value={selectedCaId} onChange={(e) => handleCaChange(e.target.value)}><option value="">CA ID</option>{availableCaIds.map((ca) => (<option key={ca} value={ca}>{ca}</option>))}</select>
                <select className="min-w-[120px] bg-gray-100 text-sm rounded px-2 py-1 border border-transparent focus:border-azam-blue" value={selectedContractNo || ""} onChange={(e) => setSelectedContractNo(e.target.value || null)}><option value="">Contract</option>{availableContractNos.map((cn) => (<option key={cn} value={cn}>{cn}</option>))}</select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <SubscriberHeader displayData={displayData} bpIds={uniqueBpIds} caIds={availableCaIds} contractNos={availableContractNos} selectedBpId={selectedBpId} selectedCaId={selectedCaId} selectedContractNo={selectedContractNo || ""} onBpChange={handleBpChange} onCaChange={handleCaChange} onContractChange={(val) => setSelectedContractNo(val)} onExportCustomer={handleExportCustomer} hwBalance={displayData.hwBalance} subsBalance={displayData.subsBalance} walletCurrency={displayData.walletCurrency} allBalances={displayData.allBalances} />
      </div>

      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-full mx-auto px-1 sm:px-6 py-1.5 sm:py-2">
          <nav className="flex bg-gray-50 rounded-xl p-1 gap-0.5 sm:p-1.5 sm:gap-1 overflow-x-auto scrollbar-hide">
            {["customer", "kyc-status", "tickets", "payment-transactions", "service-transactions", "billing", "ledger"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[70px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap ${activeTab === tab ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md" : "text-gray-700 hover:bg-white"}`}>
                <span className="capitalize">{tab.replace("-", " ")}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-full mx-auto px-1 sm:px-4 lg:px-6 py-2 md:py-4 space-y-2 md:space-y-4">
        {!hasContract && !hasHardware && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              {stbHwDetailsResponse?.statusMessage || (stbHwError as any)?.statusMessage || "This customer does not have hardware."}
              {/* ✅ Only show "Proceed to buy hardware" if NOT multiple devices error */}
              {!(
                (stbHwDetailsResponse?.statusMessage || "").toLowerCase().includes("more then two device") ||
                ((stbHwError as any)?.statusMessage || "").toLowerCase().includes("more then two device")
              ) && (
                  <Link href="/customer-hardware-sale" className="font-semibold underline ml-1">
                    Proceed to buy hardware.
                  </Link>
                )}
            </AlertDescription>
          </Alert>
        )}
        {activeTab === "customer" && (<CustomerDashboardTab displayData={displayData} subscriptionDetails={subscriptionItemsForPanel} openPopup={openPopup} onRetrack={handleRetrack} setShowTerminationDialog={setShowTerminationDialog} setActiveTab={setActiveTab} isPurchaseAllowed={isPurchaseAllowed} hasHardware={hasHardware} subscriptionStatus={displayData.currentSubscription?.status} onOpenProvisioningHistory={() => setIsProvisioningHistoryOpen(true)} fullSubscriptionDetails={subscriptionDetails} multipleDeviceError={multipleDeviceError} />)}
        {activeTab === "kyc-status" && <KycStatusTab currentSubscriberData={displayData} />}
        {activeTab === "tickets" && (isTicketsLoading ? (<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-azam-blue" /></div>) : (<TicketsTable tickets={tickets.length > 0 ? tickets : []} />))}
        {activeTab === "payment-transactions" && <PaymentTransactionsTable customerData={displayData} />}
        {activeTab === "service-transactions" && <ServiceActionsTable customerData={displayData} />}
        {activeTab === "billing" && <BillingTable sapBpId={displayData.sapBpId} sapCaId={displayData.sapCaId} />}
        {activeTab === "ledger" && <LedgerTable sapBpId={displayData.sapBpId} sapCaId={displayData.sapCaId} />}
      </div>

      {isProvisioningHistoryOpen && displayData?.macId && <ProvisioningHistoryPopup isOpen={isProvisioningHistoryOpen} onClose={() => setIsProvisioningHistoryOpen(false)} smartCardNo={displayData.macId} />}
      <OperationDialogs activePopup={activePopup} onClose={closePopup} customerData={displayData} onOperationSuccess={handleOperationSuccess} fullSubscriptionDetails={subscriptionDetails} dropdownOptions={dropdownOptions} />
      <TerminationDialog isOpen={showTerminationDialog} onClose={() => setShowTerminationDialog(false)} customerData={displayData} onOperationSuccess={handleOperationSuccess} fullSubscriptionDetails={subscriptionDetails} dropdownOptions={dropdownOptions} />

    </div>
  );
}
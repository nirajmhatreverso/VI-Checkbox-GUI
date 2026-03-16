import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { customerCmApi } from "@/lib/api-client"; // This is your live API client

// Mock data ONLY for tabs that are not yet integrated with live APIs
import { mockTickets, mockPaymentHistory, mockServiceActions, mockInvoices } from "@/data/mockSubscriberData";
import {mockLedgerData} from "@/data/data";
// Icons and Components
import { User, Shield, FileText, CreditCard, Settings, Receipt, Loader2 } from "lucide-react";
import SubscriberHeader from "./SubscriberHeader";
import CustomerDashboardTab from "./CustomerDashboardTab";
import OperationDialogs from "./OperationDialogs";
import TerminationDialog from "./TerminationDialog";
import CartDialog from "./CartDialog";
import KycStatusTab from "./Kyc Status";
import TicketsTable from "@/components/subscriptions/TicketsTable";
import PaymentTransactionsTable from "@/components/subscriptions/PaymentTransactionsTable";
import ServiceActionsTable from "@/components/subscriptions/ServiceActionsTable";
import BillingTable from "@/components/subscriptions/BillingTable";
import LedgerTable from "@/components/subscriptions/LedgerTable";
import { useAuthContext } from "@/context/AuthProvider";

// Helper functions for parsing API data
const findContact = (contacts: any[], type: string) => contacts?.find(c => c.type === type)?.value || 'N/A';
const findAddress = (contacts: any[], type: string) => {
    const address = contacts?.find(c => c.type === type);
    return address ? { address1: address.address1 || '', city: address.city || '' } : { address1: 'N/A', city: '' };
};
const formatApiDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return "N/A";
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}/${year}`;
};

export default function SubscriberView() {
  const [location] = useLocation();
  const { state } = window.history;

  const [activeTab, setActiveTab] = useState("customer");
  const [activePopup, setActivePopup] = useState<string>("");
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  
  const [selectedBpId, setSelectedBpId] = useState<string>("");
  const [selectedCaId, setSelectedCaId] = useState<string>("");
  const [selectedContractNo, setSelectedContractNo] = useState<string>("");
  
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [ledgerTransactionFilter, setLedgerTransactionFilter] = useState("all");
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  const [showLedgerFilters, setShowLedgerFilters] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const allCustomerDataFromSearch = useMemo(() => state?.customerData || [], [state]);

  const uniqueBpIds = useMemo(() => Array.from(new Set(allCustomerDataFromSearch.map((c: any) => c.relatedParty[0]?.sapBpId).filter(Boolean))) as string[], [allCustomerDataFromSearch]);
  
  const availableCaIds = useMemo(() => {
    if (!selectedBpId) return [];
    const filtered = allCustomerDataFromSearch.filter((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId);
    return Array.from(new Set(filtered.map((c: any) => c.relatedParty[0]?.sapCaId).filter(Boolean))) as string[];
  }, [selectedBpId, allCustomerDataFromSearch]);

  const availableContractNos = useMemo(() => {
    if (!selectedBpId || !selectedCaId) return [];
    const filtered = allCustomerDataFromSearch.filter((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId && c.relatedParty[0]?.sapCaId === selectedCaId);
    return Array.from(new Set(filtered.map((c: any) => c.relatedParty[0]?.contractNo).filter(Boolean))) as string[];
  }, [selectedBpId, selectedCaId, allCustomerDataFromSearch]);

  useEffect(() => {
    if (allCustomerDataFromSearch.length > 0 && uniqueBpIds.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const contractNoFromUrl = urlParams.get('contractNo');
      
      const initialRecord = allCustomerDataFromSearch.find((c: any) => c.relatedParty[0]?.contractNo === contractNoFromUrl);
      
      if (initialRecord && initialRecord.relatedParty[0]) {
        if (!selectedBpId) {
            setSelectedBpId(initialRecord.relatedParty[0].sapBpId);
            setSelectedCaId(initialRecord.relatedParty[0].sapCaId);
            setSelectedContractNo(initialRecord.relatedParty[0].contractNo);
        }
      }
    }
  }, [allCustomerDataFromSearch, uniqueBpIds, selectedBpId]);

  const currentCustomerRecord = useMemo(() => {
    if (!selectedContractNo) return null;
    return allCustomerDataFromSearch.find((c: any) => c.relatedParty[0]?.contractNo === selectedContractNo) || null;
  }, [selectedContractNo, allCustomerDataFromSearch]);

  const { data: subscriptionResponse, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['subscriptionDetails', selectedBpId, selectedCaId, selectedContractNo],
    queryFn: () => customerCmApi.getSubscriptionDetails({ sapBpId: selectedBpId, sapCaId: selectedCaId, contractNo: selectedContractNo, salesOrg: currentSalesOrg || "" }),
    enabled: !!selectedBpId && !!selectedCaId && !!selectedContractNo,
  });

  const subscriptionDetails = subscriptionResponse?.data?.subscriptionDetails || [];

  const displayData = useMemo(() => {
    if (!currentCustomerRecord || !currentCustomerRecord.relatedParty?.[0]) return null;

    const mainInfo = currentCustomerRecord;
    const partyInfo = mainInfo.relatedParty[0];

    const primarySubscription = subscriptionDetails.find((s: any) => s.ITEM_CATEGORY === 'ZBPO') || {};
    const hardwareInfo = subscriptionDetails.find((s: any) => s.ITEM_CATEGORY === 'ZHWO') || {};

    return {
        customerId: mainInfo.id,
        firstName: mainInfo.firstName,
        lastName: mainInfo.lastName,
        email: findContact(mainInfo.contactMedium, 'email'),
        mobile: findContact(mainInfo.contactMedium, 'mobile'),
        customerType: mainInfo.agreementType,
        accountClass: mainInfo.engagedParty?.customerType,
        billingAddress: findAddress(mainInfo.contactMedium, 'BILLING_ADDRESS'),
        installationAddress: findAddress(mainInfo.contactMedium, 'INSTALLATION_ADDRESS'),
        sapBpId: partyInfo.sapBpId,
        sapCaId: partyInfo.sapCaId,
        contractNo: partyInfo.contractNo,
        macId: partyInfo.Mac,
        divisionType: partyInfo.division,
        connectionDate: formatApiDate(primarySubscription.CONTRACT_START_DT),
        currentSubscription: {
            planName: primarySubscription.PLAN_NAME,
            planType: primarySubscription.ZCONNECTIONTYPE,
            totalAmount: parseFloat(primarySubscription.CHARGE_AMT || 0),
            startDate: formatApiDate(primarySubscription.PLAN_START_DT),
            endDate: formatApiDate(primarySubscription.PLAN_END_DT),
            endDateRaw: primarySubscription.PLAN_END_DT,
            status: primarySubscription.STATUS === 'A' ? 'ACTIVE' : 'INACTIVE',
            autoRenewal: primarySubscription.AUTO_RENEWAL_FLAG === 'X',
        },
        hardware: {
            stbModel: hardwareInfo.PKG_NAME,
            stbSerialNumber: hardwareInfo.TECHNICAL_RES_ID,
            purchaseDate: formatApiDate(hardwareInfo.PLAN_START_DT),
            warrantyEndDate: formatApiDate(hardwareInfo.PLAN_END_DT),
            condition: hardwareInfo.STATUS === 'A' ? 'WORKING' : 'FAULTY',
            dealerAgentCode: 'AGT-001-TZ',
            assignedTechnician: 'John Mwalimu'
        },
        walletBalance: 0,
        status: primarySubscription.STATUS === 'A' ? 'ACTIVE' : 'INACTIVE',
        kycStatus: "Verified",
    };
  }, [currentCustomerRecord, subscriptionDetails]);
  
  const handleBpChange = (bpId: string) => {
    setSelectedBpId(bpId);
    const firstMatchingRecord = allCustomerDataFromSearch.find((c: any) => c.relatedParty[0]?.sapBpId === bpId);
    if (firstMatchingRecord) {
      const newCaId = firstMatchingRecord.relatedParty[0].sapCaId;
      setSelectedCaId(newCaId);
      const firstContractForNewCa = allCustomerDataFromSearch.find((c: any) => c.relatedParty[0]?.sapBpId === bpId && c.relatedParty[0]?.sapCaId === newCaId);
      if(firstContractForNewCa) {
        setSelectedContractNo(firstContractForNewCa.relatedParty[0].contractNo);
      }
    }
  };

  const handleCaChange = (caId: string) => {
    setSelectedCaId(caId);
    const firstMatchingRecord = allCustomerDataFromSearch.find((c: any) => c.relatedParty[0]?.sapBpId === selectedBpId && c.relatedParty[0]?.sapCaId === caId);
    if (firstMatchingRecord) {
      setSelectedContractNo(firstMatchingRecord.relatedParty[0].contractNo);
    }
  };
  
  const openPopup = (popupType: string) => setActivePopup(popupType);
  
  const closePopup = () => {
    setActivePopup("");
    setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['subscriptionDetails', selectedBpId, selectedCaId, selectedContractNo] });
    }, 500);
  };

  const handleOperationSuccess = (message: string) => {
    toast({ title: "Operation Successful", description: message, duration: 3000 });
    queryClient.invalidateQueries({ queryKey: ['subscriptionDetails', selectedBpId, selectedCaId, selectedContractNo] });
    setTimeout(closePopup, 1000);
  };

  const handleEditCustomer = () => openPopup("editCustomer");

  const handleExportCustomer = () => {
    if (!displayData) return;
    const csvContent = [
        ['Field', 'Value'],
        ['Customer ID', displayData.customerId],
        ['Full Name', `${displayData.firstName} ${displayData.lastName}`],
        ['Email', displayData.email],
        ['Phone', displayData.mobile],
        ['Customer Type', displayData.customerType],
        ['Account Class', displayData.accountClass],
        ['Status', displayData.status],
        ['Connection Date', displayData.connectionDate],
        ['Billing Address', `${displayData.billingAddress.address1}, ${displayData.billingAddress.city}`],
        ['Installation Address', `${displayData.installationAddress.address1}, ${displayData.installationAddress.city}`],
        ['SAP BP ID', displayData.sapBpId],
        ['SAP CA ID', displayData.sapCaId],
        ['SAP Contract ID', displayData.contractNo],
        ['Smart Card Number', displayData.macId],
        ['STB Serial Number', displayData.hardware.stbSerialNumber],
        ['KYC Status', displayData.kycStatus],
        ['Wallet Balance', displayData.walletBalance],
        ['Current Plan', displayData.currentSubscription.planName],
        ['Plan Status', displayData.currentSubscription.status],
        ['Plan End Date', displayData.currentSubscription.endDate],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-${displayData.customerId}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Export Successful" });
  };

  const clearLedgerFilters = () => {
    setLedgerSearchTerm("");
    setLedgerTransactionFilter("all");
    setLedgerDateFrom("");
    setLedgerDateTo("");
  };

  const filteredLedgerData = useMemo(() => {
    let filtered = mockLedgerData || [];
    if (ledgerSearchTerm) { filtered = filtered.filter((item: any) => item.description?.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) || item.reference?.toLowerCase().includes(ledgerSearchTerm.toLowerCase())); }
    if (ledgerTransactionFilter !== "all") { filtered = filtered.filter((item: any) => item.type?.toLowerCase() === ledgerTransactionFilter.toLowerCase()); }
    if (ledgerDateFrom) { filtered = filtered.filter((item: any) => new Date(item.date) >= new Date(ledgerDateFrom)); }
    if (ledgerDateTo) { filtered = filtered.filter((item: any) => new Date(item.date) <= new Date(ledgerDateTo)); }
    return filtered;
  }, [ledgerSearchTerm, ledgerTransactionFilter, ledgerDateFrom, ledgerDateTo]);

  if (isSubscriptionLoading || !displayData) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-azam-blue" />
            <span className="ml-3 text-lg text-gray-600">Loading Subscriber Details...</span>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriberHeader
        displayData={displayData}
        bpIds={uniqueBpIds}
        caIds={availableCaIds}
        contractNos={availableContractNos}
        selectedBpId={selectedBpId}
        selectedCaId={selectedCaId}
        selectedContractNo={selectedContractNo}
        onBpChange={handleBpChange}
        onCaChange={handleCaChange}
        onContractChange={setSelectedContractNo}
        onCartOpen={() => setShowCartDialog(true)}
        onEditCustomer={handleEditCustomer}
        onExportCustomer={handleExportCustomer}
      />
      
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-full mx-auto px-1 sm:px-6 py-1.5 sm:py-2">
            <nav className="flex bg-gray-50 rounded-xl p-1 gap-0.5 sm:p-1.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab("customer")}
                    className={`flex-1 min-w-[70px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "customer"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="block sm:inline">Customer</span>
                </button>
                <button
                    onClick={() => setActiveTab("kyc-status")}
                    className={`flex-1 min-w-[70px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "kyc-status"
                        ? "text-white bg-gradient-to-r from-orange-400 to-orange-400 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="block sm:inline">KYC Status</span>
                </button>
                <button
                    onClick={() => setActiveTab("tickets")}
                    className={`flex-1 min-w-[60px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "tickets"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="block sm:inline">Tickets</span>
                </button>
                <button
                    onClick={() => setActiveTab("payment-transactions")}
                    className={`flex-1 min-w-[60px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "payment-transactions"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="hidden sm:inline">Payment Transactions</span>
                    <span className="sm:hidden block">Payment</span>
                </button>
                <button
                    onClick={() => setActiveTab("service-transactions")}
                    className={`flex-1 min-w-[60px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "service-transactions"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="hidden sm:inline">Service Transactions</span>
                    <span className="sm:hidden block">Service</span>
                </button>
                <button
                    onClick={() => setActiveTab("billing")}
                    className={`flex-1 min-w-[60px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "billing"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="block sm:inline">Billing</span>
                </button>
                <button
                    onClick={() => setActiveTab("ledger")}
                    className={`flex-1 min-w-[60px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap touch-manipulation ${activeTab === "ledger"
                        ? "text-white bg-gradient-to-r from-orange-300 to-orange-600 shadow-md transform scale-105"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm active:scale-95"
                    }`}>
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:hidden" />
                    <span className="block sm:inline">Ledger</span>
                </button>
            </nav>
        </div>
      </div>

      <div className="max-w-full mx-auto px-1 sm:px-4 lg:px-6 py-2 md:py-4 space-y-2 md:space-y-4">
        {activeTab === "customer" && (
            <CustomerDashboardTab
                displayData={displayData}
                subscriptionDetails={subscriptionDetails}
                openPopup={openPopup}
                setShowTerminationDialog={setShowTerminationDialog}
                setActiveTab={setActiveTab} 
            />
        )}
        {activeTab === "kyc-status" && <KycStatusTab currentSubscriberData={displayData} />}
        {activeTab === "tickets" && <TicketsTable tickets={mockTickets} />}
        {activeTab === "payment-transactions" && <PaymentTransactionsTable transactions={mockPaymentHistory} />}
        {activeTab === "service-transactions" && <ServiceActionsTable serviceActions={mockServiceActions} />}
        {activeTab === "billing" && <BillingTable invoices={mockInvoices} />}
        {activeTab === "ledger" && <LedgerTable filteredLedgerData={filteredLedgerData} ledgerSearchTerm={ledgerSearchTerm} setLedgerSearchTerm={setLedgerSearchTerm} ledgerTransactionFilter={ledgerTransactionFilter} setLedgerTransactionFilter={setLedgerTransactionFilter} ledgerDateFrom={ledgerDateFrom} setLedgerDateFrom={setLedgerDateFrom} ledgerDateTo={ledgerDateTo} setLedgerDateTo={setLedgerDateTo} showLedgerFilters={showLedgerFilters} setShowLedgerFilters={setShowLedgerFilters} clearLedgerFilters={clearLedgerFilters} customerId={displayData.customerId} />}
      </div>
      
      <OperationDialogs activePopup={activePopup} onClose={closePopup} customerData={displayData} onOperationSuccess={handleOperationSuccess} />
      <TerminationDialog isOpen={showTerminationDialog} onClose={() => setShowTerminationDialog(false)} customerData={displayData} />
      <CartDialog isOpen={showCartDialog} onClose={() => setShowCartDialog(false)} />
    </div>
  );
}
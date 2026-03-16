import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuthContext } from "@/context/AuthProvider";
import { CartProvider } from "@/hooks/use-cart";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Layout
import TopHeader from "@/components/layout/top-header";
import NavHeader from "@/components/layout/nav-header";
import Breadcrumbs from "@/components/layout/breadcrumbs";
import Footer from "@/components/layout/footer";
import AgentStockOverview from "@/components/inventory/agent-stock-overview";

// Lazy-loaded pages/components
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const Dashboard = lazy(() => import("@/components/dashboard/dashboard"));
const AgentOnboarding = lazy(() => import("@/components/agents/agent-onboarding"));
const StockOverview = lazy(() => import("@/components/inventory/stock-overview"));
const StockRequest = lazy(() => import("@/components/inventory/stock-request"));
const StockApproval = lazy(() => import("@/components/inventory/stock-approval"));
const StockTransfer = lazy(() => import("@/components/inventory/stock-transfer"));
const TrackSerial = lazy(() => import("@/components/inventory/track-serial"));
const CasIdChange = lazy(() => import("@/components/inventory/cas-id-change"));
const StbScPairing = lazy(() => import("@/components/inventory/stb-sc-pairing"));
const WarehouseTransfer = lazy(() => import("@/components/inventory/warehouse-transfer"));
const BlockUnblockAgent = lazy(() => import("@/components/inventory/block-unblock-agent"));
const BlockUnblockCenter = lazy(() => import("@/components/inventory/block-unblock-center"));
const POGRNUpdate = lazy(() => import("@/components/inventory/po-grn-update"));
const POView = lazy(() => import("@/components/inventory/po-view"));
const CustomerHardwareReturn = lazy(() => import("@/components/inventory/customer-hardware-return"));
const AgentReplacement = lazy(() => import("@/components/inventory/agent-replacement"));
const AgentFaultyRepair = lazy(() => import("@/components/inventory/agent-faulty-repair"));
const AgentPaymentHW = lazy(() => import("@/components/payments/agent-payment-hw"));
const AgentPaymentSubscription = lazy(() => import("@/components/payments/agent-payment-subscription"));
const AgentHardwareSale = lazy(() => import("@/components/inventory/agent-hardware-sale"));
const CustomerHardwareSale = lazy(() => import("@/components/inventory/customer-hardware-sale"));
const CustomerPaymentHW = lazy(() => import("@/components/payments/customer-payment-hw"));
const ValidityExtensionApprovalPage = lazy(() => import("@/components/payments/validity-extension-approval-page"));
const CustomerPaymentSubscription = lazy(() => import("@/components/payments/customer-payment-subscription"));
const CustomerRegistration = lazy(() => import("@/components/customers/customer-registration"));
const SubscriptionPurchase = lazy(() => import("@/components/subscriptions/subscription-purchase"));
const SubscriptionRenewal = lazy(() => import("@/components/subscriptions/subscription-renewal"));
const PlanChange = lazy(() => import("@/components/subscriptions/plan-change"));
const AddAddonPacks = lazy(() => import("@/components/subscriptions/add-addon-packs"));
const CustomerSuspension = lazy(() => import("@/components/subscriptions/customer-suspension"));
const SearchSubscriber = lazy(() => import("@/components/subscriptions/search-subscriber"));
const SubscriberView = lazy(() => import("@/components/subscriptions/subscriber-view"));
const UnifiedReports = lazy(() => import("@/components/reports/reports-unified"));
const Adjustment = lazy(() => import("@/components/adjustment/adjustment"));
const IncidentManagement = lazy(() => import("@/components/Incident/new-incident-management"));
const BulkProvision = lazy(() => import("@/components/bulk-provision/bulk-provision"));
const Provisioning = lazy(() => import("@/components/provisioning/provisioning"));
const KYCApproval = lazy(() => import("@/pages/kyc-approval"));
const KYCVerification = lazy(() => import("@/pages/kyc-verification"));
const SpecificTicketList = lazy(() => import("@/components/Incident/customer-specific-list"));
const ViewIncidentManagement = lazy(() => import("@/components/Incident/view-incident-management"));
const MyWork = lazy(() => import("@/components/Incident/my-work"));
const AgentCommission = lazy(() => import("@/components/agent-commission/agent-commission"));
const ReceiptCancellation = lazy(() => import("@/components/payments/receipt-cancellation"));
const HardwarePaymentReversal = lazy(() => import("@/components/payments/hardware-payment-reversal"));
const InvoiceReversal = lazy(() => import("@/components/payments/invoice-reversal"));
const CustomerTransfer = lazy(() => import("@/components/payments/customer-transfer"));
const NotificationsPage = lazy(() => import("@/components/notifications/notifications"));
const Profile = lazy(() => import("@/components/profile/profile"));
const agentStockOverview = lazy(() => import("@/components/inventory/agent-stock-overview"));
const MenuMaster = lazy(() => import("@/components/admin/menu-master").then(module => ({ default: module.MenuMaster })));
const RoleMaster = lazy(() => import("@/components/admin/role-master-combined").then(module => ({ default: module.RoleMasterCombined })));
const UserMaster = lazy(() => import("@/components/admin/user-master").then(module => ({ default: module.UserMaster })));
const SurveyForm = lazy(() => import("@/components/admin/survey-form").then(module => ({ default: module.SurveyForm })));
const Announcements = lazy(() => import("@/components/admin/announcements").then(module => ({ default: module.Announcements })));
const AgentSubagentTransfer = lazy(() => import("@/components/inventory/agent-subagent-transfer"));
const SubagentAgentTransfer = lazy(() => import("@/components/inventory/subagent-agent-transfer"));
const SubAgentStockOverview = lazy(() => import("@/components/inventory/sub-agent-stock-overview"));


// Layout wrapper
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopHeader />
      <NavHeader />
      <Breadcrumbs />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

// Router logic
function Router() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/forgot-password" component={() => (
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <ForgotPassword />
          </Suspense>
        )} />
        <Route component={() => (
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <Login />
          </Suspense>
        )} />
      </Switch>
    );
  }

  // Authenticated routes
  return (
    <Switch>
      {/* Dashboard */}
      <Route path="/" component={() => (
        <ProtectedLayout>
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <Dashboard />
          </Suspense>
        </ProtectedLayout>
      )} />
      <Route path="/dashboard" component={() => (
        <ProtectedLayout>
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <Dashboard />
          </Suspense>
        </ProtectedLayout>
      )} /> {/* Agent */}
      <Route path="/agent-onboarding" component={() => (
        <ProtectedLayout>
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <AgentOnboarding />
          </Suspense>
        </ProtectedLayout>
      )} />
      <Route path="/agent-replacement" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentReplacement /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-faulty-repair" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentFaultyRepair /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-payment-hw" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentPaymentHW /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-payment-subscription" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentPaymentSubscription /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-hardware-sale" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentHardwareSale /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-commission" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentCommission /></Suspense></ProtectedLayout>
      )} />

      {/* Inventory */}
      <Route path="/stock-overview" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><StockOverview /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-stock-overview" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentStockOverview /></Suspense></ProtectedLayout>
      )} />
      <Route path="/sub-agent-stock-overview" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SubAgentStockOverview /></Suspense></ProtectedLayout>
      )} />
      <Route path="/stock-request" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><StockRequest /></Suspense></ProtectedLayout>
      )} />
      <Route path="/stock-approval" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><StockApproval /></Suspense></ProtectedLayout>
      )} />
      <Route path="/stock-transfer" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><StockTransfer /></Suspense></ProtectedLayout>
      )} />
      <Route path="/track-serial" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><TrackSerial /></Suspense></ProtectedLayout>
      )} />
      <Route path="/cas-id-change" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CasIdChange /></Suspense></ProtectedLayout>
      )} />
      <Route path="/stb-sc-pairing" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><StbScPairing /></Suspense></ProtectedLayout>
      )} />
      <Route path="/warehouse-transfer" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><WarehouseTransfer /></Suspense></ProtectedLayout>
      )} />
      <Route path="/block-unblock-agent" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><BlockUnblockAgent /></Suspense></ProtectedLayout>
      )} />
      <Route path="/block-unblock-center" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><BlockUnblockCenter /></Suspense></ProtectedLayout>
      )} />
      <Route path="/po-grn-update" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><POGRNUpdate /></Suspense></ProtectedLayout>
      )} />
      <Route path="/po-view" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><POView /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-hardware-return" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerHardwareReturn /></Suspense></ProtectedLayout>
      )} />
      <Route path="/agent-subagent" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AgentSubagentTransfer /></Suspense></ProtectedLayout>
      )} />
      <Route path="/subagent-agent-transfer" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SubagentAgentTransfer /></Suspense></ProtectedLayout>
      )} />


      {/* Customers */}
      <Route path="/customer-registration" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerRegistration /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-hardware-sale" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerHardwareSale /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-payment-hw" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerPaymentHW /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-payment-subscription" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerPaymentSubscription /></Suspense></ProtectedLayout>
      )} />
      <Route path="/validity-approval" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><ValidityExtensionApprovalPage /></Suspense></ProtectedLayout>
      )} />
      <Route path="/receipt-cancellation" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><ReceiptCancellation /></Suspense></ProtectedLayout>
      )} />
      <Route path="/hardware-payment-reversal" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><HardwarePaymentReversal /></Suspense></ProtectedLayout>
      )} />
      <Route path="/invoice-reversal" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><InvoiceReversal /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-transfer" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerTransfer /></Suspense></ProtectedLayout>
      )} />

      {/* Subscriptions */}
      <Route path="/subscription-purchase" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SubscriptionPurchase /></Suspense></ProtectedLayout>
      )} />
      <Route path="/subscription-renewal" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SubscriptionRenewal /></Suspense></ProtectedLayout>
      )} />
      <Route path="/plan-change" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><PlanChange /></Suspense></ProtectedLayout>
      )} />
      <Route path="/add-addon-packs" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><AddAddonPacks /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-suspension" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><CustomerSuspension /></Suspense></ProtectedLayout>
      )} />
      <Route path="/search-subscriber" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SearchSubscriber /></Suspense></ProtectedLayout>
      )} />
      <Route path="/subscriber-view" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SubscriberView /></Suspense></ProtectedLayout>
      )} />

      {/* Reports & Adjustments */}
      <Route path="/reports" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><UnifiedReports /></Suspense></ProtectedLayout>
      )} />
      <Route path="/adjustment" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><Adjustment /></Suspense></ProtectedLayout>
      )} />

      {/* Incidents */}
      <Route path="/new-incident-management" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><IncidentManagement /></Suspense></ProtectedLayout>
      )} />
      <Route path="/customer-specific-list" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SpecificTicketList /></Suspense></ProtectedLayout>
      )} />
      <Route path="/view-incident/:id" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><ViewIncidentManagement /></Suspense></ProtectedLayout>
      )} />
      <Route path="/my-work" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><MyWork /></Suspense></ProtectedLayout>
      )} />

      {/* Bulk Provisioning */}
      <Route path="/bulk-provision" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><BulkProvision /></Suspense></ProtectedLayout>
      )} />
      <Route path="/provisioning" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><Provisioning /></Suspense></ProtectedLayout>
      )} />

      {/* KYC */}
      <Route path="/kyc-approval" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><KYCApproval /></Suspense></ProtectedLayout>
      )} />
      <Route path="/kyc-verification" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><KYCVerification /></Suspense></ProtectedLayout>
      )} />

      {/* Misc */}
      <Route path="/notifications" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><NotificationsPage /></Suspense></ProtectedLayout>
      )} />
      <Route path="/profile" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><Profile /></Suspense></ProtectedLayout>
      )} />

      {/* Admin */}
      <Route path="/menu-master" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><MenuMaster /></Suspense></ProtectedLayout>
      )} />
      <Route path="/role-master" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><RoleMaster /></Suspense></ProtectedLayout>
      )} />
      <Route path="/user-master" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><UserMaster /></Suspense></ProtectedLayout>
      )} />
      <Route path="/survey-form" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><SurveyForm /></Suspense></ProtectedLayout>
      )} />
      <Route path="/announcements" component={() => (
        <ProtectedLayout><Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}><Announcements /></Suspense></ProtectedLayout>
      )} />


      {/* 404 */}
      <Route component={() => (
        <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
          <NotFound />
        </Suspense>
      )} />
    </Switch>);
}

// App wrapper
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <AuthProvider>
              <Router />
            </AuthProvider>
          </TooltipProvider>
        </CartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
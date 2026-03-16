// src/components/subscriber-view/CustomerDashboardTab.tsx (Corrected)

import CustomerInfoPanel from "./CustomerInfoPanel";
import SubscriptionPanel from "./SubscriptionPanel";
import QuickActionsPanel from "./QuickActionsPanel";

// ✅ CHANGE 1: Updated the props interface
interface CustomerDashboardTabProps {
  displayData: any;
  subscriptionDetails: any[];
  openPopup: (popupType: string) => void;
  setShowTerminationDialog: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  isPurchaseAllowed: boolean;
  hasHardware: boolean;
  onRetrack: () => void;
  subscriptionStatus: string | undefined;
  onOpenProvisioningHistory: () => void; // Renamed prop
  fullSubscriptionDetails?: any[]; // Added new prop
  multipleDeviceError?: string;
}

export default function CustomerDashboardTab({
  displayData,
  subscriptionDetails,
  openPopup,
  setShowTerminationDialog,
  onRetrack,
  setActiveTab,
  isPurchaseAllowed,
  hasHardware,
  subscriptionStatus,
  // ✅ CHANGE 2: Destructure the new and renamed props
  onOpenProvisioningHistory,
  fullSubscriptionDetails,
  multipleDeviceError  
}: CustomerDashboardTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 md:gap-4">
      <div className="xl:col-span-3 space-y-2 md:space-y-4">
        {/* ✅ CHANGE 3: Pass the renamed prop to CustomerInfoPanel */}
        <CustomerInfoPanel
          displayData={displayData}
          onOpenProvisioningHistory={onOpenProvisioningHistory}
        />
      </div>
      <div className="xl:col-span-6 space-y-2 md:space-y-4">
        {/* ✅ CHANGE 4: Pass the new prop to SubscriptionPanel */}
        <SubscriptionPanel
          displayData={displayData}
          subscriptionDetails={subscriptionDetails}
          onRenewalClick={() => openPopup("renewal")}
          onPlanChangeClick={() => openPopup("planChange")}
          fullSubscriptionDetails={fullSubscriptionDetails}
        />
      </div>
      <div className="xl:col-span-3 space-y-3 md:space-y-4">
        <QuickActionsPanel
          customerData={displayData}
          openPopup={openPopup}
          setShowTerminationDialog={setShowTerminationDialog}
          onRetrack={onRetrack}
          setActiveTab={setActiveTab}
          isPurchaseAllowed={isPurchaseAllowed}
          hasHardware={hasHardware}
          subscriptionStatus={subscriptionStatus}
          fullSubscriptionDetails={fullSubscriptionDetails} 
          tickets={displayData.tickets || []} // Pass tickets from displayData or other source
          multipleDeviceError={multipleDeviceError}
        />
      </div>
    </div>
  );
}
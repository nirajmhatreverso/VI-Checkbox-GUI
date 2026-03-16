import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, ShoppingCart, RotateCcw, ArrowUpDown, Gift, Clock, Settings,
  CreditCard, FileText, Edit, Pause, Plus, CheckCircle, Eye,
  ChevronRight, Wifi, RefreshCw, Home, Package,
  Loader2,
  CalendarX,
  MessageSquare, Copy, AlertCircle, User, CheckCircle2, Calendar as CalendarIcon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthContext } from "@/context/AuthProvider";

interface QuickActionsPanelProps {
  customerData: any;
  tickets?: any[];
  openPopup: (popupType: string) => void;
  setShowTerminationDialog: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  onRetrack: () => void;
  isPurchaseAllowed: boolean;
  hasHardware: boolean;
  subscriptionStatus: string | undefined;
  fullSubscriptionDetails?: any[];
  multipleDeviceError?: string;
}

export default function QuickActionsPanel({
  customerData,
  tickets = [],
  onRetrack,
  openPopup,
  setShowTerminationDialog,
  setActiveTab,
  isPurchaseAllowed,
  hasHardware,
  subscriptionStatus,
  fullSubscriptionDetails,
  multipleDeviceError
}: QuickActionsPanelProps) {
  const { user } = useAuthContext();
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  // User Roles
  // User Roles
const isAgent = user?.allAccess === "N" && !user?.isMainPlant && !user?.isOtc;
const isMainPlant = user?.isMainPlant === "Y";
const isSubAgent = !!user?.onbId && user?.allAccess === "N";

const customerId = customerData.customerId;
const recentTickets = tickets.slice(0, 4);

const isScheduled = customerData.currentSubscription?.isScheduled || false;
const hasContract = !!customerData.contractNo;
const masterDisable = hasContract && !hasHardware;
const globalDisable = isScheduled;

// Status Checks
const isLocked = subscriptionStatus === 'LOCKED' || subscriptionStatus === 'L';
const statusIsActive = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'A';
const isTerminated = subscriptionStatus === 'TERMINATED' || subscriptionStatus === 'T';
const isDisconnected = subscriptionStatus === 'DISCONNECTED' || subscriptionStatus === 'D';
const contractActionsDisabled = !hasContract;
const newPlanDisabled = hasContract;

const reconnectDisabled = !hasContract || (!isLocked && !isDisconnected);
const suspendDisabled = !hasContract || !statusIsActive || isLocked;
const isPrepaid = customerData.currentSubscription?.planType === 'Prepaid';

// ✅ Check for Inactive/D status
const isCusInactive = customerData?.cusStatus === 'INACTIVE' || customerData?.cusStatus === 'D' || subscriptionStatus === 'INACTIVE' || subscriptionStatus === 'DISCONNECTED';

// Determine if Postpaid
const isPostpaid = customerData.currentSubscription?.planType?.toUpperCase() === 'POSTPAID' || 
                   customerData.customerType?.toUpperCase() === 'POSTPAID';

// ✅ NEW: Check if multiple devices error from backend
const hasMultipleDevices = !!(multipleDeviceError && multipleDeviceError.toLowerCase().includes('more then two device'));

// ✅ NEW: Check if customer has an existing contract
const hasExistingContract = !!customerData?.contractNo;

// ✅ UPDATED: Postpaid Inactive only applies if:
// 1. Customer is Postpaid
// 2. Customer is Inactive/D
// 3. Customer HAS an existing contract (not first-time)
// 4. Customer does NOT have multiple devices error
const isPostpaidInactive = isPostpaid && isCusInactive && hasExistingContract && !hasMultipleDevices;

// Check for active addon
const hasActiveAddon = fullSubscriptionDetails?.some(
  (sub: any) => sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A'
);

// ✅ NEW: VIP/DEMO Override
const accountClass = (customerData?.accountClass || '').toUpperCase();
const isVipOrDemo = ['VIP', 'DEMO'].includes(accountClass);
const isPostpaidVipOrDemoOverride = isPostpaid && isVipOrDemo;

// ✅ UPDATED: All actions disabled if multiple devices
const isNewPlanDisabled = hasMultipleDevices || isTerminated || 
    (isPostpaidInactive && !isPostpaidVipOrDemoOverride) ||
    isMainPlant || 
    globalDisable || 
    masterDisable || 
    !isPurchaseAllowed || 
    newPlanDisabled || 
    isLocked;

const isRenewDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive;
const isPlanChangeDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive;
const isAddonsDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive || hasActiveAddon;
const isOfferChangeDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive;
const isExtendValidityDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive;

const isHardwareDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isSubAgent || (globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive);

const isTerminationDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isAgent || isSubAgent || globalDisable || masterDisable || contractActionsDisabled || isLocked || isCusInactive;

const isRetrackDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || masterDisable || contractActionsDisabled;

const isRoomsDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isAgent || isSubAgent || isMainPlant || globalDisable || masterDisable || contractActionsDisabled || isPrepaid || isLocked || isCusInactive;

const isSuspendDisabled = hasMultipleDevices || isTerminated || isPostpaidInactive || isMainPlant || isSubAgent || globalDisable || masterDisable || suspendDisabled || isCusInactive;

// ✅ UPDATED: Reconnection also disabled if multiple devices
const isReconnectDisabled = hasMultipleDevices || isTerminated 
    ? true 
    : isPostpaidInactive 
      ? false 
      : (isMainPlant || isSubAgent || globalDisable || masterDisable || reconnectDisabled || isCusInactive);

  // ✅ Handler for Reconnection
  const handleReconnectionClick = () => {
    if (isPostpaidInactive) {
      openPopup("postpaid_reconnection"); // Open special popup
    } else {
      openPopup("reconnection"); // Open standard popup
    }
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsViewModalOpen(true);
  };

  return (
    <>
      <Card className="bg-white shadow-xl border-gray-200 rounded-xl overflow-hidden">
        <CardHeader className="pb-4 sm:pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-4 text-lg sm:text-lg text-gray-900">
            <div className="p-1 bg-blue-100 rounded-lg"><Zap className="h-5 w-5 text-azam-blue" /></div>
            <div><span className="font-bold">Quick Actions</span></div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-2 p-3">
          {isScheduled && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full border border-orange-100">
                  <Clock className="h-5 w-5 text-orange-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-orange-800">Pending Schedule Detected</h4>
                  <p className="text-xs text-orange-600">Most actions are disabled until the schedule is processed or cancelled.</p>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Postpaid Inactive Alert */}
          {isPostpaidInactive && !hasMultipleDevices && (
   <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-full border border-red-100">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-red-800">
          Account {customerData?.cusStatus === 'D' ? 'Disconnected' : 'Inactive'}
        </h4>
        <p className="text-xs text-red-600">
          {isTerminated ? "Account is Terminated. No actions allowed." : "Only Reconnection is allowed for this Postpaid account."}
        </p>
      </div>
    </div>
  </div>
)}

          {/* ✅ NEW: Multiple Devices Alert */}
{hasMultipleDevices && (
  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-full border border-purple-100">
        <AlertCircle className="h-5 w-5 text-purple-600" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-purple-800">Multiple Devices Detected</h4>
        <p className="text-xs text-purple-600">This customer has multiple devices. Please use Bulk Plan Purchase for this account.</p>
      </div>
    </div>
  </div>
)}

          <div className="grid grid-cols-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">

            <div className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-green-50/50 to-green-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center ${isNewPlanDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-100/50 hover:to-green-200/50 border-green-200/50 hover:border-green-300/50 hover:shadow-xl active:scale-95 touch-manipulation'}`}>
              <div onClick={!isNewPlanDisabled ? () => openPopup("purchase") : undefined} className={!isNewPlanDisabled ? "cursor-pointer text-center" : "text-center"}>
                <div className="p-1.5 bg-green-200/50 rounded-md mx-auto mb-1.5 w-fit"><ShoppingCart className="h-4 w-4 text-green-700" /></div>
                <p className="text-sm font-bold text-green-800">New Plan</p><p className="text-xs text-green-600 mt-0.5">Add subscription</p>
              </div>

            </div>

            <div className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-blue-50/50 to-blue-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center ${isRenewDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-100/50 hover:to-blue-200/50 border-blue-200/50 hover:border-blue-300/50 hover:shadow-xl active:scale-95 touch-manipulation'}`}>
              <div onClick={!isRenewDisabled ? () => openPopup("renewal") : undefined} className={!isRenewDisabled ? "cursor-pointer text-center" : "text-center"}>
                <div className="p-1.5 bg-blue-200/50 rounded-md mx-auto mb-1.5 w-fit"><RotateCcw className="h-4 w-4 text-blue-700" /></div>
                <p className="text-sm font-bold text-blue-800">Renew</p><p className="text-xs text-blue-600 mt-0.5">Extend service</p>
              </div>

            </div>

            <div className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-purple-50/50 to-purple-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center ${isPlanChangeDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-100/50 hover:to-purple-200/50 border-purple-200/50 hover:border-purple-300/50 hover:shadow-xl active:scale-95 touch-manipulation'}`}>
              <div onClick={!isPlanChangeDisabled ? () => openPopup("planChange") : undefined} className={!isPlanChangeDisabled ? "cursor-pointer text-center" : "text-center"}>
                <div className="p-1.5 bg-purple-200/50 rounded-md mx-auto mb-1.5 w-fit"><ArrowUpDown className="h-4 w-4 text-purple-700" /></div>
                <p className="text-sm font-bold text-purple-800">Plan Change</p><p className="text-xs text-purple-600 mt-0.5">Switch plan</p>
              </div>

            </div>

            <div className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-orange-50/50 to-orange-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center ${isAddonsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-orange-100/50 hover:to-orange-200/50 border-orange-200/50 hover:border-orange-300/50 hover:shadow-xl active:scale-95 touch-manipulation'}`}>
              <div onClick={!isAddonsDisabled ? () => openPopup("addons") : undefined} className={!isAddonsDisabled ? "cursor-pointer text-center" : "text-center"}>
                <div className="p-1.5 bg-orange-200/50 rounded-md mx-auto mb-1.5 w-fit"><Package className="h-4 w-4 text-orange-700" /></div>
                <p className="text-sm font-bold text-orange-800">Add-ons</p><p className="text-xs text-orange-600 mt-0.5">Extra channels</p>
              </div>
              {hasActiveAddon && (
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg pointer-events-none">
                  <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded shadow border border-orange-200">Active Add-on</span>
                </div>
              )}
            </div>

            <div onClick={!isOfferChangeDisabled ? () => openPopup("offerChange") : undefined} className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-teal-50/50 to-teal-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isOfferChangeDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-teal-100/50 hover:to-teal-200/50 border-teal-200/50 hover:border-teal-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-teal-200/50 rounded-md mx-auto mb-1.5 w-fit"><Gift className="h-4 w-4 text-teal-700" /></div>
              <p className="text-sm font-bold text-teal-800">Offer Change</p><p className="text-xs text-teal-600 mt-0.5">Switch offer</p>
            </div>

            <div onClick={!isExtendValidityDisabled ? () => openPopup("extendValidity") : undefined} className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isExtendValidityDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-100/50 hover:to-indigo-200/50 border-indigo-200/50 hover:border-indigo-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-indigo-200/50 rounded-md mx-auto mb-1.5 w-fit"><Clock className="h-4 w-4 text-indigo-700" /></div>
              <p className="text-sm font-bold text-indigo-800">Extend Validity</p><p className="text-xs text-indigo-600 mt-0.5">Add time</p>
            </div>

            <div onClick={!isHardwareDisabled ? () => openPopup("hardware") : undefined} className={`p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-gray-50/50 to-gray-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isHardwareDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-gray-100/50 hover:to-gray-200/50 border-gray-200/50 hover:border-gray-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-gray-200/50 rounded-md mx-auto mb-1.5 w-fit"><Settings className="h-4 w-4 text-gray-700" /></div>
              <p className="text-sm font-bold text-gray-800">Hardware</p><p className="text-xs text-gray-600 mt-0.5">Replace device</p>
            </div>

            <div onClick={!isTerminationDisabled ? () => setShowTerminationDialog(true) : undefined} className={`p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-cyan-50/50 to-cyan-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isTerminationDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-cyan-100/50 hover:to-cyan-200/50 border-cyan-200/50 hover:border-cyan-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-cyan-200/50 rounded-md mx-auto mb-1.5 w-fit"><CreditCard className="h-4 w-4 text-cyan-700" /></div>
              <p className="text-sm font-bold text-cyan-800">Termination</p><p className="text-xs text-cyan-600 mt-0.5">End service</p>
            </div>

            <div onClick={!isRetrackDisabled ? onRetrack : undefined} className={`p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-blue-50/50 to-blue-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isRetrackDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-100/50 hover:to-blue-200/50 border-blue-200/50 hover:border-blue-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-blue-200/50 rounded-md mx-auto mb-1.5 w-fit"><RefreshCw className="h-4 w-4 text-blue-700" /></div>
              <p className="text-sm font-bold text-blue-800">Retrack</p><p className="text-xs text-blue-600 mt-0.5">Refresh signal</p>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`relative group p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-amber-50/50 to-amber-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center ${isRoomsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-amber-100/50 hover:to-amber-200/50 border-amber-200/50 hover:border-amber-300/50 hover:shadow-xl active:scale-95 touch-manipulation'}`}>
                    <div onClick={!isRoomsDisabled ? () => openPopup("adjustment") : undefined} className={!isRoomsDisabled ? "cursor-pointer text-center" : "text-center"}>
                      <div className="p-1.5 bg-amber-200/50 rounded-md mx-auto mb-1.5 w-fit"><Home className="h-4 w-4 text-amber-700" /></div>
                      <p className="text-sm font-bold text-amber-800">Rooms</p><p className="text-xs text-amber-600 mt-0.5">Rooms Update</p>
                    </div>
                  </div>
                </TooltipTrigger>
                {isPrepaid && isRoomsDisabled && (
                  <TooltipContent>
                    <p>This feature is not available for Prepaid customers.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <div onClick={!isSuspendDisabled ? () => openPopup("suspension") : undefined} className={`p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isSuspendDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-yellow-100/50 hover:to-yellow-200/50 border-yellow-200/50 hover:border-yellow-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}>
              <div className="p-1.5 bg-yellow-200/50 rounded-md mx-auto mb-1.5 w-fit"><Pause className="h-4 w-4 text-yellow-700" /></div>
              <p className="text-sm font-bold text-yellow-800">Suspend</p><p className="text-xs text-yellow-600 mt-0.5">Pause service</p>
            </div>

            <div
              onClick={!isReconnectDisabled ? handleReconnectionClick : undefined}
              className={`p-3 sm:p-2 border-2 rounded-lg bg-gradient-to-br from-green-50/50 to-green-100/50 transition-all duration-300 shadow-lg min-h-[60px] flex flex-col justify-center text-center ${isReconnectDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-100/50 hover:to-green-200/50 border-green-200/50 hover:border-green-300/50 hover:shadow-xl active:scale-95 touch-manipulation cursor-pointer'}`}
            >
              <div className="p-1.5 bg-green-200/50 rounded-md mx-auto mb-1.5 w-fit"><Wifi className="h-4 w-4 text-green-700" /></div>
              <p className="text-sm font-bold text-green-800">Reconnection</p>
              <p className="text-xs font-medium text-green-600">Resume services</p>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border-gray-200 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 sm:pb-3 bg-gradient-to-r from-red-50 to-pink-50">
          <CardTitle className="flex items-center gap-3 text-base sm:text-base text-gray-900">
            <div className="p-1 bg-red-100 rounded-lg"><FileText className="h-4 w-4 text-red-600" /></div>
            <div><span className="font-semibold">Recent Tickets</span></div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {recentTickets.length > 0 ? (
            <div className="space-y-2">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-blue-600">{ticket.ticketId}</span>
                        <Badge className={`text-xs ${ticket.priority === 'High' ? 'bg-red-100 text-red-800' : ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{ticket.priority}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{ticket.type}</p>
                    </div>
                    <div className="text-right ml-2">
                      <Badge className={`text-xs mb-1 ${ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{ticket.status}</Badge>
                      <p className="text-xs text-gray-500">{ticket.date}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{ticket.agent}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs" className="h-6 px-2 text-xs" onClick={() => handleViewTicket(ticket)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="xs" className="h-6 px-2 text-xs"><Edit className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2"><Button variant="outline" size="xs" className="w-full text-xs" onClick={() => setActiveTab("tickets")}>View All Tickets<ChevronRight className="h-3 w-3 ml-1" /></Button></div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">No Open Tickets</h4><p className="text-xs text-gray-500">All tickets have been resolved</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-gray-100 shadow-2xl">
          {selectedTicket && (
            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {selectedTicket.ticketId}
                      </h2>
                      <Badge className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider shadow-sm border ${selectedTicket.status === "Resolved" || selectedTicket.status === "Closed"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : selectedTicket.status === "Open"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                        {selectedTicket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                      <span className="bg-white/80 px-2 py-0.5 rounded-md border border-gray-200/50 shadow-sm text-xs">
                        {selectedTicket.type} Ticket
                      </span>
                    </p>
                  </div>
                  {/* Priority Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${selectedTicket.priority === "Critical" || selectedTicket.priority === "High"
                    ? "bg-red-50 border-red-100 text-red-700"
                    : selectedTicket.priority === "Medium"
                      ? "bg-orange-50 border-orange-100 text-orange-700"
                      : "bg-blue-50 border-blue-100 text-blue-700"
                    }`}>
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{selectedTicket.priority} Priority</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-8">

                {/* Key Details Section */}
                <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket Information</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assigned Agent</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedTicket.agent || "Unassigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-emerald-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Customer ID</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedTicket.customerId || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-600">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Created Date</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {selectedTicket.date !== "N/A" ? selectedTicket.date : "Date not available"}
                          {selectedTicket.time !== "N/A" && <span className="text-gray-400 font-normal ml-1">at {selectedTicket.time}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Issue Description</h3>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 shadow-inner text-sm text-gray-700 leading-relaxed">
                    {selectedTicket.description || "No description provided."}
                  </div>
                </div>

                {/* Resolution Section */}
                {selectedTicket.resolution && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Resolution</h3>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm text-gray-800 leading-relaxed shadow-sm">
                      {selectedTicket.resolution}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-lg">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const LabelSmall = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-gray-700 mb-1 block">{children}</label>
);
// src/components/subscriber-view/SubscriptionPanel.tsx

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tv, Zap, Search, DollarSign, Calendar, RotateCcw, ArrowUpDown, Loader2, Package, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formatApiDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return "N/A";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year}`;
};

interface SubscriptionPanelProps {
  displayData: any;
  subscriptionDetails: any[];
  onRenewalClick: () => void;
  onPlanChangeClick: () => void;
  fullSubscriptionDetails?: any[];
}

export default function SubscriptionPanel({ displayData, subscriptionDetails, onRenewalClick, onPlanChangeClick, fullSubscriptionDetails }: SubscriptionPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL_STATUSES");
  const [typeFilter, setTypeFilter] = useState("ALL_TYPES");
  
  // ✅ ADDED: State for confirmation dialog
  const [addonToRemove, setAddonToRemove] = useState<any | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isCusInactive = displayData?.cusStatus === 'INACTIVE';
  const currency = displayData?.walletCurrency || '';

  // Auto Renewal Mutation
  const { mutate: updateAutoRenewal, isPending: isUpdatingAutoRenewal } = useMutation<any, Error, { isEnabled: boolean }>({
    mutationFn: (variables) => {
      const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
      if (!primarySub) throw new Error("Could not find primary subscription details.");
      
      const payload = {
        sapBpId: displayData.sapBpId,
        sapCaId: displayData.sapCaId,
        sapContractId: displayData.contractNo,
        salesOrg: primarySub.SALES_ORG,
        division: primarySub.DIVISION,
        connectionType: primarySub.ZCONNECTIONTYPE,
        isServiceEnabled: variables.isEnabled ? "Y" : "N",
      };
      return apiRequest('/subscriptions/toggle-renewal', 'POST', payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      toast({ title: "Success", description: data?.data?.message || "Auto-renewal updated." });
    },
    onError: (error: any) => toast({ title: "Update Failed", description: error?.statusMessage, variant: "destructive" })
  });

  // Remove Addon Mutation
  const { mutate: executeRemoveAddon, isPending: isRemovingAddon } = useMutation<any, Error, any>({
    mutationFn: (sub: any) => {
        const primarySub = fullSubscriptionDetails?.find((s: any) => s.ITEM_CATEGORY === 'ZBPO');
        
        const payload = {
            sapBpId: displayData.sapBpId,
            sapCaId: displayData.sapCaId,
            contractId: displayData.contractNo,
            smartCardNo: displayData.macId,
            stbNo: displayData.hardware.stbSerialNumber || "",
            salesOrg: primarySub?.SALES_ORG,
            division: primarySub?.DIVISION,
            connectionType: primarySub?.ZCONNECTIONTYPE,
            affectiveType: "Immediate",
            scheduleDate: new Date().toISOString().split('T')[0],
            disChannel: "10",
            agentSapBpId: "",
            existingPlanId: primarySub?.PLAN_CODE || "",
            existingVariantId: primarySub?.PLAN_VAR_CODE || "",
            existingPlanAmount: primarySub?.CHARGE_AMT || "0",
            planDetails: [{
                bundleId: sub.PKG_CODE,
                bundleName: sub.PKG_NAME,
                amount: sub.CHARGE_AMT,
                currency: sub.CURRENCY,
                planName: sub.PLAN_NAME,
                salesOrg: sub.SALES_ORG,
                division: sub.DIVISION,
                connectionType: sub.ZCONNECTIONTYPE,
                bundleTrId: sub.PKG_TR_ID,
                mimeType: "Z5"
            }]
        };
        return apiRequest('/subscriptions/remove-addon', 'POST', payload);
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
        queryClient.invalidateQueries({ queryKey: ['serviceDetails'] });
        toast({ title: "Success", description: data?.data?.message || "Addon removed successfully." });
        setAddonToRemove(null); // Close dialog
    },
    onError: (error: any) => {
        toast({ 
            title: "Removal Failed", 
            description: error?.statusMessage || error.message || "Could not remove addon.", 
            variant: "destructive" 
        });
        setAddonToRemove(null); // Close dialog even on error
    }
  });

  const handleAutoRenewalToggle = (checked: boolean) => {
    if (!displayData.contractNo) return;
    updateAutoRenewal({ isEnabled: checked });
  };

  // ✅ ADDED: Confirm function
  const handleConfirmRemoval = () => {
    if (addonToRemove) {
      executeRemoveAddon(addonToRemove);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "SUSPENDED": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Suspended</Badge>;
      default: return <Badge variant="destructive">{status || 'INACTIVE'}</Badge>;
    }
  };

  const getItemCategoryBadge = (itemCategory: string) => {
    switch (itemCategory) {
      case "ZBPO": return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Base Plan</Badge>;
      case "ZADO": return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Add-on</Badge>;
      case "ZHWO": return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">Hardware</Badge>;
      default: return <Badge variant="outline" className="text-xs">{itemCategory}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptionDetails.filter(sub => {
    const matchesSearch = searchTerm === "" || sub.PLAN_NAME?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL_STATUSES" || (sub.STATUS === 'A' && statusFilter === 'Active') || (sub.STATUS !== 'A' && statusFilter === 'Inactive');
    const matchesType = typeFilter === "ALL_TYPES" || (sub.ITEM_CATEGORY === 'ZBPO' && typeFilter === 'Base') || (sub.ITEM_CATEGORY === 'ZADO' && typeFilter === 'AddOn');
    return matchesSearch && matchesStatus && matchesType;
  });

  const basePlanCount = subscriptionDetails.filter(sub => sub.ITEM_CATEGORY === 'ZBPO').length;
  const addOnCount = subscriptionDetails.filter(sub => sub.ITEM_CATEGORY === 'ZADO').length;

  return (
    <>
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-gray-900"><Tv className="h-4 w-4 text-azam-blue" />Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-2 sm:p-3 border rounded-lg bg-blue-50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 sm:mb-3 space-y-1 sm:space-y-0">
              <h3 className="font-semibold text-sm sm:text-base text-blue-900">{displayData.currentSubscription.planName}</h3>
              <div className="flex-shrink-0">{getStatusBadge(displayData.currentSubscription.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center"><span className="text-gray-600">Plan Type:</span><span className="font-medium">{displayData.currentSubscription.planType}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">End Date:</span><span className="font-medium">{displayData.currentSubscription.endDate}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Monthly Amount:</span><span className="font-medium">{currency} {displayData.currentSubscription.totalAmount.toLocaleString()}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Auto Renewal:</span><div className="flex items-center gap-1">{isUpdatingAutoRenewal && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}<Switch checked={displayData.currentSubscription.autoRenewal} onCheckedChange={handleAutoRenewalToggle} disabled={isUpdatingAutoRenewal || isCusInactive} className="scale-75" /><span className="text-xs text-gray-500">{displayData.currentSubscription.autoRenewal ? "Enabled" : "Disabled"}</span></div></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Start Date:</span><span className="font-medium">{displayData.currentSubscription.startDate}</span></div>
              <div className="flex justify-between items-center">
  <span className="text-gray-600">Days Remaining:</span>
  {(() => {
    const endDateStr = displayData.currentSubscription.endDateRaw;
    if (!endDateStr || endDateStr.length !== 8) return <span className="font-medium text-gray-500">N/A</span>;
    const year = parseInt(endDateStr.substring(0, 4), 10);
    const month = parseInt(endDateStr.substring(4, 6), 10) - 1;
    const day = parseInt(endDateStr.substring(6, 8), 10);
    const endDate = new Date(year, month, day);
    if (isNaN(endDate.getTime())) return <span className="font-medium text-gray-500">Invalid Date</span>;
    const timeDiff = endDate.setHours(23, 59, 59, 999) - new Date().getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) return <span className="font-medium text-red-600">Expired</span>;
    if (daysRemaining === 0) return <span className="font-medium text-orange-600">Expires Today</span>;
    if (daysRemaining <= 3) return <span className="font-medium text-orange-600">{daysRemaining} days</span>;
    return <span className="font-medium text-green-600">{daysRemaining} days</span>;
  })()}
</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900">
              <Zap className="h-7 w-5 text-azam-blue" />
              <span>All Subscriptions</span>
              <div className="flex gap-1"><Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{basePlanCount} Base</Badge>{addOnCount > 0 && <Badge variant="secondary" className="bg-purple-100 text-purple-700">{addOnCount} Add-on{addOnCount > 1 ? 's' : ''}</Badge>}</div>
            </CardTitle>
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48"><Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" /><Input type="text" placeholder="Search plan or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-7 h-7 text-xs w-full bg-white" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-7 text-xs w-24 sm:w-28 flex-none"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="ALL_TYPES">All Types</SelectItem><SelectItem value="Base">Base Plan</SelectItem><SelectItem value="AddOn">Add-on</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-7 text-xs w-24 sm:w-28 flex-none"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="ALL_STATUSES">All</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSubscriptions.length > 0 ? (
            <div className="space-y-3 p-4">
              {filteredSubscriptions.map((sub: any, idx: number) => {
                const isBasePlan = sub.ITEM_CATEGORY === 'ZBPO';
                const isAddOn = sub.ITEM_CATEGORY === 'ZADO';
                return (
                  <div key={idx} className={`border rounded-lg p-4 hover:shadow-sm transition-all ${isAddOn ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300' : 'border-gray-200 hover:border-azam-blue/30'}`}>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {isAddOn ? <Package className="h-4 w-4 text-purple-600" /> : <Tv className="h-4 w-4 text-blue-600" />}
                      <h3 className="font-semibold text-gray-900 text-sm">{sub.PLAN_NAME}</h3>
                      {getItemCategoryBadge(sub.ITEM_CATEGORY)}
                      <Badge variant={sub.STATUS === 'A' ? 'default' : 'secondary'} className="px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm rounded-full">{sub.STATUS === 'A' ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-xs">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Key Details</div>
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1"><Tv className="h-3 w-3 text-azam-blue" /><span className="font-mono">{sub.TECHNICAL_RES_ID}</span></div>
                          <div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-green-600" /><span className="font-semibold text-green-700">{sub.CURRENCY || currency} {parseFloat(sub.CHARGE_AMT || 0).toLocaleString()}</span></div>
                          {isBasePlan && sub.PLAN_VAR_CODE && <div className="text-xs text-gray-500">Variant: {sub.PLAN_VAR_CODE}</div>}
                        </div>
                      </div>
                      <div className="sm:hidden">
                        <div className="text-xs text-gray-500 mb-1">Actions</div>
                        <div className="flex gap-1">
                          {isBasePlan && (<><Button onClick={onRenewalClick} disabled={isCusInactive} size="xs" className="bg-azam-blue text-white px-2 h-7"><RotateCcw className="h-3 w-3" /></Button><Button onClick={onPlanChangeClick} disabled={isCusInactive} size="xs" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 px-2 h-7"><ArrowUpDown className="h-3 w-3" /></Button></>)}
                          {/* ✅ Mobile Remove Button */}
                          {isAddOn && (
                            <Button onClick={() => setAddonToRemove(sub)} disabled={isCusInactive || isRemovingAddon} size="xs" variant="destructive" className="h-7 px-2">
                                <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Subscription Period</div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center text-gray-700"><Calendar className="h-3 w-3 mr-1 text-green-500" />{formatApiDate(sub.PLAN_START_DT)}</div>
                          <div className="flex items-center text-gray-700"><Calendar className="h-3 w-3 mr-1 text-red-500" />{formatApiDate(sub.PLAN_END_DT)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{isBasePlan ? 'Auto Renewal' : 'Parent Package'}</div>
                        <div className="space-y-1">{isBasePlan ? <Badge variant={sub.AUTO_RENEWAL_FLAG === '1' ? 'default' : 'secondary'} className="text-xs">{sub.AUTO_RENEWAL_FLAG === '1' ? 'Enabled' : 'Disabled'}</Badge> : <span className="text-xs text-gray-600 font-medium">{sub.PKG_NAME || sub.PKG_CODE || 'N/A'}</span>}</div>
                      </div>
                    </div>
                    {/* Desktop Actions */}
                    <div className="hidden sm:flex sm:gap-2 mt-3 pt-3 border-t border-gray-100 justify-end">
                        {isBasePlan && (
                            <>
                                <Button onClick={onRenewalClick} disabled={isCusInactive} size="xs" className="bg-azam-blue text-white px-2 h-7"><RotateCcw className="h-3 w-3 mr-2" />Renew</Button>
                                <Button onClick={onPlanChangeClick} disabled={isCusInactive} size="xs" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 px-2 h-7"><ArrowUpDown className="h-3 w-3 mr-2" />Change Plan</Button>
                            </>
                        )}
                        {/* ✅ Desktop Remove Addon Button */}
                        {isAddOn && (
                            <Button 
                                onClick={() => setAddonToRemove(sub)} 
                                disabled={isCusInactive || isRemovingAddon} 
                                size="xs" 
                                variant="destructive" 
                                className="h-7 px-3 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remove Addon
                            </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white"><h3 className="text-lg font-semibold text-gray-700 mb-2">No Subscriptions Found</h3><p className="text-gray-500 text-sm">No subscriptions match your filter criteria.</p></div>
          )}
        </CardContent>
      </Card>

      {/* ✅ ADDED: Confirmation Dialog */}
      <Dialog open={!!addonToRemove} onOpenChange={(open) => !open && setAddonToRemove(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Remove Add-on?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{addonToRemove?.PLAN_NAME}</strong>?
              <br />
              <span className="text-xs text-gray-500 mt-2 block">This action cannot be undone immediately.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddonToRemove(null)} disabled={isRemovingAddon}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleConfirmRemoval} 
              disabled={isRemovingAddon}
            >
              {isRemovingAddon ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isRemovingAddon ? "Removing..." : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
// src/pages/subscriber-view/AddOnPackagePopup.tsx

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, Plus, Package, User, Gift, Calendar as CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";
import { Calendar } from "../ui/calendar";

// --- Type Definitions ---
interface EventPackage {
  division: string;
  amount: string;
  currency: string;
  event_code: string;
  sales_org: string;
  bundle_id: string;
  event_name: string;
  nagra_code: string;
  valid_from: string;
  valid_to: string;
}

interface AddOnPlan {
  planName: string;
  planId: string;
  variantId: string;
  bundleName: string;
  bundleId: string;
  mimeType: string;
  amount: string;
  currency: string;
  accountClass: string;
  connectionType: string;
  salesOrg: string;
  division: string;
  PKG_TR_ID?: string;
}

interface SubscriptionDetail {
  ITEM_CATEGORY: string;
  PKG_CODE: string;
  PKG_NAME: string;
  PLAN_CODE: string;
  PLAN_NAME: string;
  PLAN_VAR_CODE: string;
  SALES_ORG: string;
  DIVISION: string;
  ZCONNECTIONTYPE: string;
  PKG_TR_ID: string;
  // ... other fields
}

interface AddOnPackagePopupProps {
  customer: any;
  onClose: () => void;
  onOperationSuccess: (message: string, operationType?: string, requestId?: string) => void;
  fullSubscriptionDetails?: SubscriptionDetail[];
}

// --- Schema ---
const addOnSchema = z.object({
  selectedId: z.string().min(1, "Please select a package."),
  selectedType: z.enum(["ADDON", "EVENT"]),
  changeType: z.enum(["immediate", "scheduled"]),
  scheduledDate: z.date().optional(),
}).refine(data => !(data.changeType === 'scheduled' && !data.scheduledDate), {
  message: "Scheduled date is required for a scheduled change.",
  path: ["scheduledDate"],
});

type AddOnFormData = z.infer<typeof addOnSchema>;

// --- Helper Functions ---
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}-${month}-${year}`;
};

// ✅ Helper to generate unique key for add-on
const getUniqueKey = (addon: AddOnPlan): string => {
  return `${addon.variantId}_${addon.bundleId}`;
};

// --- Main Component ---
export default function AddOnPackagePopup({
  customer,
  onClose,
  onOperationSuccess,
  fullSubscriptionDetails
}: AddOnPackagePopupProps) {
  const { toast } = useToast();

  // --- State ---
  const [activeTab, setActiveTab] = useState<"addons" | "events">("addons");
  const [addOnSearchTerm, setAddOnSearchTerm] = useState("");
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [selectedAddOn, setSelectedAddOn] = useState<AddOnPlan | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventPackage | null>(null);
  const [addOnPage, setAddOnPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const pageSize = 5;
  const [scheduledDatePart, setScheduledDatePart] = useState<Date | undefined>();
  const [scheduledTimePart, setScheduledTimePart] = useState<string>("00:00");

  // --- Form ---
  const form = useForm<AddOnFormData>({
    resolver: zodResolver(addOnSchema),
    defaultValues: {
      selectedId: "",
      selectedType: "ADDON",
      changeType: "immediate",
      scheduledDate: undefined
    },
  });

  const changeType = form.watch("changeType");

  useEffect(() => {
    if (changeType === 'scheduled' && scheduledDatePart && scheduledTimePart) {
      try {
        const [hours, minutes] = scheduledTimePart.split(':').map(Number);
        const combinedDate = new Date(scheduledDatePart);
        combinedDate.setHours(hours, minutes, 0, 0);
        form.setValue('scheduledDate', combinedDate);
        form.trigger('scheduledDate');
      } catch (e) {
        form.setValue('scheduledDate', undefined);
      }
    } else {
      form.setValue('scheduledDate', undefined);
    }
  }, [scheduledDatePart, scheduledTimePart, changeType, form]);

  // --- Get Primary Subscription (ZBPO) ---
  const primarySub = useMemo(() => {
    return fullSubscriptionDetails?.find((sub: SubscriptionDetail) => sub.ITEM_CATEGORY === 'ZBPO');
  }, [fullSubscriptionDetails]);

  // ✅ Get Base Plan Bundle ID (PKG_CODE from ZBPO)
  const basePlanBundleId = useMemo(() => {
    return primarySub?.PKG_CODE || "";
  }, [primarySub]);

  // --- Queries ---

  // Query for Add-on Plans (mimeType Z5)
  const { data: planDetailsResponse, isLoading: isLoadingAddOns, isError: isAddOnsError } = useQuery({
    queryKey: ['addOnPlans', customer.salesOrg, customer.divisionType, customer.accountClass],
    queryFn: () => apiRequest('/subscriptions/plan-details', 'POST', {
      category: customer.accountClass || "Residential",
      salesOrg: customer.salesOrg || "Azam Media Ltd",
      division: customer.divisionType
    }),
    enabled: !!customer.divisionType && !!customer.accountClass,
    staleTime: 1000 * 60 * 5,
  });

  // Query for Events
  const { data: eventDetailsResponse, isLoading: isLoadingEvents, isError: isEventsError } = useQuery({
    queryKey: ['eventDetails', customer.salesOrg, customer.divisionType],
    queryFn: () => apiRequest('/subscriptions/event-details', 'POST', {
      salesOrg: primarySub?.SALES_ORG || "",
      division: primarySub?.DIVISION || "",
      bundleId: null
    }),
    enabled: !!customer.salesOrg && !!customer.divisionType,
    staleTime: 1000 * 60 * 5,
  });

  // --- Memoized Data ---

  // ✅ UPDATED: Filter Add-on Plans
  // 1. mimeType === "Z5"
  // 2. bundleId matches base plan's PKG_CODE
  // 3. Deduplicate by unique composite key (variantId + bundleId)
  const availableAddOns = useMemo(() => {
    if (planDetailsResponse?.status !== "SUCCESS") return [];
    if (!basePlanBundleId) return []; // No base plan found
    
    const plans: AddOnPlan[] = planDetailsResponse?.data?.planDetails || [];
    
    // Filter: mimeType Z5 AND bundleId matches base plan PKG_CODE
    const filteredPlans = plans.filter((plan) => 
      plan.mimeType === "Z5" && plan.bundleId === basePlanBundleId
    );
    
    // Deduplicate by unique composite key (variantId + bundleId)
    const uniqueAddOns = new Map<string, AddOnPlan>();
    filteredPlans.forEach((plan) => {
      const uniqueKey = getUniqueKey(plan);
      if (!uniqueAddOns.has(uniqueKey)) {
        uniqueAddOns.set(uniqueKey, plan);
      }
    });
    
    return Array.from(uniqueAddOns.values());
  }, [planDetailsResponse, basePlanBundleId]);

  // Filter Events
  const availableEvents = useMemo(() => {
    if (eventDetailsResponse?.status !== "SUCCESS") return [];
    return eventDetailsResponse.data?.eventList || [];
  }, [eventDetailsResponse]);

  // Filtered & Paginated Add-ons
  const filteredAddOns = useMemo(() => {
    if (!addOnSearchTerm) return availableAddOns;
    return availableAddOns.filter((addon) =>
      addon.planName.toLowerCase().includes(addOnSearchTerm.toLowerCase()) ||
      addon.bundleName.toLowerCase().includes(addOnSearchTerm.toLowerCase()) ||
      addon.variantId.toLowerCase().includes(addOnSearchTerm.toLowerCase())
    );
  }, [availableAddOns, addOnSearchTerm]);

  const addOnTotalPages = Math.max(1, Math.ceil(filteredAddOns.length / pageSize));
  const paginatedAddOns = useMemo(() => 
    filteredAddOns.slice((addOnPage - 1) * pageSize, addOnPage * pageSize),
    [filteredAddOns, addOnPage, pageSize]
  );

  // Filtered & Paginated Events
  const filteredEvents = useMemo(() => {
    if (!eventSearchTerm) return availableEvents;
    return availableEvents.filter((event: EventPackage) =>
      event.event_name.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
      event.event_code.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
      event.bundle_id.toLowerCase().includes(eventSearchTerm.toLowerCase())
    );
  }, [availableEvents, eventSearchTerm]);

  const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => 
    filteredEvents.slice((eventPage - 1) * pageSize, eventPage * pageSize),
    [filteredEvents, eventPage, pageSize]
  );

  // --- Effects ---
  useEffect(() => {
    if (addOnPage > addOnTotalPages) setAddOnPage(1);
  }, [filteredAddOns.length, addOnTotalPages, addOnPage]);

  useEffect(() => {
    if (eventPage > eventTotalPages) setEventPage(1);
  }, [filteredEvents.length, eventTotalPages, eventPage]);

  // Reset selection when switching tabs
  useEffect(() => {
    if (activeTab === "addons") {
      setSelectedEvent(null);
      if (selectedAddOn) {
        form.setValue("selectedId", getUniqueKey(selectedAddOn));
        form.setValue("selectedType", "ADDON");
      } else {
        form.setValue("selectedId", "");
      }
    } else {
      setSelectedAddOn(null);
      if (selectedEvent) {
        form.setValue("selectedId", selectedEvent.bundle_id);
        form.setValue("selectedType", "EVENT");
      } else {
        form.setValue("selectedId", "");
      }
    }
  }, [activeTab, selectedAddOn, selectedEvent, form]);

  // --- Mutations ---

  // Mutation for Add-on Plans
  const addOnPlanMutation = useMutation<any, Error, any>({
    mutationFn: (payload) => apiRequest('/subscriptions/addon-purchase', 'POST', payload),
    onSuccess: (data) => {
      const requestId = data?.data?.requestId || data?.data?.REQUEST_ID || "";
      onOperationSuccess(
        data?.data?.message || data?.statusMessage || "Add-on package added successfully.", 
        "ADD_ON",
        requestId
      );
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Add Package", 
        description: error?.statusMessage || error.message, 
        variant: "destructive" 
      });
    }
  });

  // Mutation for Events
  const addEventMutation = useMutation<any, Error, any>({
    mutationFn: (payload) => apiRequest('/subscriptions/create-event', 'POST', payload),
    onSuccess: (data) => {
      const requestId = data?.data?.requestId || data?.data?.REQUEST_ID || "";
      onOperationSuccess(
        data?.data?.message || data?.statusMessage || "Event added successfully.", 
        "ADD_ON_EVENT",
        requestId
      );
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Add Event", 
        description: error?.statusMessage || error.message, 
        variant: "destructive" 
      });
    }
  });

  // --- Handlers ---

  // ✅ Updated: Use unique composite key for selection
  const handleAddOnSelect = (addon: AddOnPlan) => {
    setSelectedAddOn(addon);
    setSelectedEvent(null);
    form.setValue("selectedId", getUniqueKey(addon));
    form.setValue("selectedType", "ADDON");
    form.trigger("selectedId");
  };

  const handleEventSelect = (event: EventPackage) => {
    setSelectedEvent(event);
    setSelectedAddOn(null);
    form.setValue("selectedId", event.bundle_id);
    form.setValue("selectedType", "EVENT");
    form.trigger("selectedId");
  };

  const onSubmit = (data: AddOnFormData) => {
    if (!primarySub) {
      toast({ 
        title: "Error", 
        description: "Could not find primary subscription details.", 
        variant: "destructive" 
      });
      return;
    }

    const dateString = data.changeType === 'scheduled' && data.scheduledDate
      ? format(data.scheduledDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");

    const existingPlanId = primarySub.PLAN_CODE || primarySub.PKG_CODE || "";
    const existingVariantId = primarySub.PLAN_VAR_CODE || "";

    if (data.selectedType === "ADDON" && selectedAddOn) {
      const availableBalance = parseFloat(customer.subsBalance || '0');
      const cost = parseFloat(selectedAddOn.amount || '0');
      const currency = selectedAddOn.currency || customer.walletCurrency || 'TZS';
      const isPostpaid = selectedAddOn.connectionType?.trim().toUpperCase() === 'POSTPAID';

      if (!isPostpaid && data.changeType !== 'scheduled' && availableBalance < cost) {
        toast({
          title: "Insufficient Balance",
          description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than package cost (${cost.toLocaleString()} ${currency}).`,
          variant: "destructive"
        });
        return;
      }

      const payload = {
        sapBpId: customer.sapBpId,
        sapCaId: customer.sapCaId,
        contractId: customer.contractNo,
        smartCardNo: customer.macId,
        stbNo: customer.hardware?.stbSerialNumber || "",
        salesOrg: primarySub.SALES_ORG,
        division: primarySub.DIVISION,
        connectionType: primarySub.ZCONNECTIONTYPE,
        affectiveType: data.changeType === 'scheduled' ? 'Schedule' : 'Immediate',
        scheduleDate: data.changeType === 'scheduled' && data.scheduledDate 
          ? format(data.scheduledDate, "yyyy-MM-dd") 
          : format(new Date(), "yyyy-MM-dd"),
        disChannel: "10",
        agentSapBpId: "",
        existingPlanId: existingPlanId,
        existingVariantId: existingVariantId,
        existingPlanAmount: selectedAddOn.amount,
        planDetails: [{
          planId: selectedAddOn.planId,
          variantId: selectedAddOn.variantId,
          bundleId: selectedAddOn.bundleId,
          bundleName: selectedAddOn.bundleName,
          amount: selectedAddOn.amount,
          currency: selectedAddOn.currency,
          planName: selectedAddOn.planName,
          salesOrg: selectedAddOn.salesOrg,
          division: selectedAddOn.division,
          connectionType: selectedAddOn.connectionType,
          bundleTrId: primarySub.PKG_TR_ID,
          mimeType: selectedAddOn.mimeType
        }]
      };

      addOnPlanMutation.mutate(payload);

    } else if (data.selectedType === "EVENT" && selectedEvent) {
      const availableBalance = parseFloat(customer.subsBalance || '0');
      const cost = parseFloat(selectedEvent.amount || '0');
      const currency = selectedEvent.currency || customer.walletCurrency || 'TZS';

      if (data.changeType !== 'scheduled' && availableBalance < cost) {
        toast({
          title: "Insufficient Balance",
          description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than event cost (${cost.toLocaleString()} ${currency}).`,
          variant: "destructive"
        });
        return;
      }

      const payload = {
        sapBpId: customer.sapBpId,
        sapCaId: customer.sapCaId,
        sapContractId: customer.contractNo,
        salesOrg: primarySub.SALES_ORG,
        division: primarySub.DIVISION,
        currency: selectedEvent.currency,
        startDate: dateString,
        endDate: dateString,
        connectionType: primarySub.ZCONNECTIONTYPE,
        smartCardNo: customer.macId,
        stbNo: customer.hardware?.stbSerialNumber || "",
        amount: selectedEvent.amount,
        bundleId: selectedEvent.bundle_id,
        eventId: selectedEvent.event_name,
        nagaraId: selectedEvent.nagra_code,
        affectiveType: data.changeType === 'scheduled' ? 'Schedule' : 'Immediate',
        scheduleDate: data.changeType === 'scheduled' && data.scheduledDate 
          ? format(data.scheduledDate, "yyyy-MM-dd") 
          : format(new Date(), "yyyy-MM-dd"),
        existingPlanId: existingPlanId,
        existingVariantId: existingVariantId,
        existingPlanAmount: selectedEvent.amount,
      };

      addEventMutation.mutate(payload);
    } else {
      toast({ 
        title: "Error", 
        description: "Please select a package or event.", 
        variant: "destructive" 
      });
    }
  };

  const isLoading = isLoadingAddOns || isLoadingEvents;
  const isMutating = addOnPlanMutation.isPending || addEventMutation.isPending;

  // Get selected item for summary card
  const getSelectedSummary = () => {
    if (activeTab === "addons" && selectedAddOn) {
      return {
        type: "Add-on",
        name: selectedAddOn.planName,
        id: selectedAddOn.variantId,
        amount: parseFloat(selectedAddOn.amount),
        currency: selectedAddOn.currency || customer.walletCurrency || 'TZS',
        extra: `Bundle: ${selectedAddOn.bundleName}`
      };
    }
    if (activeTab === "events" && selectedEvent) {
      return {
        type: "Event",
        name: selectedEvent.event_name,
        id: selectedEvent.bundle_id,
        amount: parseFloat(selectedEvent.amount),
        currency: selectedEvent.currency || customer.walletCurrency || 'TZS',
        extra: `Valid: ${formatDisplayDate(selectedEvent.valid_from)} - ${formatDisplayDate(selectedEvent.valid_to)}`
      };
    }
    return null;
  };

  const selectedSummary = getSelectedSummary();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-orange-600" />
            <span>Add-on Packages & Events</span>
          </DialogTitle>
          <DialogDescription>
            Select an add-on package or event to add to the customer's subscription.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            {/* Customer Details Card */}
            <div className="rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-3 shadow-sm">
              <h4 className="flex items-center text-sm font-semibold text-orange-800 mb-2">
                <User className="mr-2 h-4 w-4 text-orange-600" />
                Customer Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <span className="block text-gray-500 text-xs">Customer</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {customer.firstName} {customer.lastName}
                  </span>
                </div>
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <span className="block text-gray-500 text-xs">Smart Card</span>
                  <span className="font-semibold text-gray-800 text-sm">{customer.macId}</span>
                </div>
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <span className="block text-gray-500 text-xs">Current Plan</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {primarySub?.PLAN_NAME || customer.currentSubscription?.planName || 'N/A'}
                  </span>
                </div>
                <div className="rounded-md border border-gray-100 bg-white p-2">
                  <span className="block text-gray-500 text-xs">Base Bundle</span>
                  <span className="font-semibold text-blue-600 text-sm">
                    {basePlanBundleId || 'N/A'}
                  </span>
                </div>
              </div>
              {/* ✅ Show available balance separately */}
              <div className="mt-2 rounded-md border border-green-100 bg-green-50 p-2">
                <span className="block text-gray-500 text-xs">Available Balance</span>
                <span className="font-semibold text-green-600 text-sm">
                  {customer.walletCurrency || 'TZS'} {parseFloat(customer.subsBalance || '0').toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left Section - Tabs with Lists */}
              <div className="lg:col-span-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "addons" | "events")}>
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="addons" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Add-ons
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {availableAddOns.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Events
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {availableEvents.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Add-ons Tab */}
                  <TabsContent value="addons" className="mt-0">
                    <div className="space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search add-on packages..."
                          value={addOnSearchTerm}
                          onChange={(e) => { setAddOnSearchTerm(e.target.value); setAddOnPage(1); }}
                          className="pl-9"
                        />
                      </div>

                      {/* ✅ Info banner showing filter criteria */}
                      {/* {basePlanBundleId && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          Showing add-ons for bundle: <strong>{basePlanBundleId}</strong>
                        </div>
                      )} */}

                      {/* List */}
                      <div className="border rounded-md p-2 bg-white shadow-sm space-y-2 min-h-[250px] max-h-[300px] overflow-y-auto">
                        {isLoadingAddOns && (
                          <div className="text-center p-4 text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading Add-ons...
                          </div>
                        )}
                        {isAddOnsError && (
                          <div className="text-center p-4 text-sm text-red-600">
                            Error fetching add-ons. Please try again.
                          </div>
                        )}
                        {!isLoadingAddOns && !isAddOnsError && !basePlanBundleId && (
                          <div className="text-center p-4 text-sm text-orange-600">
                            Unable to determine base plan bundle ID. No add-ons available.
                          </div>
                        )}
                        {!isLoadingAddOns && !isAddOnsError && basePlanBundleId && paginatedAddOns.length === 0 && (
                          <div className="text-center p-4 text-sm text-gray-500">
                            No add-on packages found for bundle: {basePlanBundleId}
                          </div>
                        )}
                        {!isLoadingAddOns && !isAddOnsError && paginatedAddOns.map((addon) => {
                          // ✅ Fixed: Use unique composite key for comparison
                          const isSelected = selectedAddOn 
                            ? getUniqueKey(selectedAddOn) === getUniqueKey(addon)
                            : false;
                          
                          return (
                            <div
                              key={getUniqueKey(addon)}
                              className={cn(
                                "flex justify-between items-center p-3 border rounded-md cursor-pointer transition-all",
                                isSelected
                                  ? "bg-orange-100 border-orange-400 shadow-sm"
                                  : "border-gray-100 hover:bg-gray-50"
                              )}
                              onClick={() => handleAddOnSelect(addon)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{addon.planName}</span>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {addon.variantId}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {addon.bundleName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs font-semibold text-green-600">
                                    {addon.currency} {parseFloat(addon.amount).toLocaleString()}
                                  </p>
                                  <Badge variant="secondary" className="text-xs">
                                    {addon.bundleId}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="xs"
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                  "pointer-events-none shrink-0 ml-2",
                                  isSelected && "bg-orange-500 text-white"
                                )}
                              >
                                {isSelected ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Selected</>
                                ) : (
                                  <><Plus className="h-3 w-3 mr-1" /> Select</>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {filteredAddOns.length > pageSize && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setAddOnPage((p) => Math.max(1, p - 1))}
                              disabled={addOnPage === 1}
                            >
                              Prev
                            </Button>
                            <span>Page {addOnPage} / {addOnTotalPages}</span>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setAddOnPage((p) => Math.min(addOnTotalPages, p + 1))}
                              disabled={addOnPage === addOnTotalPages}
                            >
                              Next
                            </Button>
                          </div>
                          <div className="text-gray-600">
                            {filteredAddOns.length} add-on(s) found
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Events Tab */}
                  <TabsContent value="events" className="mt-0">
                    <div className="space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search events..."
                          value={eventSearchTerm}
                          onChange={(e) => { setEventSearchTerm(e.target.value); setEventPage(1); }}
                          className="pl-9"
                        />
                      </div>

                      {/* List */}
                      <div className="border rounded-md p-2 bg-white shadow-sm space-y-2 min-h-[250px] max-h-[300px] overflow-y-auto">
                        {isLoadingEvents && (
                          <div className="text-center p-4 text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading Events...
                          </div>
                        )}
                        {isEventsError && (
                          <div className="text-center p-4 text-sm text-red-600">
                            Error fetching events. Please try again.
                          </div>
                        )}
                        {!isLoadingEvents && !isEventsError && paginatedEvents.length === 0 && (
                          <div className="text-center p-4 text-sm text-gray-500">
                            No events found.
                          </div>
                        )}
                        {!isLoadingEvents && !isEventsError && paginatedEvents.map((event: EventPackage) => {
                          const isSelected = selectedEvent?.bundle_id === event.bundle_id;
                          return (
                            <div
                              key={event.bundle_id}
                              className={cn(
                                "flex justify-between items-center p-3 border rounded-md cursor-pointer transition-all",
                                isSelected
                                  ? "bg-purple-100 border-purple-400 shadow-sm"
                                  : "border-gray-100 hover:bg-gray-50"
                              )}
                              onClick={() => handleEventSelect(event)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{event.event_name}</span>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {event.bundle_id}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>
                                    {formatDisplayDate(event.valid_from)} - {formatDisplayDate(event.valid_to)}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-green-600 mt-1">
                                  {event.currency} {parseFloat(event.amount).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="xs"
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                  "pointer-events-none shrink-0 ml-2",
                                  isSelected && "bg-purple-500 text-white"
                                )}
                              >
                                {isSelected ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Selected</>
                                ) : (
                                  <><Plus className="h-3 w-3 mr-1" /> Select</>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {filteredEvents.length > pageSize && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                              disabled={eventPage === 1}
                            >
                              Prev
                            </Button>
                            <span>Page {eventPage} / {eventTotalPages}</span>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setEventPage((p) => Math.min(eventTotalPages, p + 1))}
                              disabled={eventPage === eventTotalPages}
                            >
                              Next
                            </Button>
                          </div>
                          <div className="text-gray-600">
                            {filteredEvents.length} event(s) found
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Section - Summary & Actions */}
              <div className="space-y-4">
                {/* Selected Item Summary */}
                <Card className={cn(
                  "border shadow-sm sticky top-4",
                  activeTab === "addons" ? "border-orange-100" : "border-purple-100"
                )}>
                  <CardHeader className="p-3">
                    <CardTitle className={cn(
                      "text-base",
                      activeTab === "addons" ? "text-orange-700" : "text-purple-700"
                    )}>
                      Selected {activeTab === "addons" ? "Add-on" : "Event"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {selectedSummary ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{selectedSummary.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {selectedSummary.id}
                          </Badge>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {selectedSummary.currency} {selectedSummary.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{selectedSummary.extra}</p>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            activeTab === "addons" 
                              ? "bg-orange-100 text-orange-700" 
                              : "bg-purple-100 text-purple-700"
                          )}
                        >
                          {selectedSummary.type}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>Select a package from the list</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Form Validation Message */}
                <FormField
                  name="selectedId"
                  render={({ fieldState }) => (
                    <FormMessage className="text-xs text-center">
                      {fieldState.error?.message}
                    </FormMessage>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="changeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger uiSize="sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            {/* <SelectItem value="scheduled">Scheduled</SelectItem> */}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {changeType === 'scheduled' && (
                    <div>
                      <Label>Scheduled Date & Time</Label>
                      <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="xs"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !scheduledDatePart && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduledDatePart ? format(scheduledDatePart, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={scheduledDatePart}
                              onSelect={setScheduledDatePart}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={scheduledTimePart}
                          onChange={(e) => setScheduledTimePart(e.target.value)}
                          className="w-full sm:w-auto"
                        />
                      </div>
                      <FormField
                        name="scheduledDate"
                        render={({ fieldState }) => <FormMessage className="mt-2 text-xs" />}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!selectedSummary || isMutating}
                    className={cn(
                      "w-full",
                      activeTab === "addons"
                        ? "bg-orange-600 hover:bg-orange-700"
                        : "bg-purple-600 hover:bg-purple-700"
                    )}
                  >
                    {isMutating ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                    ) : (
                      <><Package className="h-4 w-4 mr-2" /> Add {activeTab === "addons" ? "Package" : "Event"}</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onClose}
                    disabled={isMutating}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
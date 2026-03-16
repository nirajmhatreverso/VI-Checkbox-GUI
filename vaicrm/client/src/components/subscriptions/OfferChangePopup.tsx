// src/components/subscriber-view/OfferChangePopup.tsx

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, X, Search, CheckCircle, Plus, Gift, User, Calendar as CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Schema is unchanged
const offerChangeSchema = z.object({
  newPlanVariantId: z.string().min(1, "Please select an offer."),
  changeType: z.enum(["immediate", "scheduled"]),
  scheduledDate: z.date().optional(),
}).refine(data => !(data.changeType === 'scheduled' && !data.scheduledDate), {
    message: "Scheduled date and time are required for a scheduled change.", path: ["scheduledDate"], 
});

type OfferChangeData = z.infer<typeof offerChangeSchema>;

interface Plan {
  planName: string; planId: string; variantId: string;
  bundleName: string; bundleId: string; mimeType: string;
  amount: string; currency: string; accountClass: string;
  connectionType: string; salesOrg: string; division: string;
}

interface OfferChangePopupProps {
  customer: any;
  onClose: () => void;
  // ✅ UPDATED: Add requestId as 3rd argument
  onOperationSuccess: (message: string, operationType?: string, requestId?: string) => void;
  fullSubscriptionDetails?: any[];
}

export default function OfferChangePopup({ customer, onClose, onOperationSuccess, fullSubscriptionDetails }: OfferChangePopupProps) {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanVariantId, setSelectedPlanVariantId] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [scheduledDatePart, setScheduledDatePart] = useState<Date | undefined>();
  const [scheduledTimePart, setScheduledTimePart] = useState<string>("00:00");

  const form = useForm<OfferChangeData>({
    resolver: zodResolver(offerChangeSchema),
    defaultValues: { newPlanVariantId: "", changeType: "immediate", scheduledDate: undefined },
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

  const { data: planDetailsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['planDetails', customer.salesOrg, customer.divisionType, customer.accountClass],
    queryFn: () => apiRequest('/subscriptions/plan-details', 'POST', {
          category: customer.accountClass || "Residential",
          salesOrg: customer.salesOrg || "Azam Media Ltd",
          division: customer.divisionType
        }),
    enabled: !!customer.divisionType && !!customer.accountClass,
    staleTime: 1000 * 60 * 5,
  });
  
  const availableOffers = useMemo(() => {
    if (planDetailsResponse?.status !== "SUCCESS") return [];
    const allPlans: Plan[] = planDetailsResponse.data?.planDetails || [];
    
    // Get current plan code and variant code from fullSubscriptionDetails (primary subscription)
    const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
    
    const currentPlanCode = primarySub?.PLAN_CODE || customer.currentSubscription?.pkgCode;
    const currentPlanVarCode = primarySub?.PLAN_VAR_CODE || customer.currentSubscription?.planVarCode;
    
    if (!currentPlanCode) return [];
    
    // Filter plans that have the same planId (PLAN_CODE) but different variantId (PLAN_VAR_CODE)
    return allPlans.filter((plan: Plan) => 
        plan.planId === currentPlanCode && plan.variantId !== currentPlanVarCode
    );
}, [planDetailsResponse, customer, fullSubscriptionDetails]);

  const filteredOffers = useMemo(() => {
    if (!searchTerm) return availableOffers;
    return availableOffers.filter((plan: Plan) => plan.planName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [availableOffers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / pageSize));
  const paginatedOffers = useMemo(() => filteredOffers.slice((page - 1) * pageSize, page * pageSize), [filteredOffers, page, pageSize]);
  const selectedOfferObject = useMemo(() => availableOffers.find((p: Plan) => p.variantId === selectedPlanVariantId), [selectedPlanVariantId, availableOffers]);

  useEffect(() => { if (page > totalPages) setPage(1); }, [filteredOffers.length, pageSize, totalPages, page]);

  const offerChangeMutation = useMutation<any, Error, any>({
  mutationFn: (payload) => apiRequest('/subscriptions/offer-change', 'POST', payload),
  onSuccess: (data) => {
    const requestId = data?.data?.requestId || data?.data?.REQUEST_ID || "";
    onOperationSuccess(
      data?.data?.message || data?.statusMessage || "Offer change processed.", 
      "OFFER_CHANGE",
      requestId
    );
    onClose();
  },
  onError: (error: any) => { 
    toast({ 
      title: "Offer Change Failed", 
      description: error?.statusMessage || error.message, 
      variant: "destructive" 
    }); 
  }
});

  const onSubmit = (data: OfferChangeData) => {
    if (!selectedOfferObject) {
        toast({ title: "Error", description: "No offer selected.", variant: "destructive"});
        return;
    }
    if (!fullSubscriptionDetails || fullSubscriptionDetails.length === 0) {
        toast({ title: "Error", description: "Detailed subscription data is missing.", variant: "destructive" });
        return;
    }
    const primarySub = fullSubscriptionDetails.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
    if (!primarySub) {
        toast({ title: "Error", description: "Could not find a primary subscription to source required IDs.", variant: "destructive" });
        return;
    }

    // ✅ ADDED: Balance Check Logic
    const availableBalance = parseFloat(customer?.subsBalance || '0');
    const cost = parseFloat(selectedOfferObject.amount || '0');
    const currency = selectedOfferObject.currency || '';
    const isPostpaid = selectedOfferObject.connectionType?.trim().toUpperCase() === 'POSTPAID';

    // Skip balance check if connection is postpaid OR if the change is scheduled
    if (!isPostpaid && data.changeType !== 'scheduled' && availableBalance < cost) {
        toast({
            title: "Insufficient Balance",
            description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than offer cost (${cost.toLocaleString()} ${currency}).`,
            variant: "destructive"
        });
        return;
    }

     const activeAddon = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A');
    const variantIdAddOn = activeAddon?.PLAN_VAR_CODE || "";
    const planIdAddOn = activeAddon?.PLAN_CODE || "";

    const newPlanDetailsObject = {
        ...selectedOfferObject,
        bundleTrId: primarySub.PKG_TR_ID,
         variantIdAddOn:variantIdAddOn,
        planIdAddOn:planIdAddOn, // Add the bundle transaction ID from the primary sub
    };
    
    // ✅ Extract active add-on details
   

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
        scheduleDate: data.changeType === 'scheduled' && data.scheduledDate ? format(data.scheduledDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        disChannel: "", 
        agentSapBpId: "", 
        
        // ✅ Pass Add-on Fields
       
        
        planDetails: [newPlanDetailsObject]
    };

    offerChangeMutation.mutate(payload);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-teal-600" />
            <span>Offer Change</span>
          </DialogTitle>
          <DialogDescription>Select a new offer and application type for the customer.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="mb-4 rounded-lg border border-teal-100 bg-gradient-to-r from-teal-50 to-white p-3 shadow-sm">
                    <h4 className="flex items-center text-sm font-semibold text-teal-800 mb-2"><User className="mr-2 h-4 w-4 text-teal-600" />Customer Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <div className="rounded-md border border-gray-100 bg-white p-2">
                            <span className="block text-gray-500 text-xs">Customer</span>
                            <span className="font-semibold text-gray-800 text-sm">{customer.firstName} {customer.lastName}</span>
                        </div>
                         <div className="rounded-md border border-gray-100 bg-white p-2">
                            <span className="block text-gray-500 text-xs">Smart Card</span>
                            <span className="font-semibold text-gray-800 text-sm">{customer.macId}</span>
                        </div>
                        <div className="rounded-md border border-gray-100 bg-white p-2">
                            <span className="block text-gray-500 text-xs">Current Plan</span>
                            <span className="font-semibold text-gray-800 text-sm">{customer.currentSubscription?.planName}</span>
                        </div>
                        <div className="rounded-md border border-gray-100 bg-white p-2">
                            <span className="block text-gray-500 text-xs">Status</span>
                            <span className={`font-semibold text-sm ${customer.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{customer.status}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <Label className="font-medium text-gray-800 text-sm">Available Offers</Label>
                        <div className="relative my-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search for an offer..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="pl-8 py-1"/>
                        </div>

                        <div className="mt-1 border rounded-md p-1 bg-white shadow-sm space-y-1 min-h-[200px]">
                            {isLoading && (<div className="text-center p-4 text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading offers...</div>)}
                            {isError && (<div className="text-center p-4 text-sm text-red-600">{(error as any)?.statusMessage || "Error fetching offers."}</div>)}
                            {!isLoading && !isError && paginatedOffers.length === 0 && (<div className="text-center p-4 text-sm text-gray-500">No eligible offers found.</div>)}
                            
                            {!isLoading && !isError && paginatedOffers.map((plan: Plan) => {
                                const isSelected = plan.variantId === selectedPlanVariantId;
                                return (
                                    <div
                                        key={plan.variantId}
                                        className={cn("flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer", isSelected ? "bg-teal-100 border-teal-400" : "border-gray-100")}
                                        onClick={() => {
                                            setSelectedPlanVariantId(plan.variantId);
                                            form.setValue("newPlanVariantId", plan.variantId);
                                            form.trigger("newPlanVariantId");
                                        }}
                                    >
                                        <div><p className="text-sm font-medium">{plan.planName}</p><p className="text-xs text-gray-500">{plan.currency} {parseFloat(plan.amount).toLocaleString()}</p></div>
                                        <Button type="button" size="xs" variant={isSelected ? "default" : "outline"} className={cn("pointer-events-none", isSelected && "bg-orange-500 text-white")}>
                                            {isSelected ? <CheckCircle className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                            {isSelected ? "Selected" : "Select"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Button type="button" size="xs" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                                <span>Page {page} / {totalPages}</span>
                                <Button type="button" size="xs" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                            </div>
                            <div className="text-gray-600">Showing {paginatedOffers.length} of {filteredOffers.length} offers</div>
                        </div>
                    </div>

                    <div>
                        <Card className="border-teal-100 shadow-sm sticky top-4">
                            <CardHeader className="p-3"><CardTitle className="text-base text-teal-700">Selected Offer</CardTitle></CardHeader>
                            <CardContent className="p-3 pt-0">{selectedOfferObject ? (<div><p className="font-semibold text-gray-800">{selectedOfferObject.planName}</p><p className="text-xl font-bold text-green-600 mt-1">{selectedOfferObject.currency} {parseFloat(selectedOfferObject.amount).toLocaleString()}</p></div>) : (<p className="text-sm text-gray-500 text-center py-4">Please select an offer.</p>)}</CardContent>
                        </Card>
                        <FormField name="newPlanVariantId" render={({ fieldState }) => <FormMessage className="mt-2 text-xs" />} />

                        <div className="mt-4 space-y-4">
                            <FormField control={form.control} name="changeType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Change Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="immediate">Immediate</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            {changeType === 'scheduled' && (
                                <div>
                                    <Label>Scheduled Date & Time</Label>
                                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                                        <Popover><PopoverTrigger asChild><Button size="xs" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !scheduledDatePart && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{scheduledDatePart ? format(scheduledDatePart, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={scheduledDatePart} onSelect={setScheduledDatePart} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover>
                                        <Input type="time" value={scheduledTimePart} onChange={(e) => setScheduledTimePart(e.target.value)} className="w-full sm:w-auto"/>
                                    </div>
                                    <FormField name="scheduledDate" render={({ fieldState }) => <FormMessage className="mt-2 text-xs" />} />
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex items-center gap-2 justify-end border-t pt-4">
                            <Button type="button" size="xs" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" size="xs" disabled={!selectedPlanVariantId || offerChangeMutation.isPending} className="bg-teal-600 hover:bg-teal-700 text-white">{offerChangeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}{offerChangeMutation.isPending ? "Applying..." : "Apply Offer"}</Button>
                        </div>
                    </div>
                </div>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
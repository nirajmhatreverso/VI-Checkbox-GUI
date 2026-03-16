// src/pages/subscriber-view/OperationDialogs.tsx (Updated)

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import HardwareReplacementPopup from "./HardwareReplacementPopup";
import AddOnPackagePopup from "./AddOnPackagePopup";
import OfferChangePopup from "./OfferChangePopup";
import {
    ShoppingCart, RefreshCw, ArrowUpDown, Gift, Pause, Settings, Edit, Clock, WifiOff, Wifi,
    Loader2, X, CreditCard, Calendar as CalendarIcon, CheckCircle, AlertTriangle, User, Search,
    XCircle, Send, Plus, Home, Link
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "../ui/checkbox";

// ... (Zod schemas remain unchanged) ...
const purchaseSchema = z.object({
    agentSapBpId: z.string().optional(),
    autoRenewal: z.boolean(),
    planId: z.string().min(1, "Please select a plan to purchase."),
    variantId: z.string(),
    bundleId: z.string(),
    amount: z.string(),
    currency: z.string(),
    bundleName: z.string(),
    planName: z.string(),
});
const renewalSchema = z.object({
    renewalCount: z.number().min(1, "Renewal count is required").max(12, "Maximum 12 months"),
});
const planChangeSchema = z.object({
    newPlanId: z.string().min(1, "Please select a new plan"),
    changeType: z.enum(["immediate", "scheduled"]),
    scheduledDate: z.date().optional(),
}).refine(data => !(data.changeType === 'scheduled' && !data.scheduledDate), {
    message: "A scheduled date is required for a scheduled change.", path: ["scheduledDate"],
});
const extendValiditySchema = z.object({
    extensionEndDate: z.string().min(1, "Extension end date is required"),
    reason: z.string().min(1, "Extension reason is required"),
    justification: z.string().min(10, "Please provide detailed justification"),
});
const terminationSchema = z.object({
    reasonId: z.string().min(1, "Termination reason is required."),
});
const noOfRoomsSchema = z.object({
    noOfRooms: z.string().min(1, "Number of rooms is required.").refine(val => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num > 0 && num <= 75;
    }, { message: "Please enter a number between 1 and 75." }),
    changeType: z.enum(["immediate", "scheduled"]),
    scheduledDate: z.date().optional(),
}).refine(data => !(data.changeType === 'scheduled' && !data.scheduledDate), {
    message: "A scheduled date is required.", path: ["scheduledDate"],
});
const suspensionSchema = z.object({
    subReason: z.string().min(1, "Suspension sub-reason is required."),
    date: z.string().min(1, "Date is required."),
    followUpDate: z.string().optional(),
    details: z.string().optional(),
});
const reconnectionSchema = z.object({
    subReason: z.string().min(1, "Reconnection sub-reason is required."),
    date: z.string().min(1, "Date is required."),
    followUpDate: z.string().optional(),
    details: z.string().optional(),
});

type PlanDetail = { planId: string; variantId: string; bundleId: string; bundleName: string; amount: string; currency: string; planName: string; salesOrg: string; division: string; connectionType: string; PKG_TR_ID?: string; mimeType?: string; };
type PurchaseData = z.infer<typeof purchaseSchema>;
type RenewalData = z.infer<typeof renewalSchema>;
type PlanChangeData = z.infer<typeof planChangeSchema>;
type ExtendValidityData = z.infer<typeof extendValiditySchema>;
type TerminationData = z.infer<typeof terminationSchema>;
type NoOfRoomsData = z.infer<typeof noOfRoomsSchema>;
type SuspensionData = z.infer<typeof suspensionSchema>;
type ReconnectionData = z.infer<typeof reconnectionSchema>;

interface OperationDialogsProps {
    activePopup: string;
    onClose: () => void;
    customerData: any;
    onOperationSuccess: (message: string, operationType?: string, requestId?: string) => void;
    fullSubscriptionDetails?: any[];
    dropdownOptions?: any;
}
const postpaidReconnectionSchema = z.object({
    balanceCheck: z.boolean().default(false),
});
type PostpaidReconnectionData = z.infer<typeof postpaidReconnectionSchema>;

export default function OperationDialogs({ activePopup, onClose, customerData, onOperationSuccess, fullSubscriptionDetails, dropdownOptions }: OperationDialogsProps) {
    const { toast } = useToast();
    const [planSearchTerm, setPlanSearchTerm] = useState("");
    const [currencyFilter, setCurrencyFilter] = useState("ALL");
    const [plansPage, setPlansPage] = useState(1);
    const plansPageSizeOptions = [5, 10, 20];
    const [plansPageSize, setPlansPageSize] = useState(5);
    const [serviceActionTab, setServiceActionTab] = useState("disconnect");
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>("");
    const [planChangeDatePart, setPlanChangeDatePart] = useState<Date | undefined>();
    const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<PlanDetail | null>(null);
    const [planChangeTimePart, setPlanChangeTimePart] = useState<string>("00:00");
    const activeSubscription = customerData?.currentSubscription;
    const isPurchaseActive = activePopup === 'purchase' && !!customerData;
    const postpaidReconnectionForm = useForm<PostpaidReconnectionData>({
        resolver: zodResolver(postpaidReconnectionSchema),
        defaultValues: { balanceCheck: false }
    });

    const postpaidReconnectMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/postpaid-reconnect', 'POST', payload),
        onSuccess: (data) => {
            const msg = data?.data?.message || data?.statusMessage || "Reconnect Successfully Completed";
            const requestId = data?.data?.requestId;
            onOperationSuccess(msg, "RECONNECTION", requestId); // ✅ Use onOperationSuccess directly
        },
        onError: (error: any) => {
            toast({ title: "Reconnection Failed", description: error?.statusMessage || error.message, variant: "destructive" });
        }
    });

    const processPostpaidReconnection = (data: PostpaidReconnectionData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO'); // ✅ Use fullSubscriptionDetails directly
        const nagraId = primarySub?.TECHNICAL_RES_ID || customerData.macId; // ✅ Use customerData directly

        postpaidReconnectMutation.mutate({
            sapBpId: customerData.sapBpId,
            sapCaId: customerData.sapCaId,
            sapContractId: customerData.contractNo,
            salesOrg: customerData.salesOrg,
            division: customerData.divisionType || "",
            note: data.balanceCheck ? "Y" : "N",
            productId: nagraId,
            smartCardNo: customerData.macId,
            connectionType: "Postpaid"
        });
    };
    // Helper to get active addon details
    const getActiveAddonDetails = () => {
        const activeAddon = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A');
        return {
            variantIdAddOn: activeAddon?.PLAN_VAR_CODE || "",
            planIdAddOn: activeAddon?.PLAN_CODE || ""
        };
    };


    const { data: planDetailsResponse, isLoading: arePlansLoading, isError: isPlansError, error: plansError } = useQuery({
        queryKey: ['planDetails', customerData.salesOrg, customerData.divisionType, customerData.accountClass],
        queryFn: () => apiRequest('/subscriptions/plan-details', 'POST', {
            category: customerData.accountClass || "Residential",
            salesOrg: customerData.salesOrg || "Azam Media Ltd",
            division: customerData.divisionType
        }),
        enabled: (isPurchaseActive || activePopup === 'planChange') && !!customerData.divisionType && !!customerData.accountClass,
        staleTime: 1000 * 60 * 5,
    });

    const allAvailablePlans = useMemo(() => {
        if (planDetailsResponse?.status !== "SUCCESS") return [];
        const plans: PlanDetail[] = planDetailsResponse?.data?.planDetails || [];
        const uniquePlansMap = new Map<string, PlanDetail>();
        plans.forEach((plan: PlanDetail) => {
            if (plan.mimeType === "Z5") return;
            const compositeKey = `${plan.variantId}-${plan.planId}-${plan.amount}-${plan.currency}`;
            if (!uniquePlansMap.has(compositeKey)) {
                uniquePlansMap.set(compositeKey, plan);
            }
        });
        return Array.from(uniquePlansMap.values());
    }, [planDetailsResponse]);

    const uniqueCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        allAvailablePlans.forEach(p => {
            if (p.currency) currencies.add(p.currency);
        });
        return ["ALL", ...Array.from(currencies)];
    }, [allAvailablePlans]);

    const filteredPlans = useMemo(() => {
        return allAvailablePlans.filter(p => {
            const matchesSearch = !planSearchTerm || p.planName.toLowerCase().includes(planSearchTerm.toLowerCase());
            const matchesCurrency = currencyFilter === "ALL" || p.currency === currencyFilter;
            return matchesSearch && matchesCurrency;
        });
    }, [allAvailablePlans, planSearchTerm, currencyFilter]);
    const plansTotalPages = Math.max(1, Math.ceil(filteredPlans.length / plansPageSize));
    const paginatedPlans = useMemo(() => filteredPlans.slice((plansPage - 1) * plansPageSize, plansPage * plansPageSize), [filteredPlans, plansPage, plansPageSize]);
    useEffect(() => { if (plansPage > plansTotalPages) setPlansPage(1); }, [filteredPlans.length, plansPageSize, plansTotalPages, plansPage]);

    const purchaseMutation = useMutation<any, Error, any>({ mutationFn: (payload) => apiRequest('/subscriptions/purchase', 'POST', payload), onSuccess: (data) => onOperationSuccess(data?.data?.message || data?.statusMessage || "Subscription purchased.", "PURCHASE"), onError: (error: any) => toast({ title: "Purchase Failed", description: error?.statusMessage || error.message, variant: "destructive" }) });

    const renewalMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/renew', 'POST', payload),
        onSuccess: async (data) => {
            toast({ title: "Processing Renewal", description: "Please wait while we update your subscription...", duration: 3000 });
            let attempts = 0;
            const maxAttempts = 10;
            let dataRefreshed = false;
            while (attempts < maxAttempts && !dataRefreshed) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const refreshedData = await apiRequest('/subscriptions/details', 'POST', {
                        sapBpId: customerData.sapBpId,
                        sapCaId: customerData.sapCaId,
                        contractNo: customerData.contractNo,
                        salesOrg: customerData.salesOrg
                    });
                    if (refreshedData?.status === "SUCCESS" && refreshedData.data?.subscriptionDetails) {
                        queryClient.setQueryData(['subscriptionDetails', customerData.sapBpId, customerData.sapCaId, customerData.contractNo], refreshedData);
                        queryClient.invalidateQueries({ queryKey: ['customerBalance', customerData.sapBpId, customerData.sapCaId] });
                        dataRefreshed = true;
                        onOperationSuccess(data?.data?.message || data?.statusMessage || "Subscription renewed successfully.", "RENEWAL", data?.data?.requestId);
                        break;
                    }
                } catch (error) { }
                attempts++;
            }
            if (!dataRefreshed) {
                toast({ title: "Renewal Completed", description: "The renewal was successful, but data refresh is delayed. Please refresh the page if you don't see updates shortly.", variant: "default", duration: 5000 });
                onOperationSuccess(data?.data?.message || "Renewal completed.", "RENEWAL", data?.data?.requestId);
            }
        },
        onError: (error: any) => toast({ title: "Renewal Failed", description: (error as any)?.statusMessage || error.message, variant: "destructive" })
    });

    const lockUnlockMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/lock-unlock', 'POST', payload),
        onSuccess: (data) => {
            const successMessage = data?.data?.message || data?.statusMessage || "Action processed successfully.";
            const type = activePopup === 'suspension' ? "SUSPENSION" : "RECONNECTION";
            const requestId = data?.data?.requestId;
            onOperationSuccess(successMessage, type, requestId);
        },
        onError: (error: any) => { toast({ title: "Action Failed", description: error?.statusMessage || error.message, variant: "destructive" }); }
    });

    const terminateMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/terminate', 'POST', payload),
        onSuccess: (data) => { onOperationSuccess(data?.data?.message || data?.statusMessage || "Subscription terminated.", "TERMINATION", data?.data?.requestId); },
        onError: (error: any) => toast({ title: "Termination Failed", description: error?.statusMessage || error.message, variant: "destructive" })
    });

    const retrackMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/retrack', 'POST', payload),
        onSuccess: (data) => {
            localStorage.setItem(`lastRetrackTimestamp_${customerData.sapBpId}`, new Date().toISOString());
            onOperationSuccess(data?.data?.message || data?.statusMessage || "Retrack command sent successfully.", "RETRACK", data?.data?.requestId);
        },
        onError: (error: any) => toast({ title: "Retrack Failed", description: error?.statusMessage || error.message, variant: "destructive" })
    });

    const extendValidityMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/extend-validity', 'POST', payload),
        onSuccess: (data) => { onOperationSuccess(data?.data?.message || data?.statusMessage || "Subscription extended.", "EXTENSION", data?.data?.requestId); },
        onError: (error: any) => toast({ title: "Extension Failed", description: error?.statusMessage || error.message, variant: "destructive" })
    });

    const planChangeMutation = useMutation<any, Error, any>({
        mutationFn: (payload) => apiRequest('/subscriptions/plan-change', 'POST', payload),
        onSuccess: (data) => {
            onOperationSuccess(data?.data?.message || data?.statusMessage || "Plan change processed.", "PLAN_CHANGE", data?.data?.requestId);
            handlePlanChangeCancel();
        },
        onError: (error: any) => toast({ title: "Plan Change Failed", description: error?.statusMessage || error.message, variant: "destructive" })
    });

    const noOfRoomsMutation = useMutation<any, Error, any>({ mutationFn: (payload) => apiRequest('/subscriptions/update-rooms', 'POST', payload), onSuccess: (data) => onOperationSuccess(data?.data?.message || data?.statusMessage || "Number of rooms updated.", "NO_OF_ROOMS_UPDATE"), onError: (error: any) => toast({ title: "Update Failed", description: error?.statusMessage || error.message, variant: "destructive" }) });

    const purchaseForm = useForm<PurchaseData>({ resolver: zodResolver(purchaseSchema), defaultValues: { agentSapBpId: "", autoRenewal: false, planId: "", variantId: "", bundleId: "", bundleName: "", amount: "", currency: "", planName: "" } });
    const renewalForm = useForm<RenewalData>({ resolver: zodResolver(renewalSchema), defaultValues: { renewalCount: 1 } });
    const planChangeForm = useForm<PlanChangeData>({ resolver: zodResolver(planChangeSchema), defaultValues: { newPlanId: "", changeType: "immediate", scheduledDate: undefined } });
    const extendValidityForm = useForm<ExtendValidityData>({ resolver: zodResolver(extendValiditySchema), defaultValues: { extensionEndDate: "", reason: "", justification: "" } });
    const terminationForm = useForm<TerminationData>({ resolver: zodResolver(terminationSchema), defaultValues: { reasonId: "" } });
    const suspensionForm = useForm<SuspensionData>({ resolver: zodResolver(suspensionSchema), defaultValues: { subReason: "", date: format(new Date(), "yyyy-MM-dd"), followUpDate: "", details: "" } });
    const reconnectionForm = useForm<ReconnectionData>({ resolver: zodResolver(reconnectionSchema), defaultValues: { subReason: "", date: format(new Date(), "yyyy-MM-dd"), followUpDate: "", details: "" } });
    const noOfRoomsForm = useForm<NoOfRoomsData>({ resolver: zodResolver(noOfRoomsSchema), defaultValues: { noOfRooms: "1", changeType: "immediate", scheduledDate: undefined } });

    const selectedPlanVariantId = purchaseForm.watch('variantId');
    const selectedPlanAmount = purchaseForm.watch('amount');
    const selectedPlanCurrency = purchaseForm.watch('currency');
    const planChangeType = planChangeForm.watch("changeType");
    const noOfRoomsChangeType = noOfRoomsForm.watch("changeType");

    useEffect(() => {
        if (planChangeType === 'scheduled' && planChangeDatePart) {
            const combinedDate = new Date(planChangeDatePart);
            combinedDate.setHours(0, 0, 0, 0);
            planChangeForm.setValue('scheduledDate', combinedDate);
            planChangeForm.trigger('scheduledDate');
        } else {
            planChangeForm.setValue('scheduledDate', undefined);
        }
    }, [planChangeDatePart, planChangeType, planChangeForm]);

    // Auto-select single value dropdowns
    useEffect(() => {
        if (activePopup === 'suspension') {
            const reasons = dropdownOptions?.lockReason || [];
            if (reasons.length === 1) {
                const val = reasons[0].value;
                if (suspensionForm.getValues('subReason') !== val) {
                    suspensionForm.setValue('subReason', val);
                }
            }
        }
    }, [activePopup, dropdownOptions?.lockReason, suspensionForm]);

    useEffect(() => {
        if (activePopup === 'reconnection') {
            const reasons = dropdownOptions?.unLockReason || [];
            if (reasons.length === 1) {
                const val = reasons[0].value;
                if (reconnectionForm.getValues('subReason') !== val) {
                    reconnectionForm.setValue('subReason', val);
                }
            }
        }
    }, [activePopup, dropdownOptions?.unLockReason, reconnectionForm]);

    useEffect(() => {
        if (activePopup === 'disconnect' && serviceActionTab === 'terminate') {
            const reasons = dropdownOptions?.terminationReason || [];
            if (reasons.length === 1) {
                const val = reasons[0].value;
                if (terminationForm.getValues('reasonId') !== val) {
                    terminationForm.setValue('reasonId', val);
                }
            }
        }
    }, [activePopup, serviceActionTab, dropdownOptions?.terminationReason, terminationForm]);

    const changePlansSource = useMemo(() => {
        const currentPlanCode = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO')?.PLAN_CODE || customerData?.currentSubscription?.pkgCode;
        const currentConnectionType = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO')?.ZCONNECTIONTYPE;

        return allAvailablePlans
            .filter(p => p.planId !== currentPlanCode && p.connectionType?.trim().toLowerCase() === currentConnectionType?.trim().toLowerCase())
            .map(p => ({
                id: `${p.variantId}-${p.amount}-${p.currency}`,
                name: p.planName,
                amount: parseFloat(p.amount || '0'),
                currency: p.currency || '',
                connectionType: p.connectionType,
                raw: p
            }));
    }, [allAvailablePlans, fullSubscriptionDetails, customerData?.currentSubscription?.pkgCode]);

    const selectedPlanObject = useMemo(() => changePlansSource.find(p => p.id === selectedPlan), [selectedPlan, changePlansSource]);

    const currentConnectionType = useMemo(() => {
        return fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO')?.ZCONNECTIONTYPE;
    }, [fullSubscriptionDetails]);

    const processSubscriptionPurchase = (data: PurchaseData) => {
        if (!selectedPlanForPurchase) { toast({ title: "Error", description: "No plan selected.", variant: "destructive" }); return; }

        const availableBalance = parseFloat(customerData?.subsBalance || '0');
        const cost = parseFloat(selectedPlanForPurchase.amount || '0');
        const currency = selectedPlanForPurchase.currency || '';
        const isPostpaidPurchase = selectedPlanForPurchase.connectionType?.trim().toUpperCase() === 'POSTPAID';
        const accountClass = (customerData?.accountClass || '').toUpperCase();
        const isVipOrDemo = accountClass === 'VIP' || accountClass === 'DEMO';
        const isPostpaidVipOrDemo = isPostpaidPurchase && isVipOrDemo;
        // ✅ NEW: Allow postpaid VIP/DEMO customers to skip balance check
        if (!isPostpaidPurchase && !isPostpaidVipOrDemo && availableBalance < cost) {
            toast({
                title: "Insufficient Balance",
                description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than plan cost (${cost.toLocaleString()} ${currency}).`,
                variant: "destructive"
            });
            return;
        }

        purchaseMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, smartCardNo: customerData.macId, stbNo: customerData.hardware.stbSerialNumber,
            salesOrg: selectedPlanForPurchase.salesOrg, division: selectedPlanForPurchase.division, connectionType: selectedPlanForPurchase.connectionType?.trim(),
            disChannel: "10", agentSapBpId: data.agentSapBpId,
            planDetails: [{ ...selectedPlanForPurchase, connectionType: selectedPlanForPurchase.connectionType?.trim(), bundleTrId: selectedPlanForPurchase.PKG_TR_ID || "" }]
        });
    };

    const processRenewal = (data: RenewalData) => {
        // 1. Find Primary Subscription (Base Plan)
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!primarySub) {
            toast({ title: "Error", description: "No primary subscription found to renew.", variant: "destructive" });
            return;
        }

        // 2. Find Active Add-on (ZADO)
        const activeAddon = fullSubscriptionDetails?.find((sub: any) =>
            sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A'
        );

        // 3. Calculate Base Plan Cost
        const basePlanPrice = parseFloat(primarySub.CHARGE_AMT || '0');

        // 4. Calculate Add-on Cost (if exists)
        const addonPrice = activeAddon ? parseFloat(activeAddon.CHARGE_AMT || '0') : 0;

        // 5. Total Monthly Cost
        const totalMonthlyCost = basePlanPrice + addonPrice;

        // 6. Final Renewal Cost
        const totalRenewalCost = totalMonthlyCost * data.renewalCount;

        // 7. Balance Check
        const availableBalance = parseFloat(customerData?.subsBalance || '0');
        const currency = primarySub.CURRENCY || "";
        const isPostpaidRenewal = primarySub.ZCONNECTIONTYPE?.trim().toUpperCase() === 'POSTPAID';

        if (!isPostpaidRenewal && availableBalance < totalRenewalCost) {
            toast({
                title: "Insufficient Balance",
                description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than renewal cost (${totalRenewalCost.toLocaleString()} ${currency}).`,
                variant: "destructive"
            });
            return;
        }

        // 8. Construct Payload
        const payload: any = {
            sapBpId: customerData.sapBpId,
            sapCaId: customerData.sapCaId,
            sapContractId: customerData.contractNo,
            smartCardNo: customerData.macId,
            salesOrg: primarySub.SALES_ORG,
            division: primarySub.DIVISION,
            productId: primarySub.ZPROVCODE,
            currency: primarySub.CURRENCY || "",
            amount: String(totalRenewalCost),
            noOfDuration: String(data.renewalCount),
            connectionType: primarySub.ZCONNECTIONTYPE,
        };

        // ✅ ADDED: Add-on Parameters
        if (activeAddon) {
            payload.addOnAmount = activeAddon.CHARGE_AMT;
            payload.addOnNoOfDuration = activeAddon.OFFER_DURATION; // Same duration as base plan
            payload.addOnSmartCardNo = activeAddon.TECHNICAL_RES_ID; // Use add-on's specific ID
            payload.addOnProductId = activeAddon.PLAN_CODE; // Use Plan Code or ZPROVCODE if available
        }

        renewalMutation.mutate(payload);
    };

    const processExtendValidity = (data: ExtendValidityData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!primarySub) { toast({ title: "Error", description: "No primary subscription found.", variant: "destructive" }); return; }
        extendValidityMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, sapContractId: customerData.contractNo,
            productId: primarySub.ZPROVCODE, salesOrg: primarySub.SALES_ORG, division: primarySub.DIVISION,
            connectionType: primarySub.ZCONNECTIONTYPE, stbNo: customerData.hardware?.stbSerialNumber || "",
            smartCardNo: customerData.macId || "", endDate: data.extensionEndDate, reason: data.reason, justification: data.justification
        });
    };

    const processSuspension = (data: SuspensionData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!customerData.contractNo || !primarySub) { toast({ title: "Error", description: "Contract or primary subscription details are missing.", variant: "destructive" }); return; }
        lockUnlockMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, sapContractId: customerData.contractNo, smartCardNo: customerData.macId,
            actionType: "LOCK", reason: data.subReason, remark: data.details || "", startDate: data.date, followUpDate: data.followUpDate,
            salesOrg: primarySub.SALES_ORG, division: primarySub.DIVISION, connectionType: primarySub.ZCONNECTIONTYPE,
        });
    };

    const processReconnection = (data: ReconnectionData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!customerData.contractNo || !primarySub) { toast({ title: "Error", description: "Contract or primary subscription details are missing.", variant: "destructive" }); return; }
        lockUnlockMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, sapContractId: customerData.contractNo, smartCardNo: customerData.macId,
            actionType: "UNLOCK", reason: data.subReason, remark: data.details || "", startDate: data.date, followUpDate: data.followUpDate,
            salesOrg: primarySub.SALES_ORG, division: primarySub.DIVISION, connectionType: primarySub.ZCONNECTIONTYPE,
        });
    };

    const processTermination = (data: TerminationData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        const reasonObject = (dropdownOptions?.terminationReason || []).find((r: any) => r.value === data.reasonId);

        if (!primarySub || !reasonObject) {
            toast({ title: "Error", description: "Subscription or reason details are missing.", variant: "destructive" });
            return;
        }

        // ✅ Find Active Add-on
        const activeAddon = fullSubscriptionDetails?.find((sub: any) =>
            sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A'
        );

        const payload: any = {
            sapBpId: customerData.sapBpId,
            sapCaId: customerData.sapCaId,
            sapContractId: customerData.contractNo,
            termCancelReason: reasonObject.name,
            endDate: format(new Date(), "yyyy-MM-dd"),
            salesOrg: primarySub.SALES_ORG,
            division: primarySub.DIVISION,
            connectionType: primarySub.ZCONNECTIONTYPE,
        };

        // ✅ ADDED: Add-on Parameters for Termination
        if (activeAddon) {
            // Termination usually implies ending now, so duration might be 0 or remaining, 
            // but based on your request, we send these params.
            // Assuming duration logic similar to renewal if required, or just identifying the addon.

            payload.addOnAmount = activeAddon.CHARGE_AMT;
            payload.addOnNoOfDuration = activeAddon.OFFER_DURATION; // Default or calculated if needed
            payload.addOnSmartCardNo = activeAddon.TECHNICAL_RES_ID;
            payload.addOnProductId = activeAddon.PLAN_CODE;
        }

        terminateMutation.mutate(payload);
    };

    const processRetrack = () => {
        const basePlans = (fullSubscriptionDetails || []).filter(sub => sub.ITEM_CATEGORY === 'ZBPO');
        if (basePlans.length === 0) { toast({ title: "Error", description: "No subscription details found to retrack.", variant: "destructive" }); return; }
        const targetPlan = basePlans[0];
        const productList = basePlans.map(p => p.ZPROVCODE).filter(Boolean).join(',');
        if (!productList) { toast({ title: "Error", description: "Could not find valid product codes for retrack.", variant: "destructive" }); return; }

        retrackMutation.mutate({
            smartCardNo: customerData.macId, stbNo: customerData.hardware?.stbSerialNumber || "",
            startDate: targetPlan.PLAN_START_DT ?? "", endDate: targetPlan.PLAN_END_DT ?? "",
            startTime: targetPlan.PLAN_START_TS ?? "", endTime: targetPlan.PLAN_END_TS ?? "",
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, product_List: productList,
            division: targetPlan.DIVISION, salesOrg: targetPlan.SALES_ORG,
        });
    };

    const processPlanChange = (data: PlanChangeData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!selectedPlanObject || !primarySub) { toast({ title: "Error", description: "Plan or subscription data is incomplete.", variant: "destructive" }); return; }

        const availableBalance = parseFloat(customerData?.subsBalance || '0');
        const cost = selectedPlanObject.amount;
        const currency = selectedPlanObject.currency;
        const isPostpaidChange = selectedPlanObject.connectionType?.trim().toUpperCase() === 'POSTPAID';

        if (!isPostpaidChange && data.changeType !== 'scheduled' && availableBalance < cost) {
            toast({
                title: "Insufficient Balance",
                description: `Available balance (${availableBalance.toLocaleString()} ${currency}) is less than plan cost (${cost.toLocaleString()} ${currency}).`,
                variant: "destructive"
            });
            return;
        }

        const { variantIdAddOn, planIdAddOn } = getActiveAddonDetails();
        const newPlanDetailsObject = { ...selectedPlanObject.raw, bundleTrId: primarySub.PKG_TR_ID, variantIdAddOn: variantIdAddOn, planIdAddOn: planIdAddOn };

        // ✅ Add addon details to payload


        planChangeMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, contractId: customerData.contractNo,
            smartCardNo: customerData.macId, stbNo: customerData.hardware?.stbSerialNumber || "",
            salesOrg: primarySub.SALES_ORG, division: primarySub.DIVISION, connectionType: primarySub.ZCONNECTIONTYPE,
            affectiveType: data.changeType === 'scheduled' ? 'Schedule' : 'Immediate',
            scheduleDate: data.changeType === 'scheduled' && data.scheduledDate ? format(data.scheduledDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            disChannel: "", agentSapBpId: "",

            // ✅ New Fields
            // variantIdAddOn, 
            // planIdAddOn,

            planDetails: [newPlanDetailsObject]
        });
    };

    const processNoOfRoomsUpdate = (data: NoOfRoomsData) => {
        const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
        if (!primarySub) { toast({ title: "Error", description: "Primary subscription details not found.", variant: "destructive" }); return; }
        noOfRoomsMutation.mutate({
            sapBpId: customerData.sapBpId, sapCaId: customerData.sapCaId, sapContractId: customerData.contractNo, scNumber: customerData.macId,
            salesOrg: primarySub.SALES_ORG, division: primarySub.DIVISION, currency: primarySub.CURRENCY || "",
            connectionType: primarySub.ZCONNECTIONTYPE, bundleId: primarySub.PKG_CODE, plaId: primarySub.PLAN_ID, bundleTrId: primarySub.PKG_TR_ID,
            startMode: data.changeType === 'scheduled' ? 'S' : 'I',
            startDate: data.changeType === 'scheduled' && data.scheduledDate ? format(data.scheduledDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            amount: primarySub.CHARGE_AMT || "0", noOfRooms: data.noOfRooms, planVariantId: "",
        });
    };

    const handlePlanChangeCancel = () => { planChangeForm.reset(); setSelectedPlan(""); setPlanSearchTerm(""); setPlansPage(1); setPlanChangeDatePart(undefined); onClose(); };

    useEffect(() => { if (activePopup !== 'planChange') { setSelectedPlan(""); } }, [activePopup]);

    if (!activePopup) return null;

    const renderContent = () => {
        switch (activePopup) {
            // ... (purchase and renewal cases remain unchanged) ...
            case 'purchase':
                return (
                    <Form {...purchaseForm}>
                        <form onSubmit={purchaseForm.handleSubmit(processSubscriptionPurchase)} className="space-y-4">
                            <div className="mb-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3 shadow-sm">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="flex items-center text-sm font-semibold text-blue-800"><User className="mr-2 h-4 w-4 text-blue-600" />Customer Details</h4>
                                    <FormField control={purchaseForm.control} name="autoRenewal" render={({ field }) => (<FormItem className="flex items-center space-x-2 text-sm"><FormLabel className="text-gray-700 font-medium text-sm">Auto Renewal</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-90" /></FormControl></FormItem>)} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                    <div className="rounded-md border border-gray-100 bg-white p-2"><span className="block text-gray-500 text-xs">Customer</span><span className="font-semibold text-gray-800 text-sm">{customerData.firstName} {customerData.lastName}</span></div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2"><span className="block text-gray-500 text-xs">SAP BP ID</span><span className="font-semibold text-gray-800 text-sm">{customerData.sapBpId}</span></div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2"><span className="block text-gray-500 text-xs">Smart Card</span><span className="font-semibold text-gray-800 text-sm">{customerData.macId}</span></div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2"><span className="block text-gray-500 text-xs">SAP CA ID</span><span className="font-semibold text-gray-800 text-sm">{customerData.sapCaId}</span></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <Label className="font-medium text-gray-800 text-sm">Available Plans</Label>
                                    <div className="flex gap-2 items-center my-1">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input placeholder="Search for a plan..." value={planSearchTerm} onChange={(e) => { setPlanSearchTerm(e.target.value); setPlansPage(1); }} className="pl-8 py-1 h-9" />
                                        </div>
                                        <Select value={currencyFilter} onValueChange={(v) => { setCurrencyFilter(v); setPlansPage(1); }}>
                                            <SelectTrigger className="w-[110px] h-9 text-xs">
                                                <SelectValue placeholder="Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueCurrencies.map(c => <SelectItem key={c} value={c}>{c === "ALL" ? "All" : c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="mt-1 border rounded-md p-1 bg-white shadow-sm space-y-1">
                                        {arePlansLoading && <div className="text-center p-2 text-xs text-gray-500">Loading plans...</div>}
                                        {isPlansError && <div className="text-center p-2 text-xs text-red-600">{(plansError as any)?.statusMessage || "Error fetching plans."}</div>}
                                        {!arePlansLoading && !isPlansError && filteredPlans.length === 0 && <div className="text-center p-2 text-xs text-gray-500">{planDetailsResponse?.statusMessage || "No plans found."}</div>}
                                        {!arePlansLoading && !isPlansError && paginatedPlans.map((plan: PlanDetail) => {
                                            const isSelected = plan.variantId === selectedPlanVariantId && plan.amount === selectedPlanAmount && plan.currency === selectedPlanCurrency;
                                            return (
                                                <div key={plan.variantId} className={cn("flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer", isSelected && "bg-blue-100 border-blue-400")}
                                                    onClick={() => {
                                                        purchaseForm.setValue("planId", plan.planId); purchaseForm.setValue("variantId", plan.variantId); purchaseForm.setValue("bundleId", plan.bundleId);
                                                        purchaseForm.setValue("bundleName", plan.bundleName); purchaseForm.setValue("amount", plan.amount); purchaseForm.setValue("currency", plan.currency);
                                                        purchaseForm.setValue("planName", plan.planName); purchaseForm.trigger("planId"); setSelectedPlanForPurchase(plan);
                                                    }}>
                                                    <div><p className="text-sm font-medium">{plan.planName}</p><p className="text-xs text-gray-500">{plan.currency} {parseFloat(plan.amount).toLocaleString()}</p></div>
                                                    <Button type="button" size="xs" variant={isSelected ? "default" : "outline"} className={cn("pointer-events-none", isSelected && "bg-orange-500 text-white")}>
                                                        {isSelected ? <CheckCircle className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}{isSelected ? "Selected" : "Select"}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-xs">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <button type="button" onClick={() => setPlansPage(p => Math.max(1, p - 1))} disabled={plansPage === 1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Prev</button>
                                            <span>Page {plansPage} / {plansTotalPages}</span>
                                            <button type="button" onClick={() => setPlansPage(p => Math.min(plansTotalPages, p + 1))} disabled={plansPage === plansTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Next</button>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600"><span>Show</span><select value={plansPageSize} onChange={(e) => { setPlansPageSize(Number(e.target.value)); setPlansPage(1); }} className="text-xs p-1 border rounded bg-white">{[5, 10, 20].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select><span>of {filteredPlans.length}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <Card className="border-blue-100 shadow-sm sticky top-2">
                                        <CardHeader className="p-2"><CardTitle className="text-sm text-blue-700">Selected Plan</CardTitle></CardHeader>
                                        <CardContent className="p-2 pt-0">{selectedPlanForPurchase ? (<div><p className="font-semibold text-sm text-gray-800">{selectedPlanForPurchase.planName}</p><p className="text-lg font-bold text-green-600 mt-1">{selectedPlanForPurchase.currency} {parseFloat(selectedPlanForPurchase.amount).toLocaleString()}</p></div>) : (<p className="text-xs text-gray-500 text-center py-2">Please select a plan.</p>)}</CardContent>
                                    </Card>
                                    <FormMessage>{purchaseForm.formState.errors.planId?.message}</FormMessage>
                                    <div className="mt-3 flex items-center gap-2 justify-end"><Button type="button" size="xs" variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" />Cancel</Button><Button type="submit" size="xs" disabled={!selectedPlanVariantId || purchaseMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">{purchaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}{purchaseMutation.isPending ? "Processing..." : "Purchase"}</Button></div>
                                </div>
                            </div>
                        </form>
                    </Form>
                );
            case 'renewal':
                return (
                    <Form {...renewalForm}><form onSubmit={renewalForm.handleSubmit(processRenewal)} className="space-y-6">
                        <div className="mb-4 rounded-lg border border-blue-100 p-3"><div className="mb-2"><h4 className="flex items-center text-sm font-semibold text-blue-800"><User className="mr-2 h-4 w-4" />Current Subscription</h4></div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                <div><span className="block text-gray-500 text-xs">Plan</span><span className="font-semibold">{customerData.currentSubscription?.planName || 'N/A'}</span></div>
                                <div><span className="block text-gray-500 text-xs">Smart Card</span><span className="font-semibold">{customerData.macId}</span></div>
                                <div><span className="block text-gray-500 text-xs">Price</span><span className="font-semibold">{customerData.walletCurrency || 'TZS'} {customerData.currentSubscription?.totalAmount?.toLocaleString() || '0'}</span></div>
                                <div><span className="block text-gray-500 text-xs">Expires</span><span className="font-semibold">{customerData.currentSubscription?.endDate || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6"><FormField control={renewalForm.control} name="renewalCount" render={({ field }) => (<FormItem><FormLabel>Renewal Period (Months)</FormLabel><FormControl><Input type="number" min="1" max="12" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={onClose} disabled={renewalMutation.isPending}>Cancel</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={renewalMutation.isPending}>{renewalMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : <><RefreshCw className="h-4 w-4 mr-2" />Renew</>}</Button></div>
                    </form></Form>
                );
            case 'planChange': {
                const filteredChangePlans = changePlansSource.filter(plan => {
                    const matchesSearch = !planSearchTerm || plan.name.toLowerCase().includes(planSearchTerm.toLowerCase());
                    const matchesCurrency = currencyFilter === "ALL" || plan.currency === currencyFilter;
                    return matchesSearch && matchesCurrency;
                });
                const changePlansTotalPages = Math.max(1, Math.ceil(filteredChangePlans.length / plansPageSize));
                const paginatedChangePlans = (() => {
                    const start = (plansPage - 1) * plansPageSize;
                    return filteredChangePlans.slice(start, start + plansPageSize);
                })();

                return (
                    <Form {...planChangeForm}>
                        <form onSubmit={planChangeForm.handleSubmit(processPlanChange)} className="space-y-4">
                            {/* ... (Same UI as before for plan change) ... */}
                            <div className="mb-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3 shadow-sm">
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="flex items-center text-sm font-semibold text-blue-800"><User className="mr-2 h-4 w-4 text-blue-600" />Customer Details</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                    <div className="rounded-md border border-gray-100 bg-white p-2">
                                        <span className="block text-gray-500 text-xs">Customer</span>
                                        <span className="font-semibold text-gray-800 text-sm">{customerData.firstName} {customerData.lastName}</span>
                                    </div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2">
                                        <span className="block text-gray-500 text-xs">SAP BP ID</span>
                                        <span className="font-semibold text-gray-800 text-sm">{customerData.sapBpId}</span>
                                    </div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2">
                                        <span className="block text-gray-500 text-xs">Smart Card</span>
                                        <span className="font-semibold text-gray-800 text-sm">{customerData.macId}</span>
                                    </div>
                                    <div className="rounded-md border border-gray-100 bg-white p-2">
                                        <span className="block text-gray-500 text-xs">Connection Type</span>
                                        <span className="font-semibold text-gray-800 text-sm">{currentConnectionType?.trim() || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="font-medium text-gray-800 text-sm">Available Plans</Label>
                                        <span className="text-xs text-gray-500">({filteredChangePlans.length} compatible plans)</span>
                                    </div>
                                    <div className="flex gap-2 items-center my-1">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search for a plan..."
                                                value={planSearchTerm}
                                                onChange={(e) => { setPlanSearchTerm(e.target.value); setPlansPage(1); }}
                                                className="pl-8 py-1 h-9"
                                            />
                                        </div>
                                        <Select value={currencyFilter} onValueChange={(v) => { setCurrencyFilter(v); setPlansPage(1); }}>
                                            <SelectTrigger className="w-[110px] h-9 text-xs">
                                                <SelectValue placeholder="Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueCurrencies.map(c => <SelectItem key={c} value={c}>{c === "ALL" ? "All" : c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="mt-1 border rounded-md p-1 bg-white shadow-sm space-y-1">
                                        {arePlansLoading && (<div className="text-center p-2 text-xs text-gray-500">Loading plans...</div>)}
                                        {isPlansError && (<div className="text-center p-2 text-xs text-red-600">{(plansError as any)?.statusMessage || "Error fetching plans."}</div>)}
                                        {!arePlansLoading && !isPlansError && filteredChangePlans.length === 0 && (<div className="text-center p-4 text-xs text-gray-500"><AlertTriangle className="h-4 w-4 inline mr-2" />No plans found with matching {currentConnectionType?.trim() || 'connection type'}.</div>)}
                                        {!arePlansLoading && !isPlansError && paginatedChangePlans.map((plan) => {
                                            const isSelected = plan.id === selectedPlan;
                                            return (
                                                <div
                                                    key={plan.id}
                                                    className={cn("flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer transition-all duration-150", isSelected ? "bg-blue-100 border-blue-400" : "border-gray-100")}
                                                    onClick={() => { setSelectedPlan(plan.id); planChangeForm.setValue("newPlanId", plan.id); planChangeForm.trigger("newPlanId"); }}
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">{plan.name}</p>
                                                        <p className="text-xs text-gray-500">{plan.currency} {plan.amount.toLocaleString()} • {plan.connectionType?.trim()}</p>
                                                    </div>
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
                                            <button type="button" onClick={() => setPlansPage(p => Math.max(1, p - 1))} disabled={plansPage === 1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Prev</button>
                                            <span>Page {plansPage} / {changePlansTotalPages}</span>
                                            <button type="button" onClick={() => setPlansPage(p => Math.min(changePlansTotalPages, p + 1))} disabled={plansPage === changePlansTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Next</button>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <span>Rows per page</span>
                                            <select value={plansPageSize} onChange={(e) => { setPlansPageSize(Number(e.target.value)); setPlansPage(1); }} className="text-xs p-1 border rounded bg-white">
                                                {plansPageSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <span className="ml-1">Total: {filteredChangePlans.length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Card className="border-blue-100 shadow-sm sticky top-2">
                                        <CardHeader className="p-2"><CardTitle className="text-sm text-blue-700">Selected Plan</CardTitle></CardHeader>
                                        <CardContent className="p-2 pt-0">
                                            {selectedPlanObject ? (
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">{selectedPlanObject.name}</p>
                                                    <p className="text-lg font-bold text-green-600 mt-1">{selectedPlanObject.currency} {selectedPlanObject.amount.toLocaleString()}</p>
                                                    <p className="text-xs text-gray-600 mt-2">Type: <span className="font-medium">{selectedPlanObject.connectionType?.trim()}</span></p>
                                                </div>
                                            ) : (<p className="text-xs text-gray-500 text-center py-2">Please select a plan from the list.</p>)}
                                        </CardContent>
                                    </Card>

                                    <FormMessage>{planChangeForm.formState.errors.newPlanId?.message}</FormMessage>

                                    <div className="mt-4 space-y-4">
                                        <FormField
                                            control={planChangeForm.control}
                                            name="changeType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Change Type</FormLabel>
                                                    <Select onValueChange={(v) => {
                                                        field.onChange(v);
                                                        if (v === "immediate") {
                                                            planChangeForm.setValue("scheduledDate", undefined);
                                                            setPlanChangeDatePart(undefined);
                                                            setPlanChangeTimePart("00:00");
                                                        }
                                                    }} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger uiSize="sm"><SelectValue placeholder="Select change type" /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="immediate">Immediate</SelectItem>
                                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {planChangeType === 'scheduled' && (
                                            <div>
                                                <Label>Scheduled Date & Time</Label>
                                                <div className="flex flex-col sm:flex-row gap-2 items-center mt-1">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button size="xs" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !planChangeDatePart && "text-muted-foreground")}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {planChangeDatePart ? format(planChangeDatePart, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={planChangeDatePart} onSelect={setPlanChangeDatePart} disabled={(date) => date < new Date()} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Input type="time" value={planChangeTimePart} onChange={(e) => setPlanChangeTimePart(e.target.value)} className="w-full sm:w-auto  text-xs" />
                                                </div>
                                                <FormField name="scheduledDate" render={({ fieldState }) => <FormMessage className="mt-2 text-xs" />} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex items-center gap-2 justify-end border-t pt-4">
                                        <Button type="button" size="xs" variant="outline" onClick={handlePlanChangeCancel}><X className="h-4 w-4 mr-2" />Cancel</Button>
                                        <Button type="submit" size="xs" disabled={!selectedPlan || planChangeMutation.isPending} className="bg-azam-orange hover:bg-azam-orange/90 text-white">
                                            {planChangeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpDown className="h-4 w-4 mr-2" />}
                                            {planChangeMutation.isPending ? "Processing..." : "Execute Plan Change"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </Form>
                );
            }
            case 'suspension':
                return (
                    <Form {...suspensionForm}><form onSubmit={suspensionForm.handleSubmit(processSuspension)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <FormField control={suspensionForm.control} name="subReason" render={({ field }) => (<FormItem><FormLabel>Suspension Sub-Reason</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select sub-reason" /></SelectTrigger></FormControl><SelectContent>{(dropdownOptions?.lockReason || []).map((reason: any) => (<SelectItem key={reason.value} value={reason.value}>{reason.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={suspensionForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={suspensionForm.control} name="followUpDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Follow Up Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={suspensionForm.control} name="details" render={({ field }) => (<FormItem><FormLabel>Additional Details</FormLabel><FormControl><Textarea placeholder="Optional details..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="flex justify-end gap-3 pt-4"><Button type="button" size="xs" variant="outline" onClick={onClose} disabled={lockUnlockMutation.isPending}>Cancel</Button><Button type="submit" size="xs" variant="destructive" disabled={lockUnlockMutation.isPending}>{lockUnlockMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}{lockUnlockMutation.isPending ? "Suspending..." : "Confirm"}</Button></div>
                    </form></Form>
                );
            case 'reconnection':
                return (
                    <Form {...reconnectionForm}><form onSubmit={reconnectionForm.handleSubmit(processReconnection)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <FormField control={reconnectionForm.control} name="subReason" render={({ field }) => (<FormItem><FormLabel>Reconnection Sub-Reason</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select sub-reason" /></SelectTrigger></FormControl><SelectContent>{(dropdownOptions?.unLockReason || []).map((reason: any) => (<SelectItem key={reason.value} value={reason.value}>{reason.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={reconnectionForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={reconnectionForm.control} name="followUpDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Follow Up Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={reconnectionForm.control} name="details" render={({ field }) => (<FormItem><FormLabel>Additional Details</FormLabel><FormControl><Textarea placeholder="Optional details..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="flex justify-end gap-3 pt-4"><Button type="button" size="xs" variant="outline" onClick={onClose} disabled={lockUnlockMutation.isPending}>Cancel</Button><Button type="submit" size="xs" className="bg-green-600 hover:bg-green-700" disabled={lockUnlockMutation.isPending}>{lockUnlockMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}{lockUnlockMutation.isPending ? "Reconnecting..." : "Confirm"}</Button></div>
                    </form></Form>
                );
            case 'editCustomer':
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Edit className="h-5 w-5 text-azam-blue" />Edit Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-sm font-medium">First Name</label><input type="text" defaultValue={customerData.firstName} className="w-full h-7 text-xs px-3 py-2 border rounded-md" /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Last Name</label><input type="text" defaultValue={customerData.lastName} className="w-full h-7 text-xs px-3 py-2 border rounded-md" /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Email</label><input type="email" defaultValue={customerData.email} className="w-full h-7 text-xs px-3 py-2 border rounded-md" /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Phone</label><input type="tel" defaultValue={customerData.mobile} className="w-full h-7 text-xs px-3 py-2 border rounded-md" /></div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" size="xs" onClick={onClose}>Cancel</Button>
                            <Button size="xs" onClick={() => { toast({ title: "Success", description: "Customer information updated." }); onClose(); }} className="bg-azam-blue hover:bg-azam-blue/90"><Edit className="h-4 w-4 mr-2" />Update Customer</Button>
                        </div>
                    </div>
                );
            case 'disconnect':
                return (
                    <div>
                        <div className="mb-6 bg-blue-50 p-4 rounded-lg border">
                            <h4 className="font-medium text-blue-800 mb-3 flex items-center"><User className="h-4 w-4 mr-2" />Customer Status</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-600">Customer: </span><span className="font-medium">{customerData.firstName} {customerData.lastName}</span></div>
                                <div><span className="text-gray-600">Plan: </span><span className="font-medium">{activeSubscription?.planName}</span></div>
                                <div><span className="text-gray-600">Status: </span><Badge className={`${activeSubscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{activeSubscription?.status}</Badge></div>
                                <div><span className="text-gray-600">Expires: </span><span className="font-medium">{activeSubscription?.endDate}</span></div>
                            </div>
                        </div>
                        <div className="mb-6"><div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setServiceActionTab("disconnect")} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${serviceActionTab === "disconnect" ? "bg-white text-orange-700 shadow-sm" : "text-gray-600"}`}><WifiOff className="h-4 w-4 inline mr-2" />Disconnect</button>
                            <button onClick={() => setServiceActionTab("reconnect")} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${serviceActionTab === "reconnect" ? "bg-white text-green-700 shadow-sm" : "text-gray-600"}`}><Wifi className="h-4 w-4 inline mr-2" />Reconnect</button>
                            <button onClick={() => setServiceActionTab("terminate")} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${serviceActionTab === "terminate" ? "bg-white text-red-700 shadow-sm" : "text-gray-600"}`}><XCircle className="h-4 w-4 inline mr-2" />Terminate</button>
                        </div></div>
                        {serviceActionTab === 'reconnect' && (
                            <Form {...reconnectionForm}>
                                <form onSubmit={reconnectionForm.handleSubmit(processReconnection)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <FormField control={reconnectionForm.control} name="subReason" render={({ field }) => {
                                            const subOptions = [
                                                { v: "payment_received", t: "Payment Received" },
                                                { v: "issue_resolved", t: "Customer Issue Resolved" },
                                                { v: "goodwill_gesture", t: "Goodwill Gesture" },
                                                { v: "other", t: "Other" },
                                            ];
                                            return (
                                                <FormItem>
                                                    <FormLabel>Reconnection Sub-Reason</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select sub-reason" /></SelectTrigger></FormControl>
                                                        <SelectContent>{subOptions.map(s => <SelectItem key={s.v} value={s.v}>{s.t}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }} />
                                        <FormField control={reconnectionForm.control} name="date" render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={reconnectionForm.control} name="followUpDate" render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel>Follow Up Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={reconnectionForm.control} name="details" render={({ field }) => (<FormItem><FormLabel>Additional Details</FormLabel><FormControl><Textarea placeholder="Optional details or notes..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="flex justify-end gap-3 pt-4"><Button type="button" size="xs" variant="outline" onClick={onClose} disabled={lockUnlockMutation.isPending}>Cancel</Button><Button type="submit" size="xs" className="bg-green-600 hover:bg-green-700 text-white" disabled={lockUnlockMutation.isPending}>{lockUnlockMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}{lockUnlockMutation.isPending ? "Reconnecting..." : "Confirm Reconnection"}</Button></div>
                                </form>
                            </Form>
                        )}
                        {serviceActionTab === 'terminate' && (
                            <Form {...terminationForm}><form onSubmit={terminationForm.handleSubmit(processTermination)} className="space-y-6">
                                <FormField control={terminationForm.control} name="reasonId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Termination Reason *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="h-8"><SelectValue placeholder="Select a reason for termination" /></SelectTrigger></FormControl>
                                            {(dropdownOptions?.terminationReason || []).map((reason: any) => (
                                                <SelectItem key={reason.value} value={reason.value}>{reason.name}</SelectItem>
                                            ))}
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-200"><AlertTriangle className="inline h-4 w-4 mr-2" />Termination is permanent and cannot be undone. The end date will be set to today.</p>
                                <div className="flex gap-3">
                                    <Button type="submit" size="xs" disabled={terminateMutation.isPending} variant="destructive">
                                        {terminateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                        {terminateMutation.isPending ? "Processing..." : "Confirm Termination"}
                                    </Button>
                                    <Button type="button" size="xs" variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" />Cancel</Button>
                                </div>
                            </form></Form>
                        )}
                    </div>
                );
            case 'extendValidity':
                return (
                    <div>
                        <div className="mb-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3 shadow-sm">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center text-sm font-semibold text-blue-800"><User className="mr-2 h-4 w-4 text-blue-600" />Current Subscription Details</h4></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                <div className="rounded-md border border-gray-100 bg-white p-2 hover:bg-blue-50 transition-colors duration-150"><span className="block text-gray-500 text-xs">Customer</span><span className="font-semibold text-gray-800 text-sm">{customerData.firstName} {customerData.lastName}</span></div>
                                <div className="rounded-md border border-gray-100 bg-white p-2 hover:bg-blue-50 transition-colors duration-150"><span className="block text-gray-500 text-xs">Current Plan</span><span className="font-semibold text-gray-800 text-sm">{activeSubscription?.planName || 'N/A'}</span></div>
                                <div className="rounded-md border border-gray-100 bg-white p-2 hover:bg-blue-50 transition-colors duration-150"><span className="block text-gray-500 text-xs">Plan End Date</span><span className="font-semibold text-gray-800 text-sm">{activeSubscription?.endDate ? new Date(activeSubscription.endDate).toLocaleDateString() : 'N/A'}</span></div>
                                <div className="rounded-md border border-gray-100 bg-white p-2 hover:bg-blue-50 transition-colors duration-150"><span className="block text-gray-500 text-xs">Status</span><div className="mt-1"><Badge className="bg-green-100 text-green-800 text-xs">{activeSubscription?.status || 'N/A'}</Badge></div></div>
                            </div>
                        </div>
                        <Form {...extendValidityForm}><form onSubmit={extendValidityForm.handleSubmit(processExtendValidity)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <FormField
                                        control={extendValidityForm.control}
                                        name="extensionEndDate"
                                        render={({ field }) => {
                                            const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
                                            const planEndDateStr = primarySub?.PLAN_END_DT || activeSubscription?.endDateRaw;
                                            let planExpirationDate: Date | undefined;
                                            let maxSelectableDate: Date | undefined;

                                            if (planEndDateStr && planEndDateStr.length === 8) {
                                                const year = parseInt(planEndDateStr.substring(0, 4), 10);
                                                const month = parseInt(planEndDateStr.substring(4, 6), 10) - 1;
                                                const day = parseInt(planEndDateStr.substring(6, 8), 10);
                                                planExpirationDate = new Date(year, month, day);

                                                maxSelectableDate = new Date(planExpirationDate);
                                                maxSelectableDate.setDate(maxSelectableDate.getDate() + 15);
                                            }

                                            return (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Extension End Date *</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} size="xs" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <CalendarComponent
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value) : undefined}
                                                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                                                disabled={(date) => {
                                                                    if (planExpirationDate) {
                                                                        if (date <= planExpirationDate) return true;
                                                                    } else {
                                                                        const today = new Date();
                                                                        today.setHours(0, 0, 0, 0);
                                                                        if (date < today) return true;
                                                                    }
                                                                    if (maxSelectableDate && date > maxSelectableDate) return true;
                                                                    return false;
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    {planExpirationDate && (<p className="text-xs text-gray-500 mt-1">Plan expires on: {format(planExpirationDate, "PPP")}</p>)}
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                    <FormField control={extendValidityForm.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Extension Reason *</FormLabel><FormControl><Input placeholder="e.g. Technical issues resolved" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="space-y-4">
                                    <FormField control={extendValidityForm.control} name="justification" render={({ field }) => (<FormItem><FormLabel>Detailed Justification *</FormLabel><FormControl><Textarea placeholder="Provide detailed justification..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            {isProcessing && (<div>Processing...</div>)}
                            <div className="flex gap-3"><Button type="submit" size="xs" disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Clock className="h-4 w-4 mr-2" />{isProcessing ? "Processing..." : "Submit Extension Request"}</Button><Button type="button" size="xs" variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" />Cancel</Button></div>
                        </form></Form>
                    </div>
                );
            case 'adjustment':
                return (
                    <div className="space-y-6">
                        <div className="mb-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3 shadow-sm">
                            <h4 className="flex items-center text-sm font-semibold text-blue-800 mb-2">
                                <User className="mr-2 h-4 w-4 text-blue-600" />
                                Subscriber Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                <div className="rounded-md border border-gray-100 bg-white p-2">
                                    <span className="block text-gray-500 text-xs">Customer</span>
                                    <span className="font-semibold text-gray-800 text-sm">{customerData.firstName} {customerData.lastName}</span>
                                </div>
                                <div className="rounded-md border border-gray-100 bg-white p-2">
                                    <span className="block text-gray-500 text-xs">SAP BP ID</span>
                                    <span className="font-semibold text-gray-800 text-sm">{customerData.sapBpId}</span>
                                </div>
                                <div className="rounded-md border border-gray-100 bg-white p-2">
                                    <span className="block text-gray-500 text-xs">Smart Card</span>
                                    <span className="font-semibold text-gray-800 text-sm">{customerData.macId}</span>
                                </div>
                                <div className="rounded-md border border-gray-100 bg-white p-2">
                                    <span className="block text-gray-500 text-xs">SAP CA ID</span>
                                    <span className="font-semibold text-gray-800 text-sm">{customerData.sapCaId}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-lg p-4">
                            <h4 className="font-medium text-gray-800 mb-4">Update Form</h4>
                            <Form {...noOfRoomsForm}>
                                <form onSubmit={noOfRoomsForm.handleSubmit(processNoOfRoomsUpdate)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                        <FormField
                                            control={noOfRoomsForm.control}
                                            name="noOfRooms"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Number of Rooms</FormLabel>
                                                    <FormControl>
                                                        <Input uiSize="sm" type="number" placeholder="e.g., 2" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={noOfRoomsForm.control}
                                            name="changeType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Change Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="immediate">Immediate</SelectItem>
                                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {noOfRoomsChangeType === 'scheduled' && (
                                            <FormField
                                                control={noOfRoomsForm.control}
                                                name="scheduledDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>Scheduled Date</FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button size="xs" variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <CalendarComponent
                                                                    mode="single"
                                                                    selected={field.value}
                                                                    onSelect={field.onChange}
                                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button size="xs" type="button" variant="outline" onClick={onClose} disabled={noOfRoomsMutation.isPending}>
                                            Cancel
                                        </Button>
                                        <Button size="xs" type="submit" className="bg-azam-blue hover:bg-azam-blue/90" disabled={noOfRoomsMutation.isPending}>
                                            {noOfRoomsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                            {noOfRoomsMutation.isPending ? "Submitting..." : "Submit Update"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </div>
                );
            case 'hardware': return <HardwareReplacementPopup customer={customerData} onClose={onClose} onOperationSuccess={onOperationSuccess} />;
            case 'retrack':
                return (
                    <div className="space-y-6">
                        <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200 text-sm">
                            <p className="mb-2"><strong>Smart Card:</strong> {customerData.macId}</p>
                            <p className="mb-1"><strong>Current Plan:</strong> {activeSubscription?.planName || "N/A"}</p>
                            <p><strong>Status:</strong> {activeSubscription?.status || "Unknown"}</p>
                        </div>
                        <p className="text-sm text-gray-700">You are about to re-send the entitlements for the subscription identified above.</p>

                        <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                            <AlertTriangle className="inline h-4 w-4 mr-2" />
                            This action forces a refresh of entitlements. It can be used for Active, Locked, or Scheduled plans that are not reflecting correctly on the device.
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" size="sm" onClick={onClose} disabled={retrackMutation.isPending}>Cancel</Button>
                            <Button onClick={processRetrack} size="sm" disabled={retrackMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                                {retrackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                {retrackMutation.isPending ? 'Processing...' : 'Confirm Retrack'}
                            </Button>
                        </div>
                    </div>
                );
            case 'offerChange': return <OfferChangePopup customer={customerData} onClose={onClose} onOperationSuccess={onOperationSuccess} fullSubscriptionDetails={fullSubscriptionDetails} />;
            case 'addons': return <AddOnPackagePopup customer={customerData} onClose={onClose} onOperationSuccess={onOperationSuccess} fullSubscriptionDetails={fullSubscriptionDetails} />;
            case 'postpaid_reconnection':
                return (
                    <Form {...postpaidReconnectionForm}>
                        <form onSubmit={postpaidReconnectionForm.handleSubmit(processPostpaidReconnection)} className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-semibold text-blue-900 mb-2">Postpaid Reconnection</h4>
                                <p className="text-sm text-blue-700">You are about to reconnect a suspended/inactive postpaid customer.</p>
                            </div>

                            <FormField
                                control={postpaidReconnectionForm.control}
                                name="balanceCheck"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Balance Check Required
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                If checked, the system will verify the balance before reconnecting.
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={postpaidReconnectMutation.isPending}>Cancel</Button> {/* ✅ Use onClose directly */}
                                <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={postpaidReconnectMutation.isPending}>
                                    {postpaidReconnectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                                    {postpaidReconnectMutation.isPending ? "Reconnecting..." : "Confirm Reconnection"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                );

            default: return null;
        }
    };

    const getTitle = () => {
        switch (activePopup) {
            case 'purchase': return { icon: <ShoppingCart className="h-5 w-5 text-green-600" />, text: "New Subscription Purchase" };
            case 'renewal': return { icon: <RefreshCw className="h-5 w-5 text-blue-600" />, text: "Subscription Renewal" };
            case 'retrack': return { icon: <RefreshCw className="h-5 w-5 text-blue-600" />, text: "Retrack Subscription" };
            case 'planChange': return { icon: <ArrowUpDown className="h-5 w-5 text-purple-600" />, text: "Plan Change" };
            case 'addons': return { icon: <Gift className="h-5 w-5 text-orange-600" />, text: "Add Add-on Packages" };
            case 'suspension': return { icon: <Pause className="h-5 w-5 text-yellow-600" />, text: "Suspend Service (Lock)" };
            case 'reconnection': return { icon: <Wifi className="h-5 w-5 text-green-600" />, text: "Resume Service (Unlock)" };
            case 'hardware': return { icon: <Settings className="h-5 w-5 text-gray-600" />, text: "Hardware Management" };
            case 'offerChange': return { icon: <Gift className="h-5 w-5 text-teal-600" />, text: "Offer Change Management" };
            case 'editCustomer': return { icon: <Edit className="h-5 w-5 text-azam-blue" />, text: "Edit Customer Information" };
            case 'extendValidity': return { icon: <Clock className="h-5 w-5 text-indigo-600" />, text: "Extend Plan Validity" };
            case 'disconnect': return { icon: <WifiOff className="h-5 w-5 text-red-600" />, text: "Disconnect/Reconnect Service" };
            case 'adjustment': return { icon: <Home className="h-5 w-5 text-green-600" />, text: "No of Rooms Update" };
            case 'postpaid_reconnection': return { icon: <Wifi className="h-5 w-5 text-green-600" />, text: "Postpaid Reconnection" };
            default: return { icon: null, text: "" };
        }
    };
    const { icon, text } = getTitle();

    return (<Dialog open={!!activePopup} onOpenChange={(isOpen) => !isOpen && onClose()}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center space-x-2">{icon}<span>{text}</span></DialogTitle></DialogHeader><div className="mt-4">{renderContent()}</div></DialogContent></Dialog>);
}
// src/pages/subscriber-view/HardwareReplacementPopup.tsx

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw, Box, AlertTriangle, Check, ChevronsUpDown, Filter, Plus, Trash2, Wallet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/context/AuthProvider";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

// --- Constants & Mappings --- QAS
const MATERIAL_TYPE_MAPPING: Record<string, string[]> = {
  "CARD_LESS": ["59", "68", "21", "60"],
  "STB": ["72"],
  "SC": ["67", "73", "52"]
};

// --- Type for Reason from API ---
interface ReplacementReason {
  name: string;
  value: string;
  validation: "Y" | "N" | null;
  validation2: string | null;
}

// --- Schema ---
const replacementItemSchema = z.object({
  materialType: z.enum(["CARD_LESS", "STB", "SC"], { required_error: "Type is required" }),
  materialCode: z.string().min(1, "Material is required"),
  newSerialNo: z.string().min(1, "New Serial Number is required"),
});

const hardwareReplacementSchema = z.object({
  replacementType: z.enum(["OTC", "AGENT"], { required_error: "Replacement type is required" }),
  isConsignment: z.boolean().default(false),
  issuingPlantId: z.string().optional(),
  returnPlantId: z.string().optional(),
  issuingCenter: z.string().min(1, "Issuing center is required"),
  returnCenter: z.string().optional(),
  agentId: z.string().optional(),
  items: z.array(replacementItemSchema).min(1, "At least one item is required"),
  reason: z.string().min(1, "Reason is required"),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.replacementType === "AGENT") {
    if (!data.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agent is required for Agent replacement",
        path: ["agentId"],
      });
    }
    if (data.isConsignment) {
      if (!data.returnPlantId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return Center Plant is required for consignment",
          path: ["returnPlantId"],
        });
      }
      if (!data.returnCenter) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return Store Location is required for consignment",
          path: ["returnCenter"],
        });
      }
    }
  } else {
    if (!data.issuingPlantId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuing Plant is required", path: ["issuingPlantId"] });
  }

  const types = data.items.map(i => i.materialType);
  if (types.includes("STB") && !types.includes("SC")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A Smart Card (SC) is required when replacing an STB.",
      path: ["items"],
    });
  }
});

type HardwareFormValues = z.infer<typeof hardwareReplacementSchema>;

interface HardwareReplacementPopupProps {
  customer: any;
  onClose: () => void;
  onOperationSuccess?: (message: string, operationType?: string, requestId?: string) => void;
  fullSubscriptionDetails?: any[];
}

// Helper to safely extract arrays
const getSafeArray = (data: any, key?: string): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.plantDetails)) return data.data.plantDetails;
  if (Array.isArray(data?.data?.storageDetails)) return data.data.storageDetails;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.hwProductDetails)) return data.data.hwProductDetails;
  if (key && Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.data)) return data.data;
  return [];
};

export default function HardwareReplacementPopup({ customer, onClose, onOperationSuccess, fullSubscriptionDetails }: HardwareReplacementPopupProps) {
  const { toast } = useToast();
  const { user } = useAuthContext();

  // --- User Role Detection ---
  const isOtcUser = (user?.isOtc || "N") === "Y";
  const isWarehouseUser = (user?.isMainPlant || "N") === "Y";
  const isAgent = user?.allAccess === "N" && !isOtcUser && !isWarehouseUser;
  const loggedInAgentBpId = user?.sapBpId || user?.parentSapBpId || "";

  const getDefaultReplacementType = (): "OTC" | "AGENT" => {
    if (isAgent) return "AGENT";
    return "OTC";
  };

  const isReplacementTypeLocked = isAgent || isOtcUser || isWarehouseUser;

  const [openSerialPopover, setOpenSerialPopover] = useState<Record<number, boolean>>({});
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentDisplayLabel, setAgentDisplayLabel] = useState("");

  const handleAgentSelect = (agent: AgentApiItem) => {
    form.setValue("agentId", agent.sapBpId, { shouldValidate: true });
    setAgentDisplayLabel(`${agent.agentName} (${agent.sapBpId})`);
    setShowAgentModal(false);
  };

  const form = useForm<HardwareFormValues>({
    resolver: zodResolver(hardwareReplacementSchema),
    defaultValues: {
      replacementType: getDefaultReplacementType(),
      isConsignment: false,
      issuingPlantId: "",
      returnPlantId: "",
      issuingCenter: "",
      returnCenter: "",
      agentId: isAgent ? loggedInAgentBpId : "",
      items: [{
        materialType: "" as unknown as "CARD_LESS" | "STB" | "SC",
        materialCode: "",
        newSerialNo: ""
      }],
      reason: "",
      remarks: ""
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchType = form.watch("replacementType");
  const watchIsConsignment = form.watch("isConsignment");
  const watchIssuingPlant = form.watch("issuingPlantId");
  const watchReturnPlant = form.watch("returnPlantId");
  const watchAgent = form.watch("agentId");
  const watchIssuingCenter = form.watch("issuingCenter");
  const watchItems = form.watch("items");
  const watchReason = form.watch("reason");

  const hasCardLess = (watchItems || []).some((i: any) => i.materialType === "CARD_LESS");
  const hasSTB = (watchItems || []).some((i: any) => i.materialType === "STB");
  const hasSC = (watchItems || []).some((i: any) => i.materialType === "SC");

  // --- Fetch Replacement Reasons from API ---
  const { data: reasonsResponse, isLoading: loadingReasons } = useQuery({
    queryKey: ['replacementReasons'],
    queryFn: () => apiRequest('/subscriptions/common-config', 'POST', {
      configKey: "CUSTOMER_REPLACEMENT_REASON"
    }),
    staleTime: 1000 * 60 * 60,
  });

  // ✅ UPDATED: Correctly parse the response structure
  const reasonsList: ReplacementReason[] = useMemo(() => {
    if (!reasonsResponse?.data) return [];
    
    // Check for nested configItemsList structure
    if (reasonsResponse.data.configItemsList?.CUSTOMER_REPLACEMENT_REASON) {
      return reasonsResponse.data.configItemsList.CUSTOMER_REPLACEMENT_REASON;
    }

    // Fallbacks for other possible structures
    const data = reasonsResponse.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.configDetails)) return data.configDetails;
    if (Array.isArray(data.data)) return data.data;
    
    return [];
  }, [reasonsResponse]);

  // ✅ Get selected reason object
  const selectedReasonObj = useMemo(() => {
    return reasonsList.find(r => r.value === watchReason);
  }, [reasonsList, watchReason]);

  // ✅ Determine if cost is free based on validation field
  // Validation Y = Free (Discounted)
  // Validation N = Chargeable
  const isReasonFree = useMemo(() => {
    if (!selectedReasonObj) return false;
    return selectedReasonObj.validation === "Y";
  }, [selectedReasonObj]);

  // --- Initialize based on User Role ---
  useEffect(() => {
    const initializeUserRole = async () => {
      if (isAgent && loggedInAgentBpId) {
        form.setValue("replacementType", "AGENT");
        form.setValue("agentId", loggedInAgentBpId);

        try {
          const userRes = await apiRequest('/agents/user-details', 'POST', {
            type: 'Agent',
            sapBpId: loggedInAgentBpId,
            salesOrg: user?.salesOrg || "",
            isSubCollection: "N"
          });

          const rawData = userRes?.data;
          const list: any[] = rawData?.customerDetails || [];

          let foundName = false;
          for (const item of list) {
            if (Array.isArray(item.relatedParty)) {
              const rp = item.relatedParty.find((r: any) => String(r.sapBpId) === loggedInAgentBpId);
              if (rp) {
                const agentName = `${item.firstName || ''} ${item.lastName || ''}`.trim();
                setAgentDisplayLabel(`${agentName} (${loggedInAgentBpId})`);
                foundName = true;
                break;
              }
            }
          }
          if (!foundName) setAgentDisplayLabel(`Agent (${loggedInAgentBpId})`);
        } catch (error) {
          setAgentDisplayLabel(`Agent (${loggedInAgentBpId})`);
        }
      } else if (isOtcUser || isWarehouseUser) {
        form.setValue("replacementType", "OTC");
      }
    };

    initializeUserRole();
  }, [isAgent, isOtcUser, isWarehouseUser, loggedInAgentBpId, form, user?.salesOrg]);

  // --- Data Fetching Hooks ---
  const { data: plantsData, isLoading: loadingPlants } = useQuery({
    queryKey: ['plants-replacement'],
    queryFn: () => apiRequest('/inventory/plants', 'GET'),
    staleTime: Infinity,
  });

  const plantsList = useMemo(() => {
    const rawList = getSafeArray(plantsData);
    const seen = new Set();
    return rawList.filter((plant: any) => {
      const id = String(plant.plant || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [plantsData]);

  const { data: issuingLocsData, isLoading: loadingIssuingLocs } = useQuery({
    queryKey: ['storeLocations-issuing', watchIssuingPlant],
    queryFn: () => apiRequest(`/inventory/store-locations-by-plant/${watchIssuingPlant}`, 'GET'),
    enabled: !!watchIssuingPlant,
  });

  const issuingStoreLocations = useMemo(() => {
    if (watchType === 'AGENT') {
      return [{ StorageLocation: 'AGENT_STOCK', StorageLocationName: 'Agent Stock' }];
    }
    const list = filterStoreLocations(getSafeArray(issuingLocsData));
    if (watchType === 'OTC') {
      return list.filter((loc: any) => {
        const code = String(loc.StorageLocation || loc.code || "").toUpperCase();
        return ["REPL"].includes(code);
      });
    }
    return list;
  }, [issuingLocsData, watchType]);

  const { data: returnLocsData, isLoading: loadingReturnLocs } = useQuery({
    queryKey: ['storeLocations-return', watchReturnPlant],
    queryFn: () => apiRequest(`/inventory/store-locations-by-plant/${watchReturnPlant}`, 'GET'),
    enabled: !!watchReturnPlant,
  });

  const returnStoreLocations = useMemo(() => {
    const list = filterStoreLocations(getSafeArray(returnLocsData));
    if (watchType === 'OTC' || (watchType === 'AGENT' && watchIsConsignment)) {
      return list.filter((loc: any) => {
        const code = String(loc.StorageLocation || loc.code || "").toUpperCase();
        return code === "DAMG";
      });
    }
    return list;
  }, [returnLocsData, watchType, watchIsConsignment]);

  function filterStoreLocations(rawList: any[]) {
    const seen = new Set();
    return rawList.filter((loc: any) => {
      const codeKey = String(loc.StorageLocation || loc.code || "");
      if (!codeKey || seen.has(codeKey)) return false;
      seen.add(codeKey);
      return true;
    });
  }

  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['hwProducts-replacement'],
    queryFn: () => apiRequest('/inventory/hw-products', 'POST', { type: "CUSTOMER" }),
    staleTime: 1000 * 60 * 60,
  });

  const materialsList = useMemo(() => {
    const rawList = getSafeArray(materialsData);
    const seen = new Set();
    return rawList.filter((mat: any) => {
      const id = String(mat.productId || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [materialsData]);

  const { data: subDetailsResponse } = useQuery({
    queryKey: ['subDetailsForReplacement', customer.sapBpId, customer.contractNo],
    queryFn: () => apiRequest('/subscriptions/details', 'POST', {
      sapBpId: customer.sapBpId,
      sapCaId: customer.sapCaId,
      contractNo: customer.contractNo,
      salesOrg: customer.salesOrg
    }),
    enabled: !!customer.sapBpId && !!customer.contractNo,
  });

  const { data: balanceData } = useQuery({
    queryKey: ['hardware-popup-balance', customer.sapBpId, customer.sapCaId, customer.agreementType, customer.walletCurrency],
    queryFn: async () => {
      const isPostpaid = customer.agreementType === 'Postpaid';
      if (isPostpaid) {
        const res = await apiRequest('/customer-payments/balance-by-bp', 'POST', {
          salesOrg: customer.salesOrg,
          sapBpId: customer.sapBpId,
          currency: customer.walletCurrency || ''
        });
        return { balance: parseFloat(res.data?.balance || "0") };
      } else {
        const res = await apiRequest('/customer-payments/balance', 'POST', {
          sapBpId: customer.sapBpId,
          sapCaId: customer.sapCaId,
          currency: customer.walletCurrency || ''
        });
        return { balance: parseFloat(res.data?.hwBalance || "0") };
      }
    },
    enabled: !!customer.sapBpId && (customer.agreementType === 'Postpaid' || !!customer.sapCaId),
    staleTime: 0
  });

  const currentHwBalance = balanceData?.balance || 0;

  // ✅ UPDATED: Calculate total amount based on reason validation
  const totalDisplayAmount = useMemo(() => {
    if (isReasonFree) {
      return 0;
    }

    return (watchItems || []).reduce((acc: number, item: any) => {
      const selectedMaterial = materialsList.find((m: any) => m.productId === item.materialCode);
      const price = parseFloat(selectedMaterial?.amount || "0");
      return acc + price;
    }, 0);
  }, [watchItems, materialsList, isReasonFree]);

  const replaceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest('/subscriptions/hardware-replacement', 'POST', payload);
    },
    onSuccess: (res) => {
      const msg = res.statusMessage;
      const requestId = res.data?.requestId;
      toast({ title: "Success", description: msg });
      if (onOperationSuccess && msg) onOperationSuccess(msg, "HARDWARE_REPLACEMENT", requestId);
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Replacement Failed",
        description: err.statusMessage,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: HardwareFormValues) => {
    const subsList = fullSubscriptionDetails || subDetailsResponse?.data?.subscriptionDetails || [];
    const primarySub = subsList.find((s: any) => s.ITEM_CATEGORY === 'ZBPO') || {};

    const issuingPlantObj = plantsList.find((p: any) => p.plant === values.issuingPlantId);
    const returnPlantObj = plantsList.find((p: any) => p.plant === values.returnPlantId);

    let totalAmount = 0;

    const materialReplacementOrder = values.items.map(item => {
      const selectedMaterial = materialsList.find((m: any) => m.productId === item.materialCode);
      
      let itemAmount = "0";
      if (!isReasonFree) {
        itemAmount = selectedMaterial?.amount || "0";
      }

      const priceToAdd = parseFloat(itemAmount);
      totalAmount += priceToAdd;

      let oldSerial = "";
      if (item.materialType === "STB" || item.materialType === "CARD_LESS") {
        oldSerial = customer.hardware?.stbSerialNumber;
      } else if (item.materialType === "SC") {
        oldSerial = customer.macId;
      }

      return {
        material: item.materialCode,
        itemType: selectedMaterial?.productName || item.materialType,
        oldItemSerialNo: oldSerial,
        itemSerialNo: item.newSerialNo,
        priceType: "Individual Price",
        itemAmount: priceToAdd.toFixed(2),
        deviceType: item.materialType,
        bundleName: selectedMaterial?.bundleName || "",
        reason: values.reason.toUpperCase()
      };
    });

    const isPostpaid = customer.agreementType === 'Postpaid';
    if (!isPostpaid && !isAgent && totalAmount > currentHwBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Customer has insufficient hardware balance. Required: ${totalAmount}, Available: ${currentHwBalance}`,
        variant: "destructive"
      });
      return;
    }

    // ✅ UPDATED: isWarranty based on reason validation
    const isWarrantyPayload = isReasonFree ? "Y" : "N";

    const activeAddon = subsList.find((sub: any) => sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A');
    const variantIdAddOn = activeAddon?.PLAN_VAR_CODE || "";
    const planIdAddOn = activeAddon?.PLAN_CODE || "";

    const payload: any = {
      sapBpId: customer.sapBpId,
      sapCaId: customer.sapCaId,
      sapContractId: customer.contractNo,
      salesOrg: primarySub.SALES_ORG || customer.salesOrg,
      division: primarySub.DIVISION,
      currency: customer.walletCurrency || "",
      bundleId: primarySub.PKG_CODE || "",
      bundleName: primarySub.PKG_NAME || "",
      planVariantId: primarySub.PLAN_VAR_CODE || "",
      planName: primarySub.PLAN_VAR_NAME || "",
      bundleTrId: primarySub.PKG_TR_ID || "",
      totalAmount: String(totalAmount),
      smartCardNo: customer.macId,
      stbNo: customer.hardware?.stbSerialNumber,
      connectionType: primarySub.ZCONNECTIONTYPE || "Prepaid",
      disChannel: "10",
      agentSapBpId: values.replacementType === 'AGENT'
        ? values.agentId
        : `${values.issuingPlantId}_${values.issuingCenter}`,
      stockAgentBpId: values.replacementType === 'AGENT' ? values.agentId : undefined,
      noOfDuration: primarySub.OFFER_DURATION || "",
      durationDesc: primarySub.PLAN_UOM || "",
      replacementType: values.replacementType,
      plantId: values.issuingPlantId,
      plantName: issuingPlantObj?.plantName || "",
      issuingCenter: values.issuingCenter,
      remark: values.remarks || "Hardware replacement",
      isWarranty: isWarrantyPayload,
      materialReplacementOrder: materialReplacementOrder,
      planId: primarySub.PLAN_CODE,
      variantIdAddOn: variantIdAddOn,
      planIdAddOn: planIdAddOn,
    };

    if (values.replacementType === 'OTC' || (values.replacementType === 'AGENT' && values.isConsignment)) {
      payload.returnCenterPlantId = values.returnPlantId;
      payload.returnCenterPlantName = returnPlantObj?.plantName || "";
      payload.returnHwCenter = values.returnCenter;
    }

    if (values.replacementType === 'AGENT' && values.isConsignment) {
      payload.isConsignment = "Y";
    }

    replaceMutation.mutate(payload);
  };

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    if (errors.items) {
      toast({
        title: "Selection Required",
        description: errors.items.root?.message || errors.items.message || "Please ensure all replacement requirements are met (e.g., STB requires a Smart Card).",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields correctly.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (watchType !== 'AGENT') {
      form.setValue("isConsignment", false);
    }
  }, [watchType, form]);

  useEffect(() => {
    if (watchType === 'AGENT') {
      form.setValue("issuingCenter", "AGENT_STOCK");
    } else {
      form.setValue("issuingCenter", "");
    }
  }, [watchIssuingPlant, watchType, form]);

  useEffect(() => { form.setValue("returnCenter", ""); }, [watchReturnPlant, watchType, form]);

  useEffect(() => {
    if (plantsList.length === 1) {
      if (!form.getValues("issuingPlantId")) form.setValue("issuingPlantId", plantsList[0].plant);
      if (!form.getValues("returnPlantId")) form.setValue("returnPlantId", plantsList[0].plant);
    }
  }, [plantsList, form]);

  useEffect(() => {
    if (issuingStoreLocations.length === 1 && !form.getValues("issuingCenter")) {
      const loc = issuingStoreLocations[0].StorageLocation || issuingStoreLocations[0].code;
      form.setValue("issuingCenter", loc);
    }
  }, [issuingStoreLocations, form]);

  useEffect(() => {
    if (returnStoreLocations.length === 1 && !form.getValues("returnCenter")) {
      const loc = returnStoreLocations[0].StorageLocation || returnStoreLocations[0].code;
      form.setValue("returnCenter", loc);
    }
  }, [returnStoreLocations, form]);

  return (
    <div className="space-y-4">
      <Card className="bg-slate-50 border-slate-200 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold text-sm">
            <Box className="w-4 h-4" /> Current Device Details
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div><span className="text-slate-500 block">STB Serial</span><span className="font-mono font-medium">{customer.hardware?.stbSerialNumber || "N/A"}</span></div>
            <div><span className="text-slate-500 block">Smart Card</span><span className="font-mono font-medium">{customer.macId || "N/A"}</span></div>
            <div><span className="text-slate-500 block">Start Date</span><span className="font-medium">{customer.currentSubscription?.startDate || "N/A"}</span></div>
            {/* ✅ Correctly displaying Warranty End Date */}
            <div><span className="text-slate-500 block">Warranty End</span><span className="font-medium">{customer.hardware?.warrantyEndDate || "N/A"}</span></div>
            <div><span className="text-slate-500 block">Status</span><Badge variant="outline" className="bg-white text-xs py-0 h-5">{customer.hardware?.condition || "Active"}</Badge></div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="replacementType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="h-7">Replacement Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isReplacementTypeLocked}
                  >
                    <FormControl>
                      <SelectTrigger className={cn("h-7 text-xs", isReplacementTypeLocked && "bg-gray-100 cursor-not-allowed")}>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OTC">OTC (Over the Counter)</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === 'AGENT' && (
              <FormField
                control={form.control}
                name="isConsignment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Consignment
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Enable to specify return center details
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {watchType !== 'AGENT' && (
              <FormField
                control={form.control}
                name="issuingPlantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="h-7">Issuing Center Plant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPlants}>
                      <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={loadingPlants ? "Loading..." : "Select Plant"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {plantsList.map((plant: any) => (
                          <SelectItem key={`iss-${plant.plant}`} value={plant.plant}>{plant.plantName} ({plant.plant})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchType === "AGENT" && (
              <div className="w-full">
                <ParentAgentSearchModal
                  isOpen={showAgentModal}
                  onClose={() => setShowAgentModal(false)}
                  onSelect={handleAgentSelect}
                  isSubCollection="N"
                />
                <FormField
                  control={form.control}
                  name="agentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="h-7">Agent</FormLabel>
                      <div className="flex gap-2 relative">
                        <FormControl>
                          <Input
                            placeholder="Click Filter to select agent..."
                            value={agentDisplayLabel || field.value || ""}
                            readOnly
                            onClick={() => !isAgent && setShowAgentModal(true)}
                            className={cn(
                              "h-7 text-xs focus:ring-0",
                              isAgent ? "bg-gray-100 cursor-not-allowed" : "cursor-pointer bg-gray-50"
                            )}
                          />
                        </FormControl>
                        {!isAgent && (
                          <Button
                            size="icon"
                            variant="outline"
                            type="button"
                            onClick={() => setShowAgentModal(true)}
                            className="shrink-0 h-7 w-7 bg-azam-orange text-white hover:bg-orange-600 border-none"
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="issuingCenter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="h-7">Issuing Store Location</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={(!watchIssuingPlant || loadingIssuingLocs) && watchType !== 'AGENT'}>
                    <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={loadingIssuingLocs ? "Loading..." : "Select Issuing Center"} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {issuingStoreLocations.map((loc: any) => (
                        <SelectItem key={`iss-loc-${loc.StorageLocation || loc.code}`} value={loc.StorageLocation || loc.code}>
                          {loc.StorageLocationName || loc.name} ({loc.StorageLocation || loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchType === 'OTC' || (watchType === 'AGENT' && watchIsConsignment)) && (
              <>
                <FormField
                  control={form.control}
                  name="returnPlantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="h-7">Return Center Plant</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPlants}>
                        <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={loadingPlants ? "Loading..." : "Select Plant"} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {plantsList.map((plant: any) => (
                            <SelectItem key={`ret-${plant.plant}`} value={plant.plant}>{plant.plantName} ({plant.plant})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="returnCenter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="h-7">Return Store Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchReturnPlant || loadingReturnLocs}>
                        <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder={loadingReturnLocs ? "Loading..." : "Select Return Center"} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {returnStoreLocations.map((loc: any) => (
                            <SelectItem key={`ret-loc-${loc.StorageLocation || loc.code}`} value={loc.StorageLocation || loc.code}>
                              {loc.StorageLocationName || loc.name} ({loc.StorageLocation || loc.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Replacement Items</h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ materialType: "" as any, materialCode: "", newSerialNo: "" })}
                className="h-7 text-xs"
                disabled={hasCardLess || (hasSTB && hasSC)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>

            <FormField
              control={form.control}
              name="items"
              render={() => (
                <FormItem>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fields.map((field, index) => (
              <ReplacementItemRow
                key={field.id}
                index={index}
                form={form}
                remove={remove}
                materialsList={materialsList}
                customer={customer}
                loadingMaterials={loadingMaterials}
                watchType={watchType}
                watchIssuingPlant={watchIssuingPlant}
                watchIssuingCenter={watchIssuingCenter}
                watchAgent={watchAgent}
                watchIsConsignment={watchIsConsignment}
                setOpenSerialPopover={setOpenSerialPopover}
                openSerialPopover={openSerialPopover}
                isReasonFree={isReasonFree}
                reasonsList={reasonsList}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs h-7">Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingReasons}>
                    <FormControl>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder={loadingReasons ? "Loading..." : "Select Reason"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonsList.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div className="flex items-center gap-2">
                            {reason.name}
                            {reason.validation === "Y" && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                                Free
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedReasonObj && (
                    <p className={cn(
                      "text-[10px] mt-1",
                      selectedReasonObj.validation === "Y" ? "text-green-600" : "text-orange-600"
                    )}>
                      {selectedReasonObj.validation === "Y" 
                        ? "✓ This reason qualifies for free replacement" 
                        : "⚠ Cost will be applicable for this reason"
                      }
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs h-7">Remarks</FormLabel>
                  <FormControl><Input placeholder="Optional details..." className="h-7 text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Warning</p>
              <p>Hardware replacement will deactivate the old serial number immediately.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 font-medium">Total To Pay:</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-base font-bold",
                  isReasonFree ? "text-green-600" : "text-slate-800"
                )}>
                  {customer.walletCurrency || ""} {totalDisplayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {isReasonFree && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                    Free Replacement
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1"><Wallet className="w-3 h-3" /> Available HW Balance:</span>
              <span className={cn("font-bold", !isReasonFree && currentHwBalance < totalDisplayAmount && customer.agreementType !== 'Postpaid' && !isAgent ? "text-red-600" : "text-green-600")}>
                {customer.walletCurrency || ""} {currentHwBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {!isReasonFree && currentHwBalance < totalDisplayAmount && customer.agreementType !== 'Postpaid' && !isAgent && (
              <p className="text-red-500 text-[10px] mt-1 text-right font-medium">Insufficient Balance</p>
            )}
          </div>

          <FormField
            control={form.control}
            name="items"
            render={() => (
              <FormItem className="mt-2">
                <FormMessage className="text-sm font-semibold bg-red-50 p-2 border border-red-200 rounded" />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={replaceMutation.isPending}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-azam-blue hover:bg-blue-700" disabled={replaceMutation.isPending}>
              {replaceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {replaceMutation.isPending ? "Processing..." : "Confirm Replacement"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Sub-component for individual rows
function ReplacementItemRow({
  index, form, remove, materialsList, customer, loadingMaterials,
  watchType, watchIssuingPlant, watchIssuingCenter, watchAgent,
  watchIsConsignment,
  setOpenSerialPopover, openSerialPopover,
  isReasonFree,
  reasonsList
}: {
  index: number;
  form: UseFormReturn<HardwareFormValues>;
  remove: (index: number) => void;
  materialsList: any[];
  customer: any;
  loadingMaterials: boolean;
  watchType: string;
  watchIssuingPlant: string | undefined;
  watchIssuingCenter: string;
  watchAgent: string | undefined;
  watchIsConsignment: boolean;
  setOpenSerialPopover: any;
  openSerialPopover: any;
  isReasonFree: boolean;
  reasonsList: ReplacementReason[];
}) {
  const materialType = form.watch(`items.${index}.materialType`);
  const materialCode = form.watch(`items.${index}.materialCode`);
  const reason = form.watch("reason");
  const allItems = form.watch("items");

  const { data: serialsData, isLoading: loadingSerials } = useQuery({
    queryKey: ['stockSerials-replacement-row', watchType, watchIssuingPlant, watchIssuingCenter, materialCode, watchAgent, watchIsConsignment],
    queryFn: async () => {
      if (watchType === 'OTC') {
        return apiRequest('/inventory/stock-serial-details', 'POST', {
          plant: watchIssuingPlant,
          storageLocation: watchIssuingCenter,
          material: materialCode,
          itemId: materialCode
        });
      } else {
        return apiRequest('/inventory/agent-stock-serials', 'POST', {
          sapBpId: watchAgent,
          material: materialCode,
          status: "NEW",
          orderFlag: watchIsConsignment ? "Y" : ""
        });
      }
    },
    enabled: !!materialCode && (watchType === 'OTC' ? !!watchIssuingPlant && !!watchIssuingCenter : !!watchAgent),
    staleTime: 1000 * 30,
  });

  const serialsList = useMemo(() => {
    const raw = watchType === 'OTC'
      ? serialsData?.data?.stockSerialNoOverview
      : serialsData?.data?.stockDetails;

    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.filter((item: any) => {
      const value = item.serialNo || item.manufacturerSrNo || item.placeId || (item.place ? item.place.id : null);
      const strVal = String(value || "");
      if (!strVal || seen.has(strVal)) return false;
      seen.add(strVal);
      return true;
    });
  }, [serialsData, watchType]);

  const filteredMaterials = useMemo(() => {
    const allItems = form.getValues("items") || [];
    const selectedInOtherRows = allItems
      .filter((item: any, idx: number) => idx !== index && item.materialCode)
      .map((item: any) => item.materialCode);

    const customerTech = (customer.connectionType || customer.serviceType || "").toUpperCase();
    const isDthCustomer = customerTech.includes("DTH");
    const isDttCustomer = customerTech.includes("DTT");

    return materialsList.filter((mat: any) => {
      const matName = (mat.productName || "").toUpperCase();
      const matId = String(mat.productId);

      if (materialType) {
        const allowedIds = MATERIAL_TYPE_MAPPING[materialType] || [];
        if (!allowedIds.includes(matId)) return false;
      } else {
        return false;
      }

      if (isDthCustomer && !matName.includes("DTH") && !matName.includes("DISH") && !matName.includes("SMART")) {
        if (matName.includes("DTT") || matName.includes("ANTENNA")) return false;
      }
      if (isDttCustomer && !matName.includes("DTT") && !matName.includes("ANTENNA")) {
        if (matName.includes("DTH") || matName.includes("DISH")) return false;
      }

      if (selectedInOtherRows.includes(matId)) {
        return false;
      }

      return true;
    });

  }, [materialsList, materialType, form.watch(`items`), customer]);

  const selectedMaterial = materialsList.find((m: any) => m.productId === materialCode);

  let finalPrice = 0;
  let priceLabel = "";
  let isFree = false;

  if (selectedMaterial) {
    const basePrice = parseFloat(selectedMaterial.amount || '0');
    
    if (isReasonFree) {
      finalPrice = 0;
      isFree = true;
      priceLabel = "Free (Reason Qualified)";
    } else {
      finalPrice = basePrice;
      isFree = false;
      priceLabel = "Chargeable";
    }
  }

  useEffect(() => {
    if (filteredMaterials.length === 1 && materialType) {
      const matId = String(filteredMaterials[0].productId);
      if (materialCode !== matId) {
        form.setValue(`items.${index}.materialCode`, matId);
      }
    }
  }, [filteredMaterials, materialCode, index, form, materialType]);

  return (
    <Card className="border border-slate-200 shadow-none mb-3">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold text-slate-500">Item #{index + 1}</span>
          {index > 0 && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name={`items.${index}.materialType`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs h-7">Product Type</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.setValue(`items.${index}.materialCode`, "");
                    form.setValue(`items.${index}.newSerialNo`, "");
                  }}
                  defaultValue={field.value}
                >
                  <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem
                      value="CARD_LESS"
                      disabled={allItems.some((item, idx) => idx !== index && ["STB", "SC"].includes(item.materialType))}
                    >
                      Card Less Box
                    </SelectItem>
                    <SelectItem
                      value="STB"
                      disabled={allItems.some((item, idx) => idx !== index && item.materialType === "STB")}
                    >
                      STB
                    </SelectItem>
                    <SelectItem value="SC">Smart Card</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.materialCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs h-7">Material</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingMaterials || !materialType}>
                  <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select Material" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredMaterials.map((mat: any) => (
                      <SelectItem key={mat.productId} value={mat.productId}>{mat.productName}</SelectItem>
                    ))}
                    {filteredMaterials.length === 0 && materialType && (
                      <SelectItem value="none" disabled>No materials found for this type</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedMaterial && (
                  <div className={`text-[10px] font-medium mt-1 flex items-center gap-1 ${isFree ? "text-green-600" : "text-orange-600"}`}>
                    <span>Price: {selectedMaterial.currency || ''} {finalPrice.toLocaleString()}</span>
                    {priceLabel && <Badge variant="outline" className="text-[9px] h-4 px-1">{priceLabel}</Badge>}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.newSerialNo`}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs h-7">New Serial No</FormLabel>
                <Popover
                  open={openSerialPopover[index] || false}
                  onOpenChange={(v) => setOpenSerialPopover((prev: any) => ({ ...prev, [index]: v }))}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between pl-3 pr-3 font-normal text-left h-7 text-xs", !field.value && "text-muted-foreground")}
                        disabled={!materialCode || loadingSerials || (!watchIssuingCenter && watchType === 'OTC') || (!watchAgent && watchType === 'AGENT')}
                      >
                        {loadingSerials ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : field.value || "Select Serial"}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search serial..." />
                      <CommandList>
                        <CommandEmpty>No serial found.</CommandEmpty>
                        <CommandGroup>
                          {serialsList.map((item: any) => {
                            const value = item.serialNo || item.manufacturerSrNo || item.placeId || (item.place ? item.place.id : null);
                            if (!value) return null;
                            return (
                              <CommandItem
                                key={value}
                                value={value}
                                onSelect={() => {
                                  form.setValue(`items.${index}.newSerialNo`, value, { shouldValidate: true });
                                  setOpenSerialPopover((prev: any) => ({ ...prev, [index]: false }));
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === value ? "opacity-100" : "opacity-0")} />
                                {value}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>
      </CardContent>
    </Card>
  );
}
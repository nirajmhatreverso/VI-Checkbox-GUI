import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw, Box, AlertTriangle, Check, ChevronsUpDown, Filter, Plus, Trash2, Wallet, User, UserCheck, CheckCircle, Package, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { agentReplacementApi } from "@/lib/api-client";
import { useAuthContext } from "@/context/AuthProvider";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal";
import AgentReplacementHistory from "./AgentReplacementHistory";
import AgentReplacementApprovalQueue from "./AgentReplacementApprovalQueue";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Constants & Mappings ---
const MATERIAL_TYPE_MAPPING: Record<string, string[]> = {
  "CARD_LESS": ["59", "68", "21", "60"],
  "STB": ["72"],
  "SC": ["67", "73", "52"]
};

// --- Reason Config Type ---
interface ReasonConfigItem {
  name: string;
  value: string;
  validation: "Y" | "N";
  validation2: string | null;
}

// --- Schema ---
const replacementItemSchema = z.object({
  materialType: z.enum(["CARD_LESS", "STB", "SC"], { required_error: "Type is required" }),
  materialCode: z.string().min(1, "Material is required"),
  oldSerialNo: z.string().min(1, "Old Serial Number is required"),
  newSerialNo: z.string().min(1, "New Serial Number is required"),
});

const agentReplacementSchema = z.object({
  sapBpId: z.string().min(1, "Agent BP ID is required"),
  sapCaId: z.string().optional(),
  salesOrg: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  division: z.string().optional(),
  issuingPlantId: z.string().min(1, "Issuing Plant is required"),
  returnPlantId: z.string().optional(),
  issuingCenter: z.string().min(1, "Issuing center is required"),
  returnCenter: z.string().optional(),
  items: z.array(replacementItemSchema).min(1, "At least one item is required"),
  reason: z.string().min(1, "Reason is required"),
  remarks: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentReplacementSchema>;

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

interface ExtendedAgentDetails extends Omit<AgentApiItem, 'currency'> {
  agreementType?: string;
  customerType?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  division?: string;
  currency?: string; 
}

export default function AgentReplacementPage() {
  const [tab, setTab] = useState("new-request");

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Agent Replacement</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Manage agent replacement requests, approvals, and history
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new-request" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4" />
              <span>Approval</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-request" className="p-0">
            <NewAgentReplacementForm />
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <AgentReplacementApprovalQueue />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <AgentReplacementHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function NewAgentReplacementForm() {
  const { toast } = useToast();
  const { user } = useAuthContext();

  // --- Identify User Role ---
  const isAdmin = (user?.allAccess || "N") === "Y";
  const isAgent = !isAdmin;
  const loggedInBpId = user?.sapBpId || user?.parentSapBpId || "";

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ExtendedAgentDetails | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  // State for popovers
  const [popoverMap, setPopoverMap] = useState<Record<string, boolean>>({});

  const handlePopoverChange = (index: number, type: 'old' | 'new', open: boolean) => {
    setPopoverMap(prev => ({ ...prev, [`${index}-${type}`]: open }));
  };

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentReplacementSchema),
    defaultValues: {
      sapBpId: "",
      sapCaId: "",
      salesOrg: user?.salesOrg || "",
      currency: "",
      division: "",
      issuingPlantId: "",
      returnPlantId: "",
      issuingCenter: "",
      returnCenter: "",
      items: [{ materialType: "" as any, materialCode: "", oldSerialNo: "", newSerialNo: "" }],
      reason: "",
      remarks: ""
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchIssuingPlant = form.watch("issuingPlantId");
  const watchReturnPlant = form.watch("returnPlantId");
  const watchIssuingCenter = form.watch("issuingCenter");
  const watchItems = form.watch("items");
  const watchBpId = form.watch("sapBpId");
  const watchCaId = form.watch("sapCaId");
  const watchReason = form.watch("reason");
  const watchCurrency = form.watch("currency");
  const watchDivision = form.watch("division");

  // --- Fetch Reason Config from API ---
  const { data: reasonConfigData, isLoading: loadingReasons, error: reasonConfigError } = useQuery({
    queryKey: ['agent-replacement-reason-config'],
    queryFn: async () => {
      const result = await agentReplacementApi.fetchReasonConfig();      
      return result;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Parse reason config from API response
  const reasonConfigList = useMemo((): ReasonConfigItem[] => {
    const configItems = reasonConfigData?.data?.configItemsList;
    if (!configItems) return [];
    
    // The API returns AGENT_REPLACEMENT_REASON or similar key
    const reasonKey = Object.keys(configItems).find(key => 
      key.includes('REPLACEMENT_REASON')
    );
    
    if (reasonKey && Array.isArray(configItems[reasonKey])) {
      return configItems[reasonKey];
    }
    return [];
  }, [reasonConfigData]);

  // Get the selected reason config item
  const selectedReasonConfig = useMemo(() => {
    return reasonConfigList.find(r => r.value === watchReason);
  }, [reasonConfigList, watchReason]);

  // Check if the selected reason is warranty (free) - validation "Y" means free
  const isWarrantyReason = useMemo(() => {
    return selectedReasonConfig?.validation === "Y";
  }, [selectedReasonConfig]);

  // --- Shared function to fetch agent details by BP ID ---
  const fetchAndSetAgentDetails = useCallback(async (bpId: string) => {
    if (!bpId) return;
    setAgentLoading(true);
    try {
      const res = await apiRequest('/agents/user-details', 'POST', {
        type: 'Agent',
        sapBpId: bpId,
        salesOrg: user?.salesOrg,
        isSubCollection: "N"
      });

      const rawData = (res as any)?.data;
      const list: any[] = rawData?.customerDetails || [];

      let fullRecord = null;
      let relatedParty = null;

      for (const item of list) {
        if (Array.isArray(item.relatedParty)) {
          const rp = item.relatedParty.find((r: any) => String(r.sapBpId) === bpId);
          if (rp) {
            fullRecord = item;
            relatedParty = rp;
            break;
          }
        }
      }

      if (fullRecord && relatedParty) {
        const contactList = Array.isArray(fullRecord.contactMedium) ? fullRecord.contactMedium : [];
        const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
        const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

        const billingAddress = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
        const installationAddress = contactList.find((c: any) => c.type === 'INSTALLATION_ADDRESS') || {};
        const addressInfo = billingAddress.city ? billingAddress : installationAddress;

        const agentCurrency = relatedParty.currency || ""; 
        const agentDivision = relatedParty.division || "11";
        const agentSalesOrg = relatedParty.salesOrg || user?.salesOrg || "";

        const extendedAgent: ExtendedAgentDetails = {
          agentName: `${fullRecord.firstName || ''} ${fullRecord.lastName || ''}`.trim(),
          sapBpId: relatedParty.sapBpId,
          sapCaId: relatedParty.sapCaId,
          firstName: fullRecord.firstName,
          lastName: fullRecord.lastName,
          agreementType: fullRecord.agreementType,
          customerType: fullRecord.engagedParty?.customerType,
          mobile: mobileInfo.value,
          email: emailInfo.value,
          division: agentDivision,
          currency: agentCurrency,
          country: addressInfo.country || "",
          region: addressInfo.region || "",
          city: addressInfo.city || "",
          district: addressInfo.district || "",
          ward: addressInfo.ward || "",
        };

        form.setValue("sapBpId", relatedParty.sapBpId, { shouldValidate: true });
        form.setValue("sapCaId", relatedParty.sapCaId || "");
        form.setValue("salesOrg", agentSalesOrg);
        form.setValue("currency", agentCurrency, { shouldValidate: true });
        form.setValue("division", agentDivision);

        setSelectedAgent(extendedAgent);

        console.log("Agent details loaded:", {
          sapBpId: relatedParty.sapBpId,
          sapCaId: relatedParty.sapCaId,
          currency: agentCurrency,
          division: agentDivision,
          salesOrg: agentSalesOrg
        });
      } else {
        form.setValue("sapBpId", bpId, { shouldValidate: true });
        form.setValue("currency", "");
        
        toast({
          title: "Warning",
          description: "Could not find complete agent details. Using default values.",
          variant: "destructive"
        });
      }
    } catch (e) {
      console.error("Error fetching agent details:", e);
      form.setValue("sapBpId", bpId, { shouldValidate: true });
      form.setValue("currency", "");
      
      toast({
        title: "Error",
        description: "Failed to fetch agent details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAgentLoading(false);
    }
  }, [user?.salesOrg, form, toast]);

  // --- Auto-Initialize for Agents/Employees ---
  useEffect(() => {
    if (isAgent && loggedInBpId) {
      form.setValue("sapBpId", loggedInBpId);
      fetchAndSetAgentDetails(loggedInBpId);
    }
  }, [isAgent, loggedInBpId, fetchAndSetAgentDetails, form]);

  const handleAgentSelect = async (agent: AgentApiItem) => {
    await fetchAndSetAgentDetails(agent.sapBpId);
    setShowAgentModal(false);
  };

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
    const list = getSafeArray(issuingLocsData);
    return list.filter((loc: any) => {
      const code = String(loc.StorageLocation || loc.code || "").toUpperCase();
      return ["REPI", "REPL"].includes(code);
    });
  }, [issuingLocsData]);

  const { data: returnLocsData, isLoading: loadingReturnLocs } = useQuery({
    queryKey: ['storeLocations-return', watchReturnPlant],
    queryFn: () => apiRequest(`/inventory/store-locations-by-plant/${watchReturnPlant}`, 'GET'),
    enabled: !!watchReturnPlant,
  });

  const returnStoreLocations = useMemo(() => {
    const list = getSafeArray(returnLocsData);
    return list.filter((loc: any) => {
      const code = String(loc.StorageLocation || loc.code || "").toUpperCase();
      return code === "DAMG";
    });
  }, [returnLocsData]);

  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['hwProducts-agent-replacement'],
    queryFn: () => apiRequest('/inventory/hw-products', 'POST', { type: "AGENT" }),
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

  // Balance Query
  const { data: balanceData, isLoading: loadingBalance } = useQuery({
    queryKey: ['agent-hardware-balance', watchBpId, watchCurrency],
    queryFn: async () => {
      const res = await apiRequest('/hardware-sales/balance', 'POST', {
        sapBpId: watchBpId,
        salesOrg: user?.salesOrg,
        currency: watchCurrency
      });
      return {
        balance: parseFloat(res.data?.balance || "0"),
        currency: res.data?.currency || watchCurrency || "",
        message: res.data?.message
      };
    },
    enabled: !!watchBpId && !!watchCurrency,
    staleTime: 0
  });

  const currentBalance = balanceData?.balance || 0;
  const balanceCurrency = balanceData?.currency || watchCurrency || "";

  // Calculate total amount based on reason validation
  const totalDisplayAmount = useMemo(() => {
    // If reason is warranty (validation = "Y"), price is 0
    if (isWarrantyReason) {
      return 0;
    }

    return (watchItems || []).reduce((acc: number, item: any) => {
      const selectedMaterial = materialsList.find((m: any) => m.productId === item.materialCode);
      const price = parseFloat(selectedMaterial?.amount || "0");
      return acc + price;
    }, 0);
  }, [watchItems, materialsList, isWarrantyReason]);

  const replaceMutation = useMutation({
    mutationFn: (payload: any) => agentReplacementApi.createReplacement(payload),
    onSuccess: (res) => {
      const msg = res.statusMessage || res.data?.message;
      toast({ title: "Success", description: msg });
      form.reset({
        ...form.getValues(),
        items: [{ materialType: "" as any, materialCode: "", oldSerialNo: "", newSerialNo: "" }],
        reason: "",
        remarks: ""
      });
    },
    onError: (err: any) => {
      toast({ title: "Replacement Failed", description: err.statusMessage, variant: "destructive" });
    }
  });

  const onSubmit = (values: AgentFormValues) => {
    if (!values.currency) {
      toast({
        title: "Currency Required",
        description: "Currency information is missing. Please select an agent first.",
        variant: "destructive"
      });
      return;
    }

    // Balance Validation
    const isPostpaid = selectedAgent?.agreementType?.toUpperCase() === 'POSTPAID';
    if (!isPostpaid && totalDisplayAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Agent has insufficient hardware balance. Required: ${values.currency} ${totalDisplayAmount.toLocaleString()}, Available: ${values.currency} ${currentBalance.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    const issuingPlantObj = plantsList.find((p: any) => p.plant === values.issuingPlantId);
    const returnPlantObj = plantsList.find((p: any) => p.plant === values.returnPlantId);

    const materialReplacementOrder = values.items.map(item => {
      const selectedMaterial = materialsList.find((m: any) => m.productId === item.materialCode);
      // If warranty reason (validation = "Y"), price is 0
      const itemAmount = isWarrantyReason ? "0" : (selectedMaterial?.amount || "0");

      return {
        material: item.materialCode,
        itemType: selectedMaterial?.productName || item.materialType,
        oldItemSerialNo: item.oldSerialNo,
        itemSerialNo: item.newSerialNo,
        priceType: "Individual Price",
        itemAmount: itemAmount,
        deviceType: item.materialType,
        bundleName: selectedMaterial?.bundleName || "",
        reason: values.reason.toUpperCase()
      };
    });

    const isWarrantyPayload = isWarrantyReason ? "Y" : "N";

    const payload = {
      sapBpId: values.sapBpId,
      sapCaId: values.sapCaId || "",
      salesOrg: values.salesOrg || user?.salesOrg || "",
      division: values.division || selectedAgent?.division || "",
      currency: values.currency,
      totalAmount: String(totalDisplayAmount),
      replacementType: "AGENT",
      plantId: values.issuingPlantId,
      plantName: issuingPlantObj?.plantName || "",
      issuingCenter: values.issuingCenter,
      returnCenterPlantId: values.returnPlantId || values.issuingPlantId,
      returnCenterPlantName: returnPlantObj?.plantName || issuingPlantObj?.plantName || "",
      returnHwCenter: values.returnCenter || "",
      remark: values.remarks || "Agent Hardware Replacement",
      isWarranty: isWarrantyPayload,
      materialReplacementOrder: materialReplacementOrder
    };

    console.log("Submitting replacement payload:", payload);
    replaceMutation.mutate(payload);
  };

  useEffect(() => {
    if (plantsList.length === 1) {
      if (!form.getValues("issuingPlantId")) form.setValue("issuingPlantId", plantsList[0].plant);
      if (!form.getValues("returnPlantId")) form.setValue("returnPlantId", plantsList[0].plant);
    }
  }, [plantsList, form]);

  useEffect(() => {
    if (issuingStoreLocations.length === 1 && !form.getValues("issuingCenter")) {
      form.setValue("issuingCenter", issuingStoreLocations[0].StorageLocation || issuingStoreLocations[0].code);
    }
  }, [issuingStoreLocations, form]);

  useEffect(() => {
    if (returnStoreLocations.length === 1 && !form.getValues("returnCenter")) {
      form.setValue("returnCenter", returnStoreLocations[0].StorageLocation || returnStoreLocations[0].code);
    }
  }, [returnStoreLocations, form]);

  const agentRightIcon = agentLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : selectedAgent ? <Check className="h-4 w-4 text-green-600" /> : undefined;
  const getCityName = (val?: string) => val ? val.split('_')[0] : "";

  return (
    <div className="w-full space-y-6">
      <CardHeader className="px-6 pt-0 pb-0">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-azam-blue" />
          New Replacement Request
        </CardTitle>
        <CardDescription>
          Process faulty or damaged device replacements for agents
        </CardDescription>
      </CardHeader>

      <div className="space-y-6">
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Top Grid: Agent Search + Stock Location Config */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Agent Search Field */}
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <Label className="h-7 text-xs font-semibold text-gray-700 flex items-center">Agent BP <span className="text-red-500 ml-1">*</span></Label>
                    {isAdmin && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => setShowAgentModal(true)} title="Filter & select Agent">
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="ml-1 text-xs text-blue-700 bg-blue-600 px-1 rounded text-white">Filter</span>
                      </Button>
                    )}
                  </div>
                  <FormField control={form.control} name="sapBpId" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={isAgent ? "Loading..." : "Click Filter..."}
                          readOnly
                          onClick={() => isAdmin && setShowAgentModal(true)}
                          className={cn(
                            "focus:ring-0 h-7 text-xs",
                            isAgent ? "bg-gray-100 cursor-not-allowed text-gray-600" : "cursor-pointer bg-gray-50"
                          )}
                          rightIcon={agentRightIcon}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Issuing Plant */}
                <FormField control={form.control} name="issuingPlantId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="h-7 text-xs font-semibold text-gray-700">Issuing Center Plant <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPlants}>
                      <FormControl><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder={loadingPlants ? "Loading..." : "Select Plant"} /></SelectTrigger></FormControl>
                      <SelectContent>{plantsList.map((p: any) => <SelectItem key={p.plant} value={p.plant}>{p.plantName} ({p.plant})</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Issuing Center */}
                <FormField control={form.control} name="issuingCenter" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="h-7 text-xs font-semibold text-gray-700">Issuing Store Location <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchIssuingPlant || loadingIssuingLocs}>
                      <FormControl><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder="Select Issuing Center" /></SelectTrigger></FormControl>
                      <SelectContent>{issuingStoreLocations.map((l: any) => <SelectItem key={l.StorageLocation || l.code} value={l.StorageLocation || l.code}>{l.StorageLocationName || l.name} ({l.StorageLocation || l.code})</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Agent Details Card */}
              {selectedAgent && (
                <div className="p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base font-bold text-azam-orange tracking-wide">Agent Details</span>
                    {watchCurrency && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Currency: {watchCurrency}
                      </Badge>
                    )}
                  </div>

                  <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6 text-s">
                    <div><span className="text-azam-orange font-semibold">Name:</span> {selectedAgent.agentName}</div>
                    <div><span className="text-azam-orange font-semibold">BP ID:</span> {selectedAgent.sapBpId}</div>
                    {selectedAgent.sapCaId && <div><span className="text-azam-orange font-semibold">CA ID:</span> {selectedAgent.sapCaId}</div>}
                    {selectedAgent.division && <div><span className="text-azam-orange font-semibold">Division:</span> {selectedAgent.division}</div>}
                    {selectedAgent.agreementType && <div><span className="text-azam-orange font-semibold">Type:</span> {selectedAgent.agreementType}</div>}

                    {selectedAgent.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {selectedAgent.mobile}</div>}
                    {selectedAgent.email && <div><span className="text-azam-orange font-semibold">Email:</span> {selectedAgent.email}</div>}

                    {selectedAgent.country && <div><span className="text-azam-orange font-semibold">Country:</span> {selectedAgent.country}</div>}
                    {selectedAgent.region && <div><span className="text-azam-orange font-semibold">Region:</span> {selectedAgent.region}</div>}
                    {selectedAgent.city && <div><span className="text-azam-orange font-semibold">City:</span> {getCityName(selectedAgent.city)}</div>}
                    {selectedAgent.district && <div><span className="text-azam-orange font-semibold">District:</span> {selectedAgent.district}</div>}
                    {selectedAgent.ward && <div><span className="text-azam-orange font-semibold">Ward:</span> {selectedAgent.ward}</div>}
                  </div>

                  <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-4 text-s">
                    <span className="font-semibold text-azam-orange">Hardware Balance:</span>
                    {loadingBalance ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    ) : balanceData?.balance !== undefined ? (
                      <span className="font-bold text-gray-900">
                        {watchCurrency} {balanceData.balance.toLocaleString()}
                      </span>
                    ) : (
                      <span className="font-bold text-red-600">{balanceData?.message || "0"}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Items Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Replacement Items</h4>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ materialType: "" as any, materialCode: "", oldSerialNo: "", newSerialNo: "" })} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <AgentReplacementItemRow
                    key={field.id}
                    index={index}
                    form={form}
                    remove={remove}
                    materialsList={materialsList}
                    loadingMaterials={loadingMaterials}
                    watchIssuingPlant={watchIssuingPlant}
                    watchIssuingCenter={watchIssuingCenter}
                    togglePopover={handlePopoverChange}
                    popoverState={{ old: popoverMap[`${index}-old`] || false, new: popoverMap[`${index}-new`] || false }}
                    watchReason={watchReason}
                    watchBpId={watchBpId}
                    watchCurrency={watchCurrency}
                    isWarrantyReason={isWarrantyReason}
                  />
                ))}
              </div>

              {/* Footer Info & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs h-7">Reason <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingReasons}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={loadingReasons ? "Loading reasons..." : "Select Reason"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reasonConfigList.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div className="flex items-center gap-2">
                              {reason.name}
                              {reason.validation === "Y" && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                                  Warranty
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedReasonConfig && (
                      <p className={cn(
                        "text-[10px] mt-1",
                        selectedReasonConfig.validation === "Y" ? "text-green-600" : "text-orange-600"
                      )}>
                        {selectedReasonConfig.validation === "Y" 
                          ? "✓ Covered under warranty - No charges apply" 
                          : "⚠ Charges will be applied"}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="remarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs h-7">Remarks</FormLabel>
                    <FormControl><Input placeholder="Optional details..." className="h-7 text-xs" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-600">Total To Pay:</span>
                  <span className={cn(
                    "text-base font-bold",
                    isWarrantyReason ? "text-green-600" : "text-slate-800"
                  )}>
                    {isWarrantyReason ? (
                      <span className="flex items-center gap-2">
                        {watchCurrency || ""} 0.00
                        <Badge className="bg-green-100 text-green-700 border-green-200">Warranty</Badge>
                      </span>
                    ) : (
                      `${watchCurrency || ""} ${totalDisplayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    )}
                  </span>
                </div>
                {currentBalance < totalDisplayAmount && selectedAgent?.agreementType?.toUpperCase() !== 'POSTPAID' && !isWarrantyReason && (
                  <div className="text-red-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Insufficient Balance
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-azam-blue hover:bg-blue-700 w-full md:w-auto" 
                  disabled={replaceMutation.isPending || !watchCurrency}
                >
                  {replaceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {replaceMutation.isPending ? "Processing..." : "Confirm Replacement"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </div>

      <ParentAgentSearchModal isOpen={showAgentModal} onClose={() => setShowAgentModal(false)} onSelect={handleAgentSelect} isSubCollection="N" />
    </div>
  );
}

// --- Row Component for Items ---
function AgentReplacementItemRow({
  index, form, remove, materialsList, loadingMaterials,
  watchIssuingPlant, watchIssuingCenter, togglePopover, popoverState,
  watchReason, watchBpId, watchCurrency, isWarrantyReason
}: {
  index: number;
  form: UseFormReturn<AgentFormValues>;
  remove: (index: number) => void;
  materialsList: any[];
  loadingMaterials: boolean;
  watchIssuingPlant: string | undefined;
  watchIssuingCenter: string;
  togglePopover: (index: number, type: 'old' | 'new', open: boolean) => void;
  popoverState: { old: boolean; new: boolean };
  watchReason: string;
  watchBpId: string;
  watchCurrency: string;
  isWarrantyReason: boolean;
}) {
  const materialType = form.watch(`items.${index}.materialType`);
  const materialCode = form.watch(`items.${index}.materialCode`);
  const allItems = form.watch("items");

  // Fetch NEW Serials based on Issuing Center (Stock)
  const { data: newSerialsData, isLoading: loadingNewSerials } = useQuery({
    queryKey: ['stockSerials-agent-row-new', watchIssuingPlant, watchIssuingCenter, materialCode],
    queryFn: () => apiRequest('/inventory/stock-serial-details', 'POST', {
      plant: watchIssuingPlant,
      storageLocation: watchIssuingCenter,
      material: materialCode,
      itemId: materialCode
    }),
    enabled: !!materialCode && !!watchIssuingPlant && !!watchIssuingCenter,
    staleTime: 1000 * 30,
  });

  const newSerialsList = useMemo(() => {
    const raw = newSerialsData?.data?.stockSerialNoOverview;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: any) => {
        const serial = item.place?.id || item.relatedParty?.manufacturerSrNo || item.serialNo;
        return { ...item, serialNo: serial };
      })
      .filter((item: any) => item.serialNo);
  }, [newSerialsData]);

  // Fetch OLD Serials based on Agent Stock (Faulty Item)
  const { data: oldSerialsData, isLoading: loadingOldSerials } = useQuery({
    queryKey: ['agent-stock-old', watchBpId, materialCode],
    queryFn: () => apiRequest('/inventory/agent-stock-serials', 'POST', {
      sapBpId: watchBpId,
      material: materialCode,
      status: "FAULTY"
    }),
    enabled: !!watchBpId && !!materialCode,
    staleTime: 1000 * 30,
  });

  const oldSerialsList = useMemo(() => {
    const raw = oldSerialsData?.data?.stockDetails || oldSerialsData?.data?.stockSerialNoOverview;
    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => {
      const serial = item.place?.id
        || item.relatedParty?.manufacturerSrNo
        || item.serialNo
        || item.manufacturerSrNo;
      return { ...item, serialNo: serial };
    }).filter((item: any) => item.serialNo);
  }, [oldSerialsData]);

  // Get old serial numbers already selected in other rows with same product type and material
  const selectedOldSerialsInOtherRows = useMemo(() => {
    return allItems
      .filter((item: any, idx: number) => 
        idx !== index && 
        item.materialType === materialType && 
        item.materialCode === materialCode && 
        item.oldSerialNo
      )
      .map((item: any) => item.oldSerialNo);
  }, [allItems, index, materialType, materialCode]);

  // Get new serial numbers already selected in other rows with same product type and material
  const selectedNewSerialsInOtherRows = useMemo(() => {
    return allItems
      .filter((item: any, idx: number) => 
        idx !== index && 
        item.materialType === materialType && 
        item.materialCode === materialCode && 
        item.newSerialNo
      )
      .map((item: any) => item.newSerialNo);
  }, [allItems, index, materialType, materialCode]);

  // Filtered old serials - exclude already selected in other rows
  const filteredOldSerialsList = useMemo(() => {
    return oldSerialsList.filter((item: any) => 
      !selectedOldSerialsInOtherRows.includes(item.serialNo)
    );
  }, [oldSerialsList, selectedOldSerialsInOtherRows]);

  // Filtered new serials - exclude already selected in other rows
  const filteredNewSerialsList = useMemo(() => {
    return newSerialsList.filter((item: any) => 
      !selectedNewSerialsInOtherRows.includes(item.serialNo)
    );
  }, [newSerialsList, selectedNewSerialsInOtherRows]);

  // Filter materials based on product type only
  const filteredMaterials = useMemo(() => {
    return materialsList.filter((mat: any) => {
      const matId = String(mat.productId);
      if (materialType) {
        const allowedIds = MATERIAL_TYPE_MAPPING[materialType] || [];
        if (!allowedIds.includes(matId)) return false;
      } else {
        return false;
      }
      return true;
    });
  }, [materialsList, materialType]);

  const selectedMaterial = materialsList.find((m: any) => m.productId === materialCode);

  let finalPrice = 0;
  let priceLabel = "";
  let isFree = false;

  if (selectedMaterial) {
    const basePrice = parseFloat(selectedMaterial.amount || '0');
    if (isWarrantyReason) {
      finalPrice = 0;
      isFree = true;
      priceLabel = "Covered under Warranty";
    } else {
      finalPrice = basePrice;
      isFree = false;
      priceLabel = "Chargeable";
    }
  }

  // Reset serial numbers when material changes
  const resetSerialNumbers = () => {
    form.setValue(`items.${index}.oldSerialNo`, "", { shouldValidate: false });
    form.setValue(`items.${index}.newSerialNo`, "", { shouldValidate: false });
  };

  // Reset material and serial numbers when product type changes
  const resetMaterialAndSerials = () => {
    form.setValue(`items.${index}.materialCode`, "", { shouldValidate: false });
    form.setValue(`items.${index}.oldSerialNo`, "", { shouldValidate: false });
    form.setValue(`items.${index}.newSerialNo`, "", { shouldValidate: false });
  };

  return (
    <Card className="border-l-4 border-l-azam-blue border-y border-r border-slate-200 shadow-none mb-3">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-semibold text-slate-500">Item #{index + 1}</span>
          {index > 0 && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FormField control={form.control} name={`items.${index}.materialType`} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs h-7">Product Type <span className="text-red-500">*</span></FormLabel>
              <Select 
                onValueChange={(val) => { 
                  field.onChange(val); 
                  resetMaterialAndSerials();
                }} 
                value={field.value || ""}
              >
                <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="CARD_LESS">Card Less Box</SelectItem>
                  <SelectItem value="STB">STB</SelectItem>
                  <SelectItem value="SC">Smart Card</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`items.${index}.materialCode`} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs h-7">Material <span className="text-red-500">*</span></FormLabel>
              <Select 
                onValueChange={(val) => {
                  field.onChange(val);
                  resetSerialNumbers();
                }} 
                value={field.value || ""}
                disabled={loadingMaterials || !materialType}
              >
                <FormControl><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Material" /></SelectTrigger></FormControl>
                <SelectContent>
                  {filteredMaterials.map((mat: any) => <SelectItem key={mat.productId} value={mat.productId}>{mat.productName}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <div className={`text-[10px] font-medium mt-1 flex items-center gap-1 ${isFree ? "text-green-600" : "text-orange-600"}`}>
                  <span>Price: {watchCurrency || selectedMaterial.currency || ''} {finalPrice.toLocaleString()}</span>
                  {priceLabel && <Badge variant="outline" className="text-[9px] h-4 px-1">{priceLabel}</Badge>}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )} />

          {/* OLD SERIAL - Dropdown from Agent Stock */}
          <FormField control={form.control} name={`items.${index}.oldSerialNo`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs h-6">Faulty Serial No <span className="text-red-500">*</span></FormLabel>
              <Popover open={popoverState.old} onOpenChange={(v) => togglePopover(index, 'old', v)}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button size="xs" variant="outline" role="combobox" className={cn("w-full justify-between pl-3 pr-3 text-xs font-normal text-left", !field.value && "text-muted-foreground")} disabled={!materialCode || loadingOldSerials || !watchBpId}>
                      {loadingOldSerials ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : field.value || "Select Faulty Serial"}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search..." className="h-7 text-xs" />
                    <CommandList>
                      <CommandEmpty>No serial found.</CommandEmpty>
                      <CommandGroup>
                        {filteredOldSerialsList.map((item: any) => (
                          <CommandItem key={item.serialNo} value={item.serialNo} onSelect={() => { form.setValue(`items.${index}.oldSerialNo`, item.serialNo, { shouldValidate: true }); togglePopover(index, 'old', false); }}>
                            <Check className={cn("mr-2 h-4 w-4", field.value === item.serialNo ? "opacity-100" : "opacity-0")} />
                            {item.serialNo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          {/* NEW SERIAL - Selected from Stock */}
          <FormField control={form.control} name={`items.${index}.newSerialNo`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs h-6">New Serial No <span className="text-red-500">*</span></FormLabel>
              <Popover open={popoverState.new} onOpenChange={(v) => togglePopover(index, 'new', v)}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button size="xs" variant="outline" role="combobox" className={cn("w-full justify-between pl-3 pr-3 text-xs font-normal text-left", !field.value && "text-muted-foreground")} disabled={!materialCode || loadingNewSerials || !watchIssuingCenter}>
                      {loadingNewSerials ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : field.value || "Select New Serial"}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search..." className="h-7 text-xs" />
                    <CommandList>
                      <CommandEmpty>No serial found.</CommandEmpty>
                      <CommandGroup>
                        {filteredNewSerialsList.map((item: any) => (
                          <CommandItem key={item.serialNo} value={item.serialNo} onSelect={() => { form.setValue(`items.${index}.newSerialNo`, item.serialNo, { shouldValidate: true }); togglePopover(index, 'new', false); }}>
                            <Check className={cn("mr-2 h-4 w-4", field.value === item.serialNo ? "opacity-100" : "opacity-0")} />
                            {item.serialNo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </CardContent>
    </Card>
  );
}
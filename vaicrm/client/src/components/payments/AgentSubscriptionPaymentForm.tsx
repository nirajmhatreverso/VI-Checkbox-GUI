import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, subMonths } from "date-fns";

import { agentHwPaymentInitiateSchema, type AgentHwPaymentInitiate } from "@shared/schema";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

import { CreditCard, Loader2, CheckCircle2, XCircle, Calendar as CalendarIcon, Filter } from "lucide-react";
import ParentAgentSearchModal from "@/components/agents/ParentAgentSearchModal";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const sanitizeDescription = (s?: string) => (s || "").replace(/<[^>]*>/g, "");

type AgentApiItem = {
  agentName: string;
  sapBpId: string;
  sapCaId?: string;
  division: string;
  currency?: string;
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  ward?: string;
  mobile?: string;
  email?: string;
  status?: string;
  salesOrg?: string;
};

export default function AgentSubscriptionPaymentForm() {
  const [hwBalance, setHwBalance] = useState<{ balance?: number; subsCredit?: number; currency?: string; message?: string } | null>(null);
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const queryClient = useQueryClient();

  // Role Check - Include both Admin and Warehouse users
  const isAdminUser = (user?.allAccess || "N") === "Y";
  const isWarehouseUser = (user?.isMainPlant || "N") === "Y";
  const canSearchAgents = isAdminUser || isWarehouseUser; // Both can search agents

  // UPDATED: Handle Sub-Agent / Employee login by falling back to parentSapBpId
  const loggedInUserBpId = user?.sapBpId || user?.parentSapBpId || "";

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AgentHwPaymentInitiate>({
    resolver: zodResolver(agentHwPaymentInitiateSchema),
    defaultValues: {
      sapBpId: "",
      collectedBy: "",
      collectionCenter: "NA",
      payMode: canSearchAgents ? "CASH" : "BANK_DEPOSIT",
      currency: "",
      payAmount: "" as any,
      chequeNo: "",
      bankName: "",
      chequeDate: "",
      branchName: "",
      receiptNo: "",
      description: "",
      type: "AGENT",
      isSecurityDeposit: false,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentApiItem | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const payMode = watch("payMode");
  const chequeDate = watch("chequeDate");
  const formCurrency = watch("currency");
  const countryName = user?.country || "";
  const selectedBank = watch("bankName");

  // Calculate date ranges
  const today = new Date();
  // For bank deposit date - last 1 month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);

  // --- 1. Fetch Bank List Logic ---
  const { data: bankOptions, isLoading: bankLoading } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["banks-config"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest('/dropdowns/config', 'POST', { configKey: "bankName", salesOrg: currentSalesOrg });
      const list = res?.data?.configItemsList?.bankName || [];
      return list.map((b: any) => ({
        value: b.value,
        label: b.name
      }));
    },
  });

  // --- 2. Reset Branch Name when Bank or PayMode Changes ---
  useEffect(() => {
    setValue("branchName", "");
  }, [selectedBank, payMode, setValue]);

  useEffect(() => {
    setValue("chequeNo", "");
    clearErrors("chequeNo");
    clearErrors("chequeDate");
  }, [payMode, setValue, clearErrors]);

  // ✅ UPDATED: Fetch Agent & Balance Logic with currency
  const fetchAgentAndBalance = async (bp: string) => {
    if (!currentSalesOrg) {
      toast({ title: "Configuration Error", description: "Sales Org missing in user profile.", variant: "destructive" });
      return;
    }

    setAgentLoading(true);
    setHwBalance(null);
    setSelectedAgent(null);

    try {
      const userRes = await apiRequest('/agents/user-details', 'POST', {
        type: 'Agent',
        sapBpId: bp,
        salesOrg: currentSalesOrg,
        isSubCollection: "Y"
      });

      const rawData = (userRes as any)?.data;
      const list: any[] = rawData?.customerDetails || [];

      let matchedRecord = null;
      let matchedRelatedParty = null;

      for (const item of list) {
        if (Array.isArray(item.relatedParty)) {
          const rp = item.relatedParty.find((r: any) => String(r.sapBpId) === bp);
          if (rp) {
            matchedRecord = item;
            matchedRelatedParty = rp;
            break;
          }
        }
      }

      if (matchedRecord && matchedRelatedParty) {
        const contactList = Array.isArray(matchedRecord.contactMedium) ? matchedRecord.contactMedium : [];
        const addressInfo = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
        const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
        const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

        // ✅ ADDED: Extract currency from relatedParty
        const agentCurrency = matchedRelatedParty.currency || formCurrency || "";

        const mappedAgent: AgentApiItem = {
          agentName: `${matchedRecord.firstName || ''} ${matchedRecord.lastName || ''}`.trim(),
          sapBpId: matchedRelatedParty.sapBpId,
          sapCaId: matchedRelatedParty.sapCaId,
          division: matchedRelatedParty.division || "",
          currency: agentCurrency,  // ✅ ADDED: Store currency
          country: addressInfo.country,
          region: addressInfo.region,
          city: addressInfo.city,
          district: addressInfo.district,
          ward: addressInfo.ward,
          mobile: mobileInfo.value,
          email: emailInfo.value,
          status: matchedRecord.status,
          salesOrg: matchedRelatedParty.salesOrg || currentSalesOrg
        };

        setSelectedAgent(mappedAgent);
        clearErrors("sapBpId");

        // ✅ ADDED: Auto-set currency if found
        if (agentCurrency && !getValues("currency")) {
          setValue("currency", agentCurrency, { shouldValidate: true });
        }

        try {
          const balRes = await apiRequest("/hardware-sales/customer/balance", "POST", {
            sapBpId: bp,
            sapCaId: matchedRelatedParty.sapCaId,
            currency: agentCurrency,
            salesOrg: currentSalesOrg
          });

          if (balRes?.status === "SUCCESS" && balRes?.data) {
            setHwBalance({
              balance: Number(balRes.data.subsBalance || balRes.data.eligibleAmount || 0),  // ✅ Use subsBalance
              subsCredit: Number(balRes.data.subsCredit || 0),  // ✅ ADDED: Subscription Credit
              currency: balRes.data.currency || agentCurrency,
              message: balRes.statusMessage
            });
          } else if (balRes?.statusCode === 404) {
            setHwBalance({ balance: 0, subsCredit: 0, currency: agentCurrency, message: "No balance record found" });
          } else {
            setHwBalance({ message: balRes?.statusMessage || "Balance unavailable" });
          }
        } catch (e: any) {
          setHwBalance({ balance: 0, subsCredit: 0, currency: agentCurrency, message: e?.statusMessage || "Failed to fetch balance" });
        }

      } else {
        setError("sapBpId", { message: "Agent not found in this Sales Org" });
      }

    } catch (error) {
      setError("sapBpId", { message: "Verification failed" });
    } finally {
      setAgentLoading(false);
    }
  };

  const fetchBalance = async (sapBpId: string, sapCaId: string, currency: string) => {
    try {
      const balRes = await apiRequest("/hardware-sales/customer/balance", "POST", {
        sapBpId: sapBpId,
        sapCaId: sapCaId,
        currency: currency,
        salesOrg: currentSalesOrg
      });

      if (balRes?.status === "SUCCESS" && balRes?.data) {
        setHwBalance({
          balance: Number(balRes.data.subsBalance || balRes.data.eligibleAmount || 0),  // ✅ Use subsBalance
          subsCredit: Number(balRes.data.subsCredit || 0),  // ✅ ADDED: Subscription Credit
          currency: balRes.data.currency || currency,
          message: balRes.statusMessage
        });
      } else if (balRes?.statusCode === 404) {
        setHwBalance({ balance: 0, subsCredit: 0, currency: currency, message: "No balance record found" });
      } else {
        setHwBalance({ balance: 0, subsCredit: 0, currency: currency, message: balRes?.statusMessage || "Balance unavailable" });
      }
    } catch (e: any) {
      setHwBalance({ balance: 0, subsCredit: 0, currency: currency, message: e?.statusMessage || "Failed to fetch balance" });
    }
  };

  // --- Auto-Initialize Logged-in Agent (Only for regular agents, not admin/warehouse) ---
  useEffect(() => {
    if (!canSearchAgents && loggedInUserBpId) {
      setValue("sapBpId", loggedInUserBpId);
      // Auto-fetch details
      fetchAgentAndBalance(loggedInUserBpId);
    }
  }, [canSearchAgents, loggedInUserBpId, setValue]);

  useEffect(() => {
    // Only fetch if we have a selected agent and a currency is selected
    if (selectedAgent && selectedAgent.sapBpId && selectedAgent.sapCaId && formCurrency) {
      fetchBalance(selectedAgent.sapBpId, selectedAgent.sapCaId, formCurrency);
    }
  }, [formCurrency, selectedAgent?.sapBpId, selectedAgent?.sapCaId]);

  const { data: collectedByOptions } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["collected-by-list", canSearchAgents],
    enabled: !!user,
    queryFn: async () => {
      if (canSearchAgents) {
        const res = await apiRequest('/data/collected-by', 'POST', { type: ["MAIN_PLANT"], salesOrg: currentSalesOrg });
        const list: any[] = res?.data?.collectedByList ?? [];
        return list.map((x) => ({ value: x.sapBpId, label: x.name }));
      }
      const value = user?.sapBpId || "";
      const label = (user as any)?.name || user?.username || "User";
      return value ? [{ value, label }] : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const current = getValues("collectedBy");
    if (!current && collectedByOptions && collectedByOptions.length === 1) {
      setValue("collectedBy", collectedByOptions[0].value, { shouldValidate: true });
    }
  }, [collectedByOptions, getValues, setValue]);

  const { data: currencyOptions, isLoading: currencyLoading, isError: currencyIsError } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["currency-by-country", countryName],
    enabled: !!countryName && !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest('/data/currency', 'POST', { countryName, status: "", currencyCode: "", salesOrg: currentSalesOrg });
      const currencyRows: any[] = res?.data?.data ?? [];
      return currencyRows.map((r) => ({ value: r.currencyCode, label: `${r.currencyCode} - ${r.countryName}` }));
    },
  });

  useEffect(() => {
    const current = getValues("currency");

    // If a value is already selected, don't overwrite it
    if (current) return;

    if (currencyOptions && currencyOptions.length > 0) {
      // 1. Specific Rule: If country is Zimbabwe, default to USD if it exists in the list
      if (countryName && countryName.toLowerCase() === "zimbabwe") {
        const hasUSD = currencyOptions.some((opt) => opt.value === "USD");
        if (hasUSD) {
          setValue("currency", "USD", { shouldValidate: true });
          return;
        }
      }

      // 2. Generic Rule: If there is only one option available, auto-select it
      if (currencyOptions.length === 1) {
        setValue("currency", currencyOptions[0].value, { shouldValidate: true });
      }
    }
  }, [currencyOptions, getValues, setValue, countryName]);

  const handleFilterSelect = (agent: any) => {
    const bp = agent.sapBpId.slice(0, 10);
    setValue("sapBpId", bp, { shouldValidate: true });
    setShowFilterModal(false);
    fetchAgentAndBalance(bp);
  };

  const { mutate: initiatePayment, isPending } = useMutation({
    mutationFn: (payload: any) => apiRequest('/agent-payments/subscription/initiate', 'POST', payload),
    onSuccess: (res: any) => {
      const msg = res?.statusMessage || res?.data?.message || "Successfully initiated";
      toast({ title: "Subscription Payment Initiated", description: msg });
      reset();
      setSelectedAgent(null);
      setHwBalance(null);
      // Re-init for agent after reset (only for regular agents)
      if (!canSearchAgents && loggedInUserBpId) {
        setValue("sapBpId", loggedInUserBpId);
        fetchAgentAndBalance(loggedInUserBpId);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription-approvals'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.statusMessage || err?.message || "Failed to initiate payment", variant: "destructive" });
    },
  });

  const onSubmit = async (data: AgentHwPaymentInitiate) => {
    if (!data.sapBpId) { setError("sapBpId", { message: "Agent BP is required" }); return; }

    if (!selectedAgent || selectedAgent.sapBpId !== data.sapBpId) {
      if (canSearchAgents) {
        setError("sapBpId", { message: "Please re-select the agent using the filter." });
        return;
      } else {
        // For Agent, if data matches logged in ID, proceed even if selectedAgent state is lagging
        // (Though selectedAgent should be populated by the auto-init)
        if (data.sapBpId !== loggedInUserBpId) {
          setError("sapBpId", { message: "Invalid Agent ID." });
          return;
        }
      }
    }

    // Validate Bank Deposit Date is mandatory for BANK_DEPOSIT
    if (data.payMode === "CHEQUE" && !data.chequeDate) {
  setError("chequeDate", { message: "Cheque Date is required" });
  return;
}

// Validate Bank Deposit Date is mandatory for BANK_DEPOSIT
if (data.payMode === "BANK_DEPOSIT" && !data.chequeDate) {
  setError("chequeDate", { message: "Bank Deposit Date is required" });
  return;
}

// Clear errors if not CHEQUE or BANK_DEPOSIT
if (data.payMode !== "BANK_DEPOSIT" && data.payMode !== "CHEQUE") {
  clearErrors("chequeDate");
}

    if (data.payMode === "BANK_DEPOSIT" && !data.chequeNo) {
      setError("chequeNo", { message: "Bank Deposit ID is required" });
      return;
    } else if (data.payMode === "BANK_DEPOSIT") {
      clearErrors("chequeNo");
    }

    // Validate Cheque Number is mandatory for CHEQUE
    if (data.payMode === "CHEQUE" && !data.chequeNo) {
      setError("chequeNo", { message: "Cheque Number is required" });
      return;
    }

    // --- REQUIREMENT 1: Validate Amount ---
    // Remove commas to verify value
    const rawAmount = String(data.payAmount || "0").replace(/,/g, "");
    const numAmount = parseFloat(rawAmount);

    // Check for 0 or negative
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("payAmount", { message: "Amount must be greater than 0" });
      return; // Stop submission
    } else {
      clearErrors("payAmount");
    }

    const payload = {
      ...data,
      division: selectedAgent?.division || "",
      sapCaId: selectedAgent?.sapCaId || "",
      payAmount: rawAmount, // cleaned string
      country: user?.country || "",
      name: selectedAgent?.agentName || "",
      channel: "NA",
      collectedBySapCaId: "",
      storeLocation: "",
      description: sanitizeDescription(data.description || ""),
      isSecurityDeposit: data.isSecurityDeposit ? "true" : "false",
      salesOrg: selectedAgent?.salesOrg || currentSalesOrg || "",
    };

    initiatePayment(payload);
  };

  const agentRightIcon = agentLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : selectedAgent ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : undefined;
  const getCityName = (val?: string) => val ? val.split('_')[0] : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"> <CreditCard className="w-5 h-5" /> New Subscription Payment </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label>Agent BP <span className="text-red-500">*</span></Label>
                {/* Show Filter for Admin and Warehouse users */}
                {canSearchAgents && (
                  <Button type="button" variant="ghost" size="xs" onClick={() => setShowFilterModal(true)} title="Filter & select Agent">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="ml-1 text-xs text-blue-700">Filter</span>
                  </Button>
                )}
              </div>
              <Input
                uiSize="sm"
                placeholder={canSearchAgents ? "Click Filter..." : "Loading..."}
                {...register("sapBpId")}
                readOnly
                // Allow click if Admin or Warehouse user
                onClick={() => canSearchAgents && setShowFilterModal(true)}
                className={`${canSearchAgents ? 'cursor-pointer' : 'bg-gray-100 cursor-not-allowed'} focus:ring-0`}
                rightIcon={agentRightIcon}
                aria-invalid={!!errors.sapBpId || undefined}
              />
              {errors.sapBpId && <p className="text-xs text-red-600 mt-1">{errors.sapBpId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Collected By <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="collectedBy"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger uiSize="sm" aria-invalid={!!errors.collectedBy || undefined}>
                      <SelectValue placeholder="Select collector" />
                    </SelectTrigger>
                    <SelectContent>
                      {(collectedByOptions || []).length === 0 ? <SelectItem value="loading" disabled>Loading...</SelectItem> : (collectedByOptions || []).map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.collectedBy && <p className="text-xs text-red-600 mt-1">{errors.collectedBy.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Payment Mode <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="payMode"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger uiSize="sm" aria-invalid={!!errors.payMode || undefined}>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show CASH for Admins and Warehouse users */}
                      {canSearchAgents && <SelectItem value="CASH">Cash</SelectItem>}
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                      {/* <SelectItem value="POS">POS</SelectItem> */}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.payMode && <p className="text-xs text-red-600 mt-1">{errors.payMode.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="payAmount"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="0.00"
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits, commas, and one decimal
                      if (/^[\d,]*\.?\d*$/.test(value)) {
                        // --- REQUIREMENT 1: Max 10 digits check ---
                        // Remove commas to verify length of integer part
                        const cleanVal = value.replace(/,/g, "");
                        const [intPart] = cleanVal.split('.');
                        if (intPart.length <= 10) {
                          field.onChange(value);
                        }
                      }
                    }}
                    aria-invalid={!!errors.payAmount || undefined}
                  />
                )}
              />
              {errors.payAmount && <p className="text-xs text-red-600 mt-1">{errors.payAmount.message}</p>}
            </div>

            <div className="space-y-2">
  <Label>Currency <span className="text-red-500">*</span></Label>
  <Controller
    control={control}
    name="currency"
    render={({ field }) => (
      <Select onValueChange={field.onChange} value={field.value ?? ""}>
        <SelectTrigger uiSize="sm" aria-invalid={!!errors.currency || undefined}>
          <SelectValue placeholder={currencyLoading ? "Loading..." : "Select currency"} />
        </SelectTrigger>
        <SelectContent>
          {currencyLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : currencyIsError ? <SelectItem value="error" disabled>Error</SelectItem> : (currencyOptions || []).map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
        </SelectContent>
      </Select>
    )}
  />
  {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency.message}</p>}
</div>

{/* Is Security Deposit - Moved here after Currency */}
<div className="space-y-2 flex items-end pb-1">
  <div className="flex items-center space-x-2">
    <Controller
      control={control}
      name="isSecurityDeposit"
      render={({ field }) => (
        <Checkbox
          id="security-deposit"
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      )}
    />
    <Label htmlFor="security-deposit" className="cursor-pointer font-medium whitespace-nowrap">
      Is Security Deposit?
    </Label>
  </div>
</div>

            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Controller
                control={control}
                name="receiptNo"
                render={({ field }) => (
                  <Input
                    placeholder="Enter Receipt No"
                    value={field.value ?? ''}
                    maxLength={10} // Requirement 2: Max 10 chars
                    onChange={(e) => {
                      // Requirement 2: Enforce slice logic for robustness
                      field.onChange(e.target.value.slice(0, 10));
                    }}
                  />
                )}
              />
              {errors.receiptNo && <p className="text-xs text-red-600 mt-1">{errors.receiptNo.message}</p>}
            </div>

            {/* Cheque Details */}
            {payMode === "CHEQUE" && (
              <div className="col-span-1 md:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border">
                {/* REQUIREMENT 1: Cheque Number - Max 20 chars, no special characters */}
                <div className="space-y-2">
                  <Label>Cheque Number <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="chequeNo"
                    render={({ field }) => (
                      <Input
                        placeholder="Cheque No"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          // Allow only alphanumeric characters, max 20
                          const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                          field.onChange(value);
                        }}
                        maxLength={20}
                        aria-invalid={!!errors.chequeNo || undefined}
                      />
                    )}
                  />
                  {errors.chequeNo && <p className="text-xs text-red-600 mt-1">{errors.chequeNo.message}</p>}
                </div>

                <div className="space-y-2">
  <Label>Cheque Date <span className="text-red-500">*</span></Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button 
        size="xs" 
        type="button" 
        variant="outline" 
        className={`w-full justify-start text-left font-normal ${errors.chequeDate ? 'border-red-500' : ''}`}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {chequeDate ? format(new Date(chequeDate), "PPP") : "Pick a date"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={chequeDate ? new Date(chequeDate) : undefined}
        onSelect={(d) => {
          setValue("chequeDate", d ? toYmd(d) : "", { shouldValidate: true });
          if (d) {
            clearErrors("chequeDate");
          }
        }}
        initialFocus
        // Disable future dates and dates older than 6 months (stale cheque rule)
        disabled={(date) => date > new Date() || date < subMonths(new Date(), 6)}
      />
    </PopoverContent>
  </Popover>
  {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
</div>

                {/* Bank Name Dropdown */}
                <div className="space-y-2">
                  <Label>Deposit Bank Name <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="bankName"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger uiSize="sm" aria-invalid={!!errors.bankName || undefined}>
                          <SelectValue placeholder={bankLoading ? "Loading..." : "Select Bank"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(bankOptions || []).map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName.message}</p>}
                </div>

                {/* REQUIREMENT 2: Branch Name - No special characters */}
                <div className="space-y-2">
                  <Label>Deposit Branch Name</Label>
                  <Controller
                    control={control}
                    name="branchName"
                    render={({ field }) => (
                      <Input
                        placeholder="Deposit Branch Name"
                        disabled={!selectedBank}
                        maxLength={50}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          // Remove all non-letter and non-space characters
                          const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          field.onChange(value);
                        }}
                        ref={field.ref}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* Bank Deposit Details - with Bank Deposit Date */}
            {payMode === "BANK_DEPOSIT" && (
              <div className="col-span-1 md:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border">
                {/* Bank Deposit ID - Max 20 chars, no special characters, MANDATORY */}
                <div className="space-y-2">
                  <Label>Bank Deposit ID <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="chequeNo"
                    render={({ field }) => (
                      <Input
                        placeholder="Bank Deposit ID"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          // Allow only alphanumeric characters, max 20
                          const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                          field.onChange(value);
                        }}
                        maxLength={20}
                        aria-invalid={!!errors.chequeNo || undefined}
                      />
                    )}
                  />
                  {errors.chequeNo && <p className="text-xs text-red-600 mt-1">{errors.chequeNo.message}</p>}
                </div>

                {/* Bank Name Dropdown */}
                <div className="space-y-2">
                  <Label>Deposit Bank Name <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="bankName"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger uiSize="sm" aria-invalid={!!errors.bankName || undefined}>
                          <SelectValue placeholder={bankLoading ? "Loading..." : "Select Bank"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(bankOptions || []).map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName.message}</p>}
                </div>

                {/* Branch Name - No special characters */}
                <div className="space-y-2">
                  <Label>Deposit Branch Name</Label>
                  <Controller
                    control={control}
                    name="branchName"
                    render={({ field }) => (
                      <Input
                        placeholder="Deposit Branch Name"
                        disabled={!selectedBank}
                        maxLength={100}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          // Remove all non-letter and non-space characters
                          const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          field.onChange(value);
                        }}
                        ref={field.ref}
                      />
                    )}
                  />
                </div>

                {/* Bank Deposit Date - Last 1 month only, no future dates, stored in chequeDate, MANDATORY */}
                <div className="space-y-2">
                  <Label>Bank Deposit Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        type="button"
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.chequeDate ? 'border-red-500' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {chequeDate ? format(new Date(chequeDate), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={chequeDate ? new Date(chequeDate) : undefined}
                        onSelect={(d) => {
                          setValue("chequeDate", d ? toYmd(d) : "", { shouldValidate: true });
                          if (d) {
                            clearErrors("chequeDate");
                          }
                        }}
                        initialFocus
                        disabled={(date) => {
                          // Disable future dates and dates older than 1 month
                          return date > today || date < oneMonthAgo;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
                </div>
              </div>
            )}
          </div>

          {selectedAgent && (
            <div className="mt-8 p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base font-bold text-azam-orange tracking-wide">Agent Details</span>
              </div>

              <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
                <div><span className="text-azam-orange font-semibold">Name:</span> {selectedAgent.agentName}</div>
                <div><span className="text-azam-orange font-semibold">BP ID:</span> {selectedAgent.sapBpId}</div>
                {selectedAgent.sapCaId && <div><span className="text-azam-orange font-semibold">CA ID:</span> {selectedAgent.sapCaId}</div>}

                {selectedAgent.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {selectedAgent.mobile}</div>}
                {selectedAgent.email && <div><span className="text-azam-orange font-semibold">Email:</span> {selectedAgent.email}</div>}

                {selectedAgent.country && <div><span className="text-azam-orange font-semibold">Country:</span> {selectedAgent.country}</div>}
                {selectedAgent.region && <div><span className="text-azam-orange font-semibold">Region:</span> {selectedAgent.region}</div>}
                {selectedAgent.city && <div><span className="text-azam-orange font-semibold">City:</span> {getCityName(selectedAgent.city)}</div>}
                {selectedAgent.district && <div><span className="text-azam-orange font-semibold">District:</span> {selectedAgent.district}</div>}
                {selectedAgent.ward && <div><span className="text-azam-orange font-semibold">Ward:</span> {selectedAgent.ward}</div>}
              </div>

              <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex flex-wrap items-center gap-x-8 gap-y-2">
                {/* Subscription Balance */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-azam-orange">Subscription Balance:</span>
                  {hwBalance?.balance !== undefined
                    ? <span className="font-bold text-gray-900">{hwBalance.balance.toLocaleString()} {hwBalance.currency}</span>
                    : <span className="font-bold text-red-600">{hwBalance?.message || "Balance info unavailable"}</span>}
                </div>

                {/* Subscription Credit - NEW */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-azam-orange">Subscription Credit:</span>
                  {hwBalance?.subsCredit !== undefined
                    ? <span className="font-bold text-green-700">{hwBalance.subsCredit.toLocaleString()} {hwBalance.currency}</span>
                    : <span className="font-bold text-gray-400">-</span>}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Enter payment description" rows={3} className="resize-none" />
            {/* <p className="text-[10px] text-gray-500">HTML is removed for safety</p> */}
          </div>

          {/* ✅ Is Security Deposit Checkbox with Red Asterisk */}
          

          <div className="flex justify-end pt-2">
            <Button type="submit" size="xs" disabled={isSubmitting || isPending} className="w-full sm:w-auto bg-azam-blue hover:bg-azam-blue/90">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Payment"}
            </Button>
          </div>

          <ParentAgentSearchModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} onSelect={handleFilterSelect} isSubCollection="Y" />
        </form>
      </CardContent>
    </Card>
  );
}
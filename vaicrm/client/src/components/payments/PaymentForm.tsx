import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

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

import { CreditCard, Loader2, CheckCircle2, Calendar as CalendarIcon, Filter } from "lucide-react";
import ParentAgentSearchModal from "../agents/ParentAgentSearchModal";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");
const sanitizeDescription = (s?: string) => (s || "").replace(/<[^>]*>/g, "");

type CurrencyApiRow = { currencyCode: string; countryName: string; };
type CollectedByItem = { name: string; sapBpId: string; sapCaId?: string };

type AgentApiItem = {
  agentName: string;
  sapBpId: string;
  sapCaId?: string;
  division: string;
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  ward?: string;
  mobile?: string;
  email?: string;
  status?: string;
  currency?: string;
};

export default function PaymentForm() {
  const [hwBalance, setHwBalance] = useState<{ balance?: number; currency?: string; message?: string } | null>(null);
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const queryClient = useQueryClient();

  const isAdminUser = (user?.allAccess || "N") === "Y";
  const isMainPlantUser = (user?.isMainPlant || "N") === "Y";
  const isOtcUser = (user?.isOtc || "N") === "Y";

  const canSearchAgents = isAdminUser || isMainPlantUser;
  const canUseCash = isAdminUser || isMainPlantUser || isOtcUser;

  const loggedInUserBpId = (!canSearchAgents) ? (user?.sapBpId || user?.parentSapBpId || "") : "";

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
      payMode: canUseCash ? "CASH" : "BANK_DEPOSIT",
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
  const watchedSapBpId = watch("sapBpId");

  // Calculate date ranges
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  // For bank deposit date - last 1 month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);

  useEffect(() => {
    const fetchUpdatedBalance = async () => {
      if (!watchedSapBpId || !formCurrency || !currentSalesOrg) return;

      try {
        const balRes = await apiRequest("/hardware-sales/balance", "POST", {
          sapBpId: watchedSapBpId,
          salesOrg: currentSalesOrg,
          currency: formCurrency
        });

        if (balRes?.status === "SUCCESS" && balRes?.data) {
          setHwBalance({
            balance: balRes.data.balance,
            currency: balRes.data.currency,
            message: balRes.data.message
          });
        } else if (balRes?.statusCode === 404) {
          setHwBalance({
            balance: 0,
            currency: formCurrency,
            message: "No balance record found"
          });
        } else {
          setHwBalance({
            balance: 0,
            currency: formCurrency,
            message: balRes?.statusMessage || "Balance unavailable"
          });
        }
      } catch (e) {
        setHwBalance({
          balance: 0,
          currency: formCurrency,
          message: "Failed to fetch balance"
        });
      }
    };

    fetchUpdatedBalance();
  }, [formCurrency, watchedSapBpId, currentSalesOrg]);

  const { data: bankOptions, isLoading: bankLoading } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["banks-config"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest('/dropdowns/config', 'POST', { configKey: "bankName" });
      const list = res?.data?.configItemsList?.bankName || [];
      return list.map((b: any) => ({
        value: b.value,
        label: b.name
      }));
    },
  });

  // Reset branchName and chequeNo on payment mode change OR bank change
  useEffect(() => {
    setValue("branchName", "");
  }, [selectedBank, payMode, setValue]);

  // Clear chequeNo when switching payment modes (since it's used for different purposes)
  useEffect(() => {
    setValue("chequeNo", "");
    clearErrors("chequeNo");
  }, [payMode, setValue, clearErrors]);

  useEffect(() => {
    if (payMode === "BANK_DEPOSIT" || payMode === "CHEQUE") {
      // Validation handled in onSubmit
    } else {
      clearErrors("bankName");
      setValue("bankName", "");
    }
  }, [payMode, clearErrors, setValue]);

  const formatCurrency = (val: string) => {
    if (!val) return "";
    const num = parseFloat(val.toString().replace(/,/g, ""));
    if (isNaN(num)) return val;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
        isSubCollection: "N"
      });

      const rawData = (userRes as any)?.data;
      const list: any[] = rawData?.customerDetails || [];

      let matchedRecord = null;
      let matchedRelatedParty = null;
      let agentCurrency = "";

      for (const item of list) {
        if (Array.isArray(item.relatedParty)) {
          const rp = item.relatedParty.find((r: any) => String(r.sapBpId) === bp);
          if (rp) {
            matchedRecord = item;
            matchedRelatedParty = rp;
            if (rp.currency) agentCurrency = rp.currency;
            break;
          }
        }
      }

      if (matchedRecord && matchedRelatedParty) {
        const contactList = Array.isArray(matchedRecord.contactMedium) ? matchedRecord.contactMedium : [];
        const addressInfo = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
        const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
        const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

        const mappedAgent: AgentApiItem = {
          agentName: `${matchedRecord.firstName || ''} ${matchedRecord.lastName || ''}`.trim(),
          sapBpId: matchedRelatedParty.sapBpId,
          sapCaId: matchedRelatedParty.sapCaId,
          division: matchedRelatedParty.division || "",
          country: addressInfo.country,
          region: addressInfo.region,
          city: addressInfo.city,
          district: addressInfo.district,
          ward: addressInfo.ward,
          mobile: mobileInfo.value,
          email: emailInfo.value,
          status: matchedRecord.status,
          currency: agentCurrency
        };

        setSelectedAgent(mappedAgent);
        clearErrors("sapBpId");

        if (agentCurrency) {
          setValue("currency", agentCurrency);
        }

        try {
          const balRes = await apiRequest("/hardware-sales/balance", "POST", {
            sapBpId: bp,
            salesOrg: currentSalesOrg,
            currency: agentCurrency
          });

          if (balRes?.status === "SUCCESS" && balRes?.data) {
            setHwBalance({ balance: balRes.data.balance, currency: balRes.data.currency, message: balRes.data.message });
          } else if (balRes?.statusCode === 404) {
            setHwBalance({ balance: 0, currency: formCurrency || "", message: "No balance record found" });
          } else {
            setHwBalance({ message: balRes?.statusMessage || "Balance unavailable" });
          }
        } catch (e) {
          setHwBalance({ balance: 0, currency: formCurrency || "", message: "Failed to fetch balance" });
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

  useEffect(() => {
    if (!canSearchAgents && loggedInUserBpId && currentSalesOrg) {
      setValue("sapBpId", loggedInUserBpId);
      fetchAgentAndBalance(loggedInUserBpId);
    }
  }, [canSearchAgents, loggedInUserBpId, currentSalesOrg, setValue]);

  const { data: collectedByOptions } = useQuery<Array<{ value: string; label: string }>>({
  queryKey: ["collected-by-list", canSearchAgents],
  enabled: !!user,
  queryFn: async () => {
    if (canSearchAgents) {
      // For Admin/MainPlant users - fetch from API
      const res = await apiRequest('/data/collected-by', 'POST', { type: ["MAIN_PLANT"] });
      const list: CollectedByItem[] = res?.data?.collectedByList ?? [];
      // sapBpId as value, name as label
      // Note: If same sapBpId has multiple names, only first will be selectable
      return list.map((x) => ({ 
        value: x.sapBpId,
        label: `${x.name} (${x.sapBpId})`  // Show name with sapBpId for clarity
      }));
    }
    // For Agent/OTC login - use logged-in user's info
    const bpId = user?.sapBpId || user?.parentSapBpId || "";
    const name = (user as any)?.name || user?.username || "User";
    return bpId ? [{ value: bpId, label: `${name} (${bpId})` }] : [];
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
      const res = await apiRequest('/data/currency', 'POST', { countryName, status: "", currencyCode: "" });
      const currencyRows: CurrencyApiRow[] = res?.data?.data ?? [];
      return currencyRows.map((r) => ({ value: r.currencyCode, label: `${r.currencyCode} - ${r.countryName}` }));
    },
  });

  useEffect(() => {
    const current = getValues("currency");
    if (current) return;

    if (currencyOptions && currencyOptions.length > 0) {
      if (countryName && countryName.toLowerCase() === "zimbabwe") {
        const hasUSD = currencyOptions.some((opt) => opt.value === "USD");
        if (hasUSD) {
          setValue("currency", "USD", { shouldValidate: true });
          return;
        }
      }

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
    mutationFn: (payload: any) => apiRequest('/agent-payments/initiate', 'POST', payload),
    onSuccess: (res: any) => {
      toast({ title: "Payment Initiated", description: res?.statusMessage || "Successfully initiated" });
      reset();
      setSelectedAgent(null);
      setHwBalance(null);
      if (!canSearchAgents && loggedInUserBpId) {
        setValue("sapBpId", loggedInUserBpId);
        fetchAgentAndBalance(loggedInUserBpId);
      }
      queryClient.invalidateQueries({ queryKey: ['hw-approvals'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.statusMessage || err?.message || "Failed to initiate payment", variant: "destructive" });
    },
  });

  const onSubmit = async (data: AgentHwPaymentInitiate) => {
  if (!data.sapBpId) {
    setError("sapBpId", { message: "Agent BP is required" });
    return;
  }

  if (!selectedAgent || selectedAgent.sapBpId !== data.sapBpId) {
    if (canSearchAgents) {
      setError("sapBpId", { message: "Please re-select the agent using the filter." });
      return;
    } else {
      if (data.sapBpId !== loggedInUserBpId) {
        setError("sapBpId", { message: "Invalid Agent ID." });
        return;
      }
    }
  }

  if (data.payMode === "CASH" && data.receiptNo && !/^\d{1,10}$/.test(data.receiptNo)) {
    setError("receiptNo", { message: "Receipt No must be up to 10 digits" });
    return;
  }

  if ((data.payMode === "BANK_DEPOSIT" || data.payMode === "CHEQUE") && !data.bankName) {
    setError("bankName", { message: "Bank Name is required" });
    return;
  } else {
    clearErrors("bankName");
  }

  if (data.payMode === "CHEQUE" && !data.chequeDate) {
    setError("chequeDate", { message: "Cheque Date is required" });
    return;
  }

  if (data.payMode === "BANK_DEPOSIT" && !data.chequeDate) {
    setError("chequeDate", { message: "Bank Deposit Date is required" });
    return;
  }

  if (data.payMode !== "BANK_DEPOSIT" && data.payMode !== "CHEQUE") {
    clearErrors("chequeDate");
  }

  if (data.payMode === "BANK_DEPOSIT" && !data.chequeNo) {
    setError("chequeNo", { message: "Bank Deposit ID is required" });
    return;
  } else if (data.payMode === "BANK_DEPOSIT") {
    clearErrors("chequeNo");
  }

  if (data.payMode === "CHEQUE" && !data.chequeNo) {
    setError("chequeNo", { message: "Cheque Number is required" });
    return;
  }

  const rawAmount = String(data.payAmount || "0").replace(/,/g, "");
  const numAmount = parseFloat(rawAmount);

  if (isNaN(numAmount) || numAmount <= 0) {
    setError("payAmount", { message: "Amount must be greater than 0" });
    return;
  } else {
    clearErrors("payAmount");
  }

  // Extract sapBpId from combined value (sapBpId|name)
  const collectedBySapBpId = data.collectedBy?.split("|")[0] || "";

  const payload = {
    ...data,
    collectedBy: collectedBySapBpId,  // Send only sapBpId in payload
    division: selectedAgent?.division || "",
    sapCaId: selectedAgent?.sapCaId || "",
    payAmount: rawAmount,
    country: user?.country || "",
    name: selectedAgent?.agentName || user?.name || "",
    description: sanitizeDescription(data.description || ""),
    isSecurityDeposit: "false"
  };

  initiatePayment(payload);
};

  const agentRightIcon = agentLoading ? (
    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
  ) : selectedAgent ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : undefined;

  const getCityName = (val?: string) => val ? val.split('_')[0] : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> New Agent Hardware Payment
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">

            {/* Agent BP */}
            <div className="space-y-2 relative">
              <Label>Agent BP <span className="text-red-500">*</span></Label>

              {/* Position Filter button absolutely so it doesn't increase Label row height */}
              {canSearchAgents && (
                <div className="absolute top-0 right-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilterModal(true)}
                    title="Filter & select Agent"
                    className="h-5 px-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-transparent"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Filter
                  </Button>
                </div>
              )}

              <Input
                uiSize="sm"
                placeholder={canSearchAgents ? "Click to Filter..." : "Loading..."}
                {...register("sapBpId")}
                readOnly
                onClick={() => canSearchAgents && setShowFilterModal(true)}
                className={`${canSearchAgents
                    ? 'cursor-pointer'
                    : 'bg-gray-100 cursor-not-allowed'
                  } focus:ring-0`}
                rightIcon={agentRightIcon}
                aria-invalid={!!errors.sapBpId || undefined}
              />
              {errors.sapBpId && <p className="text-xs text-red-600 mt-1">{errors.sapBpId.message}</p>}
            </div>

            {/* Collected By */}
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
                      {(collectedByOptions || []).length === 0
                        ? <SelectItem value="loading" disabled>Loading...</SelectItem>
                        : (collectedByOptions || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.collectedBy && <p className="text-xs text-red-600 mt-1">{errors.collectedBy.message}</p>}
            </div>

            {/* Payment Mode - Removed POS */}
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
                      {canUseCash && <SelectItem value="CASH">Cash</SelectItem>}
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.payMode && <p className="text-xs text-red-600 mt-1">{errors.payMode.message}</p>}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="payAmount"
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Input
                    ref={ref}
                    type="text"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[\d,]*\.?\d*$/.test(val)) {
                        const cleanVal = val.replace(/,/g, "");
                        const [intPart] = cleanVal.split('.');

                        if (intPart.length <= 10) {
                          onChange(val);
                        }
                      }
                    }}
                    onFocus={() => {
                      if (value) {
                        onChange(value.toString().replace(/,/g, ""));
                      }
                    }}
                    onBlur={() => {
                      if (value) {
                        onChange(formatCurrency(value.toString()));
                      }
                      onBlur();
                    }}
                    aria-invalid={!!errors.payAmount || undefined}
                  />
                )}
              />
              {errors.payAmount && <p className="text-xs text-red-600 mt-1">{errors.payAmount.message}</p>}
            </div>

            {/* Currency */}
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
                      {currencyLoading
                        ? <SelectItem value="loading" disabled>Loading...</SelectItem>
                        : currencyIsError
                          ? <SelectItem value="error" disabled>Error</SelectItem>
                          : (currencyOptions || []).map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency.message}</p>}
            </div>

            {/* Receipt Number */}
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Controller
                control={control}
                name="receiptNo"
                render={({ field }) => (
                  <Input
                    placeholder="Optional (up to 10 digits)"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10));
                    }}
                    maxLength={10}
                  />
                )}
              />
              {errors.receiptNo && <p className="text-xs text-red-600 mt-1">{errors.receiptNo.message}</p>}
            </div>

            {/* Cheque Details */}
            {payMode === "CHEQUE" && (
              <div className="col-span-1 md:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border">
                {/* Cheque Number - Max 20 chars, no special characters */}
                <div className="space-y-2">
                  <Label>Cheque Number <span className="text-red-500">*</span></Label>
                  <Controller
                    control={control}
                    name="chequeNo"
                    render={({ field }) => (
                      <Input
                        placeholder="Cheque Number"
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

                {/* Cheque Date - Last 3 months only */}
                <div className="space-y-2">
                  <Label>Cheque Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {chequeDate ? format(new Date(chequeDate), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={chequeDate ? new Date(chequeDate) : undefined}
                        onSelect={(d) => setValue("chequeDate", d ? toYmd(d) : "", { shouldValidate: true })}
                        initialFocus
                        disabled={(date) => {
                          // Disable dates outside last 3 months range
                          return date > today || date < threeMonthsAgo;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
                </div>

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
                        maxLength={50}
                        disabled={!selectedBank}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          // Allow only letters and spaces, no digits or special characters
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

            {/* Bank Deposit Details - Bank Deposit Date uses chequeDate field and is mandatory */}
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
                        maxLength={50}
                        disabled={!selectedBank}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          // Allow only letters and spaces, no digits or special characters
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

              <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-4">
                <span className="font-semibold text-azam-orange">Hardware Balance:</span>
                {hwBalance?.balance !== undefined
                  ? <span className="font-bold text-gray-900">{hwBalance.balance.toLocaleString()} {hwBalance.currency}</span>
                  : <span className="font-bold text-red-600">{hwBalance?.message || "Balance info unavailable"}</span>
                }
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Enter payment description" rows={3} className="resize-none" />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="xs"
              disabled={isSubmitting || isPending}
              className="w-full sm:w-auto bg-azam-blue hover:bg-azam-blue/90"
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                : "Submit Payment"
              }
            </Button>
          </div>

          <ParentAgentSearchModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            onSelect={handleFilterSelect}
          />
        </form>
      </CardContent>
    </Card>
  );
}
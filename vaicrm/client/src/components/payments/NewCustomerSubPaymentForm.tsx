import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSubPaymentInitiateSchema, type CustomerSubPaymentInitiate } from "@shared/schema";
import { agentHwSaleApi, onboardingApi } from "@/lib/api-client";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2, Filter, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertTriangle, RefreshCcw } from "lucide-react";
import { useCurrencyByCountry } from "@/hooks/useCurrencyByCountry";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, isBefore, startOfDay } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

import CustomerSearchModal from "@/components/customers/CustomerSearchModalWithMac";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal";

interface PaymentChannelConfig {
  name: string;
  value: string;
  validation: string | null;
}

export function SelectOptions<T>({
  isLoading,
  isError,
  data,
  placeholder,
  valueKey,
  labelKey,
}: {
  isLoading: boolean;
  isError: boolean;
  data?: T[];
  placeholder: string;
  valueKey: keyof T;
  labelKey: keyof T;
}) {
  if (isLoading) return <SelectItem value="loading" disabled>Loading...</SelectItem>;
  if (isError) return <SelectItem value="error" disabled>Error loading options</SelectItem>;
  if (!data || data.length === 0) return <SelectItem value="empty" disabled>{placeholder}</SelectItem>;

  return data.map((item: any) => {
    const value = String(item[valueKey]);
    const label = String(item[labelKey]);
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  });
}

const defaultFormValues: CustomerSubPaymentInitiate = {
  sapBpId: "",
  payAmount: "",
  payMode: "CASH",
  currency: "",
  collectionCenter: "",
  storeLocation: "",
  collectedBy: "",
  channel: "",
  bankName: "",
  branchName: "",
  chequeNo: "",
  chequeDate: "",
  receiptNo: "",
  description: ""
};

export default function NewCustomerSubPaymentForm() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const currentSalesOrg = user?.salesOrg;

  // --- Identify User Role ---
  const isOtcUser = (user?.isOtc || "N") === "Y";
  const isAgent = user?.allAccess === "N" && !isOtcUser;

  const loggedInAgentBpId = user?.sapBpId || user?.parentSapBpId || "";

  const isChannelLocked = isAgent || isOtcUser;

  const [division, setDivision] = useState<string>("");
  const [selectedSapCaId, setSelectedSapCaId] = useState<string>("");
  const [customerInput, setCustomerInput] = useState("");
  const [customerStatus, setCustomerStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  const [availableChannels, setAvailableChannels] = useState<PaymentChannelConfig[]>([]);

  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [customerBalance, setCustomerBalance] = useState<{ hwBalance?: string; subsBalance?: string; currency?: string; message?: string } | null>(null);

  const [agentCollectorInput, setAgentCollectorInput] = useState("");
  const [agentCollectorCaId, setAgentCollectorCaId] = useState<string | null>(null);

  const [agentBalanceInfo, setAgentBalanceInfo] = useState<{
    eligibleAmount?: string;
    hwBalance?: string;
    subsBalance?: string;
    currency?: string;
    message?: string;
  } | null>(null);
  const [agentBalanceLoading, setAgentBalanceLoading] = useState(false);

  const latestBpRef = useRef<string>("");

  // Validation Logic - UPDATED with different date limits for CHEQUE vs BANK_DEPOSIT
  const formSchema = useMemo(() => {
    return customerSubPaymentInitiateSchema.superRefine((data, ctx) => {
      if (data.payMode === "BANK_DEPOSIT" && !data.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bankName"],
          message: "Bank Name is required for Bank Deposit",
        });
      }

      const amount = parseFloat(data.payAmount);
      if (!data.payAmount || isNaN(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payAmount"],
          message: "Amount must be greater than 0",
        });
      }

      // UPDATED: Different date validation for CHEQUE (6 months) vs BANK_DEPOSIT (1 month)
      if (data.payMode === "CHEQUE") {
        if (!data.chequeDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["chequeDate"],
            message: "Cheque Date is required",
          });
        } else {
          const date = new Date(data.chequeDate);
          const sixMonthsAgo = startOfDay(subMonths(new Date(), 6));
          if (isBefore(date, sixMonthsAgo)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["chequeDate"],
              message: "Cheque is stale (older than 6 months)",
            });
          }
        }
      }

      if (data.payMode === "BANK_DEPOSIT") {
        if (!data.chequeDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["chequeDate"],
            message: "Deposit Date is required",
          });
        } else {
          const date = new Date(data.chequeDate);
          const oneMonthAgo = startOfDay(subMonths(new Date(), 1));
          if (isBefore(date, oneMonthAgo)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["chequeDate"],
              message: "Deposit date cannot be older than 1 month",
            });
          }
        }

        // NEW: Validate Bank Deposit ID is mandatory for BANK_DEPOSIT
        if (!data.chequeNo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["chequeNo"],
            message: "Bank Deposit ID is required",
          });
        }
      }
    });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    getValues,
    formState: { errors, isSubmitting },
    reset,
    clearErrors,
    setError,
  } = useForm<CustomerSubPaymentInitiate>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });

  // --- CURRENCY LOGIC FIX START ---
  const countryName = user?.country || "";
  const { data: currencyData, isLoading: currencyLoading } = useCurrencyByCountry(countryName);

  const currencyOptions = useMemo(() => {
    if (!currencyData) return [];
    return Array.isArray(currencyData) ? currencyData : [currencyData];
  }, [currencyData]);

  useEffect(() => {
    const current = getValues("currency");
    if (current) return;

    if (currencyOptions.length > 0) {
      if (countryName && countryName.toLowerCase() === "zimbabwe") {
        const usdExists = currencyOptions.some((c: any) => c.currencyCode === "USD");
        if (usdExists) {
          setValue("currency", "USD", { shouldValidate: true });
          return;
        }
      }

      if (currencyOptions.length === 1) {
        setValue("currency", currencyOptions[0].currencyCode, { shouldValidate: true });
      }
    }
  }, [currencyOptions, setValue, countryName, getValues]);
  // --- CURRENCY LOGIC FIX END ---

  // --- Fetch Payment Channels Config ---
  const { data: configData } = useQuery({
    queryKey: ['paymentChannels'],
    queryFn: () => onboardingApi.fetchConfig("paymentChannel"),
    staleTime: Infinity,
  });

  const allChannels = useMemo(() => {
    return (configData?.data?.configItemsList?.paymentChannel || []) as PaymentChannelConfig[];
  }, [configData]);

  // --- Helper: Fetch Agent Balance ---
  const fetchAgentBalance = useCallback(async (sapBpId: string, sapCaId: string, agentCurrency?: string) => {
    setAgentBalanceLoading(true);
    setAgentBalanceInfo(null);
    try {
      const currency = agentCurrency || getValues("currency") || "";
      const res = await apiRequest("customer-sub-payments/balance", "POST", {
        sapBpId,
        sapCaId,
        currency
      });
      if (res?.status === "SUCCESS" && res?.data) {
        setAgentBalanceInfo({
          eligibleAmount: res.data.eligibleAmount || "0",
          hwBalance: res.data.hwBalance || "0",
          subsBalance: res.data.subsBalance || "0",
          currency: res.data.currency || currency,
          message: res.statusMessage,
        });
      } else {
        setAgentBalanceInfo({
          eligibleAmount: "0",
          hwBalance: "0",
          subsBalance: "0",
          currency: currency,
          message: res?.statusMessage || "Agent balance info unavailable"
        });
      }
    } catch (err: any) {
      const currency = agentCurrency || getValues("currency") || "";
      setAgentBalanceInfo({
        eligibleAmount: "0",
        hwBalance: "0",
        subsBalance: "0",
        currency: currency,
        message: err?.statusMessage || err?.message || "Agent balance fetch error"
      });
    } finally {
      setAgentBalanceLoading(false);
    }
  }, [getValues]);

  // --- Helper: Initialize Agent Logic ---
  const initializeAgent = useCallback(async () => {
    if (isAgent && loggedInAgentBpId && currentSalesOrg) {
      setAgentBalanceLoading(true);
      try {
        const userRes = await apiRequest('/agents/user-details', 'POST', {
          type: 'Agent',
          sapBpId: loggedInAgentBpId,
          salesOrg: currentSalesOrg,
          isSubCollection: "N"
        });

        const rawData = (userRes as any)?.data;
        const list: any[] = rawData?.customerDetails || [];

        let matchedRecord = null;
        let matchedRelatedParty = null;

        for (const item of list) {
          if (Array.isArray(item.relatedParty)) {
            const rp = item.relatedParty.find((r: any) => String(r.sapBpId) === loggedInAgentBpId);
            if (rp) {
              matchedRecord = item;
              matchedRelatedParty = rp;
              break;
            }
          }
        }

        if (matchedRecord && matchedRelatedParty) {
          const agentName = `${matchedRecord.firstName || ''} ${matchedRecord.lastName || ''}`.trim();
          const sapCaId = matchedRelatedParty.sapCaId;
          const agentCurrency = matchedRelatedParty.currency || getValues("currency") || "";

          setAgentCollectorInput(`${agentName} (${loggedInAgentBpId})`);
          setAgentCollectorCaId(sapCaId);
          setValue("collectedBy", loggedInAgentBpId);

          if (sapCaId) {
            await fetchAgentBalance(loggedInAgentBpId, sapCaId, agentCurrency);
          } else {
            setAgentBalanceInfo({
              eligibleAmount: "0",
              hwBalance: "0",
              subsBalance: "0",
              currency: agentCurrency,
              message: "Agent Contract Account (CA ID) not found."
            });
            setAgentBalanceLoading(false);
          }
        } else {
          const currency = getValues("currency") || "";
          setAgentBalanceInfo({
            eligibleAmount: "0",
            hwBalance: "0",
            subsBalance: "0",
            currency: currency,
            message: "Agent details not found in Sales Org."
          });
          setAgentBalanceLoading(false);
        }
      } catch (error) {
        const currency = getValues("currency") || "";
        setAgentBalanceInfo({
          eligibleAmount: "0",
          hwBalance: "0",
          subsBalance: "0",
          currency: currency,
          message: "Failed to load agent details."
        });
        setAgentBalanceLoading(false);
      }
    }
  }, [isAgent, loggedInAgentBpId, currentSalesOrg, setValue, fetchAgentBalance, getValues]);

  // --- Auto-Run Initialize Agent ---
  useEffect(() => {
    initializeAgent();
  }, [initializeAgent]);

  const {
    data: plantsResponse,
    isLoading: plantsLoading,
    isError: plantsError
  } = useQuery({
    queryKey: ["plants"],
    queryFn: () => agentHwSaleApi.fetchPlants(),
  });

  const plantOptions = useMemo(() => plantsResponse?.data?.plantDetails || [], [plantsResponse]);

  const channel = watch("channel");
  const collectionCenter = watch("collectionCenter");
  const storeLocation = watch("storeLocation");
  const payAmount = watch("payAmount");
  const selectedBank = watch("bankName");
  const formCurrency = watch("currency");

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

  useEffect(() => {
    if (selectedBank) {
      setValue("branchName", "");
    }
  }, [selectedBank, setValue]);

  useEffect(() => {
    if (customerDetails && selectedSapCaId && formCurrency) {
      fetchCustomerBalance(
        customerDetails.sapBpId,
        selectedSapCaId,
        customerDetails.agreementType || "",
        formCurrency
      );
    }

    if (channel?.includes('Agent') && agentCollectorCaId && formCurrency) {
      const agentBpId = getValues("collectedBy");
      if (agentBpId) {
        fetchAgentBalance(agentBpId, agentCollectorCaId, formCurrency);
      }
    }
  }, [formCurrency]);

  const { data: storeLocationsData } = useQuery({
    queryKey: ["otc-stores", collectionCenter],
    enabled: !!collectionCenter && channel?.includes("Over the Counter"),
    queryFn: () => {
      return apiRequest("/customer-sub-payments/storeLocationById", "POST", { type: "OTC", plantNumber: collectionCenter });
    },
  });
  const storeLocations = (storeLocationsData as any)?.data?.storageDetails || [];
  const selectedStoreLoc = storeLocations.find((l: any) => l.StorageLocation === storeLocation);

  const { data: otcCollectedByData } = useQuery({
    queryKey: ["otc-collected-by", storeLocation, collectionCenter],
    enabled: !!storeLocation && !!collectionCenter && channel?.includes("Over the Counter"),
    queryFn: () => {
      return apiRequest("/customer-sub-payments/collected-by", "POST", {
        type: ["OTC"],
        plantNumber: collectionCenter,
        storeLocationName: selectedStoreLoc?.StorageLocationName
      });
    },
  });

  const rawList = (otcCollectedByData as any)?.data?.userDetails || (otcCollectedByData as any)?.data?.collectedByList || [];

  const otcCollectedByList = rawList.map((item: any) => ({
    name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
    sapBpId: item.sapBpId,
    sapCaId: item.sapCaId
  }));

  // Field Resets on Channel Change
  useEffect(() => {
    setValue("collectionCenter", "");
    setValue("storeLocation", "");

    if (!isAgent && !isOtcUser) {
      setValue("collectedBy", "");
      setAgentCollectorInput("");
      setAgentCollectorCaId(null);
      setAgentBalanceInfo(null);
    } else if (isAgent) {
      setValue("collectedBy", loggedInAgentBpId);
    }

    clearErrors("collectionCenter");
    clearErrors("storeLocation");
    clearErrors("collectedBy");
  }, [channel, setValue, clearErrors, isAgent, isOtcUser, loggedInAgentBpId]);

  useEffect(() => {
    if (channel?.includes('Over the Counter')) {
      setValue("storeLocation", "");
      setValue("collectedBy", "");
      clearErrors("storeLocation");
      clearErrors("collectedBy");
    }
  }, [collectionCenter, channel, setValue, clearErrors]);

  useEffect(() => {
    if (channel?.includes('Over the Counter') && plantOptions.length === 1) {
      setValue("collectionCenter", String(plantOptions[0].plant));
    }
  }, [plantOptions, channel, setValue]);

  useEffect(() => {
    if (storeLocations.length === 1) {
      setValue("storeLocation", storeLocations[0].StorageLocation);
    }
  }, [storeLocations, setValue]);

  useEffect(() => {
    if (otcCollectedByList.length === 1) {
      setValue("collectedBy", otcCollectedByList[0].sapBpId);
    }
  }, [otcCollectedByList, setValue]);

  const fetchCustomerBalance = async (sapBpId: string, sapCaId: string, agreementType: string, customerCurrency?: string) => {
    try {
      const currency = customerCurrency || getValues("currency") || "";

      const res = await apiRequest("/customer-sub-payments/balance", "POST", {
        sapBpId,
        sapCaId,
        currency
      });

      const isDataEmpty = !res?.data || Object.keys(res.data).length === 0;

      if (res?.status === "SUCCESS") {
        if (!isDataEmpty) {
          setCustomerBalance({
            hwBalance: res.data.hwBalance || "0",
            subsBalance: res.data.subsBalance || "0",
            currency: res.data.currency || currency,
            message: res.statusMessage,
          });
        } else {
          setCustomerBalance({
            hwBalance: "0",
            subsBalance: "0",
            currency: currency,
            message: res.statusMessage || "Balance not found"
          });
        }
      } else {
        setCustomerBalance({
          hwBalance: "0",
          subsBalance: "0",
          currency: currency,
          message: res?.statusMessage || "Balance info unavailable"
        });
      }
    } catch (err: any) {
      const currency = customerCurrency || getValues("currency") || "";
      setCustomerBalance({
        hwBalance: "0",
        subsBalance: "0",
        currency: currency,
        message: err?.statusMessage || err?.message || "Balance fetch error"
      });
    }
  };

  const handleSapBpIdBlur = async (val: string) => {
    if (!val) return;
    if (!currentSalesOrg) {
      toast({ title: "Error", description: "Sales Organization missing in user profile", variant: "destructive" });
      setCustomerStatus("invalid");
      return;
    }
    latestBpRef.current = val;
    setCustomerStatus("loading");

    setAvailableChannels([]);
    if (!isChannelLocked) setValue("channel", "");

    setTimeout(async () => {
      if (latestBpRef.current !== val) return;
      try {
        const payload = {
          type: "Customer",
          salesOrg: currentSalesOrg,
          isSubCollection: "Y",
          sapBpId: val
        };
        const res = await apiRequest('/agents/user-details', 'POST', payload);
        const rawList = (res as any).data?.customerDetails;

        if (!Array.isArray(rawList) || rawList.length === 0) {
          setError("sapBpId", { message: "Customer not found" });
          setCustomerStatus("invalid");
          setCustomerDetails(null);
          setCustomerBalance(null);
        } else {
          clearErrors("sapBpId");
          setCustomerStatus("valid");

          const firstCustomer = rawList[0];
          const relatedInfo = firstCustomer.relatedParty?.[0] || {};
          const foundDivision = relatedInfo.division || "";
          const foundSapCaId = relatedInfo.sapCaId || "";
          const customerCurrency = relatedInfo.currency || "";
          setDivision(foundDivision);
          setSelectedSapCaId(foundSapCaId);

          const agreementType = firstCustomer.agreementType || firstCustomer.customerType || "";
          const customerRegion = firstCustomer.contactMedium?.find((cm: any) => cm.type === "BILLING_ADDRESS")?.region || "";

          const normalizedDetails = {
            name: `${firstCustomer.firstName || ""} ${firstCustomer.lastName || ""}`.trim() || "Unknown",
            sapBpId: relatedInfo.sapBpId || val,
            sapCaId: relatedInfo.sapCaId,
            agreementType: agreementType,
            currency: customerCurrency,
            mobile: firstCustomer.contactMedium?.find((cm: any) => cm.type === "mobile")?.value,
            email: firstCustomer.contactMedium?.find((cm: any) => cm.type === "email")?.value,
            country: firstCustomer.contactMedium?.find((cm: any) => cm.type === "BILLING_ADDRESS")?.country,
            region: customerRegion,
            city: firstCustomer.contactMedium?.find((cm: any) => cm.type === "BILLING_ADDRESS")?.city,
            district: firstCustomer.contactMedium?.find((cm: any) => cm.type === "BILLING_ADDRESS")?.district,
            ward: firstCustomer.contactMedium?.find((cm: any) => cm.type === "BILLING_ADDRESS")?.ward,
          };

          setCustomerDetails(normalizedDetails);
          if (customerCurrency && !getValues("currency")) {
            setValue("currency", customerCurrency, { shouldValidate: true });
          }

          // --- FILTER CHANNELS LOGIC ---
          const filteredChannels = allChannels.filter(ch => {
            const channelNameLower = ch.name.toLowerCase();
            const customerTypeLower = (agreementType || "").toLowerCase();

            if (channelNameLower.includes("aggregator")) return false;

            const isZanzibarChannel = ch.name.toLowerCase().includes("zanzibar") || ch.validation === "07";
            const isZanzibarCustomer = customerRegion.includes("07") || customerRegion.toLowerCase().includes("zanzibar");

            if (isZanzibarChannel && !isZanzibarCustomer) return false;
            if (!isZanzibarChannel && isZanzibarCustomer) return false;

            if (customerTypeLower === "prepaid" && !channelNameLower.includes("prepaid")) return false;
            if (customerTypeLower === "postpaid" && !channelNameLower.includes("postpaid")) return false;

            return true;
          });

          setAvailableChannels(filteredChannels);

          // --- AUTO-SELECT FOR OTC USER ---
          if (isOtcUser) {
            const customerTypeLower = (agreementType || "").toLowerCase();

            let otcChannel = filteredChannels.find(ch =>
              ch.name.toLowerCase().includes("over the counter") &&
              ch.name.toLowerCase().includes(customerTypeLower)
            );

            if (!otcChannel) {
              otcChannel = filteredChannels.find(ch => ch.name.toLowerCase().includes("over the counter"));
            }

            if (otcChannel) {
              setTimeout(() => {
                setValue("channel", otcChannel?.value || "", { shouldValidate: true, shouldDirty: true });
              }, 50);
            }
          }

          // --- AUTO-SELECT FOR AGENT ---
          if (isAgent) {
            const customerTypeLower = (agreementType || "").toLowerCase();

            let agentChannel = filteredChannels.find(ch =>
              ch.name.toLowerCase().includes("agent") &&
              ch.name.toLowerCase().includes(customerTypeLower)
            );

            if (!agentChannel) {
              agentChannel = filteredChannels.find(ch => ch.name.toLowerCase().includes("agent"));
            }

            if (agentChannel) {
              setTimeout(() => {
                setValue("channel", agentChannel?.value || "", { shouldValidate: true, shouldDirty: true });
                setValue("collectedBy", loggedInAgentBpId, { shouldValidate: true });
              }, 50);
            }
          }

          if (foundSapCaId) {
            await fetchCustomerBalance(val, foundSapCaId, agreementType, customerCurrency);
          } else {
            let fallbackCurrency = customerCurrency || getValues("currency");

            if (!fallbackCurrency && currencyOptions.length > 0) {
              if (countryName.toLowerCase() === "zimbabwe") {
                const usd = currencyOptions.find((c: any) => c.currencyCode === "USD");
                fallbackCurrency = usd ? "USD" : currencyOptions[0].currencyCode;
              } else {
                fallbackCurrency = currencyOptions[0].currencyCode;
              }
            }

            if (!fallbackCurrency) fallbackCurrency = "TZS";

            setCustomerBalance({
              hwBalance: "0",
              subsBalance: "0",
              currency: fallbackCurrency,
              message: "Customer Account ID not found."
            });
          }
        }
      } catch {
        if (latestBpRef.current === val) {
          setError("sapBpId", { message: "Unable to verify customer" });
          setCustomerStatus("invalid");
          setCustomerDetails(null);
          setCustomerBalance(null);
        }
      }
    }, 350);
  };

  const handleResetForm = () => {
    let defaultCurrency = "";
    if (currencyOptions.length > 0) {
      if (countryName.toLowerCase() === "zimbabwe") {
        const usd = currencyOptions.find((c: any) => c.currencyCode === "USD");
        if (usd) defaultCurrency = "USD";
        else defaultCurrency = currencyOptions[0].currencyCode;
      } else {
        if (currencyOptions.length === 1) defaultCurrency = currencyOptions[0].currencyCode;
      }
    }

    reset({
      ...defaultFormValues,
      currency: defaultCurrency,
      collectedBy: isAgent ? loggedInAgentBpId : ""
    });
    setCustomerInput("");
    setDivision("");
    setSelectedSapCaId("");

    if (!isAgent) {
      setAgentCollectorInput("");
      setAgentBalanceInfo(null);
    }

    setCustomerStatus("idle");
    setCustomerDetails(null);
    setCustomerBalance(null);
    setAvailableChannels([]);
  };

  const { mutate: initiatePayment, isPending } = useMutation({
    mutationFn: async (form: CustomerSubPaymentInitiate) => {
      let collectedBySapCaId = null;
      let finalCollectionCenter = form.collectionCenter;

      if (form.channel.includes("Agent")) {
        collectedBySapCaId = agentCollectorCaId;
        finalCollectionCenter = "";
      } else if (form.channel.includes("Over the Counter")) {
        collectedBySapCaId = otcCollectedByList.find((c: any) => c.sapBpId === form.collectedBy)?.sapCaId || null;
      }

      const payload = {
        ...form,
        collectionCenter: finalCollectionCenter,
        type: "CUSTOMER",
        name: customerDetails?.name,
        country: countryName,
        division: division,
        sapCaId: selectedSapCaId,
        storeLocationName: selectedStoreLoc?.StorageLocationName,
        description: form.description,
        // UPDATED: Include chequeNo for both CHEQUE and BANK_DEPOSIT
        chequeNo: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.chequeNo : null,
        bankName: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.bankName : null,
        branchName: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.branchName : null,
        chequeDate: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.chequeDate : null,
        onlTransId: null,
        collectedBySapCaId: collectedBySapCaId,
      };

      return apiRequest("/customer-sub-payments/initiate", "POST", payload);
    },
    onSuccess: (res: any) => {
      toast({ title: "Success", description: res?.data?.message || "Subscription payment initiated" });
      handleResetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.statusMessage || "Failed to process payment", variant: "destructive" }),
  });

  const handleFormSubmit = (data: CustomerSubPaymentInitiate) => {
    if (data.channel.includes("Agent")) {
      if (!agentBalanceInfo) {
        toast({
          title: "Agent Balance Missing",
          description: "Unable to load agent balance info. Please retry fetching agent details.",
          variant: "destructive"
        });
        return;
      }

      const eligibleAmount = parseFloat(agentBalanceInfo.eligibleAmount || "0");
      const enteredAmount = parseFloat(data.payAmount || "0");

      if (enteredAmount > eligibleAmount) {
        const formattedLimit = Number(eligibleAmount).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        const currency = agentBalanceInfo.currency || "";

        toast({
          title: "Insufficient Agent Balance",
          description: `Amount exceeds agent's eligible limit of ${formattedLimit} ${currency}.`,
          variant: "destructive"
        });
        return;
      }
    }
    initiatePayment(data);
  };

  const handleFilterSelect = async (bpId: string) => {
    setValue("sapBpId", bpId, { shouldValidate: true });
    setCustomerInput(bpId);
    setShowFilterModal(false);
    clearErrors("sapBpId");
    setCustomerStatus("valid");
    await handleSapBpIdBlur(bpId);
  };

  const handleAgentSelect = async (agent: AgentApiItem) => {
    setValue("collectedBy", agent.sapBpId, { shouldValidate: true });
    setAgentCollectorInput(`${agent.agentName} (${agent.sapBpId})`);
    setAgentCollectorCaId(agent.sapCaId || null);
    setShowAgentModal(false);
    clearErrors("collectedBy");

    if (agent.sapBpId && agent.sapCaId) {
      await fetchAgentBalance(agent.sapBpId, agent.sapCaId, agent.currency);
    } else {
      setAgentBalanceInfo({ eligibleAmount: "0", message: "Agent CA ID not found. Cannot fetch balance." });
    }
  };

  const payMode = watch("payMode");
  const rightIcon =
    customerStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      : customerStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
        : customerStatus === "invalid" ? <XCircle className="h-4 w-4 text-red-600" />
          : undefined;

  const isAmountExceedsEligible = useMemo(() => {
    if (!channel?.includes("Agent") || !agentBalanceInfo?.eligibleAmount) return false;
    const eligible = parseFloat(agentBalanceInfo.eligibleAmount || "0");
    const entered = parseFloat(payAmount || "0");
    return entered > eligible;
  }, [channel, agentBalanceInfo, payAmount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-azam-blue" />
          New Subscription Payment
        </CardTitle>
        <CardDescription>Collect subscription payments from customers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <CustomerSearchModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onSelect={handleFilterSelect}
        />

        <ParentAgentSearchModal
          isOpen={showAgentModal}
          onClose={() => setShowAgentModal(false)}
          onSelect={handleAgentSelect}
          isSubCollection="N"
        />

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <Label>Search BP <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 relative">
                <Controller name="sapBpId" control={control} render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Click Filter..."
                    value={customerInput}
                    readOnly
                    onClick={() => setShowFilterModal(true)}
                    className="cursor-pointer bg-gray-50 focus:ring-0"
                    rightIcon={rightIcon}
                  />
                )} />
                <Button size="xs" type="button" onClick={() => setShowFilterModal(true)}>
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
              {errors.sapBpId && <p className="text-xs text-red-600 mt-1">{errors.sapBpId.message}</p>}
            </div>

            <div>
              <Label>Channel <span className="text-red-500">*</span></Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={availableChannels.length === 0 || isChannelLocked}
                  >
                    <SelectTrigger uiSize="sm">
                      <SelectValue placeholder={customerStatus === 'valid' && availableChannels.length === 0 ? "No valid channels" : "Select Channel"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannels.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.channel && <p className="text-xs text-red-600 mt-1">{errors.channel.message}</p>}
            </div>
            <div>
              <Label>Payment Amount <span className="text-red-500">*</span></Label>
              <Controller
                name="payAmount"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="Amount"
                    className={isAmountExceedsEligible ? "border-red-500 focus:border-red-500" : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        field.onChange(value);
                      }
                    }}
                  />
                )}
              />
              {errors.payAmount && <p className="text-xs text-red-600 mt-1">{errors.payAmount.message}</p>}
              {isAmountExceedsEligible && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Amount exceeds agent's eligible balance ({Number(agentBalanceInfo?.eligibleAmount || "0").toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} {agentBalanceInfo?.currency || getValues("currency") || ""})
                </p>
              )}
            </div>
          </div>

          {customerDetails && customerStatus === "valid" && (
            <div className="mt-8 p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base font-bold text-azam-orange tracking-wide">Customer Details</span>
              </div>
              <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-between gap-y-3 gap-x-6">
                <div><span className="text-azam-orange font-semibold">Name:</span> {customerDetails.name}</div>
                <div><span className="text-azam-orange font-semibold">Country:</span> {customerDetails.country}</div>
                <div><span className="text-azam-orange font-semibold">Region:</span> {customerDetails.region}</div>
                <div><span className="text-azam-orange font-semibold">City:</span> {customerDetails.city}</div>
                <div><span className="text-azam-orange font-semibold">District:</span> {customerDetails.district}</div>
                <div><span className="text-azam-orange font-semibold">Ward:</span> {customerDetails.ward}</div>
                <div><span className="text-azam-orange font-semibold">SAP BP ID:</span> {customerDetails.sapBpId}</div>
                {customerDetails.division && <div><span className="text-azam-orange font-semibold">Division:</span> {customerDetails.division}</div>}
                {customerDetails.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {customerDetails.mobile}</div>}
                {customerDetails.email && <div><span className="text-azam-orange font-semibold">Email:</span> {customerDetails.email}</div>}
              </div>
              <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-4">
                <span className="ml-4 font-semibold text-azam-orange">Subscription Balance:</span>
                {customerBalance ? (
                  <span className="font-bold text-gray-900">
                    {Number(customerBalance.subsBalance || "0").toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })} {customerBalance.currency || getValues("currency") || ""}
                  </span>
                ) : (
                  <span className="font-bold text-gray-900">
                    0 {getValues("currency") || ""}
                  </span>
                )}

              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label>Payment Mode <span className="text-red-500">*</span></Label>
              <Controller name="payMode" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger uiSize="sm"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            {/* UPDATED CURRENCY FIELD */}
            <div>
              <Label>Currency <span className="text-red-500">*</span></Label>
              <Controller name="currency" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={currencyLoading}>
                  <SelectTrigger uiSize="sm">
                    <SelectValue placeholder={currencyLoading ? "Loading..." : "Select Currency"} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c: any) => (
                      <SelectItem key={c.currencyCode} value={c.currencyCode}>
                        {c.currencyCode} - {c.currencyName}
                      </SelectItem>
                    ))}

                    {currencyOptions.length === 0 && !currencyLoading && (
                      <SelectItem value="none" disabled>No currencies found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )} />
            </div>

            {channel?.includes('Over the Counter') && (
              <div>
                <Label>Collection Center <span className="text-red-500">*</span></Label>
                <Controller
                  name="collectionCenter"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={plantsLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={plantsLoading ? "Loading..." : "Select center"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectOptions
                          isLoading={plantsLoading}
                          isError={plantsError}
                          data={plantOptions}
                          placeholder="No centers found"
                          valueKey="plant"
                          labelKey="plantName"
                        />
                      </SelectContent>
                    </Select>
                  )} />
                {errors.collectionCenter && <p className="text-xs text-red-600 mt-1">{errors.collectionCenter.message}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {channel?.includes('Over the Counter') && (
              <>
                <div>
                  <Label>Store Location <span className="text-red-500">*</span></Label>
                  <Controller name="storeLocation" control={control} render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange} disabled={!collectionCenter}>
                      <SelectTrigger uiSize="sm"><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>
                        {storeLocations.map((loc: any) => (<SelectItem key={loc.StorageLocation} value={loc.StorageLocation}>{loc.StorageLocationName}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.storeLocation && <p className="text-xs text-red-600 mt-1">{errors.storeLocation.message}</p>}
                </div>
                <div>
                  <Label>Collected By <span className="text-red-500">*</span></Label>
                  <Controller name="collectedBy" control={control} render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange} disabled={!storeLocation}>
                      <SelectTrigger uiSize="sm"><SelectValue placeholder="Select collector" /></SelectTrigger>
                      <SelectContent>
                        {otcCollectedByList.map((c: any) => (<SelectItem key={c.sapBpId} value={c.sapBpId}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.collectedBy && <p className="text-xs text-red-600 mt-1">{errors.collectedBy.message}</p>}
                </div>
              </>
            )}
            {channel?.includes('Agent') && (
              <div>
                <Label>Collected By (Agent) <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 relative">
                  <Controller name="collectedBy" control={control} render={({ field }) => (
                    <Input
                      placeholder="Click Filter to select agent..."
                      value={agentCollectorInput || field.value || ""}
                      readOnly
                      onClick={() => !isAgent && setShowAgentModal(true)}
                      className={`focus:ring-0 ${isAgent ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer bg-gray-50'}`}
                      rightIcon={agentBalanceLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : undefined}
                    />
                  )} />
                  {!isAgent && (
                    <Button size="xs" type="button" onClick={() => setShowAgentModal(true)}>
                      <Filter className="h-4 w-4" /> Filter
                    </Button>
                  )}
                  {isAgent && !agentBalanceInfo && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                      onClick={() => initializeAgent()}
                      title="Retry loading agent details"
                    >
                      <RefreshCcw className="h-4 w-4 text-gray-500" />
                    </Button>
                  )}
                </div>
                {errors.collectedBy && <p className="text-xs text-red-600 mt-1">{errors.collectedBy.message}</p>}
              </div>
            )}
            <div>
              {payMode === "CASH" && (
                <>
                  <Label>Receipt Number</Label>
                  <Input {...register("receiptNo")} placeholder="Enter receipt number" maxLength={10} />
                  {errors.receiptNo && <p className="text-xs text-red-600 mt-1">{errors.receiptNo.message}</p>}
                </>
              )}
            </div>
          </div>

          {(payMode === "CHEQUE" || payMode === "BANK_DEPOSIT") && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {payMode === "CHEQUE" && (
                <>
                  <div>
                    <Label>Cheque Number <span className="text-red-500">*</span></Label>
                    <Controller
                      name="chequeNo"
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="Cheque No"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                            field.onChange(value);
                          }}
                          maxLength={20}
                        />
                      )}
                    />
                    {errors.chequeNo && <p className="text-xs text-red-600 mt-1">{errors.chequeNo.message}</p>}
                  </div>

                  <div>
                    <Label>Bank Name <span className="text-red-500">*</span></Label>
                    <Controller
                      name="bankName"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger uiSize="sm">
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

                  <div>
                    <Label>Cheque Date <span className="text-red-500">*</span></Label>
                    <Controller name="chequeDate" control={control} render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild >
                          <Button size="xs" variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2  w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(d) => d && field.onChange(format(d, "yyyy-MM-dd"))}
                            disabled={(date) => date < subMonths(new Date(), 6)}
                          />
                        </PopoverContent>
                      </Popover>
                    )} />
                    {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
                  </div>

                  <div>
                    <Label>Branch Name</Label>
                    <Controller
                      name="branchName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="Deposit Branch Name"
                          disabled={!selectedBank}
                          maxLength={50}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
                            field.onChange(value);
                          }}
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>
                </>
              )}
              {payMode === "BANK_DEPOSIT" && (
                <>
                  {/* Bank Deposit ID - Max 20 chars, no special characters, MANDATORY */}
                  <div>
                    <Label>Bank Deposit ID <span className="text-red-500">*</span></Label>
                    <Controller
                      name="chequeNo"
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="Bank Deposit ID"
                          value={field.value || ""}
                          onChange={(e) => {
                            // Allow only alphanumeric characters, max 20
                            const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                            field.onChange(value);
                          }}
                          maxLength={20}
                        />
                      )}
                    />
                    {errors.chequeNo && <p className="text-xs text-red-600 mt-1">{errors.chequeNo.message}</p>}
                  </div>

                  <div>
                    <Label>Deposit Bank Name <span className="text-red-500">*</span></Label>
                    <Controller
                      name="bankName"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger uiSize="sm">
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

                  {/* Bank Deposit Date - Only allows last 1 month */}
                  <div>
                    <Label>Bank Deposit Date <span className="text-red-500">*</span></Label>
                    <Controller name="chequeDate" control={control} render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild >
                          <Button size="xs" variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(d) => d && field.onChange(format(d, "yyyy-MM-dd"))}
                            disabled={(date) => date < subMonths(new Date(), 1) || date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    )} />
                    {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
                  </div>

                  <div>
                    <Label>Deposit Branch Name</Label>
                    <Controller
                      name="branchName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="Deposit Branch Name"
                          disabled={!selectedBank}
                          maxLength={50}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
                            field.onChange(value);
                          }}
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Enter payment description" rows={3} />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              size="xs"
              type="submit"
              className="bg-azam-blue hover:bg-azam-blue/90"
              disabled={isSubmitting || isPending || isAmountExceedsEligible}
            >
              {isSubmitting || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Payment"}
            </Button>
            <Button size="xs" variant="outline" type="button" onClick={handleResetForm}>
              Reset Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
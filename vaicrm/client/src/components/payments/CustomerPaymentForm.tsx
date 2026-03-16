import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerHwPaymentInitiateSchema, type CustomerHwPaymentInitiate } from "@shared/schema";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2, Filter, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { useCurrencyByCountry } from "@/hooks/useCurrencyByCountry";
import CustomerSearchModal from "@/components/customers/CustomerSearchModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const sanitizeDescription = (s?: string) => (s || "").replace(/<[^>]*>/g, "");
interface PlantDetail {
  plant: string;
  plantName: string;
  companyCode: string;
  companyCodeName: string;
}

export default function CustomerPaymentForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [customerStatus, setCustomerStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [channel, setChannel] = useState<"OTC">("OTC");
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [hwBalance, setHwBalance] = useState<{ balance?: number; currency?: string; message?: string } | null>(null);

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
  } = useForm<CustomerHwPaymentInitiate>({
    resolver: zodResolver(customerHwPaymentInitiateSchema),
    defaultValues: {
      sapBpId: "", payAmount: "", payMode: "CASH", currency: "",
      collectionCenter: "", storeLocation: "", collectedBy: "",
      bankName: "", branchName: "", chequeNo: "", chequeDate: "", receiptNo: ""
    },
    mode: "onBlur",
  });

  const countryName = user?.country || "";
  const salesOrg = user?.salesOrg || "";
  const { data: currencyData, isLoading: currencyLoading } = useCurrencyByCountry(countryName);

  // Watch currency for re-fetching balance
  const formCurrency = watch("currency");
  const payMode = watch("payMode");
  const chequeDate = watch("chequeDate");

  // Calculate date limits
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  // For bank deposit date - last 1 month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);

  // --- CURRENCY LOGIC UPDATED ---
  const currencyOptions = useMemo(() => {
    if (!currencyData) return [];
    return Array.isArray(currencyData) ? currencyData : [currencyData];
  }, [currencyData]);

  // Auto-select Defaults
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
  }, [currencyOptions, setValue, getValues, countryName]);

  useEffect(() => {
    setValue("chequeNo", "");
    clearErrors("chequeNo");
  }, [payMode, setValue, clearErrors]);

  const collectionCenter = watch("collectionCenter");
  const storeLocation = watch("storeLocation");
  const selectedBank = watch("bankName");

  // --- Fetch Bank List Logic ---
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

  // Reset Branch Name when Bank or PayMode Changes
  useEffect(() => {
    setValue("branchName", "");
  }, [selectedBank, payMode, setValue]);

  const { data: storeLocationsData } = useQuery({
    queryKey: ["otc-stores", collectionCenter],
    enabled: !!collectionCenter && channel === "OTC",
    queryFn: () => apiRequest('/data/store-locations', 'POST', { plantNumber: collectionCenter, type: "OTC" }),
    select: (data: any) => data?.data?.storageDetails || [],
  });
  const storeLocations = (storeLocationsData as any) || [];

  const selectedStoreLoc = storeLocations.find((l: any) => l.StorageLocation === storeLocation);

  const { data: otcCollectedByData } = useQuery({
    queryKey: ["otc-collected-by", collectionCenter, storeLocation],
    enabled: !!collectionCenter && !!storeLocation && channel === "OTC",
    queryFn: () => apiRequest('/data/collected-by', 'POST', {
      plantNumber: collectionCenter,
      storeLocationName: selectedStoreLoc?.StorageLocationName,
      type: ["OTC"]
    }),
    select: (data: any) => data?.data?.collectedByList || [],
  });
  const otcCollectedByList = (otcCollectedByData as any) || [];

  useEffect(() => {
    if (channel && collectionCenter) {
    }
  }, [channel, collectionCenter]);

  // --- UPDATED BALANCE FETCH WITH CURRENCY PARAMETER ---
  const fetchHwBalance = async (sapBpId: string, agreementType: string, sapCaId: string, currency: string) => {
    setHwBalance(null);
    const type = (agreementType || "").toLowerCase();

    if (type === 'prepaid') {
      if (!sapCaId) {
        // UPDATED: Show 0 balance instead of just a message
        setHwBalance({
          balance: 0,
          currency: currency || "",
          message: "No hardware account (CA ID) found for Prepaid customer."
        });
        return;
      }
      try {
        const res = await apiRequest("/customer-payments/balance", "POST", {
          sapBpId,
          sapCaId,
          currency: currency
        });
        if (res?.status === "SUCCESS" && res?.data) {
          setHwBalance({
            balance: res.data.hwBalance ?? 0, // UPDATED: Default to 0 if undefined
            currency: res.data.currency || currency,
            message: res.data.message || res.statusMessage
          });
        } else {
          // UPDATED: Show 0 balance on failure
          setHwBalance({
            balance: 0,
            currency: currency || "",
            message: res?.statusMessage || "Balance info unavailable"
          });
        }
      } catch (err: any) {
        // UPDATED: Show 0 balance on error
        setHwBalance({
          balance: 0,
          currency: currency || "",
          message: err?.statusMessage || err?.message || "Balance fetch error"
        });
      }
    }
    else if (type === 'postpaid') {
      try {
        const res = await apiRequest("/customer-payments/balance-by-bp", "POST", {
          sapBpId,
          salesOrg: salesOrg,
          currency: currency
        });

        if (res?.status === "SUCCESS" && res?.data) {
          setHwBalance({
            balance: res.data.balance ?? 0, // UPDATED: Default to 0 if undefined
            currency: res.data.currency || currency,
            message: res.data.message || res.statusMessage
          });
        } else {
          // UPDATED: Show 0 balance on failure
          setHwBalance({
            balance: 0,
            currency: currency || "",
            message: res?.statusMessage || "Balance info unavailable"
          });
        }
      } catch (err: any) {
        // UPDATED: Always show 0 balance on any error (including 404)
        setHwBalance({
          balance: 0,
          currency: currency || "",
          message: err?.statusMessage || err?.message || "No balance record found"
        });
      }
    }
    else {
      // UPDATED: Show 0 balance when agreement type not specified
      setHwBalance({
        balance: 0,
        currency: currency || "",
        message: "Agreement Type not specified"
      });
    }
  };

  const verifyCustomer = async (bp: string) => {
    if (!bp) return;

    setCustomerStatus("loading");
    setCustomerDetails(null);
    setHwBalance(null);

    try {
      const res = await apiRequest('/agents/user-details', 'POST', {
        type: "Customer",
        isSubCollection: "Y",
        sapBpId: bp,
        salesOrg: salesOrg
      });

      const list = res?.data?.customerDetails || [];

      const foundCustomer = list.find((item: any) =>
        Array.isArray(item.relatedParty) &&
        item.relatedParty.some((rp: any) => String(rp.sapBpId) === bp)
      );

      if (foundCustomer) {
        setCustomerStatus("valid");

        const related = foundCustomer.relatedParty.find((rp: any) => String(rp.sapBpId) === bp);
        const sapCaId = related?.sapCaId || "";
        const division = related?.division || "10";
        const customerCurrency = related?.currency || "";

        const contactList = Array.isArray(foundCustomer.contactMedium) ? foundCustomer.contactMedium : [];
        const addressInfo = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
        const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
        const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

        const displayDetails = {
          name: `${foundCustomer.firstName || ''} ${foundCustomer.lastName || ''}`.trim(),
          sapBpId: bp,
          mobile: mobileInfo.value,
          email: emailInfo.value,
          country: addressInfo.country,
          region: addressInfo.region,
          city: addressInfo.city,
          district: addressInfo.district,
          ward: addressInfo.ward,
          sapCaId: sapCaId,
          division: division,
          agreementType: foundCustomer.agreementType || "",
          currency: customerCurrency
        };

        setCustomerDetails(displayDetails);
        clearErrors("sapBpId");

        if (customerCurrency) {
          setValue("currency", customerCurrency, { shouldValidate: true });
        }

        await fetchHwBalance(bp, foundCustomer.agreementType || "", sapCaId, customerCurrency);

      } else {
        setCustomerStatus("invalid");
        setError("sapBpId", { message: "Customer not found" });
      }
    } catch (error) {
      setCustomerStatus("invalid");
      setError("sapBpId", { message: "Unable to verify customer" });
    }
  };

  // Re-fetch balance when currency changes
  useEffect(() => {
    if (customerDetails && customerDetails.sapBpId && formCurrency) {
      fetchHwBalance(
        customerDetails.sapBpId,
        customerDetails.agreementType || "",
        customerDetails.sapCaId || "",
        formCurrency
      );
    }
  }, [formCurrency]);

  const { data: plantsData, isLoading: isPlantsLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: () => apiRequest('/customer-payments/plants', 'GET'),
    select: (data: any) => (data?.data?.plantDetails as PlantDetail[]) || [],
  });

  // Pre-select single Plant
  useEffect(() => {
    if (plantsData && plantsData.length === 1) {
      setValue("collectionCenter", plantsData[0].plant, { shouldValidate: true });
    }
  }, [plantsData, setValue]);

  // Pre-select single Store
  useEffect(() => {
    if (storeLocations && storeLocations.length === 1) {
      setValue("storeLocation", storeLocations[0].StorageLocation, { shouldValidate: true });
    }
  }, [storeLocations, setValue]);

  // Pre-select single Collector
  useEffect(() => {
    if (otcCollectedByList && otcCollectedByList.length === 1) {
      setValue("collectedBy", otcCollectedByList[0].sapBpId, { shouldValidate: true });
    }
  }, [otcCollectedByList, setValue]);

  // Enhanced Reset Function
  const handleReset = () => {
    let defaultCurrency = "";
    if (currencyOptions && currencyOptions.length > 0) {
      if (countryName.toLowerCase() === "zimbabwe" && currencyOptions.some((c: any) => c.currencyCode === "USD")) {
        defaultCurrency = "USD";
      } else if (currencyOptions.length === 1) {
        defaultCurrency = currencyOptions[0].currencyCode;
      }
    }

    reset({
      sapBpId: "",
      payAmount: "",
      payMode: "CASH",
      currency: defaultCurrency,
      collectionCenter: plantsData && plantsData.length === 1 ? plantsData[0].plant : "",
      storeLocation: "",
      collectedBy: "",
      bankName: "",
      branchName: "",
      chequeNo: "",
      chequeDate: "",
      receiptNo: ""
    });
    setCustomerStatus("idle");
    setCustomerDetails(null);
    setHwBalance(null);
  };

  const { mutate: initiatePayment, isPending } = useMutation({
    mutationFn: (payload: CustomerHwPaymentInitiate) => apiRequest('/customer-payments/initiate', 'POST', payload),
    onSuccess: (res: any) => {
      toast({ title: "Success", description: res?.statusMessage || "Payment processed successfully" });
      handleReset();
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to process payment", variant: "destructive" });
    }
  });

  const onSubmit = async (form: CustomerHwPaymentInitiate) => {
    if (!customerDetails || customerDetails.sapBpId !== form.sapBpId) {
      setError("sapBpId", { message: "Please re-select customer from filter" });
      return;
    }

    // Validate Cheque Date is mandatory for both CHEQUE and BANK_DEPOSIT
    if ((form.payMode === "BANK_DEPOSIT" || form.payMode === "CHEQUE") && !form.chequeDate) {
      setError("chequeDate", {
        message: form.payMode === "BANK_DEPOSIT"
          ? "Bank Deposit Date is required"
          : "Cheque Date is required"
      });
      return;
    } else if (form.payMode !== "BANK_DEPOSIT" && form.payMode !== "CHEQUE") {
      clearErrors("chequeDate");
    }

    // Validate Bank Deposit ID is mandatory for BANK_DEPOSIT
    if (form.payMode === "BANK_DEPOSIT" && !form.chequeNo) {
      setError("chequeNo", { message: "Bank Deposit ID is required" });
      return;
    } else if (form.payMode === "BANK_DEPOSIT") {
      clearErrors("chequeNo");
    }

    // Validate Cheque Number is mandatory for CHEQUE
    if (form.payMode === "CHEQUE" && !form.chequeNo) {
      setError("chequeNo", { message: "Cheque Number is required" });
      return;
    }

    const payload = {
      ...form,
      type: "CUSTOMER",
      description: sanitizeDescription(form.description),
      sapCaId: customerDetails.sapCaId || "",
      channel: channel,
      country: user?.country || "",
      name: customerDetails.name,
      division: customerDetails.division || "10",
      connectionType: customerDetails.agreementType || "",
      storeLocationName: selectedStoreLoc?.StorageLocationName,
      payAmount: String(form.payAmount),

      // UPDATED: Include chequeNo for both CHEQUE and BANK_DEPOSIT
      chequeNo: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.chequeNo : undefined,
      bankName: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.bankName : undefined,
      branchName: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.branchName : undefined,
      chequeDate: (form.payMode === "CHEQUE" || form.payMode === "BANK_DEPOSIT") ? form.chequeDate : undefined,
      onlTransId: undefined,
    };
    initiatePayment(payload as any);
  };

  const handleFilterSelect = (sapBpId: string) => {
    setValue("sapBpId", sapBpId, { shouldValidate: true });
    setShowFilterModal(false);
    verifyCustomer(sapBpId);
  };

  const rightIcon =
    customerStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      : customerStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
        : customerStatus === "invalid" ? <XCircle className="h-4 w-4 text-red-600" />
          : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-azam-blue" />
          Customer Hardware Payment
        </CardTitle>
        <CardDescription>Collect payment from customers for hardware purchases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CustomerSearchModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} onSelect={handleFilterSelect} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search BP <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 relative">
                <Controller name="sapBpId" control={control} render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="Click Filter to select..."
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
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as "OTC")}>
                <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OTC">OTC</SelectItem>
                </SelectContent>
              </Select>
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
                    maxLength={15}
                    value={field.value || ""}
                    placeholder="Enter payment amount"
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
            </div>
          </div>

          {customerDetails && customerStatus === "valid" && (
            <div className="mt-8 p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base font-bold text-azam-orange tracking-wide">Customer Details</span>
              </div>
              <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
                <div><span className="text-azam-orange font-semibold">Name:</span> {customerDetails.name}</div>
                <div><span className="text-azam-orange font-semibold">SAP BP ID:</span> {customerDetails.sapBpId}</div>
                {customerDetails.currency && <div><span className="text-azam-orange font-semibold">Currency:</span> {customerDetails.currency}</div>}
                {customerDetails.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {customerDetails.mobile}</div>}
                {customerDetails.email && <div><span className="text-azam-orange font-semibold">Email:</span> {customerDetails.email}</div>}
                {customerDetails.country && <div><span className="text-azam-orange font-semibold">Country:</span> {customerDetails.country}</div>}
                {customerDetails.region && <div><span className="text-azam-orange font-semibold">Region:</span> {customerDetails.region}</div>}
                {customerDetails.city && <div><span className="text-azam-orange font-semibold">City:</span> {customerDetails.city}</div>}
                {customerDetails.district && <div><span className="text-azam-orange font-semibold">District:</span> {customerDetails.district}</div>}
                {customerDetails.ward && <div><span className="text-azam-orange font-semibold">Ward:</span> {customerDetails.ward}</div>}
              </div>
              {/* UPDATED: Hardware Balance Display - Always shows a number */}
              <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-4">
                <span className="font-semibold text-azam-orange">Hardware Balance:</span>
                <span className={`font-bold ${(hwBalance?.balance ?? 0) <= 0 ? "text-red-600" : "text-gray-900"}`}>
                  {Number(hwBalance?.balance ?? 0).toLocaleString('en-US')} {hwBalance?.currency || formCurrency || ""}
                </span>
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
            <div>
              <Label>Currency <span className="text-red-500">*</span></Label>
              <Controller name="currency" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={currencyLoading}>
                  <SelectTrigger uiSize="sm"><SelectValue placeholder={currencyLoading ? "Loading..." : "Select"} /></SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c: any) => (
                      <SelectItem key={c.currencyCode} value={c.currencyCode}>
                        {c.currencyName}
                      </SelectItem>
                    ))}
                    {currencyOptions.length === 0 && !currencyLoading && (
                      <SelectItem value="none" disabled>No currencies found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )} />
              {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency.message}</p>}
            </div>
            <div>
              <Label>Collection Center <span className="text-red-500">*</span></Label>
              <Controller
                name="collectionCenter"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPlantsLoading}
                  >
                    <SelectTrigger uiSize="sm">
                      <SelectValue placeholder={isPlantsLoading ? "Loading..." : "Select center"} />
                    </SelectTrigger>
                    <SelectContent>
                      {plantsData?.map((plant) => (
                        <SelectItem key={plant.plant} value={plant.plant}>
                          {plant.plantName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              {errors.collectionCenter && <p className="text-xs text-red-600 mt-1">{errors.collectionCenter.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {channel === 'OTC' && (
              <>
                <div>
                  <Label>Store Location <span className="text-red-500">*</span></Label>
                  <Controller name="storeLocation" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!collectionCenter}>
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={!storeLocation}>
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

            {payMode === "CASH" && (
              <div>
                <Label>Receipt Number</Label>
                <Controller name="receiptNo" control={control} render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    maxLength={10}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Enter receipt number"
                  />
                )} />
                {errors.receiptNo && <p className="text-xs text-red-600 mt-1">{errors.receiptNo.message}</p>}
              </div>
            )}
          </div>

          {/* CHEQUE SECTION */}
          {payMode === "CHEQUE" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {/* REQUIREMENT 1: Cheque Number - Max 20 chars, no special characters */}
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

              <div>
                <Label>Cheque Date <span className="text-red-500">*</span></Label>
                <Controller name="chequeDate" control={control} render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.chequeDate ? 'border-red-500' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            field.onChange(format(d, "yyyy-MM-dd"));
                            clearErrors("chequeDate");
                          }
                        }}
                        disabled={(date) => date > today || date < sixMonthsAgo}
                      />
                    </PopoverContent>
                  </Popover>
                )} />
                {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
              </div>

              {/* REQUIREMENT 2: Branch Name - No special characters, max 50 */}
              <div>
                <Label>Deposit Branch Name</Label>
                <Controller
                  name="branchName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="Deposit Branch Name"
                      disabled={!selectedBank}
                      value={field.value || ""}
                      onChange={(e) => {
                        // Remove all non-letter and non-space characters, max 50
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
                        field.onChange(value);
                      }}
                      maxLength={50}
                    />
                  )}
                />
                {errors.branchName && <p className="text-xs text-red-600 mt-1">{errors.branchName.message}</p>}
              </div>
            </div>
          )}

          {/* BANK DEPOSIT SECTION - with Bank Deposit Date */}
          {payMode === "BANK_DEPOSIT" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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

              {/* Branch Name - No special characters, max 50 */}
              <div>
                <Label>Deposit Branch Name</Label>
                <Controller
                  name="branchName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="Deposit Branch Name"
                      disabled={!selectedBank}
                      value={field.value || ""}
                      onChange={(e) => {
                        // Remove all non-letter and non-space characters, max 50
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
                        field.onChange(value);
                      }}
                      maxLength={50}
                    />
                  )}
                />
                {errors.branchName && <p className="text-xs text-red-600 mt-1">{errors.branchName.message}</p>}
              </div>

              {/* Bank Deposit Date - Last 1 month only, no future dates, stored in chequeDate, MANDATORY */}
              <div>
                <Label>Bank Deposit Date <span className="text-red-500">*</span></Label>
                <Controller name="chequeDate" control={control} render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="xs"
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.chequeDate ? 'border-red-500' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            field.onChange(format(d, "yyyy-MM-dd"));
                            clearErrors("chequeDate");
                          }
                        }}
                        disabled={(date) => date > today || date < oneMonthAgo}
                      />
                    </PopoverContent>
                  </Popover>
                )} />
                {errors.chequeDate && <p className="text-xs text-red-600 mt-1">{errors.chequeDate.message}</p>}
              </div>
            </div>
          )}

          <div className="mt-4">
            <Label>Description</Label>
            <Textarea {...register("description")} placeholder="Enter payment description" rows={3} />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button size="xs" type="submit" className="bg-azam-blue hover:bg-azam-blue/90" disabled={isSubmitting || isPending}>
              {(isSubmitting || isPending) ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Create Payment"}
            </Button>
            <Button size="xs" variant="outline" type="button" onClick={handleReset} disabled={isSubmitting || isPending}> Reset Form </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
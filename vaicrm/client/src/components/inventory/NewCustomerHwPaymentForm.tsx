import { useEffect, useMemo, useState, useCallback, ReactNode, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Filter, Loader2, Plus, Search, XCircle, CheckCircle2, Trash2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Modals
import CustomerSearchModal from "@/components/customers/CustomerSearchModal";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal";

const SERIAL_NUMBER_REQUIRED_BUNDLES = ['59', '67', '72', '73', '68', '21', '60', '52'];

// --- Schema Definition ---
const itemSchema = z.object({
  materialCode: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.number().default(0),
  totalPrice: z.number().default(0),
  itemSerialNo: z.string().optional(),
  smartCardNumber: z.string().optional(),
  selectedSerials: z.array(z.string()).optional(),
});

const extendedSchema = z.object({
  sapBpId: z.string().min(1, "BP ID is required"),
  sapCaId: z.string().optional(),
  channel: z.enum(["OTC", "AGENT"]),
  plantSelected: z.string().min(1, "Plant is required"),
  priceType: z.string(),
  currency: z.string().min(1, "Currency is required"),
  storeLocationSelected: z.string().optional(),
  agentCollectedBy: z.string().optional(),
  items: z.array(itemSchema),
  remark: z.string().optional(),
});

type CustomerHardwareSaleFormExtended = z.infer<typeof extendedSchema>;

type Plant = { plant: string; plantName: string };
type HwProductApiRow = {
  productName: string;
  productId: string;
  bundleName: string;
  productPriceType: string;
  amount: string;
  currency: string;
  salesOrg: string;
  stock?: number;
};

type CurrencyApiRow = {
  currencyCode: string;
  countryName: string;
};

function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ✅ MEMOIZED Multi-Select Serial Component to prevent re-renders
interface MultiSelectSerialProps {
  index: number;
  selectedMaterialCode: string;
  targetQty: number;
  selected: string[];
  serials: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectionChange: (newSelected: string[]) => void;
  toast: any;
}

const MultiSelectSerial = memo(({
  index,
  selectedMaterialCode,
  targetQty,
  selected,
  serials,
  isOpen,
  onOpenChange,
  onSelectionChange,
  toast
}: MultiSelectSerialProps) => {

  const handleItemClick = useCallback((placeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let newSelected = [...selected];
    const isSelected = selected.includes(placeId);

    if (isSelected) {
      newSelected = newSelected.filter((s: string) => s !== placeId);
    } else {
      if (newSelected.length >= targetQty) {
        toast({
          title: "Limit Reached",
          description: `You can only select ${targetQty} serial numbers.`
        });
        return;
      }
      newSelected.push(placeId);
    }

    onSelectionChange(newSelected);
  }, [selected, targetQty, toast, onSelectionChange]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-between pl-3 pr-3 font-normal text-left",
            "h-7 text-xs",
            (selected.length !== targetQty) ? "border-red-500" : ""
          )}
          size="xs"
          type="button"
        >
          {selected.length > 0
            ? `${selected.length} / ${targetQty} selected`
            : (serials.length ? "Select serials" : "No serials")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search serial..." />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No serial found.</CommandEmpty>
            <CommandGroup>
              {serials.map((placeId) => {
                const isSelected = selected.includes(placeId);
                return (
                  <div
                    key={placeId}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    onClick={(e) => handleItemClick(placeId, e)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                    <span>{placeId}</span>
                  </div>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

MultiSelectSerial.displayName = 'MultiSelectSerial';

// ✅ MEMOIZED Single-Select Serial Component
interface SingleSelectSerialProps {
  index: number;
  value: string;
  serials: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (serial: string) => void;
}

const SingleSelectSerial = memo(({
  index,
  value,
  serials,
  isOpen,
  onOpenChange,
  onSelect
}: SingleSelectSerialProps) => {

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between pl-3 pr-3 font-normal text-left"
          size="xs"
          type="button"
        >
          {value ? value : (serials.length ? "Select serial" : "No serials")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search serial..." />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No serial found.</CommandEmpty>
            <CommandGroup>
              {serials.map((serial) => (
                <CommandItem
                  key={serial}
                  value={serial}
                  onSelect={() => {
                    onSelect(serial);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === serial ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {serial}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

SingleSelectSerial.displayName = 'SingleSelectSerial';

export default function NewCustomerHwSaleForm() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const salesOrg = user?.salesOrg || "";
  const countryName = user?.country || "";

  const isOtcUser = (user?.isOtc || "N") === "Y";
  const isWarehouseUser = (user?.isMainPlant || "N") === "Y";
  const isSubAgent = !!user?.onbId;
  const isAgent = user?.allAccess === "N" && !isOtcUser && !isSubAgent;
  const loggedInAgentBpId = user?.sapBpId || user?.parentSapBpId || "";

  const getDefaultChannel = (): "OTC" | "AGENT" => {
    if (isOtcUser || isWarehouseUser) return "OTC";
    if (isAgent || isSubAgent) return "AGENT";
    return "OTC";
  };

  const isChannelLocked = isAgent || isSubAgent || isOtcUser || isWarehouseUser;
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  const [agentCollectorInput, setAgentCollectorInput] = useState("");
  const [agentCollectorCaId, setAgentCollectorCaId] = useState<string | null>(null);

  const [agentSerialsMap, setAgentSerialsMap] = useState<Record<string, string[]>>({});
  const [agentStockMap, setAgentStockMap] = useState<Record<string, number>>({});
  const [loadingAgentSerials, setLoadingAgentSerials] = useState<Record<string, boolean>>({});

  const [otcSerialsMap, setOtcSerialsMap] = useState<Record<string, string[]>>({});
  const [loadingOtcSerials, setLoadingOtcSerials] = useState<Record<string, boolean>>({});

  const [serialDetailsMap, setSerialDetailsMap] = useState<Record<string, { manufacturer: string; manufacturerSrNo: string }>>({});
  const [openSerialCombobox, setOpenSerialCombobox] = useState<Record<number, boolean>>({});

  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
  const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, touchedFields, isSubmitted },
    clearErrors,
    setError,
  } = useForm<CustomerHardwareSaleFormExtended>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      sapBpId: "",
      sapCaId: "",
      channel: getDefaultChannel(),
      plantSelected: "",
      priceType: "INDIVIDUAL",
      currency: "",
      storeLocationSelected: "",
      agentCollectedBy: isAgent ? loggedInAgentBpId : "",
      items: [],
      remark: "",
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({ control, name: "items" });

  const sapBpId = watch("sapBpId");
  const debouncedSapBpId = useDebounce(sapBpId, 500);
  const channel = watch("channel");
  const plantSelected = watch("plantSelected");
  const priceType = watch("priceType");
  const items = watch("items");
  const agentCollectedSapBpId = watch("agentCollectedBy");
  const storeLocationSelected = watch("storeLocationSelected");
  const formCurrency = watch("currency");

  const { data: currencyOptions, isLoading: currencyLoading } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["currency-by-country-cust", countryName],
    enabled: !!countryName && !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest('/data/currency', 'POST', { countryName, status: "", currencyCode: "" });
      let currencyRows: CurrencyApiRow[] = res?.data?.data ?? [];
      return currencyRows.map((r) => ({ value: r.currencyCode, label: `${r.currencyCode} - ${r.countryName}` }));
    },
  });

  useEffect(() => {
    if (currencyOptions && currencyOptions.length === 1) {
      const current = getValues("currency");
      if (!current || current !== currencyOptions[0].value) {
        const val = currencyOptions[0].value;
        setValue("currency", val);
        replace([]);
        clearErrors("items");
      }
    }
  }, [currencyOptions, getValues, setValue, replace, clearErrors]);

  useEffect(() => {
    const initializeUser = async () => {
      if (isOtcUser || isWarehouseUser) {
        setValue("channel", "OTC");
        return;
      }

      if (isSubAgent && user?.onbId) {
        setAgentCollectorInput(`${user.name || user.username} (${user.onbId})`);
        setAgentCollectorCaId(user.sapCaId || null); // Assuming sapCaId might be needed
        setValue("channel", "AGENT");
        setValue("agentCollectedBy", user.onbId);
        return;
      }

      if (isAgent && loggedInAgentBpId && salesOrg) {
        try {
          const userRes = await apiRequest('/agents/user-details', 'POST', {
            type: 'Agent',
            sapBpId: loggedInAgentBpId,
            salesOrg: salesOrg,
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

            setAgentCollectorInput(`${agentName} (${loggedInAgentBpId})`);
            setAgentCollectorCaId(sapCaId);

            setValue("channel", "AGENT");
            setValue("agentCollectedBy", loggedInAgentBpId);
          }
        } catch (error) {

        }
      }
    };
    initializeUser();
  }, [isAgent, isSubAgent, isOtcUser, isWarehouseUser, loggedInAgentBpId, salesOrg, setValue, user]);

  const fetchStock = async (plantId: string, materialId: string, sloc: string = "MAIN") => {
    if (!plantId || !materialId) return;

    setLoadingStock(prev => ({ ...prev, [materialId]: true }));
    try {
      const res = await apiRequest('/inventory/stock-details', 'POST', {
        plant: plantId,
        material: materialId,
        storageLocation: sloc
      });

      let qty = 0;
      if (res?.status === "SUCCESS" && Array.isArray(res?.data?.stockOverview)) {
        const match = res.data.stockOverview.find((so: any) => so.place?.sloc === sloc);
        if (match) {
          qty = Number(match.maxStockLevel?.unit || 0);
        }
      }
      setStockMap(prev => ({ ...prev, [materialId]: qty }));
    } catch (err) {

      setStockMap(prev => ({ ...prev, [materialId]: null }));
    } finally {
      setLoadingStock(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const { data: plants = [], isLoading: plantsLoading, isError: plantsIsError } = useQuery<Plant[]>({
    queryKey: ["plants-list-otc"],
    queryFn: () => apiRequest('/inventory/plants'),
    select: (data: any) => data?.data?.plantDetails || [],
    staleTime: Infinity,
  });

  const { data: storeLocations = [], isLoading: storesLoading } = useQuery<{ StorageLocation: string; StorageLocationName: string; sapBpId?: string }[]>({
    queryKey: ["otc-stores", plantSelected],
    enabled: !!plantSelected && channel === "OTC",
    queryFn: () => apiRequest('/data/store-locations', 'POST', { plantNumber: plantSelected, type: 'OTC' }),
    select: (data: any) => data?.data?.storageDetails || [],
  });

  const productBundleFilter = useMemo(() => {
    const div = customerDetails?.division;
    if (!div) return "";
    if (String(div) === "11") return "Z001";
    if (String(div) === "12") return "Z002";
    return "";
  }, [customerDetails?.division]);

  const excludedBundle = useMemo(() => {
    const div = customerDetails?.division;
    if (!div) return null;
    if (String(div) === "11") return "Z002";
    if (String(div) === "12") return "Z001";
    return null;
  }, [customerDetails?.division]);

  const { data: allProducts = [], isLoading: hwLoading } = useQuery<HwProductApiRow[]>({
    queryKey: ["hw-products-customer", productBundleFilter, priceType],
    staleTime: 60 * 60 * 1000,
    queryFn: () => apiRequest('/inventory/hw-products', 'POST', { type: "CUSTOMER", bundleName: productBundleFilter }),
    select: (data: any) => data?.data?.hwProductDetails || [],
  });

 const materialOptions = useMemo(() => {
  if (!allProducts || allProducts.length === 0) return [];
  
  const wanted = priceType === "KIT" ? "kit price" : "individual price";
  
  let rows = allProducts.filter((p) => {
    const priceMatch = (p.productPriceType || "").toLowerCase().includes(wanted);
    const bundleMatch = !excludedBundle || (p.bundleName || "") !== excludedBundle;
    return priceMatch && bundleMatch;
  });

  // Filter by Currency (must filter when currency is selected)
  if (formCurrency && formCurrency.trim() !== "") {
    rows = rows.filter((p) => p.currency === formCurrency);
  }

  // Deduplicate by productId
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      const id = r.productId || "";
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((p) => ({ 
      value: p.productId, 
      label: p.productName || p.productId
    }));
}, [allProducts, priceType, excludedBundle, formCurrency]);

 const findProductRow = useCallback((pid: string): HwProductApiRow | undefined => {
  if (!allProducts) return undefined;
  
  const wanted = (priceType === "KIT" ? "kit price" : "individual price").toLowerCase();
  
  // Filter candidates by productId
  const candidates = allProducts.filter((p) => p.productId === pid);
  
  // First try to find exact match with price type AND currency
  let match = candidates.find((p) => 
    (p.productPriceType || "").toLowerCase().includes(wanted) && 
    (!formCurrency || p.currency === formCurrency)
  );
  
  // If no match with currency, try just price type
  if (!match) {
    match = candidates.find((p) => (p.productPriceType || "").toLowerCase().includes(wanted));
  }
  
  // Fallback to first candidate
  if (!match) {
    match = candidates[0];
  }
  
  return match;
}, [allProducts, priceType, formCurrency]);

const getUnitPriceFor = useCallback((pid: string): number => {
  const row = findProductRow(pid);
  if (!row) return 0;
  // Only return price if currency matches (when currency is selected)
  if (formCurrency && row.currency !== formCurrency) return 0;
  const n = parseFloat(row.amount || "0");
  return isNaN(n) ? 0 : n;
}, [findProductRow, formCurrency]);

  useEffect(() => {
    const currentItems = getValues("items");
    if (!currentItems || currentItems.length === 0) return;

    let hasChanges = false;
    const newItems = currentItems.map(item => {
      if (!item.materialCode) return item;
      const prod = findProductRow(item.materialCode);
      if (!prod) return item;

      const newUnit = parseFloat(prod.amount || "0");
      const qty = Number(item.quantity) || 0;
      const newTotal = newUnit * qty;

      if (Math.abs(newUnit - (item.unitPrice || 0)) > 0.001 || Math.abs(newTotal - (item.totalPrice || 0)) > 0.001) {
        hasChanges = true;
        return {
          ...item,
          unitPrice: newUnit,
          totalPrice: newTotal
        };
      }
      return item;
    });

    if (hasChanges) {
      replace(newItems);
    }
  }, [priceType, allProducts, replace, getValues, findProductRow]);

  const totals = useMemo(() => {
    const total = items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
    return { total };
  }, [items]);

  const hasUnavailableStock = useMemo(() => {
  return (items || []).some((it: any) => {
    if (!it?.materialCode) return false;
    if (channel === "AGENT") {
      // Use agentStockMap instead of agentSerialsMap length
      const available = agentStockMap[it.materialCode] ?? 0;
      return available === 0;
    } else {
      return (stockMap[it.materialCode] ?? 0) === 0;
    }
  });
}, [items, stockMap, agentStockMap, channel]);

  const fetchBalanceMutation = useMutation({
    mutationFn: async (payload: { sapBpId: string; sapCaId: string; connectionType?: string; salesOrg: string; currency: string }) => {
      const type = (payload.connectionType || "").toLowerCase();

      if (type === 'postpaid') {
        try {
          const res = await apiRequest("/customer-payments/balance-by-bp", "POST", {
            sapBpId: payload.sapBpId,
            salesOrg: payload.salesOrg,
            currency: payload.currency
          });
          if (res?.status === "SUCCESS" && res?.data) {
            return {
              ...res,
              data: {
                ...res.data,
                hwBalance: res.data.balance ?? 0,
                currency: res.data.currency || payload.currency
              }
            };
          }
          return {
            status: "SUCCESS",
            data: {
              hwBalance: 0,
              currency: payload.currency || "",
              message: res?.statusMessage || "Balance info unavailable"
            }
          };
        } catch (err: any) {
          return {
            status: "SUCCESS",
            data: {
              hwBalance: 0,
              currency: payload.currency || "",
              message: err?.statusMessage || err?.message || "No balance record found"
            }
          };
        }
      }

      try {
        const res = await apiRequest('/hardware-sales/customer/balance', 'POST', payload);
        if (res?.status === "SUCCESS" && res?.data) {
          return {
            ...res,
            data: {
              ...res.data,
              hwBalance: res.data.hwBalance ?? 0,
              currency: res.data.currency || payload.currency
            }
          };
        }
        return {
          status: "SUCCESS",
          data: {
            hwBalance: 0,
            currency: payload.currency || "",
            message: res?.statusMessage || "Balance info unavailable"
          }
        };
      } catch (err: any) {
        return {
          status: "SUCCESS",
          data: {
            hwBalance: 0,
            currency: payload.currency || "",
            message: err?.statusMessage || err?.message || "Balance fetch error"
          }
        };
      }
    },
  });
  const { mutate: fetchBalance, reset: resetBalance } = fetchBalanceMutation;

  const fetchCustomerDetailsAndBalance = useCallback(async (bpId: string) => {
    setVerifyState("loading");
    resetBalance();

    try {
      const res = await apiRequest('/agents/user-details', 'POST', {
        type: "Customer",
        isSubCollection: "Y",
        sapBpId: bpId,
        salesOrg: salesOrg,
        division: ""
      });

      const list = res?.data?.customerDetails || [];
      const foundCustomer = list.find((item: any) =>
        Array.isArray(item.relatedParty) &&
        item.relatedParty.some((rp: any) => String(rp.sapBpId) === bpId)
      );

      if (foundCustomer) {
        const related = foundCustomer.relatedParty.find((rp: any) => String(rp.sapBpId) === bpId);
        const sapCaId = related?.sapCaId || "";
        const division = related?.division || "";
        const customerCurrency = related?.currency || "";

        const contactList = Array.isArray(foundCustomer.contactMedium) ? foundCustomer.contactMedium : [];
        const addressInfo = contactList.find((c: any) => c.type === 'BILLING_ADDRESS') || {};
        const mobileInfo = contactList.find((c: any) => c.type === 'mobile') || {};
        const emailInfo = contactList.find((c: any) => c.type === 'email') || {};

        const displayDetails = {
          name: `${foundCustomer.firstName || ''} ${foundCustomer.lastName || ''}`.trim(),
          sapBpId: bpId,
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
        setValue("sapCaId", sapCaId, { shouldValidate: true });

        if (customerCurrency) {
          setValue("currency", customerCurrency);
          replace([]);
          clearErrors("items");
        }

        setVerifyState("ok");

        if (sapCaId) {
          fetchBalance({
            sapBpId: bpId,
            sapCaId,
            connectionType: displayDetails.agreementType,
            salesOrg: salesOrg,
            currency: customerCurrency
          });
        } else {
          toast({ title: "Info", description: "Customer found, but no hardware account (CA ID) is linked. Balance cannot be fetched." });
        }
      } else {
        setCustomerDetails(null);
        setValue("sapCaId", "", { shouldValidate: true });
        setVerifyState("err");
        toast({ title: "Not Found", description: "No customer found with this SAP BP ID.", variant: "destructive" });
      }
    } catch (e: any) {
      setCustomerDetails(null);
      setValue("sapCaId", "", { shouldValidate: true });
      setVerifyState("err");
    }
  }, [setValue, fetchBalance, resetBalance, toast, salesOrg, replace, clearErrors]);

  useEffect(() => {
    if (debouncedSapBpId && /^\d{6,10}$/.test(debouncedSapBpId)) {
      fetchCustomerDetailsAndBalance(debouncedSapBpId);
    } else {
      setCustomerDetails(null);
      setValue("sapCaId", "");
      setVerifyState("idle");
      resetBalance();
    }
  }, [debouncedSapBpId, fetchCustomerDetailsAndBalance, resetBalance, setValue]);

  useEffect(() => {
    if (customerDetails && customerDetails.sapCaId && formCurrency) {
      fetchBalance({
        sapBpId: customerDetails.sapBpId,
        sapCaId: customerDetails.sapCaId,
        connectionType: customerDetails.agreementType,
        salesOrg: salesOrg,
        currency: formCurrency
      });
    }
  }, [formCurrency, customerDetails, fetchBalance, salesOrg]);

  const handleReset = () => {
    reset();
    setCustomerDetails(null);
    setVerifyState("idle");
    resetBalance();
    setStockMap({});
    setAgentSerialsMap({});
    setAgentStockMap({}); 
    setOtcSerialsMap({});

    if (isOtcUser || isWarehouseUser) {
      setValue("channel", "OTC");
    } else if (isAgent && loggedInAgentBpId) {
      setValue("channel", "AGENT");
      setValue("agentCollectedBy", loggedInAgentBpId);
    } else {
      setAgentCollectorInput("");
      setAgentCollectorCaId(null);
    }
  };

  const { mutate: submitSale, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: CustomerHardwareSaleFormExtended) => {
      const selectedPlantObject = plants.find((p) => p.plant === data.plantSelected);
      const plantValue = selectedPlantObject ? `${selectedPlantObject.plantName}_${selectedPlantObject.plant}` : data.plantSelected;
      const collectedByCaId = channel === "AGENT" ? agentCollectorCaId : null;

      const payload = {
        plant: plantValue,
        sapBpId: data.sapBpId,
        sapCaId: data.sapCaId,
        requestType: "HARDWARE_SALE",
        type: "CUSTOMER",
        connectionType: customerDetails?.agreementType || "",
        totalAmount: totals.total.toFixed(2),
        remark: data.remark || "Customer HW Sales Order",
        collectedBySapCaId: collectedByCaId,
        collectedBy: channel === "AGENT" ? data.agentCollectedBy : undefined,
        storeLocation: channel === "OTC" ? data.storeLocationSelected : undefined,
        channel: channel,
        transferFrom: channel === "AGENT" ? data.agentCollectedBy : undefined,
        transferTo: data.sapBpId,
        currency: data.currency,
        productSalesOrder: data.items.map((item) => {
          const prod = findProductRow(item.materialCode);

          // Logic to handle multiple serials for Postpaid > 1 qty
          const qty = Number(item.quantity) || 1;
          const serials = item.selectedSerials || [];
          let finalSerialNo = "";

          if (qty > 1 && qty <= 5 && serials.length > 0) {
            finalSerialNo = serials.join(",");
          } else {
            finalSerialNo = item.itemSerialNo || "";
          }

          const serialListFn = (serials.length > 0 && qty <= 5 && qty > 1) ? serials : (item.itemSerialNo ? [item.itemSerialNo] : []);
          const manufacturerList = serialListFn.map((sn) => (sn && serialDetailsMap[sn]?.manufacturer) || "").filter(Boolean).join(",");
          const manufacturerSrNoList = serialListFn.map((sn) => (sn && serialDetailsMap[sn]?.manufacturerSrNo) || "").filter(Boolean).join(",");

          return {
            salesOrg: prod?.salesOrg || "",
            division: customerDetails?.division || "",
            material: item.materialCode,
            itemType: prod?.productName || prod?.bundleName || "HARDWARE",
            itemQty: String(item.quantity),
            currency: prod?.currency || data.currency || "",
            priceType: prod?.productPriceType || "",
            itemAmount: (item.totalPrice || 0).toFixed(2),
            itemSerialNo: finalSerialNo,
            bundleName: prod?.bundleName || "",
            productId: prod?.productId || "",
            manufacturer: manufacturerList,
            manufacturerSrNo: manufacturerSrNoList,
          };
        }),
      };

      return apiRequest('/hardware-sales/customer/orders', 'POST', payload);
    },
    onSuccess: (res: any) => {
      toast({ title: "Success", description: res?.statusMessage || "Sale request submitted successfully" });
      handleReset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.statusMessage || err?.message || "Failed to submit sale", variant: "destructive" });
    },
  });

  const currentHwBalance = fetchBalanceMutation.data?.data?.hwBalance ?? 0;
  const isPostpaid = (customerDetails?.agreementType || "").toLowerCase() === "postpaid";

  const isAgentChannel = channel === "AGENT" || isAgent;
  const hasZeroBalance = !isAgentChannel && fetchBalanceMutation.isSuccess && currentHwBalance <= 0 && !isPostpaid;

  const onSubmit = (data: CustomerHardwareSaleFormExtended) => {
    for (let i = 0; i < (data.items || []).length; i++) {
      const it = data.items[i];
      const prod = findProductRow(it.materialCode);
      const qty = Number(it.quantity) || 1;

      if (prod && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prod.productId)) {
        // If qty > 5, serial numbers are hidden, so validation skipped (bulk order)
        if (qty <= 5) {
          if (qty === 1) {
            const sn = (it.itemSerialNo || "").toString().trim();
            if (!sn) {
              setError(`items.${i}.itemSerialNo`, { type: "required" });
              toast({ title: "Serial Number Required", description: `Please enter serial number for ${prod.productName}`, variant: "destructive" });
              return;
            }
          } else {
            // For Postpaid quantity 2-5
            const serials = it.selectedSerials || [];
            if (serials.length !== qty) {
              toast({
                title: "Serial Number Mismatch",
                description: `You must select exactly ${qty} serial number${qty > 1 ? 's' : ''} for ${prod.productName}. Currently selected: ${serials.length}.`,
                variant: "destructive"
              });
              return;
            }
          }
        }
      }
    }
    if (hasZeroBalance) {
      toast({ title: "Insufficient Balance", description: "Customer hardware balance is 0. Cannot process sale.", variant: "destructive" });
      return;
    }
    if (hasUnavailableStock) {
      toast({ title: "Stock Error", description: "One or more selected items have 0 available stock. Please change material or quantity.", variant: "destructive" });
      return;
    }
    submitSale(data);
  };

  const handleCustomerSelect = (bpId: string) => {
    setValue("sapBpId", bpId, { shouldValidate: true });
    setShowCustomerModal(false);
  };

  const fetchAgentSerials = useCallback(async (agentBpId: string, materialId: string) => {
  if (!agentBpId || !materialId) return;
  setLoadingAgentSerials(prev => ({ ...prev, [materialId]: true }));
  try {
    const res = await apiRequest('/inventory/agent-stock-serials', 'POST', {
      sapBpId: agentBpId,
      material: materialId,
      status: "NEW"
    });
    const list = Array.isArray(res?.data?.stockDetails) ? res.data.stockDetails : [];
    const serials = list.map((s: any) => s.serialNo).filter(Boolean);
    setAgentSerialsMap(prev => ({ ...prev, [materialId]: serials }));
    
    // Use quantity from response directly
    const qty = Number(res?.data?.quantity) || 0;
    setAgentStockMap(prev => ({ ...prev, [materialId]: qty }));
  } catch (err) {
    setAgentSerialsMap(prev => ({ ...prev, [materialId]: [] }));
    setAgentStockMap(prev => ({ ...prev, [materialId]: 0 }));
  } finally {
    setLoadingAgentSerials(prev => ({ ...prev, [materialId]: false }));
  }
}, []);

  const fetchOtcSerials = useCallback(async (plant: string, storeLoc: string, materialId: string) => {
    if (!plant || !storeLoc || !materialId) return;
    setLoadingOtcSerials(prev => ({ ...prev, [materialId]: true }));
    try {
      const res = await apiRequest('/inventory/stock-serial-details', 'POST', {
        plant: plant,
        storageLocation: storeLoc,
        material: materialId,
        itemId: materialId,
      });

      const list = Array.isArray(res?.data?.stockSerialNoOverview) ? res.data.stockSerialNoOverview : [];
      const newDetails: Record<string, any> = {};
      const serials = list.map((s: any) => {
        const sn = s.place?.id || s.placeId;
        if (sn) {
          newDetails[sn] = {
            manufacturer: s.relatedParty?.manufacturer || s.manufacturer || "",
            manufacturerSrNo: s.relatedParty?.manufacturerSrNo || s.manufacturerSrNo || ""
          };
          return sn;
        }
        return null;
      }).filter(Boolean);

      setSerialDetailsMap(prev => ({ ...prev, ...newDetails }));
      setOtcSerialsMap(prev => ({ ...prev, [materialId]: serials }));
    } catch (err) {

      setOtcSerialsMap(prev => ({ ...prev, [materialId]: [] }));
    } finally {
      setLoadingOtcSerials(prev => ({ ...prev, [materialId]: false }));
    }
  }, []);

  useEffect(() => {
    if (channel === "OTC" && plantSelected && storeLocationSelected) {
      const currentItems = getValues("items") || [];
      currentItems.forEach((it: any) => {
        if (it?.materialCode) fetchOtcSerials(plantSelected, storeLocationSelected, it.materialCode);
      });
    }
  }, [channel, plantSelected, storeLocationSelected, fetchOtcSerials, getValues]);

  const handleAgentSelect = (agent: AgentApiItem) => {
    setValue("agentCollectedBy", agent.sapBpId, { shouldValidate: true });
    setAgentCollectorInput(`${agent.agentName} (${agent.sapBpId})`);
    setAgentCollectorCaId(agent.sapCaId || null);
    setShowAgentModal(false);
    clearErrors("agentCollectedBy");

    const currentItems = getValues("items") || [];
    currentItems.forEach((it: any) => {
      if (it?.materialCode) fetchAgentSerials(agent.sapBpId, it.materialCode);
    });
  };

  useEffect(() => {
    if (isChannelLocked) return;

    if (channel === "AGENT") {
      setValue("agentCollectedBy", "");
      setAgentCollectorInput("");
      setAgentCollectorCaId(null);
    } else {
      setValue("storeLocationSelected", "");
    }
  }, [channel, setValue, isChannelLocked]);

  useEffect(() => {
    const current = getValues("currency");
    if (current) return;

    if (currencyOptions && currencyOptions.length > 0) {
      let defaultVal = "";

      if (countryName && countryName.toLowerCase() === "zimbabwe") {
        const usdExists = currencyOptions.some((opt) => opt.value === "USD");
        if (usdExists) {
          defaultVal = "USD";
        }
      }

      if (!defaultVal && currencyOptions.length === 1) {
        defaultVal = currencyOptions[0].value;
      }

      if (defaultVal) {
        setValue("currency", defaultVal);
        replace([]);
        clearErrors("items");
      }
    }
  }, [currencyOptions, getValues, setValue, replace, clearErrors, countryName]);

  // ✅ Handler for multi-select serial change
  const handleMultiSerialChange = useCallback((index: number, newSelected: string[]) => {
    setValue(`items.${index}.selectedSerials`, newSelected, {
      shouldValidate: false,
      shouldDirty: true,
      shouldTouch: false
    });
  }, [setValue]);

  // ✅ Handler for single-select serial change
  const handleSingleSerialChange = useCallback((index: number, serial: string) => {
    const currentItem = getValues(`items.${index}`);
    setValue(`items.${index}.itemSerialNo`, serial, {
      shouldValidate: false,
      shouldDirty: true,
      shouldTouch: false
    });
  }, [setValue, getValues]);

  // ✅ Handler for combobox open state
  const handleSerialComboboxOpenChange = useCallback((index: number, open: boolean) => {
    setOpenSerialCombobox(prev => ({ ...prev, [index]: open }));
  }, []);

  const isFormSectionDisabled = !customerDetails;

  const rightIcon = verifyState === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    : verifyState === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
      : verifyState === "err" ? <XCircle className="h-4 w-4 text-red-600" />
        : undefined;

const displayCurrency = formCurrency || 
  fetchBalanceMutation.data?.data?.currency || 
  (items.length > 0 ? findProductRow(items[0].materialCode)?.currency : "") || 
  "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-azam-blue" /> New Customer Hardware Sale</CardTitle>
        <CardDescription>Create a new hardware sale for walk-in or agent-assisted customers</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">

          <CustomerSearchModal
            isOpen={showCustomerModal}
            onClose={() => setShowCustomerModal(false)}
            onSelect={handleCustomerSelect}
          />

          <ParentAgentSearchModal
            isOpen={showAgentModal}
            onClose={() => setShowAgentModal(false)}
            onSelect={handleAgentSelect}
            isSubCollection="N"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="w-full">
              <Label className="mb-1 block">Customer SAP BP ID <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 relative">
                <Controller name="sapBpId" control={control} render={({ field }) => (
                  <Input
                    {...field}
                    leftIcon={<Search className="h-4 w-4" />}
                    rightIcon={rightIcon}
                    placeholder="Click Filter..."
                    uiSize="sm"
                    readOnly
                    onClick={() => setShowCustomerModal(true)}
                    className="cursor-pointer bg-gray-50 focus:ring-0"
                  />
                )} />
                <Button size="xs" type="button" onClick={() => setShowCustomerModal(true)}>
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
              {errors.sapBpId && <p className="text-xs text-red-600 mt-1">{errors.sapBpId.message}</p>}
            </div>

            <div className="w-full">
              <Label className="mb-1 block">Channel</Label>
              <Controller control={control} name="channel" render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isFormSectionDisabled || isChannelLocked}
                >
                  <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OTC">OTC</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="w-full">
              <Label className="mb-1 block">Plant / Center <span className="text-red-500">*</span></Label>
              <Controller control={control} name="plantSelected" render={({ field }) => (
                <Select value={field.value} onValueChange={(val) => {
                  field.onChange(val);
                  const currentItems = getValues("items");
                  currentItems.forEach(item => {
                    const sloc = channel === "OTC" ? getValues("storeLocationSelected") || "MAIN" : "MAIN";
                    if (item.materialCode) fetchStock(val, item.materialCode, sloc);
                  });
                }} disabled={isFormSectionDisabled}>
                  <SelectTrigger uiSize="sm">
                    <SelectValue placeholder={plantsLoading ? "Loading..." : plantsIsError ? "Error" : "Select Plant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p) => (
                      <SelectItem key={p.plant} value={p.plant}>{p.plantName || p.plant}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.plantSelected && <p className="text-xs text-red-600 mt-1">{errors.plantSelected.message}</p>}
            </div>

            <div className="w-full">
              <Label className="mb-1 block">Price Type</Label>
              <Controller control={control} name="priceType" render={({ field }) => (
                <Select value={field.value} onValueChange={(val) => {
                  field.onChange(val);
                  replace([]);
                }} disabled={isFormSectionDisabled}>
                  <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KIT">Kit Price</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual Price</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="w-full">
              <Label className="mb-1 block">Currency <span className="text-red-500">*</span></Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => {
                      field.onChange(val);
                      replace([]);
                      clearErrors("items");
                    }}
                    disabled={isFormSectionDisabled}
                  >
                    <SelectTrigger uiSize="sm" aria-invalid={!!errors.currency || undefined}>
                      <SelectValue placeholder={currencyLoading ? "Loading..." : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : (currencyOptions || []).map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency.message}</p>}
            </div>

            {channel === "OTC" ? (
              <div className="w-full">
                <Label className="mb-1 block">Store Location <span className="text-red-500">*</span></Label>
                <Controller control={control} name="storeLocationSelected" render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => {
                    field.onChange(val);
                    const currentItems = getValues("items");
                    currentItems.forEach(item => {
                      if (item.materialCode) fetchStock(plantSelected, item.materialCode, val);
                    });
                  }} disabled={isFormSectionDisabled || !plantSelected || storesLoading}>
                    <SelectTrigger uiSize="sm">
                      <SelectValue placeholder={!plantSelected ? "Select Plant first" : storesLoading ? "Loading..." : "Select Store"} />
                    </SelectTrigger>
                    <SelectContent>
                      {storeLocations.map((s, idx) => (
                        <SelectItem key={`${s.StorageLocationName}-${idx}`} value={s.StorageLocation}>{s.StorageLocationName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.storeLocationSelected && <p className="text-xs text-red-600 mt-1">{errors.storeLocationSelected.message}</p>}
              </div>
            ) : (
              <div className="w-full">
                <Label className="mb-1 block">Collected By (Agent) <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 relative">
                  <Controller name="agentCollectedBy" control={control} render={({ field }) => (
                    <Input
                      placeholder="Click Filter to select agent..."
                      value={agentCollectorInput || field.value || ""}
                      readOnly
                      onClick={() => !isAgent && !isSubAgent && setShowAgentModal(true)}
                      className={`focus:ring-0 ${isAgent || isSubAgent ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer bg-gray-50'}`}
                      uiSize="sm"
                      disabled={isFormSectionDisabled || !plantSelected}
                    />
                  )} />
                  {!isAgent && !isSubAgent && (
                    <Button size="xs" type="button" onClick={() => setShowAgentModal(true)} disabled={isFormSectionDisabled || !plantSelected}>
                      <Filter className="h-4 w-4" /> Filter
                    </Button>
                  )}
                </div>
                {errors.agentCollectedBy && <p className="text-xs text-red-600 mt-1">{errors.agentCollectedBy.message}</p>}
              </div>
            )}
          </div>

          {customerDetails && (
            <div className="mt-2 mb-2 w-full p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><span className="text-base font-bold text-azam-orange tracking-wide">Customer Details</span></div>
              <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
                <div className="font-semibold text-gray-900"><span className="text-azam-orange">Name:</span>{" "}{customerDetails.name || `${customerDetails.salutation || ''} ${customerDetails.firstName || ''} ${customerDetails.lastName || ''}`.trim()}</div>
                <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP BP ID:</span> {customerDetails.sapBpId}</div>
                <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP CA ID:</span> {customerDetails.sapCaId || "N/A"}</div>
                <div className="font-semibold text-gray-900"><span className="text-azam-orange">Connection Type:</span> {customerDetails.agreementType || "N/A"}</div>
                {customerDetails.currency && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Currency:</span> {customerDetails.currency}</div>}
                {customerDetails.mobile && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Mobile:</span> {customerDetails.mobile}</div>}
                {customerDetails.email && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Email:</span> {customerDetails.email}</div>}
              </div>

              <div className="mt-4 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full"><Wallet className="h-4 w-4 text-orange-600" /></div>
                <div>
                  <span className="text-xs font-semibold text-azam-orange block">Hardware Balance</span>
                  {fetchBalanceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className={`font-bold ${currentHwBalance <= 0 ? "text-red-600" : "text-gray-900"}`}>
                      {currentHwBalance.toLocaleString()} {fetchBalanceMutation.data?.data?.currency || formCurrency || ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Hardware Items</h3>
              <Button type="button" onClick={() => append({ materialCode: "", quantity: 1, unitPrice: 0, totalPrice: 0, itemSerialNo: "", smartCardNumber: "", selectedSerials: [] })} size="xs" className="bg-azam-blue hover:bg-azam-blue/90" disabled={hwLoading}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
            </div>
            {fields.map((field, index) => {
              const selectedMaterialCode = watch(`items.${index}.materialCode`);
              const prodRow = findProductRow(selectedMaterialCode);
              const selectedQuantity = items[index]?.quantity;
              const selectedSerials = items[index]?.selectedSerials || [];
              const itemSerialNo = items[index]?.itemSerialNo || "";

              const isPrepaid = (customerDetails?.agreementType || "").toLowerCase() === "prepaid";

              const qty = Number(selectedQuantity) || 0;

              // New Logic for visibility:
              // 1. Must be a serial bundle product
              // 2. If Prepaid: Qty must be <= 1
              // 3. If Postpaid: Qty must be <= 5 (hide if > 5)
              const showConditionalFields = !!prodRow &&
                SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prodRow.productId) &&
                (isPrepaid ? qty <= 1 : qty <= 5);

              const usedElsewhere = new Set(items.map((it, i) => (i === index ? null : it.materialCode)).filter(Boolean));
              const isRestrictedBundle = prodRow && (prodRow.bundleName === "Z001" || prodRow.bundleName === "Z002");

              let availableStock = 0;
              let isLoadingStock = false;

              if (channel === "AGENT") {
  availableStock = agentStockMap[selectedMaterialCode] ?? 0;  // Changed from agentSerialsMap length
  isLoadingStock = loadingAgentSerials[selectedMaterialCode] || false;
} else {
  availableStock = stockMap[selectedMaterialCode] ?? 0;
  isLoadingStock = loadingStock[selectedMaterialCode] || false;
}

              // Update Max Quantity Logic
              // If Prepaid: Max 1.
              // If Postpaid: Max is available stock (bulk orders > 5 allowed, UI just hides serial input)
              const maxQuantity = isPrepaid ? 1 : availableStock;

              const itemErrors = errors.items?.[index];
              const isMaterialError = !!itemErrors?.materialCode;
              const isMaterialTouched = !!touchedFields.items?.[index]?.materialCode;
              const showMaterialError = isMaterialError && (isMaterialTouched || isSubmitted);

              // Get serials based on channel
              const serials = channel === "AGENT"
                ? (agentSerialsMap[selectedMaterialCode] || [])
                : (otcSerialsMap[selectedMaterialCode] || []);

              const isLoadingSerials = channel === "AGENT"
                ? loadingAgentSerials[selectedMaterialCode]
                : loadingOtcSerials[selectedMaterialCode];

              return (
                <Card key={field.id} className="border-l-4 border-l-azam-blue">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label>Material <span className="text-red-500">*</span></Label>
                        <Controller control={control} name={`items.${index}.materialCode`} render={({ field: f }) => (
  <Select value={f.value} onValueChange={(val) => {
    if (usedElsewhere.has(val)) { toast({ title: "Duplicate product not allowed", variant: "destructive" }); return; }

    const currentQty = items[index]?.quantity ? Number(items[index].quantity) : 1;
    const qty = currentQty > 0 ? currentQty : 1;
    const unit = getUnitPriceFor(val);
    update(index, { materialCode: val, quantity: qty, unitPrice: unit, totalPrice: unit * qty, itemSerialNo: "", smartCardNumber: "", selectedSerials: [] });

    clearErrors(`items.${index}.materialCode`);

    const sloc = channel === "OTC" ? storeLocationSelected || "MAIN" : "MAIN";
    fetchStock(plantSelected, val, sloc);

    const currentAgentId = isAgent ? loggedInAgentBpId : agentCollectedSapBpId;
    if (currentAgentId) {
      fetchAgentSerials(currentAgentId, val);
    }
    if (channel === "OTC" && plantSelected && storeLocationSelected) {
      fetchOtcSerials(plantSelected, storeLocationSelected, val);
    }
  }}>
    <SelectTrigger uiSize="sm" className={showMaterialError ? "border-red-500" : ""}>
      <SelectValue placeholder={hwLoading ? "Loading..." : "Select material"} />
    </SelectTrigger>
    <SelectContent>
      {hwLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
      {!hwLoading && materialOptions.length === 0 && (
        <SelectItem value="empty" disabled>
          {formCurrency 
            ? `No materials available for ${formCurrency}` 
            : "Select currency first"}
        </SelectItem>
      )}
      {!hwLoading && materialOptions.map((opt, i) => (
        <SelectItem 
          key={`${opt.value}-${i}`} 
          value={opt.value} 
          disabled={usedElsewhere.has(opt.value)}
        >
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)} />
                        {showMaterialError && <p className="text-xs text-red-600 mt-1">{itemErrors?.materialCode?.message as ReactNode}</p>}
                      </div>
                      <div>
                        <Label>Quantity <span className="text-red-500">*</span></Label>
                        <Input
                          uiSize="sm"
                          type="number"
                          min="1"
                          max={maxQuantity}
                          disabled={!selectedMaterialCode || availableStock === 0 || isLoadingStock}
                          {...register(`items.${index}.quantity`)}
                          onChange={(e) => {
                            let v = parseInt(e.target.value || "0");
                            const maxStock = maxQuantity;

                            if (maxStock !== undefined && maxStock !== null && v > maxStock) {
                              v = maxStock;
                              let restrictMsg = "";
                              if (isPrepaid) {
                                restrictMsg = "Prepaid customers can only order 1 quantity per item";
                              } else {
                                restrictMsg = `Maximum available quantity is ${maxStock}`;
                              }
                              toast({ title: "Quantity Limit", description: restrictMsg, variant: "destructive" });
                            }

                            const q = Math.max(1, isNaN(v) ? 1 : v);
                            const unit = getUnitPriceFor(selectedMaterialCode);
                            // When changing quantity, clear serials if mode switches
                            update(index, {
                              ...items[index],
                              quantity: q,
                              unitPrice: unit,
                              totalPrice: unit * q,
                              // Reset serial selections when quantity changes
                              itemSerialNo: q === 1 ? items[index]?.itemSerialNo || "" : "",
                              selectedSerials: q > 1 ? [] : items[index]?.selectedSerials || []
                            });

                            if (q > 1 && q <= 5) {
                              clearErrors(`items.${index}.itemSerialNo`);
                            }
                            if (v !== parseInt(e.target.value)) {
                              e.target.value = String(q);
                            }
                          }}
                        />
                      </div>
                      <div><Label>Unit Price</Label><Input uiSize="sm" readOnly {...register(`items.${index}.unitPrice`)} className="bg-gray-50" /></div>
                      <div><Label>Total Price</Label><Input uiSize="sm" readOnly {...register(`items.${index}.totalPrice`)} className="bg-gray-50" /></div>

                      {/* --- Serial Number Section --- */}
                      {selectedMaterialCode && showConditionalFields && (
                        <div className="md:col-span-1">
                          <Label>Serial Number</Label>
                          {isLoadingSerials ? (
                            <div className="text-sm text-blue-500 flex items-center gap-1 h-7"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                          ) : (
                            <>
                              {qty <= 1 ? (
                                // ✅ Single Select Serial Component
                                <SingleSelectSerial
                                  index={index}
                                  value={itemSerialNo}
                                  serials={serials}
                                  isOpen={!!openSerialCombobox[index]}
                                  onOpenChange={(open) => handleSerialComboboxOpenChange(index, open)}
                                  onSelect={(serial) => handleSingleSerialChange(index, serial)}
                                />
                              ) : (
                                // ✅ Multi Select Serial Component
                                <MultiSelectSerial
                                  index={index}
                                  selectedMaterialCode={selectedMaterialCode}
                                  targetQty={qty}
                                  selected={selectedSerials}
                                  serials={serials}
                                  isOpen={!!openSerialCombobox[index]}
                                  onOpenChange={(open) => handleSerialComboboxOpenChange(index, open)}
                                  onSelectionChange={(newSelected) => handleMultiSerialChange(index, newSelected)}
                                  toast={toast}
                                />
                              )}
                            </>
                          )}
                          {qty === 1 && errors.items?.[index]?.itemSerialNo && <p className="text-xs text-red-600 mt-1">{errors.items?.[index]?.itemSerialNo?.message as ReactNode}</p>}
                        </div>
                      )}

                      {channel !== "AGENT" && channel !== "OTC" && showConditionalFields && (
                        <>
                          <div className="md:col-span-1">
                            <Label>Serial Number</Label>
                            <Input uiSize="sm" {...register(`items.${index}.itemSerialNo`)} placeholder="Enter Serial Number." />
                          </div>
                        </>
                      )}

                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="xs" onClick={() => remove(index)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    {selectedMaterialCode && (
                      <div className="text-[10px] mt-1">
                        {isLoadingStock ? (
                          <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking stock...</span>
                        ) : (
                          <span className={availableStock === 0 ? "text-red-500 font-medium" : "text-red-600"}>
                            Available: <strong>{availableStock}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {errors.items && <p className="text-xs text-red-600 mt-1">{errors.items.message as ReactNode}</p>}
          </div>

          {items.length > 0 && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4"><div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{totals.total.toLocaleString()} {displayCurrency}</span></div></CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Description/Notes</Label>
            <Textarea placeholder="Optional remarks..." rows={3} {...register("remark")} disabled={isFormSectionDisabled} />
          </div>

          {hasZeroBalance && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
              <XCircle className="h-4 w-4" />
              <span>Customer Hardware Balance is 0.</span>
            </div>
          )}

          {hasUnavailableStock && (
            <div className="p-2 rounded-md bg-yellow-50 border border-yellow-200 flex items-center gap-2 text-yellow-700 text-sm">
              <span className="font-medium">One or more selected items have 0 available stock. Please change quantity or material.</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              size="xs"
              disabled={isFormSectionDisabled || isSubmitting || items.length === 0 || hasZeroBalance || hasUnavailableStock}
              className="bg-azam-blue hover:bg-azam-blue/90"
            >
              {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>) : ("Submit Request")}
            </Button>

            <Button type="button" variant="outline" size="xs" onClick={handleReset} disabled={isFormSectionDisabled}>Reset Form</Button>
          </div>

        </CardContent>
      </form>
    </Card>
  );
}
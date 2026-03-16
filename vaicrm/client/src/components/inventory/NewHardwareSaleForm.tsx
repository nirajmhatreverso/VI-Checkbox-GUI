import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Search, Filter, CheckCircle2, XCircle, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";
import { agentApi } from "@/lib/api-client";
import ParentAgentSearchModal from "@/components/agents/ParentAgentSearchModal";
import { agentHardwareSaleSchema, type AgentHardwareSaleForm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useHwProducts, usePlants } from "@/hooks/use-inventory-data";
import { useDebounce } from "@/hooks/use-debounce";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const SERIAL_NUMBER_REQUIRED_BUNDLES = ['59', '67', '72', '73', '68', '21', '60', '52'];

type Plant = {
  plant: string;
  plantName: string;
  companyCode?: string;
};

type HwProductApiRow = {
  productName: string;
  productId: string;
  bundleName: string;
  productPriceType: "Agent Individual Price" | "Agent Kit Price" | string;
  amount: string;
  currency: string;
  salesOrg: string;
  serialNumber: string;
};

type CurrencyApiRow = {
  currencyCode: string;
  countryName: string;
};

type AgentResult = {
  agentName: string;
  sapBpId: string;
  sapCaId?: string | null;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  region?: string;
  district?: string;
  ward?: string;
  mobile?: string;
  email?: string;
  currency?: string;
};

function extractBpIdFromText(text: string) {
  const s = (text || "").trim();
  const mParen = s.match(/\(([^)]+)\)\s*$/);
  if (mParen?.[1]) return mParen[1].trim();
  const dashParts = s.split("-").map((p) => p.trim());
  if (dashParts.length >= 2) {
    const cand = dashParts[dashParts.length - 1];
    if (/^[A-Za-z]*\d[\w-]*$/.test(cand)) return cand;
  }
  if (/^BP?\d+/i.test(s) || /^\d{4,}$/.test(s)) return s;
  return "";
}

export default function NewHardwareSaleForm() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;
  const countryName = user?.country || "";
  const queryClient = useQueryClient();
const [isConsignment, setIsConsignment] = useState(false);

  // --- UPDATED: Identify User Role ---
  const isMainPlantUser = user?.isMainPlant === "Y";
  const isAgent = user?.allAccess === "N" && !isMainPlantUser; // Agent only if not main plant
  const canSearchAgents = !isAgent || isMainPlantUser; // Can search if admin, main plant, or not a restricted agent
  const loggedInAgentBpId = user?.sapBpId || "";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<AgentHardwareSaleForm>({
    resolver: zodResolver(agentHardwareSaleSchema),
    mode: "onBlur",
    defaultValues: {
      agentInput: "",
      sapBpId: "",
      sapCaId: "",
      agentName: "",
      plantId: "",
      priceType: "INDIVIDUAL",
      division: "10",
      currency: "",
      items: [],
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({ control, name: "items" });

  const [remark, setRemark] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const [agentStatus, setAgentStatus] = useState<{ loading: boolean; valid: boolean | null; checked: string | null }>({
    loading: false,
    valid: null,
    checked: null,
  });

  const [selectedAgentDetails, setSelectedAgentDetails] = useState<any | null>(null);
  const [agentBalance, setAgentBalance] = useState<{ balance?: number; currency?: string; message?: string } | null>(null);
  const currentBalance = typeof agentBalance?.balance === 'number' ? agentBalance.balance : null;
  const hasZeroBalance = currentBalance !== null && currentBalance <= 0;
  const { data: plants = [], isLoading: plantsLoading, isError: plantsIsError } = usePlants();
  const { data: allProducts = [], isLoading: hwLoading, isError: hwIsError } = useHwProducts();

  // Stock Availability State
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
  const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});

  // Serial place options
  const [serialPlaceOptions, setSerialPlaceOptions] = useState<Record<string, string[]>>({});
  const [loadingSerials, setLoadingSerials] = useState<Record<string, boolean>>({});
  const [openSerialCombobox, setOpenSerialCombobox] = useState<Record<number, boolean>>({});

  const [serialDetailsMap, setSerialDetailsMap] = useState<Record<string, { manufacturer: string; manufacturerSrNo: string }>>({});

  // --- Currency Options Query ---
  const { data: currencyOptions, isLoading: currencyLoading } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["currency-by-country", countryName],
    enabled: !!countryName && !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest('/data/currency', 'POST', { countryName, status: "", currencyCode: "" });
      let currencyRows: CurrencyApiRow[] = res?.data?.data ?? [];
      return currencyRows.map((r) => ({ value: r.currencyCode, label: `${r.currencyCode} - ${r.countryName}` }));
    },
  });

  const fetchStock = async (plantId: string, materialId: string) => {
    if (!plantId || !materialId) return;

    setLoadingStock(prev => ({ ...prev, [materialId]: true }));
    try {
      const res = await apiRequest('/inventory/stock-details', 'POST', {
        plant: plantId,
        material: materialId,
        storageLocation: "MAIN"
      });

      let qty = 0;
      if (res?.status === "SUCCESS" && Array.isArray(res?.data?.stockOverview)) {
        const match = res.data.stockOverview.find((so: any) => so.place?.sloc === "MAIN");
        if (match) {
          qty = Number(match.maxStockLevel?.unit || 0);
        }
      }
      setStockMap(prev => ({ ...prev, [materialId]: qty }));
    } catch (err) {

      setStockMap(prev => ({ ...prev, [materialId]: 0 }));
    } finally {
      setLoadingStock(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const fetchSerialPlaces = async (plantId: string | undefined, materialId: string | undefined, itemId?: string) => {
    if (!plantId || !materialId) return;
    const key = materialId;
    setLoadingSerials(prev => ({ ...prev, [key]: true }));
    try {
      const payload = {
        itemId: itemId || materialId,
        material: materialId,
        plant: plantId,
        storageLocation: "MAIN"
      };
      const res = await apiRequest('/inventory/stock-serial-details', 'POST', payload);

      const overview = Array.isArray(res?.stockSerialNoOverview) ? res.stockSerialNoOverview : (res?.data?.stockSerialNoOverview || []);

      const newDetails: Record<string, any> = {};
      const places = (overview || []).map((s: any) => {
        const sn = s?.place?.id || s?.placeId;
        if (sn) {
          newDetails[sn] = {
            manufacturer: s.relatedParty?.manufacturer || s.manufacturer || "",
            manufacturerSrNo: s.relatedParty?.manufacturerSrNo || s.manufacturerSrNo || ""
          };
          return sn;
        }
        return null;
      }).filter(Boolean) as string[];

      setSerialDetailsMap(prev => ({ ...prev, ...newDetails }));
      setSerialPlaceOptions(prev => ({ ...prev, [key]: places }));
    } catch (err) {

      setSerialPlaceOptions(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingSerials(prev => ({ ...prev, [key]: false }));
    }
  };

  const priceType = watch("priceType");
  const formCurrency = watch("currency");
  const apiPriceType = priceType === "KIT" ? "Agent Kit Price" : "Agent Individual Price";

  // --- Filter Products based on Currency AND Price Type ---
  const filteredProducts = useMemo(() => {
  if (!allProducts || allProducts.length === 0) return [];

  let rows = [...allProducts];
  
  // Filter by Price Type first
  rows = rows.filter((p: HwProductApiRow) => p.productPriceType === apiPriceType);

  // Filter by Currency (must filter when currency is selected)
  if (formCurrency && formCurrency.trim() !== "") {
    rows = rows.filter((p: HwProductApiRow) => p.currency === formCurrency);
  }

  // Deduplicate by productId
  const seen = new Set<string>();
  return rows.filter((r: HwProductApiRow) => {
    if (seen.has(r.productId)) return false;
    seen.add(r.productId);
    return true;
  });
}, [allProducts, apiPriceType, formCurrency]);

  const materialOptions = useMemo(
  () =>
    filteredProducts.map((p: HwProductApiRow) => ({
      value: String(p.productId),
      label: p.productName || String(p.productId),
    })),
  [filteredProducts]
);

  const createSaleOrder = useMutation({
    mutationFn: (payload: any) => apiRequest('/agent-hardware-sales/create', 'POST', payload),
    onSuccess: (resp: any) => {
      const ok = resp?.status === "SUCCESS" || resp?.statusCode === 200;
      if (!ok) throw new Error(resp?.statusMessage || "Failed to create order");

      toast({ title: "Sales Order submitted", description: resp?.data?.message || resp?.statusMessage || "Request created successfully" });
      reset();
      setRemark("");
      setIsConsignment(false); 
      setAgentStatus({ loading: false, valid: null, checked: null });
      setSelectedAgentDetails(null);
      setAgentBalance(null);
      // For Agent (not main plant), re-initialize after reset
      if (isAgent && loggedInAgentBpId) {
        const initialAgent: AgentResult = {
          agentName: (user as any)?.name || user?.username || "Agent",
          sapBpId: loggedInAgentBpId,
        };
        handleAgentSelectionSuccess(initialAgent);
      }
      queryClient.invalidateQueries({ queryKey: ['hw-approval-details'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.statusMessage || "Failed to submit order", variant: "destructive" });
    }
  });

  const fetchAgentBalance = useCallback(async (bpId: string, currency: string) => {
    if (!bpId) return;
    setAgentBalance(null); // Reset before fetch
    try {
      const balRes = await apiRequest('/hardware-sales/balance', 'POST', {
        salesOrg: currentSalesOrg || "",
        sapBpId: bpId,
        currency: currency // Sending selected currency
      });

      if (balRes?.status === "SUCCESS" && balRes?.data) {
        setAgentBalance({
          balance: balRes.data.balance,
          currency: balRes.data.currency,
          message: balRes.data.message || balRes.statusMessage,
        });
      }
      else if (balRes?.statusCode === 404 || balRes?.status === "FAILURE") {
        setAgentBalance({
          balance: 0,
          currency: balRes.data?.currency || currency,
          message: balRes.data?.message || balRes.statusMessage,
        });
      }
      else {
        setAgentBalance({ message: balRes?.statusMessage || "Balance info unavailable." });
      }
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.message?.includes("404")) {
        setAgentBalance({
          balance: 0,
          currency: err?.currency || currency,
          message: err?.statusMessage,
        });
      } else {
        setAgentBalance({ message: err?.statusMessage || "Error fetching balance." });
      }
    }
  }, [currentSalesOrg]);

  // --- Auto-select Currency Defaults ---
  useEffect(() => {
    const current = getValues("currency");
    // Don't overwrite if user has selected
    if (current) return;

    if (currencyOptions && currencyOptions.length > 0) {
      let defaultVal = "";

      // 1. Zimbabwe Rule: Default to USD if available
      if (countryName && countryName.toLowerCase() === "zimbabwe") {
        const usdExists = currencyOptions.some((opt) => opt.value === "USD");
        if (usdExists) {
          defaultVal = "USD";
        }
      }

      // 2. Generic Rule: If only one option, default to it
      if (!defaultVal && currencyOptions.length === 1) {
        defaultVal = currencyOptions[0].value;
      }

      if (defaultVal) {
        setValue("currency", defaultVal);
        const bpId = getValues("sapBpId");
        if (bpId) fetchAgentBalance(bpId, defaultVal);
        replace([]);
        clearErrors("items");
      }
    }
  }, [currencyOptions, getValues, setValue, replace, clearErrors, fetchAgentBalance, countryName]);

  const handleAgentSelectionSuccess = async (agent: AgentResult) => {
    // 1. Set Form Values
    const agentName = agent.agentName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
    setValue("sapBpId", agent.sapBpId, { shouldValidate: true });
    setValue("sapCaId", agent.sapCaId || "");
    setValue("agentName", agentName);
    setValue("agentInput", `${agentName} - (${agent.sapBpId})`, { shouldValidate: true });
    clearErrors(["agentInput", "sapBpId"]);

    setAgentStatus({ loading: false, valid: true, checked: agent.sapBpId });

    // 2. Prepare basic agent data
    let richAgentData: AgentResult = { ...agent };
    let agentCurrency = "";

    // 3. Fetch Extended Details
    try {
      const payload = {
        type: "Agent",
        isSubCollection: "N",
        salesOrg: currentSalesOrg || "",
        sapBpId: agent.sapBpId
      };
      const detailsRes = await apiRequest('/agents/user-details', 'POST', payload);

      if (detailsRes?.status === "SUCCESS" && detailsRes?.data?.customerDetails?.[0]) {
        const details = detailsRes.data.customerDetails[0];
        if (Array.isArray(details.relatedParty)) {
          const rp = details.relatedParty.find((r: any) => String(r.sapBpId) === agent.sapBpId);
          if (rp && rp.currency) {
            agentCurrency = rp.currency;
          }
        }
        const contactList = details.contactMedium || [];
        const mobileObj = contactList.find((m: any) => m.type?.toLowerCase() === 'mobile');
        const emailObj = contactList.find((m: any) => m.type?.toLowerCase() === 'email');
        const addrObj = contactList.find((m: any) => m.city || m.region || m.ward || m.district || m.country) || mobileObj || {};

        richAgentData = {
          ...richAgentData,
          firstName: details.firstName || richAgentData.firstName,
          lastName: details.lastName || richAgentData.lastName,
          mobile: mobileObj?.value || "",
          email: emailObj?.value || "",
          country: addrObj.country || richAgentData.country || "",
          region: addrObj.region || richAgentData.region || "",
          city: addrObj.city || richAgentData.city || "",
          district: addrObj.district || richAgentData.district || "",
          ward: addrObj.ward || richAgentData.ward || "",
          currency: agentCurrency
        };
      }
    } catch (err) {

    }

    setSelectedAgentDetails(richAgentData);

    if (agentCurrency) {
      setValue("currency", agentCurrency);
      fetchAgentBalance(agent.sapBpId, agentCurrency);
    }
  };

  const verifyAgent = async (text: string) => {
    const bp = extractBpIdFromText(text);
    if (!bp) {
      setError("agentInput", { message: "Please select a valid agent" });
      return false;
    }
    setAgentStatus({ loading: true, valid: null, checked: bp });
    try {
      const res = await apiRequest('/agents/search-filter', 'POST', { sapBpId: bp });
      const list: any[] = (res as any)?.data?.agentDetails || [];
      const agent = list.find((a: any) => String(a.sapBpId) === bp);
      if (!agent) {
        setError("agentInput", { message: "Agent not found" });
        setAgentStatus({ loading: false, valid: false, checked: bp });
        return false;
      }
      await handleAgentSelectionSuccess(agent);
      return true;
    } catch (err) {
      setError("agentInput", { message: "Unable to verify agent" });
      setAgentStatus({ loading: false, valid: false, checked: bp });
      return false;
    }
  };

  // --- UPDATED: Only auto-initialize for regular agents (not main plant) ---
  useEffect(() => {
    if (isAgent && loggedInAgentBpId) {
      const initialAgent: AgentResult = {
        agentName: (user as any)?.name || user?.username || "Agent",
        sapBpId: loggedInAgentBpId,
      };
      handleAgentSelectionSuccess(initialAgent);
    }
  }, [isAgent, loggedInAgentBpId]);

  const agentInput = watch("agentInput");
  const debouncedAgentInput = useDebounce(agentInput, 300);

  // --- UPDATED: Enable search for main plant users ---
  const { data: agentSearchRes, isLoading: agentSearchLoading } = useQuery({
    queryKey: ["agent-search-sale", debouncedAgentInput],
    queryFn: () => {
      const trimmedInput = debouncedAgentInput.trim();
      const bpId = extractBpIdFromText(trimmedInput);
      const searchTerm = bpId || trimmedInput;
      return apiRequest('/agents/search', 'POST', { search: searchTerm, offSet: "0", limit: "10" });
    },
    enabled: !!user && debouncedAgentInput.trim().length > 1 && showAgentDropdown && canSearchAgents,
    staleTime: 30_000,
  });

  const agentResults: AgentResult[] = useMemo(() => {
    const rows = Array.isArray(agentSearchRes?.data) ? (agentSearchRes.data as any[]) : [];
    return rows.map((row: any) => ({
      agentName: row.agentName || row.name || `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      sapBpId: row.sapBpId ?? row.bpId ?? row.bp ?? "",
      sapCaId: row.sapCaId ?? row.caId ?? null,
    })).filter((r: AgentResult) => r.sapBpId);
  }, [agentSearchRes]);

  const findProductRow = (productId: string, pType?: string): HwProductApiRow | undefined => {
  if (!allProducts) return undefined;
  const targetType = pType ? (pType === "KIT" ? "Agent Kit Price" : "Agent Individual Price") : apiPriceType;
  
  // Filter candidates by productId
  const candidates = allProducts.filter((p: HwProductApiRow) => p.productId === productId);
  
  // First try to find exact match with price type AND currency
  let match = candidates.find((p: HwProductApiRow) => 
    p.productPriceType === targetType && (!formCurrency || p.currency === formCurrency)
  );
  
  // If no match with currency, try just price type
  if (!match) {
    match = candidates.find((p: HwProductApiRow) => p.productPriceType === targetType);
  }
  
  // Fallback to first candidate
  if (!match) {
    match = candidates[0];
  }
  
  return match;
};

  const getUnitPriceFor = (productId: string, pType?: string): number => {
  const row = findProductRow(productId, pType);
  if (!row) return 0;
  // Only return price if currency matches (when currency is selected)
  if (formCurrency && row.currency !== formCurrency) return 0;
  const n = parseFloat(row.amount || "0");
  return isNaN(n) ? 0 : n;
};

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const startAutoSelection = async () => {
      const currentPlant = getValues("plantId");
      if (!currentPlant && plants && plants.length === 1) {
        setValue("plantId", String(plants[0].plant), { shouldValidate: true });
        clearErrors("plantId");
      }
    };
    startAutoSelection();
  }, [plants, getValues, setValue, clearErrors]);

  useEffect(() => {
    if (materialOptions.length === 1) {
      const val = materialOptions[0].value;
      const currentItems = getValues("items") || [];

      currentItems.forEach((item, index) => {
        if (!item.materialCode) {
          setValue(`items.${index}.materialCode`, val);

          const qty = Math.max(1, Number(item.quantity) || 1);
          const unitPrice = getUnitPriceFor(val);
          setValue(`items.${index}.unitPrice`, unitPrice);
          setValue(`items.${index}.totalPrice`, unitPrice * qty);

          const pId = getValues("plantId");
          if (pId) {
            fetchStock(pId, val);
            const prodRow = findProductRow(val);
            const requiresSerial = prodRow && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prodRow.productId);
            if (requiresSerial) {
              fetchSerialPlaces(pId, val, prodRow?.productId || val);
            }
          }
        }
      });
    }
  }, [materialOptions, fields.length, getValues, setValue]);

  const calculateTotals = () => {
    const items = getValues("items") || [];
    const subtotal = items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
    return { subtotal, total: Math.max(0, subtotal) };
  };

  const onSubmit = async (form: AgentHardwareSaleForm) => {
    if (!form.sapBpId) {
      const ok = await verifyAgent(form.agentInput);
      if (!ok) return;
    }
    if (hasZeroBalance) {
      toast({ title: "Insufficient Balance", description: "Agent hardware balance is 0. Cannot process sale.", variant: "destructive" });
      return;
    }

    for (const item of form.items || []) {
      const prod = findProductRow(item.materialCode);
      const qty = Number(item.quantity) || 1;
      const requiresSerial = prod && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prod.productId);

      if (requiresSerial && qty <= 5) {
        const serials = item.selectedSerials || [];
        if (serials.length !== qty) {
          toast({
            title: "Serial Number Mismatch",
            description: `You must select exactly ${qty} serial number${qty > 1 ? 's' : ''} for ${prod?.productName || 'this item'}. Currently selected: ${serials.length}.`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    for (const item of form.items || []) {
      const stock = stockMap[item.materialCode];
      if (stock !== undefined && stock !== null && item.quantity > stock) {
        toast({ title: "Stock Error", description: `Quantity for material ${item.materialCode} exceeds available stock (${stock})`, variant: "destructive" });
        return;
      }
    }

    const { total } = calculateTotals();
    const selectedPlantObject = plants.find((p: { plant: string; }) => p.plant === form.plantId);
    const plantValue = selectedPlantObject ? `${selectedPlantObject.plantName}_${selectedPlantObject.plant}` : form.plantId;

    const productSalesOrder = (form.items || []).map((it) => {
      const prod = findProductRow(it.materialCode);
      const qty = Number(it.quantity) || 1;
      const serials = it.selectedSerials || [];
      const unit = Number(it.unitPrice) || getUnitPriceFor(it.materialCode) || 0;
      const lineTotal = unit * qty;

      let finalSerialNo = "";
      if (serials.length > 0 && qty <= 5) {
        finalSerialNo = serials.join(",");
      } else {
        finalSerialNo = it.itemSerialNo || "";
      }

      const serialListFn = (serials.length > 0 && qty <= 5) ? serials : (it.itemSerialNo ? [it.itemSerialNo] : []);

      const manufacturerList = serialListFn.map(sn => serialDetailsMap[sn]?.manufacturer).filter(Boolean).join(",");
      const manufacturerSrNoList = serialListFn.map(sn => serialDetailsMap[sn]?.manufacturerSrNo).filter(Boolean).join(",");

      return {
        salesOrg: prod?.salesOrg || "", division: form.division || "10", material: it.materialCode,
        itemType: prod?.productName || prod?.bundleName || "HARDWARE", itemQty: String(qty),
        itemSerialNo: finalSerialNo, currency: prod?.currency || "", priceType: apiPriceType,
        itemAmount: lineTotal.toFixed(2), bundleName: prod?.bundleName || "",
        productId: prod?.productId || "",
        manufacturer: manufacturerList,
        manufacturerSrNo: manufacturerSrNoList,
      };
    });

    const payload = {
      type: "AGENT",
      plant: plantValue,
      sapBpId: form.sapBpId,
      requestType: "HARDWARE_SALE",
      totalAmount: total.toFixed(2),
      remark: remark || "",
      currency: form.currency,
      productSalesOrder,
      transferFrom: form.plantId,
      transferTo: form.sapBpId,
      orderFlag: isConsignment ? "Y" : "N",
    };
    createSaleOrder.mutate(payload);
  };

  const agentErrorMessage = errors.agentInput?.message || errors.sapBpId?.message;
  const controlClasses = "h-7 text-xs";
  const selectedItems = watch("items") || [];
  const agentInputProps = register("agentInput");

  const hasUnavailableStock = useMemo(() => {
    return (selectedItems || []).some((it: any) => it?.materialCode && (stockMap[it.materialCode] ?? 0) === 0);
  }, [selectedItems, stockMap]);

  const displayCurrency = agentBalance?.currency ||
    (selectedItems.length > 0 ? findProductRow(selectedItems[0].materialCode)?.currency : "") ||
    "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-azam-blue" />
          Create Hardware Sale Request
        </CardTitle>
        {/* UPDATED: Dynamic description based on user role */}
        <CardDescription>
          {isMainPlantUser
            ? "Main plant users can create hardware sale requests for any agent"
            : "Agents can request hardware items for purchase with automatic pricing"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative" ref={agentDropdownRef}>
            <div className="flex items-center justify-between">
              <Label>Search Agent <span className="text-red-500">*</span></Label>
              {/* UPDATED: Show filter for main plant users too */}
              {canSearchAgents && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowAgentModal(true)}
                  title="Filter & select Agent"
                >
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="ml-1 text-xs text-blue-700 bg-blue-600 px-1 rounded text-white">Filter</span>
                </Button>
              )}
            </div>
            {/* UPDATED: Agent Input with main plant support */}
            <Input
              {...agentInputProps}
              uiSize="sm"
              readOnly={!canSearchAgents}
              onClick={() => canSearchAgents && setShowAgentModal(true)}
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={
                agentStatus.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : agentStatus.valid === true ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : agentStatus.valid === false ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : undefined
              }
              placeholder="Type name, BP ID..."
              onChange={(e) => {
                if (!canSearchAgents) return;
                agentInputProps.onChange(e);
                setShowAgentDropdown(e.target.value.length > 1);
                setValue("sapBpId", "");
                setValue("sapCaId", "");
                setValue("agentName", "");
                setAgentStatus((s) => ({ ...s, valid: null }));
                clearErrors(["agentInput", "sapBpId"]);
              }}
              onBlur={async (e) => {
                if (!canSearchAgents) return;
                agentInputProps.onBlur(e);
                setTimeout(() => setShowAgentDropdown(false), 150);
                if (e.target.value.trim() && !getValues("sapBpId")) {
                  await verifyAgent(e.target.value);
                }
              }}
              onFocus={(e) => {
                if (canSearchAgents && e.target.value.length > 1) setShowAgentDropdown(true);
              }}
              className={`${controlClasses} focus:ring-0 ${!canSearchAgents
                  ? 'bg-gray-100 cursor-not-allowed text-gray-600'
                  : 'cursor-pointer bg-gray-50'
                }`}
              aria-invalid={!!(errors.agentInput || errors.sapBpId) || undefined}
            />
            {agentErrorMessage && <p className="text-xs text-red-600 mt-1">{agentErrorMessage}</p>}
            {/* UPDATED: Show dropdown for main plant users */}
            {showAgentDropdown && agentInput && canSearchAgents && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {agentSearchLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                ) : agentResults.length > 0 ? (
                  agentResults.map((agent) => (
                    <div
                      key={agent.sapBpId}
                      className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b"
                      onClick={async () => {
                        setShowAgentDropdown(false);
                        await handleAgentSelectionSuccess(agent);
                      }}
                    >
                      <div className="font-medium">{agent.agentName}</div>
                      <div className="text-xs text-gray-600">
                        BP: {agent.sapBpId}{agent.sapCaId ? ` • CA: ${agent.sapCaId}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No agents found</div>
                )}
              </div>
            )}
          </div>

          {/* Plant Field */}
          <div>
            <Label>Select Plant/Warehouse <span className="text-red-500">*</span></Label>
            <Controller control={control} name="plantId" render={({ field }) => (
              <Select value={field.value} onValueChange={(val) => {
                field.onChange(val);
                clearErrors("plantId");
                const currentItems = getValues("items");
                currentItems.forEach(item => {
                  if (item.materialCode) {
                    fetchStock(val, item.materialCode);
                    const prodRow = findProductRow(item.materialCode);
                    const requiresSerial = prodRow && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prodRow.productId);
                    if (requiresSerial) {
                      fetchSerialPlaces(val, item.materialCode, prodRow?.productId || item.materialCode);
                    }
                  }
                });
              }}>
                <SelectTrigger className={controlClasses} aria-invalid={!!errors.plantId || undefined}>
                  <SelectValue placeholder={plantsLoading ? "Loading..." : "Select plant"} />
                </SelectTrigger>
                <SelectContent>
                  {plantsLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                  {plantsIsError && <SelectItem value="error" disabled>Error loading plants</SelectItem>}
                  {!plantsLoading && !plantsIsError && (plants || []).map((plant: Plant) => (
                    <SelectItem key={plant.plant} value={String(plant.plant)}>
                      {plant.plantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.plantId && <p className="text-xs text-red-600 mt-1">{errors.plantId.message}</p>}
          </div>

          {/* Price Type Field */}
          <div>
            <Label>Price Type</Label>
            <Controller control={control} name="priceType" render={({ field }) => (
              <Select value={field.value} onValueChange={(val) => {
                field.onChange(val);
                replace([]);
                clearErrors("items");
              }}>
                <SelectTrigger className={controlClasses}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KIT">Kit Price</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual Price</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>

          {/* Currency Field */}
          <div>
            <Label>Currency <span className="text-red-500">*</span></Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select onValueChange={(val) => {
                  field.onChange(val);
                  const bpId = getValues("sapBpId");
                  if (bpId) fetchAgentBalance(bpId, val);
                  replace([]);
                  clearErrors("items");
                }} value={field.value ?? ""}>
                  <SelectTrigger className={controlClasses} aria-invalid={!!errors.currency || undefined}>
                    <SelectValue placeholder={currencyLoading ? "Loading..." : "Select currency"} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      (currencyOptions || []).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currency && <p className="text-xs text-red-600 mt-1">{errors.currency.message}</p>}
          </div>
          <div className="flex flex-col justify-end">
  <Label className="mb-1 invisible">Consignment</Label>
  <div className="flex items-center space-x-2 h-7">
    <Checkbox
      id="consignment"
      checked={isConsignment}
      onCheckedChange={(checked) => setIsConsignment(checked === true)}
    />
    <Label htmlFor="consignment" className="cursor-pointer font-medium text-sm">
      Consignment
    </Label>
  </div>
</div>
        </div>

        {/* Agent Details Card */}
        {selectedAgentDetails && agentStatus.valid && (
          <div className="mt-8 p-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base font-bold text-azam-orange tracking-wide">Agent Details</span>
            </div>
            <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
              <div><span className="text-azam-orange font-semibold">Name:</span> {selectedAgentDetails.agentName || '...'}</div>
              <div><span className="text-azam-orange font-semibold">SAP BP ID:</span> {selectedAgentDetails.sapBpId}</div>
              {selectedAgentDetails.sapCaId && <div><span className="text-azam-orange font-semibold">CA ID:</span> {selectedAgentDetails.sapCaId}</div>}
              {selectedAgentDetails.mobile && <div><span className="text-azam-orange font-semibold">Mobile:</span> {selectedAgentDetails.mobile}</div>}
              {selectedAgentDetails.email && <div><span className="text-azam-orange font-semibold">Email:</span> {selectedAgentDetails.email}</div>}
              {selectedAgentDetails.country && <div><span className="text-azam-orange font-semibold">Country:</span> {selectedAgentDetails.country}</div>}
              {selectedAgentDetails.region && <div><span className="text-azam-orange font-semibold">Region:</span> {selectedAgentDetails.region}</div>}
              {(selectedAgentDetails.city || selectedAgentDetails.cityName) && <div><span className="text-azam-orange font-semibold">City:</span> {selectedAgentDetails.city || selectedAgentDetails.cityName}</div>}
              {selectedAgentDetails.district && <div><span className="text-azam-orange font-semibold">District:</span> {selectedAgentDetails.district}</div>}
              {selectedAgentDetails.ward && <div><span className="text-azam-orange font-semibold">Ward:</span> {selectedAgentDetails.ward}</div>}
            </div>
            <div className="mb-2 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-4">
              <span className="font-semibold text-azam-orange">Hardware Balance:</span>
              {typeof agentBalance?.balance === 'number'
                ? <span className="font-bold text-gray-900">{agentBalance.balance.toLocaleString()} {agentBalance.currency}</span>
                : <span className="font-bold text-red-600">{agentBalance?.message || "Balance info unavailable"}</span>}
            </div>
          </div>
        )}

        {/* Hardware Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Hardware Items</h3>
            <Button
              onClick={() => append({ materialCode: "", quantity: 1, unitPrice: 0, totalPrice: 0, itemSerialNo: "", smartCardNumber: "", selectedSerials: [] })}
              size="xs"
              className="bg-azam-blue hover:bg-azam-blue/90"
              disabled={hwLoading || hwIsError}
              title={hwIsError ? "Failed to load products" : undefined}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          {fields.map((field, index) => {
            const selectedMaterialCode = watch(`items.${index}.materialCode`);
            const selectedQuantity = watch(`items.${index}.quantity`);
            const selectedProduct = findProductRow(selectedMaterialCode);
            const showConditionalFields = !!selectedProduct && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(selectedProduct.productId) && (Number(selectedQuantity) || 0) <= 5;

            // Check validation state
            const itemErrors = errors.items?.[index];
            const isMaterialError = !!itemErrors?.materialCode;
            const isMaterialTouched = !!touchedFields.items?.[index]?.materialCode;
            const showMaterialError = isMaterialError && (isMaterialTouched || isSubmitted);

            return (
              <Card key={field.id} className="border-l-4 border-l-azam-blue">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label>Material <span className="text-red-500">*</span></Label>
                      <Controller control={control} name={`items.${index}.materialCode`} render={({ field: f }) => (
                        <Select
                          value={f.value}
                          onValueChange={(val) => {
                            f.onChange(val);
                            const item = getValues(`items.${index}`);
                            const qty = Math.max(1, Number(item?.quantity) || 1);
                            const unitPrice = getUnitPriceFor(val);

                            setValue(`items.${index}.materialCode`, val);
                            setValue(`items.${index}.quantity`, qty);
                            setValue(`items.${index}.unitPrice`, unitPrice);
                            setValue(`items.${index}.totalPrice`, unitPrice * qty);

                            setValue(`items.${index}.itemSerialNo`, "");
                            setValue(`items.${index}.smartCardNumber`, "");
                            setValue(`items.${index}.selectedSerials`, []);

                            clearErrors(`items.${index}.materialCode`);
                            fetchStock(getValues("plantId"), val);

                            const selectedPlant = getValues("plantId");
                            const prodRow = findProductRow(val);
                            const requiresSerial = prodRow && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(prodRow.productId);
                            if (requiresSerial && selectedPlant) {
                              fetchSerialPlaces(selectedPlant, val, prodRow?.productId || val);
                            } else {
                              setSerialPlaceOptions(prev => ({ ...prev, [val]: [] }));
                            }
                          }}
                        >
                          <SelectTrigger
                            className={controlClasses}
                            aria-invalid={showMaterialError || undefined}
                          >
                            <SelectValue placeholder={hwLoading ? "Loading..." : "Select material"} />
                          </SelectTrigger>
                          <SelectContent>
  {hwLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
  {hwIsError && <SelectItem value="error" disabled>Error loading materials</SelectItem>}
  {!hwLoading && !hwIsError && materialOptions.length === 0 && (
    <SelectItem value="empty" disabled>
      {formCurrency 
        ? `No materials available for ${formCurrency}` 
        : "Select currency first"}
    </SelectItem>
  )}
  {!hwLoading && !hwIsError && materialOptions.map((opt: { value: string; label: string }, idx: number) => (
    <SelectItem key={`${opt.value}-${idx}`} value={opt.value}>
      {opt.label}
    </SelectItem>
  ))}
</SelectContent>
                        </Select>
                      )} />
                      {showMaterialError && (
                        <p className="text-xs text-red-600 mt-1">
                          {String(itemErrors?.materialCode?.message)}
                        </p>
                      )}
                    </div>

                    {/* Quantity Field */}
                    <div>
                      <Label>Quantity <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        max={stockMap[selectedMaterialCode] ?? 0}
                        disabled={!selectedMaterialCode || (stockMap[selectedMaterialCode] ?? 0) === 0 || loadingStock[selectedMaterialCode]}
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                          onChange: (e) => {
                            let v = parseInt(e.target.value || "0");
                            const maxStock = stockMap[selectedMaterialCode] ?? 0;

                            if (maxStock !== undefined && maxStock !== null && v > maxStock) {
                              v = maxStock;
                              toast({ title: "Stock Limit Reached", description: `Maximum available quantity is ${maxStock}`, variant: "destructive" });
                              setValue(`items.${index}.quantity`, v);
                            }

                            const qty = Math.max(1, isNaN(v) ? 1 : v);
                            const unitPrice = getUnitPriceFor(selectedMaterialCode);

                            setValue(`items.${index}.totalPrice`, unitPrice * qty);
                            clearErrors(`items.${index}.quantity`);
                          },
                        })}
                        className={controlClasses}
                        aria-invalid={!!errors.items?.[index]?.quantity || undefined}
                      />
                      {errors.items?.[index]?.quantity && <p className="text-xs text-red-600 mt-1">{String(errors.items[index]!.quantity!.message)}</p>}
                    </div>

                    {/* Unit Price Field */}
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const val = parseFloat(e.target.value || "0");
                            const qt = getValues(`items.${index}.quantity`) || 1;
                            setValue(`items.${index}.totalPrice`, val * qt);
                          }
                        })}
                        className={controlClasses}
                      />
                    </div>

                    {/* Total Price Field */}
                    <div>
                      <Label>Total Price</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.totalPrice`, { valueAsNumber: true })}
                        readOnly
                        className="bg-gray-50 h-7 text-xs"
                      />
                    </div>

                    {/* Serial Number Field (Conditional) */}
                    {showConditionalFields && (
                      <>
                        <div>
                          <Label>Serial Number <span className="text-red-500">*</span></Label>
                          {loadingSerials[selectedMaterialCode] ? (
                            <div className="text-xs text-gray-500">Loading serial locations...</div>
                          ) : (
                            <Controller control={control} name={`items.${index}.selectedSerials`} render={({ field: sf }) => {
                              const selected = sf.value || [];
                              const targetQty = Number(selectedQuantity) || 1;
                              return (
                                <Popover
                                  open={!!openSerialCombobox[index]}
                                  onOpenChange={(open) => setOpenSerialCombobox(prev => ({ ...prev, [index]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={!!openSerialCombobox[index]}
                                      className={cn("w-full justify-between pl-3 pr-3 font-normal text-left", controlClasses, (selected.length !== targetQty) ? "border-red-500" : "")}
                                      size="xs"
                                    >
                                      {selected.length > 0
                                        ? `${selected.length} / ${targetQty} selected`
                                        : (serialPlaceOptions[selectedMaterialCode]?.length ? "Select serials" : "No serials available")}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[250px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search serial..." />
                                      <CommandList>
                                        <CommandEmpty>No serial found.</CommandEmpty>
                                        <CommandGroup>
                                          {(serialPlaceOptions[selectedMaterialCode] || []).map((placeId) => {
                                            const isSelected = selected.includes(placeId);
                                            return (
                                              <CommandItem
                                                key={placeId}
                                                value={placeId}
                                                onSelect={() => {
                                                  let newSelected = [...selected];
                                                  if (isSelected) {
                                                    newSelected = newSelected.filter((s: string) => s !== placeId);
                                                  } else {
                                                    if (newSelected.length >= targetQty) {
                                                      toast({ title: "Limit Reached", description: `You can only select ${targetQty} serial numbers.` });
                                                      return;
                                                    }
                                                    newSelected.push(placeId);
                                                  }
                                                  sf.onChange(newSelected);
                                                }}
                                              >
                                                <div className={cn(
                                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                  isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                  <Check className={cn("h-4 w-4")} />
                                                </div>
                                                {placeId}
                                              </CommandItem>
                                            )
                                          })}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              );
                            }} />
                          )}
                          {errors.items?.[index]?.itemSerialNo && <p className="text-xs text-red-600 mt-1">{String(errors.items[index]!.itemSerialNo!.message)}</p>}
                        </div>
                      </>
                    )}

                    {/* Delete Button */}
                    <div className="flex items-end">
                      <Button variant="outline" size="xs" onClick={() => remove(index)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stock Availability Display */}
                  {selectedMaterialCode && (
                    <div className="text-[10px] mt-1">
                      {loadingStock[selectedMaterialCode] ? (
                        <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking stock...</span>
                      ) : (
                        <span className={(stockMap[selectedMaterialCode] ?? 0) === 0 ? "text-red-500 font-medium" : "text-red-600"}>
                          Available: <strong>{stockMap[selectedMaterialCode] ?? 0}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {errors.items && typeof (errors.items as any)?.message === "string" && (
            <p className="text-xs text-red-600">{String((errors.items as any).message)}</p>
          )}

          {/* Totals Card */}
          {fields.length > 0 && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>{displayCurrency} {calculateTotals().total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes Field */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Optional remarks..." rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>

        {/* Zero Balance Warning */}
        {hasZeroBalance && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Cannot submit request: Agent Hardware Balance is 0.</span>
          </div>
        )}

        {/* Unavailable Stock Warning */}
        {hasUnavailableStock && (
          <div className="p-2 rounded-md bg-yellow-50 border border-yellow-200 flex items-center gap-2 text-yellow-700 text-sm">
            <span className="font-medium">One or more selected items have 0 available stock. Please change quantity or material.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            size="xs"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || createSaleOrder.isPending || fields.length === 0 || hasZeroBalance || hasUnavailableStock}
            className="bg-azam-blue hover:bg-azam-blue/90"
          >
            {(isSubmitting || createSaleOrder.isPending) ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
            ) : (
              "Submit Request"
            )}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              reset();
              setRemark("");
              setIsConsignment(false); 
              setAgentStatus({ loading: false, valid: null, checked: null });
              clearErrors();
              setSelectedAgentDetails(null);
              setAgentBalance(null);
              // UPDATED: Only re-initialize for regular agents (not main plant)
              if (isAgent && loggedInAgentBpId) {
                const initialAgent: AgentResult = {
                  agentName: (user as any)?.name || user?.username || "Agent",
                  sapBpId: loggedInAgentBpId,
                };
                handleAgentSelectionSuccess(initialAgent);
              }
            }}
            disabled={isSubmitting || createSaleOrder.isPending}
          >
            Reset Form
          </Button>
        </div>
      </CardContent>

      {/* Agent Search Modal */}
      <ParentAgentSearchModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelect={async (agent: AgentResult) => {
          setShowAgentModal(false);
          await handleAgentSelectionSuccess(agent);
        }}
      />
    </Card>
  );
}
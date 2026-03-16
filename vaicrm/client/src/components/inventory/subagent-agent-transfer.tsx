import { useCallback, useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeftRight,
    Plus,
    FileText,
    Loader2,
    XCircle,
    Truck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";
import SubagentAgentTransferHistory from "./SubagentAgentTransferHistory";
import SubagentAgentTransferDelivery from "./SubagentAgentTransferDelivery";
import ParentAgentSearchModal from "../agents/ParentAgentSearchModal";
import SubagentSearchModal from "../agents/SubagentSearchModal";
import { Filter, Trash2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import {
    useHwProducts,
    useTransferCountries,
    useStoreLocations,
    useStockDetailsMutation,
    useStockSerialDetailsMutation
} from "@/hooks/use-inventory-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { agentApi } from "@/lib/agentApi";

const SERIAL_NUMBER_REQUIRED_BUNDLES = ['59', '67', '72', '73', '68', '21', '60', '52'];
// const SERIAL_NUMBER_REQUIRED_BUNDLES = ['34', '116', '117'];

type RequestItem = {
    id: string;
    materialCode: string;
    materialName: string;
    itemType: string;
    quantity: number;
    availableStock?: number;
    isLoadingStock?: boolean;
    itemSerialNo?: string;
    selectedSerials?: string[];
    unitPrice?: number;
    totalPrice?: number;
};

type AgentApiItem = {
    agentName: string;
    sapBpId: string;
    sapCaId?: string;
    currency?: string;
    country?: string;
    region?: string;
    city?: string;
    status?: string;
};

export default function SubagentAgentTransfer() {
    const { user, isAdmin } = useAuthContext();
    const { toast } = useToast();
    const [tab, setTab] = useState("new-transfer");

    // ✅ Permission flags - Same pattern as PaymentForm.tsx
    const isAdminUser = (user?.allAccess || "N") === "Y";
    const isMainPlantUser = (user?.isMainPlant || "N") === "Y";
    const isOtcUser = (user?.isOtc || "N") === "Y";

    // ✅ canSearchAgents = Admin or MainPlant users can search/select agents
    const canSearchAgents = isAdminUser || isMainPlantUser;

    // ✅ loggedInUserBpId - For non-admin/non-mainplant users, use their own BP ID
    const loggedInUserBpId = (!canSearchAgents) ? (user?.onbId || "") : "";

    // ✅ Current user's sales org
    const currentSalesOrg = user?.salesOrg;

    const [formData, setFormData] = useState({
        country: "",
        fromPlant: "",
        toPlant: "",
        remark: "",
        description: "",
        priceType: "INDIVIDUAL"
    });

    const [showFromSearch, setShowFromSearch] = useState(false);
    const [showToSearch, setShowToSearch] = useState(false);
    const [selectedFromAgent, setSelectedFromAgent] = useState<any>(null);
    const [selectedToAgent, setSelectedToAgent] = useState<any>(null);

    const [items, setItems] = useState<RequestItem[]>([
        { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }
    ]);

    // Hardware related states
    const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
    const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});
    const [serialPlaceOptions, setSerialPlaceOptions] = useState<Record<string, string[]>>({});
    const [loadingSerials, setLoadingSerials] = useState<Record<string, boolean>>({});
    const [openSerialCombobox, setOpenSerialCombobox] = useState<Record<string, boolean>>({});
    const [serialDetailsMap, setSerialDetailsMap] = useState<Record<string, { manufacturer: string; manufacturerSrNo: string }>>({});

    // API Hooks
    const { data: countries = [], isLoading: countryLoading } = useTransferCountries();
    const { data: materials = [], isLoading: hwLoading } = useHwProducts();
    const fromStoreQuery = useStoreLocations(selectedFromAgent?.sapBpId);
    const toStoreQuery = useStoreLocations(selectedToAgent?.sapBpId);

    const fromStores = fromStoreQuery.data || [];
    const fromStoreLoading = fromStoreQuery.isLoading;
    const toStores = toStoreQuery.data || [];
    const toStoreLoading = toStoreQuery.isLoading;

    const stockDetailsMutation = useStockDetailsMutation();
    const stockSerialDetailsMutation = useStockSerialDetailsMutation();

    // ✅ Auto-fill "From Sub-agent" for non-admin/non-mainplant users
    useEffect(() => {
        if (!canSearchAgents && loggedInUserBpId) {
            const agentData = {
                agentName: user?.name || user?.username || "Sub-agent",
                sapBpId: loggedInUserBpId
            };
            setSelectedFromAgent(agentData);
            setFormData(prev => ({ ...prev, fromPlant: loggedInUserBpId }));
        }
    }, [canSearchAgents, loggedInUserBpId, user?.name, user?.username]);

    const fetchStock = async (agentBpId: string, materialId: string) => {
        if (!agentBpId || !materialId) return;
        setLoadingStock(prev => ({ ...prev, [materialId]: true }));
        try {
            const res = await apiRequest('/inventory/agent-stock-serials', 'POST', {
                sapBpId: agentBpId,
                material: materialId,
                status: "NEW"
            });
            const list = Array.isArray(res?.data?.stockDetails) ? res.data.stockDetails : [];
            setStockMap(prev => ({ ...prev, [materialId]: list.length }));
        } catch (err) {
            setStockMap(prev => ({ ...prev, [materialId]: 0 }));
        } finally {
            setLoadingStock(prev => ({ ...prev, [materialId]: false }));
        }
    };

    const fetchSerialPlaces = async (agentBpId: string, materialId: string) => {
        if (!agentBpId || !materialId) return;
        setLoadingSerials(prev => ({ ...prev, [materialId]: true }));
        try {
            const res = await apiRequest('/inventory/agent-stock-serials', 'POST', {
                sapBpId: agentBpId,
                material: materialId,
                status: "NEW"
            });
            const list = Array.isArray(res?.data?.stockDetails) ? res.data.stockDetails : [];
            const newDetails: Record<string, any> = {};
            const places = list.map((s: any) => {
                const sn = s.serialNo;
                if (sn) {
                    newDetails[sn] = {
                        manufacturer: s.manufacturer || "",
                        manufacturerSrNo: s.manufacturerSrNo || ""
                    };
                    return sn;
                }
                return null;
            }).filter(Boolean) as string[];

            setSerialDetailsMap(prev => ({ ...prev, ...newDetails }));
            setSerialPlaceOptions(prev => ({ ...prev, [materialId]: places }));
            setStockMap(prev => ({ ...prev, [materialId]: places.length }));
        } catch (err) {
            setSerialPlaceOptions(prev => ({ ...prev, [materialId]: [] }));
        } finally {
            setLoadingSerials(prev => ({ ...prev, [materialId]: false }));
        }
    };

    useEffect(() => {
        if (countries.length === 1 && !formData.country) {
            setFormData(prev => ({ ...prev, country: countries[0].country }));
        }
    }, [countries, formData.country]);

    useEffect(() => {
        setItems([
            { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }
        ]);
    }, [formData.fromPlant]);

    useEffect(() => {
        setItems([
            { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }
        ]);
    }, [formData.toPlant]);

    const uniqueMaterials = useMemo(() => {
        const seen = new Set();
        return materials.filter((m: any) => {
            const id = m.productId;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [materials]);

    const addItem = useCallback(() => {
        setItems((prev) => [
            ...prev,
            { id: `${Date.now()}-${Math.random()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }
        ]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
    }, []);

    const updateItem = useCallback((id: string, patch: Partial<RequestItem>) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    }, []);

    const apiPriceType = formData.priceType === "KIT" ? "Agent Kit Price" : "Agent Individual Price";

    const handleMaterialSelect = useCallback((id: string, materialCode: string) => {
        const selectedMaterial = materials.find((m: any) => m.productId === materialCode && m.productPriceType === apiPriceType);
        const isCable = selectedMaterial?.productName?.toLowerCase().includes("cable");
        const defaultUnit = isCable ? "METER" : "NUMBER";

        if (!formData.fromPlant) {
            toast({ title: "Selection Missing", description: "Please select 'From Sub-agent' before adding items.", variant: "destructive" });
            updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit });
            return;
        }

        const unitPrice = parseFloat(selectedMaterial?.amount || "0");
        updateItem(id, {
            materialCode,
            materialName: selectedMaterial?.productName || "",
            itemType: defaultUnit,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            selectedSerials: []
        });

        fetchStock(formData.fromPlant, materialCode);
        const requiresSerial = SERIAL_NUMBER_REQUIRED_BUNDLES.includes(materialCode);
        if (requiresSerial) {
            fetchSerialPlaces(formData.fromPlant, materialCode);
        }
    }, [updateItem, materials, formData.fromPlant, toast, apiPriceType]);

    const calculateTotalQuantity = useCallback((rows: RequestItem[]) =>
        rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
        , []);

    // --- VALIDATION FOR SUBMIT BUTTON ---
    const isSubmitDisabled = useMemo(() => {
        if (!formData.country || !formData.fromPlant || !formData.toPlant) return true;
        if (items.length === 0) return true;
        const hasInvalidItem = items.some(item => !item.materialCode || item.quantity <= 0);
        return hasInvalidItem;
    }, [formData, items]);


    const handleSubmit = async () => {
        if (isSubmitDisabled) return;

        if (formData.fromPlant === formData.toPlant) {
            toast({ title: "Validation Error", description: "Source and Destination Agent cannot be identical", variant: "destructive" });
            return;
        }

        // Validation for serial numbers
        for (const item of items) {
            const requiresSerial = SERIAL_NUMBER_REQUIRED_BUNDLES.includes(item.materialCode);
            if (requiresSerial && item.quantity <= 5) {
                const selected = item.selectedSerials || [];
                if (selected.length !== item.quantity) {
                    toast({
                        title: "Serial Number Missing",
                        description: `Please select exactly ${item.quantity} serial number(s) for ${item.materialName || 'item'}.`,
                        variant: "destructive"
                    });
                    return;
                }
            }
        }

        try {
            const productSalesOrder = items.map(it => {
                const serials = it.selectedSerials || [];

                return {
                    material: it.materialCode,
                    itemType: it.itemType === "METER" ? "Cable" : (it.materialName || "HARDWARE"),
                    itemQty: String(it.quantity),
                    itemSerialNo: serials.join(","),
                    priceType: formData.priceType === "KIT" ? "Agent Kit Price" : "Agent Individual Price"
                };
            });

            const payload = {
                sapBpId: formData.toPlant,
                type: "SUB_AGENT",
                requestType: "STOCK_TRANSFER",
                transferFrom: formData.fromPlant,
                transferTo: formData.toPlant,
                remark: formData.remark,
                channel: "AGENT",
                salesOrg: currentSalesOrg,
                productSalesOrder
            };

            const res = await agentApi.subAgentToAgentStockTransfer(payload);
            if (res.status === "SUCCESS" || res.statusCode === 200) {
                toast({
                    title: res.status || "Transfer Successful",
                    description: res.statusMessage || "The transfer request has been initiated."
                });
                setFormData({ country: "", fromPlant: "", toPlant: "", remark: "", description: "", priceType: "INDIVIDUAL" });
                setSelectedFromAgent(null);
                setSelectedToAgent(null);
                setItems([{ id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }]);
            } else {
                throw new Error(res.statusMessage || "Failed to initiate transfer");
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.statusMessage,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold">Sub agent to Agent transfer</h1>
                        <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
                            Transfer stock From Sub-agent To Agent and track deliveries
                        </p>
                    </div>
                </div>
            </div>

            <Card className="p-0">
                <Tabs value={tab} onValueChange={setTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="new-transfer" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                            <Plus className="h-4 w-4" />
                            <span>New Transfer</span>
                        </TabsTrigger>
                        <TabsTrigger value="delivery" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                            <Truck className="h-4 w-4" />
                            <span>Delivery</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                            <FileText className="h-4 w-4" />
                            <span>History</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="new-transfer" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                                    New Transfer Request
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div>
                                        <Label htmlFor="country" className="text-xs">Country <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={formData.country}
                                            onValueChange={(value) => setFormData({ ...formData, country: value })}
                                            disabled={countryLoading}
                                        >
                                            <SelectTrigger uiSize="sm">
                                                <SelectValue placeholder={countryLoading ? "Loading..." : "Select country"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.map((c: any, idx: number) => (
                                                    <SelectItem key={`${c.country || 'unk'}-${idx}`} value={c.country || 'unk'}>
                                                        {c.country || 'Unknown'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 relative md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">From Sub-agent <span className="text-red-500">*</span></Label>
                                            {canSearchAgents && (
                                                <Button type="button" variant="ghost" size="xs" onClick={() => setShowFromSearch(true)} className="h-4 p-0">
                                                    <Filter className="h-3 w-3 text-blue-600" />
                                                    <span className="ml-1 text-[10px] text-blue-700">Filter</span>
                                                </Button>
                                            )}
                                        </div>
                                        <Input
                                            uiSize="sm"
                                            placeholder={canSearchAgents ? "Select Source Sub-agent" : "Auto-filled from your account"}
                                            value={selectedFromAgent ? `${selectedFromAgent.agentName} (${selectedFromAgent.sapBpId})` : ""}
                                            readOnly
                                            onClick={() => {
                                                if (canSearchAgents) {
                                                    setShowFromSearch(true);
                                                }
                                            }}
                                            className={cn(
                                                "bg-white",
                                                canSearchAgents ? "cursor-pointer" : "cursor-default bg-gray-50"
                                            )}
                                            disabled={!canSearchAgents}
                                        />
                                    </div>

                                    <div className="space-y-2 relative md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs">To Agent <span className="text-red-500">*</span></Label>
                                            <Button type="button" variant="ghost" size="xs" onClick={() => setShowToSearch(true)} className="h-4 p-0">
                                                <Filter className="h-3 w-3 text-blue-600" />
                                                <span className="ml-1 text-[10px] text-blue-700">Filter</span>
                                            </Button>
                                        </div>
                                        <Input
                                            uiSize="sm"
                                            placeholder="Select Desk Agent"
                                            value={selectedToAgent ? `${selectedToAgent.agentName} (${selectedToAgent.sapBpId})` : ""}
                                            readOnly
                                            onClick={() => setShowToSearch(true)}
                                            className="cursor-pointer bg-white"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="priceType" className="text-xs">Price Type</Label>
                                        <Select
                                            value={formData.priceType}
                                            onValueChange={(value) => {
                                                setFormData({ ...formData, priceType: value });
                                                setItems([{ id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1, unitPrice: 0, totalPrice: 0, selectedSerials: [] }]);
                                            }}
                                        >
                                            <SelectTrigger uiSize="sm">
                                                <SelectValue placeholder="Select Price Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="KIT">Kit Price</SelectItem>
                                                <SelectItem value="INDIVIDUAL">Individual Price</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="remark" className="text-xs">Remark</Label>
                                        <Textarea
                                            id="remark"
                                            value={formData.remark}
                                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                            placeholder="Enter remark (Optional)"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description" className="text-xs">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Enter description (Optional)"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <div className="border rounded p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium">Items</h3>
                                        <Button size="xs" onClick={addItem} variant="ghost" className="flex items-center gap-1 bg-azam-blue text-white hover:bg-azam-blue/90">
                                            <Plus className="w-4 h-4" /> <span className="text-xs">Add Item</span>
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {items.map((it, idx) => {
                                            const usedMaterials = new Set(items.map(i => i.materialCode).filter(c => c && c !== it.materialCode));
                                            const selectedProduct = materials.find((m: any) => m.productId === it.materialCode && m.productPriceType === "Agent Individual Price");
                                            const requiresSerial = selectedProduct && SERIAL_NUMBER_REQUIRED_BUNDLES.includes(selectedProduct.productId);
                                            const showSerialUI = requiresSerial && it.quantity <= 5;

                                            return (
                                                <div key={it.id} className="border p-4 rounded-lg bg-white relative space-y-4 shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                        <div className="md:col-span-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Label className="text-xs">Material <span className="text-red-500">*</span></Label>
                                                                {it.materialCode && (
                                                                    <div className="text-[10px] leading-none">
                                                                        {loadingStock[it.materialCode] ? (
                                                                            <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /></span>
                                                                        ) : (
                                                                            <span
                                                                                className={cn(
                                                                                    "cursor-pointer hover:underline transition-all active:scale-95 flex items-center gap-1",
                                                                                    (stockMap[it.materialCode] ?? 0) === 0 ? "text-red-500 font-medium" : "text-blue-600 font-medium"
                                                                                )}
                                                                                onClick={() => {
                                                                                    const available = stockMap[it.materialCode] ?? 0;
                                                                                    if (available > 0) {
                                                                                        updateItem(it.id, {
                                                                                            quantity: available,
                                                                                            totalPrice: (it.unitPrice || 0) * available
                                                                                        });
                                                                                        toast({
                                                                                            title: "Quantity Set",
                                                                                            description: `Quantity set to maximum available (${available})`,
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Available: <strong>{stockMap[it.materialCode] ?? 0}</strong>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Select
                                                                value={it.materialCode}
                                                                onValueChange={(val) => handleMaterialSelect(it.id, val)}
                                                                disabled={hwLoading}
                                                            >
                                                                <SelectTrigger uiSize="sm">
                                                                    <SelectValue placeholder="Select material" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {materials.filter((m: any) => m.productPriceType === (formData.priceType === "KIT" ? "Agent Kit Price" : "Agent Individual Price")).map((m: any) => (
                                                                        <SelectItem
                                                                            key={`${it.id}-${m.productId}`}
                                                                            value={m.productId}
                                                                            disabled={usedMaterials.has(m.productId)}
                                                                        >
                                                                            {m.productName || m.bundleName || m.productId}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="md:col-span-2">
                                                            <Label className="text-xs mb-1">Qty <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                type="number"
                                                                uiSize="sm"
                                                                value={String(it.quantity)}
                                                                min={1}
                                                                max={stockMap[it.materialCode] ?? 99999}
                                                                disabled={!it.materialCode || loadingStock[it.materialCode]}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const maxStock = stockMap[it.materialCode] ?? 99999;
                                                                    const finalQty = Math.max(1, Math.min(val, maxStock));
                                                                    updateItem(it.id, {
                                                                        quantity: finalQty,
                                                                        totalPrice: (it.unitPrice || 0) * finalQty
                                                                    });
                                                                }}
                                                            />
                                                        </div>

                                                        {/* <div className="md:col-span-2">
                                                            <Label className="text-xs mb-1">Unit Price</Label>
                                                            <Input
                                                                type="number"
                                                                uiSize="sm"
                                                                value={String(it.unitPrice)}
                                                                readOnly
                                                                className="bg-gray-100"
                                                            />
                                                        </div> */}

                                                        {/* <div className="md:col-span-2">
                                                            <Label className="text-xs mb-1">Total</Label>
                                                            <Input
                                                                type="number"
                                                                uiSize="sm"
                                                                value={String(it.totalPrice)}
                                                                readOnly
                                                                className="bg-gray-100"
                                                            />
                                                        </div> */}

                                                        {showSerialUI && (
                                                            <div className="md:col-span-2">
                                                                <Label className="text-xs mb-1">Serial Numbers <span className="text-red-500">*</span></Label>
                                                                {loadingSerials[it.materialCode] ? (
                                                                    <div className="h-7 flex items-center text-[10px] text-gray-500">Loading Serials...</div>
                                                                ) : (
                                                                    <Popover
                                                                        open={!!openSerialCombobox[it.id]}
                                                                        onOpenChange={(open) => setOpenSerialCombobox(prev => ({ ...prev, [it.id]: open }))}
                                                                    >
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className="w-full justify-between h-7 text-xs font-normal px-2"
                                                                                size="xs"
                                                                            >
                                                                                {it.selectedSerials && it.selectedSerials.length > 0
                                                                                    ? `${it.selectedSerials.length}/${it.quantity} Selected`
                                                                                    : "Select Serials"}
                                                                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-[200px] p-0 shadow-lg border-azam-blue/20" align="start">
                                                                            <Command>
                                                                                <CommandInput placeholder="Search serial..." className="h-8" />
                                                                                <CommandList>
                                                                                    <CommandEmpty>No serial found.</CommandEmpty>
                                                                                    <CommandGroup>
                                                                                        {(serialPlaceOptions[it.materialCode] || []).map((sn) => {
                                                                                            const isSelected = it.selectedSerials?.includes(sn);
                                                                                            return (
                                                                                                <CommandItem
                                                                                                    key={sn}
                                                                                                    value={sn}
                                                                                                    onSelect={() => {
                                                                                                        let newSelected = [...(it.selectedSerials || [])];
                                                                                                        if (isSelected) {
                                                                                                            newSelected = newSelected.filter(s => s !== sn);
                                                                                                        } else {
                                                                                                            if (newSelected.length >= it.quantity) {
                                                                                                                toast({ title: "Limit Reached", description: `You can only select ${it.quantity} serial numbers.` });
                                                                                                                return;
                                                                                                            }
                                                                                                            newSelected.push(sn);
                                                                                                        }
                                                                                                        updateItem(it.id, { selectedSerials: newSelected });
                                                                                                    }}
                                                                                                >
                                                                                                    <div className={cn(
                                                                                                        "mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary",
                                                                                                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                                                                    )}>
                                                                                                        <Check className="h-3 w-3" />
                                                                                                    </div>
                                                                                                    <span className="text-[10px]">{sn}</span>
                                                                                                </CommandItem>
                                                                                            );
                                                                                        })}
                                                                                    </CommandGroup>
                                                                                </CommandList>
                                                                            </Command>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="md:col-span-1 flex justify-left">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() => removeItem(it.id)}
                                                                disabled={items.length <= 1}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex justify-end items-center gap-4 pt-2">
                                        <div className="text-sm text-gray-600">Total Items: </div>
                                        <div className="text-base font-semibold text-azam-blue">{calculateTotalQuantity(items)}</div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitDisabled}
                                        size="xs"
                                        variant="secondary"
                                        className="w-full sm:w-auto"
                                    >
                                        Submit Transfer Request
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="delivery" className="space-y-6">
                        <SubagentAgentTransferDelivery />
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        <SubagentAgentTransferHistory />
                    </TabsContent>
                </Tabs>
            </Card>

            {canSearchAgents && (
                <SubagentSearchModal
                    isOpen={showFromSearch}
                    onClose={() => setShowFromSearch(false)}
                    onSelect={(agent) => {
                        setSelectedFromAgent(agent);
                        setFormData(prev => ({ ...prev, fromPlant: agent.sapBpId }));
                    }}
                />
            )}

            <ParentAgentSearchModal
                isOpen={showToSearch}
                onClose={() => setShowToSearch(false)}
                onSelect={(agent) => {
                    setSelectedToAgent(agent);
                    setFormData(prev => ({ ...prev, toPlant: agent.sapBpId }));
                }}
            />
        </div >
    );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  Package,
  Clock,
  Plus,
  XCircle,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";
import {
  useTransferCountries,
  usePlants,
  useHwProducts,
  useWarehouseTransferMutation,
  useStockDetailsMutation
} from "@/hooks/use-inventory-data";
import WarehouseTransferHistory from "./WarehouseTransferHistory";
import WarehouseActiveTransfers from "./WarehouseActiveTransfers";

type RequestItem = {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  itemType: string;
  availableStock?: number;
  isLoadingStock?: boolean;
};

export default function WarehouseTransfer() {
  const { user } = useAuthContext();
  const [selectedTab, setSelectedTab] = useState("create");

  // Form State
  const [formData, setFormData] = useState({
    country: "",
    fromLocation: "",
    toLocation: "",
    reason: "",
  });

  const [items, setItems] = useState<RequestItem[]>([
    { id: `${Date.now()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" },
  ]);

  // --- Hooks for Data ---
  const { data: countries = [], isLoading: countryLoading } = useTransferCountries();
  const { data: plants = [], isLoading: plantLoading } = usePlants();
  const { data: materials = [], isLoading: hwLoading } = useHwProducts();

  const warehouseTransferMutation = useWarehouseTransferMutation();
  const stockDetailsMutation = useStockDetailsMutation();
  const isSubmitting = warehouseTransferMutation.isPending;

  // --- Derived Data (Deduplication) ---
  const uniqueMaterials = useMemo(() => {
    const seen = new Set();
    return materials.filter((m: any) => {
      const id = m.productId;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [materials]);

  // --- NEW: Submit Button Validation Logic ---
  const isSubmitDisabled = useMemo(() => {
    // 1. Basic Form Checks
    if (isSubmitting) return true;
    if (!formData.country || !formData.fromLocation || !formData.toLocation) return true;
    
    // 2. Check Items
    const hasZeroStockItem = items.some(item => 
      // Material is selected AND (stock is explicitly 0 OR stock is still loading)
      item.materialCode && (item.availableStock === 0 || item.isLoadingStock)
    );

    const hasInvalidQuantity = items.some(item => item.quantity <= 0);

    return hasZeroStockItem || hasInvalidQuantity;
  }, [isSubmitting, formData, items]);


  // Auto-select Country
  useEffect(() => {
    if (countries.length === 1 && !formData.country) {
      setFormData(prev => ({ ...prev, country: String(countries[0].country) }));
    }
  }, [countries, formData.country]);

  // Auto-select From Plant
  useEffect(() => {
    if (plants.length === 1 && !formData.fromLocation) {
      setFormData(prev => ({ ...prev, fromLocation: String(plants[0].plant) }));
    }
  }, [plants, formData.fromLocation]);

  // Reset items logic
  useEffect(() => {
    setItems([
      { id: `${Date.now()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" }
    ]);
  }, [formData.country, formData.fromLocation, formData.toLocation]);

  // --- Item Management ---
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" }
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<RequestItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const handleMaterialSelect = useCallback((id: string, materialCode: string) => {
    const selectedMaterial = materials.find((m: any) => m.productId === materialCode);
    const isCable = selectedMaterial?.productName?.toLowerCase().includes("cable");
    const defaultUnit = isCable ? "METER" : "NUMBER";

    if (!formData.fromLocation) {
      toast({ title: "Selection Missing", description: "Please select 'From Location' before adding items.", variant: "destructive" });
      updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit });
      return;
    }

    // Optimistic update + Loading state
    updateItem(id, {
      materialCode,
      materialName: selectedMaterial?.productName || "",
      itemType: defaultUnit,
      isLoadingStock: true,
      availableStock: 0 // Reset to 0 while fetching
    });

    const payload = {
      plant: formData.fromLocation,
      material: materialCode,
      storageLocation: "MAIN"
    };

    stockDetailsMutation.mutate(payload, {
      onSuccess: (res: any) => {
        let stockQty = 0;
        if (res.status === "SUCCESS" && Array.isArray(res.data?.stockOverview)) {
          const match = res.data.stockOverview.find((so: any) => so.place?.sloc === "MAIN");
          if (match) {
            stockQty = Number(match.maxStockLevel?.unit || 0);
          }
        }
        // Update stock, ensure quantity doesn't exceed new stock
        updateItem(id, { 
          isLoadingStock: false, 
          availableStock: stockQty, 
          quantity: stockQty > 0 ? 1 : 0 
        });
        
        if (stockQty === 0) {
          toast({ title: "Out of Stock", description: "Selected material has 0 quantity at source.", variant: "destructive" });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to check stock availability", variant: "destructive" });
        updateItem(id, { isLoadingStock: false });
      }
    });

  }, [updateItem, materials, formData.fromLocation, stockDetailsMutation]);

  const calculateTotalQuantity = useCallback((rows: RequestItem[]) =>
    rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
    , []);

  // --- Submission ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitDisabled) return; // Guard clause

    if (!formData.country || !formData.fromLocation || !formData.toLocation) {
      toast({ title: "Validation Error", description: "Please fill country, source and destination", variant: "destructive" });
      return;
    }

    if (formData.fromLocation === formData.toLocation) {
      toast({ title: "Validation Error", description: "Source and Destination cannot be the same", variant: "destructive" });
      return;
    }

    const invalidItems = items.filter(i => !i.materialCode || !i.quantity || i.quantity <= 0);
    if (invalidItems.length > 0 || items.length === 0) {
      toast({ title: "Validation Error", description: "Please add valid items (Material and Quantity > 0)", variant: "destructive" });
      return;
    }

    // Double check stock before submit (redundant but safe)
    const zeroStockItems = items.filter(i => (i.availableStock || 0) <= 0);
    if (zeroStockItems.length > 0) {
      toast({ title: "Stock Error", description: "Cannot submit request with out-of-stock items.", variant: "destructive" });
      return;
    }

    if (!user?.salesOrg) {
      toast({ title: "Error", description: "Sales Org not found in user profile", variant: "destructive" });
      return;
    }

    const fromPlantObj = plants.find((p: any) => p.plant === formData.fromLocation);
    const toPlantObj = plants.find((p: any) => p.plant === formData.toLocation);

    const payload = {
      country: formData.country,
      fromPlant: formData.fromLocation,
      fromPlantName: fromPlantObj?.plantName || formData.fromLocation,
      toPlant: formData.toLocation,
      toPlantName: toPlantObj?.plantName || formData.toLocation,
      salesOrg: user.salesOrg,
      reason: formData.reason,
      items: items.map(it => ({
        material: it.materialCode,
        itemType: it.materialName,
        itemQty: String(it.quantity)
      }))
    };

    warehouseTransferMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res.status === "SUCCESS") {
          toast({ title: "Success", description: res?.data?.message || "Transfer request created successfully" });
          setFormData({ country: "", fromLocation: "", toLocation: "", reason: "" });
          setItems([{ id: `${Date.now()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" }]);
        } else {
          toast({ title: "Error", description: res.statusMessage || "Failed to process request", variant: "destructive" });
        }
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to submit transfer", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Warehouse Transfer</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Manage inter-warehouse stock transfers and logistics
            </p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="min-w-max grid grid-cols-3">
            <TabsTrigger value="create" className="whitespace-nowrap data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Transfer
            </TabsTrigger>
            <TabsTrigger value="active" className="whitespace-nowrap data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2">
              <Truck className="w-4 h-4" /> Active Transfers
            </TabsTrigger>
            <TabsTrigger value="history" className="whitespace-nowrap data-[state=active]:bg-azam-orange data-[state=active]:text-white flex items-center gap-2">
              <Clock className="w-4 h-4" /> Transfer History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>New Warehouse Transfer Request</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                    <Select value={String(formData.country)} onValueChange={(value) => setFormData({ ...formData, country: value })} disabled={countryLoading}>
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={countryLoading ? "Loading..." : "Select country"} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c: any, idx: number) => (
                          <SelectItem key={`c-${idx}`} value={String(c.country || 'unk')}>{String(c.country || 'Unknown')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fromLocation">From Location <span className="text-red-500">*</span></Label>
                    <Select
                      value={String(formData.fromLocation)}
                      onValueChange={(value) => {
                        setFormData({ ...formData, fromLocation: value });
                      }}
                      disabled={plantLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={plantLoading ? "Loading..." : "Select source"} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((p: any) => (
                          <SelectItem key={`from-${p.plant}`} value={String(p.plant)}>{String(p.plantName)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toLocation">To Location <span className="text-red-500">*</span></Label>
                    <Select
                      value={String(formData.toLocation)}
                      onValueChange={(value) => setFormData({ ...formData, toLocation: value })}
                      disabled={plantLoading || !formData.fromLocation}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={plantLoading ? "Loading..." : "Select destination"} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((p: any) => (
                          <SelectItem
                            key={`to-${p.plant}`}
                            value={String(p.plant)}
                            disabled={String(p.plant) === String(formData.fromLocation)}
                          >
                            {String(p.plantName)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Transfer Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Enter reason for transfer (Optional)"
                    rows={3}
                  />
                </div>

                <div className="border rounded p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Items</h3>
                    <Button type="button" size="xs" onClick={addItem} variant="ghost" className="flex items-center gap-1 bg-azam-blue text-white hover:bg-azam-blue/90">
                      <Plus className="w-4 h-4" /> <span className="text-xs">Add Item</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {items.map((it, index) => {
                      const currentMatCode = String(it.materialCode || "");
                      const usedMaterials = new Set(items.map(i => String(i.materialCode)).filter(code => code && code !== currentMatCode));

                      return (
                        <div key={it.id} className="flex flex-wrap md:flex-nowrap gap-2 items-start border-b md:border-none pb-4 md:pb-0">
                          <div className="w-full md:w-60">
                            <Label className="text-xs mb-1">Material <span className="text-red-500">*</span></Label>
                            <Select
                              value={currentMatCode}
                              onValueChange={(val) => handleMaterialSelect(it.id, val)}
                              disabled={hwLoading}
                            >
                              <SelectTrigger uiSize="sm" className={!currentMatCode ? "border-red-300" : ""}>
                                <SelectValue placeholder={hwLoading ? "Loading..." : "Select material"} />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueMaterials.map((m: any) => (
                                  <SelectItem
                                    key={`${it.id}-${m.productId}`}
                                    value={String(m.productId)}
                                    disabled={usedMaterials.has(String(m.productId))}
                                  >
                                    {String(m.productName || m.bundleName || m.productId)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {it.materialCode && (
                              <div className="text-[10px] mt-1 h-4">
                                {it.isLoadingStock ? (
                                  <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking stock...</span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className={it.availableStock === 0 ? "text-red-500 font-medium" : "text-gray-600"}>
                                      Available: <span className="font-bold">{it.availableStock ?? "-"}</span>
                                    </span>
                                    {it.availableStock === 0 && (
                                      <span className="text-red-500 flex items-center gap-0.5 ml-1">
                                        <AlertCircle className="w-3 h-3" /> No Stock
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="w-1/2 md:w-36">
                            <Label className="text-xs mb-1">Units</Label>
                            <Select
                              value={String(it.itemType)}
                              onValueChange={(val) => updateItem(it.id, { itemType: val })}
                            >
                              <SelectTrigger uiSize="sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NUMBER">NUMBER</SelectItem>
                                <SelectItem value="METER">METER</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-1/2 md:w-28">
                            <Label className="text-xs mb-1">Qty <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              uiSize="sm"
                              value={String(it.quantity)}
                              min={0}
                              max={it.availableStock}
                              disabled={it.isLoadingStock || it.availableStock === 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                if (it.availableStock !== undefined && val > it.availableStock) {
                                  toast({ description: `Cannot transfer more than available stock (${it.availableStock})`, duration: 2000 });
                                  updateItem(it.id, { quantity: it.availableStock });
                                } else {
                                  updateItem(it.id, { quantity: val });
                                }
                              }}
                              className={it.quantity <= 0 ? "border-red-300" : ""}
                            />
                          </div>

                          <div className="md:pt-6">
                            <button
                              type="button"
                              title="Remove item"
                              onClick={() => removeItem(it.id)}
                              className={`p-1.5 rounded bg-white border ${items.length <= 1 ? "opacity-40 cursor-not-allowed text-gray-400" : "text-red-600 hover:bg-red-50 border-red-200"}`}
                              disabled={items.length <= 1}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end items-center gap-4 pt-2">
                    <div className="text-sm text-gray-600">Total Items: </div>
                    <div className="text-base font-semibold text-azam-blue">
                      {calculateTotalQuantity(items)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-azam-blue hover:bg-azam-blue/90 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                    // Modified Disabled Logic here
                    disabled={isSubmitDisabled}
                  >
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Transfer Request"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <WarehouseActiveTransfers />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <WarehouseTransferHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
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
import {
  useTransferCountries,
  usePlants,
  useStoreLocationsByPlant,
  useHwProducts,
  useStockTransferMutation,
  useStockDetailsMutation
} from "@/hooks/use-inventory-data";
import StockTransferHistory from "./StockTransferHistory";
import StockTransferDelivery from "./StockTransferDelivery";

type RequestItem = {
  id: string;
  materialCode: string;
  materialName: string;
  itemType: string;
  quantity: number;
  availableStock?: number; 
  isLoadingStock?: boolean; 
};

export default function StockTransfer() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [tab, setTab] = useState("new-transfer");

  const [formData, setFormData] = useState({
    country: "",
    fromPlant: "",
    fromStore: "", 
    toPlant: "",
    toStore: "",   
    remark: "",
    description: ""
  });

  const [items, setItems] = useState<RequestItem[]>([
    { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1 }
  ]);

  // --- Hooks for Data ---
  const { data: countries = [], isLoading: countryLoading } = useTransferCountries();
  const { data: plants = [], isLoading: plantLoading } = usePlants();
  const { data: fromStores = [], isLoading: fromStoreLoading } = useStoreLocationsByPlant(formData.fromPlant);
  const { data: toStores = [], isLoading: toStoreLoading } = useStoreLocationsByPlant(formData.toPlant);
  const { data: materials = [], isLoading: hwLoading } = useHwProducts();

  const stockTransferMutation = useStockTransferMutation();
  const stockDetailsMutation = useStockDetailsMutation();

  useEffect(() => {
    if (countries.length === 1 && !formData.country) {
      setFormData(prev => ({ ...prev, country: countries[0].country }));
    }
  }, [countries, formData.country]);

  useEffect(() => {
    setItems([
      { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1 }
    ]);
  }, [formData.fromPlant, formData.fromStore, formData.toPlant, formData.toStore]);

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
      { id: `${Date.now()}-${Math.random()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1 }
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

    if (!formData.fromPlant || !formData.fromStore) {
      toast({ title: "Selection Missing", description: "Please select 'From Plant' and 'From Store' before adding items.", variant: "destructive" });
      updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit });
      return;
    }

    // Optimistic update + Loading state
    updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit, isLoadingStock: true, availableStock: 0 });

    // Check Stock at SOURCE
    const payload = {
      plant: formData.fromPlant,
      material: materialCode,
      storageLocation: formData.fromStore
    };

    stockDetailsMutation.mutate(payload, {
      onSuccess: (res: any) => {
        let stockQty = 0;
        if (res.status === "SUCCESS" && Array.isArray(res.data?.stockOverview)) {
          const match = res.data.stockOverview.find((so: any) => so.place?.sloc === formData.fromStore);
          if (match) {
            stockQty = Number(match.maxStockLevel?.unit || 0);
          }
        }
        updateItem(id, { isLoadingStock: false, availableStock: stockQty, quantity: 1 });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to check stock availability", variant: "destructive" });
        updateItem(id, { isLoadingStock: false });
      }
    });
  }, [updateItem, materials, formData.fromPlant, formData.fromStore, stockDetailsMutation, toast]);

  const calculateTotalQuantity = useCallback((rows: RequestItem[]) =>
    rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
    , []);

  // --- VALIDATION FOR SUBMIT BUTTON ---
  const isSubmitDisabled = useMemo(() => {
    // 1. Basic Form Data Check
    if (!formData.country || !formData.fromPlant || !formData.fromStore || !formData.toPlant || !formData.toStore) return true;
    
    // 2. Mutation Pending
    if (stockTransferMutation.isPending) return true;
    
    // 3. Item Validation
    if (items.length === 0) return true;

    // Check if ANY item is invalid
    const hasInvalidItem = items.some(item => {
      // If material not selected
      if (!item.materialCode) return true;
      // If still loading stock
      if (item.isLoadingStock) return true;
      // If stock is 0
      if (item.availableStock === 0) return true;
      // If quantity is invalid or exceeds stock
      if (item.quantity <= 0) return true;
      if (item.availableStock !== undefined && item.quantity > item.availableStock) return true;
      
      return false;
    });

    return hasInvalidItem;
  }, [formData, items, stockTransferMutation.isPending]);


  const handleSubmit = () => {
    if (isSubmitDisabled) return; // Double protection

    if (formData.fromPlant === formData.toPlant) {
      if (formData.fromStore === formData.toStore) {
        toast({ title: "Validation Error", description: "Source and Destination cannot be identical", variant: "destructive" });
        return;
      }
    }

    if (!user?.salesOrg) {
      toast({ title: "Error", description: "Sales Org not found in user profile", variant: "destructive" });
      return;
    }

    const fromPlantObj = plants.find((p: any) => p.plant === formData.fromPlant);
    const toPlantObj = plants.find((p: any) => p.plant === formData.toPlant);

    const payload = {
      country: formData.country,
      fromPlant: formData.fromPlant,
      fromPlantName: fromPlantObj?.plantName || formData.fromPlant,
      toPlant: formData.toPlant,
      toPlantName: toPlantObj?.plantName || formData.toPlant,
      salesOrg: user.salesOrg,
      fromStoreLocation: formData.fromStore,
      toStoreLocation: formData.toStore,
      remark: formData.remark,
      description: formData.description,
      items: items.map(it => ({
        material: it.materialCode,
        itemType: it.materialName,
        itemQty: String(it.quantity)
      }))
    };

    stockTransferMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res.status === "SUCCESS") {
          toast({ title: "Success", description: res?.data?.message || "Stock Transfer Request Success" });
          setFormData({
            country: "", fromPlant: "", fromStore: "",
            toPlant: "", toStore: "", remark: "", description: ""
          });
          setItems([{ id: `${Date.now()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" }]);
        } else {
          toast({ title: "Error", description: res.statusMessage || "Failed to process request", variant: "destructive" });
        }
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.statusMessage || "Failed to submit transfer", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Stock Transfer Management</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Transfer inventory between locations and track approvals
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* ... (Country, Plants, Stores Selectors remain unchanged) ... */}
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

                  <div>
                    <Label htmlFor="fromPlant" className="text-xs">From Plant <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.fromPlant}
                      onValueChange={(value) => setFormData({ ...formData, fromPlant: value, fromStore: "" })}
                      disabled={plantLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={plantLoading ? "Loading..." : "Select source plant"} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((p: any) => (
                          <SelectItem key={`from-${p.plant}`} value={p.plant}>
                            {p.plantName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fromStore" className="text-xs">From Store <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.fromStore}
                      onValueChange={(value) => setFormData({ ...formData, fromStore: value })}
                      disabled={!formData.fromPlant || fromStoreLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={fromStoreLoading ? "Loading..." : "Select store"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fromStores.map((s: any) => (
                          <SelectItem key={`from-s-${s.code}`} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toPlant" className="text-xs">To Plant <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.toPlant}
                      onValueChange={(value) => setFormData({ ...formData, toPlant: value, toStore: "" })}
                      disabled={plantLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={plantLoading ? "Loading..." : "Select dest plant"} />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map((p: any) => (
                          <SelectItem key={`to-${p.plant}`} value={p.plant}>
                            {p.plantName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toStore" className="text-xs">To Store <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.toStore}
                      onValueChange={(value) => setFormData({ ...formData, toStore: value })}
                      disabled={!formData.toPlant || toStoreLoading}
                    >
                      <SelectTrigger uiSize="sm">
                        <SelectValue placeholder={toStoreLoading ? "Loading..." : "Select store"} />
                      </SelectTrigger>
                      <SelectContent>
                        {toStores.map((s: any) => (
                          <SelectItem key={`to-s-${s.code}`} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
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

                  <div className="space-y-2">
                    {items.map((it) => {
                      const usedMaterials = new Set(items.map(i => i.materialCode).filter(c => c && c !== it.materialCode));

                      return (
                        <div key={it.id} className="flex gap-2 items-start flex-wrap md:flex-nowrap pb-4 md:pb-0 border-b md:border-none">
                          <div className="w-full md:w-60">
                            <Label htmlFor={`material-${it.id}`} className="text-xs mb-1">Material <span className="text-red-500">*</span></Label>
                            <Select
                              value={it.materialCode}
                              onValueChange={(val) => handleMaterialSelect(it.id, val)}
                              disabled={hwLoading}
                            >
                              <SelectTrigger uiSize="sm">
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueMaterials.map((m: any) => (
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
                            {/* Stock Availability Display */}
                            {it.materialCode && (
                              <div className="text-[10px] mt-1 h-4">
                                {it.isLoadingStock ? (
                                  <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking stock...</span>
                                ) : (
                                  <span className={it.availableStock === 0 ? "text-red-500 font-medium" : "text-gray-600"}>
                                    Available at Source: <span className="font-bold">{it.availableStock ?? "-"}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="w-1/2 md:w-36">
                            <Label htmlFor={`type-${it.id}`} className="text-xs mb-1">Units</Label>
                            <Select value={it.itemType} onValueChange={(val) => updateItem(it.id, { itemType: val })}>
                              <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NUMBER">NUMBER</SelectItem>
                                <SelectItem value="METER">METER</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-1/2 md:w-28">
                            <Label htmlFor={`qty-${it.id}`} className="text-xs mb-1">Qty <span className="text-red-500">*</span></Label>
                            <Input
                              id={`qty-${it.id}`}
                              type="number"
                              uiSize="sm"
                              value={String(it.quantity)}
                              min={1}
                              max={it.availableStock}
                              disabled={it.isLoadingStock || it.availableStock === 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                if (it.availableStock !== undefined && val > it.availableStock) {
                                  toast({ description: `Cannot transfer more than available stock (${it.availableStock})`, duration: 2000 });
                                  updateItem(it.id, { quantity: it.availableStock });
                                } else {
                                  updateItem(it.id, { quantity: Math.max(1, val) });
                                }
                              }}
                              className={it.quantity <= 0 ? "border-red-300" : ""}
                            />
                          </div>

                          <div className="md:pt-6">
                            <button
                              type="button"
                              onClick={() => removeItem(it.id)}
                              className={`p-1.5 rounded bg-white border ${items.length <= 1 ? "opacity-40 cursor-not-allowed text-gray-400" : "text-red-600 hover:bg-red-50 border-red-200"}`}
                              disabled={items.length <= 1}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
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
                  {/* Updated Button with disabled logic */}
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitDisabled} 
                    size="xs" 
                    variant="secondary" 
                    className="w-full sm:w-auto"
                  >
                    {stockTransferMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Transfer Request"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Approval queue coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <StockTransferDelivery />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <StockTransferHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
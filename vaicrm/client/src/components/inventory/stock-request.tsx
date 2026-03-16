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
  ClipboardList,
  Plus,
  FileText,
  Loader2,
  XCircle,
  Truck,
  CheckSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";
import {
  useTransferCountries,
  usePlants,
  useStoreLocationsByPlant,
  useHwProducts,
  useStockRequestMutation,
  useStockDetailsMutation
} from "@/hooks/use-inventory-data";
import StockRequestHistory from "./StockRequestHistory";
import StockRequestDelivery from "./StockRequestDelivery";
import StockRequestReceiverConfirmation from "./StockRequestReceiverConfirmation";

type RequestItem = {
  id: string;
  materialCode: string;
  materialName: string;
  itemType: string;
  quantity: number;
  availableStock?: number;
  isLoadingStock?: boolean;
};

export default function StockRequest() {
  const { user } = useAuthContext();
  const { toast } = useToast();
const isOtcOrMainPlant = user?.isOtc === "Y" || user?.isMainPlant === "Y";
const showReceiverConfirmation = isOtcOrMainPlant;
const showDeliveryTab = !isOtcOrMainPlant; // ✅ delivery hidden for OTC/MainPlant

  const [formData, setFormData] = useState({
    country: "",
    module: "OTC",
    plant: "",     // "To Plant"
    storeLocation: "",
    warehouseId: "", // "From Warehouse"
    remark: "",
    description: ""
  });

  const [items, setItems] = useState<RequestItem[]>([
    { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1 }
  ]);

  // --- Hooks for Data ---
  const { data: countries = [], isLoading: countryLoading } = useTransferCountries();
  const { data: plants = [], isLoading: plantLoading } = usePlants();
  const { data: storeLocations = [], isLoading: storeLoading } = useStoreLocationsByPlant(formData.plant);
  const { data: materials = [], isLoading: hwLoading } = useHwProducts();

  useEffect(() => {
    if (countries.length === 1 && !formData.country) {
      setFormData(prev => ({ ...prev, country: countries[0].country }));
    }
  }, [countries, formData.country]);

  // --- NEW: Reset items logic ---
  // If From Plant, Store Location, or To Warehouse changes, reset the items list
  useEffect(() => {
    setItems([
      { id: `${Date.now()}`, materialCode: "", materialName: "", itemType: "NUMBER", quantity: 1 }
    ]);
  }, [formData.plant, formData.storeLocation, formData.warehouseId]);

  const filteredStoreLocations = useMemo(() => {
    return storeLocations.filter((s: any) => {
      const name = (s.name || "").toUpperCase();
      const code = (s.code || "").toUpperCase();
      return name.includes("OTC") || code.includes("OTC") || name.includes("MAIN") || code.includes("MAIN");
    });
  }, [storeLocations]);

  const stockRequestMutation = useStockRequestMutation();
  const stockDetailsMutation = useStockDetailsMutation();
  
  // --- Derived Data ---
  // Deduplicate materials because the API returns multiple rows per product (different price types)
  const uniqueMaterials = useMemo(() => {
    const seen = new Set();
    return materials.filter((m: any) => {
      const id = m.productId; 
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [materials]);

  // --- Item Logic ---
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

    // Validate prerequisites
    if (!formData.warehouseId || !formData.storeLocation) {
      toast({ title: "Selection Missing", description: "Please select 'To Warehouse' and 'Store Location' before adding items.", variant: "destructive" });
      // Still set the material but without stock info
      updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit });
      return;
    }

    // Optimistic update + Loading state
    updateItem(id, { materialCode, materialName: selectedMaterial?.productName || "", itemType: defaultUnit, isLoadingStock: true, availableStock: 0 });

    // Payload for Stock Details API
    const payload = {
      plant: formData.warehouseId, // "To Warehouse" value
      material: materialCode,
      storageLocation: "MAIN" // UPDATED: Always sending MAIN
    };

    // Call API using Mutation
    stockDetailsMutation.mutate(payload, {
      onSuccess: (res: any) => {
        let stockQty = 0;

        if (res.status === "SUCCESS" && Array.isArray(res.data?.stockOverview)) {
          // Find stock for "MAIN" specifically
          const match = res.data.stockOverview.find((so: any) => so.place?.sloc === "MAIN"); // UPDATED: Always checking MAIN
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
  }, [updateItem, materials, formData.warehouseId, formData.storeLocation, stockDetailsMutation, toast]);

  const calculateTotalQuantity = useCallback((rows: RequestItem[]) =>
    rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
    , []);

  // --- Submission ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.country || !formData.plant || !formData.storeLocation || !formData.warehouseId) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Updated validation to include stock check
    const invalidItems = items.filter(i => !i.materialCode || !i.quantity || i.quantity <= 0 || (i.availableStock !== undefined && i.quantity > i.availableStock));

    if (invalidItems.length > 0) {
      // Check if it's a stock issue specifically
      const stockIssue = invalidItems.find(i => i.availableStock !== undefined && i.quantity > i.availableStock);
      if (stockIssue) {
        toast({ title: "Stock Error", description: "Requested quantity exceeds available stock", variant: "destructive" });
        return;
      }
      toast({ title: "Validation Error", description: "Please add valid items", variant: "destructive" });
      return;
    }

    if (!user?.salesOrg) {
      toast({ title: "Error", description: "Sales Org not found in user profile", variant: "destructive" });
      return;
    }

    const fromPlantObj = plants.find((p: any) => p.plant === formData.warehouseId);
    const toPlantObj = plants.find((p: any) => p.plant === formData.plant);

    const payload = {
      module: formData.module,
      country: formData.country,
      fromPlant: formData.warehouseId,
      fromPlantName: fromPlantObj?.plantName || formData.warehouseId,
      toPlant: formData.plant,
      toPlantName: toPlantObj?.plantName || formData.plant,
      salesOrg: user.salesOrg,
      otcStoreLocation: formData.storeLocation,
      remark: formData.remark,
      description: formData.description,
      items: items.map(it => ({
        material: it.materialCode,
        itemType: it.materialName,
        itemQty: String(it.quantity)
      }))
    };

    stockRequestMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res.status === "SUCCESS") {
          toast({ title: "Success", description: res?.data?.message || "Stock Request Success" });
          setFormData({
            country: "", module: "OTC", plant: "", storeLocation: "",
            warehouseId: "", remark: "", description: ""
          });
          setItems([{ id: `${Date.now()}`, materialCode: "", materialName: "", quantity: 1, itemType: "NUMBER" }]);
        } else {
          toast({ title: "Error", description: res.statusMessage || "Failed to process request", variant: "destructive" });
        }
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.statusMessage || "Failed to submit request", variant: "destructive" });
      }
    });
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Stock Request Management</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Submit and track inventory stock requests
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs defaultValue="new-request" className="space-y-6">
          {/* UPDATED: Dynamic TabsList based on user role */}
          <TabsList className={`grid w-full ${showDeliveryTab  && showReceiverConfirmation ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="new-request" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Request</span><span className="sm:hidden">New</span>
            </TabsTrigger>
           {showDeliveryTab && (
  <TabsTrigger
    value="delivery"
    className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
  >
    <Truck className="h-4 w-4" /> <span className="hidden sm:inline">Delivery</span>
    <span className="sm:hidden">Delivery</span>
  </TabsTrigger>
)}
            {/* NEW: Conditionally render Receiver Confirmation tab */}
            {showReceiverConfirmation && (
              <TabsTrigger value="receiver-confirmation" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                <CheckSquare className="h-4 w-4" /> <span className="hidden sm:inline">Receiver Confirmation</span><span className="sm:hidden">Confirm</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" /> <span className="hidden sm:inline">History</span><span className="sm:hidden">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-request" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-azam-blue" />
                  New Stock Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">

                    {/* Country */}
                    <div>
                      <Label htmlFor="country" className="text-xs">Country <span className="text-red-500">*</span></Label>
                      <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })} disabled={countryLoading}>
                        <SelectTrigger uiSize="sm"><SelectValue placeholder={countryLoading ? "Loading..." : "Select country"} /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c: any, idx: number) => (
                            <SelectItem
                              key={`${c.country || 'unk'}-${idx}`}
                              value={c.country || 'unk'}
                            >
                              {c.country || 'Unknown'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Module */}
                    <div>
                      <Label htmlFor="module" className="text-xs">Module <span className="text-red-500">*</span></Label>
                      <Select value={formData.module} onValueChange={(v) => setFormData({ ...formData, module: v })}>
                        <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OTC">OTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Plant */}
                    <div>
                      <Label htmlFor="plant" className="text-xs">Request Plant <span className="text-red-500">*</span></Label>
                      <Select value={formData.plant} onValueChange={(v) => setFormData({ ...formData, plant: v, storeLocation: "" })} disabled={plantLoading}>
                        <SelectTrigger uiSize="sm"><SelectValue placeholder={plantLoading ? "Loading..." : "Select plant"} /></SelectTrigger>
                        <SelectContent>
                          {plants.map((p: any) => (
                            <SelectItem key={p.plant} value={p.plant}>
                              {p.plantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Store Location */}
                    <div>
                      <Label htmlFor="storeLocation" className="text-xs">Store Location <span className="text-red-500">*</span></Label>
                      <Select value={formData.storeLocation} onValueChange={(v) => setFormData({ ...formData, storeLocation: v })} disabled={!formData.plant || storeLoading}>
                        <SelectTrigger uiSize="sm"><SelectValue placeholder={storeLoading ? "Loading..." : "Select store"} /></SelectTrigger>
                        <SelectContent>
                          {filteredStoreLocations.map((s: any) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* From Warehouse */}
                    <div>
                      <Label htmlFor="warehouseId" className="text-xs">Supplying Plant <span className="text-red-500">*</span></Label>
                      <Select value={formData.warehouseId} onValueChange={(v) => setFormData({ ...formData, warehouseId: v })} disabled={plantLoading}>
                        <SelectTrigger uiSize="sm"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                        <SelectContent>
                          {plants.map((p: any) => (
                            <SelectItem
                              key={`wh-${p.plant}`}
                              value={p.plant}
                            >
                              {p.plantName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4 h-auto">
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter description (Optional)"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="border rounded p-3 space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Items</h3>
                      <Button type="button" size="xs" onClick={addItem} variant="ghost" className="flex items-center gap-1 bg-azam-blue text-white hover:bg-azam-blue/90">
                        <Plus className="w-4 h-4" /> <span className="text-xs">Add Item</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {items.map((it) => {
                        const usedMaterials = new Set(items.map(i => i.materialCode).filter(c => c && c !== it.materialCode));

                        return (
                          <div key={it.id} className="flex flex-wrap md:flex-nowrap gap-2 items-start border-b md:border-none pb-4 md:pb-0">
                            <div className="w-full md:w-60">
                              <Label className="text-xs mb-1">Material <span className="text-red-500">*</span></Label>
                              <Select value={it.materialCode} onValueChange={(v) => handleMaterialSelect(it.id, v)} disabled={hwLoading}>
                                <SelectTrigger uiSize="sm" className={!it.materialCode ? "border-red-300" : ""}><SelectValue placeholder="Select material" /></SelectTrigger>
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
                              {it.materialCode && (
                                <div className="text-[10px] mt-1 h-4">
                                  {it.isLoadingStock ? (
                                    <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking stock...</span>
                                  ) : (
                                    <span className={it.availableStock === 0 ? "text-red-500 font-medium" : "text-gray-600"}>
                                      Available: <span className="font-bold">{it.availableStock ?? "-"}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="w-1/2 md:w-36">
                              <Label className="text-xs mb-1">Units</Label>
                              <Select value={it.itemType} onValueChange={(v) => updateItem(it.id, { itemType: v })}>
                                <SelectTrigger uiSize="sm"><SelectValue /></SelectTrigger>
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
                                min={1}
                                max={it.availableStock || undefined}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value) || 0;
                                  if (it.availableStock !== undefined && val > it.availableStock) {
                                    val = it.availableStock;
                                    toast({ description: `Cannot request more than available stock (${it.availableStock})`, duration: 2000 });
                                  }
                                  updateItem(it.id, { quantity: Math.max(1, val) });
                                }}
                                className={it.quantity <= 0 ? "border-red-300" : ""}
                                disabled={it.isLoadingStock || (it.availableStock === 0)}
                              />
                            </div>

                            <div className="md:pt-6">
                              <button type="button" onClick={() => removeItem(it.id)} className={`p-1.5 rounded bg-white border ${items.length <= 1 ? "opacity-40 cursor-not-allowed text-gray-400" : "text-red-600 hover:bg-red-50 border-red-200"}`} disabled={items.length <= 1}><XCircle className="w-4 h-4" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end items-center gap-4 pt-2">
                      <div className="text-sm text-gray-600">Total Items: </div>
                      <div className="text-base font-semibold text-azam-blue">{calculateTotalQuantity(items)}</div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" size="sm" className="bg-azam-blue hover:bg-azam-blue/90 text-white" disabled={stockRequestMutation.isPending}>
                      {stockRequestMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {showDeliveryTab && (
  <TabsContent value="delivery" className="space-y-6">
    <StockRequestDelivery />
  </TabsContent>
)}

          {/* NEW: Receiver Confirmation Tab Content */}
          {showReceiverConfirmation && (
            <TabsContent value="receiver-confirmation" className="space-y-6">
              <StockRequestReceiverConfirmation />
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-6">
            <StockRequestHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
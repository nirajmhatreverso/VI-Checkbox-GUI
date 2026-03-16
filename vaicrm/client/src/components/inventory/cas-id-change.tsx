import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";



const ALLOWED_PRODUCT_IDS = ["59", "68", "21", "60", "72", "67", "73", "52"];//DEV /PROD
//const ALLOWED_PRODUCT_IDS = ["44", "48", "51", "100", "74"];// QAS

export default function CasIdChange() {
  // State
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedSerial, setSelectedSerial] = useState<string>("");
  const [newCasId, setNewCasId] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const { user } = useAuthContext();
  const currentSalesOrg = user?.salesOrg;




  // Query to fetch HW products
  const { data: hwProducts = [] } = useQuery({
    queryKey: ["hw-products-cas-change"],
    queryFn: () => apiRequest('/inventory/hw-products', 'POST', { type: "CUSTOMER" }),
    select: (data: any) => {
      const raw = data?.data?.hwProductDetails || [];
      const uniqueMap = new Map();
      raw.forEach((p: any) => {
        if (p.productId && !uniqueMap.has(p.productId)) {
          uniqueMap.set(p.productId, p);
        }
      });
      return Array.from(uniqueMap.values());
    },
    staleTime: 60 * 60 * 1000,
  });

  const filteredProducts = useMemo(() => {
    return hwProducts.filter((mat: any) => {
      const matId = String(mat.productId);
      return ALLOWED_PRODUCT_IDS.includes(matId);
    });
  }, [hwProducts]);

  // Mutation to update CAS ID
  const updateCasIdMutation = useMutation({
    mutationFn: (payload: any) => {
      return apiRequest('/inventory/cas-id-update', 'POST', payload);
    },
    onSuccess: (response) => {
      if (response.status === "SUCCESS") {
        toast({
          title: "Success",
          description: response.data?.message || "CAS ID updated successfully."
        });
        // Reset
        setNewCasId("");
        setSelectedProduct("");
        setSelectedSerial("");
      } else {
        toast({ title: "Update Failed", description: response.statusMessage || "Failed to update CAS ID.", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Update Error", description: error.statusMessage || "An unexpected error occurred.", variant: "destructive" });
    }
  });





  const handleUpdateClick = () => {
    if (!newCasId.trim()) {
      toast({ title: "Validation Error", description: "Please enter the new CAS ID", variant: "destructive" });
      return;
    }
    if (!selectedProduct) {
      toast({ title: "Validation Error", description: "Please select a HW Product", variant: "destructive" });
      return;
    }
    if (!selectedSerial) {
      toast({ title: "Validation Error", description: "Please select a Serial Number", variant: "destructive" });
      return;
    }

    setIsConfirmed(false);
    setIsConfirmOpen(true);
  };

  const executeUpdate = () => {
    const productDetails = hwProducts.find((p: any) => p.productId === selectedProduct);

    const payload = {
      casId: newCasId,
      salesOrg: currentSalesOrg || "",
      deviceSerialNumber: selectedSerial,
      materialId: selectedProduct,
      productName: productDetails?.productName || ""
    };

    updateCasIdMutation.mutate(payload);
    setIsConfirmOpen(false);
  };

  const isBusy = updateCasIdMutation.isPending;

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
        <div>
          <h1 className="text-xl font-bold">CAS ID Management</h1>
          <p className="text-blue-100 text-[11px] md:text-xs mt-0.5">Select HW Product to update CAS ID</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Update CAS ID</CardTitle>
          <CardDescription>Select Product and Serial Number to update CAS ID.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hw-product">Select HW Product <span className="text-red-500">*</span></Label>
              <Select value={selectedProduct} onValueChange={(val) => {
                setSelectedProduct(val);
                setSelectedSerial("");
              }}>
                <SelectTrigger className="h-7" id="hw-product">
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((product: any) => (
                    <SelectItem key={product.productId} value={product.productId}>
                      {product.productName || product.productId}
                    </SelectItem>
                  ))}
                  {filteredProducts.length === 0 && (
                    <SelectItem value="none" disabled>No products found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="serial-no">Serial no <span className="text-red-500">*</span></Label>
              <Input
                id="serial-no"
                value={selectedSerial}
                onChange={(e) => setSelectedSerial(e.target.value)}
                placeholder="Enter Serial Number"
                className="font-mono h-7"
                disabled={!selectedProduct}
              />
            </div>
            <div>
              <Label htmlFor="new-cas-id">New CAS ID <span className="text-red-500">*</span></Label>
              <Input
                id="new-cas-id"
                value={newCasId}
                onChange={(e) => setNewCasId(e.target.value)}
                placeholder="Enter new CAS ID manually"
                className="font-mono h-7"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button onClick={handleUpdateClick} disabled={updateCasIdMutation.isPending} className="bg-azam-blue hover:bg-blue-700">
            {updateCasIdMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</> : <><Save className="h-4 w-4 mr-2" /> Update CAS ID</>}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm CAS ID Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the CAS ID? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="confirm-update"
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(checked === true)}
            />
            <Label htmlFor="confirm-update" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I confirm that I want to update the CAS ID
            </Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={executeUpdate} disabled={!isConfirmed || updateCasIdMutation.isPending} className="bg-azam-blue hover:bg-blue-700">
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
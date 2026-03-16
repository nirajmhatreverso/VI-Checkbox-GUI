import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPaymentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv } from "lucide-react";
import type { z } from "zod";

type PaymentFormData = z.infer<typeof insertPaymentSchema>;

interface PaymentFormProps {
  type: "hardware" | "subscription";
  customers: any[];
  onSubmit: (data: PaymentFormData) => void;
  isLoading?: boolean;
}

export default function PaymentForm({ type, customers, onSubmit, isLoading }: PaymentFormProps) {
  const [previewReceipt, setPreviewReceipt] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      currency: "TSH",
      status: "pending",
    },
  });

  const watchedValues = watch();
  const selectedCustomer = customers.find(c => c.id === watchedValues.customerId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Payment Form */}
      <div className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select onValueChange={(value) => setValue("customerId", parseInt(value))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name} - {customer.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-sm text-red-500 mt-1">{errors.customerId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                TSH
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
                className="pl-12"
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select onValueChange={(value) => setValue("paymentMode", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMode && (
              <p className="text-sm text-red-500 mt-1">{errors.paymentMode.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue="TSH" onValueChange={(value) => setValue("currency", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TSH">TSH - Tanzanian Shilling</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              {...register("referenceNumber")}
              placeholder="Enter reference number"
              className="mt-1"
            />
            {errors.referenceNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.referenceNumber.message}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1 btn-primary" disabled={isLoading}>
              {isLoading ? "Processing..." : "Process Payment"}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setPreviewReceipt(!previewReceipt)}
            >
              Preview Receipt
            </Button>
          </div>
        </form>
      </div>

      {/* Receipt Preview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-azam-dark mb-4">Payment Receipt Preview</h4>
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-azam-blue rounded-full flex items-center justify-center mx-auto mb-2">
                <Tv className="h-8 w-8 text-white" />
              </div>
              <h5 className="font-bold text-azam-dark">AZAM TV</h5>
              <p className="text-sm text-gray-600">Payment Receipt</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Receipt No:</span>
                <span className="font-medium">RCP-000001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{selectedCustomer?.name || "Select Customer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {watchedValues.currency || "TSH"} {watchedValues.amount ? parseFloat(watchedValues.amount).toLocaleString() : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Mode:</span>
                <span className="font-medium">{watchedValues.paymentMode || "Not selected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span className="font-medium">{watchedValues.referenceNumber || "N/A"}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>
                  {watchedValues.currency || "TSH"} {watchedValues.amount ? parseFloat(watchedValues.amount).toLocaleString() : "0"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-gray-500">Thank you for choosing AZAM TV</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

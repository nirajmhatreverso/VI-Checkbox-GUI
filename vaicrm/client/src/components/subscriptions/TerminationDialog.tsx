// src/components/subscriber-view/TerminationDialog.tsx

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, XCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// Updated Zod schema with Duration
const terminationSchema = z.object({
  reasonId: z.string().min(1, "Termination reason is required"),
  renewalCount: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= 1 && num <= 12;
  }, "Duration must be between 1 and 12 months"),
  confirmTermination: z.boolean().refine(val => val === true, { message: "You must confirm the termination" }),
});

type TerminationData = z.infer<typeof terminationSchema>;

interface TerminationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerData: any;
  onOperationSuccess: (message: string, operationType?: string, requestId?: string) => void;
  fullSubscriptionDetails?: any[];
  dropdownOptions?: any;
}

export default function TerminationDialog({ isOpen, onClose, customerData, onOperationSuccess, fullSubscriptionDetails, dropdownOptions }: TerminationDialogProps) {
  const { toast } = useToast();

  const form = useForm<TerminationData>({
    resolver: zodResolver(terminationSchema),
    defaultValues: { confirmTermination: false, reasonId: "", renewalCount: "1" },
  });

  // Auto-select termination reason if single option
  useEffect(() => {
    if (isOpen) {
      const reasons = dropdownOptions?.terminationReason || [];
      if (reasons.length === 1) {
        const val = reasons[0].value;
        if (form.getValues('reasonId') !== val) {
          form.setValue('reasonId', val);
        }
      }
    }
  }, [isOpen, dropdownOptions?.terminationReason, form]);

  const terminateMutation = useMutation<any, Error, any>({
    mutationFn: (payload) => apiRequest('/subscriptions/terminate', 'POST', payload),
    onSuccess: (data) => {
      const successMessage = data?.data?.message || data?.statusMessage || "Subscription terminated successfully.";
      const requestId = data?.data?.requestId || data?.data?.REQUEST_ID;
      toast({ title: "Success", description: successMessage });
      onOperationSuccess(successMessage, "TERMINATION", requestId);
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Termination Failed", description: error?.statusMessage || error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: TerminationData) => {
    const terminationReasons = dropdownOptions?.terminationReason || [];
    const reasonObject = terminationReasons.find((r: any) => r.value === data.reasonId);
    if (!reasonObject) {
      toast({ title: "Error", description: "Invalid reason selected.", variant: "destructive" });
      return;
    }

    // Get Primary Subscription Details to populate dynamic fields
    const primarySub = fullSubscriptionDetails?.find((sub: any) => sub.ITEM_CATEGORY === 'ZBPO');
    if (!primarySub) {
      toast({ title: "Error", description: "Could not find primary subscription details to process termination.", variant: "destructive" });
      return;
    }

    // ✅ Get Active Add-on Details
    const activeAddon = fullSubscriptionDetails?.find((sub: any) => 
        sub.ITEM_CATEGORY === 'ZADO' && sub.STATUS === 'A'
    );

    // Dynamic Calculation
    const duration = parseInt(data.renewalCount, 10);
    const unitPrice = parseFloat(primarySub.CHARGE_AMT || "0");
    const totalAmount = unitPrice * duration;

    // Construct Payload dynamically
    const payload: any = {
      sapBpId: customerData.sapBpId,
      sapCaId: customerData.sapCaId,
      sapContractId: customerData.contractNo,
      termCancelReason: reasonObject.name,
      endDate: format(new Date(), "yyyy-MM-dd"), // Set termination date to today

      // Dynamic fields from Subscription
      salesOrg: primarySub.SALES_ORG,
      division: primarySub.DIVISION,
      connectionType: primarySub.ZCONNECTIONTYPE || "Prepaid",
      currency: primarySub.CURRENCY || "",
      productId: primarySub.ZPROVCODE || primarySub.PKG_CODE || primarySub.PLAN_ID, // Dynamic Product ID

      // Calculated/Mapped fields
      deviceSerialNo: customerData.macId,
      smartCardNo: customerData.macId,
      amount: String(totalAmount),
      noOfDuration: String(duration),
    };

    // ✅ ADDED: Add-on Parameters
    if (activeAddon) {
        payload.addOnAmount = activeAddon.CHARGE_AMT;
        payload.addOnNoOfDuration = String(duration); // Using selected duration for addon too
        payload.addOnSmartCardNo = activeAddon.TECHNICAL_RES_ID;
        payload.addOnProductId = activeAddon.PLAN_CODE; // Use Plan Code or ZPROVCODE if available
    }

    terminateMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span>Customer Termination</span>
          </DialogTitle>
          <DialogDescription>
            This action will permanently end the customer's subscription.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reasonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termination Reason</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(dropdownOptions?.terminationReason || []).map((reason: any) => (
                          <SelectItem key={reason.value} value={reason.value}>{reason.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewalCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Months)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="confirmTermination"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 rounded-md border p-4 bg-red-50 border-red-200">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-bold text-red-900">
                      I understand this action is permanent and cannot be undone.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Terminating the service will disconnect all plans and archive the customer contract immediately.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={terminateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={terminateMutation.isPending}>
                {terminateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                {terminateMutation.isPending ? "Terminating..." : "Confirm Termination"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
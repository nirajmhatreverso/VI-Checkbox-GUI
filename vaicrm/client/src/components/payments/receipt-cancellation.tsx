import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReversalPayload {
  transId: string;
  reason: string;
}

interface ReversalResponse {
  status: string;
  statusCode: number;
  statusMessage: string;
  data: {
    sapBpId: string | null;
    transactionId: string;
    message: string;
  };
}

export default function ReceiptCancellationPage() {
  const [transId, setTransId] = useState("");
  const [reason, setReason] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { toast } = useToast();

  const reversalMutation = useMutation({
    mutationFn: async (payload: ReversalPayload) => {
      // The user requested to integrate: /crm/v1/customerSub/reversal
      // Using the standard router path: /api/customer-sub-payments/reversal
      return await apiRequest("/customer-sub-payments/reversal", "POST", payload);
    },
    onSuccess: (data: ReversalResponse) => {
      if (data.status === "SUCCESS") {
        toast({
          title: "Success",
          description: data.statusMessage || "Reversal processed successfully",
        });
        // Reset form
        setTransId("");
        setReason("");
        setIsConfirmOpen(false);
        setIsConfirmed(false);
      } else {
        toast({
          title: "Error",
          description: data.statusMessage || "Reversal failed",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || error.statusMessage || "Failed to process reversal",
        variant: "destructive",
      });
    },
  });

  const handleSubmitInit = () => {
    if (!transId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a Transaction ID",
        variant: "destructive",
      });
      return;
    }
    if (!reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a reason for the reversal",
        variant: "destructive",
      });
      return;
    }
    setIsConfirmOpen(true);
    setIsConfirmed(false);
  };

  const handleConfirmReversal = () => {
    if (!isConfirmed) return;

    reversalMutation.mutate({
      transId: transId.trim(),
      reason: reason.trim(),
    });
  };

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">Payment Reversal</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Reverse a customer subscription payment
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reversal Details</CardTitle>
          <CardDescription>
            Enter the Transaction ID and the reason for reversal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="transId">Transaction ID <span className="text-red-500">*</span></Label>
              <Input
                id="transId"
                placeholder="e.g. SU10000021791267527"
                value={transId}
                onChange={(e) => setTransId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for reversal..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitInit}
              className="bg-azam-blue hover:bg-azam-blue/90"
              disabled={!transId || !reason}
            >
              Proceed to Reversal
            </Button>
          </div>

          {/* {reversalMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {(reversalMutation.error as any)?.message || "An error occurred while processing the request."}
              </AlertDescription>
            </Alert>
          )} */}
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Reversal</DialogTitle>
            {/* <DialogDescription>
              Are you sure you want to reverse this transaction? This action cannot be undone.
            </DialogDescription> */}
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-3 rounded-md">
              <div className="font-semibold text-gray-500">Transaction ID:</div>
              <div className="col-span-2 font-medium break-all">{transId}</div>

              <div className="font-semibold text-gray-500">Reason:</div>
              <div className="col-span-2 break-words">{reason}</div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="confirm-check"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
              />
              <Label
                htmlFor="confirm-check"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm that the details are correct and I want to proceed.
              </Label>
            </div>
          </div>

          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsConfirmOpen(false)}
              disabled={reversalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReversal}
              disabled={!isConfirmed || reversalMutation.isPending}
            >
              {reversalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Reversal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

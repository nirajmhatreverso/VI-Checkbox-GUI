// src/pages/AgentPaymentSubscription.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AgentSubscriptionPaymentForm from "@/components/payments/AgentSubscriptionPaymentForm";
import AgentSubscriptionPaymentHistory from "@/components/payments/AgentSubscriptionPaymentHistory";
import AgentSubscriptionPaymentApprovalQueue from "@/components/payments/AgentSubscriptionPaymentApprovalQueue";
import { useAuthContext } from "@/context/AuthProvider";
import { Receipt, CheckCircle, Plus } from "lucide-react";

export default function AgentPaymentSubscription() {
  const { user } = useAuthContext();
  const isChecker = (user?.checkerAccess || "N") === "Y";

  return (
    <div className="p-4 sm:p-6">
      {/* Gradient header with subtext */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Agent Subscription Payment</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5">
              Process for agent subscription payments
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={!isChecker ? "new-payment" : "approval-queue"}>
        {/* Equal width tabs with icons */}
        <TabsList className="grid w-full grid-cols-2">
          {!isChecker && (
            <TabsTrigger
              value="new-payment"
              className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
            >
              <Plus className="w-4 h-4" />
              New Payment
            </TabsTrigger>
          )}
          <TabsTrigger
            value="payment-history"
            className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
          >
            <Receipt className="w-4 h-4" />
            Payment History
          </TabsTrigger>
          {isChecker && (
            <TabsTrigger
              value="approval-queue"
              className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
            >
              <CheckCircle className="w-4 h-4" />
              Approval Queue
            </TabsTrigger>
          )}
        </TabsList>

        {!isChecker && (
          <TabsContent value="new-payment" className="space-y-4">
            <AgentSubscriptionPaymentForm />
          </TabsContent>
        )}

        <TabsContent value="payment-history" className="space-y-4">
          <AgentSubscriptionPaymentHistory />
        </TabsContent>

        {isChecker && (
          <TabsContent value="approval-queue" className="space-y-4">
            <AgentSubscriptionPaymentApprovalQueue />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
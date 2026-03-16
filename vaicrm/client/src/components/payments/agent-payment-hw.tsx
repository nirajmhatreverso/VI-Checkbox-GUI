// src/pages/AgentPaymentHW.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PaymentForm from "@/components/payments/PaymentForm";
import PaymentApprovalQueue from "@/components/payments/PaymentApprovalQueue";
import PaymentHistory from "@/components/payments/PaymentHistory";
import { useAuthContext } from "@/context/AuthProvider";
import { Receipt, CheckCircle, Plus } from "lucide-react";

export default function AgentPaymentHW() {
  const { user } = useAuthContext();
  const isChecker = (user?.checkerAccess || "N") === "Y";

  return (
    <div className="p-4 sm:p-6">
      {/* Gradient header with subtext */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {/* DYNAMIC TITLE BASED ON USER ROLE */}
            <h1 className="text-xl font-bold">
              {isChecker ? "Agent Payment Approvals" : "Agent Hardware Payment"}
            </h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5">
              {isChecker 
                ? "Review and process pending agent payments (Hardware & Subscription)" 
                : "Process for agent hardware payments"}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={!isChecker ? "new-payment" : "approval-queue"}>
        {/* Equal width tabs with icons */}
        <TabsList className={`grid w-full ${isChecker ? "grid-cols-2" : "grid-cols-2"}`}>
          {!isChecker && (
            <TabsTrigger
              value="new-payment"
              className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white"
            >
              <Plus className="w-4 h-4" />
              New Payment
            </TabsTrigger>
          )}
          
          {/* History Tab is always visible, but maybe checkers only care about approvals? */}
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
            <PaymentForm />
          </TabsContent>
        )}

        <TabsContent value="payment-history" className="space-y-4">
          <PaymentHistory />
        </TabsContent>

        {isChecker && (
          <TabsContent value="approval-queue" className="space-y-4">
            <PaymentApprovalQueue />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
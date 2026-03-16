import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CustomerPaymentForm from "@/components/payments/CustomerPaymentForm";
import CustomerPaymentApprovalQueue from "@/components/payments/CustomerPaymentApprovalQueue";
import CustomerPaymentHistory from "@/components/payments/CustomerPaymentHistory";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, CheckCircle, FileText, Receipt } from "lucide-react";
import { Badge } from "../ui/badge";
import { useAuthContext } from "@/context/AuthProvider";

export default function CustomerPaymentHWPage() {
  const { user } = useAuthContext();
  
  // Check if user is OTC
  const isOtcUser = (user?.isOtc || "N") === "Y";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer Payment - Hardware</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Process hardware payments for customers following CM workflow
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="process-payment" className="w-full">
        {/* Responsive TabsList wrapper */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent sm:overflow-x-visible">
          <TabsList
            className={`
              w-max min-w-full flex-nowrap
              ${isOtcUser ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}
              flex sm:grid
              gap-10 sm:gap-1
              px-1 sm:px-0
            `}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <TabsTrigger
              value="process-payment"
              className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white whitespace-nowrap"
            >
              <CreditCard className="h-4 w-4" />
              <span className="inline">Process Payment</span>
            </TabsTrigger>
            
            {/* Hide Approve tab for OTC users */}
            {!isOtcUser && (
              <TabsTrigger
                value="approve-payment"
                className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white whitespace-nowrap"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="inline">Approve</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger
              value="payment-history"
              className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white whitespace-nowrap"
            >
              <Receipt className="h-4 w-4" />
              <span className="inline">History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="process-payment" className="space-y-6">
          <CustomerPaymentForm onSuccess={() => { /* Optionally refetch payments */ }} />
        </TabsContent>
        
        {/* Hide Approve tab content for OTC users */}
        {!isOtcUser && (
          <TabsContent value="approve-payment" className="space-y-6">
            <CustomerPaymentApprovalQueue />
          </TabsContent>
        )}
        
        <TabsContent value="tra-posting" className="space-y-6">
          {/* Keep your current logic for TRA Posting */}
        </TabsContent>
        <TabsContent value="payment-history" className="space-y-6">
          <CustomerPaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
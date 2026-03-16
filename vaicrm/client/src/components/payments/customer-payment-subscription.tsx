import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, FileText } from "lucide-react";
import NewCustomerSubPaymentForm from "./NewCustomerSubPaymentForm";
import CustomerSubPaymentApprovalQueue from "./CustomerSubPaymentApprovalQueue";
import CustomerSubPaymentHistory from "./CustomerSubPaymentHistory";
import { useAuthContext } from "@/context/AuthProvider";

export default function CustomerPaymentSubscriptionPage() {
  const [tab, setTab] = useState("new-payment");
  const { user } = useAuthContext();

  // Role checks
  const isAdmin = (user?.allAccess || "N") === "Y";
  const isWarehouseUser = (user?.isMainPlant || "N") === "Y";
  const isOtcUser = (user?.isOtc || "N") === "Y";
  
  // Check if user is an Agent (has sapBpId but is not admin, warehouse, or OTC)
  const isAgent = !!(user?.sapBpId) && !isAdmin && !isWarehouseUser && !isOtcUser;

  // Users who can access the Approval tab: Admin, Warehouse, OTC, and Agent
  const canAccessApproval = isAdmin || isWarehouseUser || isOtcUser || isAgent;

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer Payment - Subscription</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Process subscription payments for customers following CM workflow
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {/* Adjust grid columns based on visibility: 3 if can access approval, 2 otherwise */}
          <TabsList className={`grid w-full ${canAccessApproval ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="new-payment" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Payment</span>
            </TabsTrigger>
            
            {/* Approval Tab - Visible for Admin, Warehouse, OTC, and Agent users */}
            {canAccessApproval && (
              <TabsTrigger value="approval" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Approval</span>
              </TabsTrigger>
            )}

            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-payment" className="space-y-6">
            <NewCustomerSubPaymentForm />
          </TabsContent>

          {/* Approval Content - Visible for Admin, Warehouse, OTC, and Agent users */}
          {canAccessApproval && (
            <TabsContent value="approval" className="space-y-6">
              <CustomerSubPaymentApprovalQueue />
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-6">
            <CustomerSubPaymentHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, FileText, Package } from "lucide-react";
import NewCustomerHwSaleForm from "./NewCustomerHwPaymentForm";
import CustomerHwSaleApprovalQueue from "./CustomerHwPaymentApproval";
import CustomerHwSaleHistory from "./CustomerHwPaymentHistory";
import CustomerHwSaleDelivery from "./CustomerHwSaleDelivery";
import { useAuthContext } from "@/context/AuthProvider";

export default function CustomerHardwareSale() {
  const [tab, setTab] = useState("new-sale");
  const { user } = useAuthContext();

  // --- User Role Detection ---
  // For Customer Hardware Sale: All users can see approval tab
  // (Admin, Main Plant, and Regular Agents)
  // This is different from Agent Hardware Sale where only Admin and Main Plant can approve

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer Hardware Sale</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5">
              Initiate and track hardware sales for customers (OTC & Agent channels)
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {/* All users see 4 tabs including Approval */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="new-sale" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Sale</span>
            </TabsTrigger>
            
            {/* Approval Tab - Visible for All Users */}
            <TabsTrigger value="approval" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Approval</span>
            </TabsTrigger>

            <TabsTrigger value="delivery" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-sale" className="space-y-6">
            <NewCustomerHwSaleForm />
          </TabsContent>
          
          {/* Approval Content - Visible for All Users */}
          <TabsContent value="approval" className="space-y-6">
            <CustomerHwSaleApprovalQueue />
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <CustomerHwSaleDelivery />
          </TabsContent>
          <TabsContent value="history" className="space-y-6">
            <CustomerHwSaleHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
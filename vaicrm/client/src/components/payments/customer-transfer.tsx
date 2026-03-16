
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, FileText } from "lucide-react";
import NewCustomerTransferForm from "./NewCustomerTransferForm";
import CustomerTransferApprovalQueue from "./CustomerTransferApprovalQueue";
import CustomerTransferHistory from "./CustomerTransferHistory";

export default function CustomerTransfer() {
  const [tab, setTab] = useState("new-transfer");

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer-to-Customer Payment Transfer</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Transfer subscription payments between customers
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new-transfer" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Transfer</span>
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Approval</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-transfer" className="space-y-6">
            <NewCustomerTransferForm />
          </TabsContent>
          <TabsContent value="approval" className="space-y-6">
            <CustomerTransferApprovalQueue />
          </TabsContent>
          <TabsContent value="history" className="space-y-6">
            <CustomerTransferHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
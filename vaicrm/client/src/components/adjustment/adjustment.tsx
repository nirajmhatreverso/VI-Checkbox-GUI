import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import CreateAdjustmentForm from "@/components/adjustment/CreateAdjustmentForm";

import AdjustmentHistoryTable from "@/components/adjustment/AdjustmentHistoryTable";
import ApprovalAdjustmentTab from "@/components/adjustment/ApprovalAdjustmentTab";

export default function Adjustment() {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full p-3 space-y-6">
        <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Adjustment</h1>
              <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">Process adjustment requests for agents and customers</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="bg-white dark:bg-gray-800 border border-azam-blue dark:border-azam-blue shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="flex flex-col space-y-1 p-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              {/* Always single row */}
              <TabsList className="grid w-full grid-cols-3 rounded-lg p-1">
                <TabsTrigger
                  value="create"
                  style={activeTab === 'create' ? { backgroundColor: '#e67c1a', color: '#fff' } : { color: '#304454' }}
                  className="flex items-center gap-2 rounded-md font-medium transition-colors justify-center"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>New Request</span>
                </TabsTrigger>
                <TabsTrigger
                  value="approval"
                  style={activeTab === 'approval' ? { backgroundColor: '#e67c1a', color: '#fff' } : { color: '#304454' }}
                  className="flex items-center gap-2 rounded-md font-medium transition-colors justify-center"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Pending Approvals</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  style={activeTab === 'history' ? { backgroundColor: '#e67c1a', color: '#fff' } : { color: '#304454' }}
                  className="flex items-center gap-2 rounded-md font-medium transition-colors justify-center"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Adjustment Log</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-1">
              <TabsContent value="create" className="mt-0 space-y-6">
                <div className="w-full">

                  <CreateAdjustmentForm onAdjustmentCreated={() => setActiveTab("approval")} />
                </div>
              </TabsContent>

              <TabsContent value="approval" className="mt-0 space-y-6">
                <div className="w-full">

                  <ApprovalAdjustmentTab />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-6">
                <div className="w-full">
                  <AdjustmentHistoryTable />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
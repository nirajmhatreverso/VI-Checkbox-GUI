import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, History, TrendingUp } from "lucide-react";
import BulkUploadTab from "@/components/bulk-provision/BulkUploadTab";
import BulkUploadTable from "@/components/bulk-provision/BulkUploadTable";

export default function BulkProvision() {
  const [activeTab, setActiveTab] = useState("new");

  // Statistics for display
  const stats = {
    totalUploads: 156,
    pendingApproval: 8,
    successfulUploads: 142,
    rejectedUploads: 6
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full space-y-3">

        {/* Simple Page Header */}
        <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Bulk Provisioning</h1>
              <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">Upload and manage bulk operations for devices and customers</p>
            </div>
          </div>
        </div>
        {/* Main Content Tabs */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <TabsList className="flex justify-start space-x-1">
                <TabsTrigger
                  value="new"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg data-[state=active]:bg-azam-orange data-[state=active]:text-white"
                >
                  <Upload className="h-4 w-4" />
                  New Upload
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Create
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg data-[state=active]:bg-azam-orange data-[state=active]:text-white"
                >
                  <History className="h-4 w-4" />
                  Upload History
                  {/* {stats.pendingApproval > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {stats.pendingApproval}
                    </Badge>
                  )} */}
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-2">
              <TabsContent value="new" className="mt-0 space-y-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Upload Excel files for bulk operations. Download templates to ensure correct formatting and data validation.
                  </p>
                  <BulkUploadTab />
                </div>
              </TabsContent>

              <TabsContent value="view" className="mt-0 space-y-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Review uploaded files, track processing status, and manage approval workflow for bulk operations.
                  </p>
                  <BulkUploadTable />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
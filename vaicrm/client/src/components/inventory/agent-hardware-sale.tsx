import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, CheckCircle, Package, FileText } from "lucide-react";
import NewHardwareSaleForm from "./NewHardwareSaleForm";
import HardwareSaleApprovalQueue from "./HardwareSaleApprovalQueue";
import HardwareSaleDelivery from "./HardwareSaleDelivery";
import HardwareSaleHistory from "./HardwareSaleHistory";
import { useAuthContext } from "@/context/AuthProvider";

// Local type used for Delivery tab
type AgentHardwareSale = {
  id: number;
  requestId: string;
  agentName: string;
  sapBpId: string;
  sapCaId: string;
  plantId: string;
  transferFrom: string;
  transferTo: string;
  priceType: "KIT" | "INDIVIDUAL";
  currency: string;
  salesOrg: string;
  division: string;
  agentBalance: number;
  items: { materialCode: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
  vatAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  cmStatus?: "PENDING" | "APPROVED" | "REJECTED";
  cmStatusMsg?: string;
  createDt: string;
  updateDt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  sapSoId?: string;
  deliveryNoteId?: string;
  invoiceId?: string;
  serialNumbersAssigned?: boolean;
  serialNumbers?: string[];
};

export default function AgentHardwareSale() {
  const [tab, setTab] = useState("new-request");
  const { user } = useAuthContext();

  // --- UPDATED: Determine user role and approval visibility ---
  const isMainPlantUser = user?.isMainPlant === "Y";
  const isAgent = user?.allAccess === "N" && !isMainPlantUser; // Regular agent (not main plant)
  const canSeeApproval = !isAgent || isMainPlantUser; // Admin, Main Plant, or non-restricted users can see approval

  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Agent Hardware Sale</h1>
            <p className="text-blue-100 text-[11px] md:text-xs leading-tight mt-0.5 sm:block">
              Manage agent hardware sale requests, approvals, delivery and history
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          {/* UPDATED: Dynamic Grid based on approval visibility */}
          <TabsList className={`grid w-full ${canSeeApproval ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="new-request" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </TabsTrigger>
            
            {/* UPDATED: Approval Tab - Visible for Admin and Main Plant Users */}
            {canSeeApproval && (
              <TabsTrigger value="approval" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
                <CheckCircle className="h-4 w-4" />
                <span>Approval</span>
              </TabsTrigger>
            )}

            <TabsTrigger value="delivery" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              <span>Delivery</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-azam-orange data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-request" className="space-y-6">
            <NewHardwareSaleForm />
          </TabsContent>

          {/* UPDATED: Approval Content - Visible for Admin and Main Plant Users */}
          {canSeeApproval && (
            <TabsContent value="approval" className="space-y-6">
              <HardwareSaleApprovalQueue />
            </TabsContent>
          )}

          <TabsContent value="delivery" className="space-y-6">
            <HardwareSaleDelivery />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HardwareSaleHistory />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Search, User, CheckCircle, AlertCircle, Building2, Filter, Plus, Wallet, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CustomerSearchModal from "@/components/customers/CustomerSearchModal";
import ParentAgentSearchModal, { AgentApiItem } from "@/components/agents/ParentAgentSearchModal";
import { agentApi } from "@/lib/agentApi";
import { useAuthContext } from "@/context/AuthProvider";
import { customerPaymentApi } from "@/lib/api-client";

// --- Types & Schema ---

const adjustmentSchema = z.object({
  userType: z.enum(["customer", "agent"]),
  adjustmentType: z.enum(["CREDIT", "DEBIT"]),
  module: z.enum(["HARDWARE", "SUBSCRIPTION"]),
  reason: z.string().min(1, "Reason is required"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  referenceInvoiceNo: z.string().optional(),
  remarks: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface CreateAdjustmentFormProps {
  onAdjustmentCreated?: () => void;
}

export default function CreateAdjustmentForm({ onAdjustmentCreated }: CreateAdjustmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // --- State ---

  // Target Entity State
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentApiItem | null>(null);

  // Modals Visibility
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showAgentSearch, setShowAgentSearch] = useState(false);

  // Form
  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      userType: "customer",
      adjustmentType: undefined,
      module: undefined,
      reason: "",
      amount: "",
      referenceInvoiceNo: "",
      remarks: "",
    },
  });

  const userType = form.watch("userType");
  const moduleValue = form.watch("module");

  // --- Helpers ---

  const fetchCustomerDetails = async (bpId: string) => {
  try {
    const payload = {
      type: "Customer",
      isSubCollection: "Y",
      salesOrg: user?.salesOrg || "",
      sapBpId: bpId
    };

    const res: any = await agentApi.searchUserDetails(payload);

    if (res.status === "SUCCESS" && res.data?.customerDetails?.length > 0) {
      const foundCustomer = res.data.customerDetails.find((item: any) =>
        Array.isArray(item.relatedParty) &&
        item.relatedParty.some((rp: any) => String(rp.sapBpId) === bpId)
      ) || res.data.customerDetails[0];

      const related = foundCustomer.relatedParty?.find((rp: any) => String(rp.sapBpId) === bpId) 
        || foundCustomer.relatedParty?.[0]; // fallback to first relatedParty if not found by bpId
      
      const caId = related?.sapCaId || foundCustomer.sapCaId || "N/A";
      const customerCurrency = related?.currency || "";
      // ✅ ADDED: Extract division from relatedParty
      const customerDivision = related?.division || "";
      // ✅ ADDED: Extract salesOrg from relatedParty
      const customerSalesOrg = related?.salesOrg || "";

      const mapped = {
        name: `${foundCustomer.firstName || ""} ${foundCustomer.lastName || ""}`.trim(),
        sapBpId: related?.sapBpId || bpId,
        sapCaId: caId,
        currency: customerCurrency,
        division: related.division || "",     // ✅ ADDED
        salesOrg: related.salesOrg || "",     // ✅ ADDED
        status: foundCustomer.status || "Active",
        accountType: foundCustomer.agreementType || "",
        district: foundCustomer.contactMedium?.find((c: any) => c.type === 'BILLING_ADDRESS')?.district || "",
        ward: foundCustomer.contactMedium?.find((c: any) => c.type === 'BILLING_ADDRESS')?.ward || "",
        agreementType: foundCustomer.agreementType || "",
        mobile: foundCustomer.contactMedium?.find((c: any) => c.type === 'mobile')?.value || "",
        email: foundCustomer.contactMedium?.find((c: any) => c.type === 'email')?.value || "",
        country: foundCustomer.contactMedium?.find((c: any) => c.type === 'BILLING_ADDRESS')?.country || "",
        region: foundCustomer.contactMedium?.find((c: any) => c.type === 'BILLING_ADDRESS')?.region || "",
        city: foundCustomer.contactMedium?.find((c: any) => c.type === 'BILLING_ADDRESS')?.city || "",
      };

      setSelectedCustomer(mapped);
      toast({ title: "Customer Selected", description: `${mapped.name} (${mapped.sapBpId})` });

    } else {
      toast({ title: "Error", description: "Could not fetch customer details", variant: "destructive" });
    }
  } catch (error) {
    toast({ title: "Error", description: "Failed to fetch customer details", variant: "destructive" });
  }
};

  const handleUserTypeChange = (value: "customer" | "agent") => {
    form.setValue("userType", value);
    // Reset selections
    setSelectedCustomer(null);
    setSelectedAgent(null);
  };

  const handleCreate = async (data: AdjustmentFormData) => {
    if (data.userType === "customer" && !selectedCustomer) {
      toast({ title: "Validation Error", description: "Please select a customer first.", variant: "destructive" });
      return;
    }
    if (data.userType === "agent" && !selectedAgent) {
      toast({ title: "Validation Error", description: "Please select an agent first.", variant: "destructive" });
      return;
    }

    if (data.userType === "customer") {
      try {
        const payload = {
      module: "CUSTOMER",
      sapBpId: selectedCustomer.sapBpId,
      sapCaId: selectedCustomer.sapCaId,
      salesOrg: selectedCustomer.salesOrg || user?.salesOrg, // ✅ Use customer's salesOrg first
      // ✅ UPDATED: Use division from customer details (from relatedParty)
      division: selectedCustomer.division || (user as any)?.division,
      currency: selectedCustomer.currency,
      connectionType: selectedCustomer.agreementType,
      amount: data.amount,
      invoiceNo: data.referenceInvoiceNo,
      customerName: selectedCustomer.name,
      adjustmentType: data.adjustmentType.charAt(0).toUpperCase() + data.adjustmentType.slice(1).toLowerCase(),
      adjustmentReason: data.reason,
      remark: data.remarks,
      actionFor: data.module
    };

        const res = await customerPaymentApi.createAdjustment(payload);

        if (res.status === "SUCCESS" || res.statusCode === 200) {
          toast({
            title: "Adjustment Created",
            description: res.statusMessage || res?.data?.message || "Adjustment saved in Pending Approval state.",
          });
          if (onAdjustmentCreated) {
            onAdjustmentCreated();
          }
        } else {
          toast({ title: "Error", description: res.statusMessage || "Failed to create adjustment", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Error", description: error.statusMessage || error.message || "Failed to create adjustment", variant: "destructive" });
      }
    } else {
      try {
        const payload = {
      module: "AGENT",
      sapBpId: selectedAgent!.sapBpId,
      sapCaId: selectedAgent!.sapCaId || "",
      salesOrg: selectedAgent!.salesOrg || user?.salesOrg, // ✅ Use agent's salesOrg first
      // ✅ UPDATED: Use division from agent details (from relatedParty)
      division: selectedAgent!.division || (user as any)?.division,
      currency: selectedAgent!.currency,
      connectionType: selectedAgent!.agreementType || "Prepaid", 
      amount: data.amount,
      invoiceNo: data.referenceInvoiceNo,
      customerName: selectedAgent!.agentName,
      adjustmentType: data.adjustmentType.charAt(0).toUpperCase() + data.adjustmentType.slice(1).toLowerCase(),
      adjustmentReason: data.reason,
      remark: data.remarks,
      actionFor: data.module
    };

        const res = await customerPaymentApi.createAdjustment(payload);

        if (res.status === "SUCCESS" || res.statusCode === 200) {
          toast({
            title: "Adjustment Created",
            description: res.statusMessage || res?.data?.message || "Adjustment saved in Pending Approval state.",
          });
          if (onAdjustmentCreated) {
            onAdjustmentCreated();
          }
        } else {
          toast({ title: "Error", description: res.statusMessage || "Failed to create adjustment", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Error", description: error.statusMessage || error.message || "Failed to create adjustment", variant: "destructive" });
      }
    }
  };

  const renderModuleReasons = () => {
    if (moduleValue === "HARDWARE") {
      return (
        <>
          <SelectItem value="Free">Free</SelectItem>
          <SelectItem value="Demo">Demo</SelectItem>
          <SelectItem value="HW Loss">HW Loss</SelectItem>
          <SelectItem value="Discount">Discount</SelectItem>
        </>
      );
    }
    return (
      <>
        <SelectItem value="Free">Free</SelectItem>
        <SelectItem value="Demo">Demo</SelectItem>
        <SelectItem value="Discount">Discount</SelectItem>
      </>
    );
  };

  const isFormDisabled = (userType === "customer" && !selectedCustomer) || (userType === "agent" && !selectedAgent);

  return (
    <Card className="border-azam-blue/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Plus className="h-5 w-5 text-azam-blue" /> New Adjustment Request
        </CardTitle>
        <CardDescription>Create a new adjustment for customers or agents</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">

            {/* 1. Selection & Search Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

              {/* User Type Selection */}
              <div className="w-full">
                <Label className="mb-2 block font-medium">Select User Type</Label>
                <Select
                  value={userType}
                  onValueChange={(v) => handleUserTypeChange(v as "customer" | "agent")}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entity Search (Dynamic Label) */}
              <div className="w-1/2 col-span-1 lg:col-span-2">
                <Label className="mb-1 block font-medium">
                  {userType === "customer" ? "Customer SAP BP ID" : "Agent SAP BP ID"} <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2 relative">
                  <Input
                    readOnly
                    placeholder={userType === "customer" ? "Click Filter to search customer..." : "Click Filter to search agent..."}
                    value={
                      userType === "customer"
                        ? (selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.sapBpId})` : "")
                        : (selectedAgent ? `${selectedAgent.agentName} (${selectedAgent.sapBpId})` : "")
                    }
                    onClick={() => userType === "customer" ? setShowCustomerSearch(true) : setShowAgentSearch(true)}
                    className="cursor-pointer bg-gray-50 focus:ring-0 h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="xs"
                    className="h-7 text-xs bg-azam-orange hover:bg-orange-600 text-white border-none"
                    onClick={() => userType === "customer" ? setShowCustomerSearch(true) : setShowAgentSearch(true)}
                  >
                    <Filter className="h-3 w-3 mr-1" /> Filter
                  </Button>
                </div>
              </div>

            </div>

            {/* 2. Customer/Agent Details Card */}
            {(selectedCustomer || selectedAgent) && (
              <div className="mt-4 mb-4 w-full p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-orange-50 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base font-bold text-azam-orange tracking-wide">
                    {userType === "customer" ? "Customer Details" : "Agent Details"}
                  </span>
                </div>

                <div className="mb-2 px-2 py-3 rounded-lg bg-white/60 border border-orange-100 flex flex-wrap items-center justify-start gap-y-3 gap-x-6">
                  {userType === "customer" && selectedCustomer && (
                    <>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">Name:</span> {selectedCustomer.name}</div>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP BP ID:</span> {selectedCustomer.sapBpId}</div>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP CA ID:</span> {selectedCustomer.sapCaId}</div>
                      {/* ✅ ADDED: Display Currency */}
                      {selectedCustomer.currency && (
                        <div className="font-semibold text-gray-900"><span className="text-azam-orange">Currency:</span> {selectedCustomer.currency}</div>
                      )}
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">Connection Type:</span> {selectedCustomer.agreementType}</div>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">Status:</span> {selectedCustomer.status}</div>
                      {selectedCustomer.mobile && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Mobile:</span> {selectedCustomer.mobile}</div>}
                      {selectedCustomer.email && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Email:</span> {selectedCustomer.email}</div>}
                      {selectedCustomer.country && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Country:</span> {selectedCustomer.country}</div>}
                      {selectedCustomer.region && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Region:</span> {selectedCustomer.region}</div>}
                      {selectedCustomer.city && <div className="font-semibold text-gray-900"><span className="text-azam-orange">City:</span> {selectedCustomer.city}</div>}
                      {selectedCustomer.district && <div className="font-semibold text-gray-900"><span className="text-azam-orange">District:</span> {selectedCustomer.district}</div>}
                      {selectedCustomer.ward && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Ward:</span> {selectedCustomer.ward}</div>}
                    </>
                  )}

                  {userType === "agent" && selectedAgent && (
                    <>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">Name:</span> {selectedAgent.agentName}</div>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP BP ID:</span> {selectedAgent.sapBpId}</div>
                      <div className="font-semibold text-gray-900"><span className="text-azam-orange">SAP CA ID:</span> {selectedAgent.sapCaId || "N/A"}</div>
                      {/* ✅ ADDED: Display Currency */}
                      {selectedAgent.currency && (
                        <div className="font-semibold text-gray-900"><span className="text-azam-orange">Currency:</span> {selectedAgent.currency}</div>
                      )}
                      {selectedAgent.country && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Country:</span> {selectedAgent.country}</div>}
                      {selectedAgent.region && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Region:</span> {selectedAgent.region}</div>}
                      {selectedAgent.city && <div className="font-semibold text-gray-900"><span className="text-azam-orange">City:</span> {selectedAgent.city}</div>}
                      {selectedAgent.district && <div className="font-semibold text-gray-900"><span className="text-azam-orange">District:</span> {selectedAgent.district}</div>}
                      {selectedAgent.ward && <div className="font-semibold text-gray-900"><span className="text-azam-orange">Ward:</span> {selectedAgent.ward}</div>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. Adjustment Fields Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>

              <FormField
                control={form.control}
                name="adjustmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CREDIT">CREDIT</SelectItem>
                        <SelectItem value="DEBIT">DEBIT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Module</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("reason", "");
                      }}
                      value={field.value}
                      disabled={isFormDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HARDWARE">HARDWARE</SelectItem>
                        <SelectItem value="SUBSCRIPTION">SUBSCRIPTION</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {renderModuleReasons()}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" type="number" step="0.01" {...field} disabled={isFormDisabled} className="h-7 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceInvoiceNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Invoice No <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter invoice no" {...field} disabled={isFormDisabled} className="h-7 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Remarks <span className="text-gray-400 font-normal">(Optional)</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter detailed remarks" rows={1} className="min-h-[40px]" {...field} disabled={isFormDisabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="outline" className="mr-2" onClick={() => form.reset()}>
                Reset
              </Button>
              <Button type="submit" className="bg-azam-blue hover:bg-blue-700 min-w-[150px]" disabled={isFormDisabled}>
                Create Request
              </Button>
            </div>

          </form>
        </Form>
      </CardContent>

      {/* Modals */}
      <CustomerSearchModal
        isOpen={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        onSelect={(id) => fetchCustomerDetails(id)}
      />

      <ParentAgentSearchModal
        isOpen={showAgentSearch}
        onClose={() => setShowAgentSearch(false)}
        onSelect={(agent) => setSelectedAgent(agent)}
        isSubCollection="N"
      />

    </Card>
  );
}
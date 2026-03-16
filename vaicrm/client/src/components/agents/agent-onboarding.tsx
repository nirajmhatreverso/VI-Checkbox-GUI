// src/pages/agent-onboarding.tsx
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, SlidersHorizontal, RefreshCw, Search, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MultiStepAgentForm from "@/components/forms/multi-step-agent-form";
import AgentsDataGrid from "@/components/agents/agents-data-grid";
import AgentDetailsModal from "@/components/agents/agent-details-modal";
import { useAuthContext } from "@/context/AuthProvider";
import type { Agent } from "@/components/agents/agents-data-grid";
import AgentApproveModal from "@/components/agents/agent-approve-modal";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import AdvancedAgentFilters, { type AgentFilters, type AdvancedFilter } from "@/components/agents/AdvancedAgentFilters";
import LocationFilterModal, { type LocationFilters } from "@/components/agents/LocationFilterModal";
import { Badge } from "@/components/ui/badge";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { agentApi } from "@/lib/agentApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialApiFilters: AgentFilters = {
  ipRegion: "",
  ipCityName: "",
  ipWard: "",
  ipDistrict: "",
  agentStage: null,
  status: "",
  type: "",
  sapBpId: "",
  parentSapBpId: "",
  agentId: "",
  onbId: "",
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  country: "",
  createDt: "",
  salesOrg: "",
  division: "",
  fromDate: "",
  toDate: "",
};

const agentStatusOptions = [
  { value: "CAPTURED", name: "Captured" },
  { value: "COMPLETED", name: "Completed" },
  { value: "REJECTED", name: "Rejected" },
  { value: "RELEASE_TO_CM", name: "Release to CM" },
  { value: "RETRY", name: "Retry" },
  { value: "RELEASE_TO_KYC", name: "Release to KYC" },
];

function extractCityName(cityValue?: string) {
  if (!cityValue) return "";
  return cityValue.split("_")[0];
}

export default function AgentOnboarding() {
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approveAgent, setApproveAgent] = useState<Agent | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // ✅ Reset Password State
  const [resetPasswordAgent, setResetPasswordAgent] = useState<Agent | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [useAdvanced, setUseAdvanced] = useState(false);

  const [basicSapBpId, setBasicSapBpId] = useState("");
  const [basicParentSapBpId, setBasicParentSapBpId] = useState("");
  const [basicFirstName, setBasicFirstName] = useState("");
  const [basicLastName, setBasicLastName] = useState("");
  const [basicEmail, setBasicEmail] = useState("");
  const [basicMobile, setBasicMobile] = useState("");
  const [basicOnbId, setBasicOnbId] = useState("");
  const [basicType, setBasicType] = useState("all");
  const [basicStatus, setBasicStatus] = useState("all");

  const debouncedSapBpId = useDebouncedValue(basicSapBpId, 500);
  const debouncedParentSapBpId = useDebouncedValue(basicParentSapBpId, 500);
  const debouncedFirstName = useDebouncedValue(basicFirstName, 500);
  const debouncedLastName = useDebouncedValue(basicLastName, 500);
  const debouncedEmail = useDebouncedValue(basicEmail, 500);
  const debouncedMobile = useDebouncedValue(basicMobile, 500);
  const debouncedOnbId = useDebouncedValue(basicOnbId, 500);

  const [advancedApiFilters, setAdvancedApiFilters] = useState<Partial<AgentFilters>>(initialApiFilters);
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({ country: "", region: "", city: "", district: "", ward: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { data: dropdowns } = useOnboardingDropdowns();

  const finalFilters = useMemo(() => {
    const locationApiPayload = {
      country: locationFilters.country,
      ipRegion: locationFilters.region,
      ipCityName: extractCityName(locationFilters.city),
      ipDistrict: locationFilters.district,
      ipWard: locationFilters.ward,
    };

    if (useAdvanced) {
      return { ...advancedApiFilters, ...locationApiPayload };
    }

    const combinedFilters = {
      ...initialApiFilters,
      ...locationApiPayload,
      sapBpId: debouncedSapBpId,
      parentSapBpId: debouncedParentSapBpId,
      firstName: debouncedFirstName,
      lastName: debouncedLastName,
      email: debouncedEmail,
      mobile: debouncedMobile,
      onbId: debouncedOnbId,
      type: basicType === "all" ? "" : basicType,
      agentStage: basicStatus === "all" ? null : [basicStatus],
    };
    return combinedFilters;
  }, [
    useAdvanced,
    advancedApiFilters,
    debouncedSapBpId,
    debouncedParentSapBpId,
    debouncedFirstName,
    debouncedLastName,
    debouncedEmail,
    debouncedMobile,
    debouncedOnbId,
    basicType,
    basicStatus,
    locationFilters,
  ]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agents", finalFilters, page, pageSize],
    enabled: !!user,
    queryFn: async () => {
      const body = { ...finalFilters, offSet: (page - 1) * pageSize, limit: pageSize };
      const result = await agentApi.fetch(body);
      return result.data;
    },
  });

  const agents = data?.data || [];
  const total = data?.totalRecordCount || 0;

  // ✅ Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (agent: Agent) => {
      // Validate that we have the required data
      if (!agent.userName) {
        throw new Error('Agent username is not available');
      }
      if (!agent.email) {
        throw new Error('Agent email is not available. Cannot send password reset email.');
      }

      // Use agentApi for consistency
      return agentApi.resetPassword({
        userName: agent.userName,
        email: agent.email,
        name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.userName
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Password Reset Successful",
        description: data?.statusMessage || "New password has been sent to the agent's email.",
        duration: 5000,
      });
      setResetPasswordAgent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error?.statusMessage || error?.message || "Failed to reset password. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    }
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agentData: any) => {
      const formData = new FormData();
      if (agentData.poaDocFile instanceof File) formData.append("poaDocFile", agentData.poaDocFile);
      if (agentData.poiDocFile instanceof File) formData.append("poiDocFile", agentData.poiDocFile);

      const onboardingRequest = {
        type: agentData.type,
        division: "DTH",
        isSubCollection: agentData.isSubCollection,
        parentSapBpId: agentData.parentId || null,
        salutation: agentData.salutation,
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        gender: agentData.gender,
        email: agentData.email,
        mobile: agentData.mobile,
        phone: agentData.phone || null,
        fax: agentData.fax || null,
        country: agentData.country,
        region: agentData.region,
        city: agentData.city,
        district: agentData.district,
        ward: agentData.ward,
        address1: agentData.address1,
        address2: agentData.address2,
        pinCode: agentData.pinCode,
        tinName: agentData.tinName,
        tinNo: agentData.tinNo,
        vrnNo: agentData.vrnNo || null,
        currency: agentData.currency,
        commValue: String(agentData.commValue),
        salesOrg: agentData.salesOrg,
        kycDocNo: agentData.kycDocNo || null,
        poaDocNo: agentData.poaDocNo || null,
      };

      formData.append("onboardingRequest", new Blob([JSON.stringify(onboardingRequest)], { type: "application/json" }));
      return agentApi.create(formData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Success", description: result?.statusMessage || "Agent onboarded successfully" });
      setShowForm(false); setEditingAgent(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.statusMessage || "An unexpected error occurred", variant: "destructive" });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ newData, oldData }: { newData: any; oldData: Agent }) => {
      const stage = (oldData.agentStage || "").toUpperCase();
      const statusVal = (oldData.status || "").toUpperCase();
      const isPostApproval = ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(stage) || ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(statusVal);

      let payload: any;

      if (isPostApproval) {
        const phoneChanged = (newData.phone || "") !== (oldData.phone || "");
        const mobileChanged = (newData.mobile || "") !== (oldData.mobile || "");
        const emailChanged = (newData.email || "") !== (oldData.email || "");
        const address1Changed = (newData.address1 || "") !== (oldData.addressOne || "");
        const address2Changed = (newData.address2 || "") !== (oldData.addressTwo || "");

        if (![phoneChanged, mobileChanged, emailChanged, address1Changed, address2Changed].some(Boolean)) {
          throw { statusMessage: "At least one of Phone, Mobile, Email, Address1 or Address2 must be changed." };
        }

        payload = {
          onbId: oldData.onbId,
          sapBpId: oldData.sapBpId,
          sapCaId: oldData.sapCaId,
          phone: phoneChanged ? newData.phone : "",
          oldPhone: phoneChanged ? oldData.phone || "" : "",
          mobile: mobileChanged ? newData.mobile : "",
          oldMobile: mobileChanged ? oldData.mobile || "" : "",
          email: emailChanged ? newData.email : "",
          oldEmail: emailChanged ? oldData.email || "" : "",
          address1: address1Changed ? newData.address1 : "",
          oldAddress1: address1Changed ? oldData.addressOne || "" : "",
          address2: address2Changed ? newData.address2 : "",
          oldAddress2: address2Changed ? oldData.addressTwo || "" : "",
        };

      } else {
        const formData = new FormData();
        const poaFileIsNew = newData.poaDocFile instanceof File;
        const poiFileIsNew = newData.poiDocFile instanceof File;
        const isFileUpdate = poaFileIsNew || poiFileIsNew;
        const onboardingRequest = {
          agentId: oldData.agentId,
          onbId: oldData.onbId,
          isUpdate: isFileUpdate ? "true" : "false",
          type: (newData.type || "").toString().trim().toUpperCase().replace(/[\s-]/g, "_"),
          division: "DTH",
          isSubCollection: newData.isSubCollection,
          parentSapBpId: (newData.parentId || "").trim() || null,
          salutation: newData.salutation,
          firstName: newData.firstName,
          lastName: newData.lastName,
          gender: newData.gender,
          email: newData.email,
          mobile: newData.mobile,
          phone: newData.phone || null,
          fax: newData.fax || null,
          country: newData.country,
          region: newData.region,
          city: newData.city,
          district: newData.district,
          ward: newData.ward,
          address1: newData.address1,
          address2: newData.address2,
          pinCode: newData.pinCode || "",
          tinName: newData.tinName,
          tinNo: newData.tinNo,
          vrnNo: newData.vrnNo || null,
          currency: newData.currency,
          commValue: String(newData.commValue ?? 5),
          salesOrg: newData.salesOrg,
          kycDocNo: newData.kycDocNo || null,
          poaDocNo: newData.poaDocNo || null,
        };

        if (newData.poaDocFile instanceof File) {
          formData.append("poaDocFile", newData.poaDocFile);
        }
        if (newData.poiDocFile instanceof File) {
          formData.append("poiDocFile", newData.poiDocFile);
        }

        formData.append("onboardingRequest", new Blob([JSON.stringify(onboardingRequest)], { type: "application/json" }));
        payload = formData;
      }

      return agentApi.update({ newData: payload, oldData, isPostApproval });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Success", description: result?.statusMessage || "Agent updated successfully." });
      setShowForm(false);
      setEditingAgent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.statusMessage || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  if (showForm || editingAgent) {
    const stage = (editingAgent?.agentStage || "").toUpperCase();
    const statusVal = (editingAgent?.status || "").toUpperCase();
    const isPostApproval = !!editingAgent && (["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(stage) || ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(statusVal));

    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{editingAgent ? `Edit Agent - ${editingAgent.firstName}` : "New Agent Registration"}</h2>
          <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingAgent(null); }}>Back to List</Button>
        </div>
        <MultiStepAgentForm
          onSubmit={(data) => {
            if (editingAgent) {
              updateAgentMutation.mutate({ newData: data, oldData: editingAgent });
            } else {
              createAgentMutation.mutate(data);
            }
          }}
          isEdit={!!editingAgent}
          isPostApproval={isPostApproval}
          isLoading={createAgentMutation.isPending || updateAgentMutation.isPending}
          defaultValues={editingAgent || undefined}
          key={editingAgent?.agentId}
        />
      </div>
    );
  }

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setUseAdvanced(false);
    setAdvancedApiFilters(initialApiFilters);
    setAdvFilters([]);
    setBasicFirstName(""); setBasicLastName(""); setBasicEmail(""); setBasicMobile(""); setBasicSapBpId(""); setBasicParentSapBpId(""); setBasicOnbId("");
    setBasicType("all"); setBasicStatus("all");
    setLocationFilters({ country: "", region: "", city: "", district: "", ward: "" });
    setPage(1);
    setTimeout(() => refetch(), 100);
  };

  const locationFilterCount = Object.values(locationFilters).filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Registered Agents</h2>
          <p className="text-sm text-gray-500 mt-1">
            View, edit, or manage all onboarded agent records.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> New Agent</Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic Filters</Button>
            <Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsLocationModalOpen(true)} className="relative">
              <MapPin className="h-4 w-4 mr-2" /> Location
              {locationFilterCount > 0 && (<Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{locationFilterCount}</Badge>)}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}><RefreshCw className="h-4 w-4 mr-2" /> Reset</Button>
            <Button size="sm" onClick={handleSearch}><Search className="h-4 w-4 mr-2" /> Search</Button>
          </div>
        </div>

   {!useAdvanced && (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3 border p-3 rounded-md bg-gray-50">
    <Input 
      uiSize="sm" 
      placeholder="SAP BP ID..." 
      value={basicSapBpId} 
      maxLength={20}
      onChange={(e) => setBasicSapBpId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))} 
    />
    <Input 
      uiSize="sm" 
      placeholder="Parent SAP BP ID..." 
      value={basicParentSapBpId} 
      maxLength={20}
      onChange={(e) => setBasicParentSapBpId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))} 
    />
    <Input 
      uiSize="sm" 
      placeholder="First Name..." 
      value={basicFirstName} 
      maxLength={50}
      onChange={(e) => setBasicFirstName(e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50))} 
    />
    <Input 
      uiSize="sm" 
      placeholder="Last Name..." 
      value={basicLastName} 
      maxLength={50}
      onChange={(e) => setBasicLastName(e.target.value.replace(/[^A-Za-z\s]/g, "").slice(0, 50))} 
    />
    <Input 
      uiSize="sm" 
      placeholder="Email..." 
      value={basicEmail} 
      onChange={(e) => setBasicEmail(e.target.value.replace(/[^A-Za-z0-9@._-]/g, ""))} 
    />
    <Input 
      uiSize="sm" 
      placeholder="Mobile..." 
      value={basicMobile} 
      maxLength={14}
      onChange={(e) => setBasicMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 14))} 
    />
    <Select value={basicType} onValueChange={setBasicType}>
      <SelectTrigger uiSize="sm"><SelectValue placeholder="All Types" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        {(dropdowns?.agentType || []).map((opt: any) => (<SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>))}
      </SelectContent>
    </Select>
    <Select value={basicStatus} onValueChange={setBasicStatus}>
      <SelectTrigger uiSize="sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {agentStatusOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>))}
      </SelectContent>
    </Select>
  </div>
)}

        {useAdvanced && (<AdvancedAgentFilters advFilters={advFilters} setAdvFilters={setAdvFilters} onFilterChange={setAdvancedApiFilters} />)}
      </div>

      {isLoading && !data ? (
        <Card><CardContent className="p-8"><LoadingCard message="Loading agents..." /></CardContent></Card>
      ) : (
        <AgentsDataGrid
          agents={agents} isLoading={isLoading} total={total} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={setPageSize}
          onEdit={(agent) => { setEditingAgent(agent); setShowForm(true); }}
          onApproveReject={(agent) => { setApproveAgent(agent); setShowApproveModal(true); }}
          onView={(agent) => { setSelectedAgent(agent); setShowDetails(true); }}
          // ✅ PASS HANDLER HERE
          onResetPassword={(agent) => setResetPasswordAgent(agent)}
        />
      )}

      <LocationFilterModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} initialValues={locationFilters} onApply={(filters) => setLocationFilters(filters)} />
      <AgentDetailsModal agent={selectedAgent} isOpen={showDetails} onClose={() => setShowDetails(false)} onEdit={(agent) => { setShowDetails(false); setEditingAgent(agent); setShowForm(true); }} />
      <AgentApproveModal agent={approveAgent} isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} onSuccess={() => refetch()} />

      {/* ✅ Reset Password Alert Dialog */}
      <AlertDialog open={!!resetPasswordAgent} onOpenChange={(open) => !open && setResetPasswordAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for <strong>{resetPasswordAgent?.firstName} {resetPasswordAgent?.lastName}</strong>?
              <br /><br />
              {resetPasswordAgent?.email ? (
                <>A new password will be generated and sent to <strong>{resetPasswordAgent.email}</strong></>
              ) : (
                <span className="text-red-500">⚠️ No email address found for this agent!</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetPasswordAgent) {
                  resetPasswordMutation.mutate(resetPasswordAgent);
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={resetPasswordMutation.isPending || !resetPasswordAgent?.email || !resetPasswordAgent?.userName}
            >
              {resetPasswordMutation.isPending ? "Sending..." : "Send Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
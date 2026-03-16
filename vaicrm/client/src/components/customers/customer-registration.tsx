// src/pages/customer-registration.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, SlidersHorizontal, RefreshCw, Search, MapPin } from "lucide-react";
import MultiStepCustomerForm from "@/components/forms/multi-step-customer-form";
import CustomersDataGrid from "@/components/customers/customers-data-grid";
import CustomerDetailsModal from "@/components/customers/customer-details-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton, LoadingCard } from "@/components/ui/loading-spinner";
import { customerApi } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapCustomerApiToFormData } from "@/utils/customer-data-mapper";
import type { Customer } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import AdvancedCustomerFilters, { type AdvancedFilter, type CustomerFiltersPayload } from "@/components/customers/AdvancedCustomerFilters";
import LocationFilterModal, { type LocationFilters } from "@/components/agents/LocationFilterModal";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { apiRequest } from "@/lib/queryClient";
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

const initialApiFilters: Partial<CustomerFiltersPayload> = {
  country: "", region: "", city: "", district: "", ward: "",
  firstName: "", lastName: "", mobile: "", email: "",
  customerStage: "", division: "", accountClass: "",
  salesOrg: "", customerType: "", customerStatus: "",
  fromDate: "", toDate: "",
  sapBpId: "",
};

function extractCityName(cityValue?: string) {
  if (!cityValue) return "";
  return cityValue.split("_")[0] || cityValue;
}

export default function CustomerRegistration() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const customerStatusOptions = [
    { value: "CAPTURED", name: "Captured" },
    { value: "RELEASE_TO_CM", name: "RELEASE_TO_CM" },
    { value: "FAILED", name: "Failed" },
    { value: "PENDING", name: "Pending" },
    { value: "REJECTED", name: "Rejected" },
    { value: "RELEASE_TO_KYC", name: "Release to KYC" },
    { value: "RETRY", name: "Retry" },
  ];
  const queryClient = useQueryClient();
  const [approveReason, setApproveReason] = useState("");
  const { data: dropdowns, isLoading: dropdownsLoading } = useOnboardingDropdowns();
  const approvalReasons = dropdowns?.approvalReason || [];
  const rejectReasons = dropdowns?.rejectReason || [];
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Customer | null>(null);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [useAdvanced, setUseAdvanced] = useState(false);
const [hasTransitionalStatus, setHasTransitionalStatus] = useState(false);
  // ✅ Reset Password State
  const [resetPasswordCustomer, setResetPasswordCustomer] = useState<Customer | null>(null);

  const [basicFirstName, setBasicFirstName] = useState("");
  const [basicLastName, setBasicLastName] = useState("");
  const [basicSapBpId, setBasicSapBpId] = useState("");
  const [basicEmail, setBasicEmail] = useState("");
  const [basicMobile, setBasicMobile] = useState("");
  const [basicStatus, setBasicStatus] = useState("");
  const debouncedFirstName = useDebouncedValue(basicFirstName, 500);
  const debouncedLastName = useDebouncedValue(basicLastName, 500);
  const debouncedSapBpId = useDebouncedValue(basicSapBpId, 500);
  const debouncedEmail = useDebouncedValue(basicEmail, 500);
  const debouncedMobile = useDebouncedValue(basicMobile, 500);

  const [advancedApiFilters, setAdvancedApiFilters] = useState<Partial<CustomerFiltersPayload>>({});
  const [advFilters, setAdvFilters] = useState<AdvancedFilter[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({ country: "", region: "", city: "", district: "", ward: "" });

  const finalFilters = useMemo(() => {
    const locationApiPayload = {
      country: locationFilters.country,
      region: locationFilters.region,
      city: extractCityName(locationFilters.city),
      district: locationFilters.district,
      ward: locationFilters.ward,
    };

    if (useAdvanced) {
      return {
        ...initialApiFilters,
        ...advancedApiFilters,
        ...locationApiPayload
      };
    }

    return {
      ...initialApiFilters,
      ...locationApiPayload,
      firstName: debouncedFirstName,
      lastName: debouncedLastName,
      sapBpId: debouncedSapBpId,
      email: debouncedEmail,
      mobile: debouncedMobile,
      customerStage: basicStatus,
    };
  }, [useAdvanced, advancedApiFilters, debouncedFirstName, debouncedLastName, debouncedSapBpId, debouncedEmail, debouncedMobile, locationFilters, basicStatus]);

  const { data, isLoading, refetch } = useQuery({
  queryKey: ["customers", finalFilters, page, pageSize],
  queryFn: () => apiRequest('/customers/list', 'POST', { ...finalFilters, offSet: (page - 1) * pageSize, limit: pageSize }),
  staleTime: 5 * 60 * 1000,
  // Auto-refresh every 5 seconds when there are transitional statuses
  refetchInterval: hasTransitionalStatus ? 5000 : false,
  refetchIntervalInBackground: false, // Only refetch when tab is active
});



  const customers = useMemo(() => (data?.data?.data as Customer[]) ?? [], [data]);
  const totalCount = useMemo(() => data?.data?.totalRecordCount ?? 0, [data]);

  useEffect(() => {
  if (!customers || customers.length === 0) {
    setHasTransitionalStatus(false);
    return;
  }

  // Check if any customer has a transitional status that might change
  const transitionalStatuses = ['RELEASE_TO_CM', 'RELEASE_TO_KYC', 'PENDING', 'INPROGRESS', 'RETRY'];
  const hasTransitional = customers.some((customer: Customer) => {
    const stage = String((customer as any).customerStage || '').toUpperCase();
    return transitionalStatuses.includes(stage);
  });

  setHasTransitionalStatus(hasTransitional);
}, [customers]);

  // ✅ Reset Password Mutation
  const resetPasswordMutation = useMutation({
  mutationFn: async (customer: Customer) => {
    // Validate that we have the required data
    if (!customer.userName) {
      throw new Error('Customer username is not available');
    }
    if (!customer.email) {
      throw new Error('Customer email is not available. Cannot send password reset email.');
    }

    // Use customerApi for consistency
    return customerApi.resetPassword({
      userName: customer.userName,
      email: customer.email,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.userName
    });
  },
  onSuccess: (data: any) => {
    toast({
      title: "Password Reset Successful",
      description: data?.statusMessage || "New password has been sent to the customer's email.",
      duration: 5000,
    });
    setResetPasswordCustomer(null);
    // Invalidate and refetch to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    refetch();
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

  const formatDateForApi = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd");
    } catch {
      return "";
    }
  };
  const emptyStringToNull = (value: any) => (value === "" ? null : value);
  const createOnboardingRequestPayload = (formData: any, isUpdate = false, oldData?: Customer, isFileUpdate = false) => {
    // ✅ Helper to extract city name from "Name_Code" format
    const useSameAsInstallation = formData.sameAsInstallation === true;


    const sanitizeCityValue = (cityValue?: string | null): string | null => {
      if (!cityValue) return null;

      // If format is "City_Code" (e.g., "Dodoma_03"), send as-is
      const parts = String(cityValue).split("_");

      // If we have exactly 2 parts (City_Code), return as-is
      if (parts.length === 2) {
        return cityValue;
      }

      // If we have more than 2 parts (e.g., "Dodoma_03_03_03"), take first 2
      if (parts.length > 2) {
        return `${parts[0]}_${parts[1]}`;
      }

      // If just city name (no underscore), return as-is
      return cityValue;
    };
    const extractCityName = (cityValue?: string) => {
      if (!cityValue) return null;
      const parts = String(cityValue).split("_");
      return parts[0] || cityValue;
    };
    const formatDateForApi = (dateString?: string) => {
      if (!dateString) return "";
      try {
        return format(new Date(dateString), "yyyy-MM-dd");
      } catch {
        return "";
      }
    };

    const emptyStringToNull = (value: any) => {
      if (value === "" || value === undefined) return null;
      return value;
    };

    // Helper to extract city name from "Name_Code" format
    const extractCityNameForPayload = (cityValue?: string | null): string | null => {
      if (!cityValue) return null;
      const parts = String(cityValue).split("_");
      return parts[0] || String(cityValue);
    };

    const payload: Record<string, any> = {
      ...(isUpdate && { custId: oldData?.custId }),
      salutation: formData.title,
      firstName: formData.firstName,
      lastName: formData.lastName,
      mobile: formData.mobile,
      email: formData.email,
      customerStatus: formData.newOrExisting,
      currency: formData.currency,
      customerType: formData.customerType,
      division: formData.division,
      salesOrg: formData.salesOrg,
      sameAsInstallation: useSameAsInstallation,
      gender: formData.gender,
      race: formData.race,
      tinNo: formData.ctinNumber,
      tinName: formData.tinName,
      serviceType: formData.division,
      accountClass: formData.accountClass,
      noOfRooms: (formData.accountClass || "").toLowerCase().includes("hotel")
        ? formData.noOfRooms
        : undefined,
      smsFlag: formData.smsFlag ? "Y" : "N",
      isChild: (formData.newOrExisting || "").toLowerCase().includes("existing"),
      remark: isUpdate ? "Customer registration update" : "New customer onboarding",
      dob: formatDateForApi(formData.dateOfBirth),
      middleName: emptyStringToNull(formData.middleName),
      phone: emptyStringToNull(formData.phone),
      fax: emptyStringToNull(formData.fax),
      altPhone: emptyStringToNull(formData.altPhone),
      altEmail: emptyStringToNull(formData.altEmail),
      azamPesaId: emptyStringToNull(formData.azamPayId),
      azamMaxTv: emptyStringToNull(formData.azamMaxTvId),
      vrnNo: emptyStringToNull(formData.cvrnNumber),
      orgName: emptyStringToNull(formData.orgName),
      parentBpId: emptyStringToNull(formData.parentSapBpId),
      agentSapBpId: formData.agentSapBpId,

      // ✅ Installation Address (always sent)
      countryInst: formData.countryInst,
      regionInst: formData.regionInst,
      cityInst: sanitizeCityValue(formData.cityInst), // ✅ Extract name only
      districtInst: formData.districtInst,
      wardInst: formData.wardInst,
      address1Inst: formData.address1Inst,
      address2Inst: emptyStringToNull(formData.address2Inst),
      pinCodeInst: formData.postalCodeInst,

      // ✅ Billing Address (conditional based on sameAsInstallation)
      country: useSameAsInstallation
        ? (formData.countryInst || null)
        : emptyStringToNull(formData.billingCountry),
      region: useSameAsInstallation
        ? (formData.regionInst || null)
        : emptyStringToNull(formData.billingRegion),
      city: useSameAsInstallation
        ? sanitizeCityValue(formData.cityInst)
        : sanitizeCityValue(formData.billingCity),

      district: useSameAsInstallation
        ? (formData.districtInst || null)
        : emptyStringToNull(formData.billingDistrict),

      ward: useSameAsInstallation
        ? (formData.wardInst || null)
        : emptyStringToNull(formData.billingWard),

      address1: useSameAsInstallation
        ? (formData.address1Inst || null)
        : emptyStringToNull(formData.billingAddress1),

      address2: useSameAsInstallation
        ? emptyStringToNull(formData.address2Inst)
        : emptyStringToNull(formData.billingAddress2),
      pinCode: useSameAsInstallation
        ? emptyStringToNull(formData.postalCodeInst)
        : emptyStringToNull(formData.billingPostalCode),

      // KYC
      poiDocId: emptyStringToNull(formData.kycDocNoPOI),
      poaDocId: emptyStringToNull(formData.kycDocNoPOA),
      poaDocNo: emptyStringToNull(formData.kycDocNoPOA),
      poiDocNo: emptyStringToNull(formData.kycDocNoPOI),
    };

    if (isUpdate) {
      (payload as any).isUpdate = isFileUpdate ? "true" : "false";
    }



    return payload;
  };

  const registerMutation = useMutation({
  mutationFn: (formData: any) => {
    const finalFormData = new FormData();
    if (formData.kycPoa instanceof File) {
      finalFormData.append("poaDocFile", formData.kycPoa);
    }
    if (formData.kycPoi instanceof File) {
      finalFormData.append("poiDocFile", formData.kycPoi);
    }
    const onboardingRequest = createOnboardingRequestPayload(formData, false);
    finalFormData.append("onboardingRequest", new Blob([JSON.stringify(onboardingRequest)], { type: "application/json" }));
    return apiRequest('/customers/create', 'POST', finalFormData);
  },
  onSuccess: (result: any) => {
    toast({ title: "Success", description: result?.statusMessage || "Customer registered successfully" });
    setShowForm(false);
    // Invalidate and refetch to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setTimeout(() => refetch(), 100); // Small delay to ensure invalidation completes
  },
  onError: (error: any) => {
    toast({ title: "Error", description: error?.statusMessage || "Failed to register customer", variant: "destructive" });
  },
});

  const updateMutation = useMutation({
    mutationFn: async ({ newData, oldData }: { newData: any; oldData: Customer }) => {
      const stage = (oldData.customerStage || "").toUpperCase();
      const postApprovalStages = ["APPROVED", "COMPLETED", "RELEASE_TO_CM"];

      if (postApprovalStages.includes(stage)) {
        const phoneChanged = newData.phone !== (oldData.phone || "");
        const mobileChanged = newData.mobile !== (oldData.mobile || "");
        const emailChanged = newData.email !== (oldData.email || "");
        const address1Changed = newData.address1Inst !== (oldData.address1 || "");
        const address2Changed = newData.address2Inst !== (oldData.address2 || "");

        if (![phoneChanged, mobileChanged, emailChanged, address1Changed, address2Changed].some(Boolean)) {
          throw new Error("At least one value (Phone, Mobile, Email, or Address) must be changed to update.");
        }

        const payload = {
          custId: oldData.custId, sapBpId: oldData.sapBpId, sapCaId: oldData.sapCaId,
          phone: phoneChanged ? newData.phone : "", oldPhone: phoneChanged ? oldData.phone || "" : "",
          mobile: mobileChanged ? newData.mobile : "", oldMobile: mobileChanged ? oldData.mobile || "" : "",
          email: emailChanged ? newData.email : "", oldEmail: emailChanged ? oldData.email || "" : "",
          address1: address1Changed ? newData.address1Inst : "", oldAddress1: address1Changed ? oldData.address1 || "" : "",
          address2: address2Changed ? newData.address2Inst : "", oldAddress2: address2Changed ? oldData.address2 || "" : "",
        };
        return apiRequest('/customers/update-post-approval', 'PUT', payload);
      } else {
        const finalFormData = new FormData();
        const poaFileIsNew = newData.kycPoa instanceof File;
        const poiFileIsNew = newData.kycPoi instanceof File;
        const isFileUpdate = poaFileIsNew || poiFileIsNew;
        if (poaFileIsNew) finalFormData.append("poaDocFile", newData.kycPoa);
        if (poiFileIsNew) finalFormData.append("poiDocFile", newData.kycPoi);

        const onboardingRequest = createOnboardingRequestPayload(newData, true, oldData, isFileUpdate);
        finalFormData.append("onboardingUpdateRequest", new Blob([JSON.stringify(onboardingRequest)], { type: "application/json" }));
        return apiRequest('/customers/update-pre-approval', 'POST', finalFormData);
      }
    },
    onSuccess: (result) => {
  toast({ title: "Success", description: result?.statusMessage || "Customer updated successfully" });
  setShowForm(false);
  setEditingCustomer(null);
  // Invalidate and refetch to ensure fresh data
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  setTimeout(() => refetch(), 100); // Small delay to ensure invalidation completes
},
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.statusMessage, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
  mutationFn: ({ target, remarks, reason }: { target: Customer; remarks?: string; reason?: string }) =>
    apiRequest('/customers/approve', 'POST', {
      custId: String((target as any).custId),
      customerStage: 'APPROVED',
      remark: remarks,
      reason
    }),
  onSuccess: (res: any) => {
    toast({ title: "Approved", description: res?.data?.message || "Customer approved successfully" });
    setApproveDialogOpen(false);
    setApproveTarget(null);
    // Invalidate and refetch to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    refetch();
  },
  onError: (e: any) => { 
    toast({ 
      title: "Approve failed", 
      description: e?.data?.message || e?.statusMessage || "Failed to approve customer", 
      variant: "destructive" 
    }); 
  },
});

  const rejectMutation = useMutation({
  mutationFn: ({ target, remarks, reason }: { target: Customer; remarks?: string; reason?: string }) =>
    apiRequest('/customers/approve', 'POST', {
      custId: String((target as any).custId),
      customerStage: 'REJECTED',
      remark: remarks,
      reason
    }),
  onSuccess: (res: any) => {
    toast({ title: "Rejected", description: res?.data?.message || "Customer rejected successfully" });
    setApproveDialogOpen(false);
    setApproveTarget(null);
    // Invalidate and refetch to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    refetch();
  },
  onError: (e: any) => { 
    toast({ 
      title: "Reject failed", 
      description: e?.data?.message || e?.statusMessage || "Failed to reject customer", 
      variant: "destructive" 
    }); 
  },
});

  const retryMutation = useMutation({
  mutationFn: (customer: Customer) => {
    if (!customer.custId) {
      throw new Error("Cannot retry: Customer ID is missing.");
    }
    return customerApi.retryCustomer(customer.custId);
  },
  onSuccess: (res) => {
    toast({
      title: "Retry Queued",
      description: res?.statusMessage || "Customer retry initiated."
    });
    // Invalidate and refetch to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    refetch();
  },
  onError: (e: any) => {
    toast({
      title: "Retry failed",
      description: e?.statusMessage || "Failed to retry customer.",
      variant: "destructive"
    });
  },
});

  const handleFormSubmit = (data: any) => {
    if (editingCustomer) {
      updateMutation.mutate({ newData: data, oldData: editingCustomer });
    } else {
      registerMutation.mutate(data);
    }
  };
  const handleView = (customer: Customer) => { setViewCustomer(customer); setShowViewModal(true); };
  const handleEdit = (customer: Customer) => {

    const isAdmin = user?.allAccess === "Y";
    const stage = String(customer.customerStage || "").toUpperCase();

    // Check if user has permission to edit
    if (!isAdmin) {
      // Agent can only edit CAPTURED status
      if (stage !== "CAPTURED") {
        toast({
          title: "Permission Denied",
          description: "You can only edit customers with CAPTURED status.",
          variant: "destructive"
        });
        return;
      }
    }

    setEditingCustomer(customer);
    setShowForm(true);
  };
  const handleOpenApproveReject = (customer: Customer) => { setApproveTarget(customer); setApproveRemarks(""); setApproveReason(""); setApproveDialogOpen(true); };
  const handleReset = () => {
    setUseAdvanced(false);
    setBasicFirstName(""); setBasicLastName(""); setBasicEmail(""); setBasicMobile("");
    setBasicStatus("");
    setAdvFilters([]); setAdvancedApiFilters({});
    setLocationFilters({ country: "", region: "", city: "", district: "", ward: "" });
    setPage(1);
    setTimeout(() => refetch(), 100);
  };
  const locationFilterCount = Object.values(locationFilters).filter(Boolean).length;

  if (showForm || editingCustomer) {
    const mappedDefaults = editingCustomer ? mapCustomerApiToFormData(editingCustomer as any) : undefined;
    const stage = (editingCustomer?.customerStage || "").toUpperCase();
    const isPostApproval = !!editingCustomer && ["APPROVED", "COMPLETED", "RELEASE_TO_CM"].includes(stage);
    return (
      <div className="p-4 sm:p-6">
        <div className="flex justify-between mb-6"><h2 className="text-lg font-semibold">{editingCustomer ? "Edit Customer" : "New Customer Registration"}</h2><Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingCustomer(null); }}>Back to List</Button></div>
        <MultiStepCustomerForm
          onSubmit={handleFormSubmit}
          isLoading={registerMutation.isPending || updateMutation.isPending}
          defaultValues={mappedDefaults}
          isEdit={!!editingCustomer}
          isPostApproval={isPostApproval}
          key={editingCustomer?.custId}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h2 className="text-lg font-semibold text-gray-900">Registered Customers</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />New Customer</Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2"><Button variant={!useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(false)}>Basic</Button><Button variant={useAdvanced ? "secondary" : "outline"} size="sm" onClick={() => setUseAdvanced(true)}><SlidersHorizontal className="h-4 w-4 mr-1" />Advanced</Button></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsLocationModalOpen(true)} className="relative"><MapPin className="h-4 w-4 mr-2" />Location{locationFilterCount > 0 && (<Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{locationFilterCount}</Badge>)}</Button>
            <Button variant="outline" size="sm" onClick={handleReset}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
            <Button size="sm" onClick={() => refetch()}><Search className="h-4 w-4 mr-2" />Search</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </div>
        </div>
        {!useAdvanced && (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 border p-3 rounded-md bg-gray-50">
    <Input 
      uiSize="sm" 
      placeholder="SAP BP ID..." 
      value={basicSapBpId} 
      maxLength={20}
      onChange={(e) => setBasicSapBpId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))} 
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
    <Select value={basicStatus} onValueChange={(value) => {
      setBasicStatus(value === "all" ? "" : value);
    }}>
      <SelectTrigger uiSize="sm" className="bg-white">
        <SelectValue placeholder="Status..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {customerStatusOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
        {useAdvanced && <AdvancedCustomerFilters advFilters={advFilters} setAdvFilters={setAdvFilters} onFilterChange={setAdvancedApiFilters} />}
      </div>

      {isLoading && !data ? (<Card><CardContent className="p-8"><LoadingCard message="Loading customers..." /></CardContent></Card>) : (
        <CustomersDataGrid
          customers={customers}
          isLoading={isLoading}
          total={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onView={handleView}
          onEdit={handleEdit}
          onRetry={(c) => retryMutation.mutate(c)}
          onApproveReject={handleOpenApproveReject}
          retryingId={retryMutation.isPending ? (retryMutation.variables as any)?.custId : null}
          // ✅ Pass the reset password handler here
          onResetPassword={(c) => setResetPasswordCustomer(c)}
        />
      )}
      <CustomerDetailsModal customer={viewCustomer} isOpen={showViewModal} onClose={() => setShowViewModal(false)} onEdit={handleEdit} />
      <LocationFilterModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} initialValues={locationFilters} onApply={(f) => setLocationFilters(f)} />

      {/* Approve/Reject Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Approve or Reject Customer</DialogTitle>
      <DialogDescription>Select an action, choose a reason, and add comments.</DialogDescription>
    </DialogHeader>
    <div className="flex bg-gray-100 p-1 rounded-md my-4">
      <button onClick={() => { setActionType("approve"); setApproveReason(""); }} className={`flex-1 p-2 text-sm font-medium rounded ${actionType === "approve" ? "bg-azam-blue text-white shadow" : "text-gray-600"}`}>Approve</button>
      <button onClick={() => { setActionType("reject"); setApproveReason(""); }} className={`flex-1 p-2 text-sm font-medium rounded ${actionType === "reject" ? "bg-azam-orange text-white shadow" : "text-gray-600"}`}>Reject</button>
    </div>
    <div className="space-y-4">
      {approveTarget && <div>Customer: {`${approveTarget.firstName || ""} ${approveTarget.lastName || ""}`.trim()}</div>}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason <span className="text-red-500">*</span></Label>
        <Select value={approveReason} onValueChange={setApproveReason} disabled={dropdownsLoading}>
          <SelectTrigger id="reason" uiSize="sm"><SelectValue placeholder={dropdownsLoading ? "Loading..." : `Select ${actionType} reason...`} /></SelectTrigger>
          <SelectContent>{(actionType === 'approve' ? approvalReasons : rejectReasons).map((r: any) => <SelectItem key={r.value} value={r.value}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      
      {/* Updated Remarks Section with Validation */}
      <div>
        <Label htmlFor="remarks">
          Comments 
          {actionType === 'reject' && <span className="text-red-500 ml-1">(Required)</span>} 
          {actionType === 'approve' && <span className="text-gray-400 ml-1">(Optional)</span>}
        </Label>
        <Textarea 
          id="remarks" 
          value={approveRemarks} 
          maxLength={200}
          placeholder="Enter comments..."
          onChange={(e) => {
            // Allow alphanumeric, space, dot, comma, dash only
            const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s.,-]/g, "");
            setApproveRemarks(sanitized);
          }} 
        />
        <p className="text-xs text-gray-500 text-right mt-1">
          {approveRemarks.length}/200 (No special characters allowed)
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button size="xs" variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
        <Button size="xs" className={actionType === 'approve' ? 'default' : 'bg-azam-blue hover:bg-red-700'} onClick={() => {
          if (!approveReason) { toast({ title: "Validation Error", description: "Please select a reason.", variant: "destructive" }); return; }
          if (actionType === 'reject' && !approveRemarks.trim()) { toast({ title: "Validation Error", description: "Comments are mandatory for rejection.", variant: "destructive" }); return; }
          (actionType === 'approve' ? approveMutation : rejectMutation).mutate({ target: approveTarget!, remarks: approveRemarks, reason: approveReason });
        }} disabled={rejectMutation.isPending || approveMutation.isPending}>
          {(approveMutation.isPending && actionType === 'approve') || (rejectMutation.isPending && actionType === 'reject') ? <LoadingButton /> : `Submit ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

      {/* ✅ Reset Password Alert Dialog */}
      <AlertDialog open={!!resetPasswordCustomer} onOpenChange={(open) => !open && setResetPasswordCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for <strong>{resetPasswordCustomer?.firstName} {resetPasswordCustomer?.lastName}</strong>?
              <br /><br />
              {resetPasswordCustomer?.email ? (
                <>A new password will be generated and sent to <strong>{resetPasswordCustomer.email}</strong></>
              ) : (
                <span className="text-red-500">⚠️ No email address found for this customer!</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetPasswordCustomer) {
                  resetPasswordMutation.mutate(resetPasswordCustomer); // ✅ Pass the whole customer object
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={resetPasswordMutation.isPending || !resetPasswordCustomer?.email || !resetPasswordCustomer?.userName}
            >
              {resetPasswordMutation.isPending ? "Sending..." : "Send Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
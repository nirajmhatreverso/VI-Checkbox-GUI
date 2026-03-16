import { useState, useRef, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CloudUpload,
  FileText,
  User,
  MapPin,
  Hash,
  Upload,
  Building,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileText as FileTextIcon,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import type { z } from "zod";
import { Agent } from "../agents/agents-data-grid";
import AgentDetailsModal from "../agents/agent-details-modal";
import { trimAllStrings } from "@shared/utils";
import { useCities, useCountries, useDistricts, useRegions, useWards } from "@/hooks/use-center-data";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import SalesOrgDropdown from "../agents/SalesOrgDropdown";
import { useCurrencyByCountry } from "@/hooks/useCurrencyByCountry";
import { AgentApiData, mapApiToFormData } from "@/utils/data-mappers";
import { useAuthContext } from "@/context/AuthProvider";
import ParentAgentSearchModal from "@/components/agents/ParentAgentSearchModal";
import { agentApi } from "@/lib/agentApi";
import { toast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Switch } from "../ui/switch";

export type AgentFormData = z.infer<typeof insertAgentSchema>;

interface AgentApiItem {
  agentName: string;
  country: string;
  region: string;
  city: string;
  district: string;
  ward: string;
  sapBpId: string;
}

interface MultiStepAgentFormProps {
  onSubmit: (data: AgentFormData | FormData) => void;
  isEdit?: boolean;
  isLoading?: boolean;
  defaultValues?: Partial<AgentFormData & Agent>;
  isPostApproval?: boolean;
}

const fileNameFromPath = (p?: string) => {
  if (!p) return "";
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || "";
};



function validateFile(file: File | null, allowedTypes = ["application/pdf", "image/jpeg", "image/png"], maxSizeMB = 5) {
  if (!file) return null;
  if (!allowedTypes.includes(file.type)) throw new Error("Only PDF, JPG, or PNG allowed");
  if (file.size > maxSizeMB * 1024 * 1024) throw new Error(`File cannot exceed ${maxSizeMB}MB`);
  return file;
}

const handleNumericInput = (e: React.FormEvent<HTMLInputElement>) => {
  // Allows numbers and a leading '+' only
  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+]/g, "");
};

const handleAlphaOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z]/g, "");
};

// Only allow numbers (0-9)
const handleNumericOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
};
const handleAlphanumericWithSpaceInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9\s]/g, "");
};

const handleAlphanumericOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9]/g, "");
};
const handleAlphanumericWithDashInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9-]/g, "");
};

//
// NEW HELPERS: detect simple repeating/low-entropy phone patterns
//


const tabs = [
  { id: "general", name: "General Data", icon: User },
  { id: "personal", name: "Personal Details", icon: FileText },
  { id: "address", name: "Address Details", icon: MapPin },
  { id: "tax", name: "Tax Information", icon: Hash },
  { id: "financial", name: "Financial Settings", icon: Banknote },
  { id: "kyc", name: "KYC Documents", icon: Upload },
];

const tabFields: Record<string, (keyof AgentFormData)[]> = {
  general: ["type", "division", "isSubCollection", "parentId"],
  personal: ["salutation", "firstName", "lastName", "email", "mobile", "fax", "gender"],
  address: ["country", "region", "city", "district", "ward", "address1", "address2", "pinCode"],
  tax: ["tinName", "tinNo", "vrnNo"],
  financial: ["currency", "commValue", "salesOrg"],
  kyc: ["kycDocNo", "poaDocNo"],
};

interface SelectOptionsProps<T> {
  isLoading: boolean;
  isError: boolean;
  data?: T[];
  placeholder: string;
  valueKey: keyof T;
  labelKey: keyof T;
}

export function SelectOptions<T>({
  isLoading,
  isError,
  data,
  placeholder,
  valueKey,
  labelKey,
}: SelectOptionsProps<T>) {
  if (isLoading) return <SelectItem value="loading" disabled>Loading...</SelectItem>;
  if (isError) return <SelectItem value="error" disabled>Error loading options</SelectItem>;
  if (!data || data.length === 0) return <SelectItem value="empty" disabled>{placeholder}</SelectItem>;

  return (data as any[]).map((item: any) => {
    const value = String(item[valueKey as string]);
    const label = String(item[labelKey as string]);
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  });
}

function extractCityName(cityValue?: string) {
  if (!cityValue) return "";
  const parts = cityValue.split("_");
  return parts[0] || cityValue;
}

export default function MultiStepAgentForm({ onSubmit, isLoading, isEdit, defaultValues, isPostApproval }: MultiStepAgentFormProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [highestValidatedTabIndex, setHighestValidatedTabIndex] = useState(
    0
  );
  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { user } = useAuthContext();
  const isAdmin = user?.allAccess === "Y";
  const userSapBpId = user?.sapBpId || "";

  const formInitialState: Partial<AgentFormData> = {
    currency: "", type: "", division: "DTH", salutation: "", gender: "", phone: "",
    firstName: "", lastName: "", email: "", mobile: "", fax: "", region: "",
    city: "", district: "", ward: "", address1: "", address2: "", pinCode: "",
    tinNo: "", vrnNo: "", salesOrg: "", kycDocNo: "", poaDocNo: "", parentId: "",
    commValue: 5.00, country: "", isSubCollection: "N",
  };

  const { data: dropdowns, isLoading: dropdownsLoading, isError: dropdownsError } = useOnboardingDropdowns();
  const poaFileInputRef = useRef<HTMLInputElement>(null);
  const poiFileInputRef = useRef<HTMLInputElement>(null);
  const divisionOptions = dropdowns?.division || [];
  const agentTypeOptions = dropdowns?.agentType || [];
  const salutationOptions = dropdowns?.salutationType || [];
  const genderOptions = dropdowns?.genderType || [];

  const {
    register, handleSubmit, setValue, watch, trigger, reset, control,
    formState: { errors },
    clearErrors, setFocus, setError, getValues, getFieldState,
  } = useForm<AgentFormData>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: defaultValues
      ? mapApiToFormData(defaultValues as AgentApiData)
      : formInitialState,
    mode: "onBlur", // Ensure validation triggers on blur
    reValidateMode: "onChange",
    shouldUnregister: false,
  });

  // Add validation rules for firstName and lastName

  useEffect(() => {
    setValue("division", "DTH", { shouldValidate: true });
  }, [setValue]);

  useEffect(() => {
    setValue("isSubCollection", getValues("isSubCollection") || "N");
  }, [setValue, getValues]);


  const parentIdReg = register("parentId");
  const typeRaw = watch("type");
  const requiresParentId = useMemo(() => {
    const normalized = (typeRaw || "").toString().trim().toUpperCase().replace(/[\s-]/g, "_");
    return normalized === "SUB_AGENT" || normalized === "EMPLOYEE";
  }, [typeRaw]);

  const [parentIdStatus, setParentIdStatus] = useState<{ loading: boolean; valid: boolean | null; checked: string | null; }>({ loading: false, valid: null, checked: null });

  const poaDocFile = watch("poaDocFile");
  const poiDocFile = watch("poiDocFile");

  const poaDisplayName =
    (poaDocFile as File | undefined)?.name ||
    (defaultValues as any)?.kycPoaFileName ||
    fileNameFromPath((defaultValues as any)?.poaDocPath);

  const poiDisplayName =
    (poiDocFile as File | undefined)?.name ||
    (defaultValues as any)?.kycPoiFileName ||
    fileNameFromPath((defaultValues as any)?.poiDocPath);


  const verifyParentId = async (pid: string): Promise<boolean> => {
    setParentIdStatus({ loading: true, valid: null, checked: pid });
    if (!user?.salesOrg) {
  throw new Error("Sales organization not found in user context");
}
    try {
      // NEW PAYLOAD: Matches the requirement
      const payload = {
  type: "Agent",
  salesOrg: user.salesOrg, 
  isSubCollection: "N",
  sapBpId: pid
};

      // CALL THE NEW API
      const res = await agentApi.searchUserDetails(payload);

      // CHECK RESPONSE
      // The API returns { status: "SUCCESS", data: { customerDetails: [...] } }
      const isValid =
        res?.status === "SUCCESS" &&
        Array.isArray(res?.data?.customerDetails) &&
        res.data.customerDetails.length > 0;

      setParentIdStatus({ loading: false, valid: isValid, checked: pid });

      if (!isValid) {
        setError("parentId", { message: "Agent not found (Invalid SAP BP ID)" });
      } else {
        clearErrors("parentId");
      }

      return isValid;

    } catch (err: any) {

      setParentIdStatus({ loading: false, valid: false, checked: pid });
      setError("parentId", { message: err.message || "Unable to verify agent" });
      return false;
    }
  };

  const debouncedVerifyParentId = useDebouncedCallback((pid: string) => {
    verifyParentId(pid);
  }, 600);

  const parentIdValue = watch("parentId");
  useEffect(() => {
    if (!parentIdValue || String(parentIdValue).trim() === "") {
      setParentIdStatus({ loading: false, valid: null, checked: null });
      clearErrors("parentId");
    } else {
      setParentIdStatus(prev => ({ ...prev, valid: null, checked: null }));
    }
  }, [parentIdValue]);
  const getCityNameOnly = (val: string) => val ? val.split('_')[0] : val;
  const { data: countries, isLoading: countriesLoading, isError: countriesError } = useCountries();
  const { data: regions, isLoading: regionsLoading, isError: regionsError } = useRegions(watch("country"));
  const { data: cities, isLoading: citiesLoading, isError: citiesError } = useCities(watch("country"), watch("region"));
  const { data: districts, isLoading: districtsLoading, isError: districtsError } = useDistricts(watch("country"), watch("region"), getCityNameOnly(watch("city")));
  const { data: wards, isLoading: wardsLoading, isError: wardsError } = useWards(watch("country"), watch("region"), getCityNameOnly(watch("city")), watch("district"));
  const selectedCountry = watch("country");
  const { data: currencyData, isLoading: currencyLoading } = useCurrencyByCountry(selectedCountry);

  // NEW: Auto-select Tanzania when country options load (only for non-edit forms)
  useEffect(() => {
    if (!countries || countries.length === 0) return;

    const currentVal = getValues("country");
    // Check if current value matches an option in the list
    const existsInList = (countries as any[]).some((c: any) => c.country === currentVal);

    // If a valid country is already selected, don't change it
    if (currentVal && existsInList) return;

    let targetCountry = "";

    // 1. If only one country is available, select it
    if (countries.length === 1) {
      targetCountry = (countries[0] as any).country;
    } else {
      // 2. Try to find "Tanzania"
      const tanzania = (countries as any[]).find((c: any) =>
        String(c.country || "").toLowerCase().includes("tanzania")
      );

      if (tanzania) {
        targetCountry = tanzania.country;
      } else {
        // 3. Fallback: Select the first available country to ensure dropdown isn't blank
        targetCountry = (countries[0] as any).country;
      }
    }

    if (targetCountry) {
      setValue("country", targetCountry, { shouldValidate: true, shouldDirty: !isEdit });
    }
  }, [countries, isEdit, getValues, setValue]);

  const hideSubCollection = useMemo(() => {
    const normalizedType = (watch("type") || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[\s-]/g, "_");
    return normalizedType === "SUB_AGENT" || normalizedType === "EMPLOYEE";
  }, [watch("type")]);

  // Auto-set isSubCollection to "N" when type is Sub-Agent or Employee
  useEffect(() => {
    if (hideSubCollection) {
      setValue("isSubCollection", "N", { shouldValidate: true });
    }
  }, [hideSubCollection, setValue]);

  const handleFinalSubmit = async (data: AgentFormData) => {
    // This is the function called by the final submit button.

    // --- START OF VALIDATION LOGIC (from your original button onClick) ---
    const normalizedType = (data.type || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[\s-]/g, "_");
    const needsParent = normalizedType === "SUB_AGENT" || normalizedType === "EMPLOYEE";
    const pid = (data.parentId || "").trim();

    // NEW: Ensure Address Line 1 is present before final submit
    // if (!data.address1 || data.address1.toString().trim() === "") {
    //   setError("address1", { message: "Address Line 1 is required" });
    //   setActiveTab("address");
    //   requestAnimationFrame(() => setFocus("address1" as any));
    //   return; // Stop submission
    // }

    if (needsParent) {
      if (!pid) {
        setError("parentId", { message: "Parent Agent ID is required for Sub-Agent/Employee" });
        setActiveTab("general");
        requestAnimationFrame(() => setFocus("parentId" as any));
        return; // Stop submission
      }
      const isParentVerified = await verifyParentId(pid);
      if (!isParentVerified) {
        setActiveTab("general");
        requestAnimationFrame(() => setFocus("parentId" as any));
        return; // Stop submission
      }
    }
    // --- END OF VALIDATION LOGIC ---

    // Now, we pass the validated data to the parent component's onSubmit prop.
    // The parent component (`agent-onboarding.tsx`) will be responsible for calling the mutation.
    onSubmit(data);
  };
  useEffect(() => {
    if (currencyData && currencyData.length > 0) {
      const current = getValues("currency");
      // Check if current value exists in the new list
      const isValidSelection = currencyData.some((c: any) => c.currencyCode === current);

      // If no value selected, or the selected value isn't valid for this country
      // Default to the first currency in the list to avoid blank state
      if (!current || !isValidSelection) {
        setValue("currency", currencyData[0].currencyCode);
      }
    }
  }, [currencyData, setValue, getValues]);

  useEffect(() => {
    if (!isEdit) return;
    const cityVal = getValues("city");
    if (!cityVal || cityVal.includes("_")) return;

    const match = (cities ?? []).find(
      (c: any) => c.cityCode === cityVal || c.city === cityVal
    );
    if (match) {
      setValue("city", `${match.city}_${match.cityCode}`, {
        shouldValidate: true,
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [isEdit, cities, getValues, setValue]);

  useEffect(() => {
    if (requiresParentId) {
      if (!isAdmin) {
        // --- LOGIC FOR NON-ADMIN (AGENT) USER ---
        if (userSapBpId) {
          // Set the value from the user's context
          setValue("parentId", userSapBpId, { shouldValidate: true });
          // Immediately set the status to valid to show the green checkmark
          setParentIdStatus({ loading: false, valid: true, checked: userSapBpId });
          clearErrors("parentId");
        } else {
          // Handle case where agent's own ID is missing
          setError("parentId", { message: "Your Parent Agent ID is missing. Please contact admin." });
          setParentIdStatus({ loading: false, valid: false, checked: null });
        }
      }
    } else {
      // If parent ID is no longer required (e.g., user changes type back), clear everything.
      clearErrors("parentId");
      setParentIdStatus({ loading: false, valid: null, checked: null });
    }
    // Note: We remove `verifyParentId` from the dependency array as it's no longer called here.
  }, [requiresParentId, isAdmin, userSapBpId, setValue, setError, clearErrors]);

  useEffect(() => {
    if (requiresParentId) {
      trigger("parentId");
    } else {
      clearErrors("parentId");
    }
  }, [requiresParentId, trigger, clearErrors]);

  // Auto-select gender based on salutation
  const salutationValue = watch("salutation");
  useEffect(() => {
    if (!salutationValue || !salutationOptions.length || !genderOptions.length) return;

    const selectedSalutation = salutationOptions.find((opt: any) => opt.value === salutationValue);
    if (!selectedSalutation) return;

    const title = selectedSalutation.name.trim().toLowerCase().replace('.', '');
    let targetGenderName = "";

    if (title === "mr") {
      targetGenderName = "male";
    } else if (["mrs", "ms", "miss"].includes(title)) {
      targetGenderName = "female";
    }

    if (targetGenderName) {
      const targetGender = genderOptions.find((opt: any) => opt.name.trim().toLowerCase() === targetGenderName);
      if (targetGender) {
        setValue("gender", targetGender.value, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [salutationValue, salutationOptions, genderOptions, setValue]);

  const isGenderFixed = useMemo(() => {
    if (!salutationValue || !salutationOptions.length) return false;

    const selectedSalutation = salutationOptions.find((opt: any) => opt.value === salutationValue);
    if (!selectedSalutation) return false;

    // Normalize the title name (remove dots, lowercase)
    const title = selectedSalutation.name.trim().toLowerCase().replace('.', '');

    // Check if the title is strictly gender-specific
    return ["mr", "mrs", "ms", "miss"].includes(title);
  }, [salutationValue, salutationOptions]);

  const tabIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const isFirstTab = tabIndex === 0;
  const isLastTab = tabIndex === tabs.length - 1;

  const handleTabChange = async (tabId: string) => {
    const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const targetTabIndex = tabs.findIndex((tab) => tab.id === tabId);

    if (targetTabIndex > currentTabIndex && targetTabIndex > highestValidatedTabIndex) {
      const fields = tabFields[activeTab];
      const isValid = await trigger(fields as any);
      if (!isValid) {
        for (const field of fields) {
          if (getFieldState(field).error) {
            setFocus(field as any);
            break;
          }
        }
        return;
      }

      // NEW: Additional guard for Address tab - ensure address1 is not empty
      // if (activeTab === "address") {
      //   const addr = getValues("address1");
      //   if (!addr || addr.toString().trim() === "") {
      //     setError("address1", { message: "Address Line 1 is required" });
      //     setActiveTab("address");
      //     requestAnimationFrame(() => setFocus("address1" as any));
      //     return;
      //   }
      // }
    }
    setActiveTab(tabId);
  };

  const handleNext = async () => {
    setIsNavigating(true);
    try {
      const fieldsToValidate =
        activeTab === "general"
          ? (requiresParentId
            ? ["type", "division", "isSubCollection", "parentId"]
            : ["type", "division", "isSubCollection"])
          : tabFields[activeTab];
      const isValid = await trigger(fieldsToValidate as any, { shouldFocus: true });
      if (!isValid) return;

      // NEW: Ensure Address Line 1 is present when on address tab
      // if (activeTab === "address") {
      //   const addr = getValues("address1");
      //   if (!addr || addr.toString().trim() === "") {
      //     setError("address1", { message: "Address Line 1 is required" });
      //     setFocus("address1" as any);
      //     return;
      //   }
      // }

      if (activeTab === "general" && requiresParentId) {
        const pid = (watch("parentId") || "").trim();
        if (!pid) {
          setError("parentId", { message: "Parent Agent ID is required for Sub-Agent/Employee" });
          setFocus("parentId" as any);
          return;
        }
        const ok = await verifyParentId(pid);
        if (!ok) {
          setFocus("parentId" as any);
          return;
        }
      }

      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        const nextTabIndex = currentIndex + 1;
        setActiveTab(tabs[nextTabIndex].id);
        setHighestValidatedTabIndex((prev) => Math.max(prev, nextTabIndex));
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePrev = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[tabIndex - 1].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeTab !== "kyc" && e.key === "Enter") {
      e.preventDefault();
    }
  };

  const rightIconForParentId = parentIdStatus.loading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : parentIdStatus.valid === true ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : parentIdStatus.valid === false ? <XCircle className="h-4 w-4 text-red-600" /> : undefined;

  const renderTabContent = () => {
    switch (activeTab) {
      case "general": {
        return (
          <div className="space-y-8">
            {isPostApproval && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0"><Info className="h-5 w-5 text-yellow-400" /></div>
                  <div className="ml-3"><p className="text-sm text-yellow-700">This agent is approved. Only specific fields like contact,Email and address can be modified.</p></div>
                </div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Agent Onboarding - SAP BRIM Integration</h3>
              <p className="text-sm text-blue-800">
                Complete the agent onboarding process. After submission, the system will generate an onboarding reference number and initiate SAP Business Partner creation for contract management.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
                {/* Agent Type */}
                <div className="w-full max-w-xs">
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <Label>Agent Type <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={(val) => { setValue("type", val as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); }} disabled={isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1">
                            <SelectValue placeholder="Select Agent Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {agentTypeOptions.map((opt: any) => <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.type && <p className="text-sm text-red-500 mt-1">{(errors.type as any).message}</p>}
                      </div>
                    )}
                  />
                </div>

                {/* Division */}
                <div className="w-full max-w-xs">
                  <div>
                    <Label htmlFor="division">
                      Division <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="division"
                        value="DTH"
                        disabled
                        readOnly
                        className="bg-gray-100 cursor-not-allowed text-gray-600"
                        uiSize="sm"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <span className="text-xs text-gray-400"></span>
                      </div>
                    </div>
                    <input type="hidden" {...register("division")} value="DTH" />
                  </div>
                </div>

                {/* Sub-Collection Allowed - Only show if NOT Sub-Agent or Employee */}
                {!hideSubCollection && (
                  <div className="pt-1">
                    <Controller
                      name="isSubCollection"
                      control={control}
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <Label htmlFor="isSubCollection" className="mb-2">
                            Sub-Collection Allowed
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isSubCollection"
                              checked={field.value === 'Y'}
                              onCheckedChange={(isChecked) => {
                                const newValue = isChecked ? 'Y' : 'N';
                                field.onChange(newValue);
                              }}
                              disabled={isPostApproval}
                            />
                            <span>{field.value === 'Y' ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Parent Agent ID - Renders on its own line when required */}
              {requiresParentId && (
                <div className="w-full max-w-xs pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="parentId">Parent Agent ID <span className="text-red-500">*</span></Label>
                    {isAdmin && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => setShowAgentModal(true)}>
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="ml-1 text-xs text-blue-700">Search</span>
                      </Button>
                    )}
                  </div>

                  <Input
                    id="parentId"
                    {...register("parentId")}
                    placeholder={isAdmin ? "Click search to select Parent..." : "Loading Parent ID..."}
                    readOnly={true}
                    value={watch("parentId") || ""}
                    className={`mt-1 ${isAdmin ? 'bg-gray-50 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'}`}
                    onClick={() => isAdmin && setShowAgentModal(true)}
                    rightIcon={rightIconForParentId}
                  />
                  {errors.parentId && <p className="text-sm text-red-500 mt-1">{(errors.parentId as any).message}</p>}

                  {isAdmin && (
                    <ParentAgentSearchModal
                      isOpen={showAgentModal}
                      onClose={() => setShowAgentModal(false)}
                      onSelect={(agent: AgentApiItem) => {
                        setValue("parentId", agent.sapBpId, { shouldValidate: true, shouldDirty: true });
                        setParentIdStatus({ loading: false, valid: true, checked: agent.sapBpId });
                        clearErrors("parentId");
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
      case "personal": {
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div>
                <Controller
                  name="salutation"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="salutation">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Select value={field.value || ""} onValueChange={(val) => { setValue("salutation", val as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); }} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Title" /></SelectTrigger>
                        <SelectContent>
                          {salutationOptions.map((opt: any) => <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.salutation && <p className="text-sm text-red-500 mt-1">{(errors.salutation as any).message}</p>}
                    </div>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="Enter first name"
                  className="mt-1"
                  disabled={isPostApproval}
                  maxLength={50}
                  onInput={handleAlphaOnlyInput}

                />
                {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Enter last name"
                  className="mt-1"
                  disabled={isPostApproval}
                  maxLength={50}
                  onInput={handleAlphaOnlyInput}

                />
                {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="agent@example.com"
                  className="mt-1"

                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{(errors.email as any).message}</p>}
              </div>
              <div>
                <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">Mobile Number <span className="text-red-500">*</span></Label>
                <Input
                  id="mobile"
                  type="tel"
                  {...register("mobile")}
                  placeholder="xxxx xxx xxx xxx"
                  className="mt-1"
                  maxLength={14}
                  onInput={handleNumericOnlyInput}

                />
                {errors.mobile && <p className="text-sm text-red-500 mt-1">{(errors.mobile as any).message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="xxxx xxx xxx xxx"
                  className="mt-1"
                  maxLength={14}
                  onInput={handleNumericOnlyInput}
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{(errors.phone as any).message}</p>}
              </div>
              <div>
                <Label htmlFor="fax" className="text-sm font-medium text-gray-700">Fax Number</Label>
                <Input id="fax" {...register("fax")} maxLength={10} placeholder="Enter fax number" className="mt-1" disabled={isPostApproval} onInput={handleNumericOnlyInput} />
                {errors.fax && <p className="text-sm text-red-500 mt-1">{(errors.fax as any).message}</p>}
              </div>
              <div>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={(val) => { setValue("gender", val as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); }} disabled={dropdownsLoading || dropdownsError || isPostApproval || isGenderFixed}>
                        <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                        <SelectContent>
                          {genderOptions.map((opt: any) => <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-sm text-red-500 mt-1">{(errors.gender as any).message}</p>}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        );
      }
      case "address": {
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></Label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={(value) => {
                      field.onChange(value);
                      setValue("region", "", { shouldValidate: true });
                      setValue("city", "", { shouldValidate: true });
                      setValue("district", "" as any, { shouldValidate: true });
                      setValue("ward", "" as any, { shouldValidate: true });
                      clearErrors(["region", "city", "district", "ward"]);
                    }} disabled={countriesLoading || isPostApproval}>
                      <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Country" /></SelectTrigger>
                      <SelectContent>
                        <SelectOptions isLoading={countriesLoading} isError={countriesError} data={countries} placeholder="Select Country" valueKey="country" labelKey="country" />
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>}
              </div>
              <div>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="region">Region <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={(value) => {
                        setValue("region", value as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        setValue("city", "" as any, { shouldValidate: true });
                        setValue("district", "" as any, { shouldValidate: true });
                        setValue("ward", "" as any, { shouldValidate: true });
                        clearErrors(["city", "district", "ward"]);
                      }} disabled={!watch("country") || regionsLoading || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1 flex items-center justify-between">
                          {regionsLoading ? <LoadingSpinner size="sm" label="Loading..." /> : <SelectValue placeholder="Select Region" />}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectOptions isLoading={regionsLoading} isError={regionsError} data={regions} placeholder="Select Region" valueKey="region" labelKey="region" />
                        </SelectContent>
                      </Select>
                      {errors.region && <p className="text-sm text-red-500 mt-1">{errors.region.message}</p>}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={(value) => {
                        setValue("city", value as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        setValue("district", "" as any, { shouldValidate: true });
                        setValue("ward", "" as any, { shouldValidate: true });
                        clearErrors(["district", "ward"]);
                      }} disabled={!watch("region") || citiesLoading || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1 flex items-center justify-between">
                          {citiesLoading ? <LoadingSpinner size="sm" label="Loading..." /> : <SelectValue placeholder="Select City" />}
                        </SelectTrigger>
                        <SelectContent>
                          {citiesLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                          {citiesError && <SelectItem value="error" disabled>Error loading options</SelectItem>}
                          {!citiesLoading && !citiesError && (!cities || cities.length === 0) && <SelectItem value="empty" disabled>No cities found</SelectItem>}
                          {cities?.map((city: any) => (
                            <SelectItem
                              key={`${city.city}_${city.cityCode}`}
                              value={`${city.city}_${city.cityCode}`}
                            >
                              {city.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.city && <p className="text-sm text-red-500 mt-1">{(errors.city as any).message}</p>}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="district"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="district" className="text-sm font-medium text-gray-700">District <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={(value) => {
                        setValue("district", value as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        setValue("ward", "" as any, { shouldValidate: true });
                        clearErrors(["ward"]);
                      }} disabled={!watch("city") || districtsLoading || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1 flex items-center justify-between">
                          {districtsLoading ? <LoadingSpinner size="sm" label="Loading..." /> : <SelectValue placeholder="Select District" />}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectOptions isLoading={districtsLoading} isError={districtsError} data={districts} placeholder="Select District" valueKey="district" labelKey="district" />
                        </SelectContent>
                      </Select>
                      {errors.district && <p className="text-sm text-red-500 mt-1">{(errors.district as any).message}</p>}
                    </div>
                  )}
                />
              </div>
              <div>
                <Controller
                  name="ward"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="ward" className="text-sm font-medium text-gray-700">Ward <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={(value) => { setValue("ward", value as any, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); }} disabled={!watch("district") || wardsLoading || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1 flex items-center justify-between">
                          {wardsLoading ? <LoadingSpinner size="sm" label="Loading..." /> : <SelectValue placeholder="Select Ward" />}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectOptions isLoading={wardsLoading} isError={wardsError} data={wards} placeholder="Select Ward" valueKey="ward" labelKey="ward" />
                        </SelectContent>
                      </Select>
                      {errors.ward && <p className="text-sm text-red-500 mt-1">{(errors.ward as any).message}</p>}
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
              <div>
                {/* UPDATED: mark Address Line 1 as required */}
                <Label htmlFor="address1" className="text-sm font-medium text-gray-700">Address Line 1 <span className="text-red-500">*</span></Label>
                <Input
                  id="address1"
                  {...register("address1")}
                  placeholder="Enter primary address, min 5 characters"
                  className="mt-1"
                  maxLength={100}
                  onInput={handleAlphanumericWithSpaceInput}

                />
                {errors.address1 && <p className="text-sm text-red-500 mt-1">{(errors.address1 as any).message}</p>}
              </div>
              <div>
                <Label htmlFor="address2" className="text-sm font-medium text-gray-700">Address Line 2 </Label>
                <Input
                  id="address2"
                  {...register("address2")}
                  placeholder="Enter secondary address"
                  className="mt-1"
                  maxLength={100}
                  onInput={handleAlphanumericWithSpaceInput}

                />
                {errors.address2 && <p className="text-sm text-red-500 mt-1">{(errors.address2 as any).message}</p>}
              </div>
              <div>
                <Label htmlFor="pinCode" className="text-sm font-medium text-gray-700">Postal Code</Label>
                <Input
                  id="pinCode"
                  {...register("pinCode")}
                  placeholder="Enter postal code"
                  className="mt-1"
                  disabled={isPostApproval}
                  maxLength={8}
                  onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '')}
                />
                {errors.pinCode && <p className="text-sm text-red-500 mt-1">{(errors.pinCode as any).message}</p>}
              </div>
            </div>
          </div>
        );
      }
      case "tax": {
        return (
          <div className="space-y-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-amber-900 mb-2">Tax Information</h3>
              <p className="text-sm text-amber-800">
                <strong>TIN Number:</strong> Tax Identification Number is mandatory for agent registration. Non-TIN agents will be tagged as NON-REGISTERED and may have limited functionality.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
  <Label htmlFor="tinName" className="text-sm font-medium text-gray-700">TIN Name</Label>
  <Input
    id="tinName"
    {...register("tinName")}
    placeholder="Enter TIN Name"
    className="mt-1"
    disabled={isPostApproval}
    maxLength={40}
    onInput={handleAlphanumericWithSpaceInput}  // Changed from handleAlphanumericOnlyInput
  />
  {errors.tinName && <p className="text-sm text-red-500 mt-1">{(errors.tinName as any).message}</p>}
</div>
                <div>
  <Label htmlFor="tinNo" className="text-sm font-medium text-gray-700">TIN Number <span className="text-red-500">*</span></Label>
  <Input
    id="tinNo"
    {...register("tinNo")}
    placeholder="Enter inno"
    className="mt-1"
    disabled={isPostApproval}
    maxLength={20}
    onInput={handleAlphanumericWithDashInput}  // Changed from handleAlphanumericOnlyInput
  />
  <p className="text-xs text-gray-500 mt-1">Format: Alphanumeric with dashes (101-895-149)</p>
  {errors.tinNo && <p className="text-sm text-red-500 mt-1">{(errors.tinNo as any).message}</p>}
</div>
                <div>
                  <Label htmlFor="vrnNo" className="text-sm font-medium text-gray-700">VRN Number</Label>
                  <Input
                    id="vrnNo"
                    {...register("vrnNo")}
                    placeholder="e.g., 99123456A"
                    className="mt-1"
                    disabled={isPostApproval}
                    maxLength={20}
                    onInput={handleAlphanumericOnlyInput}
                  />
                  <p className="text-xs text-gray-500 mt-1">VAT Registration Number. Format: Alphanumeric</p>
                  {errors.vrnNo && <p className="text-sm text-red-500 mt-1">{(errors.vrnNo as any).message}</p>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Tax Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>TIN Number is mandatory for all agents</li>
                  <li>TIN Name the registered name of the individual or company</li>
                  <li>VRN Number required for VAT-registered businesses</li>
                  <li>Tax certificates may be required for verification</li>
                  <li>Commission payments will be subject to applicable taxes</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }
      case "financial": {
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                      <Select value={field.value || ""} onValueChange={field.onChange} disabled={currencyLoading || isPostApproval}>
                        <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Currency" /></SelectTrigger>
                        <SelectContent>
                          {currencyLoading && <SelectItem value="" disabled>Loading...</SelectItem>}

                          {/* FIXED: Map over the array */}
                          {!currencyLoading && currencyData && currencyData.length > 0 && (
                            currencyData.map((c: any) => (
                              <SelectItem key={c.currencyCode} value={c.currencyCode}>
                                {c.currencyCode} - {c.currencyName}
                              </SelectItem>
                            ))
                          )}

                          {/* Handle Empty State (Optional) */}
                          {!currencyLoading && (!currencyData || currencyData.length === 0) && (
                            <SelectItem value="" disabled>No currencies found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.currency && <p className="text-sm text-red-500 mt-1">{(errors.currency as any).message}</p>}
                    </div>
                  )}
                />
                <div>
                  <Label htmlFor="commValue" className="text-sm font-medium text-gray-700">Commission Rate (%) <span className="text-red-500">*</span></Label>
                  <Input id="commValue" type="number" step="0.01" min="0" max="100" {...register("commValue")} placeholder="5.00" className="mt-1" disabled={isPostApproval} />
                  <p className="text-xs text-gray-500 mt-1">Default commission rate (can be adjusted per agreement)</p>
                  {errors.commValue && <p className="text-sm text-red-500 mt-1">{(errors.commValue as any).message}</p>}
                </div>
                <div>
                  <SalesOrgDropdown control={control} watch={watch} setValue={setValue} errors={errors} isDisabled={isPostApproval} />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">SAP BRIM Integration</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Business Partner Creation:</strong> Automatic SAP BP creation after approval</p>
                  <p><strong>Contract Account:</strong> System will create Contract Account for billing</p>
                  <p><strong>Role Assignments:</strong> FLCU01 (Customer), FLCU00 (FI Customer), MKK (Contract Partner)</p>
                  <p><strong>Commission Structure:</strong> Configurable rate with default 5%</p>
                  <p><strong>Financial Management:</strong> Payment terms applied to commission processing</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case "kyc": {
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">KYC Document Upload & Approval Process</h3>
              <p className="text-gray-600">Upload required documents for identity verification and SAP Business Partner creation approval</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Controller
                  name="poaDocNo"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="kycDocNoPOA" className="text-sm font-medium text-gray-700">KYC Document Number (POA)</Label>
                      <Input id="kycDocNoPOA" maxLength={15} placeholder="e.g., Utility Bill-12345" className="mt-1" {...field} value={field.value || ""} disabled={isPostApproval} onInput={handleAlphanumericOnlyInput} />
                      <p className="text-xs text-gray-500 mt-1">Official document number from proof of address</p>
                      {errors.poaDocNo && <p className="text-sm text-red-500 mt-1">{(errors.poaDocNo as any).message}</p>}
                    </div>
                  )}
                />
                <Controller
                  name="kycDocNo"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <Label htmlFor="kycDocNoPOI" className="text-sm font-medium text-gray-700">KYC Document Number (POI)</Label>
                      <Input id="kycDocNoPOI" maxLength={15} placeholder="e.g., NIDA-123456789, PP-A12345" className="mt-1" {...field} value={field.value || ""} disabled={isPostApproval} onInput={handleAlphanumericOnlyInput} />
                      <p className="text-xs text-gray-500 mt-1">Official document number from government ID/passport</p>
                      {errors.kycDocNo && <p className="text-sm text-red-500 mt-1">{(errors.kycDocNo as any).message}</p>}
                    </div>
                  )}
                />

              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Document Number Info</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>POI:</strong> National ID, Passport, Driver's License</p>
                  <p><strong>POA:</strong> Utility Bill, Bank Statement, Rental Agreement</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">POA (Proof of Address) Documents</Label>
                  <Card className={`border-2 border-dashed  transition-colors ${isPostApproval ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500 cursor-pointer'}`} onClick={() => !isPostApproval && poaFileInputRef.current?.click()}>
                    <CardContent className="p-6 text-center">
                      <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700 mb-1">Upload POA Documents</p>
                      <p className="text-xs text-gray-500"> PDF, JPG, JPEG only.</p>
                      <input type="file" ref={poaFileInputRef} className="hidden" onChange={(e) => {
                        try {
                          const file = validateFile(e.target.files?.[0] || null);
                          setValue("poaDocFile", file as any, { shouldDirty: true, shouldTouch: true });
                        } catch (err: any) {
                          toast({ title: "Invalid File", description: err.message, variant: "destructive" });
                          e.target.value = "";
                        }
                      }} disabled={isPostApproval} />
                      {(poaDocFile || poaDisplayName) && (
                        <div className="mt-2 text-xs text-green-700">Selected: {poaDisplayName}</div>
                      )}
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); poaFileInputRef.current?.click(); }} disabled={isPostApproval}>Choose File</Button>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">POI (Proof of Identity) Documents</Label>
                  <Card className={`border-2 border-dashed transition-colors ${isPostApproval ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500 cursor-pointer'}`} onClick={() => !isPostApproval && poiFileInputRef.current?.click()}>
                    <CardContent className="p-6 text-center">
                      <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700 mb-1">Upload POI Documents</p>
                      <p className="text-xs text-gray-500"> PDF, JPG, JPEG only</p>
                      <input type="file" ref={poiFileInputRef} className="hidden" onChange={(e) => {
                        try {
                          const file = validateFile(e.target.files?.[0] || null);
                          setValue("poiDocFile", file as any, { shouldDirty: true, shouldTouch: true });
                        } catch (err: any) {
                          toast({ title: "Invalid File", description: err.message, variant: "destructive" });
                          e.target.value = "";
                        }
                      }} disabled={isPostApproval} />
                      {(poiDocFile || poiDisplayName) && (
                        <div className="mt-2 text-xs text-green-700">Selected: {poiDisplayName}</div>
                      )}
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); poiFileInputRef.current?.click(); }} disabled={isPostApproval}>Choose File</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3">Required Documents</h4>
                  <div className="text-sm text-green-800 space-y-2">
                    <p><strong>POA (Proof of Address):</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>â€¢ Utility Bill</li>
                      <li>â€¢ Bank Statement</li>
                      <li>â€¢ Rental Agreement</li>
                    </ul>
                    <p><strong>POI (Proof of Identity):</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>â€¢ National ID (NIDA)</li>
                      <li>â€¢ Passport</li>
                      <li>â€¢ Driver's License</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">Preview Feature</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Before final submission, you can preview your application and all uploaded documents to ensure accuracy.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 font-semibold flex items-center justify-center"
                    onClick={() => {
                      const currentValues = getValues();
                      const agentDataForPreview = {
                        salutation: currentValues.salutation,
                        firstName: currentValues.firstName,
                        lastName: currentValues.lastName,
                        gender: currentValues.gender,
                        mobile: currentValues.mobile,
                        phone: currentValues.phone,
                        fax: currentValues.fax,
                        email: currentValues.email,
                        type: currentValues.type,
                        division: currentValues.division,
                        isSubCollection: currentValues.isSubCollection,
                        country: currentValues.country,
                        region: currentValues.region,
                        city: extractCityName(currentValues.city),
                        district: currentValues.district,
                        ward: currentValues.ward,
                        addressOne: currentValues.address1,
                        addressTwo: currentValues.address2,
                        pincode: currentValues.pinCode,
                        tinNo: currentValues.tinNo,
                        tinName: currentValues.tinName,
                        vrnNo: currentValues.vrnNo,
                        currency: currentValues.currency,
                        commValue: String(currentValues.commValue),
                        salesOrg: currentValues.salesOrg,
                        kycDocNo: currentValues.kycDocNo,
                        poaDocNo: currentValues.poaDocNo,
                        kycPoa: currentValues.poaDocFile as File | null,
                        kycPoi: currentValues.poiDocFile as File | null,
                        kycPoiFileName: (currentValues.poiDocFile as File | null)?.name ||
                          (defaultValues as any)?.kycPoiFileName ||
                          // FIX: Ensure it is treated as a string or empty string
                          fileNameFromPath(String((defaultValues as any)?.poiDocPath || "")) ||
                          "N/A",
                        kycPoaFileName: (currentValues.poaDocFile as File | null)?.name ||
                          (defaultValues as any)?.kycPoaFileName ||
                          // FIX: Ensure it is treated as a string or empty string
                          fileNameFromPath(String((defaultValues as any)?.poaDocPath || "")) ||
                          "N/A",
                        poiDocPath: (defaultValues as any)?.poiDocPath,
                        poaDocPath: (defaultValues as any)?.poaDocPath,
                        parentId: currentValues.parentId || "",
                        createId: user?.username || "N/A",
                        createDt: new Date().toISOString(),
                        agentId: defaultValues?.agentId || 0,
                        onbId: defaultValues?.onbId || "PREVIEW",
                        status: "Draft",
                        agentStage: "PENDING",
                      };
                      setPreviewAgent(agentDataForPreview as Agent);
                      setShowPreviewModal(true);
                    }}
                  >
                    <FileTextIcon className="h-4 w-4 mr-2" />
                    Preview Application
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5" style={{ color: "#000" }} />
              <span className="text-sm font-medium" style={{ color: "#000" }}>Agent Registration:</span>
              <span className="text-sm" style={{ color: "#000" }}>{tabs.find(t => t.id === activeTab)?.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs" style={{ borderColor: "#000", color: "#FF8200" }}>Status: Draft</Badge>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFinalSubmit)} onKeyDown={handleKeyDown}>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="border-b border-gray-200 bg-gray-50 w-full">
                <div className="overflow-x-auto">
                  <TabsList className="min-w-max">
                    {tabs.map((tab, index) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-azam-orange data-[state=active]:text-white" disabled={index > highestValidatedTabIndex}>
                          {Icon && <Icon className="h-4 w-4 md:mr-2" />}
                          <span className="hidden md:inline">{tab.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="p-6 m-0">
                  {activeTab === tab.id ? renderTabContent() : null}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between items-center bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex space-x-3">
            <Button type="button" variant="outline" size="sm" onClick={handlePrev} disabled={isFirstTab} aria-label="Previous step">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          </div>
          <div className="flex space-x-3">
            {!isLastTab ? (
              <Button type="button" size="sm" variant="secondary" onClick={handleNext} disabled={isNavigating} aria-label="Next step">
                {isNavigating ? (
                  <> <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing... </>
                ) : (
                  <> Next <ChevronRight className="h-4 w-4 ml-1" /> </>
                )}
              </Button>
            ) : (
              <Button type="button"
                onClick={handleSubmit(handleFinalSubmit)}
                disabled={isLoading}>
                {isLoading ? "Processing..." : isEdit ? "Update Agent" : "Submit for SAP BP Creation"}
              </Button>
            )}
          </div>
        </div>
      </form>
      <AgentDetailsModal agent={previewAgent} isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} />
    </div>
  );
}
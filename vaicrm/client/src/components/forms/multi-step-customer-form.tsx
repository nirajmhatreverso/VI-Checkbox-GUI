// mullti-step-customer-form.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertCustomer, insertCustomerSchema, type Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  MapPin,
  Settings,
  Banknote,
  Upload,
  FileText,
  Building,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  CalendarIcon,
  Plus,
  Minus
} from "lucide-react";
import type { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  useCountries,
  useRegions,
  useCities,
  useDistricts,
  useWards,
} from "@/hooks/use-center-data";
import { useOnboardingDropdowns } from "@/hooks/useOnboardingDropdowns";
import { useValidateCustomerMobile } from "@/hooks/useValidateCustomerMobile";
import CustomerDetailsModal from "@/components/customers/customer-details-modal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { agentApi } from "@/lib/agentApi";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import ParentAgentSearchModal, { type AgentApiItem } from "@/components/agents/ParentAgentSearchModal";
import CustomerSearchModal from "@/components/customers/CustomerSearchModal";
import { useCurrencyByCountry } from "@/hooks/useCurrencyByCountry";
import { useAuthContext } from "@/context/AuthProvider";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

// helper for select options
export function SelectOptions<T>({
  isLoading,
  isError,
  data,
  placeholder,
  valueKey,
  labelKey,
}: {
  isLoading: boolean;
  isError: boolean;
  data?: T[];
  placeholder: string;
  valueKey: keyof T;
  labelKey: keyof T;
}) {
  if (isLoading) return <SelectItem value="loading" disabled>Loading...</SelectItem>;
  if (isError) return <SelectItem value="error" disabled>Error loading options</SelectItem>;
  if (!data || data.length === 0) return <SelectItem value="empty" disabled>{placeholder}</SelectItem>;

  return data.map((item: any) => {
    const value = String(item[valueKey]);
    const label = String(item[labelKey]);
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  });
}

// filename helper for KYC paths
const fileNameFromPath = (p?: string | null) => {
  if (!p) return "";
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1] || "";
};

function validateFile(file: File | null, allowedTypes = ["application/pdf", "image/jpeg", "image/png"], maxSizeMB = 5) {
  if (!file) return null;
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PDF, JPG, or PNG files are allowed");
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size cannot exceed ${maxSizeMB}MB`);
  }
  return file;
}

// Validation Helper for Names (kept for UI feedback, but Schema handles strict validation)
const validateNameField = (val: string, label: string) => {
  if (!val) return null;
  if (val.trim() !== val) return `${label} cannot start or end with spaces`;
  if (val.includes(" ")) return `${label} cannot contain spaces between letters`;
  if (/[-']{2,}/.test(val)) return `${label} cannot contain consecutive hyphens or apostrophes`;
  // FIX: Corrected regex check logic here
  if (!/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(val)) return `${label} contains invalid characters`;
  return null;
};

export default function MultiStepCustomerForm({
  onSubmit,
  isLoading,
  defaultValues,
  isEdit,
  isPostApproval,
}: {
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<CustomerFormData>;
  isEdit?: boolean;
  isPostApproval?: boolean;
}) {
  const { user } = useAuthContext();
  const isAgent = user?.allAccess === "N";
  const isOTC = user?.isOtc === "Y";
  const loggedInAgentBpId = user?.sapBpId || user?.parentSapBpId || "";
  const [activeTab, setActiveTab] = useState("general");
  const [showPreview, setShowPreview] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | any>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [agentIdStatus, setAgentIdStatus] = useState<{ loading: boolean; valid: boolean | null; checked: string | null; }>({ loading: false, valid: null, checked: null });
  const [parentIdStatus, setParentIdStatus] = useState<{ loading: boolean; valid: boolean | null; checked: string | null; }>({ loading: false, valid: null, checked: null });
  const [isDobOpen, setIsDobOpen] = useState(false);
  const [isGenderAutoSelected, setIsGenderAutoSelected] = useState(false);
  const poaFileInputRef = useRef<HTMLInputElement>(null);
  const poiFileInputRef = useRef<HTMLInputElement>(null);
  const { data: dropdowns, isLoading: dropdownsLoading, isError: dropdownsError } = useOnboardingDropdowns();

  const customerTypeOptions = dropdowns?.customerType || [];
  const customerStatusOptions = dropdowns?.customerStatus || [];
  const divisionDropdown = dropdowns?.division || [];
  const accountClassOptions = dropdowns?.accountClass || [];
  const salutationOptions = dropdowns?.salutationType || [];
  const genderOptions = dropdowns?.genderType || [];
  const salesOrgOptions = dropdowns?.salesOrg || [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    setFocus,
    setError,
    clearErrors,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      customerType: "Individual",
      addressType: "Installation",
      accountClass: "",
      newOrExisting: "",
      salesOrg: "",
      division: "",
      title: "",
      gender: "",
      race: "",
      countryInst: "Tanzania",
      regionInst: "",
      cityInst: "",
      districtInst: "",
      wardInst: "",
      billingCountry: "Tanzania",
      billingRegion: "",
      billingCity: "",
      billingDistrict: "",
      billingWard: "",
      currency: "",
      smsFlag: true,
      sameAsInstallation: false,
      azamPayId: "",
      azamMaxTvId: "",
      ctinNumber: "",
      cvrnNumber: "",
      agentSapBpId: "",
      parentSapBpId: "",
      ...defaultValues,
    },
    mode: "onChange",
  });

  const isAnEditableFieldDirty = useMemo(() => {
    if (!isPostApproval) return true;
    const editableFields: (keyof CustomerFormData)[] = ['phone', 'mobile', 'email', 'address1Inst', 'address2Inst'];
    const dirtyFieldKeys = Object.keys(dirtyFields);
    return dirtyFieldKeys.some(field => editableFields.includes(field as keyof CustomerFormData));
  }, [dirtyFields, isPostApproval, isDirty]);

  const newOrExisting = watch("newOrExisting");
  const selectedCustomerStatus = useMemo(() => {
    return (customerStatusOptions || []).find(opt => opt.name === newOrExisting);
  }, [newOrExisting, customerStatusOptions]);

  const handleAlphaOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z]/g, "");
  };

  // Only allow numbers (0-9)
  const handleNumericOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
  };

  // Only allow letters and spaces (for org name)
  const handleAlphaWithSpaceInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s]/g, "");
  };

  // Only allow letters, numbers, and spaces (for addresses)
  const handleAlphanumericWithDashInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9-]/g, "");
};

// Allow alphanumeric and spaces (for TIN Name)
const handleAlphanumericWithSpaceInput = (e: React.FormEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9\s]/g, "");
};

  // Only allow letters and numbers (no spaces, no special characters)
  const handleAlphanumericOnlyInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9]/g, "");
  };


  const validateAgentId = async (id: string): Promise<boolean> => {
    if (!id) {
      setAgentIdStatus({ loading: false, valid: null, checked: null });
      clearErrors("agentSapBpId");
      return true;
    }
    setAgentIdStatus({ loading: true, valid: null, checked: id });

    try {
      const payload = {
        type: "Agent",
        salesOrg: user?.salesOrg || "TZ10",
        isSubCollection: "N",
        sapBpId: id
      };
      const res = await agentApi.searchUserDetails(payload);
      const isValid = res?.status === "SUCCESS" && Array.isArray(res?.data?.customerDetails) && res.data.customerDetails.length > 0;
      setAgentIdStatus({ loading: false, valid: isValid, checked: id });

      if (!isValid) {
        setError("agentSapBpId", { message: "Agent not found" });
      } else {
        clearErrors("agentSapBpId");
      }
      return isValid;
    } catch {
      setAgentIdStatus({ loading: false, valid: false, checked: id });
      setError("agentSapBpId", { message: "Unable to verify agent" });
      return false;
    }
  };

  const debouncedValidateAgentId = useDebouncedCallback(validateAgentId, 600);
  const agentIdValue = watch("agentSapBpId");
  useEffect(() => {
    if (agentIdValue !== agentIdStatus.checked) {
      setAgentIdStatus((prev) => ({ ...prev, valid: null }));
    }
  }, [agentIdValue, agentIdStatus.checked]);

  const validateParentSapBpId = async (id: string): Promise<boolean> => {
    const input = (id || "").trim();
    if (!input) {
      setParentIdStatus({ loading: false, valid: null, checked: null });
      if ((selectedCustomerStatus?.name || "").toLowerCase().includes("existing")) {
        setError("parentSapBpId", { message: "Parent Customer SAP BP ID is required" });
      } else {
        clearErrors("parentSapBpId");
      }
      return false;
    }

    setParentIdStatus({ loading: true, valid: null, checked: input });
    try {
      const payload = {
        type: "Customer",
        isSubCollection: "Y",
        salesOrg: user?.salesOrg || "TZ10",
        sapBpId: input
      };
      const res = await agentApi.searchUserDetails(payload);
      const isValid = res?.status === "SUCCESS" && Array.isArray(res?.data?.customerDetails) && res.data.customerDetails.length > 0;
      setParentIdStatus({ loading: false, valid: isValid, checked: input });

      if (!isValid) {
        setError("parentSapBpId", { message: "Parent customer not found" });
        return false;
      }
      clearErrors("parentSapBpId");
      return true;
    } catch (e) {
      setParentIdStatus({ loading: false, valid: false, checked: input });
      setError("parentSapBpId", { message: "Unable to verify parent customer" });
      return false;
    }
  };

  useEffect(() => {
    if (!(selectedCustomerStatus?.name || "").toLowerCase().includes("existing")) {
      setValue("parentSapBpId", "", { shouldDirty: true, shouldValidate: true });
      setParentIdStatus({ loading: false, valid: null, checked: null });
      clearErrors("parentSapBpId");
    }
  }, [selectedCustomerStatus, setValue, clearErrors]);

  useEffect(() => {
    if (isAgent && loggedInAgentBpId && !isOTC) {
      // Set the value
      setValue("agentSapBpId", loggedInAgentBpId, { shouldValidate: true });
      // Clear any potential errors
      clearErrors("agentSapBpId");
      // Optional: Manually trigger your validation function if needed
      // validateAgentId(loggedInAgentBpId); 
    }
  }, [isAgent, isOTC, loggedInAgentBpId, setValue, clearErrors]);

  const titleValue = watch("title");
  useEffect(() => {
    if (!titleValue || !salutationOptions.length || !genderOptions.length) {
      setIsGenderAutoSelected(false);
      return;
    }
    const selectedSalutation = salutationOptions.find((opt: any) => opt.value === titleValue);
    if (!selectedSalutation) {
      setIsGenderAutoSelected(false);
      return;
    }
    const titleName = selectedSalutation.name.trim().toLowerCase().replace('.', '');
    let targetGenderName = "";
    if (titleName === "mr") {
      targetGenderName = "male";
    } else if (["mrs", "ms", "miss"].includes(titleName)) {
      targetGenderName = "female";
    }
    if (targetGenderName) {
      const targetGender = genderOptions.find((opt: any) => opt.name.trim().toLowerCase() === targetGenderName);
      if (targetGender) {
        setValue("gender", targetGender.value, { shouldValidate: true, shouldDirty: true });
        setIsGenderAutoSelected(true);
      }
    } else {
      setIsGenderAutoSelected(false);
    }
  }, [titleValue, salutationOptions, genderOptions, setValue]);

  const accountClass = watch("accountClass");
  const isHotel = (accountClass || "").toLowerCase().includes("hotel");

  useEffect(() => {
    if (!isHotel) {
      setValue("noOfRooms", "", { shouldDirty: true, shouldValidate: true });
      clearErrors("noOfRooms");
    }
  }, [isHotel, setValue, clearErrors]);



  const generalFieldsBase: Array<keyof InsertCustomer> = ["customerType", "newOrExisting", "accountClass", "division", "smsFlag", "agentSapBpId"];
  let generalFields = (selectedCustomerStatus?.name || "").toLowerCase().includes("existing") ? ([...generalFieldsBase, "parentSapBpId"] as Array<keyof InsertCustomer>) : generalFieldsBase;
  if (isHotel) {
    generalFields = [...generalFields, "noOfRooms"] as Array<keyof InsertCustomer>;
  }

  const handleTabChange = async (tabId: string) => {
    const order = ["general", "personal", "address", "service", "financial", "kyc"];
    const currentIdx = order.findIndex((t) => t === activeTab);
    const targetIdx = order.findIndex((t) => t === tabId);

    if (targetIdx > currentIdx) {
      for (let i = currentIdx; i < targetIdx; i++) {
        const tabToValidate = order[i];
        const fieldsToValidateMap: Record<string, Array<keyof InsertCustomer>> = {
          general: generalFields,
          personal: ["title", "firstName", "email", "altEmail", "fax", "orgName", "lastName", "gender", "race", "phone", "mobile", "dateOfBirth", "altPhone", "middleName"],
          address: ["countryInst", "regionInst", "cityInst", "districtInst", "wardInst", "address1Inst", "address2Inst", "postalCodeInst", "addressType", "sameAsInstallation", "billingCountry", "billingRegion", "billingCity", "billingDistrict", "billingWard", "billingPostalCode", "billingAddress1", "billingAddress2"],
          service: ["salesOrg", "azamPayId", "azamMaxTvId"],
          financial: ["currency", "tinName", "ctinNumber", "cvrnNumber"],
          kyc: ["kycDocNoPOI", "kycDocNoPOA"],
        };
        const fieldsToValidate = fieldsToValidateMap[tabToValidate] || [];
        const isSchemaValid = await trigger(fieldsToValidate as any);

        if (!isSchemaValid) {
          setActiveTab(tabToValidate);
          for (const field of fieldsToValidate) {
            if (errors[field as keyof CustomerFormData]) {
              setFocus(field as keyof CustomerFormData);
              break;
            }
          }
          return;
        }

        if (tabToValidate === "general" && (selectedCustomerStatus?.name || "").toLowerCase().includes("existing")) {
          const parentId = getValues("parentSapBpId");
          if (!parentId || parentIdStatus.valid !== true) {
            setActiveTab(tabToValidate);
            setError("parentSapBpId", { message: "Parent customer must be verified" });
            setFocus("parentSapBpId");
            toast({ title: "Validation Error", description: "Please enter and verify the Parent Customer SAP BP ID.", variant: "destructive" });
            return;
          }
        }
      }
    }
    setActiveTab(tabId);
  };

  const handleNext = async () => {
    const map: Record<string, Array<keyof InsertCustomer>> = {
      general: generalFields,
      personal: ["title", "firstName", "email", "altEmail", "fax", "orgName", "lastName", "gender", "race", "phone", "mobile", "dateOfBirth", "altPhone", "middleName"],
      address: ["countryInst", "regionInst", "cityInst", "districtInst", "wardInst", "address1Inst", "address2Inst", "postalCodeInst", "addressType", "sameAsInstallation", "billingCountry", "billingRegion", "billingCity", "billingDistrict", "billingWard", "billingPostalCode", "billingAddress1", "billingAddress2"],
      service: ["salesOrg", "azamPayId", "azamMaxTvId"],
      financial: ["currency", "tinName", "ctinNumber", "cvrnNumber"],
      kyc: ["kycDocNoPOI", "kycDocNoPOA"],
    };
    const fieldsToValidate = map[activeTab] || [];
    const isSchemaValid = await trigger(fieldsToValidate as any);

    if (!isSchemaValid) {
      for (const field of fieldsToValidate) {
        if (errors[field as keyof CustomerFormData]) {
          setFocus(field as keyof CustomerFormData);
          break;
        }
      }
      return;
    }

    if (activeTab === "general" && (selectedCustomerStatus?.name || "").toLowerCase().includes("existing")) {
      const parentId = getValues("parentSapBpId");
      if (!parentId?.trim()) {
        setError("parentSapBpId", { message: "Parent Customer SAP BP ID is required" });
        setFocus("parentSapBpId");
        toast({ title: "Validation Error", description: "Please enter the Parent Customer SAP BP ID.", variant: "destructive" });
        return;
      }

      if (parentIdStatus.valid !== true) {
        setError("parentSapBpId", { message: "Parent customer must be verified" });
        setFocus("parentSapBpId");
        toast({ title: "Validation Error", description: "Please verify the Parent Customer SAP BP ID.", variant: "destructive" });
        return;
      }

    }
    const agentId = getValues("agentSapBpId");
    if (!agentId?.trim()) {
      setError("agentSapBpId", { message: "Agent SAP BP ID is required" });
      setFocus("agentSapBpId");
      return;
    }
    const isAgentValid = await validateAgentId(agentId);
    if (!isAgentValid) {
      setFocus("agentSapBpId");
      return;
    }

    const order = ["general", "personal", "address", "service", "financial", "kyc"];
    const idx = order.findIndex((t) => t === activeTab);
    if (idx < order.length - 1) {
      setActiveTab(order[idx + 1]);
    }
  };

  const handlePrevious = () => {
    const order = ["general", "personal", "address", "service", "financial", "kyc"];
    const idx = order.findIndex((t) => t === activeTab);
    if (idx > 0) {
      setActiveTab(order[idx - 1]);
    }
  };

  const handleFormSubmit = (data: CustomerFormData) => onSubmit(data);
  const mobileRaw = watch("mobile");
  const { data: mobileCheck, debouncedMobile } = useValidateCustomerMobile(mobileRaw);
  const lastPromptedMobileRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mobileCheck || !debouncedMobile) return;
    if (mobileCheck.status === "SUCCESS") {
      if (lastPromptedMobileRef.current === debouncedMobile) return;
      const msg = mobileCheck?.data?.message || mobileCheck?.statusMessage || "Mobile number already exists";
      toast({ title: "Duplicate mobile", description: msg, variant: "destructive" });
      lastPromptedMobileRef.current = debouncedMobile;
    }
  }, [mobileCheck, debouncedMobile]);

  useEffect(() => {
    const normalize = (s?: string) => (s || "").toString().replace(/\D/g, "");
    const p = normalize(watch("phone"));
    const m = normalize(watch("mobile"));
    const a = normalize(watch("altPhone"));

    const clearUniqueIfMatches = (field: keyof CustomerFormData) => {
      const err = (errors as any)[field];
      if (err && typeof err.message === "string" && err.message.includes("must be unique")) {
        clearErrors(field);
      }
    };

    clearUniqueIfMatches("phone");
    clearUniqueIfMatches("mobile");
    clearUniqueIfMatches("altPhone");

    if (p && m && p === m) {
      setError("phone", { type: "manual", message: "Phone and Mobile must be unique" });
      setError("mobile", { type: "manual", message: "Phone and Mobile must be unique" });
    }
    if (a) {
      if (p && p === a) {
        setError("phone", { type: "manual", message: "Phone and Alternative Phone must be unique" });
        setError("altPhone", { type: "manual", message: "Phone and Alternative Phone must be unique" });
      }
      if (m && m === a) {
        setError("mobile", { type: "manual", message: "Mobile and Alternative Phone must be unique" });
        setError("altPhone", { type: "manual", message: "Mobile and Alternative Phone must be unique" });
      }
    }
  }, [watch("phone"), watch("mobile"), watch("altPhone")]);

  useEffect(() => {
    const normalize = (s?: string) => (s || "").toString().trim().toLowerCase();
    const e = normalize(watch("email"));
    const a = normalize(watch("altEmail"));

    const clearUniqueIfMatchesEmail = (field: keyof CustomerFormData) => {
      const err = (errors as any)[field];
      if (err && typeof err.message === "string" && err.message.includes("must be unique")) {
        clearErrors(field);
      }
    };

    clearUniqueIfMatchesEmail("email");
    clearUniqueIfMatchesEmail("altEmail");

    if (e && a && e === a) {
      setError("email", { type: "manual", message: "Email and Alternative Email must be unique" });
      setError("altEmail", { type: "manual", message: "Email and Alternative Email must be unique" });
    }
  }, [watch("email"), watch("altEmail")]);

  const selectedCountry = watch("countryInst");
  const { data: currencyData, isLoading: isCurrencyLoading } = useCurrencyByCountry(selectedCountry);

  // FIXED: Handle currencyData as an Array
  useEffect(() => {
    if (currencyData && currencyData.length > 0) {
      const current = getValues("currency");
      // Check if current value exists in the new list
      const isValidSelection = currencyData.some((c: any) => c.currencyCode === current);

      // If no value selected, or the selected value isn't valid for this country
      // Default to the first currency in the list to avoid blank state
      if (!current || !isValidSelection) {
        setValue("currency", currencyData[0].currencyCode, {
          shouldValidate: true,
          shouldDirty: true
        });
      }
    }
  }, [currencyData, setValue, getValues]);
  const filteredSalesOrg = useMemo(() => {
    if (!selectedCountry) return salesOrgOptions || [];
    return (salesOrgOptions || []).filter((org: any) => org.country === selectedCountry);
  }, [salesOrgOptions, selectedCountry]);

  useEffect(() => {
    if (!filteredSalesOrg || filteredSalesOrg.length === 0) return;

    const currentVal = getValues("salesOrg");
    const existsInList = filteredSalesOrg.some((org: any) => org.value === currentVal);

    // 1. If there is exactly one record, select it immediately
    if (filteredSalesOrg.length === 1) {
      if (currentVal !== filteredSalesOrg[0].value) {
        setValue("salesOrg", filteredSalesOrg[0].value, { shouldValidate: true, shouldDirty: false });
      }
      return;
    }

    // 2. If multiple records exist but nothing valid is selected, try to find "Azam Media Ltd"
    if (!currentVal || !existsInList) {
      const match = filteredSalesOrg.find((org: any) =>
        String(org.name || "").trim().toLowerCase() === "azam media ltd"
      );

      const target = match ? match.value : filteredSalesOrg[0].value;

      if (currentVal !== target) {
        setValue("salesOrg", target, { shouldValidate: true, shouldDirty: false });
      }
    }
  }, [filteredSalesOrg, getValues, setValue]);

  const instCountry = watch("countryInst");
  const instRegion = watch("regionInst");
  const instCity = watch("cityInst");
  const instDistrict = watch("districtInst");
  const billCountry = watch("billingCountry");
  const billRegion = watch("billingRegion");
  const billCity = watch("billingCity");
  const billDistrict = watch("billingDistrict");
  const sameAsInstallation = watch("sameAsInstallation");
  const instWard = watch("wardInst");
  const instAddr1 = watch("address1Inst");
  const instAddr2 = watch("address2Inst");
  const instPostal = watch("postalCodeInst");

  // Updated extractCityName to handle any input safely
  const extractCityName = (combined?: any) => {
    if (!combined || typeof combined !== 'string') return "";
    const [name] = combined.split("_");
    return name || combined;
  };

  const { data: instCountries, isLoading: instCountriesLoading, isError: instCountriesError } = useCountries();
  useEffect(() => {
    if (!instCountries || instCountries.length === 0) return;

    const currentVal = getValues("countryInst");
    // Check if the current value (e.g. default "Tanzania") actually exists in the loaded list
    const existsInList = instCountries.some((c: any) => c.country === currentVal);

    // If there is only one country option, force select it.
    // OR if the current value is not in the list (invalid default), select the first valid one.
    if (instCountries.length === 1 || !existsInList) {
      // Priority: 1. Single Item, 2. "Tanzania" if available, 3. First item
      let target = instCountries[0].country;

      if (instCountries.length > 1) {
        const tanzania = instCountries.find((c: any) => c.country === "Tanzania");
        if (tanzania) target = tanzania.country;
      }

      // Only update if different to avoid infinite loops
      if (currentVal !== target) {
        setValue("countryInst", target, { shouldValidate: true, shouldDirty: false });
      }
    }
  }, [instCountries, getValues, setValue]);
  const { data: instRegions, isLoading: instRegionsLoading, isError: instRegionsError } = useRegions(instCountry);
  const { data: instCities, isLoading: instCitiesLoading, isError: instCitiesError } = useCities(instCountry, instRegion);
  const { data: instDistricts, isLoading: instDistrictsLoading, isError: instDistrictsError } = useDistricts(instCountry, instRegion, extractCityName(instCity));
  const { data: instWards, isLoading: instWardsLoading, isError: instWardsError } = useWards(instCountry, instRegion, extractCityName(instCity), instDistrict);
  const { data: billCountries, isLoading: billCountriesLoading, isError: billCountriesError } = useCountries();
  const { data: billRegions, isLoading: billRegionsLoading, isError: billRegionsError } = useRegions(billCountry);
  const { data: billCities, isLoading: billCitiesLoading, isError: billCitiesError } = useCities(billCountry, billRegion);
  const { data: billDistricts, isLoading: billDistrictsLoading, isError: billDistrictsError } = useDistricts(billCountry, billRegion, extractCityName(billCity));
  const { data: billWards, isLoading: billWardsLoading, isError: billWardsError } = useWards(billCountry, billRegion, extractCityName(billCity), billDistrict);

  useEffect(() => {
    if (!instCities || instCities.length === 0) return;

    const currentCityValue = getValues("cityInst");

    // Check if we need to smart match (marked with __MATCH__ prefix)
    if (currentCityValue?.startsWith("__MATCH__")) {
      const cityNameToFind = currentCityValue.replace("__MATCH__", "").toLowerCase().trim();

      // Find matching city in dropdown options
      const matchedCity = instCities.find((city: any) =>
        String(city.city || "").toLowerCase().trim() === cityNameToFind
      );

      if (matchedCity) {
        const correctValue = `${matchedCity.city}_${matchedCity.cityCode}`;
        setValue("cityInst", correctValue, { shouldValidate: false, shouldDirty: false });
      } else {
        // City not found in dropdown - clear it
        setValue("cityInst", "", { shouldValidate: false, shouldDirty: false });
      }
      return;
    }

    // Also handle case where value exists but doesn't match any dropdown option
    if (currentCityValue && !currentCityValue.startsWith("__MATCH__")) {
      const existsInList = instCities.some((city: any) =>
        `${city.city}_${city.cityCode}` === currentCityValue
      );

      if (!existsInList) {
        // Try to match by name
        const extractedName = currentCityValue.split("_")[0]?.toLowerCase().trim();
        const matchedCity = instCities.find((city: any) =>
          String(city.city || "").toLowerCase().trim() === extractedName
        );

        if (matchedCity) {
          const correctValue = `${matchedCity.city}_${matchedCity.cityCode}`;
          setValue("cityInst", correctValue, { shouldValidate: false, shouldDirty: false });
        }
      }
    }
  }, [instCities, getValues, setValue]);

  // ✅ NEW: Smart match Billing City when cities load
  useEffect(() => {
    if (sameAsInstallation) return; // Skip if syncing from installation
    if (!billCities || billCities.length === 0) return;

    const currentCityValue = getValues("billingCity");

    // Check if we need to smart match (marked with __MATCH__ prefix)
    if (currentCityValue?.startsWith("__MATCH__")) {
      const cityNameToFind = currentCityValue.replace("__MATCH__", "").toLowerCase().trim();

      // Find matching city in dropdown options
      const matchedCity = billCities.find((city: any) =>
        String(city.city || "").toLowerCase().trim() === cityNameToFind
      );

      if (matchedCity) {
        const correctValue = `${matchedCity.city}_${matchedCity.cityCode}`;
        setValue("billingCity", correctValue, { shouldValidate: false, shouldDirty: false });
      } else {
        setValue("billingCity", "", { shouldValidate: false, shouldDirty: false });
      }
      return;
    }

    // Handle existing value that doesn't match dropdown options
    if (currentCityValue && !currentCityValue.startsWith("__MATCH__")) {
      const existsInList = billCities.some((city: any) =>
        `${city.city}_${city.cityCode}` === currentCityValue
      );

      if (!existsInList) {
        const extractedName = currentCityValue.split("_")[0]?.toLowerCase().trim();
        const matchedCity = billCities.find((city: any) =>
          String(city.city || "").toLowerCase().trim() === extractedName
        );

        if (matchedCity) {
          const correctValue = `${matchedCity.city}_${matchedCity.cityCode}`;
          setValue("billingCity", correctValue, { shouldValidate: false, shouldDirty: false });
        }
      }
    }
  }, [billCities, sameAsInstallation, getValues, setValue]);

  useEffect(() => {
    if (sameAsInstallation) return;
    if (!billDistricts || billDistricts.length === 0) return;

    const currentVal = getValues("billingDistrict");
    if (!currentVal) return;

    const exists = billDistricts.some((d: any) => d.district === currentVal);
    if (!exists) {
      // Try to find case-insensitive match
      const match = billDistricts.find((d: any) =>
        d.district.trim().toLowerCase() === currentVal.trim().toLowerCase()
      );
      if (match) {
        setValue("billingDistrict", match.district, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [billDistricts, sameAsInstallation, getValues, setValue]);

  useEffect(() => {
    if (sameAsInstallation) return;
    if (!billWards || billWards.length === 0) return;

    const currentVal = getValues("billingWard");
    if (!currentVal) return;

    const exists = billWards.some((w: any) => w.ward === currentVal);
    if (!exists) {
      // Try to find case-insensitive match
      const match = billWards.find((w: any) =>
        w.ward.trim().toLowerCase() === currentVal.trim().toLowerCase()
      );
      if (match) {
        setValue("billingWard", match.ward, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [billWards, sameAsInstallation, getValues, setValue]);

  useEffect(() => {
    if (sameAsInstallation) return; // Skip if syncing from Installation
    if (!billCountries || billCountries.length === 0) return;

    const currentVal = getValues("billingCountry");
    const existsInList = billCountries.some((c: any) => c.country === currentVal);

    // If only 1 country exists, select it
    if (billCountries.length === 1) {
      if (currentVal !== billCountries[0].country) {
        setValue("billingCountry", billCountries[0].country, { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    // If current value is invalid or empty, default to Tanzania or first option
    if (!currentVal || !existsInList) {
      const tanzania = billCountries.find((c: any) => c.country === "Tanzania");
      const target = tanzania ? tanzania.country : billCountries[0].country;
      setValue("billingCountry", target, { shouldValidate: true, shouldDirty: true });
    }
  }, [billCountries, sameAsInstallation, getValues, setValue]);

  // 2. Auto-select Billing Region
  useEffect(() => {
    if (sameAsInstallation) return;
    if (billRegions && billRegions.length === 1) {
      const target = billRegions[0].region;
      if (getValues("billingRegion") !== target) {
        setValue("billingRegion", target, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [billRegions, sameAsInstallation, getValues, setValue]);

  // 3. Auto-select Billing City
  useEffect(() => {
    if (sameAsInstallation) return;
    if (!billCities) return; // ✅ Explicit check first

    if (billCities.length === 1) {
      // Must match format: Name + "_" + Code
      const target = billCities[0].city + "_" + billCities[0].cityCode;
      if (getValues("billingCity") !== target) {
        setValue("billingCity", target, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [billCities, sameAsInstallation, getValues, setValue]);

  // 4. Auto-select Billing District
  const [billDropdownsReady, setBillDropdownsReady] = useState({
    district: false,
    ward: false
  });

  // Reset ready state when dependencies change
  useEffect(() => {
    if (!billCity || sameAsInstallation) {
      setBillDropdownsReady(prev => ({ ...prev, district: false, ward: false }));
      return;
    }
    // Mark district as ready when districts are loaded
    if (billDistricts && billDistricts.length > 0) {
      setBillDropdownsReady(prev => ({ ...prev, district: true }));
    }
  }, [billCity, billDistricts, sameAsInstallation]);

  useEffect(() => {
    if (!billDistrict || sameAsInstallation) {
      setBillDropdownsReady(prev => ({ ...prev, ward: false }));
      return;
    }
    // Mark ward as ready when wards are loaded
    if (billWards && billWards.length > 0) {
      setBillDropdownsReady(prev => ({ ...prev, ward: true }));
    }
  }, [billDistrict, billWards, sameAsInstallation]);

  // Set billing district value when dropdown is ready
  useEffect(() => {
    if (sameAsInstallation) return;
    if (!billDropdownsReady.district) return;
    if (!billDistricts || billDistricts.length === 0) return;
    if (!defaultValues?.billingDistrict) return;

    // Check if we've already set this value
    const currentVal = getValues("billingDistrict");
    if (currentVal) return; // Already has a value, don't override

    // Find the matching district
    let match = billDistricts.find((d: any) =>
      d.district === defaultValues.billingDistrict
    );

    // If no exact match, try case-insensitive
    if (!match) {
      match = billDistricts.find((d: any) =>
        d.district.toLowerCase().trim() === defaultValues.billingDistrict?.toLowerCase().trim()
      );
    }

    if (match) {
      // Delay slightly to ensure the select component is ready
      const timeoutId = setTimeout(() => {
        setValue("billingDistrict", match.district, {
          shouldValidate: false,
          shouldDirty: false
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [billDropdownsReady.district, billDistricts, defaultValues, sameAsInstallation, getValues, setValue]);

  // Set billing ward value when dropdown is ready
  useEffect(() => {
    if (sameAsInstallation) return;
    if (!billDropdownsReady.ward) return;
    if (!billWards || billWards.length === 0) return;
    if (!defaultValues?.billingWard) return;

    // Check if we've already set this value
    const currentVal = getValues("billingWard");
    if (currentVal) return; // Already has a value, don't override

    // Find the matching ward
    let match = billWards.find((w: any) =>
      w.ward === defaultValues.billingWard
    );

    // If no exact match, try case-insensitive
    if (!match) {
      match = billWards.find((w: any) =>
        w.ward.toLowerCase().trim() === defaultValues.billingWard?.toLowerCase().trim()
      );
    }

    if (match) {
      // Delay slightly to ensure the select component is ready
      const timeoutId = setTimeout(() => {
        setValue("billingWard", match.ward, {
          shouldValidate: false,
          shouldDirty: false
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [billDropdownsReady.ward, billWards, defaultValues, sameAsInstallation, getValues, setValue]);

  // Force re-check when form is in edit mode and all data is loaded
  useEffect(() => {
    if (!isEdit) return;
    if (sameAsInstallation) return;

    // Check if all location data is loaded
    const allDataLoaded =
      billCountries && billCountries.length > 0 &&
      billRegions && billRegions.length > 0 &&
      billCities && billCities.length > 0 &&
      billDistricts && billDistricts.length > 0 &&
      billWards && billWards.length > 0;

    if (!allDataLoaded) return;

    // After a delay, force-check if values need to be set
    const timeoutId = setTimeout(() => {
      const currentDistrict = getValues("billingDistrict");
      const currentWard = getValues("billingWard");

      // Set district if missing
      if (!currentDistrict && defaultValues?.billingDistrict) {
        const districtMatch = billDistricts.find((d: any) =>
          d.district.toLowerCase().trim() === defaultValues.billingDistrict?.toLowerCase().trim()
        );

        if (districtMatch) {
          setValue("billingDistrict", districtMatch.district, {
            shouldValidate: false,
            shouldDirty: false
          });
        }
      }

      // Set ward if missing (with a small delay to ensure district is set first)
      setTimeout(() => {
        if (!currentWard && defaultValues?.billingWard) {
          const wardMatch = billWards.find((w: any) =>
            w.ward.toLowerCase().trim() === defaultValues.billingWard?.toLowerCase().trim()
          );

          if (wardMatch) {
            setValue("billingWard", wardMatch.ward, {
              shouldValidate: false,
              shouldDirty: false
            });
          }
        }
      }, 100);
    }, 1000); // Wait 1 second after all data is loaded

    return () => clearTimeout(timeoutId);
  }, [
    isEdit,
    defaultValues,
    sameAsInstallation,
    billCountries,
    billRegions,
    billCities,
    billDistricts,
    billWards,
    getValues,
    setValue
  ]);

  const billInitialMount = useRef(true);
  useEffect(() => {
    if (billInitialMount.current || sameAsInstallation) return;
    setValue("billingRegion", ""); setValue("billingCity", ""); setValue("billingDistrict", ""); setValue("billingWard", "");
  }, [billCountry, sameAsInstallation, setValue]);
  useEffect(() => {
    if (billInitialMount.current || sameAsInstallation) return;
    setValue("billingCity", ""); setValue("billingDistrict", ""); setValue("billingWard", "");
  }, [billRegion, sameAsInstallation, setValue]);
  useEffect(() => {
    if (billInitialMount.current || sameAsInstallation) return;
    setValue("billingDistrict", ""); setValue("billingWard", "");
  }, [billCity, sameAsInstallation, setValue]);
  useEffect(() => {
    if (billInitialMount.current || sameAsInstallation) return;
    setValue("billingWard", "");
  }, [billDistrict, sameAsInstallation, setValue]);
  useEffect(() => { billInitialMount.current = false; }, []);
  useEffect(() => {
    if (!sameAsInstallation) return;
    setValue("billingCountry", instCountry || ""); setValue("billingRegion", instRegion || ""); setValue("billingCity", instCity || ""); setValue("billingDistrict", instDistrict || ""); setValue("billingWard", instWard || ""); setValue("billingAddress1", instAddr1 || ""); setValue("billingAddress2", instAddr2 || ""); setValue("billingPostalCode", instPostal || "");
  }, [sameAsInstallation, instCountry, instRegion, instCity, instDistrict, instWard, instAddr1, instAddr2, instPostal, setValue]);

  // Updated buildPreviewCustomer to correctly map Installation vs Billing addresses
  const buildPreviewCustomer = (v: CustomerFormData): Partial<Customer> & Record<string, any> => ({
    title: (v.title as string) || "",
    firstName: (v.firstName as string) || "",
    lastName: (v.lastName as string) || "",
    email: (v.email as string) || (v.altEmail as string) || "",
    mobile: (v.mobile as string) || (v.phone as string) || "",
    phone: (v.phone as string) || "",
    gender: (v.gender as string) || "",
    orgName: (v.orgName as string) || "",
    customerType: (v.customerType as string) || "",
    accountClass: (v.accountClass as string) || "",
    serviceType: (v.division as string) || "",
    currency: (v.currency as string) || "",
    tinName: (v.tinName as string) || "",
    ctinNumber: (v.ctinNumber as string) || "",
    cvrnNumber: (v.cvrnNumber as string) || "",
    kycDocNoPOI: (v.kycDocNoPOI as string) || "",
    kycDocNoPOA: (v.kycDocNoPOA as string) || "",
    sapBpId: "",
    sapCaId: "",
    newOrExisting: (v.newOrExisting as string) || "",
    smsFlag: Boolean(v.smsFlag),
    agentSapBpId: (v.agentSapBpId as string) || "",
    parentSapBpId: (v.parentSapBpId as string) || "",
    salesOrg: (v.salesOrg as string) || "",
    dob: v.dateOfBirth,
    race: (v.race as string) || "",
    altPhone: (v.altPhone as string) || "",
    altEmail: (v.altEmail as string) || "",
    fax: (v.fax as string) || "",
    addressType: (v.addressType as string) || "Installation",
    sameAsInstallation: Boolean(v.sameAsInstallation),
    azamPayId: (v.azamPayId as string) || "",
    azamMaxTvId: (v.azamMaxTvId as string) || "",
    kycPoi: v.kycPoi,
    kycPoa: v.kycPoa,

    // --- Correct Address Mapping ---
    // 1. Installation Address (Explicitly mapped to Inst keys)
    countryInst: (v.countryInst as string) || "",
    regionInst: (v.regionInst as string) || "",
    cityInst: extractCityName(v.cityInst as string) || "",
    districtInst: (v.districtInst as string) || "",
    wardInst: (v.wardInst as string) || "",
    address1Inst: (v.address1Inst as string) || "",
    address2Inst: (v.address2Inst as string) || "",
    postalCodeInst: (v.postalCodeInst as string) || "",

    // 2. Billing Address (Mapped to standard keys which Modal treats as Billing)
    // If "Same as Installation" is true, use Inst values; otherwise use Billing values
    country: (v.sameAsInstallation ? v.countryInst : v.billingCountry) as string || "",
    region: (v.sameAsInstallation ? v.regionInst : v.billingRegion) as string || "",
    city: (v.sameAsInstallation ? extractCityName(v.cityInst) : extractCityName(v.billingCity)) as string || "",
    district: (v.sameAsInstallation ? v.districtInst : v.billingDistrict) as string || "",
    ward: (v.sameAsInstallation ? v.wardInst : v.billingWard) as string || "",
    address1: (v.sameAsInstallation ? v.address1Inst : v.billingAddress1) as string || "",
    address2: (v.sameAsInstallation ? v.address2Inst : v.billingAddress2) as string || "",
    postalCode: (v.sameAsInstallation ? v.postalCodeInst : v.billingPostalCode) as string || "",

    // Fallback for PinCode if needed by other components
    pinCode: (v.sameAsInstallation ? v.postalCodeInst : v.billingPostalCode) as string || "",
  });

  const openPreviewModal = () => {
    const v = getValues();
    const mapped = buildPreviewCustomer(v);
    setPreviewCustomer(mapped as Customer);
    setShowPreview(true);
  };
  const rightIconForAgentId = agentIdStatus.loading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : agentIdStatus.valid === true ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : agentIdStatus.valid === false ? <XCircle className="h-4 w-4 text-red-600" /> : undefined;
  const rightIconForParentId = parentIdStatus.loading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : parentIdStatus.valid === true ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : parentIdStatus.valid === false ? <XCircle className="h-4 w-4 text-red-600" /> : undefined;
  const poiDisplayName = watch("kycPoi")?.name || fileNameFromPath((defaultValues as any)?.poiDocPath);
  const poaDisplayName = watch("kycPoa")?.name || fileNameFromPath((defaultValues as any)?.poaDocPath);

  const MIN_DOB = new Date(1925, 11, 21);

  return (
    <div className="w-full">
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5" style={{ color: "#000000ff" }} />
              <span className="text-sm font-medium" style={{ color: "#000000ff" }}>Customer Registration:</span>
              <span className="text-sm" style={{ color: "#000000ff" }}>General Data</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs" style={{ borderColor: "#FF8200", color: "#000000ff" }}>Status: Draft</Badge>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="border-b border-gray-200 bg-gray-50 w-full">
                <div className="overflow-x-auto">
                  <TabsList className="min-w-max">
                    <TabsTrigger value="general" disabled={isEdit}><User className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">General Data</span></TabsTrigger>
                    <TabsTrigger value="personal" disabled={isEdit}><FileText className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Personal Details</span></TabsTrigger>
                    <TabsTrigger value="address" disabled={isEdit}><MapPin className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Address Details</span></TabsTrigger>
                    <TabsTrigger value="service" disabled={isEdit}><Settings className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Service Settings</span></TabsTrigger>
                    <TabsTrigger value="financial" disabled={isEdit}><Banknote className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Financial & Tax</span></TabsTrigger>
                    <TabsTrigger value="kyc" disabled={isEdit}><Upload className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">KYC Documents</span></TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="general" className="p-6 m-0">
                {isPostApproval && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0"><Info className="h-5 w-5 text-yellow-400" /></div>
                      <div className="ml-3"><p className="text-sm text-yellow-700">This customer is approved. Only specific fields (Phone, Mobile, Email, Address 1 & 2) can be modified.</p></div>
                    </div>
                  </div>
                )}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-1">Customer Registration Form</h3>
                    <p className="text-sm text-blue-800">Complete the customer registration by filling all required information across the tabs.</p>
                  </CardContent>
                </Card>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div>
                    <Controller
                      name="customerType"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="customerType">Customer Type <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Customer Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {customerTypeOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.customerType && <p className="text-sm text-red-500 mt-1">{errors.customerType.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name="newOrExisting"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="newOrExisting">Customer Status <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Customer Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {customerStatusOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.newOrExisting && <p className="text-sm text-red-500 mt-1">{errors.newOrExisting.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name="division"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="division">Division <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Division" />
                            </SelectTrigger>
                            <SelectContent>
                              {divisionDropdown.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.division && <p className="text-sm text-red-500 mt-1">{errors.division.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationDate">Registration Date</Label>
                    <Input id="registrationDate" value={new Date().toLocaleDateString()} disabled className="mt-1" uiSize="sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="agentSapBpId">
                        Agent SAP BP ID <span className="text-red-500">*</span>
                      </Label>
                      {/* Show Filter button for Admin, OTC users - Hide only for actual Agents */}
                      {(!isAgent || isOTC) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowAgentModal(true)}
                          disabled={isPostApproval}
                        >
                          <Filter className="h-4 w-4 text-blue-600" />
                          <span className="ml-1 text-xs text-blue-700">Filter</span>
                        </Button>
                      )}
                    </div>
                   <Input
  id="agentSapBpId"
  {...register("agentSapBpId")}
  placeholder={isAgent && !isOTC ? "" : "Select Agent..."}
  className={`mt-1 bg-gray-50 ${isAgent && !isOTC ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}
  uiSize="sm"
  rightIcon={(!isAgent || isOTC) ? rightIconForAgentId : undefined}
  readOnly={true}
  onClick={() => (!isAgent || isOTC) && !isPostApproval && setShowAgentModal(true)}
  disabled={isPostApproval || (isAgent && !isOTC)}
  maxLength={20}
/>
                    {errors.agentSapBpId && (
                      <p className="text-sm text-red-500 mt-1">{errors.agentSapBpId.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
                  <div>
                    <Controller
                      name="accountClass"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="accountClass">Account Class <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Account Class" />
                            </SelectTrigger>
                            <SelectContent>
                              {accountClassOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.accountClass && <p className="text-sm text-red-500 mt-1">{errors.accountClass.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                  {isHotel ? (
                    <div className="lg:col-span-2 flex items-start space-x-6">
                      <Controller
                        name="noOfRooms"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="noOfRooms">No of Rooms <span className="text-red-500">*</span></Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-8"
                                onClick={() => {
                                  let val = parseInt(field.value || "0", 10);
                                  if (isNaN(val)) val = 0;
                                  if (val > 1) field.onChange((val - 1).toString());
                                  else field.onChange("");
                                }}
                                disabled={isPostApproval || !field.value || parseInt(field.value, 10) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
  {...field}
  value={field.value || ""}
  type="number"
  className="h-7 w-24 text-center"
  containerClassName="w-auto"
  placeholder="0"
  min={1}
  max={75}
  disabled={isPostApproval}
  onInput={handleNumericOnlyInput}
  onChange={(e) => {
    const val = e.target.value.replace(/[^0-9]/g, ""); // Sanitize to numbers only
    if (!val) {
      field.onChange("");
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num > 75) field.onChange("75");
      else if (num < 1) field.onChange("1");
      else field.onChange(num.toString());
    } else {
      field.onChange(val);
    }
  }}
/>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-8"
                                onClick={() => {
                                  let val = parseInt(field.value || "0", 10);
                                  if (isNaN(val)) val = 0;
                                  if (val < 75) field.onChange((val + 1).toString());
                                }}
                                disabled={isPostApproval || parseInt(field.value || "0", 10) >= 75}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {errors.noOfRooms && <p className="text-sm text-red-500 mt-1">{errors.noOfRooms.message}</p>}
                          </div>
                        )}
                      />
                      <div>
                        <Label className="invisible">SMS</Label>
                        <div className="flex items-center space-x-2 mt-1 h-7">
                          <Switch id="smsFlag" checked={watch("smsFlag")} onCheckedChange={(checked) => setValue("smsFlag", checked)} disabled={isPostApproval} />
                          <Label htmlFor="smsFlag">Enable SMS Notifications</Label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="invisible">SMS</Label>
                      <div className="flex items-center space-x-2 mt-1 h-9">
                        <Switch id="smsFlag" checked={watch("smsFlag")} onCheckedChange={(checked) => setValue("smsFlag", checked)} disabled={isPostApproval} />
                        <Label htmlFor="smsFlag">Enable SMS Notifications</Label>
                      </div>
                    </div>
                  )}
                  {(selectedCustomerStatus?.name || "").toLowerCase().includes("existing") && (
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="parentSapBpId">Parent Customer SAP BP ID <span className="text-red-500">*</span></Label>
                        <Button type="button" variant="ghost" size="xs" onClick={() => setShowCustomerModal(true)} disabled={isPostApproval}>
                          <Filter className="h-4 w-4 text-blue-600" />
                          <span className="ml-1 text-xs text-blue-700">Filter</span>
                        </Button>
                      </div>
                      <Input
  id="parentSapBpId"
  {...register("parentSapBpId")}
  placeholder="Select Parent Customer..."
  className="mt-1 cursor-pointer bg-gray-50"
  uiSize="sm"
  rightIcon={rightIconForParentId}
  readOnly={true}
  onClick={() => !isPostApproval && setShowCustomerModal(true)}
  disabled={isPostApproval}
  maxLength={20}
/>
                      {errors.parentSapBpId && (
                        <p className="text-sm text-red-500 mt-1">{errors.parentSapBpId.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="personal" className="p-6 m-0">
                <Card className="bg-blue-50 border-blue-200 mb-6">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-1">Personal Information</h3>
                    <p className="text-sm text-blue-800">Enter customer personal details and contact information.</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                  <div>
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Title" />
                            </SelectTrigger>
                            <SelectContent>
                              {salutationOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      placeholder="Enter first name"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={50} // Req 2
                      disabled={isPostApproval}
                      onInput={handleAlphaOnlyInput}
                    />
                    {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      {...register("middleName")}
                      placeholder="Enter middle name"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={50} // Req 2
                      disabled={isPostApproval}
                      onInput={handleAlphaOnlyInput}
                    />
                    {errors.middleName && <p className="text-sm text-red-500 mt-1">{errors.middleName.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="Enter last name"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={50} // Req 2
                      disabled={isPostApproval}
                      onInput={handleAlphaOnlyInput}

                    />
                    {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
                  </div>

                  <div>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || isPostApproval || isGenderAutoSelected}>
                            <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              {genderOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.gender && <p className="text-sm text-red-500 mt-1">{errors.gender.message}</p>}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <Controller
                      name="race"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="race">Race <span className="text-red-500">*</span></Label>
                          <Select value={field.value || ""} onValueChange={field.onChange} disabled={isPostApproval}>
                            <SelectTrigger uiSize="sm" className="mt-1">
                              <SelectValue placeholder="Select Race" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="African">African</SelectItem>
                              <SelectItem value="Asian">Asian</SelectItem>
                              <SelectItem value="European">European</SelectItem>
                              <SelectItem value="Mixed">Mixed</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.race && <p className="text-sm text-red-500 mt-1">{errors.race.message}</p>}
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mt-6">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                    <Controller
                      name="dateOfBirth"
                      control={control}
                      render={({ field }) => (
                        <Popover open={isDobOpen} onOpenChange={setIsDobOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full h-7 text-xs justify-start text-left font-normal mt-1"
                              disabled={isPostApproval}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date ? date.toISOString() : "");
                                setIsDobOpen(false);
                              }}
                              toDate={new Date()}
                              fromDate={MIN_DOB}
                              disabled={(date) => date < MIN_DOB || date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />

                    {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="mobile"
                      type="tel"
                      {...register("mobile")}
                      placeholder="xxxx xxx xxx xxx"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={14} // Req 3: Max length
                      onInput={handleNumericOnlyInput}

                    />
                    {errors.mobile && <p className="text-sm text-red-500 mt-1">{errors.mobile.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      placeholder="xxxx xxx xxx xxx"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={14} // Req 3
                      onInput={handleNumericOnlyInput}
                    />
                    {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>


                  <div>
                    <Label htmlFor="altPhone">Alternative Phone (optional)</Label>
                    <Input
                      id="altPhone"
                      type="tel"
                      {...register("altPhone")}
                      placeholder="xxxx xxx xxx xxx"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={14} // Req 3
                      onInput={handleNumericOnlyInput}
                    />
                    {errors.altPhone && <p className="text-sm text-red-500 mt-1">{errors.altPhone.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="fax">Fax Number</Label>
                    <Input id="fax" {...register("fax")} placeholder="Enter fax number" className="mt-1" uiSize="sm" disabled={isPostApproval} maxLength={10} onInput={handleNumericOnlyInput} />
                    {errors.fax && <p className="text-sm text-red-500 mt-1">{errors.fax.message}</p>}
                  </div>

                  <div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                  <div className="lg:col-span-2">
  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
  <Input
    id="email"
    type="email"
    {...register("email")}
    placeholder="customer@example.com"
    className="mt-1"
    uiSize="sm"
    onInput={(e) => {
      // Allow alphanumeric and email special characters only
      e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9@._-]/g, "");
    }}
    onBlur={() => {
      const value = getValues("email") || "";
      if (!value) { clearErrors("email"); return; }
      const parts = String(value).split("@");
      if (parts.length < 2) { setError("email", { message: "Invalid email format" }); return; }
      const domainLabel = (parts[1].split(".")[0] || "").trim();
      if (/^\d+$/.test(domainLabel)) {
        setError("email", { message: "Email domain cannot be all numbers" });
        return;
      }
      if (/[-_.]{2,}/.test(value)) {
        setError("email", { message: "Email cannot contain consecutive special characters (--, __, ..)" });
        return;
      }
      clearErrors("email");
    }}
  />
  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
</div>

                  <div className="lg:col-span-2">
  <Label htmlFor="altEmail">Alternative Email (optional)</Label>
  <Input
    id="altEmail"
    type="email"
    {...register("altEmail")}
    placeholder="alternate@example.com"
    className="mt-1"
    uiSize="sm"
    onInput={(e) => {
      // Allow alphanumeric and email special characters only
      e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9@._-]/g, "");
    }}
    onBlur={() => {
      const value = getValues("altEmail") || "";
      if (value && /[-_.]{2,}/.test(value)) {
        setError("altEmail", { message: "Email cannot contain consecutive special characters (--, __, ..)" });
      } else {
        clearErrors("altEmail");
      }
    }}
  />
  {errors.altEmail && <p className="text-sm text-red-500 mt-1">{errors.altEmail.message}</p>}
</div>

                  <div className="lg:col-span-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input id="orgName" {...register("orgName")} placeholder="Enter organization name" className="mt-1" uiSize="sm" disabled={isPostApproval} maxLength={50} onInput={handleAlphaWithSpaceInput} />
                    {errors.orgName && <p className="text-sm text-red-500 mt-1">{errors.orgName.message}</p>}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="address" className="p-6 m-0">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-1">Installation Address</h3>
                    <p className="text-sm text-blue-800">Enter the installation address where the service will be installed.</p>
                  </CardContent>
                </Card>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-6 gap-6">
                  <div>
                    <Controller name="addressType" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="addressType">Address Type <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Address Type" /></SelectTrigger>
                          <SelectContent><SelectItem value="Installation">Installation</SelectItem></SelectContent>
                        </Select>
                        {errors.addressType && <p className="text-sm text-red-500 mt-1">{errors.addressType.message}</p>}
                      </div>
                    )} />
                  </div>

                  <div>
                    <Controller name="countryInst" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="countryInst">Country <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={instCountriesLoading || isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Country" /></SelectTrigger>
                          <SelectContent>
                            <SelectOptions isLoading={instCountriesLoading} isError={instCountriesError} data={instCountries} placeholder="Select Country" valueKey="country" labelKey="country" />
                          </SelectContent>
                        </Select>
                        {errors.countryInst && <p className="text-sm text-red-500 mt-1">{errors.countryInst.message}</p>}
                      </div>
                    )} />
                  </div>

                  <div>
                    <Controller name="regionInst" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="regionInst">Region <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={!instCountry || instRegionsLoading || isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Region" /></SelectTrigger>
                          <SelectContent>
                            <SelectOptions isLoading={instRegionsLoading} isError={instRegionsError} data={instRegions} placeholder="Select Region" valueKey="region" labelKey="region" />
                          </SelectContent>
                        </Select>
                        {errors.regionInst && <p className="text-sm text-red-500 mt-1">{errors.regionInst.message}</p>}
                      </div>
                    )} />
                  </div>

                  <div>
                    <Controller name="cityInst" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="cityInst">City <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={!instRegion || instCitiesLoading || isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select City" /></SelectTrigger>
                          <SelectContent>
                            {instCitiesLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                            {instCitiesError && <SelectItem value="error" disabled>Error loading options</SelectItem>}
                            {!instCitiesLoading && !instCitiesError && (!instCities || instCities.length === 0) && <SelectItem value="empty" disabled>No cities found</SelectItem>}
                            {instCities?.map((city: any) => (
                              <SelectItem key={city.city + "_" + city.cityCode} value={city.city + "_" + city.cityCode}>{city.city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.cityInst && <p className="text-sm text-red-500 mt-1">{errors.cityInst.message}</p>}
                      </div>
                    )} />
                  </div>

                  <div>
                    <Controller name="districtInst" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="districtInst">District <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={!instCity || instDistrictsLoading || isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select District" /></SelectTrigger>
                          <SelectContent>
                            <SelectOptions isLoading={instDistrictsLoading} isError={instDistrictsError} data={instDistricts} placeholder="Select District" valueKey="district" labelKey="district" />
                          </SelectContent>
                        </Select>
                        {errors.districtInst && <p className="text-sm text-red-500 mt-1">{errors.districtInst.message}</p>}
                      </div>
                    )} />
                  </div>

                  <div>
                    <Controller name="wardInst" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="wardInst">Ward <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={!instDistrict || instWardsLoading || isPostApproval}>
                          <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Ward" /></SelectTrigger>
                          <SelectContent>
                            <SelectOptions isLoading={instWardsLoading} isError={instWardsError} data={instWards} placeholder="Select Ward" valueKey="ward" labelKey="ward" />
                          </SelectContent>
                        </Select>
                        {errors.wardInst && <p className="text-sm text-red-500 mt-1">{errors.wardInst.message}</p>}
                      </div>
                    )} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mt-4">
                  <div>
                    <Label htmlFor="address1Inst">Address Line 1 <span className="text-red-500">*</span></Label>
                    <Input
                      id="address1Inst"
                      {...register("address1Inst")}
                      placeholder="Enter primary address (min 5 chars, letters required)"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={100} // Req 6
                      onInput={handleAlphanumericWithSpaceInput}

                    />
                    {errors.address1Inst && <p className="text-sm text-red-500 mt-1">{(errors.address1Inst as any).message}</p>}
                  </div>
                  <div>
  <Label htmlFor="address2Inst">Address Line 2 </Label>
  <Input 
    id="address2Inst" 
    {...register("address2Inst")} 
    placeholder="Enter secondary address" 
    className="mt-1" 
    uiSize="sm" 
    maxLength={100}
    disabled={isPostApproval}
    onInput={handleAlphanumericWithSpaceInput}
  />
  {errors.address2Inst && <p className="text-sm text-red-500 mt-1">{errors.address2Inst.message}</p>}
</div>
                  <div>
                    <Label htmlFor="postalCodeInst">Postal Code </Label>
                    <Input
                      id="postalCodeInst"
                      {...register("postalCodeInst")}
                      placeholder="Enter postal code"
                      className="mt-1"
                      uiSize="sm"
                      maxLength={8} // Req 6
                      disabled={isPostApproval}
                      onInput={handleNumericOnlyInput}
                    />
                    {errors.postalCodeInst && <p className="text-sm text-red-500 mt-1">{errors.postalCodeInst.message}</p>}
                  </div>
                  <div></div><div></div><div></div>
                </div>

                <Card className="mt-6 bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-amber-900 mb-1">Billing Address</h3>
                    <p className="text-sm text-amber-800">Enter the billing address where invoices will be sent.</p>
                  </CardContent>
                </Card>

                <div className="flex items-center space-x-2 my-6">
                  <Switch id="sameAsInstallation" checked={watch("sameAsInstallation")} onCheckedChange={(checked) => setValue("sameAsInstallation", checked)} disabled={isPostApproval} />
                  <Label htmlFor="sameAsInstallation">Same as Installation Address</Label>
                </div>

                {!watch("sameAsInstallation") && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                      <div>
                        <Controller name="billingCountry" control={control} render={({ field }) => (
                          <div>
                            <Label htmlFor="billingCountry">Country <span className="text-red-500">*</span></Label>
                            <Select value={field.value || ""} onValueChange={field.onChange} disabled={billCountriesLoading || isPostApproval}>
                              <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Country" /></SelectTrigger>
                              <SelectContent>
                                <SelectOptions isLoading={billCountriesLoading} isError={billCountriesError} data={billCountries} placeholder="Select Billing Country" valueKey="country" labelKey="country" />
                              </SelectContent>
                            </Select>
                            {errors.billingCountry && <p className="text-sm text-red-500 mt-1">{errors.billingCountry.message}</p>}
                          </div>
                        )} />
                      </div>

                      <div>
                        <Controller name="billingRegion" control={control} render={({ field }) => (
                          <div>
                            <Label htmlFor="billingRegion">Region <span className="text-red-500">*</span></Label>
                            <Select value={field.value || ""} onValueChange={field.onChange} disabled={!billCountry || billRegionsLoading || isPostApproval}>
                              <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Region" /></SelectTrigger>
                              <SelectContent>
                                <SelectOptions isLoading={billRegionsLoading} isError={billRegionsError} data={billRegions} placeholder="Select Billing Region" valueKey="region" labelKey="region" />
                              </SelectContent>
                            </Select>
                            {errors.billingRegion && <p className="text-sm text-red-500 mt-1">{errors.billingRegion.message}</p>}
                          </div>
                        )} />
                      </div>

                      <div>
                        <Controller name="billingCity" control={control} render={({ field }) => (
                          <div>
                            <Label htmlFor="billingCity">City <span className="text-red-500">*</span></Label>
                            <Select value={field.value || ""} onValueChange={field.onChange} disabled={!billRegion || billCitiesLoading || isPostApproval}>
                              <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select City" /></SelectTrigger>
                              <SelectContent>
                                {billCitiesLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                                {billCitiesError && <SelectItem value="error" disabled>Error loading options</SelectItem>}
                                {!billCitiesLoading && !billCitiesError && (!billCities || billCities.length === 0) && <SelectItem value="empty" disabled>No cities found</SelectItem>}
                                {billCities?.map((city: any) => (
                                  <SelectItem key={city.city + "_" + city.cityCode} value={city.city + "_" + city.cityCode}>{city.city}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.billingCity && <p className="text-sm text-red-500 mt-1">{errors.billingCity.message}</p>}
                          </div>
                        )} />
                      </div>

                      <div>
                        <Controller name="billingDistrict" control={control} render={({ field }) => (
                          <div>
                            <Label htmlFor="billingDistrict">District <span className="text-red-500">*</span></Label>
                            <Select value={field.value || ""} onValueChange={field.onChange} disabled={!billCity || billDistrictsLoading || isPostApproval}>
                              <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select District" /></SelectTrigger>
                              <SelectContent>
                                <SelectOptions isLoading={billDistrictsLoading} isError={billDistrictsError} data={billDistricts} placeholder="Select Billing District" valueKey="district" labelKey="district" />
                              </SelectContent>
                            </Select>
                            {errors.billingDistrict && <p className="text-sm text-red-500 mt-1">{errors.billingDistrict.message}</p>}
                          </div>
                        )} />
                      </div>

                      <div>
                        <Controller name="billingWard" control={control} render={({ field }) => (
                          <div>
                            <Label htmlFor="billingWard">Ward <span className="text-red-500">*</span></Label>
                            <Select value={field.value || ""} onValueChange={field.onChange} disabled={!billDistrict || billWardsLoading || isPostApproval}>
                              <SelectTrigger uiSize="sm" className="mt-1"><SelectValue placeholder="Select Ward" /></SelectTrigger>
                              <SelectContent>
                                <SelectOptions isLoading={billWardsLoading} isError={billWardsError} data={billWards} placeholder="Select Billing Ward" valueKey="ward" labelKey="ward" />
                              </SelectContent>
                            </Select>
                            {errors.billingWard && <p className="text-sm text-red-500 mt-1">{errors.billingWard.message}</p>}
                          </div>
                        )} />
                      </div>

                      <div>
                        <Label htmlFor="billingPostalCode">Postal Code </Label>
                        <Input
                          id="billingPostalCode"
                          {...register("billingPostalCode")}
                          placeholder="Enter postal code"
                          className="mt-1"
                          uiSize="sm"
                          maxLength={8} // Req 6
                          disabled={isPostApproval}
                          onInput={handleNumericOnlyInput}
                        />
                        {errors.billingPostalCode && <p className="text-sm text-red-500 mt-1">{errors.billingPostalCode.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mt-4">
                      <div>
                        <Label htmlFor="billingAddress1">Address Line 1 <span className="text-red-500">*</span></Label>
                        <Input
                          id="billingAddress1"
                          {...register("billingAddress1")}
                          placeholder="Enter primary address (min 5 chars, letters required)"
                          className="mt-1"
                          uiSize="sm"
                          maxLength={100} // Req 6
                          disabled={isPostApproval}
                          onInput={handleAlphanumericWithSpaceInput}
                        />
                        {errors.billingAddress1 && <p className="text-sm text-red-500 mt-1">{(errors.billingAddress1 as any).message}</p>}
                      </div>
                      <div>
  <Label htmlFor="billingAddress2">Address Line 2 </Label>
  <Input 
    id="billingAddress2" 
    {...register("billingAddress2")} 
    placeholder="Enter secondary address" 
    className="mt-1" 
    uiSize="sm" 
    maxLength={100} 
    disabled={isPostApproval} 
    onInput={handleAlphanumericWithSpaceInput} 
  />
  {errors.billingAddress2 && <p className="text-sm text-red-500 mt-1">{errors.billingAddress2.message}</p>}
</div>
                      <div></div><div></div><div></div><div></div>
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="service" className="p-6 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Controller name="salesOrg" control={control} render={({ field }) => (
                      <div>
                        <Label htmlFor="salesOrg">Sales Organization <span className="text-red-500">*</span></Label>
                        <Select value={field.value || ""} onValueChange={field.onChange} disabled={dropdownsLoading || dropdownsError || (filteredSalesOrg || []).length === 0 || isPostApproval}>
                          <SelectTrigger ref={field.ref} uiSize="sm" className="mt-1"><SelectValue placeholder="Select Sales Org" /></SelectTrigger>
                          <SelectContent>
                            {dropdownsLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                            {dropdownsError && <SelectItem value="error" disabled>Error loading options</SelectItem>}
                            {!dropdownsLoading && !dropdownsError && (filteredSalesOrg || []).length === 0 && <SelectItem value="empty" disabled>No Sales Org available</SelectItem>}
                            {(filteredSalesOrg || []).map((org: any) => <SelectItem key={org.value} value={org.value}>{org.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {errors.salesOrg && <p className="text-sm text-red-500 mt-1">{errors.salesOrg.message}</p>}
                      </div>
                    )} />
                    <div>
                      <Label htmlFor="azamPayId">Azam Pay ID</Label>
                      <Input id="azamPayId" {...register("azamPayId")} placeholder="Enter Azam Pay ID" className="mt-1" uiSize="sm" disabled={isPostApproval} maxLength={20} onInput={handleAlphanumericOnlyInput} />
                      {errors.azamPayId && <p className="text-sm text-red-500 mt-1">{errors.azamPayId.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="azamMaxTvId">Azam Max TV ID</Label>
                      <Input id="azamMaxTvId" {...register("azamMaxTvId")} placeholder="Enter Azam Max TV ID" className="mt-1" uiSize="sm" disabled={isPostApproval} maxLength={20} onInput={handleAlphanumericOnlyInput} />
                      {errors.azamMaxTvId && <p className="text-sm text-red-500 mt-1">{errors.azamMaxTvId.message}</p>}
                    </div>
                  </div>

                  <Card className="bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-blue-900 mb-3">Service Information</h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>DTT:</strong> Digital Terrestrial Television service</p>
                        <p><strong>DTH:</strong> Direct to Home satellite service</p>
                        <p><strong>OTT:</strong> Over-the-Top streaming service (Azam Max)</p>
                        <hr className="my-3 border-blue-200" />
                        <p><strong>Account Classes:</strong></p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>Residential: Home users</li>
                          <li> Commercial: Business customers</li>
                          <li>VIP: Premium service customers</li>
                          <li>Corporate: Large enterprise customers</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="financial" className="p-6 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div>
                      <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={isPostApproval || isCurrencyLoading || !selectedCountry}
                          >
                            <SelectTrigger uiSize="sm" className="mt-1">
                              <SelectValue placeholder={isCurrencyLoading ? "Loading..." : "Select Currency"} />
                            </SelectTrigger>
                            <SelectContent>
                              {isCurrencyLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}

                              {/* FIXED: Map through the array of currencies */}
                              {currencyData && currencyData.length > 0 ? (
                                currencyData.map((c: any) => (
                                  <SelectItem key={c.currencyCode} value={c.currencyCode}>
                                    {c.currencyCode} - {c.currencyName}
                                  </SelectItem>
                                ))
                              ) : (
                                /* Fallback options if API returns nothing (optional, can be removed if not needed) */
                                <>
                                  <SelectItem value="TZS">Tanzanian Shilling (TSH)</SelectItem>
                                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.currency && <p className="text-sm text-red-500 mt-1">{errors.currency.message}</p>}
                    </div>

                    <div>
  <Label htmlFor="tinName">TIN Name</Label>
  <Input
    id="tinName"
    {...register("tinName")}
    placeholder="Enter TIN Name"
    className="mt-1"
    uiSize="sm"
    disabled={isPostApproval}
    maxLength={20}
    onInput={handleAlphanumericWithSpaceInput} // ✅ Changed from handleAlphanumericOnlyInput
  />
  {errors.tinName && <p className="text-sm text-red-500 mt-1">{errors.tinName.message}</p>}
</div>

                    <div>
  <Label htmlFor="ctinNumber">TIN Number <span className="text-red-500">*</span></Label>
  <Input
    id="ctinNumber"
    {...register("ctinNumber")}
    placeholder="e.g., 101-895-149 or 1234567890" // ✅ Updated placeholder
    className="mt-1"
    uiSize="sm"
    disabled={isPostApproval}
    maxLength={20}
    onInput={handleAlphanumericWithDashInput} // ✅ Changed from handleAlphanumericOnlyInput
  />
  <p className="text-xs text-gray-500 mt-1">Tax Identification Number (alphanumeric with dashes)</p> {/* ✅ Updated hint */}
  {errors.ctinNumber && <p className="text-sm text-red-500 mt-1">{errors.ctinNumber.message}</p>}
</div>

                    <div>
                      <Label htmlFor="cvrnNumber">VRN Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="cvrnNumber"
                        {...register("cvrnNumber")}
                        placeholder="Enter VRN number"
                        className="mt-1"
                        uiSize="sm"
                        disabled={isPostApproval}
                        maxLength={30} // Req 10
                        onInput={handleAlphanumericOnlyInput}

                      />
                      <p className="text-xs text-gray-500 mt-1">VAT Registration Number</p>
                      {errors.cvrnNumber && <p className="text-sm text-red-500 mt-1">{errors.cvrnNumber.message}</p>}
                    </div>
                  </div>

                  <Card className="bg-amber-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-amber-900 mb-3">Financial Information</h4>
                      <div className="text-sm text-amber-800 space-y-2">
                        <p><strong>Currency:</strong> All transactions will be processed in the selected currency</p>
                        <p><strong>TIN Number:</strong> Required for business customers and large transactions</p>
                        <p><strong>VRN Number:</strong> Required for VAT-registered customers</p>
                        <p><strong>Payment Methods:</strong> Mobile money, bank transfer, cash, credit card</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="kyc" className="p-6 m-0">
                <div className="w-full">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Upload required documents for identity verification and SAP Business Partner creation approval
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      {/* Document Numbers Inputs (Kept same) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="kycDocNoPOA" className="font-medium">KYC Document Number (POA)</Label>
                          <Input
                            id="kycDocNoPOA"
                            {...register("kycDocNoPOA")}
                            placeholder="e.g., UtilityBill12345"
                            uiSize="sm"
                            disabled={isPostApproval}
                            maxLength={20}
                            onInput={handleAlphanumericOnlyInput}
                          />
                          <p className="text-xs text-gray-500 mt-1">Alphanumeric only, max 20 characters</p>
                          {errors.kycDocNoPOA && <p className="text-xs text-red-500">{errors.kycDocNoPOA.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="kycDocNoPOI" className="font-medium">KYC Document Number (POI)</Label>
                          <Input
                            id="kycDocNoPOI"
                            {...register("kycDocNoPOI")}
                            placeholder="e.g., NIDA123456789"
                            uiSize="sm"
                            disabled={isPostApproval}
                            maxLength={20}
                            onInput={handleAlphanumericOnlyInput}
                          />
                          <p className="text-xs text-gray-500 mt-1">Alphanumeric only, max 20 characters</p>
                          {errors.kycDocNoPOI && <p className="text-xs text-red-500">{errors.kycDocNoPOI.message}</p>}
                        </div>
                      </div>

                      {/* POA Upload Section */}
                      <div>
                        <Label className="font-medium">POI (Proof of Address) Documents</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isPostApproval ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 hover:border-azam-blue cursor-pointer'}`}
                          onClick={() => !isPostApproval && poaFileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id="kycPoa"
                            ref={poaFileInputRef}
                            onChange={(e) => {
                              try {
                                const file = validateFile(e.target.files?.[0] || null);
                                setValue("kycPoa", file, { shouldDirty: true, shouldTouch: true });
                              } catch (err: any) {
                                toast({
                                  title: "Invalid File",
                                  description: err.message,
                                  variant: "destructive"
                                });
                                if (poaFileInputRef.current) poaFileInputRef.current.value = ""; // Clear invalid file
                              }
                            }}
                            disabled={isPostApproval}
                          />
                          <div className={`flex flex-col items-center ${isPostApproval ? 'cursor-not-allowed' : ''}`}>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="font-medium">Upload POA Documents</span>
                            <span className="text-xs text-gray-500">PDF, JPG, JPEG only (Max 5MB)</span>
                            {poaDisplayName && (
                              <span className="text-xs text-green-700 mt-2 font-semibold">Selected: {poaDisplayName}</span>
                            )}
                            {!isPostApproval && (
                              <Button type="button" variant="outline" size="sm" className="mt-2 pointer-events-none">
                                Choose File
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* POI Upload Section */}
                      <div>
                        <Label className="font-medium">POA (Proof of Identity) Documents</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isPostApproval ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 hover:border-azam-blue cursor-pointer'}`}
                          onClick={() => !isPostApproval && poiFileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id="kycPoi"
                            ref={poiFileInputRef}
                            onChange={(e) => {
                              try {
                                const file = validateFile(e.target.files?.[0] || null);
                                setValue("kycPoi", file, { shouldDirty: true, shouldTouch: true });
                              } catch (err: any) {
                                toast({
                                  title: "Invalid File",
                                  description: err.message,
                                  variant: "destructive"
                                });
                                if (poiFileInputRef.current) poiFileInputRef.current.value = ""; // Clear invalid file
                              }
                            }}
                            disabled={isPostApproval}
                          />
                          <div className={`flex flex-col items-center ${isPostApproval ? 'cursor-not-allowed' : ''}`}>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="font-medium">Upload POI Documents</span>
                            <span className="text-xs text-gray-500">PDF, JPG, JPEG only (Max 5MB)</span>
                            {poiDisplayName && (
                              <span className="text-xs text-green-700 mt-2 font-semibold">Selected: {poiDisplayName}</span>
                            )}
                            {!isPostApproval && (
                              <Button type="button" variant="outline" size="sm" className="mt-2 pointer-events-none">
                                Choose File
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">Document Number Info</h4>
                          <div className="text-sm text-blue-800">
                            <div><strong>POI:</strong> National ID, Passport, Driver's License</div>
                            <div><strong>POA:</strong> Utility Bill, Bank Statement, Rental Agreement</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-green-900 mb-2">Required Documents</h4>
                          <div className="text-sm text-green-800">
                            <div className="mb-1"><strong>POA (Proof of Address):</strong></div>
                            <ul className="ml-4 list-disc">
                              <li>Utility Bill</li>
                              <li>Bank Statement</li>
                              <li>Rental Agreement</li>
                            </ul>
                            <div className="mt-2 mb-1"><strong>POI (Proof of Identity):</strong></div>
                            <ul className="ml-4 list-disc">
                              <li>National ID (NIDA)</li>
                              <li>Passport</li>
                              <li>Driver's License</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-yellow-900 mb-2">Preview Feature</h4>
                          <p className="text-sm text-yellow-800 mb-3">
                            Before final submission, preview your application and uploaded documents to ensure accuracy.
                          </p>
                          <Button type="button" variant="outline" className="w-full font-semibold" onClick={openPreviewModal}>
                            <FileText className="h-4 w-4 mr-2" />
                            Preview Application
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-between">
          <Button type="button" onClick={handlePrevious} disabled={activeTab === 'general'}>Previous</Button>
          {activeTab !== 'kyc' ? <Button type="button" onClick={handleNext}>Next</Button> : <Button type="button" onClick={handleSubmit(handleFormSubmit)} disabled={isLoading || (isPostApproval && !isAnEditableFieldDirty)}>{isEdit ? 'Update Application' : 'Submit Application'}</Button>}
        </div>
      </form>
      <ParentAgentSearchModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelect={(agent: AgentApiItem) => {
          setValue('agentSapBpId', agent.sapBpId);
          validateAgentId(agent.sapBpId);
        }} />
      <CustomerSearchModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={(id: string) => {
          setValue('parentSapBpId', id);
          validateParentSapBpId(id);
        }} />
      <CustomerDetailsModal customer={previewCustomer} isOpen={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
}
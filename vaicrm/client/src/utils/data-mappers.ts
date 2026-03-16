// /client/src/utils/data-mappers.ts

import type { AgentFormData } from "@/components/forms/multi-step-agent-form";

export interface AgentApiData {
  tinName?: string | null;
  tinNo?: string | null;
  vrnNo?: string | null;
  addressOne?: string | null;
  addressTwo?: string | null;
  pincode?: string | null;
  type?: string | null;
  division?: string | null;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  fax?: string | null;
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  ward?: string | null;
  commission?: string | null;
  currency?: string | null;
  isSubCollection?: "Y" | "N" | null;
  salesOrg?: string | null;
  commValue?: string | number | null;
  kycDocNo?: string | null;
  poaDocNo?: string | null;
  parentSapBpId?: string | null;
  parentId?: string | null;
  [key: string]: any;
}

// ✅ Helper function to safely parse commValue to number
function parseCommValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 5.00; // Default value
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 5.00 : parsed;
}

export function mapApiToFormData(apiData: AgentApiData): AgentFormData {
  return {
    ...apiData,
    tinName: apiData.tinName ?? "",
    tinNo: apiData.tinNo ?? "",
    vrnNo: apiData.vrnNo ?? "",
    isSubCollection: apiData.isSubCollection ?? "N",
    address1: apiData.addressOne ?? "",
    address2: apiData.addressTwo ?? "",
    pinCode: apiData.pincode ?? "",
    salutation: apiData.salutation ?? "",
    firstName: apiData.firstName ?? "",
    lastName: apiData.lastName ?? "",
    email: apiData.email ?? "",
    mobile: apiData.mobile ?? "",
    type: apiData.type ?? "",
    phone: apiData.phone ?? "",
    parentId: apiData.parentSapBpId || apiData.parentId || "",
    fax: apiData.fax ?? "",
    country: apiData.country ?? "",
    region: apiData.region ?? "",
    city: apiData.city ?? "",
    kycDocNo: apiData.kycDocNo ?? "",
    poaDocNo: apiData.poaDocNo ?? "",
    district: apiData.district ?? "",
    ward: apiData.ward ?? "",
    currency: apiData.currency ?? "",
    commValue: parseCommValue(apiData.commValue), // ✅ FIX: Use helper to ensure number type
    gender: apiData.gender ?? "",
    division: "DTH" as const,
    salesOrg: apiData.salesOrg ?? "",
  };
}
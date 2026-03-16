// src/lib/api-customer-onboarding.ts

import { getApiConfig } from "@/lib/config";
import { apiRequest } from "@/lib/queryClient";
import { useAuthContext } from "@/context/AuthProvider";

// Utility to map your form data to the API payload
export function mapCustomerFormToOnboardingRequest(formData: any) {
  return {
    salutation: formData.title ?? "",
    firstName: formData.firstName,
    middleName: formData.middleName ?? null,
    lastName: formData.lastName,

    phone: formData.phone ?? null,
    mobile: formData.mobile,
    email: formData.email,
    fax: formData.fax ?? null,

    currency: formData.currency || "",
    customerType: formData.customerType,
    division: formData.division, // e.g., "DTH"
    salesOrg: formData.salesOrg, // e.g., "Azam Media Ltd"

    dob: formData.dateOfBirth ? formData.dateOfBirth.replace(/-/g, "") : null, // "YYYYMMDD"
    gender: formData.gender,
    race: formData.race ?? null,

    // Installation address (must use ...Inst keys)
    countryInst: formData.countryInst,
    regionInst: formData.regionInst,
    cityInst: formData.cityInst,
    districtInst: formData.districtInst,
    wardInst: formData.wardInst,
    address1Inst: formData.address1Inst,
    address2Inst: formData.address2Inst ?? null,
    pinCodeInst: formData.postalCodeInst ?? "",

    // Billing address (no suffix)
    country: formData.billingCountry || formData.countryInst || "",
    region: formData.billingRegion || formData.regionInst || "",
    city: formData.billingCity || formData.cityInst || "",
    district: formData.billingDistrict || formData.districtInst || "",
    ward: formData.billingWard || formData.wardInst || "",
    address1: formData.billingAddress1 || formData.address1Inst || "",
    address2: formData.billingAddress2 ?? formData.address2Inst ?? null,
    pinCode: formData.billingPostalCode || formData.postalCodeInst || "",

    // Services
    azamPesaId: formData.azamPayId ?? "",
    azamMaxTv: formData.azamMaxTvId ?? "",

    // Tax
    tinNo: formData.ctinNumber ?? "",
    vrnNo: formData.cvrnNumber ?? "",

    remark: formData.remark || "",

    // KYC doc numbers
    poiDocId: null,
    poiDocNo: formData.kycDocNoPOI ?? null,
    poaDocId: null,
    poaDocNo: formData.kycDocNoPOA ?? null,

    parentBpId: formData.parentCustomerId ?? null,
    accountClass: formData.accountClass ?? null,
    isChild: Boolean(formData.isChild),
  };
}

// Main function to call the API
export async function registerCustomer(formValues: any, user: any) {
  const { baseUrl } = getApiConfig();
  const url = `${baseUrl.replace(/\/$/, "")}/crm/v1/customer/registration`;

  const onboardingRequest = mapCustomerFormToOnboardingRequest(formValues);
  const fd = new FormData();

  if (formValues.kycPoi) fd.append("poiDocFile", formValues.kycPoi);
  if (formValues.kycPoa) fd.append("poaDocFile", formValues.kycPoa);

  fd.append(
    "onboardingRequest",
    new Blob([JSON.stringify(onboardingRequest)], { type: "application/json" })
  );

  const headers: Record<string, string> = {
    Authorization: `Bearer ${user?.accessToken || ""}`,
  };

  const res = await fetch(url, { method: "POST", headers, body: fd });

  // Try to parse JSON either way
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  // HTTP error → throw server message if present
  if (!res.ok) {
    const msg =
      json?.statusMessage ||
      json?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // HTTP 200 but backend reports FAILURE
  if (json?.status && json.status !== "SUCCESS") {
    throw new Error(json.statusMessage || "Operation failed");
  }

  return json;
}



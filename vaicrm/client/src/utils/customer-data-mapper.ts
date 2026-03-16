// src/utils/customer-data-mapper.ts
import { InsertCustomer } from "@shared/schema";
import { Customer as CustomerApiData } from "@/types/customer";

export type CustomerFormData = InsertCustomer;

/**
 * Maps the API response for a customer to the data structure needed by the form.
 * This is crucial for pre-populating the form in "edit" mode.
 */
export function mapCustomerApiToFormData(apiData: CustomerApiData): Partial<CustomerFormData> {
  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return undefined;
    try {
      if (/^\d{8}$/.test(dateStr)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
      return new Date(dateStr).toISOString();
    } catch {
      return undefined;
    }
  };

  const normalize = (val: any): string => {
    return String(val ?? "").trim().toLowerCase();
  };

  // 1. Prepare Installation City (Name + Code)
  let cityInstValue = apiData.cityInst || "";
  if (apiData.cityInst && (apiData.cityCodeInst || apiData.cityCode)) {
    const code = apiData.cityCodeInst || apiData.cityCode;
    cityInstValue = `${apiData.cityInst}_${code}`;
  }

  // 2. Prepare Billing City (Name + Code)
  let billingCityValue = apiData.city || "";
  if (apiData.city && apiData.cityCode) {
    billingCityValue = `${apiData.city}_${apiData.cityCode}`;
  }

  // ✅ NEW: Extract city names for comparison
  const extractCityName = (city?: string | null): string => {
    if (!city) return "";
    const parts = String(city).split("_");
    return parts[0] || String(city);
  };

  const instCityName = extractCityName(apiData.cityInst) || extractCityName(apiData.city) || "";
  const billCityName = extractCityName(apiData.city) || "";

  // ✅ NEW: Intelligently determine if billing = installation
  const isSameAddress = 
    (apiData.countryInst || apiData.country) === (apiData.country || "") &&
    (apiData.regionInst || apiData.region) === (apiData.region || "") &&
    extractCityName(cityInstValue) === extractCityName(billingCityValue) &&
    (apiData.districtInst || apiData.district) === (apiData.district || "") &&
    (apiData.wardInst || apiData.ward) === (apiData.ward || "") &&
    (apiData.address1Inst || apiData.address1) === (apiData.address1 || "") &&
    (apiData.address2Inst || apiData.address2 || "") === (apiData.address2 || "") &&
    (apiData.postalCodeInst || apiData.postalCode || "") === (apiData.postalCode || "");

  const formData: Partial<CustomerFormData> = {
    // General
    customerType: apiData.customerType ?? undefined,
    newOrExisting: apiData.customerStatus ?? "",
    division: apiData.division ?? undefined,
    accountClass: apiData.accountClass ?? undefined,
    noOfRooms: apiData.noOfRooms ? String(apiData.noOfRooms) : "",
    smsFlag: apiData.smsFlag === 'Y',
    agentSapBpId: (apiData as any).agentSapBpId ?? (apiData as any).parentBpId ?? "",
    parentSapBpId: apiData.parentBpId ?? "",
    
    // Personal
    title: (apiData.salutation || apiData.title) ?? "",
    firstName: apiData.firstName ?? "",
    middleName: apiData.middleName ?? "",
    lastName: apiData.lastName ?? "",
    gender: apiData.gender ?? "",
    race: apiData.race ?? "",
    dateOfBirth: formatDateForInput(apiData.dob),
    phone: apiData.phone ?? "",
    mobile: apiData.mobile ?? "",
    email: apiData.email ?? "",
    altPhone: apiData.altPhone ?? "",
    altEmail: apiData.altEmail ?? "",
    fax: apiData.fax ?? "",
    orgName: apiData.orgName ?? "",

    // Address
    addressType: 'Installation',
    countryInst: apiData.countryInst ?? apiData.country ?? "",
    regionInst: apiData.regionInst ?? apiData.region ?? "",
    cityInst: instCityName ? `__MATCH__${instCityName}` : "",
    districtInst: apiData.districtInst ?? apiData.district ?? "",
    wardInst: apiData.wardInst ?? apiData.ward ?? "",
    address1Inst: apiData.address1Inst ?? apiData.address1 ?? "",
    address2Inst: apiData.address2Inst ?? apiData.address2 ?? "",
    postalCodeInst: apiData.postalCodeInst ?? apiData.postalCode ?? "",

    sameAsInstallation: isSameAddress,
    
    billingCountry: apiData.country ?? "",
    billingRegion: apiData.region ?? "",
    billingCity: billCityName ? `__MATCH__${billCityName}` : "",
    billingDistrict: apiData.district ?? "",
    billingWard: apiData.ward ?? "",
    billingAddress1: apiData.address1 ?? "",
    billingAddress2: apiData.address2 ?? "",
    billingPostalCode: apiData.postalCode ?? "",

    // Service
    salesOrg: apiData.salesOrg ?? "",
    azamPayId: apiData.azamPesaId ?? "",
    azamMaxTvId: apiData.azamMaxTv ?? "",

    // Financial & Tax
    currency: apiData.currency ?? "",
    tinName: (apiData as any).tinName ?? "",
    ctinNumber: apiData.tin ?? "",
    cvrnNumber: apiData.vrn ?? "",

    // KYC
    kycDocNoPOI: (apiData as any).kycDocNoPOI ?? (apiData as any).poiDocNo ?? "",
    kycDocNoPOA: (apiData as any).kycDocNoPOA ?? (apiData as any).poaDocNo ?? "",
  };
  
  (formData as any).poiDocPath = (apiData as any)?.poiDocPath ?? "";
  (formData as any).poaDocPath = (apiData as any)?.poaDocPath ?? "";
  (formData as any)._instCityName = instCityName;
  (formData as any)._billCityName = billCityName;
  (formData as any)._originalBillingDistrict = apiData.district;
  (formData as any)._originalBillingWard = apiData.ward;
  
  return formData;
}
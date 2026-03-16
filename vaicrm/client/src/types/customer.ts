// src/types/customer.ts

// This interface is based on the actual API response for GET /crm/v1/get/Customer
// It is more detailed than the one in @shared/schema and should be used in the UI.
export interface Customer {
  custId: number;
  onbId?: string | null;
  salutation?: string | null;
  title?: string | null; // Often used as an alias for salutation in forms
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  fax?: string | null;
  altPhone?: string | null;
  altMobile?: string | null;
  altEmail?: string | null;
  currency?: string | null;
  customerType?: string | null;
  serviceType?: string | null;
  accountClass?: string | null;
  connectionType?: string | null;
  division?: string | null;
  salesOrg?: string | null;
  noOfRooms?: number | string | null;
  dob?: string | null; // API sends it as YYYYMMDD string
  gender?: string | null;
  race?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  ward?: string | null;
  address1?: string | null;
  address2?: string | null;
  postalCode?: string | null;
  azamPesaId?: string | null;
  azamMaxTv?: string | null;
  tin?: string | null;
  vrn?: string | null;
  customerStage?: string | null;
  status?: string | null;
  statusMsg?: string | null;
  remark?: string | null;
  cmStatus?: string | null;
  cmStatusMsg?: string | null;
  cmErrorReason?: string | null;
  cmStatusCode?: string | null;
  sapBpId?: string | null;
  sapCaId?: string | null;
  poiDocId?: string | null;
  poiDocNo?: string | null;
  poiDocPath?: string | null;
  poaDocId?: string | null;
  poaDocNo?: string | null;
  poaDocPath?: string | null;
  parentBpId?: string | null;
  latId?: string | null;
  longId?: string | null;
  smsFlag?: 'Y' | 'N' | null;
  createId?: string | null;
  createTs?: string | null;
  createDt?: string | null;
  updateId?: string | null;
  updateTs?: string | null;
  updateDt?: string | null;
  name?: string | null;
  customerStatus?: string | null;
  orgName?: string | null; // Add if it's part of your schema/form
  cityInst?: string | null;
  districtInst?: string | null;
  wardInst?: string | null;
  address1Inst?: string | null;
  address2Inst?: string | null;
  postalCodeInst?: string | null;
  cityCodeInst?: string | null;
  countryInst?: string | null;
  cityCode?: string | null;
  regionInst?: string | null;
  userName?: string | null;
}
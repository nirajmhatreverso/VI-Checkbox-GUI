// === API CLIENT ===

import { apiRequest } from "./queryClient";
import { buildApiUrl, getApiConfig } from "./config";

// Types
import type {
  Agent,
  AgentHwPaymentInitiate,
  AgentHwPaymentApproval,
  AgentHwPaymentSearch,
  Customer, // Make sure Customer is imported
} from "@shared/schema";

// Shared API response types
export interface ApiResponse {
  status: string;
  statusMessage?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalRecordCount: number;
  status?: string;
  statusMessage?: string;
}

// === BASE API CLIENT ===
class BaseApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiConfig().baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    let fullUrl = buildApiUrl(endpoint, this.baseUrl);

    if (params) {
      const url = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
      fullUrl = url.toString();
    }

    return apiRequest(fullUrl, method, data);
  }

  protected get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, params);
  }
  protected post<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    return this.request<T>("POST", endpoint, data, params);
  }
  protected put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>("PUT", endpoint, data);
  }
  protected patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>("PATCH", endpoint, data);
  }
  protected delete<T>(endpoint: string): Promise<T> {
    return this.request<T>("DELETE", endpoint);
  }
}

// ================== MODULE CLIENTS ==================

// --- AGENTS ---
export interface AgentListResponse {
  data: Agent[];
  totalRecordCount: number;
  status?: string;
  statusMessage?: string;
}

export class AgentApiClient extends BaseApiClient {
  async searchAgents(filter: any): Promise<AgentListResponse> {
    const res = await this.post<any>("/agents/search-filter", filter); // Use the correct endpoint
    return {
      data: (res as any)?.data?.agentDetails ?? [],
      totalRecordCount: (res as any)?.data?.totalRecordCount ?? 0,
      status: res.status,
      statusMessage: res.statusMessage,
    };
  }

  async searchFilter(filter: any): Promise<ApiResponse> {
    return this.post<ApiResponse>("/agents/search-filter", filter);
  }

  async fetch(filter: any): Promise<any> {
    return this.post<any>("/agents/fetch", filter);
  }
  // NEW METHOD TO FETCH AGENTS FOR THE DROPDOWN
  async fetchAllAgentsForSelection(params: { salesOrg: string, division: string }): Promise<any> {
    return this.post<any>("/crm/v1/fetch/agentsFilter", {
      salesOrg: params.salesOrg,
      division: params.division,
      status: "APPROVED" // Assuming we only want approved agents
    });
  }

  async verifyParent(filter: any): Promise<ApiResponse> {
    return this.post<ApiResponse>("/agents/verify-parent", filter);
  }

  async approve(
    onbId: string,
    action: "APPROVED" | "REJECTED",
    remarks?: string,
    reason?: string
  ): Promise<ApiResponse> {
    return this.post<ApiResponse>("/agents/kyc-action", { // The BFF endpoint is kyc-action
      onbId,
      agentStage: action,
      remark: remarks,
      reason: reason,
    });
  }

  async create(agentData: FormData): Promise<ApiResponse> {
    // For FormData, we call apiRequest directly
    return apiRequest("/agents/registration", "POST", agentData);
  }

  async update(payload: { newData: any; oldData: Agent; isPostApproval: boolean }): Promise<ApiResponse> {
    const { newData, isPostApproval } = payload;
    if (isPostApproval) {
      // Post-approval updates are JSON and go to a different endpoint
      return apiRequest("/agents/details/update", "PUT", newData);
    } else {
      // Pre-approval updates are FormData
      return apiRequest("/agents/registration/update", "POST", newData);
    }
  }


  async retryAgent(onbId: number | string): Promise<ApiResponse> {
    return this.post<ApiResponse>("/agents/retry", { onbId });
  }
  async fetchAuditLogs(onbId: string): Promise<any> {
    // This is a GET request with a path parameter, so build the path correctly.
    return this.get<any>(`/agents/audit-logs/${onbId}`);
  }
}

// Singleton
export const agentApi = new AgentApiClient();

// --- PAYMENTS ---
export interface PaymentInitiateResponse {
  sapBpId: string;
  transactionId: string;
  message: string;
}

export interface PaymentApprovalResponse {
  sapBpId: string;
  transactionId: string;
  message: string;
}

export interface PaymentDetailsResponse {
  totalCount: number;
  agentHwPaymentDetails: any[];
}

export class AgentPaymentApiClient extends BaseApiClient {
  async initiate(
    body: AgentHwPaymentInitiate
  ): Promise<ApiResponse & { data?: PaymentInitiateResponse }> {
    return this.post<ApiResponse>(
      "/payments/v1/hw/paymentInitiate",
      body
    );
  }

  async approve(
    body: AgentHwPaymentApproval & { reason?: string }
  ): Promise<ApiResponse & { data?: PaymentApprovalResponse }> {
    return this.post<ApiResponse>(
      "/payments/v1/agents/hw/paymentApproval",
      body
    );
  }

  async list(
    body: AgentHwPaymentSearch
  ): Promise<ApiResponse & { data?: PaymentDetailsResponse }> {
    return this.post<ApiResponse>(
      "/crm/v1/fetch/hw/paymentDetails",
      body
    );
  }
}

// Singleton
export const agentPaymentApi = new AgentPaymentApiClient();

// --- CUSTOMERS ---
export interface CustomerListResponse {
  data: Customer[];
  totalCount: number;
}

export class CustomerApiClient extends BaseApiClient {
  async listCustomers(payload: {
    [key: string]: any;
  }): Promise<CustomerListResponse> {
    const res = await this.post<any>("/crm/v1/get/Customer", payload);
    return {
      data: res?.data?.data ?? [],
      totalCount: res?.data?.totalRecordCount ?? 0,
    };
  }

  async createCustomer(payload: FormData): Promise<ApiResponse> {
    return apiRequest("/crm/v1/customer/registration", "POST", payload);
  }

  async updateCustomerPreApproval(payload: FormData): Promise<ApiResponse> {
    return apiRequest("/crm/v1/customer/registration/update", "POST", payload);
  }

  async updateCustomerPostApproval(payload: any): Promise<ApiResponse> {
    return apiRequest("/crm/v1/customer/update", "PUT", payload);
  }

  async approveCustomer(custId: string | number, remark?: string, reason?: string) {
    return this.post<ApiResponse>("/crm/v1/customer/approve", {
      custId: String(custId),
      customerStage: "APPROVED",
      remark: remark || "",
      reason: reason,
    });
  }

  async rejectCustomer(custId: string | number, remark?: string, reason?: string) {
    return this.post<ApiResponse>("/crm/v1/customer/approve", {
      custId: String(custId),
      customerStage: "REJECTED",
      remark: remark || "",
      reason: reason,
    });
  }

  async retryCustomer(custId: string | number): Promise<ApiResponse> {
    // Points to BFF route /api/customers/retry defined in customer.controller.tsx
    return apiRequest("/customers/retry", "POST", { custId: String(custId) });
  }

  async fetchAuditLogs(onbId: string): Promise<any> {
    return this.post<any>("/crm/v1/fetch/userAudit", {
      requestTnxId: onbId,
      type: "CUSTOMER",
      offSet: 0,
      limit: 100,
    });
  }
  async fetchCustomerBalance(payload: { sapBpId: string; sapCaId: string;currency?: string; }): Promise<any> {
    return this.post<any>("/customer-sub-payments/balance", payload);
  }

  async searchCustomersByUserDetails(payload: any): Promise<any> {
    return this.post<any>("/agents/user-details", payload);
  }
  async resetPassword(payload: { 
    userName: string; 
    email: string; 
    name: string; 
  }) {
    return apiRequest("/customers/reset-password", "POST", payload);
  }
}

export const customerApi = new CustomerApiClient();


// --- CUSTOMER PAYMENTS ---
export class CustomerPaymentApiClient extends BaseApiClient {
  async searchCustomers(filter: any): Promise<any> {
    return this.post<any>("/customers/search", filter);
  }

  async fetchBalanceBySapBpId(sapBpId: string, salesOrg?: string,currency?: string ): Promise<{ balance: number; currency?: string; message?: string }> {
    const res = await this.post<any>("/customers/balance", { sapBpId, salesOrg: salesOrg || "",currency: currency });
    return { balance: res?.data?.balance ?? 0, currency: res?.data?.currency, message: res?.data?.message };
  }

  async fetchStoreLocations(plantNumber: string): Promise<any> {
    return this.post<any>("/data/store-locations", { type: "OTC", plantNumber });
  }

  async fetchCollectedBy(storeLocationName: string, plantNumber: string): Promise<any> {
    return this.post<any>("/data/collected-by", { type: ["OTC"], storeLocationName, plantNumber });
  }

  async initiatePayment(payload: any): Promise<any> { return this.post<any>("/payments/v1/hw/paymentInitiate", payload); }

  async approvePayment(payload: { sapBpId: string; transId: string; description: string; status: "APPROVED" | "REJECTED" }) { return this.post<any>("/payments/v1/agents/hw/paymentApproval", payload); }

  async fetchPayments(params: any = {}): Promise<any> { return this.post<any>("/crm/v1/fetch/hw/paymentDetails", { isSpecificTransaction: "Y", limit: 100, offSet: 0, type: "CUSTOMER", ...params }); }

  async createAdjustment(payload: any): Promise<any> {
    return apiRequest("/customer-payments/adjustment", "POST", payload);
  }

  async fetchAdjustmentDetails(payload: any): Promise<any> {
    return apiRequest("/customer-payments/adjustmentDetails", "POST", payload);
  }

  async approveAdjustment(payload: any): Promise<any> {
    return apiRequest("/customer-payments/adjustment/approval", "POST", payload);
  }
}

export const customerPaymentApi = new CustomerPaymentApiClient();

// --- AGENT HW SALE (NEW) ---
function getUsernameHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("azam-user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const username = parsed?.username || "";
    return username ? { "x-auth-username": username } : {};
  } catch {
    return {};
  }
}

export interface HwOrderDetailsRequest {
  requestId?: string | null;
  sapBpId?: string | null;
  module?: 'AGENT' | 'CUSTOMER';
  fromDate?: string | null;
  toDate?: string | null;
  status?: string | null; // INPROCESS/APPROVED/REJECTED/PENDING or null for ALL
  offSet?: number;
  limit?: number;
}
export interface HwOrderDetailsResponse {
  status?: string;
  statusMessage?: string;
  data?: {
    totalCount?: number;
    hwOrderDetails?: any[];
  };
}
export interface HwProductsResponse {
  status?: string;
  statusMessage?: string;
  data?: {
    priceTypes?: string[];
    hwProductDetails?: any[];
  };
}

// --- HARDWARE SALE (Common APIs) ---
export interface HwOrderDetailsRequest {
  requestId?: string | null; sapBpId?: string | null; module?: 'AGENT' | 'CUSTOMER';
  fromDate?: string | null; toDate?: string | null; status?: string | null; offSet?: number; limit?: number;
}
export class HardwareSaleApiClient extends BaseApiClient {
  async fetchPlants(): Promise<any> { return this.get<any>("/inventory/plants"); }
  async fetchHwProducts(body: { type: 'AGENT' | 'CUSTOMER' }): Promise<any> { return this.post<any>("/inventory/hw-products", body); }
  async fetchOrderDetails(body: HwOrderDetailsRequest): Promise<any> { return this.post<any>("/hardware-sales/details", body); }
  async uploadSerialNumbersFile(formData: FormData): Promise<ApiResponse> { return apiRequest("/hardware-sales/upload-serials", "POST", formData); }
  async fetchStoreLocationsByPlant(plantId: string): Promise<any> { return this.get<any>(`/inventory/store-locations/${plantId}`); }
  async getStbHwDetails(payload: { sapBpId: string; module: 'AGENT' | 'CUSTOMER' }) { return this.post<any>("/hardware-sales/stb-details", payload); }
}
export const hardwareSaleApi = new HardwareSaleApiClient();



export class AgentHwSaleApiClient extends BaseApiClient {
  async fetchPlants(): Promise<any> {
    return apiRequest("/inventory/plants", "GET");
  }
  async fetchHwProducts(): Promise<any> {
    return apiRequest("/inventory/hw-products", "POST", { type: "AGENT" });
  }
  async fetchBalance(payload: { salesOrg: string; sapBpId: string ;currency?: string;}): Promise<any> {
    return apiRequest("/hardware-sales/balance", "POST", payload);
  }
  async createSaleOrder(payload: any): Promise<any> {
    return apiRequest('/hardware-sales/orders', 'POST', payload);
  }
  async fetchOrderDetails(body: HwOrderDetailsRequest): Promise<HwOrderDetailsResponse> {
    return apiRequest("/hardware-sales/details", "POST", body);
  }
  async approveSaleOrder(body: any): Promise<any> {
    return apiRequest('/hardware-sales/approve', 'POST', body);
  }

  async getStbHwDetails(payload: { sapBpId: string; module: 'AGENT' | 'CUSTOMER' }) {
    return apiRequest("/crm/v1/stbHwDetails", "POST", payload);
  }

  async fetchStoreLocationsByPlant(plantId: string): Promise<any> {
    // API appears to be GET with a path param, not POST
    return apiRequest(`/inventory/store-locations-by-plant/${plantId}`, "GET");
  }

  async uploadSerialNumbersFile(formData: FormData): Promise<ApiResponse> {
    const response = await fetch('/api/hardware-sales/upload-serials', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw result;
    return result;
  }
}

export const agentHwSaleApi = new AgentHwSaleApiClient();

// --- CUSTOMER HW SALE (NEW) ---
export class CustomerHwSaleApiClient extends BaseApiClient {
  async createSaleOrder(payload: any): Promise<any> { return this.post<any>("/hardware-sales/customer/orders", payload); }

  async approveSaleOrdera(body: { requestId: string; sapBpId: string; status: "APPROVED" | "REJECTED"; remark?: string; reason?: string; }): Promise<any> {
    return this.post<any>("/hardware-sales/customer/approve", body);
  }
}

export const customerHwSaleApi = new CustomerHwSaleApiClient();

// --- CUSTOMER SUBSCRIPTION PAYMENT (NEW) ---
export class CustomerSubPaymentApiClient {
  async initiatePayment(payload: any): Promise<any> {
    return apiRequest("/payments/v1/paymentSub/paymentInitiate", "POST", payload, { "Content-Type": "application/json", ...getUsernameHeader() });
  }

  async approvePayment(payload: { sapBpId: string; transId: string; status: "APPROVED" | "REJECTED"; description: string; reason: string }): Promise<any> {
    return apiRequest("/payments/v1/customerSub/paymentApproval", "POST", payload, { "Content-Type": "application/json", ...getUsernameHeader() });
  }
}
export const customerSubPaymentApi = new CustomerSubPaymentApiClient();

export class CustomerCmApiClient extends BaseApiClient {
  async search(payload: {
    sapBpId?: string | null;
    mobile?: string | null;
    macId?: string | null;
    salesOrg?: string;
  }) {
    return this.post<any>("/crm/v1/cm/customers", payload);
  }

  async getSubscriptionDetails(payload: {
    sapBpId: string;
    sapCaId: string;
    contractNo: string | null; // Allow null
    salesOrg?: string;
  }) {
    // If contractNo is null/empty, send it as is. Otherwise, pad it.
    const finalContractNo = payload.contractNo ? payload.contractNo.padStart(20, '0') : "";

    return this.post<any>("/crm/v1/cm/subscription", {
      ...payload,
      contractNo: finalContractNo,
      salesOrg: payload.salesOrg || "Azam Media Ltd",
    });
  }

  async getServiceDetails(payload: {
    sapBpId: string;
    fromDate: string;
    toDate: string;
    offSet?: string;
    limit?: string;
  }) {
    return this.post<any>("/crm/v1/serviceDetails", {
      offSet: "0",
      limit: "100", // Fetch up to 100 records
      ...payload
    });
  }

  async getPlanDetails(payload: { category: string, salesOrg: string, division: string }): Promise<any> {
    return this.post<any>("/crm/v1/planDetails", payload);
  }


  async purchaseSubscription(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/purchase", payload);
  }

  async lockUnlockSubscription(payload: {
    sapBpId: string;
    sapCaId: string;
    sapContractId: string;
    reason: string;
    actionType: "LOCK" | "UNLOCK";
  }): Promise<any> {
    return this.post<any>("/crm/v1/subscription/lockUnlock", payload);
  }
  async planChange(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/planChange", payload);
  }
  async offerChange(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/offerChange", payload);
  }

  async terminateSubscription(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/termination", payload);
  }
  async retrackSubscription(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/retrack", payload);
  }
  async toggleAutoRenewal(payload: any): Promise<any> {
    return this.post<any>("/crm/v1/subscription/autoRenewal", payload);
  }
  async getProvisioningDetails(payload: {
    smartCardNo: string;
  }): Promise<any> {
    return this.post<any>("/crm/v1/provisioning", payload);
  }

  async extendValidity(payload: {
    sapBpId: string;
    sapCaId: string;
    sapContractId: string;
    productId: string;
    salesOrg: string;
    division: string;
    stbNo: string;
    smartCardNo: string;
    endDate: string;
  }): Promise<any> {
    return this.post<any>("/crm/v1/subscription/extension", payload);
  }

  async renewSubscription(payload: {
    sapBpId: string;
    sapCaId: string;
    sapContractId: string;
    salesOrg: string;
    division: string;
    currency: string;
    amount: string;
    noOfDuration: string;
  }): Promise<any> {
    return this.post<any>("/crm/v1/subscription/renewal", payload);
  }

  async cancelSchedule(payload: { sapBpId: string; requestId: string }): Promise<any> {
    return this.post<any>("/crm/v1/subscription/schedule", payload); // This hits the BFF route which proxies to Java
  }
}

export const customerCmApi = new CustomerCmApiClient();

// ✅ NEW ONBOARDING API CLIENT
export class OnboardingApiClient extends BaseApiClient {
  async getDropdowns(): Promise<ApiResponse> {
    return apiRequest("/dropdowns/onboarding", "GET");
    //return this.get<ApiResponse>("/crm/v1/onboarding/dropdowns");
  }
  async fetchConfig(configKey: string = ""): Promise<ApiResponse> {
    return apiRequest("/dropdowns/config", "POST", { configKey });
  }
}
export const onboardingApi = new OnboardingApiClient();

export interface AgentStockUpdatePayload {
  consignmentStockDetailsList: Array<{
    sapBpId: string;
    deviceSerialNo: string;
    currentStatus: string;
    newStatus: string;
  }>;
}

export class StockApiClient extends BaseApiClient {
  async fetchDetails(params: {
    plant: string | null;
    material: string | null;
    storageLocation: string | null;
    // The API doesn't seem to use these, but keeping for future-proofing if needed
    // country: string | null; 
    // status: string | null;
    // limit: number;
    // offset: number;
  }): Promise<ApiResponse> {
    // The API seems to only require plant, material, and storageLocation.
    const payload = {
      plant: params.plant,
      material: params.material,
      storageLocation: params.storageLocation,
    };
    return this.post<ApiResponse>("/crm/v1/stockDetails", payload);
  }

  async fetchAgentStockFilter(payload: {
    sapBpId: string;
    deviceSerialNo?: string;
    material?: string;
    deviceName?: string;
    status?: string;
    offSet?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    // Calling the new route defined in agent-stock.controller.ts
    return apiRequest("/agent-stock/search-filter", "POST", payload);
  }
  async fetchStatusConfig(): Promise<ApiResponse> {
    return apiRequest("/agent-stock/status-config", "POST", {
      configKey: "AGENT_STOCK_STATUS_UPDATE"
    });
  }

  /**
   * Updates the status of agent stock items.
   * @param payload - Contains list of stock items with current and new status
   */
  async updateAgentStock(payload: AgentStockUpdatePayload): Promise<ApiResponse> {
    return apiRequest("/agent-stock/update", "POST", payload);
  }
}

export const stockApi = new StockApiClient();

export class AgentReplacementApiClient extends BaseApiClient {
  async createReplacement(payload: any): Promise<ApiResponse> {
    return apiRequest("/agent-replacement/create", "POST", payload);
  }

  async searchReplacements(payload: any): Promise<ApiResponse> {
    return apiRequest("/agent-replacement/filter", "POST", payload);
  }

  async approveReplacement(payload: any): Promise<ApiResponse> {
    return apiRequest("/agent-replacement/approve", "POST", payload);
  }
  async fetchReasonConfig(): Promise<ApiResponse> {
    // Use apiRequest directly - it already prepends /api
    return apiRequest("/agent-replacement/reason-config", "POST", {
      configKey: "AGENT_REPLACEMENT_REASON"
    });
  }
}

export const agentReplacementApi = new AgentReplacementApiClient();

export { apiRequest };

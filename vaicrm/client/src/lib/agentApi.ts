import { Agent } from '@/components/agents/agents-data-grid';
import { apiRequest } from '../lib/queryClient';
export const agentApi = {

  async searchFilter(body: Record<string, any>) {
    return apiRequest('/agents/search-filter', 'POST', body);
  },

  async fetch(body: Record<string, any>) {
    return apiRequest('/agents/fetch', 'POST', body);
  },

  async create(formData: FormData) {
    return apiRequest('/agents/registration', 'POST', formData);
  },

  async update({ newData, oldData, isPostApproval }: { newData: any, oldData: Agent, isPostApproval: boolean }) {
    if (isPostApproval) {
      // POST-APPROVAL: Build the specific JSON payload for the BFF here.
      const phoneChanged = (newData.phone || "") !== (oldData.phone || "");
      const mobileChanged = (newData.mobile || "") !== (oldData.mobile || "");
      const emailChanged = (newData.email || "") !== (oldData.email || "");
      const address1Changed = (newData.address1 || "") !== (oldData.addressOne || "");
      const address2Changed = (newData.address2 || "") !== (oldData.addressTwo || "");

      if (![phoneChanged, mobileChanged, emailChanged, address1Changed, address2Changed].some(Boolean)) {
        // Throw an error that the mutation can catch
        throw { status: 400, statusMessage: "At least one of Phone, Mobile, Email, Address1 or Address2 must be changed to update." };
      }

      const payload = {
        onbId: oldData.onbId, sapBpId: oldData.sapBpId, sapCaId: oldData.sapCaId,
        phone: phoneChanged ? newData.phone : "", oldPhone: phoneChanged ? oldData.phone || "" : "",
        mobile: mobileChanged ? newData.mobile : "", oldMobile: mobileChanged ? oldData.mobile || "" : "",
        email: emailChanged ? newData.email : "", oldEmail: emailChanged ? oldData.email || "" : "",
        address1: address1Changed ? newData.address1 : "", oldAddress1: address1Changed ? oldData.addressOne || "" : "",
        address2: address2Changed ? newData.address2 : "", oldAddress2: address2Changed ? oldData.addressTwo || "" : "",
      };

      return apiRequest('/agents/details/update', 'PUT', payload);

    } else {
      // PRE-APPROVAL: The payload is already a FormData object from the component.
      const formData = newData as FormData;
      return apiRequest('/agents/registration/update', 'POST', formData);
    }
  },

  async approve(onbId: string, stage: 'APPROVED' | 'REJECTED', remarks: string, reason: string) {
    return apiRequest('/agents/kyc-action', 'POST', { onbId, stage, remarks, reason });
  },

  async previewKyc(body: { userType: string; fileType: "POA" | "POI"; id: number }) {
    return apiRequest('/agents/preview-kyc', 'POST', body);
  },

  async downloadKyc(body: { userType: string; fileType: "POA" | "POI"; id: number }) {
    return apiRequest('/agents/download-kyc', 'POST', body);
  },

  async fetchAuditLogs(payload: { requestTnxId: string; type: string; offSet: number; limit: number }) {
    return apiRequest('/agents/audit-logs', 'POST', payload);
  },

  async verifyParent(filter: Record<string, any>) {
    return apiRequest('/agents/verify-parent', 'POST', filter);
  },

  async retryAgent(agentId: number) {
    return apiRequest('/agents/retry', 'POST', { agentId });
  },
  async searchUserDetails(payload: {
    type: string;
    salesOrg: string;
    isSubCollection: string;
    mobile?: string;
    sapBpId?: string;
    region?: string;
    city?: string;
  }) {
    return apiRequest('/agents/user-details', 'POST', payload);
  },
  async subAgentSearch(payload: {
    name: string;
    mobile: string;
    onbId: string;
    country: string;
    city: string;
    region: string;
  }) {
    return apiRequest('/agents/sub-agent-search', 'POST', payload);
  },
  async resetPassword(payload: {
    userName: string;
    email: string;
    name: string;
  }) {
    return apiRequest('/agents/reset-password', 'POST', payload);
  },
  async subAgentStockTransfer(payload: any) {
    return apiRequest('/agents/subAgentStockTransfer', 'POST', payload);
  },
  async subAgentToAgentStockTransfer(payload: any) {
    return apiRequest('/agents/subAgentToAgentStockTransfer', 'POST', payload);
  },
};
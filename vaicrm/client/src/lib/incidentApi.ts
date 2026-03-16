// client/src/lib/incidentApi.ts
import { apiRequest } from "./queryClient";


export interface SlaGeneratePayload {
  hours: number;
}

export interface SlaGenerateResponse {
  [x: string]: any;
  newDate: string;
  newTime: string;
}

export interface UserQueuesPayload {
  userName: string;
  queueName: string;
}

export interface CommonSelectionPayload {
  orgId?: string;
  type: string;
  title?: string;
  assignmentGroup?: string;
  commonRequests2busOrg?: string;
}

export interface CommonSelectionData {
  objId: number;
  type: string;
  label: string | null;
  category: string;
  subCategory: string;
  priority: string;
  title: string;
  assignmentGroup: string;
  configurationItem: string | null;
  description: string | null;
  commonRequests2busOrg: number;
}

export interface CommonSelectionResponse {
  traceId: string;
  spanId: string;
  status: string;
  statusCode: number;
  statusMessage: string;
  data: {
    data: CommonSelectionData[];
    totalRecordCount: number;
  };
}

export interface RegisterIncidentCloserPayload {
  closeTs: string;
  closeDate: string;
  resolvedTs: string;
  resolvedDate: string;
  downTime: number;
  isAutoClosed: number;
  summary: string;
  previousClosedTs: string | null;
  previousClosedDate: string | null;
  resolveFirstTime: number;
  assetReference: string | null;
  kbReference: number | null;
  lastClose2case: number | null;
  closer2user: string;
  closeCase2actEntry: number;
  closeResolution: string;
  closeCriteria: string;
}

export interface IncidentCloserResponse {
  status: string;
  statusCode: number;
  statusMessage: string;
  data: {
    closerId: number;
    message: string;
  };
}

export interface RegisterNotesLogPayload {
  createId: string;
  type: string;
  description: string;
  isInternal: number;
  notesOwner2User: string;
  notes2Incident: string;
  notes2SubIncident: null;
  notes2ServiceRequest: null;
  notes2WorkOrder: null;
  notes2Workaround: null;
  notes2ChangeRequest: null;
  notes2Problem: null;
}

export interface RegisterActivityEntryPayload {
  createId: string;
  type: string;
  addnlInfo: string;
  actEntry2User: number;
  actEntry2Incident: string;
  actEntry2SubIncident: string;
  actEntry2ServiceRequest: number;
  actEntry2WorkOrder: number;
  actEntry2NotesLog: number;
  actEntry2PhoneLog: number;
  actEntry2EmailLog: number;
  actEntry2Workaround: number;
  actEntry2ChangeRequest: number;
  actEntry2Problem: number;
}

export interface RegisterTicketPayload {
  objId?: number;
  idNumber: string;
  title: string;
  createDt?: string;
  createTs?: string;
  updateDt?: string | null;
  updateTs?: string | null;
  phoneNum?: string;
  altPhoneNum?: string;
  incidentContact?: string;
  altContact?: string;
  incidentLocation?: string;
  altLocation?: string;
  caseHistory: string;
  incidentClient?: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  agentSapBpId?: string;
  commonFault?: string;
  assetRefNumber?: string;
  assetType?: string;
  assetTag?: string;
  assetNumber?: string;
  assetDescription?: string;
  targetResolveDt: string;
  targetResolveTs: string;
  firstResponseDt: string | null;
  firstResponseTs: string | null;
  firstCallResolution: number;
  incidentCatagory?: string | number;
  incidentSubcatagory?: string | number;
  incidentCategoryName?: string;
  incidentSubCategoryName?: string;
  incidentChannel?: string | number;
  incidentPriority?: string | number;
  incidentSeverity?: string | number;
  incidentStatus?: string | number;
  assignmentGroup?: string;
  incidentPrevq2queue?: number;
  incidentCurrq2queue?: string | number;
  incidentFirstq2queue?: string | number;
  incidentOwner2user?: string | number;
  incidentReporter2user?: string | number;
  incidentOriginator2user?: string | number;
  incidentReporter2busOrg?: number;
  incidentReporter2site?: number | null;
  incidentReporter2customer?: string | number;
  incidentReporter2customerName?: string;
  sapBpId?: string;
  sapCaId?: string;
  contractNo?: string;
  parentIncident2incident: number | null;
  survey: number;
  slaColor?: string;
  sla?: string;
}

export interface NotesLogResponse {
  status: string;
  statusCode: number;
  statusMessage: string;
  data: any;
}

export interface IncidentFilterPayload {
  incidentId?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignmentGroup?: string;
  fromDate?: string;
  toDate?: string;
  offSet?: number;
  limit?: number;
}

export interface ActivityEntry {
  objId: number;
  createId: string;
  createDate: string;
  createTimestamp: string;
  type: string;
  addnlInfo: string;
  actEntry2UserName: string;
  actEntry2Incident: number | null;
  actEntry2SubIncident: number | null;
  actEntry2ServiceRequest: number | null;
  actEntry2WorkOrder: number | null;
  actEntry2NotesLog: number | null;
  actEntry2PhoneLog: number | null;
  actEntry2EmailLog: number | null;
  actEntry2Workaround: number | null;
  actEntry2ChangeRequest: number | null;
  actEntry2Problem: number | null;
  notesDescription: string | null;
  notesCreateTs: string | null;
}

export interface ActivityEntryFetchPayload {
  activityId?: number | null;
  type?: string | null;
  incidentId: string;
  user?: string | null;
  limit?: number;
  offset?: number;
}

export interface ActivityEntryFetchResponse {
  traceId: string;
  spanId: string;
  status: string;
  statusCode: number;
  statusMessage: string;
  data: {
    totalRecordCount: number;
    offSet: number;
    limit: number;
    data: ActivityEntry[];
  };
}

export interface CreateActivityEntryPayload {
  type: string;
  addnlInfo: string;
  incidentId: string;
  user?: string;
}

/**
 * Centralized API object for all ITSM/Incident operations.
 */
export const incidentApi = {
  /**
   * Fetch incidents with filters
   */
  fetch: async (filters: IncidentFilterPayload) => {
    return apiRequest('/itsm/fetch', 'POST', filters);
  },

  /**
   * Fetch tickets by customer BP ID
   */
  fetchByCustomer: async (customerBpId: string) => {
    const payload = {
      objId: null,
      title: null,
      idNumber: null,
      incidentReporter2customer: customerBpId
    };
    return apiRequest('/organization/tickets/fetch', 'POST', payload);
  },

  /**
   * Register/Create a new incident ticket
   */
  create: async (payload: RegisterTicketPayload) => {
    return apiRequest('/itsm/register/ticket', 'POST', payload);
  },

  /**
   * Get incident details by ID
   */
  getById: async (id: string | number) => {
    const idStr = String(id);
    const isNumeric = /^\d+$/.test(idStr);

    const payload = {
      objId: isNumeric ? Number(id) : null,
      title: null,
      idNumber: isNumeric ? null : idStr
    };

    const response = await apiRequest('/organization/tickets/fetch', 'POST', payload);

    if (response?.data?.data && Array.isArray(response.data.data)) {
      return { ...response, data: response.data.data[0] || null };
    }

    if (response?.data && Array.isArray(response.data)) {
      return { ...response, data: response.data[0] || null };
    }

    return response;
  },

  /**
   * Update an existing incident
   */
  update: async (id: string | number, payload: Partial<RegisterTicketPayload>) => {
    return apiRequest('/organization/tickets/update', 'POST', payload);
  },

  /**
   * Get SLA data for an incident
   */
  getSlaData: async (incidentId: string | number) => {
    return apiRequest(`/itsm/ticket/${incidentId}/sla`, 'GET');
  },

  /**
   * Fetch Common Selection based on Common Fault type
   * This API auto-populates category, subcategory, priority, assignmentGroup
   */
  fetchCommonSelection: async (payload: CommonSelectionPayload): Promise<CommonSelectionResponse> => {
    return apiRequest('/itsm/common-selection', 'POST', payload);
  },

  registerNotesLog: async (
    incidentNumber: string,
    description: string,
    username: string
  ): Promise<NotesLogResponse> => {
    const payload: RegisterNotesLogPayload = {
      createId: username,
      type: "INTERNAL",
      description: description,
      isInternal: 1,
      notesOwner2User: username,
      notes2Incident: incidentNumber,
      notes2SubIncident: null,
      notes2ServiceRequest: null,
      notes2WorkOrder: null,
      notes2Workaround: null,
      notes2ChangeRequest: null,
      notes2Problem: null
    };

    return apiRequest('/itsm/register/notes-log', 'POST', payload);
  },

  /**
   * Add work note/activity log to incident
   */
  addWorkNote: async (incidentId: string | number, note: string) => {
    return apiRequest(`/itsm/ticket/${incidentId}/worknote`, 'POST', { note });
  },

  /**
   * Fetch work notes/activity log for incident
   */
  getWorkNotes: async (incidentId: string | number) => {
    return apiRequest(`/itsm/ticket/${incidentId}/worknotes`, 'GET');
  },

  /**
   * Fetch Activity Entries for an Incident
   */
  getActivityEntries: async (payload: ActivityEntryFetchPayload): Promise<ActivityEntryFetchResponse> => {
    return apiRequest('/itsm/activity-entries', 'POST', {
      activityId: payload.activityId || null,
      type: payload.type || null,
      incidentId: payload.incidentId,
      user: payload.user || null,
      limit: payload.limit || 10,
      offset: payload.offset || 0
    });
  },

  /**
   * Create a new Activity Entry
   */
  createActivityEntry: async (payload: CreateActivityEntryPayload) => {
    return apiRequest('/itsm/activity-entries/create', 'POST', payload);
  },

  /**
   * Search users for assignment
   */
  searchUsers: async (query: string) => {
    return apiRequest('/itsm/users/search', 'POST', { query });
  },

  /**
   * Search assets/configuration items
   */
  searchAssets: async (query: string) => {
    return apiRequest('/itsm/assets/search', 'POST', { query });
  },

  /**
   * Get form dropdown options (categories, priorities, etc.)
   */
  getFormOptions: async () => {
    return apiRequest('/itsm/form-options', 'GET');
  },

  fetchUserQueues: async (payload: UserQueuesPayload) => {
    return apiRequest('/itsm/user-queues', 'POST', payload);
  },

  registerActivityEntry: async (
    incidentNumber: string,
    username: string,
    notesLogId?: number,
    type?: string,
    description?: string
  ): Promise<any> => {
    const payload: RegisterActivityEntryPayload = {
      createId: username,
      type: type || "INCIDENT_CREATED",
      addnlInfo: description || `Incident created with incident id ${incidentNumber}`,
      actEntry2User: 0,
      actEntry2Incident: incidentNumber,
      actEntry2SubIncident: "",
      actEntry2ServiceRequest: 0,
      actEntry2WorkOrder: 0,
      actEntry2NotesLog: notesLogId || 0,
      actEntry2PhoneLog: 0,
      actEntry2EmailLog: 0,
      actEntry2Workaround: 0,
      actEntry2ChangeRequest: 0,
      actEntry2Problem: 0
    };

    return apiRequest('/itsm/register/activity-entry', 'POST', payload);
  },

  registerIncidentCloser: async (
    payload: RegisterIncidentCloserPayload
  ): Promise<IncidentCloserResponse> => {
    return apiRequest('/itsm/register/incident-closer', 'POST', payload);
  },
  generateSla: async (hours: number): Promise<SlaGenerateResponse> => {
    const response = await apiRequest('/itsm/sla/generate', 'POST', { hours });
    return response?.data || response;
  },
};

export default incidentApi;
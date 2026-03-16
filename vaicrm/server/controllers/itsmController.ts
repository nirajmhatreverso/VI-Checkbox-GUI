// server/controllers/itsm.controller.ts
import { Request, Response, Router } from 'express';

// Helper to get the ITSM API base URL
const getItsmApiServiceUrl = (): string => {
  const apiUrl = process.env.INCIDENT_API_TARGET_URL || 'http://154.73.171.141:8086';
  return apiUrl.replace(/\/$/, '');
};

// Generic helper for proxying requests
async function proxyRequest(req: Request, res: Response, javaEndpoint: string, method: 'GET' | 'POST' | 'PUT', body?: any) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ statusMessage: 'Unauthorized' });
  }

  try {
    const API_URL = `${getItsmApiServiceUrl()}${javaEndpoint}`;
    const apiResponse = await fetch(API_URL, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...(body && { body: JSON.stringify(body) })
    });

    const data = await apiResponse.json();
    res.status(apiResponse.status).json(data);

  } catch (error: any) {
    res.status(500).json({ statusMessage: 'Internal Server Error' });
  }
}

export class ItsmController {
  /**
   * PROXY FOR: Fetching incidents with filters
   * POST /api/itsm/fetch
   */
  static async fetchIncidents(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/fetch/tickets`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();

      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Fetching Common Selection based on Common Fault
   * POST /api/itsm/common-selection
   */
  static async fetchCommonSelection(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/fetch/CommonSelection`;

      const payload = {
        orgId: req.body.orgId || "",
        type: req.body.type || "",
        title: req.body.title || "",
        assignmentGroup: req.body.assignmentGroup || "",
        commonRequests2busOrg: req.body.commonRequests2busOrg || ""
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to fetch common selection',
          data: null,
        });
      }

      res.status(200).json(responseBody);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while fetching common selection.',
      });
    }
  }

  static async registerIncidentCloser(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/register/IncidentCloser`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to register incident closer',
          data: responseBody,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'Incident closer registered successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while registering incident closer.',
      });
    }
  }

  static async registerNotesLog(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/register/NotesLog`;

      const payload = {
        createId: req.body.createId || null,
        type: "INTERNAL",
        description: req.body.description || null,
        isInternal: 1,
        notesOwner2User: req.body.notesOwner2User || null,
        notes2Incident: req.body.notes2Incident || null,
        notes2SubIncident: null,
        notes2ServiceRequest: null,
        notes2WorkOrder: null,
        notes2Workaround: null,
        notes2ChangeRequest: null,
        notes2Problem: null
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to register notes log',
          data: responseBody,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'Notes log registered successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while registering notes log.',
      });
    }
  }

  /**
   * PROXY FOR: Registering a new incident/ticket
   * POST /api/itsm/register/ticket
   */
  static async registerTicket(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/register/ticket`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to register ticket',
          data: responseBody,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'Ticket registered successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while registering ticket.',
      });
    }
  }

  /**
   * PROXY FOR: Getting ticket details by ID
   * GET /api/itsm/ticket/:id
   */
  static async getTicket(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ statusMessage: 'Ticket ID is required' });
    }

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/ticket/${id}`;

      const apiResponse = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Updating a ticket
   * PUT /api/itsm/ticket/:id
   */
  static async updateTicket(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ statusMessage: 'Ticket ID is required' });
    }

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/ticket/${id}`;

      const apiResponse = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Getting SLA data for a ticket
   * GET /api/itsm/ticket/:id/sla
   */
  static async getTicketSla(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    const { id } = req.params;

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/ticket/${id}/sla`;

      const apiResponse = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Adding work note to a ticket
   * POST /api/itsm/ticket/:id/worknote
   */
  static async addWorkNote(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    const { id } = req.params;

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/ticket/${id}/worknote`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Fetching Activity Entries for an Incident
   * POST /api/itsm/activity-entries
   */
  static async fetchActivityEntries(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/fetch/ActivityEntry`;

      const payload = {
        activityId: req.body.activityId || null,
        type: req.body.type || null,
        incidentId: req.body.incidentId || null,
        user: req.body.user || null,
        limit: req.body.limit || 10,
        offset: req.body.offset || 0
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to fetch activity entries',
          data: null,
        });
      }

      res.status(200).json(responseBody);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while fetching activity entries.',
      });
    }
  }

  /**
   * PROXY FOR: Creating a new Activity Entry
   * POST /api/itsm/activity-entries/create
   */
  static async createActivityEntry(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/register/ActivityEntry`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to create activity entry',
          data: null,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'Activity entry created successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while creating activity entry.',
      });
    }
  }

  static async fetchUserQueues(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/fetch/UserQueues`;

      const payload = {
        userName: req.body.userName || null,
        queueName: req.body.queueName || null
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to fetch user queues',
          data: null,
        });
      }

      res.status(200).json(responseBody);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while fetching user queues.',
      });
    }
  }

  static async generateSla(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/sla/generate`;

      const payload = {
        hours: req.body.hours || 0
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to generate SLA',
          data: null,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'SLA generated successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while generating SLA.',
      });
    }
  }

  /**
   * PROXY FOR: Searching users
   * POST /api/itsm/users/search
   */
  static async searchUsers(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/users/search`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Searching assets
   * POST /api/itsm/assets/search
   */
  static async searchAssets(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/assets/search`;

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Getting form options (dropdowns)
   * GET /api/itsm/form-options
   */
  static async getFormOptions(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/form-options`;

      const apiResponse = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
  }

  /**
   * PROXY FOR: Fetching Business Organizations
   * POST /api/itsm/bus-orgs
   */
  static getBusinessOrganizations(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/fetch/busOrg';

    const payload = (req.body && Object.keys(req.body).length > 0) ? req.body : {
      "objId": null,
      "name": null,
      "orgId": null
    };

    proxyRequest(req, res, javaEndpoint, 'POST', payload);
  }

  /**
   * PROXY FOR: Fetching Ticket Categories
   * POST /api/itsm/ticket-categories
   */
  static getTicketCategories(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/fetch/ticketCat';
    proxyRequest(req, res, javaEndpoint, 'POST', req.body);
  }

  /**
   * PROXY FOR: Getting Service Desk Dropdowns
   * GET /api/itsm/service-desk-dropdowns
   */
  static getServiceDeskDropdowns(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/serviceDesk/dropdowns';
    proxyRequest(req, res, javaEndpoint, 'GET');
  }

  /**
   * PROXY FOR: Generating Sequence Numbers
   * POST /api/itsm/sequence
   */
  static generateSequence(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/fetch/sequence';
    const payload = {
      sequenceName: req.body.sequenceName || "INCIDENT"
    };
    proxyRequest(req, res, javaEndpoint, 'POST', payload);
  }

  /**
   * PROXY FOR: Searching Customers
   * POST /api/itsm/customers/search
   */
  static searchCustomers(req: Request, res: Response) {
    const javaEndpoint = '/crm/v1/get/Customer';
    proxyRequest(req, res, javaEndpoint, 'POST', req.body);
  }

  /**
   * PROXY FOR: Fetching Tickets (alternative endpoint)
   * POST /api/itsm/tickets/fetch
   */
  static fetchTickets(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/fetch/ticket';
    const payload = (req.body && Object.keys(req.body).length > 0) ? req.body : {
      "objId": null,
      "title": null,
      "idNumber": null
    };
    proxyRequest(req, res, javaEndpoint, 'POST', payload);
  }

  /**
   * PROXY FOR: Updating Tickets (alternative endpoint)
   * POST /api/itsm/tickets/update
   */
  static updateTicketAlt(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/update/ticket';
    proxyRequest(req, res, javaEndpoint, 'POST', req.body);
  }

  static async registerActivityEntry(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getItsmApiServiceUrl()}/itsm/v1/register/ActivityEntry`;

      const payload = {
        createId: req.body.createId || null,
        type: req.body.type || "INCIDENT_CREATED",
        addnlInfo: req.body.addnlInfo || null,
        actEntry2User: req.body.actEntry2User || "Admin",
        actEntry2Incident: req.body.actEntry2Incident || null,
        actEntry2SubIncident: req.body.actEntry2SubIncident || "",
        actEntry2ServiceRequest: req.body.actEntry2ServiceRequest || 0,
        actEntry2WorkOrder: req.body.actEntry2WorkOrder || 0,
        actEntry2NotesLog: req.body.actEntry2NotesLog || 0,
        actEntry2PhoneLog: req.body.actEntry2PhoneLog || 0,
        actEntry2EmailLog: req.body.actEntry2EmailLog || 0,
        actEntry2Workaround: req.body.actEntry2Workaround || 0,
        actEntry2ChangeRequest: req.body.actEntry2ChangeRequest || 0,
        actEntry2Problem: req.body.actEntry2Problem || 0
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody;
      const contentType = apiResponse.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseBody = await apiResponse.json();
      } else {
        const textBody = await apiResponse.text();
        responseBody = { message: textBody };
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          status: 'ERROR',
          statusCode: apiResponse.status,
          statusMessage: responseBody?.message || responseBody?.statusMessage || 'Failed to register activity entry',
          data: responseBody,
        });
      }

      res.status(200).json({
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: 'Activity entry registered successfully',
        data: responseBody,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          status: 'ERROR',
          statusCode: 504,
          statusMessage: 'The ITSM service is not responding. Please try again later.',
        });
      }

      res.status(500).json({
        status: 'ERROR',
        statusCode: 500,
        statusMessage: 'Internal server error while registering activity entry.',
      });
    }
  }

  /**
   * PROXY FOR: Registering a survey
   * POST /api/itsm/register/survey
   */
  static async registerSurvey(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/register/survey';
    proxyRequest(req, res, javaEndpoint, 'POST', req.body);
  }

  /**
   * PROXY FOR: Fetching surveys
   * GET /api/itsm/survey
   */
  static async getSurvey(req: Request, res: Response) {
    const javaEndpoint = '/itsm/v1/survey';
    proxyRequest(req, res, javaEndpoint, 'GET');
  }
}

// --- EXPRESS ROUTER SETUP ---
const itsmRouter = Router();

// Incident/Ticket routes
itsmRouter.post('/fetch', ItsmController.fetchIncidents);
itsmRouter.post('/register/ticket', ItsmController.registerTicket);
itsmRouter.get('/ticket/:id', ItsmController.getTicket);
itsmRouter.put('/ticket/:id', ItsmController.updateTicket);
itsmRouter.get('/ticket/:id/sla', ItsmController.getTicketSla);
itsmRouter.post('/ticket/:id/worknote', ItsmController.addWorkNote);

// Activity Entry routes
itsmRouter.post('/activity-entries', ItsmController.fetchActivityEntries);
itsmRouter.post('/activity-entries/create', ItsmController.createActivityEntry);

// Common Selection route (NEW)
itsmRouter.post('/common-selection', ItsmController.fetchCommonSelection);

// Search routes
itsmRouter.post('/users/search', ItsmController.searchUsers);
itsmRouter.post('/assets/search', ItsmController.searchAssets);

// Form options
itsmRouter.get('/form-options', ItsmController.getFormOptions);

// Business Organizations & Categories
itsmRouter.post('/bus-orgs', ItsmController.getBusinessOrganizations);
itsmRouter.post('/ticket-categories', ItsmController.getTicketCategories);

// Service Desk & Sequence
itsmRouter.get('/service-desk-dropdowns', ItsmController.getServiceDeskDropdowns);
itsmRouter.post('/sequence', ItsmController.generateSequence);

// Customer Search
itsmRouter.post('/customers/search', ItsmController.searchCustomers);

// Alternative Ticket Endpoints
itsmRouter.post('/tickets/fetch', ItsmController.fetchTickets);
itsmRouter.post('/tickets/update', ItsmController.updateTicketAlt);
itsmRouter.post('/user-queues', ItsmController.fetchUserQueues);
itsmRouter.post('/register/notes-log', ItsmController.registerNotesLog);
itsmRouter.post('/register/activity-entry', ItsmController.registerActivityEntry);
itsmRouter.post('/register/incident-closer', ItsmController.registerIncidentCloser);
itsmRouter.post('/sla/generate', ItsmController.generateSla);
itsmRouter.get('/survey', ItsmController.getSurvey);
itsmRouter.post('/register/survey', ItsmController.registerSurvey);

export default itsmRouter;
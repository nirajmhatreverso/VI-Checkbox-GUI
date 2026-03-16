import { Request, Response } from 'express';

export class IncidentController {
  // Create a new service desk incident
  static async createIncident(req: Request, res: Response) {
    try {
      const {
        client,
        commonFaults,
        category,
        subCategory,
        status,
        priority,
        userId,
        configurationItem,
        assignmentGroup,
        assignedTo,
        channel,
        alternateLocation,
        alternateContact,
        shortDescription,
        additionalComments,
        incidentNumber,
        openedBy,
        opened,
        targetResolveDate,
      } = req.body;

      // Generate SLA timer and workflow based on priority
      const slaMap: Record<string, number> = {
        'Critical': 4,
        'High': 24,
        'Medium': 72,
        'Low': 168
      };
      const slaHours = slaMap[priority] || 72;

      // Create incident object
      const newIncident = {
        id: Date.now(),
        incidentNumber: incidentNumber || `INC${Date.now().toString().slice(-6)}`,
        client,
        commonFaults,
        category,
        subCategory,
        status: status || 'OPEN',
        priority,
        userId,
        configurationItem,
        assignmentGroup,
        assignedTo,
        channel: channel || 'Others',
        alternateLocation,
        alternateContact,
        shortDescription,
        additionalComments,
        openedBy: openedBy || 'USER001',
        opened: opened || new Date(),
        targetResolveDate: targetResolveDate || new Date(Date.now() + slaHours * 60 * 60 * 1000),
        slaHours,
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowSteps: [
          {
            step: 1,
            name: 'Incident Created',
            status: 'COMPLETED',
            completedAt: new Date(),
            completedBy: openedBy || 'USER001'
          },
          {
            step: 2,
            name: 'Initial Assessment',
            status: 'PENDING',
            assignedTo: assignmentGroup
          },
          {
            step: 3,
            name: 'Investigation',
            status: 'NOT_STARTED'
          },
          {
            step: 4,
            name: 'Resolution',
            status: 'NOT_STARTED'
          },
          {
            step: 5,
            name: 'Verification & Closure',
            status: 'NOT_STARTED'
          }
        ],
        // Auto-routing logic based on category
        routing: IncidentController.determineRouting(category, priority),
        // Auto-generated metadata
        metadata: {
          source: 'Service Desk Portal',
          clientInfo: client,
          assetInfo: configurationItem,
          impact: IncidentController.calculateImpact(priority, category),
          urgency: IncidentController.calculateUrgency(priority),
        }
      };

      // Mock notification to stakeholders
      const notifications = IncidentController.generateNotifications(newIncident);



      res.status(201).json({
        success: true,
        incident: newIncident,
        notifications,
        message: `Incident ${newIncident.incidentNumber} has been created and routed to ${newIncident.assignmentGroup}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create incident",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get incidents with filtering
  static async getIncidents(req: Request, res: Response) {
    try {
      const {
        status,
        priority,
        assignmentGroup,
        assignedTo,
        client,
        category,
        limit = 50,
        offset = 0
      } = req.query;

      // Mock incidents data based on the new service desk structure
      const mockIncidents = [
        {
          id: 1,
          incidentNumber: 'INC001001',
          client: 'azam-digital-services',
          category: 'hardware',
          subCategory: 'server-hardware',
          priority: 'High',
          status: 'OPEN',
          shortDescription: 'Production server experiencing intermittent outages',
          assignmentGroup: 'TECHNICAL_SUPPORT',
          assignedTo: 'tech.lead@azamtv.co.tz',
          openedBy: 'USER001',
          opened: '2025-01-06T08:30:00Z',
          targetResolveDate: '2025-01-07T08:30:00Z',
          userId: 'U001',
          configurationItem: 'ASSET001',
          channel: 'Portal'
        },
        {
          id: 2,
          incidentNumber: 'INC001002',
          client: 'azam-tv-operations',
          category: 'software',
          subCategory: 'application-software',
          priority: 'Medium',
          status: 'IN_PROGRESS',
          shortDescription: 'User cannot access subscription management module',
          assignmentGroup: 'APPLICATION_SUPPORT',
          assignedTo: 'app.support@azamtv.co.tz',
          openedBy: 'USER002',
          opened: '2025-01-06T10:15:00Z',
          targetResolveDate: '2025-01-09T10:15:00Z',
          userId: 'U002',
          configurationItem: 'ASSET002',
          channel: 'Phone'
        },
        {
          id: 3,
          incidentNumber: 'INC001003',
          client: 'azam-media-group',
          category: 'network',
          subCategory: 'connectivity',
          priority: 'Critical',
          status: 'RESOLVED',
          shortDescription: 'Complete network outage at Arusha office',
          assignmentGroup: 'NETWORK_OPERATIONS',
          assignedTo: 'network.ops@azamtv.co.tz',
          openedBy: 'USER003',
          opened: '2025-01-05T14:00:00Z',
          targetResolveDate: '2025-01-05T18:00:00Z',
          resolvedAt: '2025-01-05T16:30:00Z',
          userId: 'U003',
          configurationItem: 'ASSET003',
          channel: 'Walk-in'
        }
      ];

      // Apply filters
      let filteredIncidents = mockIncidents;

      if (status) {
        filteredIncidents = filteredIncidents.filter(inc => inc.status === status);
      }
      if (priority) {
        filteredIncidents = filteredIncidents.filter(inc => inc.priority === priority);
      }
      if (assignmentGroup) {
        filteredIncidents = filteredIncidents.filter(inc => inc.assignmentGroup === assignmentGroup);
      }
      if (client) {
        filteredIncidents = filteredIncidents.filter(inc => inc.client === client);
      }
      if (category) {
        filteredIncidents = filteredIncidents.filter(inc => inc.category === category);
      }

      // Apply pagination
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

      res.json({
        success: true,
        incidents: paginatedIncidents,
        total: filteredIncidents.length,
        pagination: {
          offset: startIndex,
          limit: parseInt(limit as string),
          hasMore: endIndex < filteredIncidents.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch incidents"
      });
    }
  }

  // Get single incident by ID
  static async getIncident(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Mock detailed incident data
      const incident = {
        id: parseInt(id),
        incidentNumber: `INC00${id.padStart(4, '0')}`,
        client: 'azam-digital-services',
        category: 'hardware',
        subCategory: 'server-hardware',
        priority: 'High',
        status: 'OPEN',
        shortDescription: 'Production server experiencing intermittent outages',
        additionalComments: 'Server has been showing memory warnings and occasional CPU spikes. Users report slow response times during peak hours. Need immediate investigation.',
        assignmentGroup: 'TECHNICAL_SUPPORT',
        assignedTo: 'tech.lead@azamtv.co.tz',
        openedBy: 'USER001',
        opened: '2025-01-06T08:30:00Z',
        targetResolveDate: '2025-01-07T08:30:00Z',
        userId: 'U001',
        userName: 'John Doe',
        userLocation: 'Dar es Salaam',
        userContact: 'xxxx 712 111 111',
        configurationItem: 'ASSET001',
        configurationItemName: 'Production Server 01',
        channel: 'Portal',
        workLog: [
          {
            timestamp: '2025-01-06T08:35:00Z',
            author: 'tech.lead@azamtv.co.tz',
            action: 'ASSIGNED',
            note: 'Incident assigned to Technical Support team for investigation'
          },
          {
            timestamp: '2025-01-06T09:00:00Z',
            author: 'tech.lead@azamtv.co.tz',
            action: 'WORK_NOTE',
            note: 'Initial diagnostics show high memory usage. Investigating potential memory leak in application.'
          }
        ],
        relatedIncidents: [],
        attachments: []
      };

      res.json({
        success: true,
        incident
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch incident"
      });
    }
  }

  // Form metadata for incident creation UI
  static async getFormData(req: Request, res: Response) {
    try {
      res.json({
        clients: [
          'azam-digital-services',
          'azam-tv-operations',
          'azam-media-group'
        ],
        categories: [
          { id: 'hardware', name: 'Hardware' },
          { id: 'software', name: 'Software' },
          { id: 'network', name: 'Network' },
          { id: 'security', name: 'Security' },
          { id: 'access', name: 'Access' }
        ],
        subCategories: [
          { id: 'server-hardware', name: 'Server Hardware', category: 'hardware' },
          { id: 'application-software', name: 'Application Software', category: 'software' },
          { id: 'connectivity', name: 'Connectivity', category: 'network' }
        ],
        priorities: ['Critical', 'High', 'Medium', 'Low'],
        assignmentGroups: [
          'FIELD_SERVICES',
          'TECHNICAL_SUPPORT',
          'APPLICATION_SUPPORT',
          'NETWORK_OPERATIONS',
          'SERVICE_DESK_LEVEL_1'
        ],
        channels: ['Portal', 'Phone', 'Walk-in', 'Email']
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to load form data' });
    }
  }

  // Current dashboard snapshot for incidents
  static async getCurrentIncidentData(req: Request, res: Response) {
    try {
      res.json({
        totals: {
          open: 12,
          inProgress: 7,
          resolvedToday: 5,
          overdue: 2
        },
        byPriority: {
          Critical: 1,
          High: 4,
          Medium: 9,
          Low: 5
        },
        slaBreaches: {
          today: 1,
          week: 3
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get current incident data' });
    }
  }

  // SLA configuration data
  static async getSlaData(req: Request, res: Response) {
    try {
      res.json({
        priorities: {
          Critical: { responseHours: 1, resolveHours: 4 },
          High: { responseHours: 2, resolveHours: 24 },
          Medium: { responseHours: 4, resolveHours: 72 },
          Low: { responseHours: 8, resolveHours: 168 }
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to load SLA data' });
    }
  }

  // Search users for assignment/autocomplete
  static async searchUsers(req: Request, res: Response) {
    try {
      const q = (req.query.q as string)?.toLowerCase() || '';
      const users = [
        { id: 'USER001', name: 'John Doe', email: 'john.doe@azamtv.co.tz' },
        { id: 'USER002', name: 'Jane Smith', email: 'jane.smith@azamtv.co.tz' },
        { id: 'USER003', name: 'Peter Mwanga', email: 'peter.mwanga@azamtv.co.tz' }
      ];
      const filtered = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: 'Failed to search users' });
    }
  }

  // Search assets/configuration items
  static async searchAssets(req: Request, res: Response) {
    try {
      const q = (req.query.q as string)?.toLowerCase() || '';
      const assets = [
        { id: 'ASSET001', name: 'Production Server 01', type: 'Server' },
        { id: 'ASSET002', name: 'CMS Application', type: 'Application' },
        { id: 'ASSET003', name: 'Branch Router Arusha', type: 'Network' }
      ];
      const filtered = assets.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: 'Failed to search assets' });
    }
  }

  // Helper method to determine routing based on category and priority
  static determineRouting(category: string, priority: string) {
    const routingRules = {
      'hardware': {
        'Critical': { group: 'FIELD_SERVICES', escalation: 'IMMEDIATE' },
        'High': { group: 'TECHNICAL_SUPPORT', escalation: '2_HOURS' },
        'Medium': { group: 'SERVICE_DESK_LEVEL_1', escalation: '4_HOURS' },
        'Low': { group: 'SERVICE_DESK_LEVEL_1', escalation: '24_HOURS' }
      },
      'software': {
        'Critical': { group: 'APPLICATION_SUPPORT', escalation: 'IMMEDIATE' },
        'High': { group: 'APPLICATION_SUPPORT', escalation: '2_HOURS' },
        'Medium': { group: 'SERVICE_DESK_LEVEL_1', escalation: '8_HOURS' },
        'Low': { group: 'SERVICE_DESK_LEVEL_1', escalation: '24_HOURS' }
      },
      'network': {
        'Critical': { group: 'NETWORK_OPERATIONS', escalation: 'IMMEDIATE' },
        'High': { group: 'NETWORK_OPERATIONS', escalation: '1_HOUR' },
        'Medium': { group: 'TECHNICAL_SUPPORT', escalation: '4_HOURS' },
        'Low': { group: 'SERVICE_DESK_LEVEL_1', escalation: '24_HOURS' }
      },
      'security': {
        'Critical': { group: 'TECHNICAL_SUPPORT', escalation: 'IMMEDIATE' },
        'High': { group: 'TECHNICAL_SUPPORT', escalation: '1_HOUR' },
        'Medium': { group: 'TECHNICAL_SUPPORT', escalation: '4_HOURS' },
        'Low': { group: 'SERVICE_DESK_LEVEL_1', escalation: '24_HOURS' }
      },
      'access': {
        'Critical': { group: 'SERVICE_DESK_LEVEL_1', escalation: '1_HOUR' },
        'High': { group: 'SERVICE_DESK_LEVEL_1', escalation: '2_HOURS' },
        'Medium': { group: 'SERVICE_DESK_LEVEL_1', escalation: '8_HOURS' },
        'Low': { group: 'SERVICE_DESK_LEVEL_1', escalation: '24_HOURS' }
      }
    };

    const categoryRules = routingRules[category as keyof typeof routingRules];
    if (categoryRules) {
      const priorityRule = categoryRules[priority as keyof typeof categoryRules];
      return priorityRule || {
        group: 'SERVICE_DESK_LEVEL_1',
        escalation: '24_HOURS'
      };
    }
    return {
      group: 'SERVICE_DESK_LEVEL_1',
      escalation: '24_HOURS'
    };
  }

  // Helper method to calculate impact
  static calculateImpact(priority: string, category: string) {
    if (priority === 'Critical') return 'HIGH';
    if (priority === 'High' && ['network', 'hardware'].includes(category)) return 'HIGH';
    if (priority === 'High') return 'MEDIUM';
    if (priority === 'Medium') return 'MEDIUM';
    return 'LOW';
  }

  // Helper method to calculate urgency
  static calculateUrgency(priority: string) {
    const urgencyMap: Record<string, string> = {
      'Critical': 'URGENT',
      'High': 'HIGH',
      'Medium': 'MEDIUM',
      'Low': 'LOW'
    };
    return urgencyMap[priority] || 'MEDIUM';
  }

  // Helper method to generate notifications
  static generateNotifications(incident: any) {
    const notifications = [];

    // Notify assignment group
    notifications.push({
      type: 'EMAIL',
      recipient: `${incident.assignmentGroup.toLowerCase().replace('_', '.')}@azamtv.co.tz`,
      subject: `New Incident Assigned: ${incident.incidentNumber}`,
      priority: incident.priority
    });

    // Notify user for high/critical incidents
    if (['High', 'Critical'].includes(incident.priority)) {
      notifications.push({
        type: 'SMS',
        recipient: incident.userId,
        message: `Your incident ${incident.incidentNumber} has been created with ${incident.priority} priority`
      });
    }

    return notifications;
  }
}
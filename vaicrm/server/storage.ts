import {
  User, Agent, Customer, InventoryItem, InventoryRequest,
  Payment, Subscription, SystemIncident, SystemIncidentNote, SystemIncidentAudit,
  CustomerTransfer, CustomerTransferRequest, Adjustment, AdjustmentRequest, CustomerDetails,
  DailyReport, TRAReport, TCRAReport, ReportAuditLog, Notification,
  type AgentReplacement, type AgentFaultyRepair,
  type AgentHardwarePayment, type AgentHardwareSale, type CustomerHardwareSale,
  type AddOnPack, type AddOnPurchase, type AddOnRenewal, type AddOnRemoval,
  type SubscriberDetails, type SubscriptionHistory, type PaymentHistory,
  type ServiceAction, type AutoRenewalSettings, type Invoice, type ServiceTicket
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;

  // Agent operations
  getAgents(): Promise<Agent[]>;
  getAgentById(id: number): Promise<Agent | null>;
  createAgent(agent: Omit<Agent, "id">): Promise<Agent>;
  updateAgent(id: number, agent: Partial<Agent>): Promise<Agent | null>;
  deleteAgent(id: number): Promise<boolean>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | null>;
  createCustomer(customer: Omit<Customer, "id">): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null>;
  deleteCustomer(id: number): Promise<boolean>;

  // Inventory operations
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | null>;
  createInventoryItem(item: Omit<InventoryItem, "id">): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | null>;
  deleteInventoryItem(id: number): Promise<boolean>;

  // Inventory request operations
  getInventoryRequests(): Promise<InventoryRequest[]>;
  getInventoryRequestById(id: number): Promise<InventoryRequest | null>;
  createInventoryRequest(request: Omit<InventoryRequest, "id">): Promise<InventoryRequest>;
  updateInventoryRequest(id: number, request: Partial<InventoryRequest>): Promise<InventoryRequest | null>;
  deleteInventoryRequest(id: number): Promise<boolean>;

  // Payment operations
  getPayments(): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | null>;
  createPayment(payment: Omit<Payment, "id">): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | null>;
  deletePayment(id: number): Promise<boolean>;

  // Subscription operations
  getSubscriptions(): Promise<Subscription[]>;
  getSubscriptionById(id: number): Promise<Subscription | null>;
  createSubscription(subscription: Omit<Subscription, "id">): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription | null>;
  deleteSubscription(id: number): Promise<boolean>;

  // System Incident operations
  getSystemIncidents(): Promise<SystemIncident[]>;
  getSystemIncidentById(id: number): Promise<SystemIncident | null>;
  getSystemIncidentByIncidentId(incidentId: string): Promise<SystemIncident | null>;
  createSystemIncident(incident: Omit<SystemIncident, "id" | "incidentId" | "createdAt" | "updatedAt">): Promise<SystemIncident>;
  updateSystemIncident(id: number, incident: Partial<SystemIncident>): Promise<SystemIncident | null>;
  deleteSystemIncident(id: number): Promise<boolean>;

  // System Incident note operations
  getSystemIncidentNotes(incidentId: number): Promise<SystemIncidentNote[]>;
  createSystemIncidentNote(note: Omit<SystemIncidentNote, "id" | "createdAt">): Promise<SystemIncidentNote>;

  // System Incident audit operations
  getSystemIncidentAudit(incidentId: number): Promise<SystemIncidentAudit[]>;
  createSystemIncidentAudit(audit: Omit<SystemIncidentAudit, "id" | "createdAt">): Promise<SystemIncidentAudit>;

  // Receipt Cancellation operations
  getEligibleReceiptsForCancellation(filters: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    agentId?: string;
    paymentMode?: string;
    page: number;
    limit: number;
  }): Promise<any[]>;
  getReceiptForCancellation(payId: string): Promise<any | null>;
  isReceiptEligibleForCancellation(payId: string): Promise<{ eligible: boolean; reason?: string; currentStatus?: string }>;
  cancelReceipt(cancellation: {
    payId: string;
    cancellationReason: string;
    cancelledBy: string;
    cancellationDate: Date;
    originalStatus: string;
  }): Promise<{ success: boolean; data?: any; error?: string }>;
  updateCancellationCMStatus(payId: string, cmUpdate: {
    cmRequestId?: string;
    cmStatus?: string;
    cmStatusMsg?: string;
    ficaStatus?: string;
    ficaStatusMsg?: string;
  }): Promise<void>;
  adjustWalletForCancellation(customerId: string, amount: number): Promise<any>;
  getCancellationAuditTrail(payId: string): Promise<any | null>;
  getCancellationStatus(payId: string): Promise<any | null>;

  // Customer Transfer operations
  getCustomerTransfers(): Promise<CustomerTransfer[]>;
  getCustomerTransferById(id: number): Promise<CustomerTransfer | null>;
  createCustomerTransfer(transfer: Omit<CustomerTransfer, "id" | "createDt" | "createTs">): Promise<CustomerTransfer>;
  updateCustomerTransfer(id: number, transfer: Partial<CustomerTransfer>): Promise<CustomerTransfer | null>;
  validateTransferEligibility(sourceCustomerId: number, targetCustomerId: number, amount: number): Promise<{
    eligible: boolean;
    reason?: string;
    sourceCustomer?: Customer;
    targetCustomer?: Customer;
    availablePayments?: Payment[];
  }>;
  checkInvoiceStatus(invoiceNumber: string): Promise<{
    status: 'CLEARED' | 'PENDING';
    requiresManualIntervention: boolean;
  }>;
  updateTransferCMStatus(transferId: number, cmUpdate: {
    cmStatus?: string;
    cmStatusMessage?: string;
    ficaStatus?: string;
    ficaStatusMessage?: string;
    somStatus?: string;
    somStatusMessage?: string;
    requestId?: string;
  }): Promise<void>;

  // Adjustment operations
  getAdjustments(): Promise<Adjustment[]>;
  getAdjustmentById(id: number): Promise<Adjustment | null>;
  createAdjustment(adjustment: Omit<Adjustment, "id" | "requestedAt">): Promise<Adjustment>;
  updateAdjustment(id: number, adjustment: Partial<Adjustment>): Promise<Adjustment | null>;
  approveAdjustment(id: number, approvedBy: string): Promise<Adjustment | null>;
  rejectAdjustment(id: number, rejectedBy: string, rejectionReason: string): Promise<Adjustment | null>;
  getCustomerDetailsByBpId(bpId: string): Promise<CustomerDetails | null>;
  getCustomerDetailsByScId(scId: string): Promise<CustomerDetails | null>;
  getPendingAdjustments(): Promise<Adjustment[]>;
  getProcessedAdjustments(): Promise<Adjustment[]>;

  // Report operations
  getDailyReports(dateFrom?: string, dateTo?: string, region?: string): Promise<DailyReport[]>;
  getDailyReportById(id: number): Promise<DailyReport | null>;
  generateDailyReport(reportDate: Date, reportType: string, region?: string): Promise<DailyReport>;

  getTRAReports(dateFrom?: string, dateTo?: string): Promise<TRAReport[]>;
  getTRAReportById(id: number): Promise<TRAReport | null>;
  generateTRAReport(reportDate: Date, reportType: string): Promise<TRAReport>;

  getTCRAReports(dateFrom?: string, dateTo?: string, region?: string): Promise<TCRAReport[]>;
  getTCRAReportById(id: number): Promise<TCRAReport | null>;
  generateTCRAReport(reportDate: Date, reportType: string, region?: string): Promise<TCRAReport>;

  getReportAuditLogs(reportType?: string, reportId?: number): Promise<ReportAuditLog[]>;
  createReportAuditLog(auditLog: Omit<ReportAuditLog, "id" | "performedAt">): Promise<ReportAuditLog>;

  // Notification operations
  getNotifications(userId?: number, status?: string): Promise<Notification[]>;
  getNotificationById(id: number): Promise<Notification | null>;
  createNotification(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | null>;
  markNotificationAsRead(id: number): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Subscriber View operations
  getSubscriberDetails(customerId: string): Promise<SubscriberDetails | null>;
  getSubscriptionHistory(customerId: string): Promise<SubscriptionHistory[]>;
  getPaymentHistory(customerId: string): Promise<PaymentHistory[]>;
  getServiceActions(customerId: string): Promise<ServiceAction[]>;
  getServiceTickets(customerId?: string): Promise<ServiceTicket[]>;
  getServiceTicketById(id: number): Promise<ServiceTicket | null>;
  createServiceTicket(ticket: Omit<ServiceTicket, "id" | "createdAt" | "updatedAt">): Promise<ServiceTicket>;
  updateServiceTicket(id: number, ticket: Partial<ServiceTicket>): Promise<ServiceTicket | null>;
  getAutoRenewalSettings(customerId: string): Promise<AutoRenewalSettings | null>;
  updateAutoRenewalSettings(customerId: string, settings: AutoRenewalSettings): Promise<AutoRenewalSettings>;
  getInvoices(customerId: string): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | null>;
  createInvoice(invoice: Omit<Invoice, "id">): Promise<Invoice>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: User[] = [
    {
      id: 1,
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      email: "admin@azamtv.co.tz",
      role: "admin",
      createdAt: new Date()
    },
    {
      id: 2,
      username: "agent",
      firstName: "Field",
      lastName: "Agent",
      email: "agent@azamtv.co.tz",
      role: "agent",
      createdAt: new Date()
    },
    {
      id: 3,
      username: "manager",
      firstName: "Regional",
      lastName: "Manager",
      email: "manager@azamtv.co.tz",
      role: "manager",
      createdAt: new Date()
    }
  ];

  private agents: Agent[] = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Mwangi',
      email: 'john.mwangi@azamtv.co.tz',
      phone: 'xxxx712345678',
      mobile: 'xxxx712345678',
      type: 'Individual',
      country: 'Tanzania',
      region: 'Dar es Salaam',
      city: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Msasani',
      address1: 'Plot 123, Msasani Road',
      tinNumber: '123456789',
      vrnNumber: '987654321',
      currency: 'TSH',
      role: 'Agent',
      status: 'approved',
      statusMessage: 'KYC approved - SAP Business Partner created',
      commission: 5.0,
      creditLimit: 1000000,
      sapBpId: 'BP001',
      sapCaId: 'CA001',
      onboardingRefNo: 'AZAM-2024-000001',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    }
  ];

  private customers: Customer[] = [
    {
      id: 1,
      firstName: 'Amina',
      lastName: 'Hassan',
      phone: 'xxxx712987654',
      mobile: 'xxxx712987654',
      email: 'amina.hassan@example.com',
      customerType: 'prepaid',
      serviceType: 'DTT',
      accountClass: 'individual',
      connectionType: 'single',
      addressType: 'residential',
      country: 'Tanzania',
      region: 'Dar es Salaam',
      city: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Msasani',
      address1: 'Plot 456, Msasani Peninsula',
      currency: 'TSH',
      onboardingRefNo: 'CUST-2024-000001',
      createdAt: new Date('2024-01-20')
    },
    {
      id: 2,
      firstName: 'Joseph',
      lastName: 'Mwamba',
      phone: 'xxxx713456789',
      mobile: 'xxxx713456789',
      email: 'joseph.mwamba@example.com',
      customerType: 'postpaid',
      serviceType: 'DTT',
      accountClass: 'individual',
      connectionType: 'single',
      addressType: 'residential',
      country: 'Tanzania',
      region: 'Mwanza',
      city: 'Mwanza',
      district: 'Nyamagana',
      ward: 'Nyamagana',
      address1: 'Block 12, Nyamagana',
      currency: 'TSH',
      onboardingRefNo: 'CUST-2024-000002',
      createdAt: new Date('2024-01-25')
    },
    {
      id: 3,
      firstName: 'Grace',
      lastName: 'Mollel',
      phone: 'xxxx714567890',
      mobile: 'xxxx714567890',
      email: 'grace.mollel@example.com',
      customerType: 'prepaid',
      serviceType: 'DTT',
      accountClass: 'individual',
      connectionType: 'single',
      addressType: 'residential',
      country: 'Tanzania',
      region: 'Arusha',
      city: 'Arusha',
      district: 'Arusha Urban',
      ward: 'Kaloleni',
      address1: 'Street 5, Kaloleni',
      currency: 'TSH',
      onboardingRefNo: 'CUST-2024-000003',
      createdAt: new Date('2024-02-01')
    }
  ];

  private inventoryItems: InventoryItem[] = [
    {
      id: 1,
      materialCode: 'STB001',
      materialName: 'Digital Set-Top Box Model A',
      materialType: 'STB',
      serialNumber: 'STB123456789',
      casId: 'CAS001',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-DSM',
      createId: 'system',
      createDt: new Date('2024-01-10'),
      createTs: new Date('2024-01-10')
    },
    {
      id: 2,
      materialCode: 'STB001',
      materialName: 'Digital Set-Top Box Model A',
      materialType: 'STB',
      serialNumber: 'STB123456790',
      casId: 'CAS002',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-001',
      createId: 'system',
      createDt: new Date('2024-01-10'),
      createTs: new Date('2024-01-10'),
      updateId: 'agent',
      updateDt: new Date('2024-01-20'),
      updateTs: new Date('2024-01-20')
    },
    {
      id: 3,
      materialCode: 'REM001',
      materialName: 'Remote Control Universal',
      materialType: 'Remote',
      serialNumber: 'REM987654321',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-MWZ',
      createId: 'system',
      createDt: new Date('2024-01-15'),
      createTs: new Date('2024-01-15')
    },
    {
      id: 4,
      materialCode: 'CAB001',
      materialName: 'HDMI Cable 2m',
      materialType: 'Cable',
      serialNumber: 'CAB456789123',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-DSM',
      createId: 'system',
      createDt: new Date('2024-01-12'),
      createTs: new Date('2024-01-12')
    },
    {
      id: 5,
      materialCode: 'STB001',
      materialName: 'Digital Set-Top Box Model A',
      materialType: 'STB',
      serialNumber: 'STB123456791',
      casId: 'CAS003',
      state: 'faulty',
      status: 'damaged',
      owner: 'Service-Center-DSM',
      createId: 'system',
      createDt: new Date('2024-01-10'),
      createTs: new Date('2024-01-10'),
      updateId: 'technician',
      updateDt: new Date('2024-02-05'),
      updateTs: new Date('2024-02-05')
    },
    {
      id: 6,
      materialCode: 'STB002',
      materialName: 'Digital Set-Top Box Model B HD',
      materialType: 'STB',
      serialNumber: 'STB987654321',
      casId: 'CAS004',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-ARU',
      createId: 'system',
      createDt: new Date('2024-02-01'),
      createTs: new Date('2024-02-01')
    },
    {
      id: 7,
      materialCode: 'SCD001',
      materialName: 'Smart Card Viewing',
      materialType: 'Smart Card',
      serialNumber: 'SCD456789012',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-002',
      createId: 'system',
      createDt: new Date('2024-01-18'),
      createTs: new Date('2024-01-18'),
      updateId: 'agent',
      updateDt: new Date('2024-02-10'),
      updateTs: new Date('2024-02-10')
    },
    {
      id: 8,
      materialCode: 'PWR001',
      materialName: 'Power Adapter 12V 2A',
      materialType: 'Power Adapter',
      serialNumber: 'PWR789012345',
      state: 'available',
      status: 'new',
      owner: 'OTC-Center-MWZ',
      createId: 'system',
      createDt: new Date('2024-01-22'),
      createTs: new Date('2024-01-22')
    },
    {
      id: 9,
      materialCode: 'CAB002',
      materialName: 'Coaxial Cable RG6 10m',
      materialType: 'Cable',
      serialNumber: 'CAB234567890',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-003',
      createId: 'system',
      createDt: new Date('2024-01-25'),
      createTs: new Date('2024-01-25'),
      updateId: 'agent',
      updateDt: new Date('2024-02-08'),
      updateTs: new Date('2024-02-08')
    },
    {
      id: 10,
      materialCode: 'LNB001',
      materialName: 'LNB Universal Ku-Band',
      materialType: 'LNB',
      serialNumber: 'LNB345678901',
      state: 'faulty',
      status: 'damaged',
      owner: 'Service-Center-MWZ',
      createId: 'system',
      createDt: new Date('2024-01-30'),
      createTs: new Date('2024-01-30'),
      updateId: 'technician',
      updateDt: new Date('2024-02-12'),
      updateTs: new Date('2024-02-12')
    },
    {
      id: 11,
      materialCode: 'ANT001',
      materialName: 'Satellite Dish 60cm',
      materialType: 'Antenna',
      serialNumber: 'ANT567890123',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-DSM',
      createId: 'system',
      createDt: new Date('2024-02-03'),
      createTs: new Date('2024-02-03')
    },
    {
      id: 12,
      materialCode: 'REM002',
      materialName: 'Remote Control Voice Command',
      materialType: 'Remote',
      serialNumber: 'REM678901234',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-004',
      createId: 'system',
      createDt: new Date('2024-02-05'),
      createTs: new Date('2024-02-05'),
      updateId: 'agent',
      updateDt: new Date('2024-02-15'),
      updateTs: new Date('2024-02-15')
    },
    {
      id: 13,
      materialCode: 'STB003',
      materialName: 'Digital Set-Top Box 4K Ultra',
      materialType: 'STB',
      serialNumber: 'STB567890123',
      casId: 'CAS005',
      state: 'available',
      status: 'new',
      owner: 'OTC-Center-DSM',
      createId: 'system',
      createDt: new Date('2024-02-07'),
      createTs: new Date('2024-02-07')
    },
    {
      id: 14,
      materialCode: 'SCD002',
      materialName: 'Smart Card Premium',
      materialType: 'Smart Card',
      serialNumber: 'SCD789012345',
      state: 'faulty',
      status: 'damaged',
      owner: 'Service-Center-ARU',
      createId: 'system',
      createDt: new Date('2024-01-28'),
      createTs: new Date('2024-01-28'),
      updateId: 'technician',
      updateDt: new Date('2024-02-14'),
      updateTs: new Date('2024-02-14')
    },
    {
      id: 15,
      materialCode: 'CAB003',
      materialName: 'Ethernet Cable Cat6 5m',
      materialType: 'Cable',
      serialNumber: 'CAB890123456',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-MWZ',
      createId: 'system',
      createDt: new Date('2024-02-10'),
      createTs: new Date('2024-02-10')
    },
    {
      id: 16,
      materialCode: 'SPL001',
      materialName: 'Signal Splitter 4-Way',
      materialType: 'Splitter',
      serialNumber: 'SPL123456789',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-005',
      createId: 'system',
      createDt: new Date('2024-02-12'),
      createTs: new Date('2024-02-12'),
      updateId: 'agent',
      updateDt: new Date('2024-02-18'),
      updateTs: new Date('2024-02-18')
    },
    {
      id: 17,
      materialCode: 'PWR002',
      materialName: 'Power Adapter 24V 1.5A',
      materialType: 'Power Adapter',
      serialNumber: 'PWR234567890',
      state: 'available',
      status: 'new',
      owner: 'Warehouse-ARU',
      createId: 'system',
      createDt: new Date('2024-02-14'),
      createTs: new Date('2024-02-14')
    },
    {
      id: 18,
      materialCode: 'MNT001',
      materialName: 'Wall Mount Bracket',
      materialType: 'Mount',
      serialNumber: 'MNT345678901',
      state: 'allocated',
      status: 'used',
      owner: 'Agent-006',
      createId: 'system',
      createDt: new Date('2024-02-16'),
      createTs: new Date('2024-02-16'),
      updateId: 'agent',
      updateDt: new Date('2024-02-20'),
      updateTs: new Date('2024-02-20')
    },
    {
      id: 19,
      materialCode: 'AMP001',
      materialName: 'Signal Amplifier 20dB',
      materialType: 'Amplifier',
      serialNumber: 'AMP456789012',
      state: 'faulty',
      status: 'damaged',
      owner: 'Service-Center-DSM',
      createId: 'system',
      createDt: new Date('2024-02-08'),
      createTs: new Date('2024-02-08'),
      updateId: 'technician',
      updateDt: new Date('2024-02-19'),
      updateTs: new Date('2024-02-19')
    },
    {
      id: 20,
      materialCode: 'FLT001',
      materialName: 'RF Filter Band Pass',
      materialType: 'Filter',
      serialNumber: 'FLT567890123',
      state: 'available',
      status: 'new',
      owner: 'OTC-Center-ARU',
      createId: 'system',
      createDt: new Date('2024-02-18'),
      createTs: new Date('2024-02-18')
    }
  ];

  private inventoryRequests: InventoryRequest[] = [
    {
      id: 1,
      sapBpId: 'BP001',
      sapCaId: 'CA001',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0001',
      itemType: 'STB',
      itemQty: '10',
      itemAmount: 450000,
      totalAmount: 450000,
      vatAmount: 81000,
      status: 'PENDING',
      reason: 'Replenishment for high demand area',
      createId: 'agent-001',
      createDt: new Date('2025-01-18'),
      createTs: new Date('2025-01-18'),
      warehouseId: 'WH-DSM'
    },
    {
      id: 2,
      sapBpId: 'BP002',
      sapCaId: 'CA002',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0002',
      itemType: 'Remote Control',
      itemQty: '25',
      itemAmount: 125000,
      totalAmount: 125000,
      vatAmount: 22500,
      transferFrom: 'Warehouse-DSM',
      transferTo: 'Warehouse-MWZ',
      status: 'APPROVED',
      reason: 'Branch stock redistribution',
      createId: 'manager-001',
      createDt: new Date('2025-01-15'),
      createTs: new Date('2025-01-15'),
      updateDt: new Date('2025-01-17'),
      updateTs: new Date('2025-01-17'),
      updateId: 'warehouse-manager',
      warehouseId: 'WH-DSM'
    },
    {
      id: 3,
      sapBpId: 'BP001',
      sapCaId: 'CA001',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'EMERGENCY_REQUEST',
      requestId: 'REQ-2025-0003',
      itemType: 'Smart Card',
      itemQty: '50',
      itemAmount: 250000,
      totalAmount: 250000,
      vatAmount: 45000,
      itemSerialNo: 'SC2025001,SC2025002,SC2025003',
      status: 'PENDING',
      reason: 'Emergency stock for new customer registrations',
      createId: 'agent-003',
      createDt: new Date('2025-01-19'),
      createTs: new Date('2025-01-19'),
      sapSoId: 'SO-2025-0003',
      warehouseId: 'WH-ARU'
    },
    {
      id: 4,
      sapBpId: 'BP003',
      sapCaId: 'CA004',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0004',
      itemType: 'Cable Set',
      itemQty: '15',
      itemAmount: 75000,
      totalAmount: 75000,
      vatAmount: 13500,
      status: 'REJECTED',
      reason: 'Replacement for damaged cables',
      rejectionRemarks: 'Insufficient inventory. Please reorder in next cycle.',
      createId: 'agent-005',
      createDt: new Date('2025-01-12'),
      createTs: new Date('2025-01-12'),
      updateDt: new Date('2025-01-14'),
      updateTs: new Date('2025-01-14'),
      updateId: 'warehouse-supervisor',
      warehouseId: 'WH-MWZ'
    },
    {
      id: 5,
      sapBpId: 'BP004',
      sapCaId: 'CA005',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0005',
      itemType: 'STB',
      itemQty: '8',
      itemAmount: 360000,
      totalAmount: 360000,
      vatAmount: 64800,
      transferFrom: 'Warehouse-ARU',
      transferTo: 'OTC-Moshi',
      status: 'IN_TRANSIT',
      reason: 'OTC branch restocking',
      createId: 'branch-manager',
      createDt: new Date('2025-01-16'),
      createTs: new Date('2025-01-16'),
      updateDt: new Date('2025-01-18'),
      updateTs: new Date('2025-01-18'),
      updateId: 'logistics-team',
      warehouseId: 'WH-ARU'
    },
    {
      id: 6,
      sapBpId: 'BP005',
      sapCaId: 'CA006',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'REPLENISHMENT',
      requestId: 'REQ-2025-0006',
      itemType: 'Remote Control',
      itemQty: '30',
      itemAmount: 150000,
      totalAmount: 150000,
      vatAmount: 27000,
      status: 'APPROVED',
      reason: 'Monthly replenishment for agent network',
      createId: 'agent-network-head',
      createDt: new Date('2025-01-10'),
      createTs: new Date('2025-01-10'),
      updateDt: new Date('2025-01-12'),
      updateTs: new Date('2025-01-12'),
      updateId: 'procurement-manager',
      sapSoId: 'SO-2025-0006',
      warehouseId: 'WH-DOD'
    },
    {
      id: 7,
      sapBpId: 'BP006',
      sapCaId: 'CA007',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0007',
      itemType: 'STB',
      itemQty: '5',
      itemAmount: 225000,
      totalAmount: 225000,
      vatAmount: 40500,
      itemSerialNo: 'STB2025101,STB2025102,STB2025103,STB2025104,STB2025105',
      status: 'PENDING',
      reason: 'Premium customer installations',
      createId: 'sales-rep-001',
      createDt: new Date('2025-01-20'),
      createTs: new Date('2025-01-20'),
      warehouseId: 'WH-MBE'
    },
    {
      id: 8,
      sapBpId: 'BP007',
      sapCaId: 'CA008',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0008',
      itemType: 'Smart Card',
      itemQty: '100',
      itemAmount: 500000,
      totalAmount: 500000,
      vatAmount: 90000,
      transferFrom: 'Warehouse-DSM',
      transferTo: 'Warehouse-MBE',
      status: 'APPROVED',
      reason: 'Regional redistribution for upcoming campaign',
      createId: 'regional-manager',
      createDt: new Date('2025-01-08'),
      createTs: new Date('2025-01-08'),
      updateDt: new Date('2025-01-10'),
      updateTs: new Date('2025-01-10'),
      updateId: 'logistics-coordinator',
      sapSoId: 'SO-2025-0008',
      warehouseId: 'WH-DSM'
    },
    {
      id: 9,
      sapBpId: 'BP008',
      sapCaId: 'CA009',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'EMERGENCY_REQUEST',
      requestId: 'REQ-2025-0009',
      itemType: 'Cable Set',
      itemQty: '20',
      itemAmount: 100000,
      totalAmount: 100000,
      vatAmount: 18000,
      status: 'REJECTED',
      reason: 'Urgent replacement for customer complaints',
      rejectionRemarks: 'Request lacks proper documentation. Please provide customer complaint tickets.',
      createId: 'field-agent-007',
      createDt: new Date('2025-01-17'),
      createTs: new Date('2025-01-17'),
      updateDt: new Date('2025-01-19'),
      updateTs: new Date('2025-01-19'),
      updateId: 'quality-manager',
      warehouseId: 'WH-MWZ'
    },
    {
      id: 10,
      sapBpId: 'BP009',
      sapCaId: 'CA010',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0010',
      itemType: 'Remote Control',
      itemQty: '40',
      itemAmount: 200000,
      totalAmount: 200000,
      vatAmount: 36000,
      status: 'IN_TRANSIT',
      reason: 'Bulk order for promotional campaign',
      createId: 'marketing-team',
      createDt: new Date('2025-01-14'),
      createTs: new Date('2025-01-14'),
      updateDt: new Date('2025-01-16'),
      updateTs: new Date('2025-01-16'),
      updateId: 'fulfillment-team',
      sapSoId: 'SO-2025-0010',
      warehouseId: 'WH-DSM'
    },
    {
      id: 11,
      sapBpId: 'BP010',
      sapCaId: 'CA011',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0011',
      itemType: 'STB',
      itemQty: '12',
      itemAmount: 540000,
      totalAmount: 540000,
      vatAmount: 97200,
      transferFrom: 'Warehouse-MWZ',
      transferTo: 'Agent-Network-North',
      status: 'PENDING',
      reason: 'Agent network expansion support',
      createId: 'expansion-coordinator',
      createDt: new Date('2025-01-21'),
      createTs: new Date('2025-01-21'),
      warehouseId: 'WH-MWZ'
    },
    {
      id: 12,
      sapBpId: 'BP011',
      sapCaId: 'CA012',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'REPLENISHMENT',
      requestId: 'REQ-2025-0012',
      itemType: 'Smart Card',
      itemQty: '75',
      itemAmount: 375000,
      totalAmount: 375000,
      vatAmount: 67500,
      itemSerialNo: 'SC2025051,SC2025052,SC2025053,SC2025054,SC2025055',
      status: 'APPROVED',
      reason: 'Quarterly agent stock replenishment',
      createId: 'agent-coordinator',
      createDt: new Date('2025-01-05'),
      createTs: new Date('2025-01-05'),
      updateDt: new Date('2025-01-07'),
      updateTs: new Date('2025-01-07'),
      updateId: 'inventory-manager',
      sapSoId: 'SO-2025-0012',
      warehouseId: 'WH-ARU'
    },
    {
      id: 13,
      sapBpId: 'BP012',
      sapCaId: 'CA013',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'EMERGENCY_REQUEST',
      requestId: 'REQ-2025-0013',
      itemType: 'STB',
      itemQty: '3',
      itemAmount: 135000,
      totalAmount: 135000,
      vatAmount: 24300,
      status: 'PENDING',
      reason: 'Replacement for faulty units returned by customers',
      createId: 'customer-service',
      createDt: new Date('2025-01-22'),
      createTs: new Date('2025-01-22'),
      warehouseId: 'WH-DSM'
    },
    {
      id: 14,
      sapBpId: 'BP013',
      sapCaId: 'CA014',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0014',
      itemType: 'Cable Set',
      itemQty: '60',
      itemAmount: 300000,
      totalAmount: 300000,
      vatAmount: 54000,
      transferFrom: 'Warehouse-DOD',
      transferTo: 'Warehouse-ARU',
      status: 'APPROVED',
      reason: 'Seasonal demand balancing',
      createId: 'demand-planner',
      createDt: new Date('2025-01-11'),
      createTs: new Date('2025-01-11'),
      updateDt: new Date('2025-01-13'),
      updateTs: new Date('2025-01-13'),
      updateId: 'supply-chain-manager',
      sapSoId: 'SO-2025-0014',
      warehouseId: 'WH-DOD'
    },
    {
      id: 15,
      sapBpId: 'BP014',
      sapCaId: 'CA015',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0015',
      itemType: 'Remote Control',
      itemQty: '18',
      itemAmount: 90000,
      totalAmount: 90000,
      vatAmount: 16200,
      status: 'REJECTED',
      reason: 'Agent commission stock adjustment',
      rejectionRemarks: 'Agent has exceeded monthly allocation limit. Request denied.',
      createId: 'top-agent-001',
      createDt: new Date('2025-01-13'),
      createTs: new Date('2025-01-13'),
      updateDt: new Date('2025-01-15'),
      updateTs: new Date('2025-01-15'),
      updateId: 'agent-supervisor',
      warehouseId: 'WH-MBE'
    },
    {
      id: 16,
      sapBpId: 'BP015',
      sapCaId: 'CA016',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'REPLENISHMENT',
      requestId: 'REQ-2025-0016',
      itemType: 'Smart Card',
      itemQty: '35',
      itemAmount: 175000,
      totalAmount: 175000,
      vatAmount: 31500,
      status: 'APPROVED',
      reason: 'Weekly OTC branch replenishment',
      createId: 'otc-manager-dsm',
      createDt: new Date('2025-01-09'),
      createTs: new Date('2025-01-09'),
      updateDt: new Date('2025-01-11'),
      updateTs: new Date('2025-01-11'),
      updateId: 'regional-coordinator',
      sapSoId: 'SO-2025-0016',
      warehouseId: 'WH-DSM'
    },
    {
      id: 17,
      sapBpId: 'BP016',
      sapCaId: 'CA017',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'EMERGENCY_REQUEST',
      requestId: 'REQ-2025-0017',
      itemType: 'STB',
      itemQty: '7',
      itemAmount: 315000,
      totalAmount: 315000,
      vatAmount: 56700,
      transferFrom: 'Warehouse-DSM',
      transferTo: 'Service-Center-ARU',
      status: 'IN_TRANSIT',
      reason: 'Service center emergency restocking for repairs',
      createId: 'service-manager',
      createDt: new Date('2025-01-18'),
      createTs: new Date('2025-01-18'),
      updateDt: new Date('2025-01-20'),
      updateTs: new Date('2025-01-20'),
      updateId: 'logistics-dispatcher',
      warehouseId: 'WH-DSM'
    },
    {
      id: 18,
      sapBpId: 'BP017',
      sapCaId: 'CA018',
      module: 'AGENT',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'TRANSFER',
      requestId: 'REQ-2025-0018',
      itemType: 'Cable Set',
      itemQty: '45',
      itemAmount: 225000,
      totalAmount: 225000,
      vatAmount: 40500,
      transferFrom: 'Agent-Pool-Central',
      transferTo: 'Agent-Pool-Northern',
      status: 'PENDING',
      reason: 'Agent pool rebalancing for regional campaigns',
      createId: 'agent-pool-manager',
      createDt: new Date('2025-01-23'),
      createTs: new Date('2025-01-23'),
      warehouseId: 'WH-DOD'
    },
    {
      id: 19,
      sapBpId: 'BP018',
      sapCaId: 'CA019',
      module: 'OTC',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'STOCK_REQUEST',
      requestId: 'REQ-2025-0019',
      itemType: 'Remote Control',
      itemQty: '22',
      itemAmount: 110000,
      totalAmount: 110000,
      vatAmount: 19800,
      itemSerialNo: 'RC2025201,RC2025202,RC2025203',
      status: 'APPROVED',
      reason: 'Customer upgrade program support',
      createId: 'upgrade-coordinator',
      createDt: new Date('2025-01-06'),
      createTs: new Date('2025-01-06'),
      updateDt: new Date('2025-01-08'),
      updateTs: new Date('2025-01-08'),
      updateId: 'program-manager',
      sapSoId: 'SO-2025-0019',
      warehouseId: 'WH-MWZ'
    },
    {
      id: 20,
      sapBpId: 'BP019',
      sapCaId: 'CA020',
      module: 'WAREHOUSE',
      salesOrg: 'TZ01',
      division: '01',
      requestType: 'REPLENISHMENT',
      requestId: 'REQ-2025-0020',
      itemType: 'Smart Card',
      itemQty: '80',
      itemAmount: 400000,
      totalAmount: 400000,
      vatAmount: 72000,
      status: 'PENDING',
      reason: 'End-of-month inventory replenishment',
      createId: 'inventory-planner',
      createDt: new Date('2025-01-24'),
      createTs: new Date('2025-01-24'),
      warehouseId: 'WH-MBE'
    }
  ];

  private payments: Payment[] = [
    {
      id: 1,
      customerId: 1,
      amount: 45000,
      currency: 'TSH',
      paymentMode: 'cash',
      type: 'hardware_sale',
      status: 'completed',
      referenceNumber: 'TXN123456789',
      receiptNumber: 'RCP-2024-0001',
      createdAt: new Date('2024-02-05')
    },
    {
      id: 2,
      customerId: 2,
      amount: 19000,
      currency: 'TSH',
      paymentMode: 'mobile_money',
      type: 'subscription',
      status: 'completed',
      referenceNumber: 'TXN123456790',
      receiptNumber: 'RCP-2024-0002',
      createdAt: new Date('2024-02-03')
    },
    {
      id: 3,
      customerId: 3,
      amount: 12000,
      currency: 'TSH',
      paymentMode: 'bank_transfer',
      type: 'subscription',
      status: 'pending',
      referenceNumber: 'TXN123456791',
      createdAt: new Date('2024-02-06')
    }
  ];

  private subscriptions: Subscription[] = [
    {
      id: 1,
      customerId: 1,
      smartCardNumber: 'SC123456789',
      plan: 'AZAM_LITE_1M',
      amount: 12000,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-01'),
      activationType: 'agent_activation',
      status: 'active',
      createdAt: new Date('2024-02-01')
    },
    {
      id: 2,
      customerId: 2,
      smartCardNumber: 'SC123456790',
      plan: 'AZAM_PLAY_1M',
      amount: 22420,
      startDate: new Date('2025-04-24'),
      endDate: new Date('2025-05-23'),
      activationType: 'agent_activation',
      status: 'active',
      createdAt: new Date('2025-04-24')
    },
    {
      id: 3,
      customerId: 3,
      smartCardNumber: 'SC123456791',
      plan: 'AZAM_PREM_1M',
      amount: 35000,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-15'),
      activationType: 'agent_activation',
      status: 'suspended',
      createdAt: new Date('2024-01-15')
    },
    {
      id: 4,
      customerId: 1,
      smartCardNumber: 'SC123456792',
      plan: 'Azam Play 1 Month',
      amount: 22420,
      startDate: new Date('2025-04-24'),
      endDate: new Date('2025-05-23'),
      activationType: 'immediate',
      status: 'active',
      autoRenewal: true,
      createdAt: new Date('2025-04-24')
    }
  ];
  private systemIncidents: SystemIncident[] = [];
  private systemIncidentNotes: SystemIncidentNote[] = [];
  private systemIncidentAudits: SystemIncidentAudit[] = [];

  private nextId = {
    users: 4,
    agents: 2,
    customers: 4,
    inventoryItems: 6,
    inventoryRequests: 4,
    payments: 4,
    subscriptions: 5,
    systemIncidents: 3,
    incidentComments: 1,
    incidentSLAs: 1,
    incidentWorkflows: 1
  };

  constructor() {
    this.initializeSampleSystemIncidentData();
  }

  private initializeSampleSystemIncidentData() {
    // Sample system incidents
    const now = new Date();
    this.systemIncidents = [
      {
        id: 1,
        incidentId: 'SYS-2025-001',
        title: 'Portal Authentication Service Down',
        affectedSystem: 'Portal',
        severity: 'Critical',
        description: 'Users unable to login to portal due to authentication service failure. Error 503 being returned.',
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endTime: undefined,
        impactedCustomers: 500,
        rootCause: 'Database connection pool exhausted',
        resolutionSteps: 'Restarting authentication service, increasing connection pool size',
        status: 'Investigating',
        assignedOwner: 'John Doe',
        ownerTeam: 'Technical',
        attachments: [],
        notificationSettings: {
          emailAlerts: true,
          smsAlerts: true,
          stakeholders: ['admin@azamtv.co.tz', 'ops@azamtv.co.tz']
        },
        linkedServiceTickets: [1, 2],
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000)
      },
      {
        id: 2,
        incidentId: 'SYS-2025-002',
        title: 'CM System Performance Degradation',
        affectedSystem: 'CM',
        severity: 'Major',
        description: 'Customer management system experiencing slow response times. API calls taking >10 seconds.',
        startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        endTime: undefined,
        impactedCustomers: 200,
        rootCause: '',
        resolutionSteps: '',
        status: 'Open',
        assignedOwner: 'Jane Smith',
        ownerTeam: 'Operations',
        attachments: [],
        notificationSettings: {
          emailAlerts: true,
          smsAlerts: false,
          stakeholders: ['ops@azamtv.co.tz']
        },
        linkedServiceTickets: [],
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
      }
    ];

    // Update next IDs
    this.nextId.systemIncidents = 3;
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.nextId.users++,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;

    this.users.splice(index, 1);
    return true;
  }

  // Agent operations
  async getAgents(): Promise<Agent[]> {
    return [...this.agents];
  }

  async getAgentById(id: number): Promise<Agent | null> {
    return this.agents.find(agent => agent.id === id) || null;
  }

  async createAgent(agent: Omit<Agent, "id">): Promise<Agent> {
    const newAgent: Agent = {
      ...agent,
      id: this.nextId.agents++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.agents.push(newAgent);
    return newAgent;
  }

  async updateAgent(id: number, agent: Partial<Agent>): Promise<Agent | null> {
    const index = this.agents.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.agents[index] = {
      ...this.agents[index],
      ...agent,
      updatedAt: new Date()
    };
    return this.agents[index];
  }

  async deleteAgent(id: number): Promise<boolean> {
    const index = this.agents.findIndex(a => a.id === id);
    if (index === -1) return false;

    this.agents.splice(index, 1);
    return true;
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    return this.customers.find(customer => customer.id === id) || null;
  }

  async createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
    const newCustomer: Customer = {
      ...customer,
      id: this.nextId.customers++
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | null> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.customers[index] = { ...this.customers[index], ...customer };
    return this.customers[index];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.customers.splice(index, 1);
    return true;
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return [...this.inventoryItems];
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | null> {
    return this.inventoryItems.find(item => item.id === id) || null;
  }

  async createInventoryItem(item: Omit<InventoryItem, "id">): Promise<InventoryItem> {
    const newItem: InventoryItem = {
      ...item,
      id: this.nextId.inventoryItems++
    };
    this.inventoryItems.push(newItem);
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const index = this.inventoryItems.findIndex(i => i.id === id);
    if (index === -1) return null;

    this.inventoryItems[index] = { ...this.inventoryItems[index], ...item };
    return this.inventoryItems[index];
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const index = this.inventoryItems.findIndex(i => i.id === id);
    if (index === -1) return false;

    this.inventoryItems.splice(index, 1);
    return true;
  }

  // Inventory request operations
  async getInventoryRequests(): Promise<InventoryRequest[]> {
    return [...this.inventoryRequests];
  }

  async getInventoryRequestById(id: number): Promise<InventoryRequest | null> {
    return this.inventoryRequests.find(request => request.id === id) || null;
  }

  async createInventoryRequest(request: Omit<InventoryRequest, "id">): Promise<InventoryRequest> {
    const newRequest: InventoryRequest = {
      ...request,
      id: this.nextId.inventoryRequests++
    };
    this.inventoryRequests.push(newRequest);
    return newRequest;
  }

  async updateInventoryRequest(id: number, request: Partial<InventoryRequest>): Promise<InventoryRequest | null> {
    const index = this.inventoryRequests.findIndex(r => r.id === id);
    if (index === -1) return null;

    this.inventoryRequests[index] = { ...this.inventoryRequests[index], ...request };
    return this.inventoryRequests[index];
  }

  async deleteInventoryRequest(id: number): Promise<boolean> {
    const index = this.inventoryRequests.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.inventoryRequests.splice(index, 1);
    return true;
  }

  // Payment operations
  async getPayments(): Promise<Payment[]> {
    return [...this.payments];
  }

  async getPaymentById(id: number): Promise<Payment | null> {
    return this.payments.find(payment => payment.id === id) || null;
  }

  async createPayment(payment: Omit<Payment, "id">): Promise<Payment> {
    const newPayment: Payment = {
      ...payment,
      id: this.nextId.payments++
    };
    this.payments.push(newPayment);
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | null> {
    const index = this.payments.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.payments[index] = { ...this.payments[index], ...payment };
    return this.payments[index];
  }

  async deletePayment(id: number): Promise<boolean> {
    const index = this.payments.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.payments.splice(index, 1);
    return true;
  }

  // Subscription operations
  async getSubscriptions(): Promise<Subscription[]> {
    return [...this.subscriptions];
  }

  async getSubscriptionById(id: number): Promise<Subscription | null> {
    return this.subscriptions.find(subscription => subscription.id === id) || null;
  }

  async createSubscription(subscription: Omit<Subscription, "id">): Promise<Subscription> {
    const newSubscription: Subscription = {
      ...subscription,
      id: this.nextId.subscriptions++
    };
    this.subscriptions.push(newSubscription);
    return newSubscription;
  }

  async updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription | null> {
    const index = this.subscriptions.findIndex(s => s.id === id);
    if (index === -1) return null;

    this.subscriptions[index] = { ...this.subscriptions[index], ...subscription };
    return this.subscriptions[index];
  }

  async deleteSubscription(id: number): Promise<boolean> {
    const index = this.subscriptions.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.subscriptions.splice(index, 1);
    return true;
  }

  // System Incident operations
  async getSystemIncidents(): Promise<SystemIncident[]> {
    return [...this.systemIncidents];
  }

  async getSystemIncidentById(id: number): Promise<SystemIncident | null> {
    return this.systemIncidents.find(incident => incident.id === id) || null;
  }

  async getSystemIncidentByIncidentId(incidentId: string): Promise<SystemIncident | null> {
    return this.systemIncidents.find(incident => incident.incidentId === incidentId) || null;
  }

  async createSystemIncident(incident: Omit<SystemIncident, "id" | "incidentId" | "createdAt" | "updatedAt">): Promise<SystemIncident> {
    const incidentId = `SYS-${new Date().getFullYear()}-${String(this.nextId.systemIncidents).padStart(3, '0')}`;

    const newIncident: SystemIncident = {
      ...incident,
      id: this.nextId.systemIncidents++,
      incidentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.systemIncidents.push(newIncident);
    return newIncident;
  }

  async updateSystemIncident(id: number, incident: Partial<SystemIncident>): Promise<SystemIncident | null> {
    const index = this.systemIncidents.findIndex(i => i.id === id);
    if (index === -1) return null;

    this.systemIncidents[index] = {
      ...this.systemIncidents[index],
      ...incident,
      updatedAt: new Date()
    };
    return this.systemIncidents[index];
  }

  async deleteSystemIncident(id: number): Promise<boolean> {
    const index = this.systemIncidents.findIndex(i => i.id === id);
    if (index === -1) return false;

    this.systemIncidents.splice(index, 1);
    return true;
  }

  // System Incident note operations
  async getSystemIncidentNotes(incidentId: number): Promise<SystemIncidentNote[]> {
    return this.systemIncidentNotes.filter(note => note.incidentId === incidentId);
  }

  async createSystemIncidentNote(note: Omit<SystemIncidentNote, "id" | "createdAt">): Promise<SystemIncidentNote> {
    const newNote: SystemIncidentNote = {
      ...note,
      id: this.nextId.systemIncidents++,
      createdAt: new Date()
    };
    this.systemIncidentNotes.push(newNote);
    return newNote;
  }

  // System Incident audit operations
  async getSystemIncidentAudit(incidentId: number): Promise<SystemIncidentAudit[]> {
    return this.systemIncidentAudits.filter(audit => audit.incidentId === incidentId);
  }

  async createSystemIncidentAudit(audit: Omit<SystemIncidentAudit, "id" | "createdAt">): Promise<SystemIncidentAudit> {
    const newAudit: SystemIncidentAudit = {
      ...audit,
      id: this.nextId.systemIncidents++,
      createdAt: new Date()
    };
    this.systemIncidentAudits.push(newAudit);
    return newAudit;
  }

  // Mock data for receipt cancellation
  private paymentDetails: any[] = [
    {
      payId: "PAY_001",
      sapBpId: "BP001",
      sapCaId: "CA001",
      customerId: "CUST001",
      customerName: "Amina Hassan",
      customerType: "PREPAID",
      payType: "Subscription",
      payAmount: 45000,
      vatAmount: 8100,
      totalAmount: 53100,
      payMode: "MOBILE_MONEY",
      status: "COMPLETED",
      transId: "TXN_001",
      collectedBy: "AGT001",
      collectionCenter: "DSM_CENTER_001",
      description: "Monthly subscription payment",
      receiptNo: "RCP_001",
      mobileRef: "MM123456789",
      createId: "agent001",
      createDt: new Date('2024-01-15'),
      createTs: new Date('2024-01-15'),
      cmStatus: "PROCESSED",
      cmStatusMsg: "Payment processed successfully",
      ficaStatus: "POSTED",
      ficaStatusMsg: "Posted to FICA successfully"
    },
    {
      payId: "PAY_002",
      sapBpId: "BP002",
      sapCaId: "CA002",
      customerId: "CUST002",
      customerName: "Joseph Mwamba",
      customerType: "POSTPAID",
      payType: "Hardware",
      payAmount: 150000,
      vatAmount: 27000,
      totalAmount: 177000,
      payMode: "CASH",
      status: "COMPLETED",
      transId: "TXN_002",
      collectedBy: "AGT001",
      collectionCenter: "DSM_CENTER_001",
      description: "Set-top box purchase",
      receiptNo: "RCP_002",
      createId: "agent001",
      createDt: new Date('2024-01-20'),
      createTs: new Date('2024-01-20'),
      cmStatus: "PROCESSED",
      cmStatusMsg: "Payment processed successfully",
      ficaStatus: "POSTED",
      ficaStatusMsg: "Posted to FICA successfully"
    }
  ];

  private receiptCancellations: any[] = [];

  // Receipt Cancellation operations implementation
  async getEligibleReceiptsForCancellation(filters: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    agentId?: string;
    paymentMode?: string;
    page: number;
    limit: number;
  }): Promise<any[]> {
    let eligibleReceipts = this.paymentDetails.filter(payment => {
      // Only allow cancellation for completed payments
      if (payment.status !== 'COMPLETED') return false;

      // Check if already cancelled
      const existingCancellation = this.receiptCancellations.find(c => c.payId === payment.payId);
      if (existingCancellation) return false;

      // Check FI period (mock: allow cancellation within 30 days)
      const daysSincePayment = Math.floor((Date.now() - new Date(payment.createDt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePayment > 30) return false;

      // Apply filters
      if (filters.dateFrom && new Date(payment.createDt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(payment.createDt) > new Date(filters.dateTo)) return false;
      if (filters.customerId && payment.customerId !== filters.customerId) return false;
      if (filters.agentId && payment.collectedBy !== filters.agentId) return false;
      if (filters.paymentMode && payment.payMode !== filters.paymentMode) return false;

      return true;
    });

    // Pagination
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;

    return eligibleReceipts.slice(startIndex, endIndex);
  }

  async getReceiptForCancellation(payId: string): Promise<any | null> {
    return this.paymentDetails.find(p => p.payId === payId) || null;
  }

  async isReceiptEligibleForCancellation(payId: string): Promise<{ eligible: boolean; reason?: string; currentStatus?: string }> {
    const payment = this.paymentDetails.find(p => p.payId === payId);
    if (!payment) {
      return { eligible: false, reason: "Receipt not found" };
    }

    if (payment.status !== 'COMPLETED') {
      return { eligible: false, reason: "Only completed payments can be cancelled", currentStatus: payment.status };
    }

    const existingCancellation = this.receiptCancellations.find(c => c.payId === payId);
    if (existingCancellation) {
      return { eligible: false, reason: "Receipt already cancelled", currentStatus: payment.status };
    }

    // Check FI period (mock: 30 days)
    const daysSincePayment = Math.floor((Date.now() - new Date(payment.createDt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePayment > 30) {
      return { eligible: false, reason: "FI period has closed for this payment", currentStatus: payment.status };
    }

    return { eligible: true, currentStatus: payment.status };
  }

  async cancelReceipt(cancellation: {
    payId: string;
    cancellationReason: string;
    cancelledBy: string;
    cancellationDate: Date;
    originalStatus: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const payment = this.paymentDetails.find(p => p.payId === cancellation.payId);
      if (!payment) {
        return { success: false, error: "Payment not found" };
      }

      // Update payment status
      payment.status = "CANCELLED";
      payment.updateId = cancellation.cancelledBy;
      payment.updateDt = cancellation.cancellationDate;
      payment.updateTs = cancellation.cancellationDate;

      // Create cancellation record
      const cancellationRecord = {
        payId: cancellation.payId,
        cancellationReason: cancellation.cancellationReason,
        cancelledBy: cancellation.cancelledBy,
        cancellationDate: cancellation.cancellationDate,
        originalStatus: cancellation.originalStatus,
        cmStatus: "PENDING",
        cmStatusMsg: "Cancellation initiated",
        ficaStatus: "PENDING",
        ficaStatusMsg: "Awaiting reversal processing"
      };

      this.receiptCancellations.push(cancellationRecord);

      return {
        success: true,
        data: {
          cancellation: cancellationRecord,
          paymentDetails: payment
        }
      };
    } catch (error) {
      return { success: false, error: "Failed to process cancellation" };
    }
  }

  async updateCancellationCMStatus(payId: string, cmUpdate: {
    cmRequestId?: string;
    cmStatus?: string;
    cmStatusMsg?: string;
    ficaStatus?: string;
    ficaStatusMsg?: string;
  }): Promise<void> {
    const cancellation = this.receiptCancellations.find(c => c.payId === payId);
    if (cancellation) {
      Object.assign(cancellation, cmUpdate);
    }
  }

  async adjustWalletForCancellation(customerId: string, amount: number): Promise<any> {
    // Mock wallet adjustment - in real implementation, this would update customer wallet
    return {
      customerId,
      adjustmentAmount: amount,
      adjustmentType: "CREDIT",
      adjustmentReason: "Receipt cancellation refund",
      newBalance: 150000 + amount, // Mock previous balance + adjustment
      adjustmentDate: new Date()
    };
  }

  async getCancellationAuditTrail(payId: string): Promise<any | null> {
    const cancellation = this.receiptCancellations.find(c => c.payId === payId);
    if (!cancellation) return null;

    return {
      payId,
      auditTrail: [
        {
          action: "CANCELLATION_INITIATED",
          performedBy: cancellation.cancelledBy,
          timestamp: cancellation.cancellationDate,
          details: `Cancellation initiated: ${cancellation.cancellationReason}`
        },
        {
          action: "CM_STATUS_UPDATE",
          performedBy: "SYSTEM",
          timestamp: new Date(),
          details: `CM Status: ${cancellation.cmStatus} - ${cancellation.cmStatusMsg}`
        },
        {
          action: "FICA_STATUS_UPDATE",
          performedBy: "SYSTEM",
          timestamp: new Date(),
          details: `FICA Status: ${cancellation.ficaStatus} - ${cancellation.ficaStatusMsg}`
        }
      ]
    };
  }

  async getCancellationStatus(payId: string): Promise<any | null> {
    const cancellation = this.receiptCancellations.find(c => c.payId === payId);
    if (!cancellation) return null;

    return {
      payId,
      cancellationStatus: "PROCESSING",
      cmStatus: cancellation.cmStatus,
      cmStatusMsg: cancellation.cmStatusMsg,
      ficaStatus: cancellation.ficaStatus,
      ficaStatusMsg: cancellation.ficaStatusMsg,
      lastUpdated: new Date()
    };
  }

  // Customer Transfer operations
  private customerTransfers: CustomerTransfer[] = [];
  private nextCustomerTransferId = 1;

  async getCustomerTransfers(): Promise<CustomerTransfer[]> {
    return this.customerTransfers;
  }

  async getCustomerTransferById(id: number): Promise<CustomerTransfer | null> {
    return this.customerTransfers.find(t => t.id === id) || null;
  }

  async createCustomerTransfer(transfer: Omit<CustomerTransfer, "id" | "createDt" | "createTs">): Promise<CustomerTransfer> {
    const now = new Date();
    const newTransfer: CustomerTransfer = {
      ...transfer,
      id: this.nextCustomerTransferId++,
      createDt: now,
      createTs: now
    };
    this.customerTransfers.push(newTransfer);
    return newTransfer;
  }

  async updateCustomerTransfer(id: number, transfer: Partial<CustomerTransfer>): Promise<CustomerTransfer | null> {
    const index = this.customerTransfers.findIndex(t => t.id === id);
    if (index === -1) return null;

    const updatedTransfer = {
      ...this.customerTransfers[index],
      ...transfer,
      updateDt: new Date(),
      updateTs: new Date()
    };
    this.customerTransfers[index] = updatedTransfer;
    return updatedTransfer;
  }

  async validateTransferEligibility(sourceCustomerId: number, targetCustomerId: number, amount: number): Promise<{
    eligible: boolean;
    reason?: string;
    sourceCustomer?: Customer;
    targetCustomer?: Customer;
    availablePayments?: Payment[];
  }> {
    const sourceCustomer = await this.getCustomerById(sourceCustomerId);
    const targetCustomer = await this.getCustomerById(targetCustomerId);

    if (!sourceCustomer) {
      return { eligible: false, reason: "Source customer not found" };
    }

    if (!targetCustomer) {
      return { eligible: false, reason: "Target customer not found" };
    }

    if (sourceCustomerId === targetCustomerId) {
      return { eligible: false, reason: "Cannot transfer payment to the same customer" };
    }

    // Check for available payments for the source customer
    const availablePayments = this.payments.filter(p =>
      p.customerId === sourceCustomerId &&
      p.status === 'COMPLETED' &&
      p.amount >= amount
    );

    if (availablePayments.length === 0) {
      return {
        eligible: false,
        reason: "No eligible payments found for the source customer",
        sourceCustomer,
        targetCustomer
      };
    }

    return {
      eligible: true,
      sourceCustomer,
      targetCustomer,
      availablePayments
    };
  }

  async checkInvoiceStatus(invoiceNumber: string): Promise<{
    status: 'CLEARED' | 'PENDING';
    requiresManualIntervention: boolean;
  }> {
    // Mock invoice status check - in real implementation, this would query SAP FICA
    const isCleared = Math.random() > 0.7; // 30% chance invoice is already cleared

    return {
      status: isCleared ? 'CLEARED' : 'PENDING',
      requiresManualIntervention: isCleared
    };
  }

  async updateTransferCMStatus(transferId: number, cmUpdate: {
    cmStatus?: string;
    cmStatusMessage?: string;
    ficaStatus?: string;
    ficaStatusMessage?: string;
    somStatus?: string;
    somStatusMessage?: string;
    requestId?: string;
  }): Promise<void> {
    const transfer = this.customerTransfers.find(t => t.id === transferId);
    if (transfer) {
      Object.assign(transfer, cmUpdate, {
        updateDt: new Date(),
        updateTs: new Date()
      });
    }
  }

  // Adjustment operations
  private adjustments: Adjustment[] = [
    {
      id: 1,
      bpId: "BP10001",
      scId: "SC20001",
      customerName: "John Doe",
      type: "CREDIT",
      invoiceNumber: "INV-12345",
      reason: "Overcharge Correction",
      comments: "Customer complaint regarding duplicate charge",
      amount: 50000,
      currency: "TZS",
      walletType: "SUBSCRIPTION",
      vatType: "VAT",
      status: "PENDING",
      requestedBy: "admin",
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      bpId: "BP10002",
      scId: "SC20002",
      customerName: "Jane Smith",
      type: "DEBIT",
      invoiceNumber: "INV-54321",
      reason: "Service Fee Adjustment",
      comments: "Additional service charges",
      amount: 25000,
      currency: "TZS",
      walletType: "HW",
      vatType: "NO_VAT",
      status: "APPROVED",
      requestedBy: "agent",
      requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      approvedBy: "manager",
      approvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      cmStatus: "PROCESSED",
      cmStatusMessage: "Successfully posted to CM",
      ficaStatus: "COMPLETED",
      ficaStatusMessage: "Amount adjusted in customer account"
    },
    {
      id: 3,
      bpId: "BP10003",
      customerName: "Bob Johnson",
      type: "CREDIT",
      reason: "Refund Processing",
      comments: "Service cancellation refund",
      amount: 75000,
      currency: "TZS",
      walletType: "PREPAID",
      vatType: "VAT",
      status: "PROCESSED",
      requestedBy: "admin",
      requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      approvedBy: "admin",
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      cmStatus: "COMPLETED",
      cmStatusMessage: "Refund processed successfully",
      ficaStatus: "COMPLETED",
      ficaStatusMessage: "Customer wallet credited"
    }
  ];
  private nextAdjustmentId = 4;

  async getAdjustments(): Promise<Adjustment[]> {
    return this.adjustments;
  }

  async getAdjustmentById(id: number): Promise<Adjustment | null> {
    return this.adjustments.find(adj => adj.id === id) || null;
  }

  async createAdjustment(adjustment: Omit<Adjustment, "id" | "requestedAt">): Promise<Adjustment> {
    const newAdjustment: Adjustment = {
      ...adjustment,
      id: this.nextAdjustmentId++,
      requestedAt: new Date()
    };
    this.adjustments.push(newAdjustment);
    return newAdjustment;
  }

  async updateAdjustment(id: number, adjustment: Partial<Adjustment>): Promise<Adjustment | null> {
    const index = this.adjustments.findIndex(adj => adj.id === id);
    if (index === -1) return null;

    this.adjustments[index] = { ...this.adjustments[index], ...adjustment };
    return this.adjustments[index];
  }

  async approveAdjustment(id: number, approvedBy: string): Promise<Adjustment | null> {
    const adjustment = await this.getAdjustmentById(id);
    if (!adjustment) return null;

    const updatedAdjustment = await this.updateAdjustment(id, {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
      cmStatus: 'PROCESSING',
      cmStatusMessage: 'Adjustment approved and being processed'
    });

    // Simulate CM processing
    setTimeout(async () => {
      await this.updateAdjustment(id, {
        status: 'PROCESSED',
        processedAt: new Date(),
        cmStatus: 'COMPLETED',
        cmStatusMessage: 'Adjustment successfully posted to CM',
        ficaStatus: 'COMPLETED',
        ficaStatusMessage: 'Customer account updated'
      });
    }, 3000);

    return updatedAdjustment;
  }

  async rejectAdjustment(id: number, rejectedBy: string, rejectionReason: string): Promise<Adjustment | null> {
    return this.updateAdjustment(id, {
      status: 'REJECTED',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason
    });
  }

  async getCustomerDetailsByBpId(bpId: string): Promise<CustomerDetails | null> {
    // Mock customer data lookup
    const mockCustomers: { [key: string]: CustomerDetails } = {
      "BP10001": {
        bpId: "BP10001",
        scId: "SC20001",
        name: "John Doe",
        customerType: "Individual",
        accountType: "Prepaid",
        balance: 120000,
        currency: "TZS",
        subscription: "Active Premium",
        status: "Active",
        phone: "xxxx712345678",
        email: "john.doe@example.com"
      },
      "BP10002": {
        bpId: "BP10002",
        scId: "SC20002",
        name: "Jane Smith",
        customerType: "Corporate",
        accountType: "Postpaid",
        balance: 250000,
        currency: "TZS",
        subscription: "Active Business",
        status: "Active",
        phone: "xxxx712345679",
        email: "jane.smith@company.com"
      },
      "BP10003": {
        bpId: "BP10003",
        name: "Bob Johnson",
        customerType: "Individual",
        accountType: "Agent",
        balance: 500000,
        currency: "TZS",
        subscription: "Agent Account",
        status: "Active",
        phone: "xxxx712345680",
        email: "bob.johnson@example.com"
      }
    };

    return mockCustomers[bpId] || null;
  }

  async getCustomerDetailsByScId(scId: string): Promise<CustomerDetails | null> {
    // Find customer by SC ID
    const mockCustomers = await this.getCustomerDetailsByBpId("BP10001");
    if (mockCustomers?.scId === scId) return mockCustomers;

    const customer2 = await this.getCustomerDetailsByBpId("BP10002");
    if (customer2?.scId === scId) return customer2;

    return null;
  }

  async getPendingAdjustments(): Promise<Adjustment[]> {
    return this.adjustments.filter(adj => adj.status === 'PENDING');
  }

  async getProcessedAdjustments(): Promise<Adjustment[]> {
    return this.adjustments.filter(adj => adj.status === 'PROCESSED');
  }

  // Mock data for reports
  private dailyReports: DailyReport[] = [];
  private traReports: TRAReport[] = [];
  private tcraReports: TCRAReport[] = [];
  private reportAuditLogs: ReportAuditLog[] = [];

  private notifications: Notification[] = [
    {
      id: 1,
      title: 'New Agent KYC Submitted',
      message: 'John Mwangi has submitted KYC documents for review',
      type: 'kyc',
      priority: 'medium',
      status: 'unread',
      userId: 1,
      actionUrl: '/kyc-verification',
      metadata: { agentId: 1 },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: 2,
      title: 'Low Stock Alert',
      message: 'STB units running low - only 15 units remaining in Dar warehouse',
      type: 'inventory',
      priority: 'high',
      status: 'unread',
      userId: 1,
      actionUrl: '/stock-overview',
      metadata: { itemType: 'STB', quantity: 15 },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      id: 3,
      title: 'Payment Failed',
      message: 'Payment of TSH 45,000 for customer #1001 has failed',
      type: 'payment',
      priority: 'high',
      status: 'unread',
      userId: 1,
      actionUrl: '/payment-management',
      metadata: { customerId: 1001, amount: 45000 },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    },
    {
      id: 4,
      title: 'System Maintenance Scheduled',
      message: 'System maintenance scheduled for tomorrow 2:00 AM - 4:00 AM',
      type: 'system',
      priority: 'medium',
      status: 'read',
      userId: 1,
      actionUrl: '/dashboard',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      readAt: new Date(Date.now() - 20 * 60 * 60 * 1000) // read 20 hours ago
    },
    {
      id: 5,
      title: 'New Service Ticket',
      message: 'High priority service ticket created for technical support',
      type: 'service',
      priority: 'high',
      status: 'unread',
      userId: 1,
      actionUrl: '/service-ticketing',
      metadata: { ticketId: 12345 },
      createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    }
  ];

  // Subscriber view data
  private subscriberDetails: SubscriberDetails[] = [
    {
      id: 1,
      customerId: "1",
      customerName: "Amina Hassan",
      smartCard: "SUM524567",
      customerType: "prepaid",
      accountStatus: "active",
      currentPlan: "Base Plan",
      nextBillingDate: "2025-05-23",
      lastPaymentDate: "2024-04-25",
      totalAmountPaid: 65000,
      outstandingBalance: 0,
      autoRenewal: true
    },
    {
      id: 2,
      customerId: "CUST001",
      customerName: "Michael Johnson",
      smartCard: "SC123456789",
      customerType: "prepaid",
      accountStatus: "active",
      currentPlan: "Azam Play 1 Month",
      nextBillingDate: "2025-05-23",
      lastPaymentDate: "2025-04-24",
      totalAmountPaid: 67420,
      outstandingBalance: 0,
      autoRenewal: true
    },
    {
      id: 3,
      customerId: "CUST002",
      customerName: "Sarah Wilson",
      smartCard: "SC123456890",
      customerType: "postpaid",
      accountStatus: "active",
      currentPlan: "Azam Business 3 Months",
      nextBillingDate: "2025-07-01",
      lastPaymentDate: "2025-04-01",
      totalAmountPaid: 120000,
      outstandingBalance: 0,
      autoRenewal: false
    },
    {
      id: 4,
      customerId: "CUST003",
      customerName: "Robert Mwalimu",
      smartCard: "SC123456891",
      customerType: "prepaid",
      accountStatus: "active",
      currentPlan: "Azam Business 3 Months",
      nextBillingDate: "2025-07-01",
      lastPaymentDate: "2025-04-01",
      totalAmountPaid: 105000,
      outstandingBalance: 0,
      autoRenewal: true
    },
    {
      id: 5,
      customerId: "CUST004",
      customerName: "John Doe",
      smartCard: "SC123456892",
      customerType: "prepaid",
      accountStatus: "suspended",
      currentPlan: "Azam Family 2 Months",
      nextBillingDate: "2025-06-15",
      lastPaymentDate: "2025-04-15",
      totalAmountPaid: 44400,
      outstandingBalance: 15000,
      autoRenewal: true
    }
  ];

  private subscriptionHistory: SubscriptionHistory[] = [
    {
      id: 1,
      customerId: "1",
      planName: "Base Plan",
      startDate: "2024-04-25",
      endDate: "2025-05-23",
      status: "active",
      amount: 25000,
      currency: "TZS",
      paymentMethod: "M-Pesa"
    },
    {
      id: 2,
      customerId: "1",
      planName: "Standard Plan",
      startDate: "2024-04-18",
      endDate: "2024-04-25",
      status: "completed",
      amount: 35000,
      currency: "TZS",
      paymentMethod: "Tigo Pesa"
    },
    {
      id: 3,
      customerId: "CUST001",
      planName: "Azam Play 1 Month",
      startDate: "2025-04-24",
      endDate: "2025-05-23",
      status: "active",
      amount: 22420,
      currency: "TZS",
      paymentMethod: "Wallet"
    },
    {
      id: 4,
      customerId: "CUST001",
      planName: "Azam Lite 1 Month",
      startDate: "2025-03-24",
      endDate: "2025-04-23",
      status: "completed",
      amount: 12000,
      currency: "TZS",
      paymentMethod: "Wallet"
    },
    {
      id: 5,
      customerId: "CUST001",
      planName: "Azam Lite 1 Month",
      startDate: "2024-01-15",
      endDate: "2025-02-14",
      status: "completed",
      amount: 12000,
      currency: "TZS",
      paymentMethod: "Mobile Money"
    },
    {
      id: 6,
      customerId: "CUST002",
      planName: "Azam Business 3 Months",
      startDate: "2025-04-01",
      endDate: "2025-07-01",
      status: "active",
      amount: 120000,
      currency: "TZS",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 7,
      customerId: "CUST003",
      planName: "Azam Business 3 Months",
      startDate: "2025-04-01",
      endDate: "2025-07-01",
      status: "active",
      amount: 105000,
      currency: "TZS",
      paymentMethod: "Mobile Money"
    },
    {
      id: 8,
      customerId: "CUST004",
      planName: "Azam Family 2 Months",
      startDate: "2025-04-15",
      endDate: "2025-06-15",
      status: "suspended",
      amount: 35400,
      currency: "TZS",
      paymentMethod: "Wallet"
    }
  ];

  private paymentHistory: PaymentHistory[] = [
    {
      id: 1,
      customerId: "1",
      date: "2024-04-25",
      time: "14:30:15",
      transactionId: "PT-2024042501",
      paymentMethod: "M-Pesa",
      amount: 25000,
      currency: "TZS",
      status: "Completed",
      reference: "MP240425XXXX",
      description: "Base Plan Subscription"
    },
    {
      id: 2,
      customerId: "1",
      date: "2024-04-20",
      time: "16:45:22",
      transactionId: "PT-2024042002",
      paymentMethod: "Tigo Pesa",
      amount: 8000,
      currency: "TZS",
      status: "Completed",
      reference: "TP240420XXXX",
      description: "Sports Pack Add-on"
    },
    {
      id: 3,
      customerId: "CUST001",
      date: "2025-04-24",
      time: "14:00:00",
      transactionId: "TXN-2025-004-001",
      paymentMethod: "Wallet",
      amount: 22420,
      currency: "TZS",
      status: "Completed",
      reference: "RCP-2025-004-001",
      description: "Azam Play 1 Month - Auto Renewal"
    },
    {
      id: 4,
      customerId: "CUST001",
      date: "2025-04-24",
      time: "14:00:00",
      transactionId: "TXN-2025-004-002",
      paymentMethod: "Wallet",
      amount: 8000,
      currency: "TZS",
      status: "Completed",
      reference: "RCP-2025-004-002",
      description: "Sports Ultimate Pack"
    },
    {
      id: 5,
      customerId: "CUST001",
      date: "2025-04-20",
      time: "09:15:00",
      transactionId: "TXN-2025-004-003",
      paymentMethod: "Mobile Money",
      amount: 30000,
      currency: "TZS",
      status: "Completed",
      reference: "RCP-2025-004-003",
      description: "Wallet Top-up via M-Pesa"
    },
    {
      id: 6,
      customerId: "CUST001",
      date: "2025-04-18",
      time: "11:30:00",
      transactionId: "TXN-2025-004-004",
      paymentMethod: "Mobile Money",
      amount: 5000,
      currency: "TZS",
      status: "Completed",
      reference: "RCP-2025-004-004",
      description: "Premium Movies Pack Add-on"
    },
    {
      id: 7,
      customerId: "CUST002",
      date: "2025-04-01",
      time: "10:00:00",
      transactionId: "TXN-2025-004-100",
      paymentMethod: "Bank Transfer",
      amount: 120000,
      currency: "TZS",
      status: "Completed",
      reference: "BT-2025-004-100",
      description: "Azam Business 3 Months"
    },
    {
      id: 8,
      customerId: "CUST003",
      date: "2025-04-01",
      time: "14:00:00",
      transactionId: "TXN-2025-004-200",
      paymentMethod: "Mobile Money",
      amount: 105000,
      currency: "TZS",
      status: "Completed",
      reference: "MP-2025-004-200",
      description: "Azam Business 3 Months"
    },
    {
      id: 9,
      customerId: "CUST004",
      date: "2025-04-15",
      time: "14:00:00",
      transactionId: "TXN-2025-004-300",
      paymentMethod: "Wallet",
      amount: 35400,
      currency: "TZS",
      status: "Completed",
      reference: "RCP-2025-004-300",
      description: "Azam Family 2 Months"
    }
  ];

  private serviceActions: ServiceAction[] = [
    {
      id: 1,
      customerId: "1",
      date: "2024-04-25",
      time: "10:30",
      actionType: "Subscription Purchase",
      smartCard: "SUM524567",
      details: "Base Plan - 1 Month",
      status: "Completed",
      performedBy: "John Agent"
    },
    {
      id: 2,
      customerId: "1",
      date: "2024-04-20",
      time: "16:15",
      actionType: "Add Add-ON Pack",
      smartCard: "SUM524567",
      details: "Sports Ultimate Pack Added",
      status: "Active",
      performedBy: "Sarah Agent"
    },
    {
      id: 3,
      customerId: "1",
      date: "2024-04-18",
      time: "11:45",
      actionType: "Plan Change",
      smartCard: "SUM524567",
      details: "Basic → Standard Plan",
      status: "Completed",
      performedBy: "Mike Agent"
    },
    {
      id: 4,
      customerId: "CUST001",
      date: "2025-04-24",
      time: "14:00",
      actionType: "Subscription Purchase",
      smartCard: "SC123456789",
      details: "Azam Play 1 Month - TZS 22,420",
      status: "Completed",
      performedBy: "Agent: Sarah Johnson"
    },
    {
      id: 5,
      customerId: "CUST001",
      date: "2025-04-20",
      time: "09:15",
      actionType: "Subscription Renewal",
      smartCard: "SC123456789",
      details: "Auto renewal - Azam Play 1 Month",
      status: "Completed",
      performedBy: "System: Auto Renewal"
    },
    {
      id: 6,
      customerId: "CUST001",
      date: "2025-04-18",
      time: "16:30",
      actionType: "Add Add-ON Pack",
      smartCard: "SC123456789",
      details: "Sports Ultimate Pack - TZS 8,000",
      status: "Active",
      performedBy: "Agent: John Mwangi"
    },
    {
      id: 7,
      customerId: "CUST001",
      date: "2025-04-15",
      time: "11:45",
      actionType: "Plan Change",
      smartCard: "SC123456789",
      details: "Upgraded from Lite to Play package",
      status: "Applied",
      performedBy: "Agent: Mary Kilimo"
    },
    {
      id: 8,
      customerId: "CUST002",
      date: "2025-04-01",
      time: "10:00",
      actionType: "Subscription Purchase",
      smartCard: "SC123456890",
      details: "Azam Business 3 Months - TZS 120,000",
      status: "Completed",
      performedBy: "Agent: Business Team"
    },
    {
      id: 9,
      customerId: "CUST003",
      date: "2025-04-01",
      time: "14:00",
      actionType: "Subscription Purchase",
      smartCard: "SC123456891",
      details: "Azam Business 3 Months - TZS 105,000",
      status: "Completed",
      performedBy: "Agent: Business Team"
    },
    {
      id: 10,
      customerId: "CUST004",
      date: "2025-04-15",
      time: "14:00",
      actionType: "Subscription Purchase",
      smartCard: "SC123456892",
      details: "Azam Family 2 Months - TZS 35,400",
      status: "Completed",
      performedBy: "Agent: Family Team"
    },
    {
      id: 11,
      customerId: "CUST004",
      date: "2025-04-20",
      time: "10:00",
      actionType: "Suspension",
      smartCard: "SC123456892",
      details: "Service suspended - Non-payment",
      status: "Active",
      performedBy: "System: Auto Suspend"
    },
    {
      id: 12,
      customerId: "CUST001",
      date: "2025-04-10",
      time: "08:30",
      actionType: "Wallet Top-up",
      smartCard: "SC123456789",
      details: "Customer wallet recharged - TZS 50,000",
      status: "Completed",
      performedBy: "Agent: David Mwema"
    },
    {
      id: 13,
      customerId: "CUST001",
      date: "2025-04-12",
      time: "13:20",
      actionType: "Account Activation",
      smartCard: "SC123456789",
      details: "Account reactivated after payment",
      status: "Completed",
      performedBy: "Agent: Grace Mwangi"
    },
    {
      id: 14,
      customerId: "CUST001",
      date: "2025-04-08",
      time: "15:45",
      actionType: "Hardware Replacement",
      smartCard: "SC123456789",
      details: "STB replaced due to malfunction",
      status: "Completed",
      performedBy: "Technician: James Kiprotich"
    },
    {
      id: 15,
      customerId: "CUST001",
      date: "2025-04-05",
      time: "11:15",
      actionType: "Service Request",
      smartCard: "SC123456789",
      details: "Channel alignment and signal optimization",
      status: "Completed",
      performedBy: "Technician: Peter Mwendwa"
    },
    {
      id: 16,
      customerId: "CUST001",
      date: "2025-04-03",
      time: "16:00",
      actionType: "Promotion Applied",
      smartCard: "SC123456789",
      details: "50% off next month promotion activated",
      status: "Active",
      performedBy: "Agent: Lisa Wanjiku"
    },
    {
      id: 17,
      customerId: "CUST001",
      date: "2025-04-01",
      time: "09:30",
      actionType: "Account Update",
      smartCard: "SC123456789",
      details: "Customer contact information updated",
      status: "Completed",
      performedBy: "Agent: Michael Kimani"
    }
  ];

  private serviceTickets: ServiceTicket[] = [
    {
      id: 1,
      customerId: "1",
      date: "2024-04-25",
      time: "14:30",
      ticketId: "TK-001234",
      type: "Signal Issue",
      priority: "Medium",
      status: "Resolved",
      agent: "John Agent",
      description: "Customer reported weak signal issues",
      resolution: "Signal booster installed and issue resolved"
    },
    {
      id: 2,
      customerId: "1",
      date: "2024-04-22",
      time: "09:15",
      ticketId: "TK-001233",
      type: "Billing Query",
      priority: "Low",
      status: "Closed",
      agent: "Sarah Agent",
      description: "Customer inquiry about billing charges",
      resolution: "Billing details explained to customer satisfaction"
    },
    {
      id: 3,
      customerId: "CUST001",
      date: "2025-04-25",
      time: "14:30",
      ticketId: "TK-2025-001234",
      type: "Technical Issue",
      priority: "High",
      status: "In Progress",
      agent: "Agent: Sarah Johnson",
      description: "No signal on channels 101-150",
      resolution: "Technician dispatched to check dish alignment"
    },
    {
      id: 4,
      customerId: "CUST001",
      date: "2025-04-22",
      time: "10:15",
      ticketId: "TK-2025-001198",
      type: "Billing Query",
      priority: "Medium",
      status: "Resolved",
      agent: "Agent: John Mwangi",
      description: "Query about double charging",
      resolution: "Verified billing, refund processed"
    },
    {
      id: 5,
      customerId: "CUST001",
      date: "2025-04-20",
      time: "16:45",
      ticketId: "TK-2025-001156",
      type: "Service Request",
      priority: "Low",
      status: "Closed",
      agent: "Agent: Mary Kilimo",
      description: "Request for additional channels",
      resolution: "Upgraded to premium package"
    },
    {
      id: 6,
      customerId: "CUST001",
      date: "2025-04-18",
      time: "09:20",
      ticketId: "TK-2025-001089",
      type: "Hardware Issue",
      priority: "High",
      status: "Resolved",
      agent: "Technician: Peter Tech",
      description: "STB not powering on",
      resolution: "STB replaced under warranty"
    },
    {
      id: 7,
      customerId: "CUST002",
      date: "2025-04-05",
      time: "10:30",
      ticketId: "TK-2025-002001",
      type: "Service Request",
      priority: "Medium",
      status: "Resolved",
      agent: "Agent: Business Support",
      description: "Request for channel package modification",
      resolution: "Business package customized as requested"
    },
    {
      id: 8,
      customerId: "CUST003",
      date: "2025-04-10",
      time: "15:20",
      ticketId: "TK-2025-003001",
      type: "Technical Issue",
      priority: "Medium",
      status: "Resolved",
      agent: "Technician: Business Tech",
      description: "Intermittent signal loss during business hours",
      resolution: "Signal strength optimized for business use"
    },
    {
      id: 9,
      customerId: "CUST004",
      date: "2025-04-18",
      time: "11:45",
      ticketId: "TK-2025-004001",
      type: "Billing Query",
      priority: "High",
      status: "In Progress",
      agent: "Agent: Family Support",
      description: "Disputed charge on family account",
      resolution: "Under investigation, pending resolution"
    }
  ];

  private autoRenewalSettings: { [customerId: string]: AutoRenewalSettings } = {
    "1": {
      enabled: true,
      nextRenewalDate: "2025-05-23",
      renewalCount: 3,
      lastRenewalDate: "2024-04-25"
    },
    "CUST001": {
      enabled: true,
      nextRenewalDate: "2025-05-23",
      renewalCount: 5,
      lastRenewalDate: "2025-04-24"
    },
    "CUST002": {
      enabled: false,
      nextRenewalDate: "2025-07-01",
      renewalCount: 1,
      lastRenewalDate: "2025-04-01"
    },
    "CUST003": {
      enabled: true,
      nextRenewalDate: "2025-07-01",
      renewalCount: 2,
      lastRenewalDate: "2025-04-01"
    },
    "CUST004": {
      enabled: true,
      nextRenewalDate: "2025-06-15",
      renewalCount: 1,
      lastRenewalDate: "2025-04-15"
    }
  };

  private invoices: Invoice[] = [
    {
      id: 1,
      customerId: "1",
      invoiceNumber: "INV-2024-001234",
      date: "2024-04-25",
      description: "Base Plan Subscription - April 2024",
      amount: 25000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "M-Pesa"
    },
    {
      id: 2,
      customerId: "1",
      invoiceNumber: "INV-2024-001233",
      date: "2024-04-20",
      description: "Sports Ultimate Pack Add-on",
      amount: 8000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Tigo Pesa"
    },
    {
      id: 3,
      customerId: "1",
      invoiceNumber: "INV-2024-001232",
      date: "2024-04-15",
      description: "Plan Upgrade - Standard Plan",
      amount: 10000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Wallet"
    },
    {
      id: 4,
      customerId: "CUST001",
      invoiceNumber: "INV-2025-001234",
      date: "2025-04-24",
      description: "Azam Play 1 Month - April 2025",
      amount: 22420,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Wallet"
    },
    {
      id: 5,
      customerId: "CUST001",
      invoiceNumber: "INV-2025-001233",
      date: "2025-04-24",
      description: "Sports Ultimate Pack Add-on",
      amount: 8000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Wallet"
    },
    {
      id: 6,
      customerId: "CUST001",
      invoiceNumber: "INV-2025-001232",
      date: "2025-04-20",
      description: "Wallet Top-up via M-Pesa",
      amount: 30000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Mobile Money"
    },
    {
      id: 7,
      customerId: "CUST001",
      invoiceNumber: "INV-2025-001231",
      date: "2025-04-18",
      description: "Premium Movies Pack Add-on",
      amount: 5000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Mobile Money"
    },
    {
      id: 8,
      customerId: "CUST002",
      invoiceNumber: "INV-2025-002001",
      date: "2025-04-01",
      description: "Azam Business 3 Months - April 2025",
      amount: 120000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 9,
      customerId: "CUST003",
      invoiceNumber: "INV-2025-003001",
      date: "2025-04-01",
      description: "Azam Business 3 Months - April 2025",
      amount: 105000,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Mobile Money"
    },
    {
      id: 10,
      customerId: "CUST004",
      invoiceNumber: "INV-2025-004001",
      date: "2025-04-15",
      description: "Azam Family 2 Months - April 2025",
      amount: 35400,
      currency: "TZS",
      status: "Paid",
      paymentMethod: "Wallet"
    }
  ];

  // Report operations implementation
  async getDailyReports(dateFrom?: string, dateTo?: string, region?: string): Promise<DailyReport[]> {
    let reports = this.dailyReports;

    if (dateFrom) {
      reports = reports.filter(r => r.reportDate >= new Date(dateFrom));
    }
    if (dateTo) {
      reports = reports.filter(r => r.reportDate <= new Date(dateTo));
    }
    if (region) {
      reports = reports.filter(r => r.region === region);
    }

    return reports.sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  async getDailyReportById(id: number): Promise<DailyReport | null> {
    return this.dailyReports.find(r => r.id === id) || null;
  }

  async generateDailyReport(reportDate: Date, reportType: string, region?: string): Promise<DailyReport> {
    const id = this.dailyReports.length + 1;

    // Generate mock data based on actual data
    const paymentsToday = this.payments.filter(p =>
      p.createdAt && new Date(p.createdAt).toDateString() === reportDate.toDateString()
    );

    const subscriptionsToday = this.subscriptions.filter(s =>
      s.createdAt && new Date(s.createdAt).toDateString() === reportDate.toDateString()
    );

    const report: DailyReport = {
      id,
      reportDate,
      reportType: reportType as any,
      totalTransactions: paymentsToday.length + subscriptionsToday.length,
      totalPayments: paymentsToday.reduce((sum, p) => sum + p.amount, 0),
      totalSubscriptions: subscriptionsToday.length,
      totalHardwareSales: paymentsToday.filter(p => p.type === 'hardware_sale').length,
      totalVAT: paymentsToday.reduce((sum, p) => sum + (p.amount * 0.18), 0),
      totalRevenue: paymentsToday.reduce((sum, p) => sum + p.amount, 0),
      activeAgents: this.agents.filter(a => a.status === 'approved').length,
      agentTransactions: Math.floor(Math.random() * 50) + 10,
      otcTransactions: Math.floor(Math.random() * 30) + 5,
      customerTransactions: Math.floor(Math.random() * 100) + 20,
      reconciliationStatus: 'COMPLETED',
      generatedBy: 'system',
      generatedAt: new Date(),
      region: region || 'All Regions',
      currency: 'TSH'
    };

    this.dailyReports.push(report);
    return report;
  }

  async getTRAReports(dateFrom?: string, dateTo?: string): Promise<TRAReport[]> {
    let reports = this.traReports;

    if (dateFrom) {
      reports = reports.filter(r => r.reportDate >= new Date(dateFrom));
    }
    if (dateTo) {
      reports = reports.filter(r => r.reportDate <= new Date(dateTo));
    }

    return reports.sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  async getTRAReportById(id: number): Promise<TRAReport | null> {
    return this.traReports.find(r => r.id === id) || null;
  }

  async generateTRAReport(reportDate: Date, reportType: string): Promise<TRAReport> {
    const id = this.traReports.length + 1;

    const totalRevenue = this.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalVAT = totalRevenue * 0.18;

    const report: TRAReport = {
      id,
      reportDate,
      reportType: reportType as any,
      vatableAmount: totalRevenue,
      vatExemptAmount: 0,
      totalVAT,
      vatRate: 18,
      totalInvoices: this.payments.length,
      subscriptionInvoices: this.payments.filter(p => p.type === 'subscription').length,
      hardwareInvoices: this.payments.filter(p => p.type === 'hardware_sale').length,
      invoiceAmountTotal: totalRevenue,
      traApiStatus: 'SUCCESS',
      traApiRequestId: `TRA_${Date.now()}`,
      traApiResponseCode: '200',
      traApiMessage: 'Successfully submitted to TRA',
      taxableTransactions: this.payments.filter(p => p.amount > 0).length,
      exemptTransactions: 0,
      generatedBy: 'system',
      generatedAt: new Date(),
      submittedToTRA: true,
      submissionDate: new Date(),
      currency: 'TSH'
    };

    this.traReports.push(report);
    return report;
  }

  async getTCRAReports(dateFrom?: string, dateTo?: string, region?: string): Promise<TCRAReport[]> {
    let reports = this.tcraReports;

    if (dateFrom) {
      reports = reports.filter(r => r.reportDate >= new Date(dateFrom));
    }
    if (dateTo) {
      reports = reports.filter(r => r.reportDate <= new Date(dateTo));
    }
    if (region) {
      reports = reports.filter(r => r.region === region);
    }

    return reports.sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  async getTCRAReportById(id: number): Promise<TCRAReport | null> {
    return this.tcraReports.find(r => r.id === id) || null;
  }

  async generateTCRAReport(reportDate: Date, reportType: string, region?: string): Promise<TCRAReport> {
    const id = this.tcraReports.length + 1;

    const activeSubscriptions = this.subscriptions.filter(s => s.status === 'active');

    const report: TCRAReport = {
      id,
      reportDate,
      reportType: reportType as any,
      newActivations: Math.floor(Math.random() * 20) + 5,
      renewals: Math.floor(Math.random() * 50) + 10,
      suspensions: Math.floor(Math.random() * 5) + 1,
      disconnections: Math.floor(Math.random() * 3) + 1,
      planChanges: Math.floor(Math.random() * 15) + 2,
      nagraProvisioningSuccess: Math.floor(Math.random() * 60) + 40,
      nagraProvisioningFailed: Math.floor(Math.random() * 5) + 1,
      nagraApiCalls: Math.floor(Math.random() * 100) + 50,
      tcraApiStatus: 'SUCCESS',
      tcraApiRequestId: `TCRA_${Date.now()}`,
      tcraApiResponseCode: '200',
      tcraApiMessage: 'Successfully submitted to TCRA',
      totalActiveSubscribers: activeSubscriptions.length,
      newSubscribers: Math.floor(Math.random() * 25) + 10,
      churnedSubscribers: Math.floor(Math.random() * 8) + 2,
      generatedBy: 'system',
      generatedAt: new Date(),
      submittedToTCRA: true,
      submissionDate: new Date(),
      region: region || 'All Regions'
    };

    this.tcraReports.push(report);
    return report;
  }

  async getReportAuditLogs(reportType?: string, reportId?: number): Promise<ReportAuditLog[]> {
    let logs = this.reportAuditLogs;

    if (reportType) {
      logs = logs.filter(l => l.reportType === reportType);
    }
    if (reportId) {
      logs = logs.filter(l => l.reportId === reportId);
    }

    return logs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  async createReportAuditLog(auditLog: Omit<ReportAuditLog, "id" | "performedAt">): Promise<ReportAuditLog> {
    const id = this.reportAuditLogs.length + 1;
    const log: ReportAuditLog = {
      ...auditLog,
      id,
      performedAt: new Date()
    };

    this.reportAuditLogs.push(log);
    return log;
  }

  // Notification operations implementation
  async getNotifications(userId?: number, status?: string): Promise<Notification[]> {
    let notifications = [...this.notifications];

    if (userId) {
      notifications = notifications.filter(n => n.userId === userId);
    }

    if (status) {
      notifications = notifications.filter(n => n.status === status);
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNotificationById(id: number): Promise<Notification | null> {
    return this.notifications.find(n => n.id === id) || null;
  }

  async createNotification(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    const id = this.notifications.length > 0 ? Math.max(...this.notifications.map(n => n.id)) + 1 : 1;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date()
    };

    this.notifications.push(newNotification);
    return newNotification;
  }

  async updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | null> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;

    this.notifications[index] = {
      ...this.notifications[index],
      ...notification
    };

    return this.notifications[index];
  }

  async markNotificationAsRead(id: number): Promise<Notification | null> {
    const notification = await this.getNotificationById(id);
    if (!notification) return null;

    return this.updateNotification(id, {
      status: 'read',
      readAt: new Date()
    });
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = this.notifications.filter(n => n.userId === userId && n.status === 'unread');

    for (const notification of userNotifications) {
      await this.markNotificationAsRead(notification.id);
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;

    this.notifications.splice(index, 1);
    return true;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return this.notifications.filter(n => n.userId === userId && n.status === 'unread').length;
  }

  // Subscriber View operations implementation
  async getSubscriberDetails(customerId: string): Promise<SubscriberDetails | null> {
    return this.subscriberDetails.find(s => s.customerId === customerId) || null;
  }

  async getSubscriptionHistory(customerId: string): Promise<SubscriptionHistory[]> {
    return this.subscriptionHistory.filter(s => s.customerId === customerId);
  }

  async getPaymentHistory(customerId: string): Promise<PaymentHistory[]> {
    return this.paymentHistory.filter(p => p.customerId === customerId);
  }

  async getServiceActions(customerId: string): Promise<ServiceAction[]> {
    return this.serviceActions.filter(s => s.customerId === customerId);
  }

  async getServiceTickets(customerId?: string): Promise<ServiceTicket[]> {
    if (customerId) {
      return this.serviceTickets.filter(t => t.customerId === customerId);
    }
    return this.serviceTickets;
  }

  async getServiceTicketById(id: number): Promise<ServiceTicket | null> {
    return this.serviceTickets.find(t => t.id === id) || null;
  }

  async createServiceTicket(ticket: Omit<ServiceTicket, "id" | "createdAt" | "updatedAt">): Promise<ServiceTicket> {
    const id = this.serviceTickets.length > 0 ? Math.max(...this.serviceTickets.map(t => t.id)) + 1 : 1;
    const now = new Date();
    const newTicket: ServiceTicket = {
      ...ticket,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.serviceTickets.push(newTicket);
    return newTicket;
  }

  async updateServiceTicket(id: number, ticket: Partial<ServiceTicket>): Promise<ServiceTicket | null> {
    const index = this.serviceTickets.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.serviceTickets[index] = {
      ...this.serviceTickets[index],
      ...ticket,
      updatedAt: new Date()
    };

    return this.serviceTickets[index];
  }

  async getAutoRenewalSettings(customerId: string): Promise<AutoRenewalSettings | null> {
    return this.autoRenewalSettings[customerId] || null;
  }

  async updateAutoRenewalSettings(customerId: string, settings: AutoRenewalSettings): Promise<AutoRenewalSettings> {
    this.autoRenewalSettings[customerId] = settings;
    return settings;
  }

  async getInvoices(customerId: string): Promise<Invoice[]> {
    return this.invoices.filter(i => i.customerId === customerId);
  }

  async getInvoiceById(id: number): Promise<Invoice | null> {
    return this.invoices.find(i => i.id === id) || null;
  }

  async createInvoice(invoice: Omit<Invoice, "id">): Promise<Invoice> {
    const id = this.invoices.length > 0 ? Math.max(...this.invoices.map(i => i.id)) + 1 : 1;
    const newInvoice: Invoice = {
      ...invoice,
      id
    };

    this.invoices.push(newInvoice);
    return newInvoice;
  }
}

// Export storage instance
export const storage = new MemStorage();
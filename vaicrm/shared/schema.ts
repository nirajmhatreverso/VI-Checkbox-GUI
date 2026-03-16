import { z } from "zod";
import { isInvalidPhonePattern, isLowEntropyString } from "./utils";


const strictNameValidation = (fieldName: string) =>
  z.string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} cannot exceed 50 characters`)
    .regex(/^[A-Za-z]+(?:[-'\s][A-Za-z]+)*$/, `${fieldName} contains invalid characters`)
    .refine((val) => !/^\s|\s$/.test(val), { message: `${fieldName} cannot have leading or trailing spaces` });

// === CORE TYPE DEFINITIONS ===
// Organized type definitions with better structure and validation

// === ENUMS FOR TYPE SAFETY ===
export const UserRole = {
  ADMIN: 'admin',
  AGENT: 'agent',
  MANAGER: 'manager',
  KYC: 'kyc',
  USER: 'user'
} as const;

export const AgentType = {
  INDIVIDUAL: 'individual',
  CORPORATE: 'corporate'
} as const;

export const CustomerType = {
  PREPAID: 'prepaid',
  POSTPAID: 'postpaid'
} as const;

export const InventoryStatus = {
  AVAILABLE: 'available',
  ALLOCATED: 'allocated',
  SOLD: 'sold',
  FAULTY: 'faulty',
  RETURNED: 'returned'
} as const;

export const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export const PaymentMode = {
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  BANK_DEPOSIT: 'BANK_DEPOSIT',
  POS: 'POS',
  MOBILE_MONEY: 'MOBILE_MONEY',
  AZAM_PAY: 'AZAM_PAY',
  DPO: 'DPO'
} as const;

export const PaymentType = {
  HARDWARE: 'Hardware',
  SUBSCRIPTION: 'Subscription'
} as const;

export const SubscriptionStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
} as const;

// === INCIDENT MANAGEMENT ENUMS ===
// === SERVICE TICKETING ENUMS ===
export const TicketType = {
  HARDWARE: 'Hardware',
  SUBSCRIPTION: 'Subscription',
  BILLING: 'Billing',
  TECHNICAL: 'Technical'
} as const;

export const TicketPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
} as const;

export const TicketStatus = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
} as const;

export const TicketChannel = {
  PORTAL: 'Portal',
  OTC: 'OTC',
  CALL_CENTER: 'Call Center'
} as const;

export const TicketAssignmentGroup = {
  TECHNICAL_SUPPORT: 'Technical Support',
  HARDWARE_TEAM: 'Hardware Team',
  BILLING_TEAM: 'Billing Team',
  SUBSCRIPTION_TEAM: 'Subscription Team',
  FIELD_OPERATIONS: 'Field Operations'
} as const;

// === INCIDENT MANAGEMENT ENUMS ===
export const IncidentSeverity = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor'
} as const;

export const IncidentStatus = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
} as const;

export const AffectedSystem = {
  PORTAL: 'Portal',
  CM: 'CM',
  SOM: 'SOM',
  CC: 'CC',
  CI: 'CI',
  NAGRA: 'NAGRA'
} as const;

// === NOTIFICATION ENUMS ===
export const NotificationType = {
  SYSTEM: 'system',
  AGENT: 'agent',
  KYC: 'kyc',
  INVENTORY: 'inventory',
  PAYMENT: 'payment',
  SERVICE: 'service',
  SECURITY: 'security'
} as const;

export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived'
} as const;

// === BASE TYPES ===
export interface User {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  resetOtp?: string;
  otpExpiry?: Date;
  createdAt?: Date;
}

export interface Agent {
  id: number;
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null | undefined;
  mobile?: string;
  fax?: string;
  tinName?: string;
  type: string;
  country: string;
  region: string;
  city: string;
  district: string;
  ward: string;
  address1: string;
  address2?: string;
  postalCode?: string;
  tinNumber: string;
  vrnNumber?: string;
  currency: string;
  parentId?: string;
  creditLimit?: number;
  role: string;
  status: string;
  statusMessage?: string;
  kycDocuments?: any;
  kycDocId?: string;
  kycDocNo?: string;
  commission?: string;
  onboardingRefNo?: string;
  sapBpId?: string;
  sapCaId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userName?: string;
  onbId?: string;
  createDt?: string
}

export interface Customer {
  cityCodeInst: any;
  cityCode: any;
  id: number;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: Date;
  race?: string;
  phone: string;
  altPhone?: string;
  mobile: string;
  email?: string;
  altEmail?: string;
  fax?: string;
  orgName?: string;
  customerType: string;
  serviceType: string;
  accountClass: string;
  noOfRooms?: number | string;
  connectionType: string;
  smsFlag?: boolean;
  addressType: string;
  country: string;
  region: string;
  city: string;
  district: string;
  ward: string;
  address1: string;
  address2?: string;
  postalCode?: string;
  parentCustomerId?: number;
  tinName?: string;
  ctinNumber?: string;
  cvrnNumber?: string;
  currency: string;
  azamPayId?: string;
  azamMaxTvId?: string;
  sapBpId?: string;
  sapCaId?: string;
  kycDocuments?: any;
  onboardingRefNo?: string;
  createdAt?: Date;
  kycDocNoPOI?: string;
  kycDocNoPOA?: string;
  custId?: number;
  customerStage?: string;
  createDt?: string;
  onbId?: string;
  userName?: string;
  sameAsInstallation?:boolean;
}

export interface InventoryItem {
  id: number;
  materialCode: string;
  materialName: string;
  materialType: string;
  serialNumber: string;
  casId?: string;
  state: string;
  status: string;
  owner: string;
  createId: string;
  createDt?: Date;
  createTs?: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
}

export interface InventoryRequest {
  id: number;
  sapBpId?: string;
  sapCaId?: string;
  module: string;
  salesOrg?: string;
  division?: string;
  requestType: string;
  requestId: string;
  itemType: string;
  itemQty: string;
  itemSerialNo?: string;
  itemAmount?: number;
  totalAmount?: number;
  // VAT removed as per user request
  transferFrom?: string;
  transferTo?: string;
  status: string;
  reason?: string;
  rejectionRemarks?: string;
  warehouseId?: string;
  createId: string;
  createDt?: Date;
  createTs?: Date;
  updateDt?: Date;
  updateTs?: Date;
  updateId?: string;
  cmStatus?: string;
  cmStatusMsg?: string;
  sapSoId?: string;
}

export interface Payment {
  id: number;
  customerId: number;
  amount: number;
  currency: string;
  paymentMode: string;
  referenceNumber?: string;
  type: string;
  status: string;
  receiptNumber?: string;
  createdAt?: Date;
}

export interface CustomerTransfer {
  id: number;
  sourceBpId: string;
  targetBpId: string;
  sourceCustomerId: number;
  targetCustomerId: number;
  transferAmount: number;
  currency: string;
  transferReason: string;
  paymentType: string; // 'SUBSCRIPTION'
  paymentId?: number;
  invoiceNumber?: string;
  invoiceStatus?: 'CLEARED' | 'PENDING' | 'MANUAL_INTERVENTION_REQUIRED';
  manualInterventionRequired: boolean;
  status: 'INPROGRESS' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  cmStatus?: string;
  cmStatusMessage?: string;
  ficaStatus?: string;
  ficaStatusMessage?: string;
  somStatus?: string;
  somStatusMessage?: string;
  requestId?: string;
  createId: string;
  createDt: Date;
  createTs: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
}

export interface CustomerTransferRequest {
  sourceBpId: string;
  targetBpId: string;
  sourceCustomerId: number;
  targetCustomerId: number;
  transferAmount: number;
  currency: string;
  transferReason: string;
  paymentType: string;
  paymentId?: number;
  invoiceNumber?: string;
}

export interface Adjustment {
  id: number;
  bpId: string;
  scId?: string;
  customerName: string;
  type: 'CREDIT' | 'DEBIT';
  invoiceNumber?: string;
  reason: string;
  comments?: string;
  amount: number;
  currency: string;
  walletType: 'HW' | 'SUBSCRIPTION' | 'PREPAID';
  // VAT type removed as per user request
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  cmRequestId?: string;
  cmStatus?: string;
  cmStatusMessage?: string;
  ficaStatus?: string;
  ficaStatusMessage?: string;
  processedAt?: Date;
}

export interface AdjustmentRequest {
  bpId: string;
  scId?: string;
  type: 'CREDIT' | 'DEBIT';
  invoiceNumber?: string;
  reason: string;
  comments?: string;
  amount: number;
  currency: string;
  walletType: 'HW' | 'SUBSCRIPTION' | 'PREPAID';
  // VAT type removed as per user request
}

export interface CustomerDetails {
  bpId: string;
  scId?: string;
  name: string;
  customerType: string;
  accountType: string;
  balance: number;
  currency: string;
  subscription?: string;
  status: string;
  phone?: string;
  email?: string;
}

export interface Subscription {
  id: number;
  customerId: number;
  smartCardNumber: string;
  plan: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  activationType: string;
  status: string;
  autoRenewal?: boolean;
  createdAt?: Date;
}

export interface AddOnPack {
  id: string;
  name: string;
  type: string;
  description: string;
  amount: number;
  // VAT amount removed as per user request
  totalAmount: number;
  duration: number; // in days
  channels: number;
  features: string[];
  category: string;
  isActive: boolean;
}

export interface CustomerAddOn {
  id: number;
  customerId: number;
  sapBpId: string;
  sapCaId: string;
  sapContractId: string;
  smartCardNumber: string;
  addOnPackId: string;
  addOnPackName: string;
  planAmount: number;
  // VAT amount removed as per user request
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  autoRenewalFlag: boolean;
  status: string; // Active, Expired, Disconnected
  requestId?: string;
  cmStatus?: string;
  cmStatusMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AddOnPurchaseRequest {
  customerId: number;
  smartCardNumber: string;
  addOnPackId: string;
  paymentMode: 'wallet' | 'online' | 'agent';
  prorationAmount: number;
  autoRenewal: boolean;
}

export interface CustomerTermination {
  id: number;
  customerId: number;
  sapBpId: string;
  sapCaId: string;
  sapContractId: string;
  smartCardNumber: string;
  actionType: string;
  actionSubtype: string;
  requestId: string;
  planType: string;
  planId: string;
  planName: string;
  bundleName?: string;
  division?: string;
  planRate: number;
  planAmount: number;
  // VAT amount removed as per user request
  startDate: Date;
  endDate: Date;
  status: string; // INPROGRESS/APPROVED/COMPLETED
  createId: string;
  createDt: Date;
  createTs: Date;
  updateDt?: Date;
  updateTs?: Date;
  updateId?: string;
  cmStatus?: string;
  cmStatusMessage?: string;
}

export interface TerminationRequest {
  customerId: number;
  smartCardNumber: string;
  terminationReason: string;
  notes?: string;
  actionType: 'TERMINATION';
  actionSubtype: 'PERMANENT_DISCONNECTION';
}

export interface CustomerReplacement {
  id: number;
  customerId: number;
  sapBpId: string;
  sapCaId: string;
  sapContractId: string;
  smartCardNumber: string;
  oldStbSerialNumber: string;
  newStbSerialNumber: string;
  oldSmartCardNumber?: string;
  newSmartCardNumber?: string;
  replacementType: 'OTC_IN_WARRANTY' | 'OTC_OUT_WARRANTY' | 'AGENT_IN_WARRANTY' | 'AGENT_OUT_WARRANTY';
  replacementReason: string;
  issuingCenter?: string;
  returnCenter?: string;
  warrantyStatus: 'IN_WARRANTY' | 'OUT_WARRANTY';
  chargeAmount: number;
  isFreeReplacement: boolean;
  subscriptionAdvanceMonths?: number;
  requestId: string;
  status: string; // PENDING/APPROVED/COMPLETED
  createId: string;
  createDt: Date;
  cmStatus?: string;
  cmStatusMessage?: string;
}

export interface ReplacementRequest {
  customerId: number;
  smartCardNumber: string;
  oldStbSerialNumber: string;
  newStbSerialNumber: string;
  replacementType: string;
  replacementReason: string;
  issuingCenter?: string;
  returnCenter?: string;
  subscriptionAdvanceMonths?: number;
  notes?: string;
}

export interface SubscriberDetails {
  customerId: string;
  sapBpId: string;
  sapCaId: string;
  sapContractId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smartCardNumber: string;
  stbSerialNumber: string;
  customerType: 'PREPAID' | 'POSTPAID';
  accountClass: 'RESIDENTIAL' | 'COMMERCIAL' | 'CORPORATE';
  connectionDate: string;
  lastPaymentDate?: string;
  walletBalance: number;
  currentSubscription: {
    planId: string;
    planName: string;
    planType: 'PREPAID' | 'POSTPAID';
    amount: number;
    // VAT amount removed as per user request
    totalAmount: number;
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DISCONNECTED' | 'TERMINATED';
    autoRenewal: boolean;
  };
  addOns: Array<{
    id: string;
    name: string;
    amount: number;
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'EXPIRED';
  }>;
  hardware: {
    stbModel: string;
    stbSerialNumber: string;
    smartCardNumber: string;
    purchaseDate: string;
    warrantyEndDate: string;
    condition: 'WORKING' | 'FAULTY' | 'REPLACED';
  };
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
}

export interface SubscriptionHistory {
  id: number;
  customerId: string;
  planId: string;
  planName: string;
  amount: number;
  transactionType: 'PURCHASE' | 'RENEWAL' | 'PLAN_CHANGE' | 'OFFER_CHANGE' | 'SUSPENSION' | 'RECONNECTION';
  paymentMethod: 'WALLET' | 'MOBILE_MONEY' | 'CASH' | 'CARD';
  transactionDate: string;
  startDate: string;
  endDate: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  notes?: string;
}

// === SERVICE TICKETING INTERFACES ===
export interface ServiceTicket {
  id: number;
  ticketId: string;
  ticketType: 'Hardware' | 'Subscription' | 'Billing' | 'Technical';
  smartCardNumber?: string;
  customerId?: string;
  issueDescription: string;
  priority: 'Low' | 'Medium' | 'High';
  channel: 'Portal' | 'OTC' | 'Call Center';
  attachments?: string[];
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed';

  // Auto-filled Fields
  userInfo: string; // Auto-filled from current user
  userLocation: string; // Auto-filled from user location
  createdOn: Date; // Auto-filled timestamp

  // Assignment
  assignmentGroup?: string; // Dropdown for assignment group
  assignee?: string; // Individual assignee within group

  // Work Notes / Comments
  workNotes?: string; // Internal updates or agent remarks
  comments?: WorkNote[]; // Array of work notes with timestamps

  // Incident Linking
  linkedIncidentIds?: string[]; // IDs of related system incidents

  // Notification Settings
  notificationSettings?: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    notifyOnUpdate: boolean;
    stakeholders?: string[]; // Email addresses for notifications
  };

  // Legacy fields (for backward compatibility)
  assignedGroup?: string;
  slaTimer?: Date;
  location?: string;
  timestamp: Date;
  resolutionNotes?: string;
  routingInfo?: {
    vendor?: string;
    approval?: boolean;
    rfi?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface WorkNote {
  id: string;
  ticketId: number;
  userId: string;
  userName: string;
  note: string;
  isInternal: boolean; // true for work notes, false for customer-facing comments
  createdAt: Date;
}

export interface ServiceTicketComment {
  id: number;
  ticketId: number;
  userId: number;
  userName: string;
  comment: string;
  isInternal: boolean;
  createdAt: Date;
}

// === INCIDENT MANAGEMENT INTERFACES ===
export interface SystemIncident {
  id: number;
  incidentId: string;
  title: string;
  affectedSystem: 'Portal' | 'CM' | 'SOM' | 'CC' | 'CI' | 'NAGRA';
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  startTime: Date;
  endTime?: Date;
  impactedCustomers?: number;
  rootCause?: string;
  resolutionSteps?: string;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
  assignedOwner?: string;
  ownerTeam?: 'Technical' | 'Operations';
  // New fields for missing requirements
  attachments?: string[]; // For logs, screenshots, or error reports
  notificationSettings?: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    stakeholders: string[]; // Email addresses of stakeholders
  };
  linkedServiceTickets?: number[]; // Array of related service ticket IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemIncidentNote {
  id: number;
  incidentId: number;
  userId: number;
  userName: string;
  note: string;
  isRCA: boolean; // Root Cause Analysis
  createdAt: Date;
}

export interface SystemIncidentAudit {
  id: number;
  incidentId: number;
  userId: number;
  userName: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'commented' | 'attached_file';
  oldValue?: string;
  newValue?: string;
  details?: string;
  createdAt: Date;
}

export interface PaymentHistory {
  id: number;
  customerId: string;
  amount: number;
  paymentType: 'HARDWARE' | 'SUBSCRIPTION' | 'ADD_ON';
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'WALLET';
  transactionDate: string;
  receiptNumber: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  description: string;
}

export interface ServiceAction {
  id: number;
  customerId: string;
  date: string;
  time: string;
  serviceType: string;
  smartCard: string;
  action: string;
  status: string;
  agent: string;
  remarks?: string;
}

export interface AutoRenewalSettings {
  enabled: boolean;
  nextRenewalDate: string;
  renewalCount: number;
  lastRenewalDate?: string;
}

export interface Invoice {
  id: number;
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  description: string;
  paymentMethod?: string;
}

// === NOTIFICATION INTERFACES ===
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'system' | 'agent' | 'kyc' | 'inventory' | 'payment' | 'service' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'archived';
  userId: number;
  actionUrl?: string; // URL to navigate when notification is clicked
  metadata?: {
    agentId?: number;
    ticketId?: number;
    incidentId?: number;
    amount?: number;
    [key: string]: any;
  };
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
}

// === REPORTING INTERFACES ===

export interface DailyReport {
  id: number;
  reportDate: Date;
  reportType: 'daily_transactions' | 'agent_summary' | 'reconciliation';

  // Transaction Summary
  totalTransactions: number;
  totalPayments: number;
  totalSubscriptions: number;
  totalHardwareSales: number;
  // Total VAT removed as per user request
  totalRevenue: number;

  // Agent Activity
  activeAgents: number;
  agentTransactions: number;
  otcTransactions: number;
  customerTransactions: number;

  // Reconciliation Data
  reconciliationStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  reconciliationNotes?: string;

  // Metadata
  generatedBy: string;
  generatedAt: Date;
  region?: string;
  currency: string;
}

export interface TRAReport {
  id: number;
  reportDate: Date;
  reportType: /*'vat_breakdown'*/ | 'invoice_posting' | 'compliance';

  // VAT Information
  // Vatable amount removed as per user request
  // VAT exempt amount removed as per user request
  // Total VAT removed as per user request
  // VAT rate removed as per user request // Usually 18%

  // Invoice Details
  totalInvoices: number;
  subscriptionInvoices: number;
  hardwareInvoices: number;
  invoiceAmountTotal: number;

  // TRA API Integration
  traApiStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  traApiRequestId?: string;
  traApiResponseCode?: string;
  traApiMessage?: string;

  // Compliance Data
  taxableTransactions: number;
  exemptTransactions: number;

  // Metadata
  generatedBy: string;
  generatedAt: Date;
  submittedToTRA: boolean;
  submissionDate?: Date;
  currency: string;
}

export interface TCRAReport {
  id: number;
  reportDate: Date;
  reportType: 'subscription_activations' | 'plan_changes' | 'provisioning_logs';

  // Subscription Activities
  newActivations: number;
  renewals: number;
  suspensions: number;
  disconnections: number;
  planChanges: number;

  // NAGRA Provisioning
  nagraProvisioningSuccess: number;
  nagraProvisioningFailed: number;
  nagraApiCalls: number;

  // TCRA API Integration
  tcraApiStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  tcraApiRequestId?: string;
  tcraApiResponseCode?: string;
  tcraApiMessage?: string;

  // Subscriber Data
  totalActiveSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;

  // Metadata
  generatedBy: string;
  generatedAt: Date;
  submittedToTCRA: boolean;
  submissionDate?: Date;
  region?: string;
}

export interface ReportAuditLog {
  id: number;
  reportType: 'DAILY' | 'TRA' | 'TCRA';
  reportId: number;
  action: 'GENERATED' | 'VIEWED' | 'EXPORTED' | 'SUBMITTED';
  performedBy: string;
  performedAt: Date;
  userRole: string;
  ipAddress?: string;
  exportFormat?: 'PDF' | 'EXCEL';
  downloadPath?: string;
}

export interface AgentReplacement {
  id: number;
  sapBpId: string;
  sapCaId: string;
  requestType: string;
  requestId: string;
  itemType: string;
  itemQty: string;
  itemSerialNo: string;
  itemAmount: number;
  totalAmount: number;
  // VAT amount removed as per user request
  transferFrom: string;
  transferTo: string;
  status: string;
  createId: string;
  createDt: Date;
  createTs: Date;
  updateDt?: Date;
  updateTs?: Date;
  updateId?: string;
  cmStatus: string;
  cmStatusMsg?: string;
  sapSoId?: string;
  replacementCenter?: string;
  faultyReason?: string;
  replacementNotes?: string;
  agentName?: string;
  centerExecutive?: string;
  approvedBy?: string;
  approvedDate?: Date;
  completedDate?: Date;
}

export interface AgentFaultyRepair {
  id: number;
  itemId: number;
  materialCode: string;
  materialName: string;
  materialType: string;
  serialNumber: string;
  casId?: string;
  agentId: string;
  agentName: string;
  agentBpId: string;
  currentStatus: string;
  newStatus: string;
  faultyReason: string;
  repairNotes?: string;
  transferDate?: Date;
  repairCenter?: string;
  processedBy?: string;
  processedDate?: Date;
  createId: string;
  createDt: Date;
  createTs: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
}

export interface PaymentDetails {
  payId: number;
  sapBpId: string;
  sapCaId: string;
  module: string; // Agent / Customer / OTC
  payType: string; // Hardware / Subscription
  payAmount: number;
  // VAT amount removed as per user request
  payMode: string; // CASH / CHEQUE / AZAM PAY etc
  chequeNo?: string;
  bankName?: string;
  currency: string;
  onlPgId?: string; // Online Merchant Pay ID
  onlTransId?: string; // Online Portal Trans ID
  transId: string; // Portal Trans ID
  status: string; // Status of Payment
  description?: string;
  createId: string;
  createDt: Date;
  createTs: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
  approvedBy?: string;
  name: string; // Agent / Customer Name
  salesOrg: string; // SAP Sales Org
  division: string; // SAP Division
  cmStatus: string; // CM process status
  cmStatusMsg?: string; // CM status message
  collectedBy: string; // Payment Collected By
  collectionCenter: string; // Payment Collected Center
}

// Agent Payment Details for Subscription - Based on PAYMENT_DETAILS table
export interface AgentPaymentDetails {
  payId: string; // Primary Key - Payment ID
  sapBpId: string; // SAP Business Partner ID
  sapCaId: string; // SAP Customer Account ID
  customerId: string; // Customer ID
  customerName: string; // Customer Name
  payType: string; // Hardware/Subscription
  payAmount: number; // Payment Amount
  // VAT amount removed as per user request // VAT Amount (18%)
  totalAmount: number; // Total Amount (payAmount + vatAmount)
  payMode: string; // Payment Mode (CASH, CHEQUE, etc.)
  status: string; // Payment Status
  transId: string; // Transaction ID
  collectedBy: string; // Agent ID who collected payment
  collectionCenter: string; // Collection Center
  description?: string; // Payment Description
  receiptNo?: string; // Receipt Number
  chequeNo?: string; // Cheque Number (if applicable)
  bankRef?: string; // Bank Reference (if applicable)
  mobileRef?: string; // Mobile Money Reference (if applicable)
  createId: string;
  createDt: Date;
  createTs: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
  cmStatus?: string; // CM Integration Status
  cmStatusMsg?: string; // CM Status Message
  ficaStatus?: string; // FICA Integration Status
  ficaStatusMsg?: string; // FICA Status Message
}

// Receipt Cancellation Interface
export interface ReceiptCancellation {
  payId: string; // Payment ID being cancelled
  cancellationReason: string; // Reason for cancellation
  cancelledBy: string; // User ID who initiated cancellation
  cancellationDate: Date; // When cancellation was initiated
  cmRequestId?: string; // CM integration request ID
  cmStatus?: string; // CM cancellation status
  cmStatusMsg?: string; // CM status message
  ficaStatus?: string; // FICA reversal status
  ficaStatusMsg?: string; // FICA status message
  walletAdjustmentAmount?: number; // Amount credited to wallet
  originalStatus: string; // Original payment status before cancellation
}

export interface ReceiptCancellationRequest {
  payId: string;
  cancellationReason: string;
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  role: z.string().default("user"),
  resetOtp: z.string().optional(),
  otpExpiry: z.date().optional(),
});

// === Common Validators ===

// ✅ International phone number format (E.164)
// Allows +CountryCodeXXXXXXXXX, 7–15 digits.
export const phoneRegex = /^\+[1-9]\d{6,14}$/;

// ✅ Generic TIN (Tax ID) fallback rule: 5–15 alphanumeric or hyphen
export const genericTinRegex = /^[A-Za-z0-9-]{5,15}$/;

// ✅ Generic VRN (VAT Registration number) fallback
export const genericVrnRegex = /^[A-Za-z0-9-]{5,15}$/;

// ✅ International Address Regex
export const intlAddressRegex = /^(?=.*[A-Za-z])[A-Za-z0-9\u00C0-\u024F\s\.,\-\/#()]+$/;

// ✅ Commission validation
export const commissionNumber = z.preprocess(
  (val) => {
    if (typeof val === "string") return parseFloat(val);
    if (typeof val === "number") return val;
    return undefined;
  },
  z
    .number()
    .min(0, "Commission cannot be less than 0%")
    .max(100, "Commission cannot exceed 100%")
);
const tenDigitPhoneRegex = /^[0-9]{10}$/;


export const insertAgentSchema = z.object({
  salutation: z.string().min(1, "Title is required"),
  firstName: z.string()
  .min(3, "First Name must be at least 3 characters")
  .max(50, "First Name cannot exceed 50 characters")
  .regex(/^[A-Za-z]+$/, "First Name must contain only letters")
  .refine((val) => !val.includes(" "), {
    message: "First Name cannot contain spaces",
  }),

  lastName: z.string()
  .min(3, "Last Name must be at least 3 characters")
  .max(50, "Last Name cannot exceed 50 characters")
  .regex(/^[A-Za-z]+$/, "Last Name must contain only letters")
  .refine((val) => !val.includes(" "), {
    message: "Last Name cannot contain spaces",
  }),

  email: z.string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .refine(val => /^[a-zA-Z0-9]/.test(val), "Email must start with a letter or number")
  .refine(val => !/[-_.]{2,}/.test(val), "Email cannot contain consecutive special characters")
  .refine(val => {
    // Validate domain has proper TLD (at least 2 chars) and recognizable pattern
    const parts = val.split("@");
    if (parts.length !== 2) return false;
    
    const domain = parts[1];
    // Domain must have at least one dot
    if (!domain.includes(".")) return false;
    
    const domainParts = domain.split(".");
    const tld = domainParts[domainParts.length - 1];
    
    // TLD must be 2-6 letters only (com, org, net, co, in, etc.)
    if (!/^[a-zA-Z]{2,6}$/.test(tld)) return false;
    
    // Domain name part (before TLD) must be at least 2 characters
    const domainName = domainParts.slice(0, -1).join(".");
    if (domainName.length < 2) return false;
    
    // Check for keyboard smashing patterns - too many consonants in a row
    const localPart = parts[0];
    const consonantStreak = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
    if (consonantStreak.test(localPart) || consonantStreak.test(domainName)) return false;
    
    // Check for repeating character patterns (e.g., "aaa", "xxx")
    const repeatingChars = /(.)\1{2,}/;
    if (repeatingChars.test(localPart) || repeatingChars.test(domainName)) return false;
    
    return true;
  }, "Please enter a valid email address"),

  // UPDATED: Allow optional + and 10-13 digits
  phone: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]{10,14}$/.test(val), {
    message: "Phone number must be 10-14 digits only.",
  }),

  // UPDATED: Allow optional + and 10-13 digits
  mobile: z
  .string()
  .nonempty("Mobile number is required")
  .regex(/^\+?[0-9]{10,14}$/, "Mobile number must be 10-14 digits only.")
  .refine(val => !/^(\d)\1+$/.test(val), "Mobile number cannot be all same digits"),

  fax: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]{0,10}$/.test(val), {
    message: "Fax number must be numeric only and up to 10 digits",
  }),

  type: z.string().min(1, "Agent Type is required"),
division: z.literal("DTH").default("DTH"),

  country: z.string().min(1, "Country is required"),
  region: z.string().min(1, "Region is required"),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  ward: z.string().min(1, "Ward is required"),
  address1: z.string()
  .min(1, "Address Line 1 is required") // Changed: Better error message
  .trim() // ✅ NEW: Auto-trim whitespace
  .min(5, "Address Line 1 must be at least 5 characters") 
  .max(100, "Address Line 1 cannot exceed 100 characters")
  .regex(/^[A-Za-z0-9\s]+$/, "Address Line 1 must contain only letters, numbers, and spaces")
  .refine((val) => !val.startsWith(" ") && !val.endsWith(" "), {
    message: "Address Line 1 cannot start or end with spaces",
  })
  .refine((val) => !/\s{2,}/.test(val), "Address cannot contain multiple consecutive spaces"),

address2: z.string()
.trim()
  .max(100, "Address Line 2 cannot exceed 100 characters")
  .regex(/^[A-Za-z0-9\s]*$/, "Address Line 2 must contain only letters, numbers, and spaces")
  .refine((val) => !val.startsWith(" ") && !val.endsWith(" "), {
    message: "Address Line 2 cannot start or end with spaces",
  })
  .optional()
  .or(z.literal("")),
  pinCode: z.string().optional().or(z.literal("")),
 tinName: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9\s]{0,40}$/.test(val), {
    message: "TIN Name must be alphanumeric with spaces only and up to 50 characters",
  }),

  // UPDATED: Alphanumeric only, no specific format
  tinNo: z.string()
  .min(1, "TIN Number is required")
  .max(20, "TIN Number cannot exceed 20 characters")
  .regex(/^[A-Za-z0-9-]+$/, "TIN Number must be alphanumeric with dashes only"),

  vrnNo: z
  .string()
  .max(20, "VRN cannot exceed 20 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: "VRN Number must be alphanumeric only",
  }),
  currency: z.string().min(1, "Currency is required"),
  parentId: z.string().nullable().optional(),
  creditLimit: z.number().optional(),
  commValue: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().min(0).max(100, "Commission cannot exceed 100%")
  ).default(5),
  gender: z.string().min(1, "Gender is required"),
  salesOrg: z.string().min(1, "Sales Org is required"),
  kycDocNo: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]{0,15}$/.test(val), {
    message: "POI Document number must be alphanumeric only and up to 15 characters",
  }),
  poaDocNo: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]{0,15}$/.test(val), {
    message: "POA Document number must be alphanumeric only and up to 15 characters",
  }),
  kycPoi: z.any().optional(),
  kycPoa: z.any().optional(),
  poaDocFile: z.any().optional(),
  poiDocFile: z.any().optional(),
  onbId: z.string().optional(),
  isSubCollection: z.enum(["Y", "N"]).default("N"),

}).superRefine((val, ctx) => {
  const normalized = (val.type || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "_");

  const needsParent =
    normalized === "SUB_AGENT" || normalized === "EMPLOYEE";

  if (needsParent && !val.parentId?.toString().trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parentId"],
      message: "Parent Agent ID is required for Sub-Agent/Employee",
    });
  }
});

export interface City {
  cityCode: string;
  city: string;
  // add other fields if needed
}

export const insertCustomerSchema = z.object({
  //personal details tab
  title: z.string().refine((val) => val && val.trim() !== "", {
    message: "Please Select Title",
  }),

firstName: z.string()
  .min(3, "First Name must be at least 3 characters")
  .max(50, "First Name cannot exceed 50 characters")
  .regex(/^[A-Za-z]+$/, "First Name must contain only letters"),

  middleName: z.string()
  .trim()
  .max(50, "Middle Name cannot exceed 50 characters")
  .optional()
  .or(z.literal(""))
  .refine(val => !val || val.length >= 3, "Middle Name must be at least 3 characters if provided")
  .refine(val => !val || /^[A-Za-z]+$/.test(val), "Middle Name must contain only letters"),

  lastName: z.string()
  .min(3, "Last Name must be at least 3 characters")
  .max(50, "Last Name cannot exceed 50 characters")
  .regex(/^[A-Za-z]+$/, "Last Name must contain only letters"),

  agentSapBpId: z.string().min(1, "Please enter Agent SAP BpId"),
  parentSapBpId: z.string().optional(),

  gender: z.string().nonempty("Please select Gender"),
  dateOfBirth: z.string()
  .min(1, "Please select Date of Birth")
  .refine(
    (dob) => {
      const birthDate = new Date(dob);
      const today = new Date();
      const cutoffDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );
      return birthDate <= cutoffDate;
    },
    {
      message: "Customer must be at least 18 years old.",
    }
  ),
  race: z.string().min(1, "Please select Race"),

  phone: z.string()
  .max(15, "Phone number cannot exceed 15 digits")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]{10,14}$/.test(val), {
    message: "Phone number must be 10-14 digits only.",
  }),


  altPhone: z.string()
  .max(15, "Alt phone cannot exceed 15 digits")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]{10,14}$/.test(val), {
    message: "Alternate phone must be 10-14 digits only.",
  }),

  mobile: z.string()
  .min(1, "Mobile number is required")
  .max(15, "Mobile number cannot exceed 15 digits")
  .regex(/^[0-9]{10,14}$/, "Mobile number must be 10-14 digits only.")
  .refine(val => !/^(\d)\1+$/.test(val), "Mobile number cannot contain repeating digits"),


  email: z.string()
  .min(1, "Please enter Email")
  .email("Please enter a valid email address")
  .refine(val => /^[a-zA-Z0-9]/.test(val), "Email must start with a letter or number")
  .refine(val => !/[-_.]{2,}/.test(val), "Email cannot contain consecutive special characters"),

  altEmail: z.string().email("Please enter a valid email address").optional().or(z.literal(""))
    .refine(val => !val || !/[-_.]{2,}/.test(val), "Alternative Email cannot contain consecutive special characters"),


fax: z.string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]{0,10}$/.test(val), {
    message: "Fax number must be numeric only and up to 10 digits",
  }),

  // Req 5: Org Name max length
orgName: z.string()
  .max(50, "Organization Name cannot exceed 50 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z\s]+$/.test(val), {
    message: "Organization Name must contain only letters and spaces",
  }),

  // general type tab
  customerType: z.string().min(1),
  accountClass: z.string().refine(val => !!val, { message: "Please select Account Class" }),
  newOrExisting: z.string().nonempty("Please Select Customer Status"),
  division: z.string().nonempty("Division is required"),
  salesOrg: z.string().nonempty("Sales Org is required"),
  smsFlag: z.boolean().default(true),
  noOfRooms: z.string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]+$/.test(val), {
    message: "Number of rooms must contain digits only",
  })
  .refine((val) => {
    if (!val) return true;
    const num = parseInt(val, 10);
    return num >= 1 && num <= 75;
  }, {
    message: "Number of rooms must be between 1 and 75",
  }),
  parentCustomerId: z.number().optional(),

  // address details
  addressType: z.string().min(1, "Please select Address Type"),
  countryInst: z.string().min(1, "Please Select Country"),
  regionInst: z.string().min(1, "Please Select Region"),
  cityInst: z.string().min(1, "Please Select City")
    .refine((val) => {
      const name = val.split('_')[0];
      return /^[a-zA-Z\s]{2,50}$/.test(name);
    }, "City must be 2-50 characters and contain only alphabets and spaces"),
  districtInst: z.string().min(1, "Please Select District"),
  wardInst: z.string().min(1, "Please Select Ward"),
  address1Inst: z.string()
  .min(5, "Address Line 1 is required and must have at least 5 characters")
  .max(100, "Address Line 1 cannot exceed 100 characters")
  .regex(/^[A-Za-z0-9\s]+$/, "Address Line 1 must contain only letters, numbers, and spaces")
  .refine(val => /[a-zA-Z]/.test(val), "Address must contain at least one letter"),

// address2Inst - alphanumeric + spaces only (optional)
address2Inst: z.string()
  .max(100, "Address Line 2 cannot exceed 100 characters")
  .optional()
  .or(z.literal(""))
  .refine(val => !val || /^[A-Za-z0-9\s]*$/.test(val), {
    message: "Address Line 2 must contain only letters, numbers, and spaces",
  }),

postalCodeInst: z.string()
  .max(10, "Postal Code cannot exceed 10 digits")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]+$/.test(val), {
    message: "Postal Code must contain digits only",
  }),
  // Billing address fields
  billingAddressType: z.string().optional(),
  billingCountry: z.string().min(1, "Please Select Billing Country"),
  billingRegion: z.string().min(1, "Please Select Billing Region"),
  billingCity: z.string().min(1, "Please Select Billing City")
    .refine((val) => {
      const name = val.split('_')[0];
      return /^[a-zA-Z\s]{2,50}$/.test(name);
    }, "City must be 2-50 characters and contain only alphabets and spaces"),
  billingDistrict: z.string().min(1, "Please Select Billing District"),
  billingWard: z.string().min(1, "Please Select Billing Ward"),
  billingAddress1: z.string()
  .min(5, "Billing Address 1 is required and must have at least 5 characters")
  .max(100, "Billing Address 1 cannot exceed 100 characters")
  .regex(/^[A-Za-z0-9\s]+$/, "Billing Address 1 must contain only letters, numbers, and spaces")
  .refine(val => /[a-zA-Z]/.test(val), "Billing Address must contain at least one letter"),

// billingAddress2 - alphanumeric + spaces only (optional)
billingAddress2: z.string()
  .max(100, "Billing Address 2 cannot exceed 100 characters")
  .optional()
  .or(z.literal(""))
  .refine(val => !val || /^[A-Za-z0-9\s]*$/.test(val), {
    message: "Billing Address 2 must contain only letters, numbers, and spaces",
  }),

billingPostalCode: z.string()
  .max(10, "Billing Postal Code cannot exceed 10 digits")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[0-9]+$/.test(val), {
    message: "Billing Postal Code must contain digits only",
  }),
  sameAsInstallation: z.boolean().default(false),

  // service setting tab
  azamPayId: z.string()
  .max(50, "Azam Pay ID cannot exceed 50 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: "Azam Pay ID must be alphanumeric only",
  }),

// azamMaxTvId - alphanumeric only
azamMaxTvId: z.string()
  .max(50, "Azam Max TV ID cannot exceed 50 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: "Azam Max TV ID must be alphanumeric only",
  }),

  //financial & tax  
tinName: z.string()
  .max(20, "TIN Name cannot exceed 20 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9\s]+$/.test(val), {
    message: "TIN Name must be alphanumeric with spaces only (no special characters)",
  }),
  // UPDATED: TIN Number validation changed to alphanumeric only (removed strict format)
  ctinNumber: z.string()
  .min(1, "TIN Number is Required")
  .max(20, "TIN Number cannot exceed 20 characters")
  .regex(/^[A-Za-z0-9-]+$/, "TIN Number must be alphanumeric with dashes only (no special characters)"),

  cvrnNumber: z.string()
  .min(1, "VRN is Required")
  .max(20, "VRN Number cannot exceed 20 characters")
  .regex(/^[A-Za-z0-9]+$/, "VRN Number must be alphanumeric only (no special characters)"),

  currency: z.string().default(""),

  kycDocuments: z.any().optional(),
  onboardingRefNo: z.string().optional(),
  kycDocNoPOI: z.string()
  .max(20, "POI Document Number cannot exceed 20 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: "POI Document Number must be alphanumeric only (no special characters)",
  }),

  kycDocNoPOA: z.string()
  .max(20, "POA Document Number cannot exceed 20 characters")
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: "POA Document Number must be alphanumeric only (no special characters)",
  }),

  kycPoi: z.any().optional(),
  kycPoa: z.any().optional(),
}).superRefine((val, ctx) => {
  if ((val.newOrExisting || "").toLowerCase() === "existing" && !val.parentSapBpId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parentSapBpId"],
      message: "Parent Customer SAP BP ID is required for Existing customers",
    });
  }

  if ((val.accountClass || "").toLowerCase().includes("hotel")) {
  if (!val.noOfRooms || val.noOfRooms.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["noOfRooms"],
      message: "Number of rooms is required for Hotel account class",
    });
  } else {
    const numRooms = parseInt(val.noOfRooms, 10);
    if (isNaN(numRooms) || numRooms < 1 || numRooms > 75) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["noOfRooms"],
        message: "Number of rooms must be between 1 and 75",
      });
    }
  }
}
});

export const insertInventoryItemSchema = z.object({
  materialCode: z.string().min(1),
  materialName: z.string().min(1),
  materialType: z.string().min(1),
  serialNumber: z.string().min(1),
  casId: z.string().optional(),
  state: z.string().default("FRESH"),
  status: z.string().default("AVAILABLE"),
  owner: z.string().min(1),
  createId: z.string().min(1),
  updateId: z.string().optional(),
  updateDt: z.date().optional(),
  updateTs: z.date().optional(),
});

export const insertInventoryRequestSchema = z.object({
  sapBpId: z.string().optional(),
  sapCaId: z.string().optional(),
  module: z.string().min(1),
  salesOrg: z.string().optional(),
  division: z.string().optional(),
  requestType: z.string().min(1),
  requestId: z.string().min(1),
  itemType: z.string().min(1),
  itemQty: z.string().min(1),
  itemSerialNo: z.string().optional(),
  itemAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  // VAT amount validation removed,
  transferFrom: z.string().optional(),
  transferTo: z.string().optional(),
  status: z.string().default("INPROGRESS"),
  createId: z.string().min(1),
  updateDt: z.date().optional(),
  updateTs: z.date().optional(),
});

// Agent Payment Details Schema
export const insertAgentPaymentDetailsSchema = z.object({
  sapBpId: z.string().min(1),
  sapCaId: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  payType: z.enum(['Hardware', 'Subscription']),
  payAmount: z.number().positive(),
  // VAT amount validation removed,
  totalAmount: z.number().positive(),
  payMode: z.enum(['CASH', 'CHEQUE', 'BANK_DEPOSIT', 'POS', 'MOBILE_MONEY', 'AZAM_PAY', 'DPO']),
  status: z.string().default('PENDING'),
  collectedBy: z.string().min(1),
  collectionCenter: z.string().min(1),
  description: z.string().optional(),
  receiptNo: z.string().optional(),
  chequeNo: z.string().optional(),
  bankRef: z.string().optional(),
  mobileRef: z.string().optional(),
  createId: z.string().min(1),
});

export type InsertAgentPaymentDetails = z.infer<typeof insertAgentPaymentDetailsSchema>;

// Receipt Cancellation Schema
export const insertReceiptCancellationSchema = z.object({
  payId: z.string().min(1),
  cancellationReason: z.string().min(1),
});

export type InsertReceiptCancellation = z.infer<typeof insertReceiptCancellationSchema>;

export const insertAgentReplacementSchema = z.object({
  sapBpId: z.string().min(1),
  sapCaId: z.string().min(1),
  requestType: z.string().default("AGENT_REPLACEMENT"),
  requestId: z.string().min(1),
  itemType: z.string().min(1),
  itemQty: z.string().min(1),
  itemSerialNo: z.string().min(1),
  itemAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  // VAT amount validation removed,
  transferFrom: z.string().min(1),
  transferTo: z.string().min(1),
  status: z.string().default("PENDING"),
  createId: z.string().min(1),
  cmStatus: z.string().default("PENDING"),
  cmStatusMsg: z.string().optional(),
  sapSoId: z.string().optional(),
  replacementCenter: z.string().optional(),
  faultyReason: z.string().optional(),
  replacementNotes: z.string().optional(),
  agentName: z.string().optional(),
  centerExecutive: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.date().optional(),
  completedDate: z.date().optional(),
});

export const insertAgentFaultyRepairSchema = z.object({
  itemId: z.number().min(1),
  materialCode: z.string().min(1),
  materialName: z.string().min(1),
  materialType: z.string().min(1),
  serialNumber: z.string().min(1),
  casId: z.string().optional(),
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  agentBpId: z.string().min(1),
  currentStatus: z.string().min(1),
  newStatus: z.string().default("REPAIR"),
  faultyReason: z.string().min(1),
  repairNotes: z.string().optional(),
  transferDate: z.date().optional(),
  repairCenter: z.string().optional(),
  processedBy: z.string().optional(),
  processedDate: z.date().optional(),
  createId: z.string().min(1),
  updateId: z.string().optional(),
  updateDt: z.date().optional(),
  updateTs: z.date().optional(),
});

export const insertPaymentDetailsSchema = z.object({
  sapBpId: z.string().max(20).min(1),
  sapCaId: z.string().max(20).min(1),
  module: z.string().max(20).min(1), // Agent / Customer / OTC
  payType: z.string().max(20).min(1), // Hardware / Subscription
  payAmount: z.number().min(0),
  // VAT amount validation removed,
  payMode: z.string().max(20).min(1), // CASH / CHEQUE / AZAM PAY etc
  chequeNo: z.string().max(20).optional(),
  bankName: z.string().max(50).optional(),
  currency: z.string().max(20).default(""),
  onlPgId: z.string().max(50).optional(),
  onlTransId: z.string().max(50).optional(),
  transId: z.string().max(50).min(1),
  status: z.string().max(20).default("PENDING"),
  description: z.string().max(200).optional(),
  createId: z.string().max(50).min(1),
  approvedBy: z.string().max(50).optional(),
  name: z.string().max(100).min(1),
  salesOrg: z.string().max(50).min(1),
  division: z.string().max(50).min(1),
  cmStatus: z.string().max(50).default("PENDING"),
  cmStatusMsg: z.string().max(200).optional(),
  collectedBy: z.string().max(100).min(1),
  collectionCenter: z.string().max(50).min(1),
});

export const insertPaymentSchema = z.object({
  customerId: z.number(),
  amount: z.number().min(0),
  currency: z.string().default(""),
  paymentMode: z.string().min(1),
  referenceNumber: z.string().optional(),
  type: z.string().min(1),
  status: z.string().default("pending"),
  receiptNumber: z.string().optional(),
});

export const insertSubscriptionSchema = z.object({
  customerId: z.number(),
  smartCardNumber: z.string().min(1),
  plan: z.string().min(1),
  amount: z.number().min(0),
  startDate: z.date(),
  endDate: z.date(),
  activationType: z.string().min(1),
  status: z.string().default("active"),
  autoRenewal: z.boolean().optional(),
});

// System Incident Schema
export const insertSystemIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  affectedSystem: z.enum([
    AffectedSystem.PORTAL,
    AffectedSystem.CM,
    AffectedSystem.SOM,
    AffectedSystem.CC,
    AffectedSystem.CI,
    AffectedSystem.NAGRA,
  ] as [string, ...string[]]),
  severity: z.enum([
    IncidentSeverity.CRITICAL,
    IncidentSeverity.MAJOR,
    IncidentSeverity.MINOR,
  ] as [string, ...string[]]),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startTime: z.date(),
  endTime: z.date().optional(),
  impactedCustomers: z.number().min(0).optional(),
  rootCause: z.string().optional(),
  resolutionSteps: z.string().optional(),
  status: z.enum([
    IncidentStatus.OPEN,
    IncidentStatus.INVESTIGATING,
    IncidentStatus.RESOLVED,
    IncidentStatus.CLOSED,
  ] as [string, ...string[]]).default(IncidentStatus.OPEN),
  assignedOwner: z.string().optional(),
  ownerTeam: z.enum(['Technical', 'Operations']).optional(),
  attachments: z.array(z.string()).optional(),
  notificationSettings: z.object({
    emailAlerts: z.boolean().default(true),
    smsAlerts: z.boolean().default(false),
    stakeholders: z.array(z.string().email()).optional(),
  }).optional(),
  linkedServiceTickets: z.array(z.number()).optional(),
});

export type InsertSystemIncident = z.infer<typeof insertSystemIncidentSchema>;

// Plan Change Schemas based on SERVICE_TRANS_DETAILS specification
export interface PlanChange {
  id: number;
  sapBpId: string;         // Business Partner ID - VARCHAR 10
  sapCaId: string;         // Contract Account ID - VARCHAR 12
  sapContractId: string;   // SAP Provider Contract ID - VARCHAR 30
  smartCardNumber: string; // STB Smart Card No - VARCHAR 30
  actionType: string;      // Action Type - VARCHAR 30
  actionSubtype: string;   // Action Sub Type - VARCHAR 30
  requestId: string;       // Unique auto generated id - VARCHAR 30
  planType: string;        // Plan Type - VARCHAR 20
  planId: string;          // SAP Plan code - VARCHAR 5
  planName: string;        // Plan Name - VARCHAR 50
  bundleName: string;      // Bundle Name - VARCHAR 50
  division: string;        // Division - VARCHAR 50
  planRate: number;        // Plan pricing - BIGINT 10,2
  planAmount: number;      // Total Amount - BIGINT 10,2
  // VAT amount removed as per user request       // VAT Amount - BIGINT 10,2
  startDate: Date;         // Plan Start Date
  endDate: Date;           // Plan end Date
  status: string;          // INPROGRESS/APPROVED/COMPLETED - VARCHAR 20
  createId: string;        // User Logged ID - VARCHAR 50
  createDt: Date;          // CREATION DATE
  createTs: Date;          // CREATION TIME
  updateDt?: Date;         // Update Date
  updateTs?: Date;         // Update Time
  updateId?: string;       // Updating User - VARCHAR 50
  cmStatus?: string;       // CM Wf status - VARCHAR 20
  cmStatusMsg?: string;    // CM Status Message - VARCHAR 100
  changeType: 'immediate' | 'scheduled'; // Type of plan change
  isWithinBufferPeriod?: boolean;        // Whether change is within buffer period
  scheduledExecutionDate?: Date;         // For scheduled changes
  oldPlanId: string;       // Previous plan ID
  oldPlanName: string;     // Previous plan name
  oldPlanAmount: number;   // Previous plan amount
  walletBalance: number;   // Customer wallet balance at time of change
  refundAmount?: number;   // Refund amount if within buffer period
  paymentRequired: number; // Additional payment required
}

export interface PlanChangeHistory {
  id: number;
  customerId: string;
  smartCardNumber: string;
  eventDate: Date;
  eventName: string;
  planName: string;
  planStartDate?: Date;
  planEndDate?: Date;
  amount: number;
  walletBalance: number;
  changeType: 'immediate' | 'scheduled' | 'auto_renewal' | 'cancellation';
  status: 'success' | 'failed' | 'pending';
}

export const insertPlanChangeSchema = z.object({
  sapBpId: z.string().max(10).min(1),
  sapCaId: z.string().max(12).min(1),
  sapContractId: z.string().max(30).min(1),
  smartCardNumber: z.string().max(30).min(1),
  actionType: z.string().max(30).default("PLAN_CHANGE"),
  actionSubtype: z.enum(["IMMEDIATE", "SCHEDULED"]),
  planType: z.string().max(20).min(1),
  planId: z.string().max(5).min(1),
  planName: z.string().max(50).min(1),
  bundleName: z.string().max(50).min(1),
  division: z.string().max(50).min(1),
  planRate: z.number().min(0),
  planAmount: z.number().min(0),
  // VAT amount validation removed,
  startDate: z.date(),
  endDate: z.date(),
  status: z.string().max(20).default("INPROGRESS"),
  createId: z.string().max(50).min(1),
  changeType: z.enum(["immediate", "scheduled"]),
  oldPlanId: z.string().max(5).min(1),
  oldPlanName: z.string().max(50).min(1),
  oldPlanAmount: z.number().min(0),
  walletBalance: z.number().min(0),
  refundAmount: z.number().min(0).optional(),
  paymentRequired: z.number().min(0),
  scheduledExecutionDate: z.date().optional(),
});

export type InsertPlanChange = z.infer<typeof insertPlanChangeSchema>;

// Add-On Pack Management interfaces based on SAP BRIM implementation (Updated)
export interface AddOnPackSAP {
  id: number;
  packId: string;
  packName: string;
  description?: string;
  price: number;
  currency: string;
  channels: number;
  category: string;
  validityDays: number;
  autoRenewalFlag: boolean;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AddOnPurchase {
  id: number;
  customerId: string;
  customerName: string;
  smartCardNo: string;
  sapBpId?: string;
  sapCaId?: string;
  sapContractId?: string;
  addOnPackId: string;
  addOnPackName: string;
  baseplanEndDate: Date;
  proratedAmount: number;
  totalAmount: number;
  // VAT amount removed as per user request
  purchaseDate: Date;
  startDate: Date;
  endDate: Date;
  autoRenewalFlag: boolean;
  status: string;
  requestId: string;
  cmStatus?: string;
  cmStatusMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AddOnRenewal {
  id: number;
  customerId: string;
  addOnPurchaseId: number;
  renewalType: 'manual' | 'auto';
  baseplanEndDate: Date;
  proratedAmount: number;
  totalAmount: number;
  // VAT amount removed as per user request
  renewalDate: Date;
  newEndDate: Date;
  status: string;
  requestId: string;
  cmStatus?: string;
  cmStatusMessage?: string;
  createdAt?: Date;
}

export interface AddOnRemoval {
  id: number;
  customerId: string;
  addOnPurchaseId: number;
  removalDate: Date;
  reason?: string;
  status: string;
  requestId: string;
  cmStatus?: string;
  cmStatusMessage?: string;
  createdAt?: Date;
}

// Add-On Pack Zod schemas for validation
export const insertAddOnPackSchema = z.object({
  packId: z.string().min(1),
  packName: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().min(1),
  channels: z.number().positive(),
  category: z.string().min(1),
  validityDays: z.number().positive(),
  autoRenewalFlag: z.boolean().default(true),
  status: z.string().default('active'),
});

export const insertAddOnPurchaseSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  smartCardNo: z.string().min(1),
  sapBpId: z.string().optional(),
  sapCaId: z.string().optional(),
  sapContractId: z.string().optional(),
  addOnPackId: z.string().min(1),
  addOnPackName: z.string().min(1),
  baseplanEndDate: z.string().transform((str) => new Date(str)),
  proratedAmount: z.number().positive(),
  totalAmount: z.number().positive(),
  // VAT amount validation removed,
  purchaseDate: z.string().transform((str) => new Date(str)).default(() => new Date().toISOString()),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  autoRenewalFlag: z.boolean().default(true),
  status: z.string().default('pending'),
});

export const insertAddOnRenewalSchema = z.object({
  customerId: z.string().min(1),
  addOnPurchaseId: z.number().positive(),
  renewalType: z.enum(['manual', 'auto']),
  baseplanEndDate: z.string().transform((str) => new Date(str)),
  proratedAmount: z.number().positive(),
  totalAmount: z.number().positive(),
  // VAT amount validation removed,
  renewalDate: z.string().transform((str) => new Date(str)).default(() => new Date().toISOString()),
  newEndDate: z.string().transform((str) => new Date(str)),
  status: z.string().default('pending'),
});

export const insertAddOnRemovalSchema = z.object({
  customerId: z.string().min(1),
  addOnPurchaseId: z.number().positive(),
  removalDate: z.string().transform((str) => new Date(str)).default(() => new Date().toISOString()),
  reason: z.string().optional(),
  status: z.string().default('pending'),
});

export type InsertAddOnPack = z.infer<typeof insertAddOnPackSchema>;
export type InsertAddOnPurchase = z.infer<typeof insertAddOnPurchaseSchema>;
export type InsertAddOnRenewal = z.infer<typeof insertAddOnRenewalSchema>;
export type InsertAddOnRemoval = z.infer<typeof insertAddOnRemovalSchema>;

export interface AgentHardwarePayment {
  id: number;
  payId: string; // Unique Primary Key
  sapBpId: string; // SAP Business Partner ID
  sapCaId: string; // SAP Contract Account ID
  module: string; // Agent / Customer / OTC
  payType: string; // Hardware / Subscription
  payAmount: number; // Amount
  // VAT amount removed as per user request // Tax Amount
  payMode: string; // CASH / CHEQUE / POS / MOBILE MONEY / BANK DEPOSIT
  chequeNo?: string; // Bank Cheque No
  bankName?: string; // Bank Name
  currency: string; // Transaction Currency
  onlPgId?: string; // Online Merchant Pay ID
  onlTransId?: string; // Online Portal Trans ID
  transId: string; // Portal Transaction ID
  status: string; // INPROGRESS / APPROVED / COMPLETED / PENDING / CANCELLED
  description?: string;
  createId: string;
  createDt: Date;
  createTs: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
  approvedBy?: string; // Finance Approver
  name: string; // Agent Name / Collected By
  salesOrg: string;
  division: string;
  cmStatus?: string; // CM Integration Status
  cmStatusMsg?: string; // CM Status Message
  ficaStatus?: string; // FICA Integration Status
  ficaStatusMsg?: string; // FICA Status Message
  collectedBy?: string; // Agent Name
  collectionCenter?: string; // Location
  receiptNumber?: string;
  hardwareItems?: {
    materialCode: string;
    materialName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

// Agent Hardware Sale form schema
export const agentHardwareSaleItemSchema = z.object({
  materialCode: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  itemSerialNo: z.string().optional(),
  smartCardNumber: z.string().optional(),
  selectedSerials: z.array(z.string()).optional(),
});

export const agentHardwareSaleSchema = z.object({
  // Agent verification
  agentInput: z.string().min(1, "Agent is required"),
  sapBpId: z.string().min(1, "Please select a valid agent"),
  sapCaId: z.string().optional(),
  agentName: z.string().optional(),

  // Required plant
  plantId: z.string().min(1, "Plant/Warehouse is required"),

  // Pricing context (kept as fields, not required beyond enum constraint)
  priceType: z.enum(["KIT", "INDIVIDUAL"]),
  division: z.string().optional(),

  // Optional display fields
  currency: z.string().optional(),

  // Items (at least one)
  items: z.array(agentHardwareSaleItemSchema).min(1, "Add at least one item"),
});

// ** NEW SCHEMA FOR CUSTOMER HARDWARE SALE **
export const customerHardwareSaleItemSchema = z.object({
  materialCode: z.string().min(1, "Material is required."),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional(),
  itemSerialNo: z.string().optional(),
  smartCardNumber: z.string().optional(),
});

export const customerHardwareSaleSchema = z.object({
  sapBpId: z.string().min(1, "Customer SAP BP ID is required."),
  sapCaId: z.string().optional(),
  channel: z.enum(["OTC", "AGENT"]),
  plantSelected: z.string().min(1, "Plant/Collection Center is required."),
  priceType: z.enum(["KIT", "INDIVIDUAL"]),
  storeLocationSelected: z.string().optional(),
  agentCollectedBy: z.string().optional(),
  items: z.array(customerHardwareSaleItemSchema).min(1, "Please add at least one hardware item."),
  remark: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.channel === "OTC" && !data.storeLocationSelected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeLocationSelected"],
      message: "Store Location is required for OTC channel.",
    });
  }
  if (data.channel === "AGENT" && !data.agentCollectedBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agentCollectedBy"],
      message: "Collected By is required for Agent channel.",
    });
  }
});


// Agent Hardware Payment - Initiate
export const agentHwPaymentInitiateSchema = z.object({
  sapBpId: z.string().min(1, "Agent BP ID is required"),
  collectionCenter: z.string().min(1, "Collection center is required"),
  payMode: z.enum(["CASH", "CHEQUE", "BANK_DEPOSIT", "POS"]),
  currency: z.string().min(1, "Currency required"),
  payAmount: z
    .string()
    .regex(/^[\d,]+(\.\d{1,2})?$/, "Amount must be numeric"),
  collectedBy: z.string().min(1, "Collected By is required"),

  // Updated: Max lengths added
  chequeNo: z.string().max(20, "Cheque No cannot exceed 20 characters").nullable().optional(),
  bankName: z.string().nullable().optional(),
  chequeDate: z.string().nullable().optional(),
  branchName: z.string().max(50, "Branch Name cannot exceed 50 characters").nullable().optional(),
  receiptNo: z.string().max(10, "Receipt No cannot exceed 10 digits").nullable().optional(),

  description: z.string().optional(),
  onlTransId: z.string().nullable().optional(),
  type: z.string().optional(),
  isSecurityDeposit: z.boolean().default(false),
})
  // Refine: Cheque Requirements
  .refine((d) => {
    if (d.payMode === "CHEQUE" && !d.chequeNo) return false;
    return true;
  }, {
    path: ["chequeNo"],
    message: "Cheque No is required for Cheque payment",
  })
  // Refine: Bank Name Requirement (CHEQUE OR BANK_DEPOSIT)
  .refine((d) => {
    if ((d.payMode === "CHEQUE" || d.payMode === "BANK_DEPOSIT") && !d.bankName) return false;
    return true;
  }, {
    path: ["bankName"],
    message: "Bank Name is required for this payment mode",
  });

// --- Payment Approval ---


export const agentHwPaymentApprovalSchema = z.object({
  sapBpId: z.string().min(1, "BP ID is required"),
  transId: z.string().min(1, "Transaction ID is required"),
  description: z.string().min(1, "Description required"),
  status: z.enum(["APPROVED", "REJECTED"]),
});
export type AgentHwPaymentApproval = z.infer<typeof agentHwPaymentApprovalSchema>;   // ✅

export const agentHwPaymentSearchSchema = z.object({
  transId: z.string().optional(),
  sapBpId: z.string().optional(),
  payType: z.string().optional(),
  payMode: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  collectionCenter: z.string().optional(),
  isSpecificTransaction: z.enum(["Y", "N"]),
  status: z.string().optional(),
  offSet: z.number().default(0),
  limit: z.number().default(50),
});
export type AgentHwPaymentSearch = z.infer<typeof agentHwPaymentSearchSchema>;
// --- Payment Search ---


export const insertAgentHardwarePaymentSchema = z.object({
  sapBpId: z.string().min(1),
  sapCaId: z.string().min(1),
  module: z.string().default("Agent"),
  payType: z.string().default("Hardware"),
  payAmount: z.number().min(0.01),
  // VAT amount validation removed,
  payMode: z.enum(["CASH", "CHEQUE", "BANK_DEPOSIT", "POS", "MOBILE_MONEY"]),
  chequeNo: z.string().optional(),
  bankName: z.string().optional(),
  currency: z.string().default(""),
  onlPgId: z.string().optional(),
  onlTransId: z.string().optional(),
  status: z.string().default("PENDING"),
  description: z.string().optional(),
  name: z.string().min(1),
  salesOrg: z.string().min(1),
  division: z.string().min(1),
  collectedBy: z.string().optional(),
  collectionCenter: z.string().optional(),
  hardwareItems: z.array(z.object({
    materialCode: z.string().min(1),
    materialName: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
  })).optional(),
  createId: z.string().min(1),
});

export const customerHwPaymentInitiateSchema = z.object({
  sapBpId: z.string().min(1, "SAP BP ID is required"),
  customerPhone: z.string().optional(),

  // Req 1: Amount must be greater than 0
  payAmount: z.string()
    .min(1, "Payment Amount is required")
    .refine((val) => {
      const num = parseFloat(val.replace(/,/g, ''));
      return !isNaN(num) && num > 0;
    }, "Payment Amount must be greater than 0"),

  payMode: z.enum(["CASH", "CHEQUE", "BANK_DEPOSIT"]),

  chequeNo: z.string()
    .max(20, "Cheque No must be up to 20 chars")
    .optional(),

  bankName: z.string().optional(),
  chequeDate: z.string().optional(),
  branchName: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  description: z.string().optional(),
  collectionCenter: z.string().min(1, "Collection Center is required"),
  storeLocation: z.string().min(1, "Store Location is required"),
  collectedBy: z.string().min(1, "Collected By is required"),

  // Req 2: Receipt No max 10 characters
  receiptNo: z.string()
    .max(10, "Receipt No cannot exceed 10 characters")
    .optional(),

  type: z.string().optional(),
})
  // Req 4: Validate Bank Name for BANK_DEPOSIT as well
  .refine((d) => {
    // If Mode is CHEQUE or BANK_DEPOSIT, Bank Name is mandatory
    if ((d.payMode === "CHEQUE" || d.payMode === "BANK_DEPOSIT") && !d.bankName) {
      return false;
    }
    return true;
  }, {
    path: ["bankName"],
    message: "Bank Name is required for this payment mode",
  })
  // Validate Cheque No for CHEQUE mode only
  .refine((d) => !(d.payMode === "CHEQUE" && !d.chequeNo), {
    path: ["chequeNo"],
    message: "Cheque No required for CHEQUE payment",
  })
  // Validate Cheque Date is mandatory for CHEQUE mode
  .refine((d) => {
    if (d.payMode === "CHEQUE" && !d.chequeDate) {
      return false;
    }
    return true;
  }, {
    path: ["chequeDate"],
    message: "Cheque Date is required",
  })
  // Validate Bank Deposit Date is mandatory for BANK_DEPOSIT mode
  .refine((d) => {
    if (d.payMode === "BANK_DEPOSIT" && !d.chequeDate) {
      return false;
    }
    return true;
  }, {
    path: ["chequeDate"],
    message: "Bank Deposit Date is required",
  })
  // Req 3: Cheque Date Validation (Last 6 Months for CHEQUE)
  .refine((d) => {
    if (d.payMode === "CHEQUE" && d.chequeDate) {
      const selectedDate = new Date(d.chequeDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      if (selectedDate > today) return false;
      if (selectedDate < sixMonthsAgo) return false;
    }
    return true;
  }, {
    path: ["chequeDate"],
    message: "Cheque Date must be within the last 6 months and not in the future",
  })
  // Bank Deposit Date Validation (Last 1 Month for BANK_DEPOSIT)
  .refine((d) => {
    if (d.payMode === "BANK_DEPOSIT" && d.chequeDate) {
      const selectedDate = new Date(d.chequeDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      oneMonthAgo.setHours(0, 0, 0, 0);

      if (selectedDate > today) return false;
      if (selectedDate < oneMonthAgo) return false;
    }
    return true;
  }, {
    path: ["chequeDate"],
    message: "Bank Deposit Date must be within the last month and not in the future",
  });

export type CustomerHwPaymentInitiate = z.infer<typeof customerHwPaymentInitiateSchema>;


// ** NEW: Customer Subscription Payment - Initiate **
export const customerSubPaymentInitiateSchema = z.object({
  sapBpId: z.string().min(1, "SAP BP ID is required"),
  payAmount: z.string().min(1, "Payment Amount is required").max(10, "Amount cannot exceed 10 digits"),
  payMode: z.enum(["CASH", "CHEQUE", "BANK_DEPOSIT"]),
  chequeNo: z.string().max(20, "Cheque No must be up to 20 chars").optional(),
  bankName: z.string().optional(),
  chequeDate: z.string().optional(),
  branchName: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  description: z.string().optional(),

  // Changed: Made optional by default, enforced via superRefine for OTC
  collectionCenter: z.string().optional(),
  storeLocation: z.string().optional(),

  collectedBy: z.string().min(1, "Collected By is required"),
  receiptNo: z.string().max(10, "Receipt No must be up to 10 digits").optional(),
  type: z.string().optional(),

  // Changed: Integrated channel into schema validation
  channel: z.string().min(1, "Channel is required"),
})
  .refine((d) => !(d.payMode === "CHEQUE" && !d.chequeNo), {
    path: ["chequeNo"],
    message: "Cheque No is required for CHEQUE payment",
  })
  .refine((d) => !(d.payMode === "CHEQUE" && !d.bankName), {
    path: ["bankName"],
    message: "Bank Name is required for CHEQUE payment",
  })
  .superRefine((data, ctx) => {
    // Conditional Validation based on Channel
    if (data.channel && data.channel.includes("Over the Counter")) {
      if (!data.collectionCenter) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["collectionCenter"],
          message: "Collection Center is required for OTC channel",
        });
      }
      if (!data.storeLocation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["storeLocation"],
          message: "Store Location is required for OTC channel",
        });
      }
    }
  });

export type CustomerSubPaymentInitiate = z.infer<typeof customerSubPaymentInitiateSchema>;
// Agent Hardware Sale Schema based on INVENTORY_REQUEST specification
export interface AgentHardwareSale {
  id: number;
  sapBpId: string;  // Business Partner ID - VARCHAR 20
  sapCaId: string;  // Contract Account ID - VARCHAR 20
  module: string;   // AGENT / CUSTOMER / OTC - VARCHAR 20
  salesOrg: string; // SAP SD SALES ORG - VARCHAR 20
  division: string; // SAP SD Division - VARCHAR 20
  requestType: string; // AGENT_SALE - VARCHAR 20
  requestId: string; // Unique auto generated id - VARCHAR 30
  plantId: string;  // Main warehouse/plant ID
  agentName: string; // Agent name
  agentBalance: number; // Current agent balance
  overridePrice?: number; // Price override by sales head
  priceType: string; // KIT or INDIVIDUAL
  items: AgentHardwareSaleItem[];
  totalAmount: number; // Total Amount - BIGINT 10,2
  // VAT amount removed as per user request  // VAT Amount - BIGINT 10,2
  transferFrom: string; // SOURCE Entity - VARCHAR 50
  transferTo: string;   // Receiving entity - VARCHAR 50
  status: string;       // INPROGRESS/APPROVED/COMPLETED - VARCHAR 20
  approvedBy?: string;
  rejectionReason?: string;
  deliveryNoteId?: string;
  invoiceId?: string;
  serialNumbersAssigned: boolean;
  assignedSerialNumbers?: string[]; // Bulk uploaded serial numbers
  createId: string;     // User Logged ID - VARCHAR 50
  createDt: Date;       // CREATION DATE
  createTs: Date;       // CREATION TIME
  updateDt?: Date;      // Update Date
  updateTs?: Date;      // Update Time
  updateId?: string;    // Updating User - VARCHAR 50
  cmStatus?: string;    // CM Wf status - VARCHAR 20
  cmStatusMsg?: string; // CM Status Message - VARCHAR 100
  sapSoId?: string;     // SD Order ID - VARCHAR 30
  exchangeRate?: number; // For multi-currency support
  currency: string;
}

export interface AgentHardwareSaleItem {
  id?: number;
  materialCode: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  kitPrice?: number;
  individualPrice?: number;
  serialNumbers?: string[];
  isKitItem: boolean;
}

// Customer Hardware Sale Schema based on INVENTORY_REQUEST specification for OTC
export interface CustomerHardwareSale {
  id: number;
  sapBpId: string;  // Business Partner ID - VARCHAR 20
  sapCaId: string;  // Contract Account ID - VARCHAR 20
  module: string;   // CUSTOMER / OTC - VARCHAR 20
  salesOrg: string; // SAP SD SALES ORG - VARCHAR 20
  division: string; // SAP SD Division - VARCHAR 20
  requestType: string; // CUSTOMER_SALE - VARCHAR 20
  requestId: string; // Unique auto generated id - VARCHAR 30
  itemType: string; // Material Code/name - VARCHAR 20
  itemQty: number;  // Quantity - VARCHAR 5
  itemSerialNo?: string; // Item Serial No - VARCHAR 50
  itemAmount: number; // Item Price - BIGINT 10,2
  totalAmount: number; // Total Amount - BIGINT 10,2
  // VAT amount removed as per user request  // VAT Amount - BIGINT 10,2
  transferFrom: string; // SOURCE Entity - VARCHAR 50
  transferTo: string;   // Receiving entity - VARCHAR 50
  status: string;       // INPROGRESS/APPROVED/COMPLETED - VARCHAR 20
  customerName: string; // Customer name
  customerPhone: string; // Customer phone
  customerEmail?: string; // Customer email
  planSelected?: string; // Selected plan for pricing
  paymentStatus: string; // Payment status
  invoiceGenerated: boolean;
  traRequestPosted: boolean; // Tax Authority request posted
  items: CustomerHardwareSaleItem[];
  createId: string;     // User Logged ID - VARCHAR 50
  createDt: Date;       // CREATION DATE
  createTs: Date;       // CREATION TIME
  updateDt?: Date;      // Update Date
  updateTs?: Date;      // Update Time
  updateId?: string;    // Updating User - VARCHAR 50
  cmStatus?: string;    // CM Wf status - VARCHAR 20
  cmStatusMsg?: string; // CM Status Message - VARCHAR 100
  sapSoId?: string;     // SD Order ID - VARCHAR 30
  currency: string;
  exchangeRate?: number; // For multi-currency support
}

export interface CustomerHardwareSaleItem {
  id?: number;
  materialCode: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumbers?: string[];
  make?: string;
  modelNo?: string;
  casId?: string;
}

export const insertCustomerHardwareSaleSchema = z.object({
  sapBpId: z.string().max(20).min(1),
  sapCaId: z.string().max(20).min(1),
  module: z.string().max(20).default("CUSTOMER"),
  salesOrg: z.string().max(20).min(1),
  division: z.string().max(20).min(1),
  requestType: z.string().max(20).default("CUSTOMER_SALE"),
  itemType: z.string().max(20).min(1),
  itemQty: z.number().min(1),
  itemSerialNo: z.string().max(50).optional(),
  itemAmount: z.number().min(0),
  totalAmount: z.number().min(0.01),
  // VAT amount validation removed,
  transferFrom: z.string().max(50).min(1),
  transferTo: z.string().max(50).min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional(),
  planSelected: z.string().optional(),
  paymentStatus: z.string().default("PENDING"),
  invoiceGenerated: z.boolean().default(false),
  traRequestPosted: z.boolean().default(false),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialName: z.string().min(1),
    materialType: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    make: z.string().optional(),
    modelNo: z.string().optional(),
    casId: z.string().optional(),
  })).min(1),
  currency: z.string().default(""),
  exchangeRate: z.number().optional(),
  createId: z.string().max(50).min(1),
});

export const insertAgentHardwareSaleSchema = z.object({
  sapBpId: z.string().max(20).min(1),
  sapCaId: z.string().max(20).min(1),
  module: z.string().max(20).default("AGENT"),
  salesOrg: z.string().max(20).min(1),
  division: z.string().max(20).min(1),
  requestType: z.string().max(20).default("AGENT_SALE"),
  plantId: z.string().min(1),
  agentName: z.string().min(1),
  agentBalance: z.number().min(0),
  overridePrice: z.number().optional(),
  priceType: z.enum(["KIT", "INDIVIDUAL"]).default("INDIVIDUAL"),
  items: z.array(z.object({
    materialCode: z.string().min(1),
    materialName: z.string().min(1),
    materialType: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    kitPrice: z.number().optional(),
    individualPrice: z.number().optional(),
    isKitItem: z.boolean().default(false),
  })).min(1),
  totalAmount: z.number().min(0.01),
  // VAT amount validation removed,
  transferFrom: z.string().max(50).min(1),
  transferTo: z.string().max(50).min(1),
  currency: z.string().default(""),
  exchangeRate: z.number().optional(),
  createId: z.string().max(50).min(1),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InsertInventoryRequest = z.infer<typeof insertInventoryRequestSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertAgentHardwarePayment = z.infer<typeof insertAgentHardwarePaymentSchema>;
export type InsertAgentHardwareSale = z.infer<typeof insertAgentHardwareSaleSchema>;
export type AgentHwPaymentInitiate = z.infer<typeof agentHwPaymentInitiateSchema>;
export type AgentHardwareSaleForm = z.infer<typeof agentHardwareSaleSchema>;
export type CustomerHardwareSaleForm = z.infer<typeof customerHardwareSaleSchema>;


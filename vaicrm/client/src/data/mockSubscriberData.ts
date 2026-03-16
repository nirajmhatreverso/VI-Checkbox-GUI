// Mock data for subscriber view page

// Mock subscription history
export const mockSubscriptionHistory = [
  {
    id: 1,
    customerId: "CUST001",
    planId: "AZ002",
    planName: "Azam Play 1 Month",
    amount: 22420,
    transactionType: "RENEWAL" as const,
    paymentMethod: "WALLET" as const,
    transactionDate: "2025-04-24 14:00:00",
    startDate: "2025-04-24 14:00:00",
    endDate: "2025-05-23 23:59:59",
    status: "COMPLETED" as const,
    notes: "Auto renewal successful"
  },
  {
    id: 2,
    customerId: "CUST001",
    planId: "AZ001",
    planName: "Azam Lite 1 Month",
    amount: 12000,
    transactionType: "PLAN_CHANGE" as const,
    paymentMethod: "WALLET" as const,
    transactionDate: "2025-03-24 10:30:00",
    startDate: "2025-03-24 10:30:00",
    endDate: "2025-04-23 23:59:59",
    status: "COMPLETED" as const,
    notes: "Plan upgraded from Lite to Play"
  },
  {
    id: 3,
    customerId: "CUST001",
    planId: "AZ001",
    planName: "Azam Lite 1 Month",
    amount: 12000,
    transactionType: "PURCHASE" as const,
    paymentMethod: "MOBILE_MONEY" as const,
    transactionDate: "2025-01-15 10:30:00",
    startDate: "2025-01-15 10:30:00",
    endDate: "2025-02-14 23:59:59",
    status: "COMPLETED" as const,
    notes: "Initial subscription purchase"
  }
];

// Mock tickets data
export const mockTickets = [
  {
    id: 1,
    customerId: "CUST001",
    date: "2025-10-10",
    time: "14:30:00",
    ticketId: "TK-2025-001234",
    type: "Technical Issue",
    priority: "High",
    status: "In Progress",
    agent: "Agent: Sarah Johnson",
    description: "No signal on channels 101-150",
    resolution: "Technician dispatched to check dish alignment"
  },
  {
    id: 2,
    customerId: "CUST001",
    date: "2025-10-06",
    time: "10:15:00",
    ticketId: "TK-2025-001198",
    type: "Billing Query",
    priority: "Medium",
    status: "Resolved",
    agent: "Agent: John Mwangi",
    description: "Query about double charging",
    resolution: "Verified billing, refund processed"
  },
  {
    id: 3,
    customerId: "CUST001",
    date: "2025-10-03",
    time: "16:45:00",
    ticketId: "TK-2025-001156",
    type: "Service Request",
    priority: "Low",
    status: "Closed",
    agent: "Agent: Mary Kilimo",
    description: "Request for additional channels",
    resolution: "Upgraded to premium package"
  },
  {
    id: 4,
    customerId: "CUST001",
    date: "2025-10-10",
    time: "09:20:00",
    ticketId: "TK-2025-001089",
    type: "Hardware Issue",
    priority: "High",
    status: "Resolved",
    agent: "Technician: Peter Tech",
    description: "STB not powering on",
    resolution: "STB replaced under warranty"
  },
  {
    id: 5,
    customerId: "CUST001",
    date: "2025-10-14",
    time: "11:30:00",
    ticketId: "TK-2025-001023",
    type: "Service Request",
    priority: "Medium",
    status: "Resolved",
    agent: "Agent: Grace Mushi",
    description: "Request for service reconnection",
    resolution: "Service reconnected after payment"
  }
];

// Mock payment history
export const mockPaymentHistory = [
  {
    id: 1,
    customerId: "CUST001",
    date: "2025-10-10",
    time: "14:00:00",
    transactionId: "TXN-2025-004-001",
    amount: 22420,
    currency: "TZS",
    paymentType: "SUBSCRIPTION" as const,
    paymentMethod: "Wallet" as const,
    reference: "RCP-2025-004-001",
    status: "Completed" as const,
    description: "Azam Play 1 Month - Auto Renewal"
  },
  {
    id: 2,
    customerId: "CUST001",
    date: "2025-10-13",
    time: "14:00:00",
    transactionId: "TXN-2025-004-002",
    amount: 8000,
    currency: "TZS",
    paymentType: "ADD_ON" as const,
    paymentMethod: "Wallet" as const,
    reference: "RCP-2025-004-002",
    status: "Completed" as const,
    description: "Sports Ultimate Pack"
  },
  {
    id: 3,
    customerId: "CUST001",
    date: "2025-10-03",
    time: "09:15:00",
    transactionId: "TXN-2025-004-003",
    amount: 30000,
    currency: "TZS",
    paymentType: "SUBSCRIPTION" as const,
    paymentMethod: "Mobile Money" as const,
    reference: "RCP-2025-004-003",
    status: "Completed" as const,
    description: "Wallet Top-up via M-Pesa"
  },
  {
    id: 4,
    customerId: "CUST001",
    date: "2025-10-12",
    time: "11:30:00",
    transactionId: "TXN-2025-004-004",
    amount: 5000,
    currency: "TZS",
    paymentType: "ADD_ON" as const,
    paymentMethod: "Mobile Money" as const,
    reference: "RCP-2025-004-004",
    status: "Completed" as const,
    description: "Premium Movies Pack Add-on"
  },
  {
    id: 5,
    customerId: "CUST001",
    date: "2025-10-15",
    time: "16:45:00",
    transactionId: "TXN-2025-004-005",
    amount: 12000,
    currency: "TZS",
    paymentType: "PLAN_CHANGE" as const,
    paymentMethod: "Wallet" as const,
    reference: "RCP-2025-004-005",
    status: "Completed" as const,
    description: "Plan upgrade from Lite to Play"
  }
];

// Mock service actions history
export const mockServiceActions = [
  {
    id: 1,
    customerId: "CUST001",
    date: "2025-04-24",
    time: "14:00:00",
    serviceType: "Subscription Purchase",
    actionType: "Subscription Purchase",
    smartCard: "SC123456789",
    action: "Purchase Subscription",
    details: "Azam Play 1 Month - TZS 22,420",
    status: "Completed",
    agent: "Sarah Johnson",
    remarks: "Successfully processed new subscription",
    performedBy: "Agent: Sarah Johnson"
  },
  {
    id: 2,
    customerId: "CUST001",
    date: "2025-04-20",
    time: "09:15:00",
    serviceType: "Subscription Renewal",
    actionType: "Subscription Renewal",
    smartCard: "SC123456789",
    action: "Renew Subscription",
    details: "Auto renewal - Azam Play 1 Month",
    status: "Completed",
    agent: "Auto Renewal System",
    remarks: "Automatic subscription renewal processed",
    performedBy: "System: Auto Renewal"
  },
  {
    id: 3,
    customerId: "CUST001",
    date: "2025-04-18",
    time: "16:30:00",
    serviceType: "Add Add-ON Pack",
    actionType: "Add Add-ON Pack",
    smartCard: "SC123456789",
    action: "Add Sports Pack",
    details: "Sports Ultimate Pack - TZS 8,000",
    status: "Active",
    agent: "John Mwangi",
    remarks: "Sports add-on pack successfully activated",
    performedBy: "Agent: John Mwangi"
  },
  {
    id: 4,
    customerId: "CUST001",
    date: "2025-04-15",
    time: "11:45:00",
    serviceType: "Plan Change",
    actionType: "Plan Change",
    smartCard: "SC123456789",
    action: "Upgrade Plan",
    details: "Upgraded from Lite to Play package",
    status: "Applied",
    agent: "Mary Kilimo",
    remarks: "Plan upgrade from Lite to Play successfully applied",
    performedBy: "Agent: Mary Kilimo"
  },
  {
    id: 5,
    customerId: "CUST001",
    date: "2025-04-10",
    time: "13:20:00",
    serviceType: "Offer Change",
    actionType: "Offer Change",
    smartCard: "SC123456789",
    action: "Apply Promotion",
    details: "Special promotion applied - 20% discount",
    status: "Active",
    agent: "David Nyong",
    remarks: "Special 20% discount promotion successfully applied",
    performedBy: "Agent: David Nyong"
  },
  {
    id: 6,
    customerId: "CUST001",
    date: "2025-04-05",
    time: "10:00:00",
    serviceType: "Suspension",
    actionType: "Suspension",
    smartCard: "SC123456789",
    action: "Suspend Service",
    details: "Temporary suspension - Non-payment",
    status: "Resolved",
    agent: "Auto Suspend System",
    remarks: "Service suspended due to non-payment, later resolved",
    performedBy: "System: Auto Suspend"
  },
  {
    id: 7,
    customerId: "CUST001",
    date: "2025-04-06",
    time: "14:30:00",
    serviceType: "Reconnection",
    actionType: "Reconnection",
    smartCard: "SC123456789",
    action: "Reconnect Service",
    details: "Service reconnected after payment",
    status: "Completed",
    agent: "Grace Mushi",
    remarks: "Service successfully reconnected",
    performedBy: "Agent: Grace Mushi"
  }
];

// Mock invoices data
export const mockInvoices = [
  {
    id: 1,
    customerId: "CUST001",
    invoiceNumber: "INV-2025-001245",
    date: "2025-10-10",
    description: "Azam Play 1 Month Subscription",
    amount: 22420,
    currency: "TZS",
    status: "Paid",
    paymentMethod: "Wallet"
  },
  {
    id: 2,
    customerId: "CUST001",
    invoiceNumber: "INV-2025-001230",
    date: "2025-10-12",
    description: "Sports Ultimate Pack Add-on",
    amount: 8000,
    currency: "TZS",
    status: "Paid",
    paymentMethod: "Mobile Money"
  },
  {
    id: 3,
    customerId: "CUST001",
    invoiceNumber: "INV-2025-001215",
    date: "2025-10-13",
    description: "Premium Movies Pack Add-on",
    amount: 5000,
    currency: "TZS",
    status: "Paid",
    paymentMethod: "Wallet"
  },
  {
    id: 4,
    customerId: "CUST001",
    invoiceNumber: "INV-2025-001200",
    date: "2025-10-15",
    description: "Plan Change - Lite to Play Upgrade",
    amount: 12000,
    currency: "TZS",
    status: "Paid",
    paymentMethod: "Wallet"
  },
  {
    id: 5,
    customerId: "CUST001",
    invoiceNumber: "INV-2025-001185",
    date: "2025-10-10",
    description: "Promotional Discount Applied",
    amount: -4400,
    currency: "TZS",
    status: "Applied",
    paymentMethod: "Credit"
  }
];

// Mock subscription plans
export const subscriptionPlans = [
  { id: "AZ001", name: "Azam Lite 1 Month", price: 15000, type: "basic", channels: 50 },
  { id: "AZ002", name: "Azam Play 1 Month", price: 25000, type: "premium", channels: 120 },
  { id: "AZ003", name: "Azam Premium 3 Months", price: 65000, type: "premium", channels: 150 },
  { id: "AZ004", name: "Azam Family 2 Months", price: 45000, type: "family", channels: 80 },
];

// Comprehensive customer subscriptions for the All Subscription table
export const mockCustomerSubscriptions = [
  {
    id: 1,
    customerId: "CUST001",
    smartCardNumber: "9876543210123456",
    plan: "Azam Play 1 Month",
    planType: "DTH",
    billingType: "Prepaid",
    amount: 25000,
    startDate: "2025-08-10",
    endDate: "2025-09-10",
    status: "Active",
    autoRenewal: true,
    renewalMode: "Auto-Renewal",
    paymentMode: "Mobile Money",
    invoiceNumber: "INV-2025-001245",
    addOns: [
      { name: "Sports HD", status: "Active" },
      { name: "Kids Pack", status: "Active" }
    ],
    nextRenewalDate: "2025-09-10",
    renewalTime: "17:00, 19:00, 22:00"
  },
  {
    id: 2,
    customerId: "CUST001",
    smartCardNumber: "8765432109876543",
    plan: "Azam Sports Pack",
    planType: "Add-On",
    billingType: "Postpaid",
    amount: 8000,
    startDate: "2025-05-15",
    endDate: "2025-06-15",
    status: "Completed",
    autoRenewal: false,
    renewalMode: "Manual",
    paymentMode: "Wallet",
    invoiceNumber: "INV-2025-001230",
    addOns: [],
    nextRenewalDate: null,
    renewalTime: ""
  },
  {
    id: 3,
    customerId: "CUST001",
    smartCardNumber: "7654321098765432",
    plan: "Azam DTH Streaming",
    planType: "DTH",
    billingType: "Usage-Based",
    amount: 12000,
    startDate: "2025-04-15",
    endDate: "2025-05-15",
    status: "Completed",
    autoRenewal: true,
    renewalMode: "Auto-Renewal",
    paymentMode: "Cash",
    invoiceNumber: "INV-2025-001100",
    addOns: [
      { name: "Premium Movies", status: "Expired" }
    ],
    nextRenewalDate: null,
    renewalTime: ""
  }
];
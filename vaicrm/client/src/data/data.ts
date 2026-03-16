// This file centralizes all mock data for the subscriber view.

export const availablePlansEnhanced = [
  { id: "AZ001", name: "Azam Lite 1 Month", price: 12000, duration: "1 month", channels: 40, type: "Basic" },
  { id: "AZ002", name: "Azam Play 1 Month", price: 19000, duration: "1 month", channels: 80, type: "Standard" },
  { id: "AZ003", name: "Azam Premium 1 Month", price: 35000, duration: "1 month", channels: 150, type: "Premium" },
  { id: "AZ004", name: "Azam Plus 1 Month", price: 28000, duration: "1 month", channels: 120, type: "Plus" },
  { id: "AZ005", name: "Azam Pure 1 Month", price: 22000, duration: "1 month", channels: 100, type: "Pure" },
  { id: "AZ011", name: "Azam Lite 3 Month", price: 34000, duration: "3 months", channels: 40, type: "Basic" },
  { id: "AZ012", name: "Azam Play 3 Month", price: 54000, duration: "3 months", channels: 80, type: "Standard" },
];

export const availableAddons = [
  { id: "SPORT001", name: "Sports Ultimate Pack", price: 8000, description: "All premium sports channels", category: "SPORTS" },
  { id: "MOVIE001", name: "Premium Movies Pack", price: 5000, description: "Latest movies and entertainment", category: "MOVIES" },
  { id: "KIDS001", name: "Kids Entertainment", price: 3000, description: "Educational and fun content for children", category: "KIDS" },
  { id: "NEWS001", name: "News Plus Pack", price: 2500, description: "International news channels", category: "NEWS" },
  { id: "MUSIC001", name: "Music Channels Pack", price: 1500, description: "Music and radio channels", category: "MUSIC" },
  { id: "DOC001", name: "Documentary Pack", price: 2000, description: "Educational documentaries", category: "DOCUMENTARY" }
];

export const replacementReasons = [
  { value: "FAULTY", label: "Hardware Fault/Damage" },
  { value: "POWER_FAILURE", label: "Power Failure" },
  { value: "MANUFACTURING_DEFECT", label: "Manufacturing Defect" },
  { value: "CUSTOMER_DAMAGE", label: "Customer Damage" },
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "SIGNAL_ISSUE", label: "Signal Reception Issue" },
  { value: "SOFTWARE_CORRUPTION", label: "Software Corruption" },
  { value: "OTHER", label: "Other" }
];

export const centers = [
  { value: "DAR_CENTRAL", label: "Dar es Salaam Central" },
  { value: "DAR_KINONDONI", label: "Dar es Salaam Kinondoni" },
  { value: "ARUSHA_MAIN", label: "Arusha Main Center" },
  { value: "MWANZA_BRANCH", label: "Mwanza Branch" },
  { value: "DODOMA_CENTER", label: "Dodoma Center" },
  { value: "MBEYA_OUTLET", label: "Mbeya Outlet" }
];

export const terminationReasons = [
  { value: "CUSTOMER_REQUEST", label: "Customer Request" },
  { value: "NON_PAYMENT", label: "Non-Payment" },
  { value: "FRAUD_SUSPECTED", label: "Fraud Suspected" },
  { value: "TECHNICAL_ISSUES", label: "Technical Issues" },
  { value: "POLICY_VIOLATION", label: "Policy Violation" },
  { value: "BUSINESS_CLOSURE", label: "Business Closure" },
  { value: "OTHER", label: "Other" }
];

export const accountsData = {
  "CUST001": {
    customerId: "CUST001",
    accountType: "Primary Account",
    sapBpId: "BP12345",
    sapCaId: "CA67890",
    sapContractId: "CON123456789",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "xxxx712345678",
    smartCardNumber: "SC123456789",
    stbSerialNumber: "STB987654321",
    customerType: "PREPAID" as const,
    accountClass: "RESIDENTIAL" as const,
    connectionDate: "2025-04-15 10:30:00",
    lastPaymentDate: "2025-04-24 14:00:00",
    walletBalance: 15000,
    status: "ACTIVE" as const,
    kycStatus: "Verified",
    kycDate: "15/04/2025",
    kycDocId: "KYC-2024-001234",
    kycApprovedBy: "Sarah Johnson (KYC Manager)",
    currentSubscription: {
      planId: "AZ002",
      planName: "Azam Play 1 Month",
      planType: "PREPAID" as const,
      amount: 19000,
      vatAmount: 3420,
      totalAmount: 22420,
      startDate: "2025-08-10 14:00:00",
      endDate: "2025-09-10 23:59:59",
      status: "ACTIVE" as const,
      autoRenewal: true
    },
    addOns: [],
    hardware: {
      stbModel: "AZAM HD BOX V2",
      stbSerialNumber: "STB987654321",
      smartCardNumber: "SC123456789",
      purchaseDate: "2025-04-15",
      warrantyEndDate: "2025-10-15",
      condition: "WORKING" as const
    },
    address: {
      street: "123 Uhuru Street",
      city: "Dar es Salaam",
      region: "Dar es Salaam",
      country: "Tanzania",
      postalCode: "12345"
    },
    billingAddress: {
      street: "123 Uhuru Street",
      city: "Dar es Salaam",
      region: "Dar es Salaam",
      country: "Tanzania",
      postalCode: "12345"
    },
    installationAddress: {
      street: "1234 Uhuru Street",
      city: "Dar es Salaam",
      region: "Dar es Salaam",
      country: "Tanzania",
      postalCode: "12345"
    },
    divisionType: "DTH"
  },
  // ... Other customer objects would go here
};

export const subscriptionPlans = [
  { id: 'AZ001', name: 'Azam Lite', price: 12000, duration: '1 Month', channels: 40 },
  { id: 'AZ002', name: 'Azam Play', price: 19000, duration: '1 Month', channels: 80 },
];

export const disconnectionReasons = [
  { id: "insufficient-balance", name: "Insufficient Balance", description: "Customer has insufficient wallet balance for renewal", category: "PAYMENT" },
  { id: "hardware-issues", name: "Hardware Issues", description: "Customer reported hardware or technical problems", category: "TECHNICAL" },
  { id: "customer-request", name: "Customer Request", description: "Customer requested service disconnection", category: "VOLUNTARY" },
  { id: "violation", name: "Service Violation", description: "Customer violated terms of service", category: "POLICY" },
  { id: "maintenance", name: "System Maintenance", description: "Temporary disconnection for system maintenance", category: "MAINTENANCE" }
];

export const mockLedgerData = [
  { id: 1, date: "2025-10-15", type: "Payment", description: "Subscription Payment - Azam Premium", debit: 0, credit: 35000, balance: 35000, reference: "REF-250815-001" },
  { id: 2, date: "2025-10-10", type: "Charge", description: "Monthly Subscription Charge", debit: 35000, credit: 0, balance: 0, reference: "CHG-250810-001" },
  { id: 3, date: "2025-10-12", type: "Payment", description: "Mobile Money Payment", debit: 0, credit: 70000, balance: 35000, reference: "MM-250725-001" },
  { id: 4, date: "2025-09-10", type: "Adjustment", description: "Credit Adjustment - Promo Bonus", debit: 0, credit: 10000, balance: -35000, reference: "ADJ-250710-001" },
  { id: 5, date: "2025-09-20", type: "Charge", description: "Monthly Subscription Charge", debit: 35000, credit: 0, balance: -45000, reference: "CHG-250620-001" },
  { id: 6, date: "2025-10-05", type: "Payment", description: "Agent Payment - STB Sale", debit: 0, credit: 125000, balance: -10000, reference: "PAY-250605-001" },
  { id: 7, date: "2025-10-16", type: "Charge", description: "Hardware Purchase Charge", debit: 85000, credit: 0, balance: -135000, reference: "CHG-250520-001" },
  { id: 8, date: "2025-09-05", type: "Payment", description: "Bulk Payment", debit: 0, credit: 200000, balance: -50000, reference: "PAY-250505-001" },
  { id: 9, date: "2025-09-18", type: "Adjustment", description: "Service Credit - Downtime", debit: 0, credit: 15000, balance: -250000, reference: "ADJ-250425-001" },
  { id: 10, date: "2025-09-20", type: "Charge", description: "Premium Add-on Charge", debit: 8000, credit: 0, balance: -265000, reference: "CHG-250420-001" },
  { id: 11, date: "2025-08-17", type: "Payment", description: "Customer Top-up", debit: 0, credit: 50000, balance: -257000, reference: "PAY-250418-001" },
  { id: 12, date: "2025-09-15", type: "Charge", description: "Late Payment Fee", debit: 5000, credit: 0, balance: -307000, reference: "CHG-250415-001" }
];

export const planChangeWorkflowSteps = [
  { id: 1, name: "Customer Validation", description: "Verify customer details and current subscription", status: "completed" },
  { id: 2, name: "Buffer Period Check", description: "Validate if change is within buffer period", status: "completed" },
  { id: 3, name: "Balance Calculation", description: "Calculate required payments and refunds", status: "completed" },
  { id: 4, name: "Invoice Processing", description: "Cancel previous invoice if within buffer period", status: "processing" },
  { id: 5, name: "Wallet Transaction", description: "Process wallet deduction/credit", status: "pending" },
  { id: 6, name: "SOM Change Order", description: "Submit change order to SAP SOM", status: "pending" },
  { id: 7, name: "NAGRA Provisioning", description: "Disconnect old plan and activate new plan", status: "pending" },
  { id: 8, name: "Contract Replication", description: "Update contract in SAP CC", status: "pending" },
  { id: 9, name: "Billing Generation", description: "Generate billing and invoices in SAP CI", status: "pending" },
  { id: 10, name: "Financial Posting", description: "Post invoice in SAP FICA", status: "pending" },
];

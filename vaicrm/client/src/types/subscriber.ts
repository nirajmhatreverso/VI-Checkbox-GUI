// Types for subscriber view components

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smartCardNumber?: string;
  stbSerialNumber?: string;
  customerType: string;
  accountClass: string;
  walletBalance?: number;
  address?: {
    city: string;
    region: string;
  };
}

export interface Subscription {
  id: number;
  customerId: number;
  smartCardNumber: string;
  plan: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface PaymentTransaction {
  id: number;
  customerId: string;
  date: string;
  time: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentType: string;
  paymentMethod: string;
  reference: string;
  status: string;
  description: string;
}

export interface ServiceAction {
  id: number;
  customerId: string;
  date: string;
  time: string;
  serviceType: string;
  actionType: string;
  smartCard: string;
  action: string;
  details: string;
  status: string;
  agent: string;
  remarks: string;
  performedBy: string;
}

export interface Ticket {
  id: number;
  customerId: string;
  date: string;
  time: string;
  ticketId: string;
  type: string;
  priority: string;
  status: string;
  agent: string;
  description: string;
  resolution: string;
}

export interface Invoice {
  id: number;
  customerId: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
}

export interface AutoRenewalSettings {
  enabled?: boolean;
  nextRenewalDate?: string;
  amount?: number;
}

export interface QuickActionProps {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  color?: string;
  count?: number;
  disabled?: boolean;
}
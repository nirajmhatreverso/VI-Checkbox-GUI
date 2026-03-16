// === SHARED TYPE DEFINITIONS ===
// Common types used across the application

export type UserRoleType = typeof import('./schema').UserRole[keyof typeof import('./schema').UserRole];
export type AgentTypeType = typeof import('./schema').AgentType[keyof typeof import('./schema').AgentType];
export type CustomerTypeType = typeof import('./schema').CustomerType[keyof typeof import('./schema').CustomerType];
export type InventoryStatusType = typeof import('./schema').InventoryStatus[keyof typeof import('./schema').InventoryStatus];
export type PaymentStatusType = typeof import('./schema').PaymentStatus[keyof typeof import('./schema').PaymentStatus];
export type SubscriptionStatusType = typeof import('./schema').SubscriptionStatus[keyof typeof import('./schema').SubscriptionStatus];

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common Entity Attributes
export interface BaseEntity {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditableEntity extends BaseEntity {
  createId: string;
  createDt?: Date;
  createTs?: Date;
  updateId?: string;
  updateDt?: Date;
  updateTs?: Date;
}

// Form State Types
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// Navigation Types
export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  category?: string;
  children?: NavigationItem[];
  roles?: UserRoleType[];
}

// Filter and Search Types
export interface FilterOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Component Props Types
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
}
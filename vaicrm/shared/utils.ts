// === SHARED UTILITY FUNCTIONS ===
// Common utility functions used across frontend and backend

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// === CSS UTILITIES ===
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// === DATE UTILITIES ===
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) return 'Invalid Date';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'long':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    case 'time':
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return d.toLocaleDateString();
  }
};

export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const calculateDateRange = (startDate: Date, durationDays: number): { startDate: Date; endDate: Date } => {
  return {
    startDate,
    endDate: addDays(startDate, durationDays)
  };
};

// === NUMBER UTILITIES ===
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const calculateVAT = (amount: number, vatRate: number = 0.18): number => {
  return parseFloat((amount * vatRate).toFixed(2));
};

export const calculateTotal = (amount: number, vatRate: number = 0.18): number => {
  return parseFloat((amount + calculateVAT(amount, vatRate)).toFixed(2));
};

// === STRING UTILITIES ===
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${timestamp}_${random}`;
};

export const truncateString = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

export const extractInitials = (firstName: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
};

// === VALIDATION UTILITIES ===
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateTIN = (tin: string): boolean => {
  // Basic TIN validation - adjust regex based on country requirements
  const tinRegex = /^\d{9}$/;
  return tinRegex.test(tin);
};

// === ARRAY UTILITIES ===
export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortByKey = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// === OBJECT UTILITIES ===
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// === BROWSER UTILITIES ===
export const downloadJSON = (data: any, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  }
};

// === API UTILITIES ===
export const buildQueryString = (params: Record<string, any>): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(key, String(v)));
      } else {
        query.append(key, String(value));
      }
    }
  });

  return query.toString();
};

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};

// === STATUS UTILITIES ===
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    active: 'text-green-600 bg-green-100',
    pending: 'text-yellow-600 bg-yellow-100',
    completed: 'text-blue-600 bg-blue-100',
    cancelled: 'text-red-600 bg-red-100',
    suspended: 'text-orange-600 bg-orange-100',
    expired: 'text-gray-600 bg-gray-100',
    failed: 'text-red-600 bg-red-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
    error: 'text-red-600 bg-red-100'
  };

  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-100';
};

export const getStatusIcon = (status: string): string => {
  const statusIcons: Record<string, string> = {
    active: 'CheckCircle',
    pending: 'Clock',
    completed: 'CheckCircle2',
    cancelled: 'XCircle',
    suspended: 'PauseCircle',
    expired: 'AlertCircle',
    failed: 'XCircle',
    success: 'CheckCircle',
    warning: 'AlertTriangle',
    info: 'Info',
    error: 'AlertCircle'
  };

  return statusIcons[status.toLowerCase()] || 'Circle';
};

export function trimAllStrings<T extends Record<string, any>>(obj: T): T {
  const trimmed: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      trimmed[key] = obj[key].trim();
    } else {
      trimmed[key] = obj[key];
    }
  }
  return trimmed as T;
}

// === VALIDATION HELPERS ===

export function isSingleDigitRepeat(s?: string) {
  if (!s) return false;
  return /^(\d)\1+$/.test(s);
}

export function isAlternatingTwoDigits(s?: string) {
  if (!s || s.length < 4) return false; // require some length to be meaningful
  const a = s[0], b = s[1];
  if (a === b) return false;
  for (let i = 0; i < s.length; i++) {
    if (i % 2 === 0 && s[i] !== a) return false;
    if (i % 2 === 1 && s[i] !== b) return false;
  }
  return true;
}

// detect if the phone consists largely of a short repeating pattern (allowing a small prefix)
export function isShortSubstringRepeatWithPrefix(s?: string, maxPatternLen = 3) {
  if (!s || s.length < 4) return false;
  const str = s;
  for (let k = 1; k <= maxPatternLen; k++) {
    for (let offset = 0; offset < k; offset++) {
      const sub = str.slice(offset, offset + k);
      if (!sub) continue;
      const repeated = sub.repeat(Math.ceil((str.length - offset) / k)).slice(0, str.length - offset);
      if (str.slice(offset) === repeated) return true;
    }
  }
  return false;
}

export function isInvalidPhonePattern(s?: string) {
  if (!s) return false;
  const digitsOnly = s.replace(/\D/g, "");
  if (digitsOnly.length < 4) return false;
  if (isSingleDigitRepeat(digitsOnly)) return true;
  if (isAlternatingTwoDigits(digitsOnly)) return true;
  if (isShortSubstringRepeatWithPrefix(digitsOnly, 3)) return true;
  return false;
}

export function isLowEntropyString(s?: string) {
  if (!s || s.length < 4) return false;
  const str = s.toString().toLowerCase();
  // Check if mostly single character repeats
  if (isSingleDigitRepeat(str)) return true;
  // Check if alternating two characters
  if (isAlternatingTwoDigits(str)) return true;
  // Check if short repeating pattern
  if (isShortSubstringRepeatWithPrefix(str, 3)) return true;
  return false;
}

// === API CONFIGURATION ===
// Centralized configuration for API base URLs and endpoints

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  StaggingUrl:string;
  productionUrl:string;
  LocalUrl:string;
}

// Environment-based configuration
const getEnvironmentConfig = (): ApiConfig => {
  const appBase = import.meta.env.BASE_URL || '/';
  // Remove trailing slash (e.g., "/dev/" becomes "/dev")
  const cleanBase = appBase.endsWith('/') ? appBase.slice(0, -1) : appBase;
  // Check for environment variables first
  // const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  // const envTimeout = import.meta.env.VITE_API_TIMEOUT;
  // const envRetries = import.meta.env.VITE_API_RETRIES;

  // const StaggingUrl = import.meta.env.VITE_STAGGING_URL;
  // const productionUrl = import.meta.env.VITE_PRODUCTION_URL;
  //  const LocalUrl = import.meta.env.VITE_LOCAL_URL;

  // Default configuration
  const defaultConfig: ApiConfig = {
    baseUrl: '/api',
    timeout: 30000, // 30 seconds
    retries: 3,
    StaggingUrl:'',
    productionUrl:'',
    LocalUrl:''
  };

  // Override with environment variables if provided
  return defaultConfig;  
};

// Global API configuration
let currentConfig: ApiConfig = getEnvironmentConfig();

// Configuration management functions
export const getApiConfig = (): ApiConfig => {
  return { ...currentConfig };
};

export const setApiConfig = (newConfig: Partial<ApiConfig>): void => {
  currentConfig = { ...currentConfig, ...newConfig };
  
  // Trigger a custom event to notify components of config change
  window.dispatchEvent(new CustomEvent('apiConfigChanged', { 
    detail: currentConfig 
  }));
};

export const resetApiConfig = (): void => {
  currentConfig = getEnvironmentConfig();
  window.dispatchEvent(new CustomEvent('apiConfigChanged', { 
    detail: currentConfig 
  }));
};

// Utility to build full API URLs
export const buildApiUrl = (endpoint: string, baseUrl?: string): string => {
  const config = getApiConfig();
  // The default baseUrl should be '/api'
  const base = baseUrl || config.baseUrl;
  
  // If the endpoint is already a full URL (for external services), let it pass.
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // For all BFF calls, simply combine the relative paths.
  // This ensures the browser makes a same-origin request.
  // Example: base = '/api', endpoint = '/auth/login' -> returns '/api/auth/login'
  const finalPath = `${base.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  return finalPath;
};

// Predefined configurations for different environments
export const API_CONFIGS = {
  development: {
    baseUrl: '/api',
    timeout: 30000,
    retries: 3
  },
  staging: {
    baseUrl: currentConfig.StaggingUrl,
    timeout: 30000,
    retries: 3
  },
  production: {
    baseUrl: currentConfig.productionUrl,
    timeout: 20000,
    retries: 2
  },
  local: {
    baseUrl: currentConfig.LocalUrl,
    timeout: 30000,
    retries: 3
  }
} as const;

export type Environment = keyof typeof API_CONFIGS;

// Quick environment switcher
export const setEnvironment = (env: Environment): void => {
  setApiConfig(API_CONFIGS[env]);
};

// Export the current configuration
export { currentConfig as apiConfig };

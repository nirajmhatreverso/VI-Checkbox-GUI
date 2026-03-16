import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching inventory data with proper typing and error handling
 */
export const useInventoryData = () => {
  return useQuery({
    queryKey: ['/api/inventory'],
    select: (data: any) => {
      // Handle the API response format {success: true, data: [...]}
      if (data?.success && Array.isArray(data.data)) {
        return data.data;
      }
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Custom hook for fetching inventory requests
 */
export const useInventoryRequests = () => {
  return useQuery({
    queryKey: ['/api/inventory-requests'],
    select: (data: any) => {
      // Handle the API response format {success: true, data: [...]}
      if (data?.success && Array.isArray(data.data)) {
        return data.data;
      }
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Custom hook for fetching dashboard statistics
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 5 * 60 * 1000,
  });
};
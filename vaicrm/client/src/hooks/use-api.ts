// === API HOOK ===
// Reusable hook for API calls with React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Generic GET hook
export function useApiQuery<T = any>(
  endpoint: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  return useQuery<T>({
    queryKey: [endpoint],
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
    gcTime: options?.cacheTime,
  });
}

// Generic POST/PUT/PATCH/DELETE hook
export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[];
    showToast?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) =>
      apiRequest(
        endpoint,
        method,
        method === 'DELETE' ? undefined : variables, // ✅ pass as body
      ),
    onSuccess: (data) => {
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      if (options?.showToast !== false) {
        toast({
          title: 'Success',
          description: `Operation completed successfully`,
        });
      }

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast({
          title: 'Error',
          description: error.message || 'An error occurred',
          variant: 'destructive',
        });
      }
      options?.onError?.(error);
    },
  });
}

// Specific hooks for common patterns
export function useAgents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  region?: string;
}) {
  const queryString = params ? new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';

  return useApiQuery(`/api/agents${queryString ? `?${queryString}` : ''}`);
}

export function useAgent(id: string | number) {
  return useApiQuery(`/api/agents/${id}`, {
    enabled: !!id,
  });
}

export function useCreateAgent() {
  return useApiMutation('/api/agents', 'POST', {
    invalidateQueries: ['/api/agents'],
  });
}

export function useUpdateAgent(id: string | number) {
  return useApiMutation(`/api/agents/${id}`, 'PUT', {
    invalidateQueries: ['/api/agents', `/api/agents/${id}`],
  });
}

export function useDeleteAgent() {
  return useApiMutation('/api/agents', 'DELETE', {
    invalidateQueries: ['/api/agents'],
  });
}

export function useDashboardStats() {
  return useApiQuery('/api/dashboard/stats', {
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });
}

export function useDashboardActivities(limit = 10) {
  return useApiQuery(`/api/dashboard/activities?limit=${limit}`, {
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useSystemStatus() {
  return useApiQuery('/api/dashboard/system-status', {
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
// client/src/hooks/use-inventory-data.ts

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// A normalized type for the serial number details table for consistency
export type SerialDetail = {
  matId: string;
  name: string;
  placeId: string;
  manufacturer: string;
  manufacturerSrNo: string;
  plant: string;
  sloc: string;
};

export const usePlants = () => {
  return useQuery({
        queryKey: ["inventory", "plants"],
        queryFn: () => apiRequest('/inventory/plants'),
        // Change: Return raw plantDetails array matching your JSON structure
        select: (data: any) => data?.data?.plantDetails || [],
        staleTime: 1000 * 60 * 60, 
    });
};

export const useStoreLocations = (plant?: string) => {
   return useQuery({
        queryKey: ["inventory", "storeLocations", plant],
        // Using POST as per previous controller update
        queryFn: () => apiRequest('/inventory/store-locations', 'POST', { plantId: plant }),
        select: (data: any) => {
            const raw = data?.data?.storageDetails || [];
            if (!Array.isArray(raw)) return [];

            // Deduplicate based on 'StorageLocation'
            const uniqueMap = new Map();
            raw.forEach((s: any) => {
                if (s.StorageLocation && !uniqueMap.has(s.StorageLocation)) {
                    uniqueMap.set(s.StorageLocation, {
                        code: s.StorageLocation,
                        name: s.StorageLocationName || s.StorageLocation
                    });
                }
            });
            return Array.from(uniqueMap.values());
        },
        enabled: !!plant,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};

export const useHwProducts = () => {
  return useQuery({
    queryKey: ["inventory", "hwProducts"],
    queryFn: () => apiRequest('/inventory/hw-products', 'POST', { type: "AGENT" }),
    // Change: Return raw array. Do NOT deduplicate here. 
    // The Form component needs 'productPriceType' to filter correctly.
    select: (data: any) => data?.data?.hwProductDetails || [],
    staleTime: 1000 * 60 * 60,
  });
};

interface StockDetailsParams {
    plant?: string;
    material?: string;
    storageLocation?: string;
}

export const useStockDetails = (params: StockDetailsParams) => {
    const { plant, material, storageLocation } = params;
    return useQuery({
        queryKey: ["stockDetails", plant, material, storageLocation],
        // Use POST to match the controller and send a body
        queryFn: () => apiRequest('/inventory/stock-details', 'POST', {
            plant: plant || '',
            material: material || '',
            storageLocation: storageLocation || ''
        }),
        select: (data: any) => data?.data?.stockOverview || [],
        enabled: !!plant && !!material, // Query only runs when required params are present
    });
};

export function useStockDetailsMutation() {
  return useMutation({
    mutationFn: (payload: { plant: string; material: string; storageLocation?: string }) => 
      apiRequest("/inventory/stock-details", "POST", payload),
  });
}

export const useStockHistory = (filters: any) => {
  return useQuery({
    queryKey: ["inventory", "history", filters],
    queryFn: () => apiRequest('/inventory/history', 'POST', filters),
    select: (data: any) => data?.data?.stockDetails || [],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
/**
 * A mutation hook to fetch serial number details on demand.
 */
export const useStockSerialDetailsMutation = () => {
  return useMutation({
    // --- FIX: The mutation function is now async to handle data transformation ---
    mutationFn: async (payload: {
      itemId: string;
      plant?: string;
      material?: string;
      storageLocation?: string;
    }): Promise<SerialDetail[]> => { // Return a promise of the correct type
      
      // 1. Fetch the raw data
      const data = await apiRequest('/inventory/stock-serial-details', 'POST', payload);

      // 2. Transform the data inside the function
      const rawList = data?.data?.stockSerialNoOverview || [];
      if (!Array.isArray(rawList)) return [];

      // 3. Return the clean, transformed data
      return rawList.map((raw: any) => ({
        matId: raw?.id ?? "N/A",
        name: raw?.name ?? "N/A",
        placeId: raw?.place?.id ?? "N/A",
        manufacturer: raw?.relatedParty?.manufacturer ?? "—",
        manufacturerSrNo: raw?.relatedParty?.manufacturerSrNo ?? "—",
        plant: raw?.place?.plant ?? "N/A",
        sloc: raw?.place?.sloc ?? "N/A",
      }));
    },
    // --- FIX: The 'select' option is removed as it's not valid for useMutation ---
  });
};

export function useTransferCountries() {
  return useQuery({
    queryKey: ["inventory", "transfer-countries"],
    queryFn: async () => {
      const res = await apiRequest("/inventory/transfer-countries", "POST");
      // Handle nested data structure if present, or flat list
      const list = res?.data?.data || res?.data || [];
      
      // Deduplicate countries
      const uniqueMap = new Map();
      if (Array.isArray(list)) {
          list.forEach((c: any) => {
              const name = c.country;
              if (name && !uniqueMap.has(name)) {
                  uniqueMap.set(name, c);
              }
          });
      }
      return Array.from(uniqueMap.values());
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useStockRequestMutation() {
  return useMutation({
    mutationFn: (payload: any) => apiRequest("/inventory/initiate-request", "POST", payload),
  });
}
export function useStockTransferMutation() {
  return useMutation({
    mutationFn: (payload: any) => apiRequest("/inventory/initiate-transfer", "POST", payload),
  });
}

export const useStoreLocationsByPlant = (plantId?: string) => {
   return useQuery({
        queryKey: ["inventory", "storeLocationsByPlant", plantId],
        queryFn: () => apiRequest(`/inventory/store-locations-by-plant/${plantId}`, 'GET'),
        select: (data: any) => {
            const raw = data?.data?.storageDetails || [];
            if (!Array.isArray(raw)) return [];

            const uniqueMap = new Map();
            raw.forEach((s: any) => {
                if (s.StorageLocation && !uniqueMap.has(s.StorageLocation)) {
                    uniqueMap.set(s.StorageLocation, {
                        code: s.StorageLocation,
                        name: s.StorageLocationName || s.StorageLocation
                    });
                }
            });
            return Array.from(uniqueMap.values());
        },
        enabled: !!plantId,
        staleTime: 1000 * 60 * 30,
    });
};

export function useWarehouseTransferMutation() {
  return useMutation({
    mutationFn: (payload: any) => apiRequest("/inventory/initiate-warehouse-transfer", "POST", payload),
  });
}
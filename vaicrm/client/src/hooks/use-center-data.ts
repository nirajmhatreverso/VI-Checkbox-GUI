// client/src/hooks/use-center-data.ts

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";

interface CenterAPIParams {
  distinctType: "country" | "region" | "city" | "district" | "ward";
  country?: string;
  region?: string;
  city?: string;
  district?: string;
}

// This helper function now correctly makes a POST request to the BFF
const fetchCenterData = async (params: CenterAPIParams) => {
  // Body for the API request
  const body = {
    distinctType: params.distinctType,
    status: "ACTIVE",
    country: params.country || null,
    region: params.region || null,
    city: params.city || null,
    district: params.district || null,
    centerId: null,
    countryId: null,
    countryCode: null,
    zone: null,
    ward: null,
  };

  try {
    const result = await apiRequest('/data/center', 'POST', body);



    if (result.status !== "SUCCESS") {
      throw new Error(result.statusMessage || `Failed to fetch ${params.distinctType}`);
    }

    if (!result.data || !Array.isArray(result.data.data)) {

      return [];
    }

    // This correctly extracts the nested data array
    return result.data.data;

  } catch (error) {

    throw error;
  }
};

// --- HOOKS ---

export const useCountries = () => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ['countries'],
    // CHANGED: Now uses the standardized fetchCenterData helper with the correct body.
    queryFn: () => fetchCenterData({ distinctType: "country" }),
    enabled: !!user,
    staleTime: Infinity // Country data rarely changes
  });
};

export const useRegions = (country?: string) => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["center-data", "regions", country],
    queryFn: () => fetchCenterData({ distinctType: "region", country }),
    enabled: !!user && !!country,
    staleTime: 1000 * 60 * 60,
  });
};

interface City {
  cityCode: string;
  city: string;
}

export const useCities = (country?: string, region?: string) => {
  const { user } = useAuthContext();
  return useQuery<City[]>({
    queryKey: ["center-data", "cities", country, region],
    queryFn: () => fetchCenterData({ distinctType: "city", country, region }),
    enabled: !!user && !!country && !!region,
    staleTime: 1000 * 60 * 60,
  });
};

export const useDistricts = (country?: string, region?: string, city?: string) => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["center-data", "districts", country, region, city],
    queryFn: () => fetchCenterData({ distinctType: "district", country, region, city }),
    enabled: !!user && !!country && !!region && !!city,
    staleTime: 1000 * 60 * 60,
  });
};

export const useWards = (country?: string, region?: string, city?: string, district?: string) => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["center-data", "wards", country, region, city, district],
    queryFn: () => fetchCenterData({ distinctType: "ward", country, region, city, district }),
    enabled: !!user && !!country && !!region && !!city && !!district,
    staleTime: 1000 * 60 * 60,
  });
};
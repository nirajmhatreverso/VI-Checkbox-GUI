import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { apiRequest } from "@/lib/queryClient";

export interface CurrencyData {
  currencyID: number;
  currencyName: string;
  currencySym: string;
  currencyCode: string;
  countryCode: string;
  countryName: string;
}

// 1. Change the return type to an Array of CurrencyData
export const useCurrencyByCountry = (countryName?: string) => {
  const { user } = useAuthContext();

  return useQuery<CurrencyData[]>({
    queryKey: ["currency", countryName],
    queryFn: async () => {
      if (!countryName) return [];

      const body = {
        countryName,
        status: "",
        currencyCode: ""
      };
      
      const result = await apiRequest('/data/currency', 'POST', body);

      if (result.status !== "SUCCESS") {
        throw new Error(result.statusMessage || 'Failed to fetch currency');
      }
      
      // 2. CRITICAL CHANGE: Return the whole array.
      // Do NOT use [0] here.
      return result.data?.data ?? []; 
    },
    enabled: !!user && !!countryName,
    staleTime: 1000 * 60 * 60, // cache for 1 hour
  });
};
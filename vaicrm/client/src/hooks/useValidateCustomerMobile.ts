// src/hooks/useValidateCustomerMobile.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { validateCustomerMobile, ValidateCustomerResponse } from "@/lib/api-customer-validate";
import { useDebouncedValue } from "./useDebouncedValue";
import { apiRequest } from "@/lib/queryClient";

const MIN_MOBILE_LEN = 10; // adjust if your format differs

export function normalizeMobile(raw: string | undefined | null) {
  if (!raw) return "";
  // Remove non-digits; adjust if you need to retain '+' or country code logic
  return raw.replace(/\D/g, "");
}

export function useValidateCustomerMobile(rawMobile: string | undefined | null) {
  const { user } = useAuthContext();
  const cleaned = normalizeMobile(rawMobile);
  const debouncedMobile = useDebouncedValue(cleaned, 500);

  const query = useQuery({
    queryKey: ["validateCustomerMobile", debouncedMobile],
    enabled: debouncedMobile.length >= MIN_MOBILE_LEN,
    retry: (failureCount, error: any) => {
      if (error?.statusCode >= 400 && error?.statusCode < 500) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // ✅ FIX: Use apiRequest to call the BFF endpoint
      return apiRequest('/customers/validate-mobile', 'POST', { mobile: debouncedMobile });
    },
  });

  return { ...query, data: query.data as any, debouncedMobile };
}
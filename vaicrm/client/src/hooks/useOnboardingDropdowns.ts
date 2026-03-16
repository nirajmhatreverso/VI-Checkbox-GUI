// src/hooks/useOnboardingDropdowns.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/context/AuthProvider";
import { getApiConfig } from "@/lib/config";
import { apiRequest } from "@/lib/queryClient";
import { onboardingApi } from "@/lib/api-client";

export interface OnboardingDropdowns {
  accountClass: { name: string; value: string }[];
  division: { name: string; value: string }[];
  salesOrg: { name: string; value: string; country: string }[];
  customerType: { name: string; value: string }[];
  agentType: { name: string; value: string }[];
  salutationType: { name: string; value: string }[];
  customerStatus: { name: string; value: string }[];
  genderType: { name: string; value: string }[];
  approvalReason: { name: string; value: string }[];
  rejectReason: { name: string; value: string }[];

}

export const useOnboardingDropdowns = () => {
  const { user } = useAuthContext();
  const { baseUrl } = getApiConfig();

  return useQuery<OnboardingDropdowns>({
    queryKey: ["onboarding-dropdowns"],
    queryFn: async () => {
      // The fetch call is now extremely simple and secure
      const result = await onboardingApi.getDropdowns();


      if (result.status !== "SUCCESS") {
        throw new Error(result.statusMessage || 'Failed to fetch dropdowns');
      }
      return result.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // cache for 1 hour
  });
};
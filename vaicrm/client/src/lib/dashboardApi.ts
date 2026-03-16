
import { apiRequest } from './queryClient';
import { User } from '@/context/AuthProvider';

export const dashboardApi = {
    getSubscriptionCount: async (user: User) => {
        let role = "Agent";
        if (user?.isOtc === "Y") role = "Agent";
        else if (user?.isMainPlant === "Y") role = "ALL";
        else if (user?.isEmployee === "Y") role = "ALL";
        else if (user?.allAccess === "Y") role = "ALL";
        else if (user?.checkerAccess === "Y") role = "ALL";

        // Fallback for missing fields to ensure request goes through
        const payload = {
            salesOrg: user?.salesOrg || "",
            role,
            bp: user?.sapBpId || user?.parentSapBpId || "",
        };

        return apiRequest('/dashboard/subs-count', 'POST', payload);
    }
};

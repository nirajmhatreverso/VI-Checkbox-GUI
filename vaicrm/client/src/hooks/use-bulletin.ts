import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

export interface BulletinFilters {
    bulletinType?: string;
    bulletinName?: string;
    bulletinId?: string;
    createdDate?: string;
    status?: string;
    userType?: string;
    limit?: number;
    offSet?: number;
}

export interface Bulletin {
    objId: string;
    type: string;
    isPrivate: string | null;
    bulletinText: string;
    startDate: string;
    endDate: string;
    active: string | null;
    title: string;
    isExternal: string | null;
    url: string | null;
    arcInd: string | null;
    modifyStamp: string | null;
    lastUpdate2user: string | null;
    bulletin2contact: string | null;
    bulletin2site: string | null;
    bulletin2busOrg: string | null;
    focusType: string | null;
    focusLowId: string | null;
    idNumber: string | null;
    status: string;
    createdDate: string;
}

export interface BulletinResponse {
    bulletinDetails: Bulletin[];
    offset: number;
    limit: number;
    totalRecordCount: number;
}

/**
 * Hook to fetch bulletins
 */
export const useBulletins = (filters: BulletinFilters = {}) => {
    return useQuery<BulletinResponse>({
        queryKey: ["admin", "bulletins", filters],
        queryFn: () => adminApi.fetchBulletin({
            bulletinType: filters.bulletinType || "",
            bulletinName: filters.bulletinName || "",
            bulletinId: filters.bulletinId || "",
            createdDate: filters.createdDate || "",
            status: filters.status || "",
            userType: filters.userType || "",
            limit: filters.limit ?? 10,
            offSet: filters.offSet ?? 0,
        }),
        select: (data: any) => {
            const responseData = data?.data || data || {};
            const bulletinDetails: Bulletin[] = (responseData.bulletinDetails || []).map((b: any) => ({
                objId: b.objId?.toString() || "",
                type: b.type || "",
                isPrivate: b.isPrivate,
                bulletinText: b.bulletinText || "",
                startDate: b.startDate || "",
                endDate: b.endDate || "",
                active: b.active,
                title: b.title || "",
                isExternal: b.isExternal,
                url: b.url,
                arcInd: b.arcInd,
                modifyStamp: b.modifyStamp,
                lastUpdate2user: b.lastUpdate2user,
                bulletin2contact: b.bulletin2contact,
                bulletin2site: b.bulletin2site,
                bulletin2busOrg: b.bulletin2busOrg,
                focusType: b.focusType,
                focusLowId: b.focusLowId,
                idNumber: b.idNumber,
                status: b.status || "",
                createdDate: b.createdDate || "",
            }));

            return {
                bulletinDetails,
                offset: responseData.offset ?? 0,
                limit: responseData.limit ?? 10,
                totalRecordCount: responseData.totalRecordCount ?? 0,
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Mutation to save or update a bulletin
 */
export const useSaveBulletinMutation = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (payload: any) => adminApi.saveBulletin(payload),
        onSuccess: (data: any) => {
            const success = data?.status === 'SUCCESS' || data?.data?.status === 'SUCCESS';
            if (success) {
                toast({
                    title: "Success",
                    description: data?.data?.message || "Bulletin saved successfully.",
                });
                queryClient.invalidateQueries({ queryKey: ["admin", "bulletins"] });
            } else {
                toast({
                    title: "Error",
                    description: data?.statusMessage || "Failed to save bulletin.",
                    variant: "destructive",
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred while saving the bulletin.",
                variant: "destructive",
            });
        },
    });
};

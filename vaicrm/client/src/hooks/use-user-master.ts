import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { adminApi } from "@/lib/adminApi";
import { PagePermission } from "./use-role-master";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
    userId: string;
    userName: string;
    userType: string;
    password?: string;
    confirmPassword?: string;
    salutation: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone?: string;
    altPhone?: string;
    status: UserStatus;
    country: string;
    otc: boolean;
    employee: boolean;
    passwordReset: boolean;
    mainPlant: boolean;
    roleId: string;
    employeeCode?: string;
    roleName: string;
    avatar?: string;
    assignRole?: {
        ruId: string | null;
        roleId: string;
        status: string;
    }[];
}

export interface UserRoleMapping {
    ruId: string | null;
    roleId: string;
    userId: string;
    status: string;
    createTs: string | null;
    createId: string | null;
    updateTs: string | null;
    updateId: string | null;
    roleName: string;
}

export { type PagePermission };

export interface FetchUserMasterFilters {
    userId?: string;
    userName?: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    mobile?: string;
    email?: string;
    roleName?: string;
    status?: string;
    limit?: number;
    offSet?: number;
}

/**
 * Hook to fetch all users
 */
export const useUsers = (filters: FetchUserMasterFilters = {}) => {
    return useQuery<User[]>({
        queryKey: ["admin", "users", filters],
        queryFn: () => adminApi.fetchUserMaster({
            userId: filters.userId || "",
            userName: filters.userName || "",
            firstName: filters.firstName || "",
            lastName: filters.lastName || "",
            country: filters.country || "",
            mobile: filters.mobile || "",
            email: filters.email || "",
            roleName: filters.roleName || "",
            status: filters.status || "",
            limit: filters.limit ?? 10,
            offSet: filters.offSet ?? 0
        }),
        select: (data: any) => {
            const list = data?.data?.userMasterList || data?.userMasterList || [];
            return list.map((u: any) => ({
                ...u,
                userId: u.userId?.toString() || "",
                // Map fields if there's a discrepancy
                middleName: u.middleName || u.midName || "",
                phone: u.phone || u.mobile || u.mobileNo || "",
                altPhone: u.altPhone || u.altMobile || u.altPhoneNo || "",
                country: u.country || u.countryName || "",
                salutation: u.salutation ? (u.salutation.endsWith('.') ? u.salutation : `${u.salutation}.`) : "",
                otc: u.otc === "Y" || u.otc === true || u.isOtc === "Y",
                employee: u.employee === "Y" || u.employee === true || u.isEmployee === "Y",
                passwordReset: u.passwordReset === "Y" || u.passwordReset === true || u.isPwdReset === "Y",
                mainPlant: u.mainPlant === "Y" || u.mainPlant === true || u.isMainPlant === "Y",
            })) as User[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to fetch permissions for a specific user
 */
export const useUserPermissions = (userId: string | null) => {
    return useQuery<PagePermission[]>({
        queryKey: ["admin", "users", userId, "permissions"],
        queryFn: () => apiRequest(`/admin/users/${userId}/permissions`),
        select: (data: any) => data?.data?.permissions || [],
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to fetch assigned roles for a specific user
 */
export const useUserRoles = (userId: string | null, status: string = "") => {
    return useQuery<UserRoleMapping[]>({
        queryKey: ["admin", "users", userId, "roles", status],
        queryFn: () => adminApi.fetchUserRoleMap({ userId: userId || "", status }),
        select: (data: any) => data?.data?.roleUserMappingBeans || data?.roleUserMappingBeans || data?.data?.roleUserMappingList || data?.roleUserMappingList || [],
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Mutation to create a new user
 */
export const useCreateUserMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (user: User) => {
            const payload = {
                userId: user.userId || "",
                userName: user.userName,
                userType: user.userType,
                password: user.password,
                confirmPassword: user.confirmPassword,
                salutation: user.salutation,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                altPhone: user.altPhone,
                isEmployee: user.employee ? "Y" : "N",
                employeeCode: user.employeeCode || "",
                isPwdReset: user.passwordReset ? "Y" : "N",
                roleId: user.roleId,
                roleName: user.roleName,
                status: user.status,
                country: user.country,
                isMainPlant: user.mainPlant ? "Y" : "N",
                isOtc: user.otc ? "Y" : "N"
            };
            return apiRequest("/admin/save/userMaster", "POST", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

/**
 * Mutation to update an existing user
 */
export const useUpdateUserMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: any) => adminApi.updateUser(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

/**
 * Mutation to delete a user
 */
export const useDeleteUserMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => apiRequest(`/admin/users/${userId}`, "DELETE"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

/**
 * Mutation to update permissions for a user (overrides)
 */
export const useUpdateUserPermissionsMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { userId: string; permissions: PagePermission[] }) =>
            apiRequest(`/admin/users/permissions`, "PUT", params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users", variables.userId, "permissions"] });
        },
    });
};

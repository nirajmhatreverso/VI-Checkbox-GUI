import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { adminApi } from "@/lib/adminApi";

export type RoleStatus = "ACTIVE" | "INACTIVE";

export interface Role {
    roleId: string;
    roleName: string;
    roleDescription: string;
    status: RoleStatus;
    checkerAccess: boolean;
    allAccess: boolean;
    addAccess: boolean;
    editAccess: boolean;
    viewAccess: boolean;
    exportAccess: boolean;
    autoApproveAccess: boolean;
    externalApiAccess: boolean;
}

export interface MenuItem {
    pageId: string | null;
    menuType: string;
    pageSectionName: string;
    pageMenu: string;
    pageUrl: string;
    status: string;
    navPageId: string;
    parentNavPageId: string;
    pageMenuLabel: string;
    pageMenuIcon: string;
    pageMenuOrder: string | number;
    pageSubMenu?: string | null;
    pageSubUrl?: string | null;
    pageSubMenuIcon?: string | null;
    pageSubMenuOrder?: string | number | null;
}

export interface PagePermission {
    pageId: string;
    rpmId?: string | null;
    navPageId?: string;
    parentNavPageId?: string;
    pageMenu: string;
    pageSubMenu: string | null;
    pageSectionName: string | null;
    pageMenuLabel?: string;
    pageUrl?: string;
    status: "ACTIVE" | "INACTIVE";
    viewAccess: boolean;
    addAccess: boolean;
    editAccess: boolean;
    exportAccess: boolean;
}

/**
 * Hook to fetch all roles
 */
export const useRoles = () => {
    return useQuery<Role[]>({
        queryKey: ["admin", "roles"],
        queryFn: () => adminApi.fetchUserRoles({
            roleName: "",
            roleDesc: "",
            roleId: "",
            status: "",
            offSet: 0,
            limit: 100
        }),
        select: (data: any) => {
            const roles = data?.data?.roleMasterList || data?.data?.roleList || data?.data?.roles || data?.roleMasterList || data?.roleList || [];
            if (!Array.isArray(roles)) {

                return [];
            }
            // Map backend fields to frontend interface (including Y/N to boolean)
            return roles.map((r: any) => ({
                ...r,
                roleId: r.roleId?.toString() || "", // Ensure roleId is string
                roleDescription: r.roleDescription || r.roleDesc || "",
                checkerAccess: r.checkerAccess === "Y" || r.checkerAccess === true,
                allAccess: r.allAccess === "Y" || r.allAccess === true,
                addAccess: r.addAccess === "Y" || r.addAccess === true,
                editAccess: r.editAccess === "Y" || r.editAccess === true,
                viewAccess: r.viewAccess === "Y" || r.viewAccess === true,
                exportAccess: r.exportAccess === "Y" || r.exportAccess === true,
                autoApproveAccess: r.autoApproveAccess === "Y" || r.autoApproveAccess === true,
                externalApiAccess: r.externalApiAccess === "Y" || r.externalApiAccess === true,
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook to fetch all pages from Page Master
 */
export const usePageMaster = () => {
    return useQuery<MenuItem[]>({
        queryKey: ["admin", "page-master"],
        queryFn: () => adminApi.fetchPageMaster({
            pageId: "",
            menuType: "",
            pageSectionName: "",
            pageMenu: "",
            pageUrl: "",
            status: "",
            offSet: 0,
            limit: 1000
        }),
        select: (data: any) => {
            const pages = data?.data?.pageMasterBeanList || data?.obj || [];
            if (!Array.isArray(pages)) return [];
            return pages.map((p: any) => ({
                ...p,
                pageId: p.pageId?.toString() || ""
            }));
        },
        staleTime: 1000 * 60 * 5,
    });
};

/**
 * Hook to fetch permissions for a specific role
 */
export const useRolePermissions = (roleId: string | null) => {
    return useQuery<PagePermission[]>({
        queryKey: ["admin", "roles", roleId, "permissions"],
        queryFn: () => adminApi.fetchPageMenus({
            rpmId: "",
            roleId: roleId || "",
            menuType: "",
            pageSectionName: "",
            pageMenu: "",
            roleName: "",
            status: "",
            offSet: 0,
            limit: 100
        }),
        select: (data: any) => {
            const permissions = data?.data?.pageMenuMappingDetails || [];
            if (!Array.isArray(permissions)) return [];
            return permissions.map((p: any) => ({
                pageId: p.pageId?.toString() || "",
                rpmId: p.rpmId?.toString() || null,
                navPageId: p.navPageId?.toString() || "",
                parentNavPageId: p.parentNavPageId?.toString() || "",
                pageMenu: p.pageSectionName || p.pageMenu || "",
                pageSubMenu: p.pageName || p.pageSubMenu || null,
                pageSectionName: p.pageSectionName || null,
                pageMenuLabel: p.pageName || p.pageMenuLabel || "",
                pageUrl: p.pageUrl || "",
                status: (p.status === "ACTIVE" || p.status === "Y") ? "ACTIVE" : "INACTIVE",
                viewAccess: p.viewAccess === "Y" || p.viewAccess === true,
                addAccess: p.addAccess === "Y" || p.addAccess === true,
                editAccess: p.editAccess === "Y" || p.editAccess === true,
                exportAccess: p.exportAccess === "Y" || p.exportAccess === true,
            }));
        },
        enabled: !!roleId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Mutation to create a new role
 */
export const useCreateRoleMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (role: Omit<Role, "roleId">) => {
            const payload = {
                roleId: null, // Always null for new role
                roleName: role.roleName,
                roleDescription: role.roleDescription,
                status: role.status,
                checkerAccess: role.checkerAccess ? "Y" : "N",
                allAccess: role.allAccess ? "Y" : "N",
                addAccess: role.addAccess ? "Y" : "N",
                editAccess: role.editAccess ? "Y" : "N",
                viewAccess: role.viewAccess ? "Y" : "N",
                exportAccess: role.exportAccess ? "Y" : "N",
                autoApproveAccess: role.autoApproveAccess ? "Y" : "N",
                externalApiAccess: role.externalApiAccess ? "Y" : "N",
            };
            return adminApi.saveRoleMaster(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
        },
    });
};

/**
 * Helper to ensure assignPageRole is populated by fetching if necessary
 */
const ensurePermissions = async (roleId: string, permissions?: PagePermission[]) => {
    if (permissions && permissions.length > 0) return permissions;

    try {
        const resp = await adminApi.fetchPageMenus({
            roleId: roleId,
            offSet: 0,
            limit: 1000
        });
        const fetched = resp?.data?.pageMenuMappingDetails || [];

        if (fetched.length > 0) {
            return fetched.map((p: any) => ({
                pageId: p.pageId,
                rpmId: p.rpmId,
                status: p.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
                addAccess: p.addAccess === "Y" || p.addAccess === true,
                editAccess: p.editAccess === "Y" || p.editAccess === true,
                viewAccess: p.viewAccess === "Y" || p.viewAccess === true,
                exportAccess: p.exportAccess === "Y" || p.exportAccess === true,
            })) as PagePermission[];
        }

        // Final fallback: Fetch all pages from master to ensure the list is NOT empty
        const masterResp = await adminApi.fetchPageMaster({ limit: 1000 });
        const masterPages = masterResp?.data?.pageMasterBeanList || masterResp?.obj || [];
        return masterPages.map((p: any) => ({
            pageId: p.pageId,
            rpmId: null,
            status: "INACTIVE",
            viewAccess: false,
            addAccess: false,
            editAccess: false,
            exportAccess: false,
        })) as PagePermission[];
    } catch (error) {

        return [];
    }
};

/**
 * Mutation to update an existing role
 */
export const useUpdateRoleMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (variables: { role: Role; permissions?: PagePermission[] }) => {
            const { role, permissions } = variables;

            // Ensure we have permissions to send
            const permsToUpdate = await ensurePermissions(role.roleId, permissions);

            const payload: any = {
                roleId: role.roleId,
                roleName: role.roleName,
                roleDescription: role.roleDescription,
                status: role.status,
                checkerAccess: role.checkerAccess ? "Y" : "N",
                allAccess: role.allAccess ? "Y" : "N",
                addAccess: role.addAccess ? "Y" : "N",
                editAccess: role.editAccess ? "Y" : "N",
                viewAccess: role.viewAccess ? "Y" : "N",
                exportAccess: role.exportAccess ? "Y" : "N",
                autoApproveAccess: role.autoApproveAccess ? "Y" : "N",
                externalApiAccess: role.externalApiAccess ? "Y" : "N",
                assignPageRole: permsToUpdate.map(p => ({
                    pageId: p.pageId,
                    status: p.status,
                    addAccess: p.addAccess ? "Y" : "N",
                    editAccess: p.editAccess ? "Y" : "N",
                    viewAccess: p.viewAccess ? "Y" : "N",
                    exportAccess: p.exportAccess ? "Y" : "N",
                    rpmId: p.rpmId || null
                }))
            };

            return adminApi.updateRole(payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "roles", variables.role.roleId, "permissions"] });
        },
    });
};

/**
 * Mutation to deactivate a role (replaces delete)
 */
export const useDeleteRoleMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roleOrVars: Role | { role: Role; permissions?: PagePermission[] }) => {
            const role = "role" in roleOrVars ? roleOrVars.role : roleOrVars;
            const permissions = "permissions" in roleOrVars ? roleOrVars.permissions : undefined;

            // Ensure we have permissions to send
            const permsToUpdate = await ensurePermissions(role.roleId, permissions);

            const payload: any = {
                roleId: role.roleId,
                roleName: role.roleName,
                roleDescription: role.roleDescription,
                status: "INACTIVE", // Explicitly deactivate
                checkerAccess: role.checkerAccess ? "Y" : "N",
                allAccess: role.allAccess ? "Y" : "N",
                addAccess: role.addAccess ? "Y" : "N",
                editAccess: role.editAccess ? "Y" : "N",
                viewAccess: role.viewAccess ? "Y" : "N",
                exportAccess: role.exportAccess ? "Y" : "N",
                autoApproveAccess: role.autoApproveAccess ? "Y" : "N",
                externalApiAccess: role.externalApiAccess ? "Y" : "N",
                assignPageRole: permsToUpdate.map(p => ({
                    pageId: p.pageId,
                    status: p.status,
                    addAccess: p.addAccess ? "Y" : "N",
                    editAccess: p.editAccess ? "Y" : "N",
                    viewAccess: p.viewAccess ? "Y" : "N",
                    exportAccess: p.exportAccess ? "Y" : "N",
                    rpmId: p.rpmId || null
                }))
            };
            return adminApi.updateRole(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
        },
    });
};

/**
 * Mutation to update permissions for a role
 */
export const useUpdatePermissionsMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { roleId: string; permissions: PagePermission[] }) =>
            apiRequest(`/admin/roles/permissions`, "PUT", params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "roles", variables.roleId, "permissions"] });
        },
    });
};

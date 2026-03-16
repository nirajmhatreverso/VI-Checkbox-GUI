import { apiRequest } from './queryClient';

export const adminApi = {
    async savePageMaster(data: any) {
        return apiRequest('/admin/save/pageMaster', 'POST', data);
    },
    async fetchPageMenus(data: any) {
        return apiRequest('/admin/fetch/pageMenu', 'POST', data);
    },
    async fetchPageMaster(data: any) {
        return apiRequest('/admin/fetch/pageMaster', 'POST', data);
    },
    async saveRoleMaster(data: any) {
        return apiRequest('/admin/save/roleMaster', 'POST', data);
    },
    async saveUserMaster(data: any) {
        return apiRequest('/admin/save/userMaster', 'POST', data);
    },
    async validateUser(userName: string) {
        return apiRequest('/admin/validateUser', 'POST', { userName });
    },
    async updateUser(data: any) {
        return apiRequest('/admin/update/user', 'POST', data);
    },
    async updateRole(data: any) {
        return apiRequest('/admin/update/role', 'POST', data);
    },
    async fetchUserRoles(data: any) {
        return apiRequest('/admin/fetch/userRole', 'POST', data);
    },
    async fetchUserMaster(data: any) {
        return apiRequest('/admin/fetch/userMaster', 'POST', data);
    },
    async fetchUserRoleMap(data: any) {
        return apiRequest('/admin/fetch/userRoleMap', 'POST', data);
    },
    async fetchBulletin(data: any) {
        return apiRequest('/admin/fetch/bulletin', 'POST', data);
    },
    async saveBulletin(data: any) {
        return apiRequest('/admin/save/bulletin', 'POST', data);
    }
};

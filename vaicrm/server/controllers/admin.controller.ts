import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) throw new Error("SERVER_API_TARGET_URL is not defined.");
    return apiUrl.replace(/\/$/, "");
}

// Generic helper for proxying POST requests
async function proxyPostRequest(req: Request, res: Response, javaEndpoint: string, body?: any) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body || req.body)
        });
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class AdminController {
    /**
     * PROXY FOR: /admin/v1/save/pageMaster
     */
    static savePageMaster(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/save/pageMaster');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/pageMaster
     */
    static fetchPageMaster(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/pageMaster');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/pageMenu
     */
    static fetchPageMenu(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/pageMenu');
    }
    /**
     * PROXY FOR: /admin/v1/save/roleMaster
     */
    static saveRoleMaster(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/save/roleMaster');
    }
    /**
     * PROXY FOR: /admin/v1/save/userMaster
     */
    static saveUserMaster(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/save/userMaster');
    }
    /**
     * PROXY FOR: /admin/v1/validateUser
     */
    static validateUser(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/validateUser');
    }
    /**
     * PROXY FOR: /admin/v1/update/user
     */
    static updateUser(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/update/user');
    }
    /**
     * PROXY FOR: /admin/v1/update/role
     */
    static updateRole(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/update/role');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/userRole
     */
    static fetchUserRole(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/userRole');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/userMaster
     */
    static fetchUserMaster(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/userMaster');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/userRoleMap
     */
    static fetchUserRoleMap(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/userRoleMap');
    }
    /**
     * PROXY FOR: /admin/v1/fetch/bulletin
     */
    static fetchBulletin(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/fetch/bulletin');
    }
    /**
     * PROXY FOR: /admin/v1/save/bulletin
     */
    static saveBulletin(req: Request, res: Response) {
        proxyPostRequest(req, res, '/admin/v1/save/bulletin');
    }
}

const adminRouter = Router();

adminRouter.post('/save/pageMaster', AdminController.savePageMaster);
adminRouter.post('/fetch/pageMaster', AdminController.fetchPageMaster);
adminRouter.post('/fetch/pageMenu', AdminController.fetchPageMenu);
adminRouter.post('/save/roleMaster', AdminController.saveRoleMaster);
adminRouter.post('/save/userMaster', AdminController.saveUserMaster);
adminRouter.post('/validateUser', AdminController.validateUser);
adminRouter.post('/update/user', AdminController.updateUser);
adminRouter.post('/update/role', AdminController.updateRole);
adminRouter.post('/fetch/userRole', AdminController.fetchUserRole);
adminRouter.post('/fetch/userMaster', AdminController.fetchUserMaster);
adminRouter.post('/fetch/userRoleMap', AdminController.fetchUserRoleMap);
adminRouter.post('/fetch/bulletin', AdminController.fetchBulletin);
adminRouter.post('/save/bulletin', AdminController.saveBulletin);

export default adminRouter;

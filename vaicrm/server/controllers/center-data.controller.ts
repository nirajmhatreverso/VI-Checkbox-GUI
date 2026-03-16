import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, "");
}

// Generic helper for proxying requests
async function proxyRequest(req: Request, res: Response, javaEndpoint: string, method: 'POST' | 'GET', body?: any) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;

        const apiResponse = await fetch(API_URL, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            ...(body && { body: JSON.stringify(body) })
        });

        const contentType = apiResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } else {
            const text = await apiResponse.text();
            res.status(apiResponse.status).json({
                status: "FAILURE",
                statusMessage: `Backend Error (${apiResponse.status}): ${text.substring(0, 100)}`
            });
        }
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class CenterDataController {

    static getCenterData(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/get/Center', 'POST', req.body);
    }
    static getCurrency(req: Request, res: Response) {
        // Updated to /crm/v1/currency based on typical patterns, but keeping your path if you are sure
        // The previous error might be due to this path being wrong? 
        // I will use what you provided: /crm/v1/get/Currency
        proxyRequest(req, res, '/crm/v1/get/Currency', 'POST', req.body);
    }
    static getStoreLocationsById(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/storeLocationById', 'POST', req.body);
    }
    static getCollectedBy(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/collectedBy', 'POST', req.body);
    }
}

const centerDataRouter = Router();
centerDataRouter.post('/center', CenterDataController.getCenterData);
centerDataRouter.post('/currency', CenterDataController.getCurrency);
centerDataRouter.post('/store-locations', CenterDataController.getStoreLocationsById);
centerDataRouter.post('/collected-by', CenterDataController.getCollectedBy);
export default centerDataRouter;
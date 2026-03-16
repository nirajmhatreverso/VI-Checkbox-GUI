import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, "");
}

async function proxyRequest(req: Request, res: Response, javaEndpoint: string, method: 'GET' | 'POST' = 'POST') {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            ...(method === 'POST' && { body: JSON.stringify(req.body) })
        };

        const apiResponse = await fetch(API_URL, options);
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class DropdownController {
    // ... existing methods if any ...

    static getConfig(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/config', 'POST');
    }

    static async getOnboardingDropdowns(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/onboarding/dropdowns`;

            const apiResponse = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                    // No x-auth-username needed, the BFF is a trusted client
                }
            });

            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } catch (error: any) {
            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }
}

const dropdownRouter = Router();
// ... existing routes ...
dropdownRouter.post('/config', DropdownController.getConfig); // Add this
dropdownRouter.get('/onboarding', DropdownController.getOnboardingDropdowns);

export default dropdownRouter;
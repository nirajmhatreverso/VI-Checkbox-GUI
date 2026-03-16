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

export class AgentCommissionController {
    static getCommissionDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/commission/details', 'POST', req.body);
    }
}

const agentCommissionRouter = Router();

// Matches frontend: /api/agent/commission-details
agentCommissionRouter.post('/commission-details', AgentCommissionController.getCommissionDetails);

export default agentCommissionRouter;
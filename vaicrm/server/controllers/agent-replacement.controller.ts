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
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        };

        if (method === 'POST') {
            options.body = JSON.stringify(req.body);
        }

        const apiResponse = await fetch(API_URL, options);
        const contentType = apiResponse.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } else {
            res.status(apiResponse.status).send(await apiResponse.text());
        }

    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class AgentReplacementController {
    static createReplacement(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/replace/agent');
    }

    static searchReplacements(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/agentReplaceFilter');
    }

    static approveReplacement(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/agentReplacement/approval');
    }

    static fetchReasonConfig(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/commonConfig');
    }
}

const agentReplacementRouter = Router();
agentReplacementRouter.post('/create', AgentReplacementController.createReplacement);
agentReplacementRouter.post('/filter', AgentReplacementController.searchReplacements);
agentReplacementRouter.post('/approve', AgentReplacementController.approveReplacement);
agentReplacementRouter.post('/reason-config', AgentReplacementController.fetchReasonConfig);

export default agentReplacementRouter;
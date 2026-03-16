// server/controllers/agent-subscription.controller.ts

import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

// Generic helper for proxying POST requests
async function proxyPostRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;

        // Log for debugging


        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);

    } catch (error) {

        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class AgentSubscriptionController {
    /**
     * PROXY FOR: /payments/v1/paymentSub/paymentInitiate
     * Used in: AgentSubscriptionPaymentForm.tsx
     */
    static initiate(req: Request, res: Response) {
        // This matches your specific requirement
        proxyPostRequest(req, res, '/payments/v1/paymentSub/paymentInitiate');
    }
}

// --- EXPRESS ROUTER SETUP ---
const agentSubscriptionRouter = Router();

// This defines the route suffix. 
// Combined with the main routes file, the full URL will be:
// /api/agent-payments/subscription/initiate
agentSubscriptionRouter.post('/initiate', AgentSubscriptionController.initiate);

export default agentSubscriptionRouter;
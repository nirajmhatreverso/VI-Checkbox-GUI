// server/controllers/agent-payment.controller.ts (New File)

import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

// Generic helper for proxying requests to the Java backend
async function proxyRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method: 'POST', // All these APIs are POST
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

export class AgentPaymentController {
    /**
     * PROXY FOR: payments/v1/hw/paymentInitiate
     * Used in: PaymentForm.tsx
     */
    static initiate(req: Request, res: Response) {
        proxyRequest(req, res, '/payments/v1/hw/paymentInitiate');
    }

    /**
     * PROXY FOR: crm/v1/fetch/hw/paymentDetails
     * Used in: PaymentApprovalQueue.tsx and PaymentHistory.tsx
     */
    static search(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/hw/paymentDetails');
    }

    /**
     * PROXY FOR: payments/v1/agents/hw/paymentApproval
     * Used in: PaymentApprovalQueue.tsx
     */
    static approve(req: Request, res: Response) {
        proxyRequest(req, res, '/payments/v1/agents/hw/paymentApproval');
    }
    static agentapprove(req: Request, res: Response) {
        proxyRequest(req, res, '/payments/v1/customerSub/paymentApproval');
    }
}

// --- EXPRESS ROUTER SETUP ---
const agentPaymentRouter = Router();

agentPaymentRouter.post('/initiate', AgentPaymentController.initiate);
agentPaymentRouter.post('/search', AgentPaymentController.search);
agentPaymentRouter.post('/approve', AgentPaymentController.approve);
agentPaymentRouter.post('/agentapprove', AgentPaymentController.agentapprove);

export default agentPaymentRouter;
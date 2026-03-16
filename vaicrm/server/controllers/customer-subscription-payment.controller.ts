// server/controllers/customer-subscription-payment.controller.ts (New File)

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

async function proxyGetRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);

    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class CustomerSubscriptionPaymentController {
    /**
     * PROXY FOR: /payments/v1/hw/paymentInitiate (reused for subscription)
     * Used in: NewCustomerSubPaymentForm.tsx
     */
    static initiate(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/paymentSub/paymentInitiate');
    }

    /**
     * PROXY FOR: /crm/v1/fetch/hw/paymentDetails (reused for subscription)
     * Used in: CustomerSubPaymentApprovalQueue.tsx and CustomerSubPaymentHistory.tsx
     */
    static search(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetch/hw/paymentDetails');
    }

    /**
     * PROXY FOR: /payments/v1/agents/hw/paymentApproval (reused for subscription)
     * Used in: CustomerSubPaymentApprovalQueue.tsx
     */
    static approve(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/agents/hw/paymentApproval');
    }
    static approveCustomerSub(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/customerSub/paymentApproval');
    }
    static fetchBalance(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/customerBalance');
    }
    static fetchPlants(req: Request, res: Response) {
        proxyGetRequest(req, res, '/crm/v1/plants');
    }
    static fetchAgents(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/userDetailsByType');
    }
    static fetchStoreLocations(req: Request, res: Response) {
        // Ensure this points to the correct endpoint if it differs for Subscriptions
        // Based on your frontend code, it seems you want this:
        proxyPostRequest(req, res, '/crm/v1/storeLocationById');
    }
    static fetchCollectedBy(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetch/collectedBy');
    }

    static reversal(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/customerSub/reversal');
    }
}

// --- EXPRESS ROUTER SETUP ---
const customerSubPaymentRouter = Router();

customerSubPaymentRouter.post('/initiate', CustomerSubscriptionPaymentController.initiate);
customerSubPaymentRouter.post('/search', CustomerSubscriptionPaymentController.search);
customerSubPaymentRouter.post('/approve', CustomerSubscriptionPaymentController.approve);
customerSubPaymentRouter.post('/balance', CustomerSubscriptionPaymentController.fetchBalance);
customerSubPaymentRouter.get('/plants', CustomerSubscriptionPaymentController.fetchPlants);
customerSubPaymentRouter.post('/agents', CustomerSubscriptionPaymentController.fetchAgents);
customerSubPaymentRouter.post('/storeLocationById', CustomerSubscriptionPaymentController.fetchStoreLocations);
customerSubPaymentRouter.post('/collected-by', CustomerSubscriptionPaymentController.fetchCollectedBy);
customerSubPaymentRouter.post('/customer-approve', CustomerSubscriptionPaymentController.approveCustomerSub);
customerSubPaymentRouter.post('/reversal', CustomerSubscriptionPaymentController.reversal);

export default customerSubPaymentRouter;
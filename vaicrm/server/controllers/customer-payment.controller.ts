// server/controllers/customer-payment.controller.ts (New File)

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

export class CustomerPaymentController {
    /**
     * PROXY FOR: /payments/v1/hw/paymentInitiate (for Customer)
     * Used in: CustomerPaymentForm.tsx
     */
    static initiate(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/hw/paymentInitiate');
    }

    /**
     * PROXY FOR: /crm/v1/fetch/hw/paymentDetails (for Customer)
     * Used in: CustomerPaymentApprovalQueue.tsx and CustomerPaymentHistory.tsx
     */
    static search(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetch/hw/paymentDetails');
    }

    /**
     * PROXY FOR: /payments/v1/agents/hw/paymentApproval (reused for Customer)
     * Used in: CustomerPaymentApprovalQueue.tsx
     */
    static approve(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/agents/hw/paymentApproval');
    }

    static fetchBalance(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/customerBalance');
    }

    static fetchBalanceByBp(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetchBalanceBySapBpId');
    }

    static fetchPlants(req: Request, res: Response) {
        proxyGetRequest(req, res, '/crm/v1/plants');
    }
    static fetchAgents(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/userDetailsByType');
    }

    /**
     * PROXY FOR: /payments/v1/adjustment
     * Used in: CreateAdjustmentForm.tsx
     */
    static createAdjustment(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/adjustment');
    }

    /**
     * PROXY FOR: /payments/v1/adjustmentDetails
     * Used in: AdjustmentHistoryTable.tsx
     */
    static fetchAdjustmentDetails(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/adjustmentDetails');
    }

    /**
     * PROXY FOR: /payments/v1/adjustment/approval
     * Used in: AdjustmentApprovalTable.tsx
     */
    static adjustmentApproval(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/adjustment/approval');
    }

    /**
     * PROXY FOR: /payments/v1/payment/transfer
     * Used in: NewCustomerTransferForm.tsx
     */
    static transfer(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/payment/transfer');
    }

    /**
     * PROXY FOR: /payments/v1/paymentTransfer/approval
     * Used in: CustomerTransferApprovalQueue.tsx
     */
    static transferApproval(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/paymentTransfer/approval');
    }

    /**
     * PROXY FOR: /payments/v1/hw/reversal
     * Used in: HardwarePaymentReversalPage.tsx
     */
    static reverseHardwarePayment(req: Request, res: Response) {
        proxyPostRequest(req, res, '/payments/v1/hw/reversal');
    }
}

// --- EXPRESS ROUTER SETUP ---
const customerPaymentRouter = Router();

customerPaymentRouter.post('/initiate', CustomerPaymentController.initiate);
customerPaymentRouter.post('/search', CustomerPaymentController.search);
customerPaymentRouter.post('/approve', CustomerPaymentController.approve); // This is likely for HW Payment Approval
customerPaymentRouter.post('/balance-by-bp', CustomerPaymentController.fetchBalanceByBp);
customerPaymentRouter.post('/balance', CustomerPaymentController.fetchBalance);
customerPaymentRouter.get('/plants', CustomerPaymentController.fetchPlants);
customerPaymentRouter.post('/agents', CustomerPaymentController.fetchAgents);
customerPaymentRouter.post('/adjustment', CustomerPaymentController.createAdjustment);
customerPaymentRouter.post('/adjustmentDetails', CustomerPaymentController.fetchAdjustmentDetails);
customerPaymentRouter.post('/adjustment/approval', CustomerPaymentController.adjustmentApproval);
customerPaymentRouter.post('/transfer', CustomerPaymentController.transfer);
customerPaymentRouter.post('/transfer-approval', CustomerPaymentController.transferApproval);
customerPaymentRouter.post('/reversal', CustomerPaymentController.reverseHardwarePayment);
export default customerPaymentRouter;
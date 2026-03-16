// server/controllers/subscription.controller.ts (New File)

import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
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

        // Handle cases where the response might not be JSON
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

export class SubscriptionController {

    static searchCustomers(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/cm/customers');
    }
    // --- DATA FETCHING ---
    static getSubscriptionDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/cm/subscription');
    }
    static getStbHwDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/stbHwDetails');
    }
    static getPlanDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/planDetails');
    }
    static getProvisioningDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/provisioning');
    }
    static getServiceDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/serviceDetails');
    }

    // --- ACTIONS ---
    static purchase(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/purchase');
    }
    static renew(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/renewal');
    }
    static toggleAutoRenewal(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/autoRenewal');
    }
    static lockUnlock(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/lockUnlock');
    }
    static terminate(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/termination');
    }
    static retrack(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/retrack');
    }
    static extendValidity(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/extension');
    }
    static planChange(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/planChange');
    }
    static offerChange(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/offerChange');
    }
    static getInvoiceDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subsInvDetails');
    }
    static getLedgerDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/ledgerDetails');
    }

    static approveExtension(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/planEx/approval');
    }
    static replaceHardware(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/replace/hw');
    }
    static createEvent(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/create/event');
    }
    static getEventDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetch/eventDetails');
    }
    static updateRooms(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/plan/noOfRooms');
    }
    static cancelSchedule(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/schedule');
    }
    static addOnPurchase(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/addOn');
    }
    static removeAddon(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/subscription/addOnRemove');
    }
    static postpaidReconnect(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/postpaid/reconnect');
    }

    static downloadInvoice(req: Request, res: Response) {
        proxyDownloadRequest(req, res, '/crm/v1/downloadInvoiceFile');
    }
    static getCommonConfig(req: Request, res: Response) {
    proxyRequest(req, res, '/crm/v1/fetch/commonConfig');
}
}

async function proxyDownloadRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const options: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(req.body)
        };

        const apiResponse = await fetch(API_URL, options);

        if (!apiResponse.ok) {
            const text = await apiResponse.text();
            res.status(apiResponse.status).send(text);
            return;
        }

        const contentType = apiResponse.headers.get("content-type");
        const contentDisposition = apiResponse.headers.get("content-disposition");

        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);

        const arrayBuffer = await apiResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
    
}

// --- EXPRESS ROUTER SETUP ---
const subscriptionRouter = Router();

// Data fetching routes
subscriptionRouter.post('/details', SubscriptionController.getSubscriptionDetails);
subscriptionRouter.post('/hardware-details', SubscriptionController.getStbHwDetails);
subscriptionRouter.post('/plan-details', SubscriptionController.getPlanDetails);
subscriptionRouter.post('/provisioning-details', SubscriptionController.getProvisioningDetails);
subscriptionRouter.post('/search-customers', SubscriptionController.searchCustomers);
subscriptionRouter.post('/invoice-details', SubscriptionController.getInvoiceDetails);
subscriptionRouter.post('/ledger-details', SubscriptionController.getLedgerDetails);
subscriptionRouter.post('/event-details', SubscriptionController.getEventDetails);
subscriptionRouter.post('/addon-purchase', SubscriptionController.addOnPurchase);
subscriptionRouter.post('/download-invoice', SubscriptionController.downloadInvoice);

// Action routes
subscriptionRouter.post('/purchase', SubscriptionController.purchase);
subscriptionRouter.post('/renew', SubscriptionController.renew);
subscriptionRouter.post('/toggle-renewal', SubscriptionController.toggleAutoRenewal);
subscriptionRouter.post('/lock-unlock', SubscriptionController.lockUnlock);
subscriptionRouter.post('/terminate', SubscriptionController.terminate);
subscriptionRouter.post('/retrack', SubscriptionController.retrack);
subscriptionRouter.post('/extend-validity', SubscriptionController.extendValidity);
subscriptionRouter.post('/plan-change', SubscriptionController.planChange);
subscriptionRouter.post('/offer-change', SubscriptionController.offerChange);
subscriptionRouter.post('/service-details', SubscriptionController.getServiceDetails);
subscriptionRouter.post('/hardware-replacement', SubscriptionController.replaceHardware);
subscriptionRouter.post('/create-event', SubscriptionController.createEvent);
subscriptionRouter.post('/update-rooms', SubscriptionController.updateRooms);
subscriptionRouter.post('/cancel-schedule', SubscriptionController.cancelSchedule);
subscriptionRouter.post('/remove-addon', SubscriptionController.removeAddon);
subscriptionRouter.post('/postpaid-reconnect', SubscriptionController.postpaidReconnect);
subscriptionRouter.post('/common-config', SubscriptionController.getCommonConfig);

export default subscriptionRouter;
// server/controllers/provisioning.controller.ts

import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, "");
}

export class ProvisioningController {

    static async sendOsd(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/provision`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(req.body)
            });

            const data = await apiResponse.json();

            // Forward the status code from the downstream service
            res.status(apiResponse.status).json(data);

        } catch (error) {
            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }
    static async reconnectSuspendAll(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/reconnectSuspendAll`;

            // Extract operation from request body if needed for logging/validation
            const { ...apiPayload } = req.body;
            
            // Log the operation type for audit purposes

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(apiPayload) // Send only the required fields to the API
            });

            const data = await apiResponse.json();

            // Forward the status code from the downstream service
            res.status(apiResponse.status).json(data);

        } catch (error) {
            console.error("Error in reconnectSuspendAll:", error);
            res.status(500).json({ 
                status: "ERROR",
                statusMessage: 'Internal Server Error while processing provisioning command' 
            });
        }
    }
}

const provisioningRouter = Router();
provisioningRouter.post('/send-osd', ProvisioningController.sendOsd);
provisioningRouter.post('/reconnect-suspend', ProvisioningController.reconnectSuspendAll);
export default provisioningRouter;
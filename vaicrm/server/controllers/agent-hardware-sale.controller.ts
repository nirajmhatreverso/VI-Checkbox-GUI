// server/controllers/agent-hardware-sale.controller.ts (New File)

import { Request, Response, Router } from 'express';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined.");
    }
    return apiUrl.replace(/\/$/, "");
}

async function proxyPostRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(req.body)
        });
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {

        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class AgentHardwareSaleController {
    /**
     * PROXY FOR: /crm/v1/productSalesOrder
     */
    static create(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/hwSaleOrder');
    }

    /**
     * PROXY FOR: /crm/v1/hwOrderDetails
     */
    static getDetails(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/hwOrderDetails');
    }

    /**
     * PROXY FOR: /crm/v1/approveHwSaleOrder
     */
    static approve(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/agents/hw/saleOrderApproval');
    }

    /**
     * PROXY FOR: /crm/v1/uploadSerialNo
     */
    static async uploadSerials(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/inv/uploadSerialNo`;
            const contentType = req.headers['content-type'];
            if (!contentType) {
                throw new Error("Content-Type header is missing");
            }

            // Stream the raw request body to the Java API
            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Pass the original multipart Content-Type, including the boundary
                    'Content-Type': contentType
                },
                body: req as any,
                // @ts-ignore - This is crucial for streaming request bodies in Node's fetch
                duplex: 'half'
            });

            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }

}

// --- EXPRESS ROUTER SETUP ---
const agentHardwareSaleRouter = Router();

agentHardwareSaleRouter.post('/create', AgentHardwareSaleController.create);
agentHardwareSaleRouter.post('/details', AgentHardwareSaleController.getDetails);
agentHardwareSaleRouter.post('/approve', AgentHardwareSaleController.approve);
// Use `upload.single` to handle the file from the client
agentHardwareSaleRouter.post('/upload-serials', AgentHardwareSaleController.uploadSerials);

export default agentHardwareSaleRouter;
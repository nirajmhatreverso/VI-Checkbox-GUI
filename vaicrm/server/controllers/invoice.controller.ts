
import { Request, Response, Router } from 'express';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

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

export class InvoiceController {
    /**
     * PROXY FOR: /crm/v1/invReversal
     */
    static reverse(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/invReversal');
    }
}

// --- EXPRESS ROUTER SETUP ---
const invoiceRouter = Router();

invoiceRouter.post('/reverse', InvoiceController.reverse);

export default invoiceRouter;

// server/controllers/hardware-sale.controller.ts

import { Request, Response, Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';

const upload = multer({ storage: multer.memoryStorage() });

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}
async function proxyRequest(req: Request, res: Response, javaEndpoint: string, method: 'GET' | 'POST', body?: any) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            ...(body && { body: JSON.stringify(body) })
        });
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

async function proxyUploadRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const formData = new FormData();

        // Forward the JSON part of the multipart request
        if (req.body.uploadSerialNoRequest) {
            formData.append('uploadSerialNoRequest', JSON.stringify(req.body.uploadSerialNoRequest), { contentType: 'application/json' });
        }

        // Forward the file part
        if (req.file) {
            formData.append('excelFile', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        } else {
            return res.status(400).json({ statusMessage: 'Excel file is missing.' });
        }

        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${token}` },
            body: formData as any,
        });

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error: any) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class HardwareSaleController {

    static createAgentSaleOrder(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/productSalesOrder', 'POST', req.body);
    }

    static fetchOrderDetails(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/hwOrderDetails', 'POST', req.body);
    }

    static approveAgentSaleOrder(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/approveHwSaleOrder', 'POST', req.body);
    }

    static createCustomerSaleOrder(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/customer/hwSaleOrder', 'POST', req.body);
    }

    static approveCustomerSaleOrder(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/customer/hw/saleOrderApproval', 'POST', req.body);
    }

    static async fetchBalance(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/fetchBalanceBySapBpId', 'POST', req.body);
    }

    // ✅ NEW: Added method for the new customer balance endpoint
    static async fetchCustomerBalance(req: Request, res: Response) {
        proxyRequest(req, res, '/crm/v1/customerBalance', 'POST', req.body);
    }

    static uploadSerialNumbers(req: Request, res: Response) {

        proxyUploadRequest(req, res, '/crm/v1/uploadSerialNo');
    }
}

// --- ROUTER SETUP ---
const hardwareSaleRouter = Router();

hardwareSaleRouter.post('/orders', HardwareSaleController.createAgentSaleOrder);
hardwareSaleRouter.post('/details', HardwareSaleController.fetchOrderDetails);
hardwareSaleRouter.post('/approve', HardwareSaleController.approveAgentSaleOrder);
hardwareSaleRouter.post('/balance', HardwareSaleController.fetchBalance);
hardwareSaleRouter.post('/upload-serials', upload.single('excelFile'), HardwareSaleController.uploadSerialNumbers);
hardwareSaleRouter.post('/customer/orders', HardwareSaleController.createCustomerSaleOrder);
hardwareSaleRouter.post('/customer/approve', HardwareSaleController.approveCustomerSaleOrder);

hardwareSaleRouter.post('/customer/balance', HardwareSaleController.fetchCustomerBalance);

export default hardwareSaleRouter;
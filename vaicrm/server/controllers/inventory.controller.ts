// server/controllers/inventory.controller.ts

import { Request, Response, Router } from 'express';
import fs from 'fs';
import FormData from 'form-data';
import multer from 'multer';
import axios from 'axios';

const upload = multer({ dest: 'uploads/' });

// Helper to get the Java API base URL
const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

// Generic helper for proxying requests
async function proxyRequest(req: Request, res: Response, javaEndpoint: string, method: 'GET' | 'POST', body?: any) {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ statusMessage: 'Unauthorized' });
    }

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...(body && { body: JSON.stringify(body) })
        });

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);

    } catch (error: any) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}


export class InventoryController {



    /**
     * PROXY FOR: Fetching Plants
     * Java Endpoint: GET /crm/v1/plants
     */
    static getPlants(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/plants';
        proxyRequest(req, res, javaEndpoint, 'GET');
    }

    static getTransferCountries(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/get/Center';
        const requestBody = {
            distinctType: "country",
            status: "ACTIVE",
            country: null,
            region: null,
            city: null,
            district: null,
            centerId: null,
            countryId: null,
            countryCode: null,
            zone: null,
            ward: null
        };
        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }
    /**
     * PROXY FOR: Fetching Materials (HW Products)
     * Java Endpoint: POST /crm/v1/hwProducts
     */
    static getHwProducts(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/hwProducts';

        // Extract params from frontend request body
        const { type, bundleName } = req.body;

        const requestBody = {
            type: type || "AGENT", // Default to AGENT if not provided
            bundleName: bundleName
        };

        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }



    /**
     * PROXY FOR: Fetching Store Locations for a given Plant
     * Java Endpoint: GET /crm/v1/plantStoreLocInfo/{plantId}
     */


    /**
     * PROXY FOR: Fetching Aggregated Stock Details
     * NOTE: The Java endpoint for this was not provided, I am assuming it based on the original code.
     * Please update the endpoint if it's different.
     * Java Endpoint (Assumed): GET /inventory/v1/stock-details?plant=...&material=...
     */
    static getStoreLocations(req: Request, res: Response) {
        const { plantId } = req.body;
        if (!plantId) {
            return res.status(400).json({ statusMessage: 'Plant ID is required in body' });
        }
        const javaEndpoint = `/crm/v1/storeLocationById`;
        const requestBody = { type: "OTC", plantNumber: plantId };
        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }
    static getStockDetails(req: Request, res: Response) {
        // ✅ FIX: Changed from req.query to req.body to correctly read POST data.
        const { plant, material, storageLocation } = req.body;

        if (!plant || !material) {
            return res.status(400).json({ statusMessage: 'Plant and Material parameters are required in the request body.' });
        }

        const javaEndpoint = '/crm/v1/stockDetails';
        const requestBody = {
            plant,
            material,
            storageLocation: storageLocation || ""
        };

        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }

    static getStockSerialDetails(req: Request, res: Response) {
        const { itemId, plant, material, storageLocation } = req.body;

        // itemId is the most crucial part for this specific request
        if (!itemId) {
            return res.status(400).json({ statusMessage: 'Item ID is required.' });
        }

        const javaEndpoint = '/crm/v1/stockSerialNoDetails';
        const requestBody = { itemId, plant, material, storageLocation };

        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }

    static initiateStockRequest(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/stock/request';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }
    static initiateStockTransfer(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/stock/transfer';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }
    static getStoreLocationsByPlant(req: Request, res: Response) {
        const { plantId } = req.params;
        if (!plantId) {
            return res.status(400).json({ statusMessage: 'Plant ID is required' });
        }
        const javaEndpoint = `/crm/v1/plantStoreLocInfo/${plantId}`;
        proxyRequest(req, res, javaEndpoint, 'GET');
    }

    static initiateWarehouseTransfer(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/warehouse/transfer';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    static getStockHistory(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/fetch/stockFilter';
        // Ensure defaults for required fields if missing
        const payload = {
            fromPlantName: "",
            toPlantName: "",
            fromStoreLocation: "",
            toStoreLocation: "",
            requestId: "",
            fromDate: "",
            toDate: "",
            status: "",
            type: "SR", // Hardcoded as per requirement
            ...req.body // Override with actual filter values
        };
        proxyRequest(req, res, javaEndpoint, 'POST', payload);
    }

    static async uploadStockSerials(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/stock/uploadSerial';
        const token = req.cookies.access_token;

        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ statusMessage: 'No file uploaded' });

        try {
            // 1. Prepare JSON Metadata
            let metadataStr = req.body.stockSerialNoUploadRequest;
            // Ensure it's a string (Multer might have parsed it)
            if (typeof metadataStr === 'object') {
                metadataStr = JSON.stringify(metadataStr);
            }

            // 2. Build FormData
            const form = new FormData();

            // Append File (Axios handles the stream safely)
            form.append('excelFile', fs.createReadStream(req.file.path), req.file.originalname);

            // Append JSON with explicit Content-Type header (Matches cURL)
            form.append('stockSerialNoUploadRequest', metadataStr, {
                contentType: 'application/json',
            });

            // 3. Send Request using Axios
            const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;

            const response = await axios.post(API_URL, form, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...form.getHeaders() // Crucial: Sets multipart/form-data; boundary=...
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            // 4. Cleanup
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            // 5. Success
            res.status(response.status).json(response.data);

        } catch (error: any) {
            // Cleanup on error
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            // Handle Axios Error Response (Java returned 400/500)
            if (error.response) {
                return res.status(error.response.status).send(error.response.data);
            }

            // Handle Node/Network Crash
            res.status(500).json({ statusMessage: 'Internal Server Error during upload proxy' });
        }
    }

    static async uploadSerialNoSubAgent(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/inv/uploadSerialNoSubAgentToAgent';
        const token = req.cookies.access_token;

        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ statusMessage: 'No file uploaded' });

        try {
            // 1. Prepare JSON Metadata
            let metadataStr = req.body.uploadSerialNoSubAgentRequest;
            if (typeof metadataStr === 'object') {
                metadataStr = JSON.stringify(metadataStr);
            }

            // 2. Build FormData
            const form = new FormData();
            form.append('excelFile', fs.createReadStream(req.file.path), req.file.originalname);
            form.append('uploadSerialNoSubAgentRequest', metadataStr, {
                contentType: 'application/json',
            });

            // 3. Send Request
            const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
            const response = await axios.post(API_URL, form, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            // 4. Cleanup
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            // 5. Success
            res.status(response.status).json(response.data);

        } catch (error: any) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (error.response) {
                return res.status(error.response.status).send(error.response.data);
            }
            res.status(500).json({ statusMessage: 'Internal Server Error during upload proxy' });
        }
    }



    static trackSerialNo(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/trackSerialNo';
        // Body should be { "material": "..." }
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    /**
     * PROXY FOR: Approve / Reject stock (called by UI)
     * Java Endpoint: POST /crm/v1/stock/approval
     */
    static stockApproval(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/stock/approval';
        // Expect body to include requestId, materialId, approvedItemQty, status, remark, reason, type
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    static receiverstockApproval(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/stock/receiverApproval';
        // Expect body to include requestId, materialId, approvedItemQty, status, remark, reason, type
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    static getAgentStockSerials(req: Request, res: Response) {
        const { sapBpId, material, status,orderFlag } = req.body;
        if (!sapBpId || !material) {
            return res.status(400).json({ statusMessage: 'sapBpId and material are required in body' });
        }
        const javaEndpoint = '/crm/v1/fetch/stockDetails';
        const requestBody = {
            sapBpId,
            material,
            status: status || 'NEW',
            orderFlag: orderFlag || ''
        };
        proxyRequest(req, res, javaEndpoint, 'POST', requestBody);
    }

    static casIdUpdate(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/casIdUpdate';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    static agentSubagentTransferHistory(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/hwOrderDetails';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }

    static subagentAgentTransferHistory(req: Request, res: Response) {
        const javaEndpoint = '/crm/v1/hwOrderDetails';
        proxyRequest(req, res, javaEndpoint, 'POST', req.body);
    }
}

// --- EXPRESS ROUTER SETUP ---
const inventoryRouter = Router();

inventoryRouter.get('/plants', InventoryController.getPlants);
inventoryRouter.post('/hw-products', InventoryController.getHwProducts);
inventoryRouter.post('/store-locations', InventoryController.getStoreLocations);
inventoryRouter.post('/stock-details', InventoryController.getStockDetails);
inventoryRouter.post('/stock-serial-details', InventoryController.getStockSerialDetails);
inventoryRouter.post('/agent-stock-serials', InventoryController.getAgentStockSerials); // NEW
inventoryRouter.post('/transfer-countries', InventoryController.getTransferCountries); // NEW
inventoryRouter.post('/initiate-request', InventoryController.initiateStockRequest); // NEW
inventoryRouter.post('/initiate-transfer', InventoryController.initiateStockTransfer);
inventoryRouter.get('/store-locations-by-plant/:plantId', InventoryController.getStoreLocationsByPlant);
inventoryRouter.post('/initiate-warehouse-transfer', InventoryController.initiateWarehouseTransfer);
inventoryRouter.post('/history', InventoryController.getStockHistory);
inventoryRouter.post(
    '/upload-serials',
    upload.single('excelFile'),
    InventoryController.uploadStockSerials
);
inventoryRouter.post(
    '/upload-serials-subagent',
    upload.single('excelFile'),
    InventoryController.uploadSerialNoSubAgent
);
inventoryRouter.post('/track-serial-no', InventoryController.trackSerialNo);
inventoryRouter.post('/stock-approval', InventoryController.stockApproval); // NEW
inventoryRouter.post('/receiverstock-approval', InventoryController.receiverstockApproval);
inventoryRouter.post('/cas-id-update', InventoryController.casIdUpdate); // NEW
inventoryRouter.post('/agent-subagent-transfer-history', InventoryController.agentSubagentTransferHistory); // NEW
inventoryRouter.post('/subagent-agent-transfer-history', InventoryController.agentSubagentTransferHistory); // NEW

export default inventoryRouter;
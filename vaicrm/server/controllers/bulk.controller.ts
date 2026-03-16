import { Request, Response, Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        return "http://154.73.171.141:8081";
    }
    return apiUrl.replace(/\/$/, "");
}

export class BulkController {

    static async processUpload(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        if (!req.file) {
            return res.status(400).json({ statusMessage: "No file uploaded" });
        }

        try {
            const {
                operation,
                creditLimitType,
                adjustmentType,
                module,
                isPlanOperation,
                executionMode,
                terminationReason,
                collectedBy,
                plant,
                storeLocation
            } = req.body;

            const form = new FormData();
            let API_URL = "";

            if (isPlanOperation === 'true') {
                const planPayload: {
                    operation: string;
                    executionMode: string;
                    terminationReason?: string;
                } = {
                    operation: operation || "",
                    executionMode: executionMode || ""
                };

                const terminationReasonOperations = [
                    "PLAN_RENEWAL",
                    "PLAN_ADJUSTMENT",
                    "LOCK",
                    "UNLOCK",
                    "RETRACK",
                    "PLAN_TERMINATION"
                ];

                if (terminationReasonOperations.includes(operation)) {
                    planPayload.terminationReason = terminationReason || "";
                }

                form.append('uploadPlanOperationRequest', JSON.stringify(planPayload), {
                    contentType: 'application/json'
                });

                API_URL = `${getJavaApiServiceUrl()}/crm/v1/uploadPlanOperation`;


            } else {
                const paymentPayload: {
                    operation: string;
                    module: string;
                    creditLimitType: string;
                    adjustmentType: string;
                    collectedBy?: string;
                    plant?: string;
                    storeLocation?: string;
                } = {
                    operation: operation || "",
                    module: module || "",
                    creditLimitType: creditLimitType || "",
                    adjustmentType: adjustmentType || ""
                };

                if (operation === "HARDWARE_PAYMENT") {
                    paymentPayload.collectedBy = collectedBy || "";
                    paymentPayload.plant = plant || "";
                    paymentPayload.storeLocation = storeLocation || "";
                }

                form.append('uploadPaymentRequest', JSON.stringify(paymentPayload), {
                    contentType: 'application/json'
                });

                API_URL = `${getJavaApiServiceUrl()}/payments/bulk/v1/uploadPaymentService`;

            }

            form.append('excelFile', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            const response = await axios.post(API_URL, form, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            return res.status(response.status).json(response.data);

        } catch (error: any) {

            if (error.response) {
                return res.status(error.response.status).send(error.response.data);
            }

            res.status(500).json({
                statusMessage: 'Internal Server Error during upload proxy',
                details: error.message
            });
        }
    }

    // NEW: Fetch Bulk Upload Details
    static async fetchBulkUploadDetails(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const { actionSubType, fromDate, toDate, status, offSet, limit } = req.body;

            // Validate mandatory fields
            if (!fromDate || !toDate) {
                return res.status(400).json({
                    statusMessage: 'fromDate and toDate are mandatory fields'
                });
            }

            const requestPayload: {
                fromDate: string;
                toDate: string;
                offSet: number;
                limit: number;
                actionSubType?: string;
                status?: string;
            } = {
                fromDate,
                toDate,
                offSet: offSet || 0,
                limit: limit || 100
            };

            // Add optional fields if provided
            if (actionSubType) {
                requestPayload.actionSubType = actionSubType;
            }
            if (status) {
                requestPayload.status = status;
            }

            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/bulkUploadDetails`;


            const response = await axios.post(API_URL, requestPayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.status(response.status).json(response.data);

        } catch (error: any) {
            if (error.response) {
                return res.status(error.response.status).send(error.response.data);
            }

            res.status(500).json({
                statusMessage: 'Internal Server Error fetching bulk upload details',
                details: error.message
            });
        }
    }

    // NEW: Fetch Bulk Record Details
    static async fetchBulkRecordDetails(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const { actionSubType, type, blkId, status, offSet, limit } = req.body;

            // Validate mandatory fields
            if (!blkId || !type) {
                return res.status(400).json({
                    statusMessage: 'blkId and type are mandatory fields'
                });
            }

            const requestPayload: {
                blkId: string;
                type: string;
                offSet: number;
                limit: number;
                actionSubType?: string;
                status?: string;
            } = {
                blkId: String(blkId),
                type,
                offSet: offSet || 0,
                limit: limit || 100
            };

            // Add optional fields if provided
            if (actionSubType) {
                requestPayload.actionSubType = actionSubType;
            }
            if (status) {
                requestPayload.status = status;
            }

            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/bulkRecordDetails`;


            const response = await axios.post(API_URL, requestPayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.status(response.status).json(response.data);

        } catch (error: any) {
            if (error.response) {
                return res.status(error.response.status).send(error.response.data);
            }

            res.status(500).json({
                statusMessage: 'Internal Server Error fetching bulk record details',
                details: error.message
            });
        }
    }
}

const bulkRouter = Router();

// Existing route
bulkRouter.post('/process', upload.single('excelFile'), BulkController.processUpload);

// NEW routes
bulkRouter.post('/bulk-upload-details', BulkController.fetchBulkUploadDetails);
bulkRouter.post('/bulk-record-details', BulkController.fetchBulkRecordDetails);

export default bulkRouter;
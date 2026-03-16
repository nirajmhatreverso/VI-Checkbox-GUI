// server/controllers/customer.controller.ts (Updated)

import { sendPasswordResetEmail } from '@/lib/email';
import { Request, Response, Router } from 'express';
import { decryptPassword } from 'server/encryption';
import { Readable } from 'stream';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) throw new Error("SERVER_API_TARGET_URL is not defined.");
    return apiUrl.replace(/\/$/, "");
}

async function streamToResponse(body: ReadableStream<Uint8Array>, res: Response) {
    // Convert the modern ReadableStream to a classic Node.js Readable stream
    const nodeStream = Readable.fromWeb(body as any);
    // Pipe it to the Express response object
    nodeStream.pipe(res);
}

// Generic helper for proxying POST requests
async function proxyPostRequest(req: Request, res: Response, javaEndpoint: string, body?: any) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body || req.body)
        });
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

async function proxyBlobRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

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

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            return res.status(apiResponse.status).send(errorText);
        }

        // Forward the content type (e.g., image/png, application/pdf)
        const contentType = apiResponse.headers.get("content-type");
        if (contentType) res.setHeader("Content-Type", contentType);

        // Pipe the blob data to the response
        const arrayBuffer = await apiResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

// Helper for multipart/form-data proxying
async function proxyFormDataRequest(req: Request, res: Response, javaEndpoint: string) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
        const API_URL = `${getJavaApiServiceUrl()}${javaEndpoint}`;
        const contentType = req.headers['content-type'];
        if (!contentType) {
            throw new Error("Content-Type header is missing from the request.");
        }

        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': contentType,
            },
            body: req as any,
            // @ts-ignore
            duplex: 'half'
        });

        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ statusMessage: 'Internal Server Error' });
    }
}

export class CustomerController {
    /**
     * PROXY FOR: /crm/v1/get/Customer (for listing customers)
     */
    static listCustomers(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/get/Customer');
    }

    /**
     * PROXY FOR: /crm/v1/fetch/customerFilter (for searching)
     */
    static searchCustomers(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetch/customerFilter');
    }

    /**
     * PROXY FOR: /crm/v1/fetchBalanceBySapBpId
     */
    static getBalance(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/fetchBalanceBySapBpId');
    }

    /**
     * PROXY FOR: /crm/v1/customer/registration (for creating a customer)
     */
    static createCustomer(req: Request, res: Response) {
        proxyFormDataRequest(req, res, '/crm/v1/customer/registration');
    }

    /**
     * PROXY FOR: /crm/v1/customer/registration/update (for pre-approval updates)
     */
    static updateCustomerPreApproval(req: Request, res: Response) {
        proxyFormDataRequest(req, res, '/crm/v1/customer/registration/update');
    }

    /**
     * PROXY FOR: /crm/v1/customer/update (for post-approval updates)
     */
    static updateCustomerPostApproval(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        // This is a special handler for PUT requests
        const makeRequest = async () => {
            try {
                const API_URL = `${getJavaApiServiceUrl()}/crm/v1/customer/update`;
                const apiResponse = await fetch(API_URL, {
                    method: 'PUT', // Correctly uses PUT
                    headers: {
                        'Content-Type': 'application/json', // Correctly sends JSON
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(req.body) // Correctly sends the JSON body
                });
                const data = await apiResponse.json();
                res.status(apiResponse.status).json(data);
            } catch (error) {
                res.status(500).json({ statusMessage: 'Internal Server Error' });
            }
        }
        makeRequest();
    }

    /**
     * PROXY FOR: /crm/v1/customer/kyc-action (for approve/reject)
     */
    static kycAction(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/customer/kyc-action');
    }

    /**
     * PROXY FOR: /crm/v1/customer/retry
     */
    static retryCustomer(req: Request, res: Response) {
        // The frontend sends { custId: "123" } in the body
        const { custId } = req.body;

        if (!custId) {
            return res.status(400).json({ statusMessage: "Customer ID (custId) is required for retry." });
        }

        // Construct the dynamic endpoint
        const dynamicEndpoint = `/crm/v1/customer/${custId}/retry`;

        // Call the proxy with the correct path
        proxyPostRequest(req, res, dynamicEndpoint);
    }
    static approveCustomer(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/customer/approve');
    }
    /**
     * PROXY FOR: /crm/v1/validate/customer (for mobile validation)
     */
    static validateMobile(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/validate/customer');
    }

    /**
     * PROXY FOR: /crm/v1/customer/audit-logs/{onbId}
     */
    static async fetchAuditLogs(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            // Target the generic audit search endpoint in Java
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/userAudit`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(req.body) // Forward the payload (requestTnxId, type, etc.)
            });

            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } catch (error) {
            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }
    static getCurrency(req: Request, res: Response) {
        proxyPostRequest(req, res, '/crm/v1/get/Currency', 'POST');
    }
    static async previewKycFile(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).send('Unauthorized');

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/previewKycFile`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(req.body)
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                return res.status(apiResponse.status).send(errorText);
            }

            if (apiResponse.body) {
                res.setHeader('Content-Type', apiResponse.headers.get('content-type') || 'application/octet-stream');
                await streamToResponse(apiResponse.body, res);
            } else {
                res.status(204).send();
            }

        } catch (error: any) {
            res.status(500).send('Internal Server Error');
        }
    }
    static async downloadKycFile(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).send('Unauthorized');

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/downloadKycFile`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(req.body)
            });

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                return res.status(apiResponse.status).send(errorText);
            }

            if (apiResponse.body) {
                const disposition = apiResponse.headers.get('content-disposition');
                if (disposition) {
                    res.setHeader('Content-Disposition', disposition);
                }
                res.setHeader('Content-Type', apiResponse.headers.get('content-type') || 'application/octet-stream');
                await streamToResponse(apiResponse.body, res);
            } else {
                res.status(204).send();
            }

        } catch (error: any) {
            res.status(500).send('Internal Server Error');
        }
    }
    static async resetPassword(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        const { userName, email, name } = req.body;

        // Validate required fields
        if (!userName) {
            return res.status(400).json({
                status: 'ERROR',
                statusMessage: 'userName is required'
            });
        }

        if (!email) {
            return res.status(400).json({
                status: 'ERROR',
                statusMessage: 'email is required to send password'
            });
        }

        try {
            // Step 1: Call Java API to reset password
            const RESET_API_URL = `${getJavaApiServiceUrl()}/crm/v1/resetPassword`;

            const resetResponse = await fetch(RESET_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userName })
            });

            const resetData = await resetResponse.json();


            // Check if reset was successful
            if (resetData.status !== 'SUCCESS' || !resetData.data?.value) {
                return res.status(resetResponse.status >= 400 ? resetResponse.status : 400).json({
                    status: 'ERROR',
                    statusMessage: resetData.statusMessage || 'Password reset failed from Java API',
                    data: resetData.data
                });
            }

            // ✅ Step 2: IMMEDIATELY send success response to user
            res.status(200).json({
                status: 'SUCCESS',
                statusCode: 200,
                statusMessage: `Password reset successfully. New password will be sent to ${email}`,
                data: {
                    userName: resetData.data.userName,
                    name: resetData.data.name,
                    emailAddress: email
                }
            });

            // ✅ Step 3: Process decryption and email in background
            const encryptedPassword = resetData.data.value;
            const customerName = name || resetData.data.name || 'Customer';

            setImmediate(async () => {
                try {
                    // Decrypt password
                    const decryptedPassword = decryptPassword(encryptedPassword);

                    // Send email
                    const emailSent = await sendPasswordResetEmail(
                        email,
                        customerName,
                        userName,
                        decryptedPassword
                    );

                    if (emailSent) {
                        // Email sent
                    } else {

                    }

                } catch (backgroundError: any) {

                }
            });

        } catch (error: any) {
            if (!res.headersSent) {
                res.status(500).json({
                    status: 'ERROR',
                    statusMessage: 'Internal Server Error during password reset',
                    error: error.message
                });
            }
        }
    }

}

const customerRouter = Router();

// Existing routes
customerRouter.post('/search', CustomerController.searchCustomers);
customerRouter.post('/balance', CustomerController.getBalance);

// ✅ Add new routes for the onboarding feature
customerRouter.post('/list', CustomerController.listCustomers);
customerRouter.post('/create', CustomerController.createCustomer);
customerRouter.post('/update-pre-approval', CustomerController.updateCustomerPreApproval);
customerRouter.put('/update-post-approval', CustomerController.updateCustomerPostApproval);
customerRouter.post('/kyc-action', CustomerController.kycAction);
customerRouter.post('/retry', CustomerController.retryCustomer);
customerRouter.post('/validate-mobile', CustomerController.validateMobile);
customerRouter.post('/audit-logs', CustomerController.fetchAuditLogs);
customerRouter.post('/approve', CustomerController.approveCustomer);
customerRouter.post('/get-currency', CustomerController.getCurrency);
customerRouter.post('/preview-kyc', CustomerController.previewKycFile); // New Route
customerRouter.post('/download-kyc', CustomerController.downloadKycFile);
customerRouter.post('/reset-password', CustomerController.resetPassword);
export default customerRouter;
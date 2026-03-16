// server/controllers/kyc.controller.ts (New File)

import { Request, Response, Router } from 'express';
import { Readable } from 'stream';

const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, ""); // Remove trailing slash
}

// Helper to stream a modern ReadableStream to an Express response
async function streamToResponse(body: ReadableStream<Uint8Array>, res: Response) {
    const nodeStream = Readable.fromWeb(body as any);
    nodeStream.pipe(res);
}

export class KycController {

    /**
     * PROXY FOR: /crm/v1/fetch/agents (Used by kyc-verification page)
     */
    static async fetchAgentsForKyc(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/agents`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(req.body)
            });

            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } catch (error: any) {
            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }

    /**
     * PROXY FOR: /crm/v1/previewKycFile (Used by details modals)
     */
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

    /**
     * PROXY FOR: /crm/v1/downloadKycFile (Used by details modals)
     */
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

            const disposition = apiResponse.headers.get('content-disposition');
            if (disposition) {
                res.setHeader('Content-Disposition', disposition);
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
}

// --- EXPRESS ROUTER SETUP ---
const kycRouter = Router();

kycRouter.post('/fetch-agents', KycController.fetchAgentsForKyc);
kycRouter.post('/preview', KycController.previewKycFile);
kycRouter.post('/download', KycController.downloadKycFile);

export default kycRouter;
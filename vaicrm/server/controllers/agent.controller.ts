// server/controllers/agent.controller.ts

import { Request, Response, Router } from 'express';
import { Readable } from 'stream';
import FormData from 'form-data';
import multer from 'multer';
import { decryptPassword } from '../encryption';
import { sendPasswordResetEmail } from '../../client/src/lib/email';

// Use memoryStorage for multer
const upload = multer({ storage: multer.memoryStorage() });

// Helper to get the Java API base URL
const getJavaApiServiceUrl = (): string => {
    const apiUrl = process.env.SERVER_API_TARGET_URL;
    if (!apiUrl) {
        throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
    }
    return apiUrl.replace(/\/$/, "");
}

// Helper function to stream a modern ReadableStream to an Express response
async function streamToResponse(body: ReadableStream<Uint8Array>, res: Response) {
    const nodeStream = Readable.fromWeb(body as any);
    nodeStream.pipe(res);
}

export class AgentController {

    /**
     * PROXY FOR: Fetching the list of agents with filters.
     */
    static async fetchAgents(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/agents`;

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
        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }

    static async searchAgentsFilter(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/agentsFilter`;

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
     * PROXY FOR: Creating a new agent (handles file uploads).
     */
    static async createAgent(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/agents/registration`;
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
            if (!apiResponse.ok) {

            }
            res.status(apiResponse.status).json(data);

        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error while proxying request' });
        }
    }

    /**
     * PROXY FOR: Updating an agent (can be JSON or FormData).
     */
    static async updateRegistration(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) {
            return res.status(401).json({ statusMessage: 'Unauthorized' });
        }

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/agents/registration/update`;
            const contentType = req.headers['content-type'];

            if (!contentType) {
                return res.status(400).json({ statusMessage: 'Content-Type header is missing' });
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
            if (!apiResponse.ok) {

            }

            res.status(apiResponse.status).json(data);

        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error while proxying request' });
        }
    }

    static async updateDetails(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/agents/update`;

            const apiResponse = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(req.body)
            });

            const data = await apiResponse.json();
            res.status(apiResponse.status).json(data);
        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error during post-approval update' });
        }
    }

    /**
     * PROXY FOR: Approving or Rejecting an agent's KYC.
     */
    static async kycAction(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/agents/approve`;

            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(req.body)
            });

            const data = await apiResponse.json();

            // ✅ Log the full response for debugging
            console.log('🔍 KYC Action API Response:', JSON.stringify(data, null, 2));

            // ✅ Step 1: Always send the response to the frontend first
            res.status(apiResponse.status).json(data);

            // ✅ Step 2: Check if approval was successful
            if (
                data.status === 'SUCCESS' &&
                data.data &&
                data.data.userName &&
                data.data.password
            ) {
                const responseData = data.data;

                console.log('📋 Extracted data for welcome email:', {
                    agentId: responseData.agentId,
                    agentName: responseData.agentName,
                    email: responseData.email,
                    hasUserName: !!responseData.userName,
                    hasPassword: !!responseData.password,
                    userNameLength: responseData.userName?.length,
                    passwordLength: responseData.password?.length,
                    // Log first few chars to debug (safe, encrypted)
                    userNamePreview: responseData.userName?.substring(0, 10) + '...',
                    passwordPreview: responseData.password?.substring(0, 10) + '...'
                });

                // Validate we have email
                if (!responseData.email) {
                    console.warn('⚠️ No email address in response, cannot send welcome email');
                    return;
                }

                // ✅ Step 3: Process email in background (non-blocking)
                setImmediate(async () => {
                    try {
                        // Import the welcome email function
                        const { sendWelcomeEmail } = await import('../../client/src/lib/email');

                        // Debug: Log encrypted values
                        console.log('🔐 Attempting to decrypt credentials...');
                        console.log('   Encrypted userName:', responseData.userName);
                        console.log('   Encrypted password:', responseData.password);

                        // Decrypt credentials
                        let decryptedUserName: string;
                        let decryptedPassword: string;

                        try {
                            decryptedUserName = decryptPassword(responseData.userName);
                            console.log('✅ Username decrypted successfully, length:', decryptedUserName.length);
                        } catch (decryptError: any) {
                            console.error('❌ Failed to decrypt username:', decryptError.message);
                            decryptedUserName = ''; // Fallback
                        }

                        try {
                            decryptedPassword = decryptPassword(responseData.password);
                            console.log('✅ Password decrypted successfully, length:', decryptedPassword.length);
                        } catch (decryptError: any) {
                            console.error('❌ Failed to decrypt password:', decryptError.message);
                            decryptedPassword = ''; // Fallback
                        }

                        // Debug: Log decrypted values (only first 2 chars for safety)
                        console.log('🔓 Decryption results:', {
                            userNameDecrypted: decryptedUserName ? `${decryptedUserName.substring(0, 2)}***` : 'EMPTY',
                            passwordDecrypted: decryptedPassword ? `${decryptedPassword.substring(0, 2)}***` : 'EMPTY',
                            userNameLength: decryptedUserName.length,
                            passwordLength: decryptedPassword.length
                        });

                        // Check if decryption produced valid results
                        if (!decryptedUserName || !decryptedPassword) {
                            console.error('❌ Decryption returned empty values! Check encryption.ts');
                            console.error('   This might mean the encryption algorithm/keys don\'t match the backend');
                            return;
                        }

                        console.log('📧 Sending welcome email to:', responseData.email);

                        // Send welcome email
                        const emailSent = await sendWelcomeEmail(
                            responseData.email,
                            responseData.agentName || 'Agent',
                            decryptedUserName,
                            decryptedPassword,
                            responseData.agentId
                        );

                        if (emailSent) {
                            console.log('✅ Welcome email sent successfully to:', responseData.email);
                        } else {
                            console.error('❌ Failed to send welcome email to:', responseData.email);
                        }

                    } catch (backgroundError: any) {
                        console.error('❌ Background error while sending welcome email:', {
                            error: backgroundError.message,
                            stack: backgroundError.stack
                        });
                    }
                });
            } else {
                console.log('ℹ️ Not sending welcome email - conditions not met:', {
                    status: data.status,
                    hasData: !!data.data,
                    hasUserName: !!data.data?.userName,
                    hasPassword: !!data.data?.password
                });
            }

        } catch (error: any) {
            console.error('❌ Error in kycAction:', error);

            if (!res.headersSent) {
                res.status(500).json({ statusMessage: 'Internal Server Error' });
            }
        }
    }

    /**
     * PROXY FOR: Fetching KYC file previews.
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
     * PROXY FOR: Downloading KYC files.
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

    /**
     * PROXY FOR: Fetching audit logs for an agent.
     */
    static async fetchAuditLogs(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/userAudit`;

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
        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }

    /**
     * PROXY FOR: Searching for a parent agent.
     */
    static async verifyParent(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/agentsFilter`;

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

    static async retryAgent(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({ statusMessage: "Agent ID is required for retry." });
        }
        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/agents/${agentId}/retry`;
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

    static async searchUserDetails(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/userDetailsByType`;

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

    static async subAgentSearch(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/subAgentSearch`;

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
     * Reset Password - Calls Java API, decrypts password, sends email
     */
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
            // Don't wait for decryption and email sending
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

            // ✅ Step 3: Process decryption and email in background (fire and forget)
            const encryptedPassword = resetData.data.value;
            const agentName = name || resetData.data.name || 'User';

            // Use setImmediate to ensure response is sent before processing
            setImmediate(async () => {
                try {
                    // Decrypt password
                    const decryptedPassword = decryptPassword(encryptedPassword);

                    // Send email
                    const emailSent = await sendPasswordResetEmail(
                        email,
                        agentName,
                        userName,
                        decryptedPassword
                    );

                    if (emailSent) {
                        // Email sent
                    } else {

                    }

                } catch (backgroundError: any) {
                    // Log the error but don't affect the already-sent response


                    // TODO: You could implement retry logic or notify admin here
                    // Example: await notifyAdminOfFailedEmail(email, userName, backgroundError);
                }
            });

        } catch (error: any) {


            // Only send error response if response hasn't been sent yet
            if (!res.headersSent) {
                res.status(500).json({
                    status: 'ERROR',
                    statusMessage: 'Internal Server Error during password reset',
                    error: error.message
                });
            }
        }
    }

    static async subAgentStockTransfer(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/subAgentStockTransfer`;

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
        } catch (error: any) {

            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }

    static async subAgentToAgentStockTransfer(req: Request, res: Response) {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

        try {
            const API_URL = `${getJavaApiServiceUrl()}/crm/v1/subAgentToAgentStockTransfer`;

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
        } catch (error: any) {
            res.status(500).json({ statusMessage: 'Internal Server Error' });
        }
    }
}

// --- EXPRESS ROUTER SETUP ---
const agentRouter = Router();

agentRouter.post('/fetch', AgentController.fetchAgents);
agentRouter.post('/registration', AgentController.createAgent);
agentRouter.post('/registration/update', AgentController.updateRegistration);
agentRouter.put('/details/update', AgentController.updateDetails);
agentRouter.post('/kyc-action', AgentController.kycAction);
agentRouter.post('/preview-kyc', AgentController.previewKycFile);
agentRouter.post('/download-kyc', AgentController.downloadKycFile);
agentRouter.post('/audit-logs', AgentController.fetchAuditLogs);
agentRouter.post('/verify-parent', AgentController.verifyParent);
agentRouter.post('/retry', AgentController.retryAgent);
agentRouter.post('/search-filter', AgentController.searchAgentsFilter);
agentRouter.post('/user-details', AgentController.searchUserDetails);
agentRouter.post('/sub-agent-search', AgentController.subAgentSearch);

// NEW: Reset Password Route
agentRouter.post('/reset-password', AgentController.resetPassword);

// NEW: Sub-Agent Stock Transfer Route
agentRouter.post('/subAgentStockTransfer', AgentController.subAgentStockTransfer);
agentRouter.post('/subAgentToAgentStockTransfer', AgentController.subAgentToAgentStockTransfer);

export default agentRouter;
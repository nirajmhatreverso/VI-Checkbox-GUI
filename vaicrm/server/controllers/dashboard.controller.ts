// === DASHBOARD CONTROLLER ===
// Organized dashboard data logic

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

export class DashboardController {

  static async getDashboardSubsCount(req: Request, res: Response) {
    proxyRequest(req, res, '/crm/v1/dashboardSubsCount');
  }

  static async getSystemStatus(req: Request, res: Response) {
    try {
      // Simplified status for ping check
      res.json({ status: 'operational' });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system status" });
    }
  }
}

const dashboardRouter = Router();

dashboardRouter.get('/system-status', DashboardController.getSystemStatus);
dashboardRouter.post('/subs-count', DashboardController.getDashboardSubsCount);

export default dashboardRouter;

// server/controllers/agent-stock.controller.ts

import { Request, Response, Router } from "express";

// Helper to get the Java API base URL and handle errors
const getJavaApiServiceUrl = (): string => {
  const apiUrl = process.env.SERVER_API_TARGET_URL;
  if (!apiUrl) {
    throw new Error(
      "SERVER_API_TARGET_URL is not defined in the environment variables."
    );
  }
  return apiUrl.replace(/\/$/, ""); // Remove trailing slash if it exists
};

// This is our controller class for Agent Stock Overview
export class AgentStockController {
  /**
   * PROXY FOR: Fetching agent stock with filters and pagination.
   */
  static async fetchAgentStockFilter(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    try {
      const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/agentStockFilter`;

      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res
        .status(500)
        .json({ statusMessage: "Internal Server Error while fetching agent stock" });
    }
  }

  /**
   * PROXY FOR: Fetching common config for status updates.
   * 
   * Used to get allowed status transitions based on current status.
   */
  static async fetchStatusConfig(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    try {
      const API_URL = `${getJavaApiServiceUrl()}/crm/v1/fetch/commonConfig`;

      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res
        .status(500)
        .json({ statusMessage: "Internal Server Error while fetching status config" });
    }
  }

  /**
   * PROXY FOR: Updating agent stock status.
   * 
   * Expected request body:
   * {
   *   consignmentStockDetailsList: [
   *     {
   *       sapBpId: string;
   *       deviceSerialNo: string;
   *       currentStatus: string;
   *       newStatus: string;
   *     }
   *   ]
   * }
   */
  static async updateAgentStock(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    try {
      const API_URL = `${getJavaApiServiceUrl()}/crm/v1/updateAgentStock`;

      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await apiResponse.json();
      res.status(apiResponse.status).json(data);
    } catch (error: any) {
      res
        .status(500)
        .json({ statusMessage: "Internal Server Error while updating agent stock" });
    }
  }
}

// --- EXPRESS ROUTER SETUP ---
const agentStockRouter = Router();

agentStockRouter.post(
  "/search-filter",
  AgentStockController.fetchAgentStockFilter
);

agentStockRouter.post(
  "/status-config",
  AgentStockController.fetchStatusConfig
);

agentStockRouter.post(
  "/update",
  AgentStockController.updateAgentStock
);

export default agentStockRouter;
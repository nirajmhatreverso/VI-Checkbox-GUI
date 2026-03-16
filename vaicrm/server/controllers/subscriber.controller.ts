import { Request, Response } from "express";
import { storage } from "../storage";

export class SubscriberController {
  static async getSubscriberDetails(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const subscriberDetails = await storage.getSubscriberDetails(customerId);

      if (!subscriberDetails) {
        return res.status(404).json({ message: "Subscriber not found" });
      }

      res.json(subscriberDetails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getSubscriptionHistory(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const subscriptionHistory = await storage.getSubscriptionHistory(customerId);
      res.json(subscriptionHistory);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const paymentHistory = await storage.getPaymentHistory(customerId);
      res.json(paymentHistory);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getServiceActions(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const serviceActions = await storage.getServiceActions(customerId);
      res.json(serviceActions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getServiceTickets(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const serviceTickets = await storage.getServiceTickets(customerId);
      res.json(serviceTickets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAutoRenewalSettings(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const autoRenewalSettings = await storage.getAutoRenewalSettings(customerId);

      if (!autoRenewalSettings) {
        // Return default settings if none exist
        return res.json({
          enabled: false,
          nextRenewalDate: "",
          renewalCount: 0,
          lastRenewalDate: ""
        });
      }

      res.json(autoRenewalSettings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateAutoRenewalSettings(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const settings = req.body;

      const updatedSettings = await storage.updateAutoRenewalSettings(customerId, settings);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getInvoices(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const invoices = await storage.getInvoices(customerId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
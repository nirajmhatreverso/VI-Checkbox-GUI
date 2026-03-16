// === PAYMENT CONTROLLER ===
// Handles payment-related operations

import { Request, Response } from 'express';

export class PaymentController {
  static async getPayments(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const payments = await storage.getPayments();
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  }

  static async getPayment(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const id = parseInt(req.params.id);
      const payment = await storage.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  }

  static async createPayment(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const payment = await storage.createPayment(req.body);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  }

  static async updatePayment(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const id = parseInt(req.params.id);
      const payment = await storage.updatePayment(id, req.body);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({ success: true, data: payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment" });
    }
  }

  static async deletePayment(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePayment(id);

      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment" });
    }
  }
}
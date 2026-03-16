// === RECEIPT CANCELLATION CONTROLLER ===
// Handles receipt cancellation operations with role-based access control

import { Request, Response } from 'express';
import { insertReceiptCancellationSchema } from '@shared/schema';

export class ReceiptCancellationController {
  // Get eligible receipts for cancellation with filters
  static async getEligibleReceipts(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();

      // Extract query parameters for filtering
      const {
        dateFrom,
        dateTo,
        customerId,
        agentId,
        paymentMode,
        page = 1,
        limit = 20
      } = req.query;

      // Get current user from session to check role
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has permission to cancel receipts
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          message: "Insufficient permissions for receipt cancellation",
          requiredRoles: allowedRoles
        });
      }

      const receipts = await storage.getEligibleReceiptsForCancellation({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        customerId: customerId as string,
        agentId: agentId as string,
        paymentMode: paymentMode as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: receipts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: receipts.length
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch eligible receipts" });
    }
  }

  // Get receipt details for cancellation review
  static async getReceiptDetails(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const payId = req.params.payId;

      // Get current user from session to check role
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has permission to view receipt details
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          message: "Insufficient permissions for receipt cancellation"
        });
      }

      const receipt = await storage.getReceiptForCancellation(payId);

      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }

      // Check if receipt is eligible for cancellation
      const isEligible = await storage.isReceiptEligibleForCancellation(payId);
      if (!isEligible.eligible) {
        return res.status(400).json({
          message: "Receipt not eligible for cancellation",
          reason: isEligible.reason
        });
      }

      res.json({
        success: true,
        data: {
          ...receipt,
          cancellationEligibility: isEligible
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receipt details" });
    }
  }

  // Cancel receipt - main cancellation endpoint
  static async cancelReceipt(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = insertReceiptCancellationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.issues
        });
      }

      const { payId, cancellationReason } = validationResult.data;

      // Get current user from session
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has permission to cancel receipts
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          message: "Insufficient permissions for receipt cancellation"
        });
      }

      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();

      // Check if receipt exists and is eligible for cancellation
      const eligibilityCheck = await storage.isReceiptEligibleForCancellation(payId);
      if (!eligibilityCheck.eligible) {
        return res.status(400).json({
          message: "Receipt not eligible for cancellation",
          reason: eligibilityCheck.reason
        });
      }

      // Process cancellation
      const cancellationResult = await storage.cancelReceipt({
        payId,
        cancellationReason,
        cancelledBy: currentUser.id.toString(),
        cancellationDate: new Date(),
        originalStatus: eligibilityCheck.currentStatus || 'UNKNOWN'
      });

      if (!cancellationResult.success) {
        return res.status(500).json({
          message: "Failed to process cancellation",
          error: cancellationResult.error
        });
      }

      // Simulate CM integration call
      const cmIntegrationResult = await ReceiptCancellationController.integrateCMCancellation(
        payId,
        cancellationReason,
        currentUser.id.toString()
      );

      // Update cancellation with CM status
      await storage.updateCancellationCMStatus(payId, {
        cmRequestId: cmIntegrationResult.requestId,
        cmStatus: cmIntegrationResult.status,
        cmStatusMsg: cmIntegrationResult.message
      });

      // Handle wallet adjustment for prepaid customers
      let walletAdjustment = null;
      if (cancellationResult.data.paymentDetails.customerType === 'PREPAID') {
        walletAdjustment = await storage.adjustWalletForCancellation(
          cancellationResult.data.paymentDetails.customerId,
          cancellationResult.data.paymentDetails.totalAmount
        );
      }

      res.json({
        success: true,
        message: "Receipt cancellation processed successfully",
        data: {
          payId,
          cancellationStatus: 'INITIATED',
          cmStatus: cmIntegrationResult.status,
          walletAdjustment: walletAdjustment,
          auditTrail: {
            cancelledBy: currentUser.username,
            cancellationDate: new Date(),
            reason: cancellationReason
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel receipt" });
    }
  }

  // Get cancellation audit trail
  static async getCancellationAudit(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const payId = req.params.payId;

      // Get current user from session to check role
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const auditTrail = await storage.getCancellationAuditTrail(payId);

      if (!auditTrail) {
        return res.status(404).json({ message: "Audit trail not found" });
      }

      res.json({
        success: true,
        data: auditTrail
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  }

  // Check cancellation status
  static async getCancellationStatus(req: Request, res: Response) {
    try {
      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();
      const payId = req.params.payId;

      const status = await storage.getCancellationStatus(payId);

      if (!status) {
        return res.status(404).json({ message: "Cancellation status not found" });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cancellation status" });
    }
  }

  // Private method to integrate with Central Module (CM)
  private static async integrateCMCancellation(
    payId: string,
    reason: string,
    userId: string
  ): Promise<{ requestId: string; status: string; message: string }> {
    try {
      // Simulate CM API call - in real implementation, this would be an actual REST API call
      const cmRequestId = `CM_CANCEL_${payId}_${Date.now()}`;

      // Mock CM response - in real implementation, this would be the actual response from CM
      return {
        requestId: cmRequestId,
        status: 'PROCESSING',
        message: 'Cancellation request submitted to Central Module successfully'
      };
    } catch (error) {
      return {
        requestId: `CM_CANCEL_ERROR_${Date.now()}`,
        status: 'FAILED',
        message: 'Failed to submit cancellation to Central Module'
      };
    }
  }

  // Webhook endpoint for CM status updates
  static async updateCMStatus(req: Request, res: Response) {
    try {
      const { payId, cmStatus, cmStatusMsg, ficaStatus, ficaStatusMsg } = req.body;

      const { MemStorage } = await import("../storage");
      const storage = new MemStorage();

      await storage.updateCancellationCMStatus(payId, {
        cmStatus,
        cmStatusMsg,
        ficaStatus,
        ficaStatusMsg
      });

      res.json({
        success: true,
        message: "CM status updated successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update CM status" });
    }
  }
}
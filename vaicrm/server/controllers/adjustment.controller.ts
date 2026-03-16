import { Request, Response } from 'express';
import { storage } from '../storage';
import { AdjustmentRequest } from '@shared/schema';

export class AdjustmentController {

  // Get all adjustments
  static async getAdjustments(req: Request, res: Response) {
    try {
      const adjustments = await storage.getAdjustments();
      res.json(adjustments);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get adjustment by ID
  static async getAdjustmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adjustment = await storage.getAdjustmentById(parseInt(id));

      if (!adjustment) {
        return res.status(404).json({ message: 'Adjustment not found' });
      }

      res.json(adjustment);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get pending adjustments for approval
  static async getPendingAdjustments(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check user permissions for viewing pending adjustments
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: 'Insufficient permissions to view pending adjustments'
        });
      }

      const pendingAdjustments = await storage.getPendingAdjustments();
      res.json(pendingAdjustments);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get processed adjustments
  static async getProcessedAdjustments(req: Request, res: Response) {
    try {
      const processedAdjustments = await storage.getProcessedAdjustments();
      res.json(processedAdjustments);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Create new adjustment
  static async createAdjustment(req: Request, res: Response) {
    try {
      const adjustmentData: AdjustmentRequest = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Validate required fields
      if (!adjustmentData.bpId || !adjustmentData.type ||
        !adjustmentData.reason || !adjustmentData.amount) {
        return res.status(400).json({
          message: 'BP ID, type, reason, and amount are required'
        });
      }

      if (adjustmentData.amount <= 0) {
        return res.status(400).json({
          message: 'Amount must be greater than zero'
        });
      }

      // Get customer details to validate BP ID and get customer name
      const customerDetails = await storage.getCustomerDetailsByBpId(adjustmentData.bpId);
      if (!customerDetails) {
        return res.status(404).json({
          message: 'Customer not found with provided BP ID'
        });
      }

      // Create adjustment
      const adjustment = await storage.createAdjustment({
        bpId: adjustmentData.bpId,
        scId: adjustmentData.scId,
        customerName: customerDetails.name,
        type: adjustmentData.type,
        invoiceNumber: adjustmentData.invoiceNumber,
        reason: adjustmentData.reason,
        comments: adjustmentData.comments,
        amount: adjustmentData.amount,
        currency: adjustmentData.currency,
        walletType: adjustmentData.walletType,
        status: 'PENDING',
        requestedBy: (req as any).user?.username || 'system'
      });

      res.status(201).json({
        message: 'Adjustment request created successfully',
        adjustment
      });

    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Approve adjustment
  static async approveAdjustment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check user permissions for approval
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: 'Insufficient permissions for adjustment approval'
        });
      }

      const adjustment = await storage.getAdjustmentById(parseInt(id));
      if (!adjustment) {
        return res.status(404).json({ message: 'Adjustment not found' });
      }

      if (adjustment.status !== 'PENDING') {
        return res.status(400).json({
          message: `Cannot approve adjustment with status: ${adjustment.status}`
        });
      }

      const approvedAdjustment = await storage.approveAdjustment(
        parseInt(id),
        user.username || 'system'
      );

      res.json({
        message: 'Adjustment approved successfully',
        adjustment: approvedAdjustment
      });

    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Reject adjustment
  static async rejectAdjustment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check user permissions for rejection
      const allowedRoles = ['admin', 'manager', 'finance'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: 'Insufficient permissions for adjustment rejection'
        });
      }

      if (!rejectionReason || rejectionReason.trim().length < 10) {
        return res.status(400).json({
          message: 'Rejection reason is required (minimum 10 characters)'
        });
      }

      const adjustment = await storage.getAdjustmentById(parseInt(id));
      if (!adjustment) {
        return res.status(404).json({ message: 'Adjustment not found' });
      }

      if (adjustment.status !== 'PENDING') {
        return res.status(400).json({
          message: `Cannot reject adjustment with status: ${adjustment.status}`
        });
      }

      const rejectedAdjustment = await storage.rejectAdjustment(
        parseInt(id),
        user.username || 'system',
        rejectionReason
      );

      res.json({
        message: 'Adjustment rejected successfully',
        adjustment: rejectedAdjustment
      });

    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get customer details by BP ID
  static async getCustomerDetails(req: Request, res: Response) {
    try {
      const { bpId } = req.params;

      if (!bpId) {
        return res.status(400).json({ message: 'BP ID is required' });
      }

      const customerDetails = await storage.getCustomerDetailsByBpId(bpId);

      if (!customerDetails) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      res.json(customerDetails);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get customer details by SC ID
  static async getCustomerDetailsByScId(req: Request, res: Response) {
    try {
      const { scId } = req.params;

      if (!scId) {
        return res.status(400).json({ message: 'SC ID is required' });
      }

      const customerDetails = await storage.getCustomerDetailsByScId(scId);

      if (!customerDetails) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      res.json(customerDetails);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get adjustment statistics
  static async getAdjustmentStats(req: Request, res: Response) {
    try {
      const adjustments = await storage.getAdjustments();

      const stats = {
        total: adjustments.length,
        pending: adjustments.filter(adj => adj.status === 'PENDING').length,
        approved: adjustments.filter(adj => adj.status === 'APPROVED').length,
        rejected: adjustments.filter(adj => adj.status === 'REJECTED').length,
        processed: adjustments.filter(adj => adj.status === 'PROCESSED').length,
        totalAmount: adjustments.reduce((sum, adj) => {
          return sum + (adj.type === 'CREDIT' ? adj.amount : -adj.amount);
        }, 0),
        creditAmount: adjustments
          .filter(adj => adj.type === 'CREDIT')
          .reduce((sum, adj) => sum + adj.amount, 0),
        debitAmount: adjustments
          .filter(adj => adj.type === 'DEBIT')
          .reduce((sum, adj) => sum + adj.amount, 0)
      };

      res.json(stats);
    } catch (error) {

      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
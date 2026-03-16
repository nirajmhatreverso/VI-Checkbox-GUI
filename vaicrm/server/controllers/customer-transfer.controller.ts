import { Request, Response } from 'express';
import { storage } from '../storage';
import { CustomerTransferRequest } from '@shared/schema';

export class CustomerTransferController {

  // Get all customer transfers
  async getTransfers(req: Request, res: Response) {
    try {
      const transfers = await storage.getCustomerTransfers();
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get customer transfer by ID
  async getTransferById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfer = await storage.getCustomerTransferById(parseInt(id));

      if (!transfer) {
        return res.status(404).json({ message: 'Transfer not found' });
      }

      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Validate transfer eligibility
  async validateTransfer(req: Request, res: Response) {
    try {
      const { sourceCustomerId, targetCustomerId, amount } = req.body;

      // Basic validation
      if (!sourceCustomerId || !targetCustomerId || !amount) {
        return res.status(400).json({
          message: 'Source customer ID, target customer ID, and amount are required'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          message: 'Transfer amount must be greater than zero'
        });
      }

      const validation = await storage.validateTransferEligibility(
        parseInt(sourceCustomerId),
        parseInt(targetCustomerId),
        parseFloat(amount)
      );

      res.json(validation);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Create customer transfer
  async createTransfer(req: Request, res: Response) {
    try {
      const transferData: CustomerTransferRequest = req.body;
      const user = (req as any).user;

      // Validate required fields
      if (!transferData.sourceBpId || !transferData.targetBpId ||
        !transferData.sourceCustomerId || !transferData.targetCustomerId ||
        !transferData.transferAmount || !transferData.transferReason) {
        return res.status(400).json({
          message: 'All required fields must be provided'
        });
      }

      // Validate transfer eligibility first
      const validation = await storage.validateTransferEligibility(
        transferData.sourceCustomerId,
        transferData.targetCustomerId,
        transferData.transferAmount
      );

      if (!validation.eligible) {
        return res.status(400).json({
          message: 'Transfer not eligible',
          reason: validation.reason
        });
      }

      // Check invoice status if invoice number is provided
      let invoiceStatus = 'PENDING';
      let manualInterventionRequired = false;

      if (transferData.invoiceNumber) {
        const invoiceCheck = await storage.checkInvoiceStatus(transferData.invoiceNumber);
        invoiceStatus = invoiceCheck.status;
        manualInterventionRequired = invoiceCheck.requiresManualIntervention;
      }

      // Create transfer record
      const transfer = await storage.createCustomerTransfer({
        sourceBpId: transferData.sourceBpId,
        targetBpId: transferData.targetBpId,
        sourceCustomerId: transferData.sourceCustomerId,
        targetCustomerId: transferData.targetCustomerId,
        transferAmount: transferData.transferAmount,
        currency: transferData.currency || '',
        transferReason: transferData.transferReason,
        paymentType: transferData.paymentType || 'SUBSCRIPTION',
        paymentId: transferData.paymentId,
        invoiceNumber: transferData.invoiceNumber,
        invoiceStatus: invoiceStatus as any,
        manualInterventionRequired,
        status: 'INPROGRESS',
        createId: user?.username || 'system'
      });

      // If manual intervention is required, update the status
      if (manualInterventionRequired) {
        await storage.updateCustomerTransfer(transfer.id, {
          status: 'APPROVED', // Auto-approve but flag for manual intervention
          cmStatus: 'MANUAL_INTERVENTION_REQUIRED',
          cmStatusMessage: 'Invoice already cleared - manual intervention required for reversal'
        });
      } else {
        // Simulate CM processing
        setTimeout(async () => {
          await storage.updateTransferCMStatus(transfer.id, {
            cmStatus: 'PROCESSING',
            cmStatusMessage: 'Transfer submitted to Central Module',
            ficaStatus: 'PENDING',
            ficaStatusMessage: 'Awaiting FICA processing',
            requestId: `CM-${Date.now()}`
          });
        }, 1000);
      }

      res.status(201).json({
        message: 'Transfer created successfully',
        transfer: await storage.getCustomerTransferById(transfer.id)
      });

    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Update transfer status (for approval workflow)
  async updateTransferStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason, approvedBy } = req.body;
      const user = (req as any).user;

      const transfer = await storage.getCustomerTransferById(parseInt(id));
      if (!transfer) {
        return res.status(404).json({ message: 'Transfer not found' });
      }

      // Check user permissions for approval
      if (!['admin', 'finance', 'manager'].includes(user?.role)) {
        return res.status(403).json({
          message: 'Insufficient permissions for transfer approval'
        });
      }

      const updateData: any = {
        status,
        updateId: user?.username || 'system'
      };

      if (status === 'APPROVED') {
        updateData.cmStatus = 'APPROVED';
        updateData.cmStatusMessage = `Transfer approved by ${approvedBy || user?.username}`;

        // Simulate further processing
        setTimeout(async () => {
          await storage.updateTransferCMStatus(parseInt(id), {
            cmStatus: 'PROCESSING',
            cmStatusMessage: 'Transfer being processed by CM',
            ficaStatus: 'PROCESSING',
            ficaStatusMessage: 'Payment reversal in progress'
          });

          // Final completion after another delay
          setTimeout(async () => {
            await storage.updateCustomerTransfer(parseInt(id), {
              status: 'COMPLETED'
            });
            await storage.updateTransferCMStatus(parseInt(id), {
              cmStatus: 'COMPLETED',
              cmStatusMessage: 'Transfer completed successfully',
              ficaStatus: 'COMPLETED',
              ficaStatusMessage: 'Payment successfully transferred',
              somStatus: 'COMPLETED',
              somStatusMessage: 'Subscription updated for target customer'
            });
          }, 3000);
        }, 2000);

      } else if (status === 'REJECTED') {
        updateData.cmStatus = 'REJECTED';
        updateData.cmStatusMessage = `Transfer rejected: ${reason || 'No reason provided'}`;
      }

      await storage.updateCustomerTransfer(parseInt(id), updateData);

      const updatedTransfer = await storage.getCustomerTransferById(parseInt(id));
      res.json({
        message: 'Transfer status updated successfully',
        transfer: updatedTransfer
      });

    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get transfer status and audit trail
  async getTransferStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfer = await storage.getCustomerTransferById(parseInt(id));

      if (!transfer) {
        return res.status(404).json({ message: 'Transfer not found' });
      }

      // Build audit trail
      const auditTrail = [
        {
          action: 'TRANSFER_INITIATED',
          performedBy: transfer.createId,
          timestamp: transfer.createDt,
          details: `Transfer request created: ${transfer.transferReason}`
        }
      ];

      if (transfer.status !== 'INPROGRESS') {
        auditTrail.push({
          action: 'STATUS_UPDATED',
          performedBy: transfer.updateId || 'system',
          timestamp: transfer.updateDt || new Date(),
          details: `Status changed to ${transfer.status}`
        });
      }

      if (transfer.cmStatus) {
        auditTrail.push({
          action: 'CM_STATUS_UPDATE',
          performedBy: 'SYSTEM',
          timestamp: transfer.updateDt || new Date(),
          details: `CM Status: ${transfer.cmStatus} - ${transfer.cmStatusMessage}`
        });
      }

      if (transfer.ficaStatus) {
        auditTrail.push({
          action: 'FICA_STATUS_UPDATE',
          performedBy: 'SYSTEM',
          timestamp: transfer.updateDt || new Date(),
          details: `FICA Status: ${transfer.ficaStatus} - ${transfer.ficaStatusMessage}`
        });
      }

      res.json({
        transfer,
        auditTrail,
        currentStatus: {
          transferStatus: transfer.status,
          cmStatus: transfer.cmStatus,
          ficaStatus: transfer.ficaStatus,
          somStatus: transfer.somStatus,
          manualInterventionRequired: transfer.manualInterventionRequired,
          lastUpdated: transfer.updateDt || transfer.createDt
        }
      });

    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Check customer eligibility for transfers
  async checkCustomerEligibility(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const customer = await storage.getCustomerById(parseInt(customerId));

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Get customer's payment history
      const payments = await storage.getPayments();
      const customerPayments = payments.filter(p =>
        p.customerId === parseInt(customerId) && p.status === 'COMPLETED'
      );

      res.json({
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
          customerType: customer.customerType,
          sapBpId: customer.sapBpId
        },
        eligibility: {
          hasActivePayments: customerPayments.length > 0,
          totalPayments: customerPayments.length,
          totalAmount: customerPayments.reduce((sum, p) => sum + p.amount, 0),
          currency: customer.currency || ''
        },
        recentPayments: customerPayments.slice(0, 5).map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          paymentMode: p.paymentMode,
          type: p.type,
          receiptNumber: p.receiptNumber,
          createdAt: p.createdAt
        }))
      });

    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export const customerTransferController = new CustomerTransferController();
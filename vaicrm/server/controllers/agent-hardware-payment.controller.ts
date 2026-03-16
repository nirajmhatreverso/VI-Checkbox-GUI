// === AGENT HARDWARE PAYMENT CONTROLLER ===
// Handles agent hardware payment collection and processing

import { Request, Response } from 'express';
import { AgentHardwarePayment, insertAgentHardwarePaymentSchema } from '@shared/schema';
import { z } from 'zod';

export class AgentHardwarePaymentController {

  // Mock in-memory storage (in production, this would be database)
  private static payments: AgentHardwarePayment[] = [
    {
      id: 1,
      payId: "PAY_HW_001",
      sapBpId: "BP001001",
      sapCaId: "CA001001",
      module: "Agent",
      payType: "Hardware",
      payAmount: 150000,
      payMode: "CASH",
      currency: "TSH",
      transId: "TXN_HW_001",
      status: "COMPLETED",
      description: "STB + Remote Kit Purchase",
      createId: "agent001",
      createDt: new Date("2024-12-15"),
      createTs: new Date("2024-12-15"),
      name: "John Mwamba",
      salesOrg: "1000",
      division: "10",
      cmStatus: "POSTED",
      cmStatusMsg: "Payment posted to SAP FI successfully",
      collectedBy: "AGENT001",
      collectionCenter: "OTC_MWANZA",
      receiptNumber: "RCP_HW_001",
      hardwareItems: [
        {
          materialCode: "STB_KIT_001",
          materialName: "AZAM TV STB Kit (STB + Remote)",
          quantity: 5,
          unitPrice: 25000,
          totalPrice: 125000
        },
        {
          materialCode: "DISH_001",
          materialName: "60cm Satellite Dish",
          quantity: 2,
          unitPrice: 12500,
          totalPrice: 25000
        }
      ]
    },
    {
      id: 2,
      payId: "PAY_HW_002",
      sapBpId: "BP002002",
      sapCaId: "CA002002",
      module: "Agent",
      payType: "Hardware",
      payAmount: 200000,
      payMode: "CHEQUE",
      chequeNo: "CHQ123456",
      bankName: "CRDB Bank",
      currency: "TSH",
      transId: "TXN_HW_002",
      status: "INPROGRESS",
      description: "Bulk STB Purchase - Awaiting Finance Approval",
      createId: "agent002",
      createDt: new Date(),
      createTs: new Date(),
      name: "Mary Kimaro",
      salesOrg: "1000",
      division: "10",
      cmStatus: "PENDING",
      collectedBy: "AGENT002",
      collectionCenter: "OTC_DAR",
      hardwareItems: [
        {
          materialCode: "STB_BASIC_001",
          materialName: "Basic STB Unit",
          quantity: 10,
          unitPrice: 20000,
          totalPrice: 200000
        }
      ]
    },
    {
      id: 3,
      payId: "PAY_HW_003",
      sapBpId: "BP003003",
      sapCaId: "CA003003",
      module: "Agent",
      payType: "Hardware",
      payAmount: 75000,
      payMode: "MOBILE_MONEY",
      currency: "TSH",
      transId: "TXN_HW_003",
      status: "APPROVED",
      description: "Remote + Cable Purchase",
      createId: "agent003",
      createDt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      createTs: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updateDt: new Date(),
      updateTs: new Date(),
      updateId: "finance001",
      approvedBy: "FINANCE_MGR_001",
      name: "Peter Mwanza",
      salesOrg: "1000",
      division: "10",
      cmStatus: "PROCESSING",
      cmStatusMsg: "Payment being processed in Central Module",
      collectedBy: "AGENT003",
      collectionCenter: "OTC_ARUSHA",
      receiptNumber: "RCP_HW_003",
      hardwareItems: [
        {
          materialCode: "REMOTE_001",
          materialName: "AZAM TV Remote Control",
          quantity: 15,
          unitPrice: 3000,
          totalPrice: 45000
        },
        {
          materialCode: "CABLE_HDMI_001",
          materialName: "HDMI Cable 1.5m",
          quantity: 10,
          unitPrice: 3000,
          totalPrice: 30000
        }
      ]
    }
  ];

  // Get all hardware payments with filtering
  static async getPayments(req: Request, res: Response) {
    try {
      const {
        agentId,
        payMode,
        status,
        startDate,
        endDate,
        limit = '50'
      } = req.query;

      let filteredPayments = [...AgentHardwarePaymentController.payments];

      // Apply filters
      if (agentId) {
        filteredPayments = filteredPayments.filter(p =>
          p.collectedBy === agentId || p.createId === agentId
        );
      }

      if (payMode) {
        filteredPayments = filteredPayments.filter(p => p.payMode === payMode);
      }

      if (status) {
        filteredPayments = filteredPayments.filter(p => p.status === status);
      }

      if (startDate) {
        const start = new Date(startDate as string);
        filteredPayments = filteredPayments.filter(p =>
          new Date(p.createDt) >= start
        );
      }

      if (endDate) {
        const end = new Date(endDate as string);
        filteredPayments = filteredPayments.filter(p =>
          new Date(p.createDt) <= end
        );
      }

      // Apply limit
      const limitNum = parseInt(limit as string);
      if (limitNum > 0) {
        filteredPayments = filteredPayments.slice(0, limitNum);
      }

      res.json(filteredPayments);
    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve hardware payments'
      });
    }
  }

  // Get specific payment by ID
  static async getPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paymentId = parseInt(id);

      const payment = AgentHardwarePaymentController.payments.find(p => p.id === paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Hardware payment not found'
        });
      }

      res.json(payment);
    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve hardware payment'
      });
    }
  }

  // Create new hardware payment
  static async createPayment(req: Request, res: Response) {
    try {
      // Validate request body against schema
      const validatedData = insertAgentHardwarePaymentSchema.parse(req.body);

      // Generate unique payment ID
      const payId = `PAY_HW_${String(Date.now()).slice(-6)}`;

      // Generate transaction ID  
      const transId = `TXN_HW_${String(Date.now()).slice(-6)}`;

      // Calculate total amount (payAmount + vatAmount)

      // Determine initial status based on payment mode
      let initialStatus = 'PENDING';
      if (validatedData.payMode === 'CHEQUE' || validatedData.payMode === 'BANK_DEPOSIT') {
        initialStatus = 'INPROGRESS'; // Awaiting Finance approval
      }

      const newPayment: AgentHardwarePayment = {
        id: Math.max(...AgentHardwarePaymentController.payments.map(p => p.id)) + 1,
        payId,
        sapBpId: validatedData.sapBpId,
        sapCaId: validatedData.sapCaId,
        module: validatedData.module,
        payType: validatedData.payType,
        payAmount: validatedData.payAmount,
        payMode: validatedData.payMode,
        chequeNo: validatedData.chequeNo,
        bankName: validatedData.bankName,
        currency: validatedData.currency,
        onlPgId: validatedData.onlPgId,
        onlTransId: validatedData.onlTransId,
        transId,
        status: initialStatus,
        description: validatedData.description,
        createId: validatedData.createId,
        createDt: new Date(),
        createTs: new Date(),
        name: validatedData.name,
        salesOrg: validatedData.salesOrg,
        division: validatedData.division,
        cmStatus: 'PENDING',
        cmStatusMsg: 'Awaiting Central Module processing',
        collectedBy: validatedData.collectedBy,
        collectionCenter: validatedData.collectionCenter,
        hardwareItems: validatedData.hardwareItems || []
      };

      // Simulate CM integration based on payment mode
      await AgentHardwarePaymentController.processPaymentWorkflow(newPayment);

      AgentHardwarePaymentController.payments.push(newPayment);

      res.status(201).json({
        success: true,
        data: newPayment,
        message: 'Hardware payment created successfully'
      });

    } catch (error) {


      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create hardware payment'
      });
    }
  }

  // Update payment (for approvals, status changes)
  static async updatePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paymentId = parseInt(id);
      const updates = req.body;

      const paymentIndex = AgentHardwarePaymentController.payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Hardware payment not found'
        });
      }

      const existingPayment = AgentHardwarePaymentController.payments[paymentIndex];

      // Update payment with new data
      const updatedPayment: AgentHardwarePayment = {
        ...existingPayment,
        ...updates,
        updateDt: new Date(),
        updateTs: new Date(),
        updateId: updates.updateId || 'system'
      };

      // Handle status change workflows
      if (updates.status && updates.status !== existingPayment.status) {
        await AgentHardwarePaymentController.handleStatusChange(updatedPayment, updates.status);
      }

      AgentHardwarePaymentController.payments[paymentIndex] = updatedPayment;

      res.json({
        success: true,
        data: updatedPayment,
        message: 'Hardware payment updated successfully'
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to update hardware payment'
      });
    }
  }

  // Delete/Cancel payment
  static async deletePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason, userRole } = req.body;
      const paymentId = parseInt(id);

      const paymentIndex = AgentHardwarePaymentController.payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Hardware payment not found'
        });
      }

      const payment = AgentHardwarePaymentController.payments[paymentIndex];

      // Check cancellation eligibility
      const canCancel = AgentHardwarePaymentController.checkCancellationEligibility(payment, userRole);

      if (!canCancel.eligible) {
        return res.status(400).json({
          success: false,
          message: canCancel.reason
        });
      }

      // Cancel payment
      payment.status = 'CANCELLED';
      payment.description = payment.description + ` | CANCELLED: ${reason}`;
      payment.updateDt = new Date();
      payment.updateTs = new Date();
      payment.cmStatus = 'CANCELLED';
      payment.cmStatusMsg = `Payment cancelled: ${reason}`;

      res.json({
        success: true,
        message: 'Hardware payment cancelled successfully'
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to cancel hardware payment'
      });
    }
  }

  // Finance approval endpoint
  static async approvePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedBy, remarks } = req.body;
      const paymentId = parseInt(id);

      const paymentIndex = AgentHardwarePaymentController.payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Hardware payment not found'
        });
      }

      const payment = AgentHardwarePaymentController.payments[paymentIndex];

      if (payment.status !== 'INPROGRESS') {
        return res.status(400).json({
          success: false,
          message: 'Payment is not in a state that can be approved'
        });
      }

      // Approve payment
      payment.status = 'APPROVED';
      payment.approvedBy = approvedBy;
      payment.updateDt = new Date();
      payment.updateTs = new Date();
      payment.updateId = approvedBy;
      payment.cmStatus = 'PROCESSING';
      payment.cmStatusMsg = 'Finance approved - Processing payment to SAP FI';

      if (remarks) {
        payment.description = payment.description + ` | Finance remarks: ${remarks}`;
      }

      // Simulate posting to SAP FI
      setTimeout(async () => {
        payment.status = 'COMPLETED';
        payment.cmStatus = 'POSTED';
        payment.cmStatusMsg = 'Payment posted to SAP FI successfully';
        payment.receiptNumber = `RCP_HW_${String(Date.now()).slice(-6)}`;
      }, 2000);

      res.json({
        success: true,
        data: payment,
        message: 'Hardware payment approved successfully'
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to approve hardware payment'
      });
    }
  }

  // Get payment statistics  
  static async getPaymentStats(req: Request, res: Response) {
    try {
      const { period = 'month', agentId } = req.query;

      let paymentsToAnalyze = [...AgentHardwarePaymentController.payments];

      if (agentId) {
        paymentsToAnalyze = paymentsToAnalyze.filter(p =>
          p.collectedBy === agentId || p.createId === agentId
        );
      }

      const stats = {
        totalPayments: paymentsToAnalyze.length,
        totalAmount: paymentsToAnalyze.reduce((sum, p) => sum + p.payAmount, 0),
        pendingPayments: paymentsToAnalyze.filter(p => p.status === 'PENDING').length,
        inProgressPayments: paymentsToAnalyze.filter(p => p.status === 'INPROGRESS').length,
        approvedPayments: paymentsToAnalyze.filter(p => p.status === 'APPROVED').length,
        completedPayments: paymentsToAnalyze.filter(p => p.status === 'COMPLETED').length,
        cancelledPayments: paymentsToAnalyze.filter(p => p.status === 'CANCELLED').length,
        paymentModeBreakdown: {
          CASH: paymentsToAnalyze.filter(p => p.payMode === 'CASH').length,
          CHEQUE: paymentsToAnalyze.filter(p => p.payMode === 'CHEQUE').length,
          BANK_DEPOSIT: paymentsToAnalyze.filter(p => p.payMode === 'BANK_DEPOSIT').length,
          POS: paymentsToAnalyze.filter(p => p.payMode === 'POS').length,
          MOBILE_MONEY: paymentsToAnalyze.filter(p => p.payMode === 'MOBILE_MONEY').length,
        },
        averagePaymentAmount: paymentsToAnalyze.length > 0 ?
          paymentsToAnalyze.reduce((sum, p) => sum + p.payAmount, 0) / paymentsToAnalyze.length : 0,
        currencyBreakdown: {
          TSH: paymentsToAnalyze.filter(p => p.currency === 'TSH').length,
          USD: paymentsToAnalyze.filter(p => p.currency === 'USD').length,
          ZIG: paymentsToAnalyze.filter(p => p.currency === 'ZIG').length
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment statistics'
      });
    }
  }

  // Private helper methods
  private static async processPaymentWorkflow(payment: AgentHardwarePayment): Promise<void> {
    // Mock CM integration delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (payment.payMode === 'CASH') {
      // Direct processing for cash payments
      payment.cmStatus = 'PROCESSING';
      payment.cmStatusMsg = 'Cash payment being processed to SAP FI';

      // Simulate FI posting
      setTimeout(() => {
        payment.status = 'COMPLETED';
        payment.cmStatus = 'POSTED';
        payment.cmStatusMsg = 'Payment posted to SAP FI successfully';
        payment.receiptNumber = `RCP_HW_${String(Date.now()).slice(-6)}`;
      }, 3000);
    }
  }

  private static async handleStatusChange(payment: AgentHardwarePayment, newStatus: string): Promise<void> {
    if (newStatus === 'APPROVED') {
      payment.cmStatus = 'PROCESSING';
      payment.cmStatusMsg = 'Approved payment being processed';
    } else if (newStatus === 'COMPLETED') {
      payment.cmStatus = 'POSTED';
      payment.cmStatusMsg = 'Payment posted to SAP FI successfully';
      if (!payment.receiptNumber) {
        payment.receiptNumber = `RCP_HW_${String(Date.now()).slice(-6)}`;
      }
    }
  }

  private static checkCancellationEligibility(payment: AgentHardwarePayment, userRole: string): { eligible: boolean; reason?: string } {
    if (payment.status === 'COMPLETED') {
      return { eligible: false, reason: 'Cannot cancel completed payments' };
    }

    if (payment.status === 'CANCELLED') {
      return { eligible: false, reason: 'Payment is already cancelled' };
    }

    // Time-based restriction (72 hours)
    const paymentAge = Date.now() - new Date(payment.createDt).getTime();
    const maxCancelTimeMs = 72 * 60 * 60 * 1000;

    if (paymentAge > maxCancelTimeMs && userRole !== 'finance') {
      return { eligible: false, reason: 'Cancellation period expired. Contact finance team.' };
    }

    // Role-based restriction for specific payment modes
    if ((payment.payMode === 'CHEQUE' || payment.payMode === 'BANK_DEPOSIT') && userRole !== 'finance') {
      return { eligible: false, reason: 'Finance approval required for this payment type cancellation' };
    }

    return { eligible: true };
  }

  // Get master data for hardware items (for dropdown selection)
  static async getHardwareItems(req: Request, res: Response) {
    try {
      const hardwareItems = [
        {
          materialCode: "STB_KIT_001",
          materialName: "AZAM TV STB Kit (STB + Remote)",
          materialType: "KIT",
          unitPrice: 25000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "STB_BASIC_001",
          materialName: "Basic STB Unit",
          materialType: "STB",
          unitPrice: 20000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "STB_HD_001",
          materialName: "HD STB Unit",
          materialType: "STB",
          unitPrice: 30000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "REMOTE_001",
          materialName: "AZAM TV Remote Control",
          materialType: "ACCESSORY",
          unitPrice: 3000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "DISH_001",
          materialName: "60cm Satellite Dish",
          materialType: "DISH",
          unitPrice: 12500,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "DISH_002",
          materialName: "90cm Satellite Dish",
          materialType: "DISH",
          unitPrice: 18000,
          currency: "TSH",
          availability: "LIMITED"
        },
        {
          materialCode: "CABLE_HDMI_001",
          materialName: "HDMI Cable 1.5m",
          materialType: "ACCESSORY",
          unitPrice: 3000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "CABLE_AV_001",
          materialName: "AV Cable Set",
          materialType: "ACCESSORY",
          unitPrice: 2500,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "LNB_SINGLE_001",
          materialName: "Single LNB",
          materialType: "LNB",
          unitPrice: 8000,
          currency: "TSH",
          availability: "IN_STOCK"
        },
        {
          materialCode: "LNB_TWIN_001",
          materialName: "Twin LNB",
          materialType: "LNB",
          unitPrice: 12000,
          currency: "TSH",
          availability: "IN_STOCK"
        }
      ];

      res.json({
        success: true,
        data: hardwareItems
      });
    } catch (error) {

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve hardware items'
      });
    }
  }
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import { AuthController } from "./controllers/auth.controller";
import dashboardRouter, { DashboardController } from "./controllers/dashboard.controller";

import agentRouter, { AgentController } from "./controllers/agent.controller";
import hardwareSaleRouter from './controllers/hardware-sale.controller';
import centerDataRouter from './controllers/center-data.controller';
import dropdownRouter from './controllers/dropdown.controller';
import inventoryRouter from './controllers/inventory.controller';
import customerRouter from "./controllers/customer.controller";
import agentPaymentRouter from "./controllers/agent-payment.controller";
import customerPaymentRouter from "./controllers/customer-payment.controller";
import customerSubPaymentRouter, { CustomerSubscriptionPaymentController } from "./controllers/customer-subscription-payment.controller";
import subscriptionRouter, { SubscriptionController } from "./controllers/subscription.controller";
import kycRouter from "./controllers/kyc.controller";
import agentHardwareSaleRouter from './controllers/agent-hardware-sale.controller';
import provisioningRouter from "./controllers/provisioning.controller";
import agentReplacementRouter from "./controllers/agent-replacement.controller"; // Import the new controller

import agentSubscriptionRouter from './controllers/agent-subscription.controller';
import invoiceRouter from "./controllers/invoice.controller";
import itsmRouter from './controllers/itsmController';
import agentStockRouter from './controllers/agent-stock.controller';
import agentCommissionRouter from "./controllers/agentcommision.controller";
import bulkRouter from './controllers/bulk.controller';
import adminRouter from "./controllers/admin.controller";
import reportRouter from "./controllers/report.controller";

// --- MIDDLEWARE SETUP ---

// 1. CSRF Protection Middleware
const csrfProtection = csurf({ cookie: true });

// 2. Rate Limiter for sensitive endpoints like login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: "ERROR", statusMessage: "Too many login attempts. Please try again after 15 minutes." }
});


export async function registerRoutes(app: Express): Promise<Server> {
  // === CSRF TOKEN ENDPOINT ===
  // This must be BEFORE any other protected route.
  // The frontend will call this once to get the initial CSRF token.
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // Apply CSRF protection to ALL subsequent state-changing API routes
  app.use(csrfProtection);

  // === AUTHENTICATION ROUTES ===
  app.post("/api/auth/login", loginLimiter, AuthController.login);
  app.post("/api/auth/logout", AuthController.logout); // Assuming you've added this method
  app.post("/api/auth/validate", AuthController.validateToken);

  // Note: Using loginLimiter to prevent email spam
  app.post("/api/auth/forgot-password", loginLimiter, AuthController.forgotPassword);
  app.post("/api/auth/verify-otp", AuthController.verifyOtp);
  app.post("/api/auth/reset-password", AuthController.resetPassword);
  app.post("/api/auth/reset-password", AuthController.resetPassword);
  // === DASHBOARD ROUTES ===
  app.use("/api/dashboard", dashboardRouter);

  // === SPECIAL CRM ROUTES ===
  app.post("/api/crm/v1/planEx/approval", SubscriptionController.approveExtension);
  app.post("/api/crm/v1/changePassword", AuthController.changePassword);

  // === MODULAR ROUTES ===
  // The csrfProtection middleware applied above will automatically protect all POST/PUT/DELETE routes within these routers.
  app.use("/api/agents", agentRouter);
  app.use('/api/data', centerDataRouter);
  app.use('/api/dropdowns', dropdownRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/hardware-sales', hardwareSaleRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/agent-payments', agentPaymentRouter);
  app.use('/api/customer-payments', customerPaymentRouter);
  app.use('/api/customer-sub-payments', customerSubPaymentRouter);
  app.use('/api/subscriptions', subscriptionRouter);
  app.use('/api/kyc', kycRouter);
  app.use('/api/agent-hardware-sales', agentHardwareSaleRouter);

  app.use('/api/agent-payments/subscription', agentSubscriptionRouter);
  app.use('/api/invoice-reversal', invoiceRouter);
  app.use('/api/itsm', itsmRouter);
  app.use('/api/organization', itsmRouter); // Merged with itsmRouter
  app.use('/api/provisioning', provisioningRouter);
  app.use('/api/agent-replacement', agentReplacementRouter);
  app.use('/api/agent-stock', agentStockRouter);
  app.use('/api/agent', agentCommissionRouter);
  app.use('/api/upload', bulkRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/reports', reportRouter);
  const httpServer = createServer(app);
  return httpServer;
}
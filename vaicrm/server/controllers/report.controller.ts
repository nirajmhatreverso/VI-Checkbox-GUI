import type { Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage";

export class ReportController {
  // === DAILY REPORTS ===
  static async getDailyReports(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo, region } = req.query;
      const reports = await storage.getDailyReports(
        dateFrom as string,
        dateTo as string,
        region as string
      );

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'DAILY',
        reportId: 0, // For list view
        action: 'VIEWED',
        performedBy: 'current_user', // In real app, get from auth
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: reports });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getDailyReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = await storage.getDailyReportById(parseInt(id));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'DAILY',
        reportId: report.id,
        action: 'VIEWED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async generateDailyReport(req: Request, res: Response) {
    try {
      const { reportDate, reportType, region } = req.body;

      const report = await storage.generateDailyReport(
        new Date(reportDate),
        reportType,
        region
      );

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'DAILY',
        reportId: report.id,
        action: 'GENERATED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // === TRA REPORTS ===
  static async getTRAReports(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      const reports = await storage.getTRAReports(dateFrom as string, dateTo as string);

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TRA',
        reportId: 0,
        action: 'VIEWED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: reports });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getTRAReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = await storage.getTRAReportById(parseInt(id));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TRA',
        reportId: report.id,
        action: 'VIEWED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async generateTRAReport(req: Request, res: Response) {
    try {
      const { reportDate, reportType } = req.body;

      const report = await storage.generateTRAReport(new Date(reportDate), reportType);

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TRA',
        reportId: report.id,
        action: 'GENERATED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // === TCRA REPORTS ===
  static async getTCRAReports(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo, region } = req.query;
      const reports = await storage.getTCRAReports(
        dateFrom as string,
        dateTo as string,
        region as string
      );

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TCRA',
        reportId: 0,
        action: 'VIEWED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: reports });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getTCRAReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = await storage.getTCRAReportById(parseInt(id));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TCRA',
        reportId: report.id,
        action: 'VIEWED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async generateTCRAReport(req: Request, res: Response) {
    try {
      const { reportDate, reportType, region } = req.body;

      const report = await storage.generateTCRAReport(
        new Date(reportDate),
        reportType,
        region
      );

      // Create audit log
      await storage.createReportAuditLog({
        reportType: 'TCRA',
        reportId: report.id,
        action: 'GENERATED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip
      });

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // === AUDIT LOGS ===
  static async getReportAuditLogs(req: Request, res: Response) {
    try {
      const { reportType, reportId } = req.query;
      const logs = await storage.getReportAuditLogs(
        reportType as string,
        reportId ? parseInt(reportId as string) : undefined
      );

      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // === EXPORT FUNCTIONALITY ===
  static async exportReport(req: Request, res: Response) {
    try {
      const { reportType, reportId, format } = req.body;

      // Create audit log for export
      await storage.createReportAuditLog({
        reportType: reportType as any,
        reportId: parseInt(reportId),
        action: 'EXPORTED',
        performedBy: 'current_user',
        userRole: 'admin',
        ipAddress: req.ip,
        exportFormat: format as any
      });

      res.json({
        success: true,
        message: `Report exported as ${format}`,
        downloadUrl: `/api/reports/download/${reportType}/${reportId}?format=${format}`
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // === FETCH REPORTS (proxies to Java /crm/v1/fetch/reports) ===
  static async fetchReports(req: Request, res: Response) {
    const token = (req as any).cookies?.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    const apiUrl = process.env.SERVER_API_TARGET_URL?.replace(/\/$/, "");
    if (!apiUrl) {
      return res.status(500).json({ statusMessage: "SERVER_API_TARGET_URL is not configured" });
    }

    try {
      const javaRes = await fetch(`${apiUrl}/crm/v1/fetch/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const contentType = javaRes.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await javaRes.json();
        return res.status(javaRes.status).json(data);
      }
      return res.status(javaRes.status).send(await javaRes.text());
    } catch (error) {
      return res.status(500).json({ statusMessage: "Internal Server Error" });
    }
  }

  // === FETCH REPORT NAMES (proxies to Java /crm/v1/fetch/reportName) ===
  static async fetchReportNames(req: Request, res: Response) {
    const token = (req as any).cookies?.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    const apiUrl = process.env.SERVER_API_TARGET_URL?.replace(/\/$/, "");
    if (!apiUrl) {
      return res.status(500).json({ statusMessage: "SERVER_API_TARGET_URL is not configured" });
    }

    try {
      const javaRes = await fetch(`${apiUrl}/crm/v1/fetch/reportName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      });

      const contentType = javaRes.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await javaRes.json();
        return res.status(javaRes.status).json(data);
      }
      return res.status(javaRes.status).send(await javaRes.text());
    } catch (error) {
      return res.status(500).json({ statusMessage: "Internal Server Error" });
    }
  }

  // === DOWNLOAD REPORT (proxies to Java /crm/v1/downloadReport) ===
  static async downloadReport(req: Request, res: Response) {
    const token = (req as any).cookies?.access_token;
    if (!token) {
      return res.status(401).json({ statusMessage: "Unauthorized" });
    }

    const apiUrl = process.env.SERVER_API_TARGET_URL?.replace(/\/$/, "");
    if (!apiUrl) {
      return res.status(500).json({ statusMessage: "SERVER_API_TARGET_URL is not configured" });
    }

    const { fileName, filePath } = req.body;
    if (!fileName || !filePath) {
      return res.status(400).json({ statusMessage: "fileName and filePath are required" });
    }

    try {
      const javaRes = await fetch(`${apiUrl}/crm/v1/downloadReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ fileName, filePath }),
      });

      if (!javaRes.ok) {
        // Try to return a JSON error if available
        const ct = javaRes.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const errData = await javaRes.json();
          return res.status(javaRes.status).json(errData);
        }
        return res.status(javaRes.status).json({ statusMessage: `Upstream error: ${javaRes.status}` });
      }

      // Forward content headers so the browser knows how to handle the file
      const contentType = javaRes.headers.get("content-type") ?? "application/octet-stream";
      const contentDisposition = javaRes.headers.get("content-disposition") ?? `attachment; filename="${fileName}"`;

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", contentDisposition);

      // Stream the binary body directly to the client
      const arrayBuffer = await javaRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      return res.status(500).json({ statusMessage: "Internal Server Error" });
    }
  }
}

// ── Router ────────────────────────────────────────────────────────────────
const reportRouter = Router();
reportRouter.post("/fetch", ReportController.fetchReports);
reportRouter.post("/fetch/names", ReportController.fetchReportNames);
reportRouter.post("/download", ReportController.downloadReport);

export default reportRouter;
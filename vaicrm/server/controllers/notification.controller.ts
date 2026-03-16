import type { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Validation schemas
const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['system', 'agent', 'kyc', 'inventory', 'payment', 'service', 'security']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  userId: z.number(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const updateNotificationSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  type: z.enum(['system', 'agent', 'kyc', 'inventory', 'payment', 'service', 'security']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['unread', 'read', 'archived']).optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const status = req.query.status as string | undefined;

      const notifications = await storage.getNotifications(userId, status);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getNotificationById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }

      const notification = await storage.getNotificationById(id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createNotification(req: Request, res: Response) {
    try {
      const validationResult = createNotificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: 'Invalid notification data',
          errors: validationResult.error.errors
        });
      }

      const notification = await storage.createNotification({
        ...validationResult.data,
        status: 'unread'
      });

      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateNotification(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }

      const validationResult = updateNotificationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: 'Invalid notification data',
          errors: validationResult.error.errors
        });
      }

      const notification = await storage.updateNotification(id, validationResult.data);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }

      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }

      const success = await storage.deleteNotification(id);
      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
import { Request, Response } from 'express';
import { notificationService } from './notification.service.js';

export class NotificationController {

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const result = await notificationService.getNotifications((req as any).user.id, req.query);
      res.json(result);
    } catch {
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount((req as any).user.id);
      res.json({ count });
    } catch {
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  }

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const notif = await notificationService.markRead(req.params.notifId, (req as any).user.id);
      res.json({ notification: notif });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to mark as read' });
    }
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      await notificationService.markAllRead((req as any).user.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: 'Failed to mark all as read' });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      await notificationService.deleteNotification(req.params.notifId, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to delete notification' });
    }
  }
}

export const notificationController = new NotificationController();

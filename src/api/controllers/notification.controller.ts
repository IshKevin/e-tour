import { Request, Response } from 'express';
import { notificationService } from '../../services/notification.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const markAsReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID format'),
});

export const notificationController = {
  // GET /api/notifications - Get user notifications
  async getUserNotifications(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await notificationService.getUserNotifications(userId, limit, unreadOnly);
    const unreadCount = await notificationService.getUnreadCount(userId);

    return successResponse(res, 200, 'Notifications fetched successfully', {
      notifications,
      unreadCount,
    });
  },

  // POST /api/notifications/:id/read - Mark notification as read
  async markAsRead(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationId = req.params.id;
    if (!notificationId || typeof notificationId !== 'string') {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notification = await notificationService.markAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return successResponse(res, 200, 'Notification marked as read', notification);
  },

  // POST /api/notifications/read-all - Mark all notifications as read
  async markAllAsRead(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await notificationService.markAllAsRead(userId);
    return successResponse(res, 200, 'All notifications marked as read', { count });
  },

  // DELETE /api/notifications/:id - Delete notification
  async deleteNotification(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationId = req.params.id;
    if (!notificationId || typeof notificationId !== 'string') {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const deleted = await notificationService.deleteNotification(notificationId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return successResponse(res, 200, 'Notification deleted successfully', null);
  },

  // GET /api/notifications/unread-count - Get unread notification count
  async getUnreadCount(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await notificationService.getUnreadCount(userId);
    return successResponse(res, 200, 'Unread count fetched successfully', { count });
  },
};

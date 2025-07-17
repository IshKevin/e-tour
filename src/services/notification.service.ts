import { db } from '../db';
import { notifications, Notification, NewNotification } from '../db/schema/notification.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const notificationService = {
  // Create a notification
  async createNotification(notificationData: NewNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  },

  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50, unreadOnly: boolean = false) {
    const whereConditions = [eq(notifications.userId, userId)];

    if (unreadOnly) {
      whereConditions.push(eq(notifications.isRead, false));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const [notification] = await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    return notification || null;
  },

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning();

    return result.length;
  },

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return result.count;
  },

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    return result.length > 0;
  },

  // Helper methods for creating specific types of notifications
  async createBookingNotification(userId: string, title: string, message: string, metadata?: any) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'booking',
      metadata,
    });
  },

  async createCancellationNotification(userId: string, title: string, message: string, metadata?: any) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'cancellation',
      metadata,
    });
  },

  async createJobUpdateNotification(userId: string, title: string, message: string, metadata?: any) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'job_update',
      metadata,
    });
  },

  async createSystemNotification(userId: string, title: string, message: string, metadata?: any) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'system',
      metadata,
    });
  },

  // Broadcast notification to multiple users
  async broadcastNotification(userIds: string[], title: string, message: string, type: 'booking' | 'cancellation' | 'job_update' | 'system', metadata?: any) {
    const notificationData = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      metadata,
    }));

    const createdNotifications = await db.insert(notifications).values(notificationData).returning();
    return createdNotifications;
  },

  // Send notification to all users with specific role
  async notifyUsersByRole(role: 'client' | 'agent' | 'admin', title: string, message: string, type: 'booking' | 'cancellation' | 'job_update' | 'system', metadata?: any) {
    // Get all users with the specified role
    const usersWithRole = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, role), eq(users.status, 'active')));

    const userIds = usersWithRole.map(user => user.id);
    
    if (userIds.length > 0) {
      return this.broadcastNotification(userIds, title, message, type, metadata);
    }

    return [];
  },

  // Clean up old read notifications (for maintenance)
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(notifications)
      .where(and(
        eq(notifications.isRead, true),
        sql`${notifications.readAt} < ${cutoffDate}`
      ))
      .returning();

    return result.length;
  },
};

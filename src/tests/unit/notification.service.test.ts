import { notificationService } from '../../services/notification.service';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        userId: 1,
        title: 'Booking Confirmed',
        message: 'Your trip booking has been confirmed',
        type: 'booking' as const,
      };

      const mockNotification = {
        id: 1,
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNotification]),
        }),
      });

      const result = await notificationService.createNotification(notificationData);

      expect(result).toEqual(mockNotification);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const userId = 1;
      const mockNotifications = [
        {
          id: 1,
          userId,
          title: 'Booking Confirmed',
          message: 'Your trip booking has been confirmed',
          type: 'booking',
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 2,
          userId,
          title: 'Trip Reminder',
          message: 'Your trip starts tomorrow',
          type: 'system',
          isRead: true,
          createdAt: new Date(),
        },
      ];

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockNotifications),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(userId, 50, false);

      expect(result).toEqual(mockNotifications);
    });

    it('should return only unread notifications when unreadOnly is true', async () => {
      const userId = 1;
      const mockUnreadNotifications = [
        {
          id: 1,
          userId,
          title: 'Booking Confirmed',
          message: 'Your trip booking has been confirmed',
          type: 'booking',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      const mockDb = require('../../db').db;
      const mockQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockUnreadNotifications),
            }),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await notificationService.getUserNotifications(userId, 50, true);

      expect(result).toEqual(mockUnreadNotifications);
      expect(mockQuery.from().where).toHaveBeenCalledTimes(2); // Once for userId, once for unread filter
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 1;
      const userId = 1;
      const mockUpdatedNotification = {
        id: notificationId,
        userId,
        title: 'Booking Confirmed',
        isRead: true,
        readAt: new Date(),
      };

      const mockDb = require('../../db').db;
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedNotification]),
          }),
        }),
      });

      const result = await notificationService.markAsRead(notificationId, userId);

      expect(result).toEqual(mockUpdatedNotification);
    });

    it('should return null if notification not found', async () => {
      const notificationId = 999;
      const userId = 1;

      const mockDb = require('../../db').db;
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await notificationService.markAsRead(notificationId, userId);

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const userId = 1;
      const mockUpdatedNotifications = [
        { id: 1, userId, isRead: true },
        { id: 2, userId, isRead: true },
      ];

      const mockDb = require('../../db').db;
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue(mockUpdatedNotifications),
          }),
        }),
      });

      const result = await notificationService.markAllAsRead(userId);

      expect(result).toBe(2);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = 1;
      const mockCount = { count: 5 };

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockCount]),
        }),
      });

      const result = await notificationService.getUnreadCount(userId);

      expect(result).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 1;
      const userId = 1;

      const mockDb = require('../../db').db;
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: notificationId }]),
        }),
      });

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      const notificationId = 999;
      const userId = 1;

      const mockDb = require('../../db').db;
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await notificationService.deleteNotification(notificationId, userId);

      expect(result).toBe(false);
    });
  });

  describe('broadcastNotification', () => {
    it('should create notifications for multiple users', async () => {
      const userIds = [1, 2, 3];
      const title = 'System Maintenance';
      const message = 'System will be down for maintenance';
      const type = 'system' as const;

      const mockNotifications = userIds.map(userId => ({
        id: userId,
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date(),
      }));

      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockNotifications),
        }),
      });

      const result = await notificationService.broadcastNotification(userIds, title, message, type);

      expect(result).toEqual(mockNotifications);
      expect(result).toHaveLength(3);
    });
  });

  describe('notifyUsersByRole', () => {
    it('should notify all users with specific role', async () => {
      const role = 'agent';
      const title = 'New Feature Available';
      const message = 'Check out the new agent dashboard';
      const type = 'system' as const;

      const mockUsers = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];

      const mockNotifications = mockUsers.map(user => ({
        id: user.id,
        userId: user.id,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date(),
      }));

      const mockDb = require('../../db').db;

      // Mock users query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockUsers),
        }),
      });

      // Mock notification insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockNotifications),
        }),
      });

      const result = await notificationService.notifyUsersByRole(role, title, message, type);

      expect(result).toEqual(mockNotifications);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no users with role found', async () => {
      const role = 'admin';
      const title = 'Test';
      const message = 'Test message';
      const type = 'system' as const;

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await notificationService.notifyUsersByRole(role, title, message, type);

      expect(result).toEqual([]);
    });
  });

  describe('helper methods', () => {
    it('should create booking notification', async () => {
      const userId = 1;
      const title = 'Booking Confirmed';
      const message = 'Your booking has been confirmed';
      const metadata = { bookingId: 123 };

      const mockNotification = {
        id: 1,
        userId,
        title,
        message,
        type: 'booking',
        metadata,
        isRead: false,
        createdAt: new Date(),
      };

      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNotification]),
        }),
      });

      const result = await notificationService.createBookingNotification(userId, title, message, metadata);

      expect(result).toEqual(mockNotification);
    });

    it('should create job update notification', async () => {
      const userId = 1;
      const title = 'Job Application Update';
      const message = 'Your application has been reviewed';
      const metadata = { jobId: 456 };

      const mockNotification = {
        id: 1,
        userId,
        title,
        message,
        type: 'job_update',
        metadata,
        isRead: false,
        createdAt: new Date(),
      };

      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNotification]),
        }),
      });

      const result = await notificationService.createJobUpdateNotification(userId, title, message, metadata);

      expect(result).toEqual(mockNotification);
    });
  });
});

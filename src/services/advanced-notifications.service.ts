// Simple advanced notifications service
export const advancedNotificationsService = {
  // Get notification templates
  async getNotificationTemplates() {
    try {
      const templates = [
        {
          id: '1',
          name: 'Booking Confirmation',
          type: 'email',
          subject: 'Your booking is confirmed!',
          content: 'Dear {{userName}}, your booking for {{tripName}} has been confirmed.',
          variables: ['userName', 'tripName', 'bookingDate'],
          isActive: true
        },
        {
          id: '2',
          name: 'Payment Reminder',
          type: 'email',
          subject: 'Payment reminder for your trip',
          content: 'Hi {{userName}}, please complete payment for {{tripName}}.',
          variables: ['userName', 'tripName', 'amount'],
          isActive: true
        },
        {
          id: '3',
          name: 'Trip Update',
          type: 'push',
          subject: 'Update on your trip',
          content: 'Your trip {{tripName}} has been updated.',
          variables: ['userName', 'tripName', 'updateDetails'],
          isActive: true
        }
      ];

      return {
        templates,
        totalTemplates: templates.length,
        activeTemplates: templates.filter(t => t.isActive).length
      };
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      throw error;
    }
  },

  // Create notification template
  async createNotificationTemplate(templateData: {
    name: string;
    type: 'email' | 'push' | 'sms';
    subject: string;
    content: string;
    variables: string[];
  }) {
    try {
      const newTemplate = {
        id: Date.now().toString(),
        ...templateData,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      return newTemplate;
    } catch (error) {
      console.error('Error creating notification template:', error);
      throw error;
    }
  },

  // Send bulk notifications
  async sendBulkNotifications(notificationData: {
    templateId: string;
    recipients: string[];
    variables: Record<string, any>;
  }) {
    try {
      const { templateId, recipients, variables } = notificationData;
      
      // Mock sending notifications
      const results = recipients.map(recipient => ({
        recipient,
        status: Math.random() > 0.1 ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      const summary = {
        totalRecipients: recipients.length,
        successful: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        templateId,
        sentAt: new Date().toISOString()
      };

      return {
        summary,
        results
      };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  },

  // Get notification history
  async getNotificationHistory(filters: { page?: number; limit?: number; type?: string } = {}) {
    try {
      const { page = 1, limit = 20, type } = filters;
      
      // Mock notification history
      const mockHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `notif_${i + 1}`,
        type: ['email', 'push', 'sms'][Math.floor(Math.random() * 3)],
        recipient: `user${i + 1}@example.com`,
        subject: `Notification ${i + 1}`,
        status: Math.random() > 0.2 ? 'delivered' : 'failed',
        sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        templateId: `template_${Math.floor(Math.random() * 3) + 1}`
      }));

      let filteredHistory = mockHistory;
      if (type) {
        filteredHistory = mockHistory.filter(h => h.type === type);
      }

      const startIndex = (page - 1) * limit;
      const paginatedHistory = filteredHistory.slice(startIndex, startIndex + limit);

      return {
        notifications: paginatedHistory,
        pagination: {
          page,
          limit,
          total: filteredHistory.length,
          totalPages: Math.ceil(filteredHistory.length / limit),
          hasNextPage: page < Math.ceil(filteredHistory.length / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  }
};

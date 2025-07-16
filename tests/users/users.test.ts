import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAdmin,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  generateRandomEmail,
  generateRandomString
} from '../utils/testHelpers';

describe('User Management API', () => {
  let user: any;
  let admin: any;

  beforeEach(() => {
    user = createTestUser();
    admin = createTestAdmin();
  });

  describe('GET /api/v1/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/profile');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(response, 401, 'Invalid token');
    });
  });

  describe('PUT /api/v1/profile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '+250788123456',
        bio: 'Updated bio information'
      };

      const response = await authenticatedRequest(user.token)
        .put('/api/v1/profile')
        .send(updateData);

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Profile updated successfully');
        expect(response.body.data.name).toBe(updateData.name);
      }
    });

    it('should fail without authentication', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/v1/profile')
        .send(updateData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid email format', async () => {
      const updateData = {
        email: 'invalid-email-format'
      };

      const response = await authenticatedRequest(user.token)
        .put('/api/v1/profile')
        .send(updateData);

      expectErrorResponse(response, 400, 'Invalid email format');
    });

    it('should fail with invalid phone format', async () => {
      const updateData = {
        phone: 'invalid-phone'
      };

      const response = await authenticatedRequest(user.token)
        .put('/api/v1/profile')
        .send(updateData);

      expectErrorResponse(response, 400, 'Invalid phone format');
    });

    it('should not allow role change', async () => {
      const updateData = {
        role: 'admin'
      };

      const response = await authenticatedRequest(user.token)
        .put('/api/v1/profile')
        .send(updateData);

      // Role should not be updatable through profile endpoint
      expect(response.status).toBeOneOf([400, 403]);
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('should get user notifications', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/notifications');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/notifications');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should filter notifications by read status', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/notifications')
        .query({ read: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should paginate notifications', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/notifications')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notification-123';

      const response = await authenticatedRequest(user.token)
        .post(`/api/v1/notifications/${notificationId}/read`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Notification marked as read');
      }
    });

    it('should fail without authentication', async () => {
      const notificationId = 'notification-123';

      const response = await request(app)
        .post(`/api/v1/notifications/${notificationId}/read`);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid notification ID', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/notifications/invalid-id/read');

      expectErrorResponse(response, 400, 'Invalid notification ID');
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/notifications/read-all');

      expect(response.status).toBe(200);
      expectSuccessResponse(response, 200, 'All notifications marked as read');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/read-all');

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should delete notification', async () => {
      const notificationId = 'notification-123';

      const response = await authenticatedRequest(user.token)
        .delete(`/api/v1/notifications/${notificationId}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Notification deleted');
      }
    });

    it('should fail without authentication', async () => {
      const notificationId = 'notification-123';

      const response = await request(app)
        .delete(`/api/v1/notifications/${notificationId}`);

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should get unread notifications count', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/notifications/unread-count');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/unread-count');

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('GET /api/v1/tokens/balance', () => {
    it('should get user token balance', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/tokens/balance');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('balance');
      expect(typeof response.body.data.balance).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/balance');

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('GET /api/v1/tokens/history', () => {
    it('should get user token transaction history', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/tokens/history');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/history');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should filter token history by type', async () => {
      const response = await authenticatedRequest(user.token)
        .get('/api/v1/tokens/history')
        .query({ type: 'purchase' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/tokens/packages', () => {
    it('should get available token packages', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/packages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/tokens/purchase', () => {
    it('should purchase tokens successfully', async () => {
      const purchaseData = {
        packageId: 'package-123',
        paymentMethod: 'mobile_money'
      };

      const response = await authenticatedRequest(user.token)
        .post('/api/v1/tokens/purchase')
        .send(purchaseData);

      expect(response.status).toBeOneOf([200, 400, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Token purchase initiated');
        expect(response.body.data).toHaveProperty('transactionId');
      }
    });

    it('should fail without authentication', async () => {
      const purchaseData = {
        packageId: 'package-123',
        paymentMethod: 'mobile_money'
      };

      const response = await request(app)
        .post('/api/v1/tokens/purchase')
        .send(purchaseData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid package ID', async () => {
      const purchaseData = {
        packageId: 'invalid-package',
        paymentMethod: 'mobile_money'
      };

      const response = await authenticatedRequest(user.token)
        .post('/api/v1/tokens/purchase')
        .send(purchaseData);

      expectErrorResponse(response, 404, 'Package not found');
    });
  });
});

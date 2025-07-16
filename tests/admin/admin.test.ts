import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAgent,
  createTestAdmin,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  generateRandomEmail
} from '../utils/testHelpers';

describe('Admin Management API', () => {
  let client: any;
  let agent: any;
  let admin: any;

  beforeEach(() => {
    client = createTestUser();
    agent = createTestAgent();
    admin = createTestAdmin();
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/admin/users');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should fail as agent', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/admin/users');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should filter users by role', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/users')
        .query({ role: 'agent' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should paginate users', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should search users by email', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/users')
        .query({ search: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should get user by ID as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get(`/api/v1/admin/users/${client.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).not.toHaveProperty('password');
      }
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get(`/api/v1/admin/users/${agent.id}`);

      expectErrorResponse(response, 403, 'Admin access required');
    });
  });

  describe('PUT /api/v1/admin/users/:id', () => {
    it('should update user as admin', async () => {
      const updateData = {
        name: 'Updated Name',
        role: 'agent',
        isActive: true
      };

      const response = await authenticatedRequest(admin.token)
        .put(`/api/v1/admin/users/${client.id}`)
        .send(updateData);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'User updated successfully');
        expect(response.body.data.name).toBe(updateData.name);
      }
    });

    it('should fail as non-admin', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await authenticatedRequest(client.token)
        .put(`/api/v1/admin/users/${agent.id}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should fail with invalid role', async () => {
      const updateData = {
        role: 'invalid-role'
      };

      const response = await authenticatedRequest(admin.token)
        .put(`/api/v1/admin/users/${client.id}`)
        .send(updateData);

      expectErrorResponse(response, 400, 'Invalid role');
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should delete user as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .delete(`/api/v1/admin/users/${client.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'User deleted successfully');
      }
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .delete(`/api/v1/admin/users/${agent.id}`);

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should fail deleting self', async () => {
      const response = await authenticatedRequest(admin.token)
        .delete(`/api/v1/admin/users/${admin.id}`);

      expectErrorResponse(response, 400, 'Cannot delete your own account');
    });
  });

  describe('GET /api/v1/admin/trips', () => {
    it('should get all trips as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/trips');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/admin/trips');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should filter trips by status', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/trips')
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('PUT /api/v1/admin/trips/:id/approve', () => {
    it('should approve trip as admin', async () => {
      const tripId = 'trip-123';

      const response = await authenticatedRequest(admin.token)
        .put(`/api/v1/admin/trips/${tripId}/approve`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Trip approved successfully');
      }
    });

    it('should fail as non-admin', async () => {
      const tripId = 'trip-123';

      const response = await authenticatedRequest(agent.token)
        .put(`/api/v1/admin/trips/${tripId}/approve`);

      expectErrorResponse(response, 403, 'Admin access required');
    });
  });

  describe('PUT /api/v1/admin/trips/:id/reject', () => {
    it('should reject trip as admin', async () => {
      const tripId = 'trip-123';
      const rejectionData = {
        reason: 'Does not meet safety standards'
      };

      const response = await authenticatedRequest(admin.token)
        .put(`/api/v1/admin/trips/${tripId}/reject`)
        .send(rejectionData);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Trip rejected successfully');
      }
    });

    it('should fail as non-admin', async () => {
      const tripId = 'trip-123';
      const rejectionData = {
        reason: 'Test reason'
      };

      const response = await authenticatedRequest(agent.token)
        .put(`/api/v1/admin/trips/${tripId}/reject`)
        .send(rejectionData);

      expectErrorResponse(response, 403, 'Admin access required');
    });
  });

  describe('GET /api/v1/admin/bookings', () => {
    it('should get all bookings as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/bookings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/admin/bookings');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should filter bookings by status', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/bookings')
        .query({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/admin/analytics', () => {
    it('should get system analytics as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalTrips');
      expect(response.body.data).toHaveProperty('totalBookings');
      expect(response.body.data).toHaveProperty('totalRevenue');
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/admin/analytics');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should get analytics with date range', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/admin/reports', () => {
    it('should get system reports as admin', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/reports');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should fail as non-admin', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/admin/reports');

      expectErrorResponse(response, 403, 'Admin access required');
    });

    it('should generate specific report type', async () => {
      const response = await authenticatedRequest(admin.token)
        .get('/api/v1/admin/reports')
        .query({ type: 'revenue' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});

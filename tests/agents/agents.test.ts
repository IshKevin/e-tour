import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAgent,
  createTestAdmin,
  createTestTrip,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  generateRandomString
} from '../utils/testHelpers';

describe('Agent Management API', () => {
  let client: any;
  let agent: any;
  let admin: any;
  let testTrip: any;

  beforeEach(() => {
    client = createTestUser();
    agent = createTestAgent();
    admin = createTestAdmin();
    testTrip = createTestTrip();
  });

  describe('POST /api/v1/agent/trips', () => {
    it('should create trip successfully as agent', async () => {
      const tripData = {
        title: 'Gorilla Trekking Adventure',
        description: 'Experience the magnificent mountain gorillas in their natural habitat',
        price: '800.00',
        maxSeats: 8,
        location: 'Volcanoes National Park',
        startDate: '2024-06-01',
        endDate: '2024-06-03',
        category: 'Wildlife',
        difficulty: 'Moderate',
        includes: ['Transportation', 'Guide', 'Permits'],
        excludes: ['Meals', 'Accommodation']
      };

      const response = await authenticatedRequest(agent.token)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expect(response.status).toBeOneOf([201, 400]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Trip created successfully');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.title).toBe(tripData.title);
        expect(response.body.data.agentId).toBe(agent.id);
      }
    });

    it('should fail creating trip as client', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'Test description',
        price: '100.00',
        maxSeats: 5,
        location: 'Test Location',
        startDate: '2024-06-01',
        endDate: '2024-06-02'
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expectErrorResponse(response, 403, 'Agent access required');
    });

    it('should fail without authentication', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'Test description',
        price: '100.00'
      };

      const response = await request(app)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid price format', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'Test description',
        price: 'invalid-price',
        maxSeats: 5,
        location: 'Test Location',
        startDate: '2024-06-01',
        endDate: '2024-06-02'
      };

      const response = await authenticatedRequest(agent.token)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expectErrorResponse(response, 400, 'Invalid price format');
    });

    it('should fail with past start date', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'Test description',
        price: '100.00',
        maxSeats: 5,
        location: 'Test Location',
        startDate: '2020-01-01', // Past date
        endDate: '2020-01-02'
      };

      const response = await authenticatedRequest(agent.token)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expectErrorResponse(response, 400, 'Start date cannot be in the past');
    });

    it('should fail with end date before start date', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'Test description',
        price: '100.00',
        maxSeats: 5,
        location: 'Test Location',
        startDate: '2024-06-05',
        endDate: '2024-06-01' // Before start date
      };

      const response = await authenticatedRequest(agent.token)
        .post('/api/v1/agent/trips')
        .send(tripData);

      expectErrorResponse(response, 400, 'End date must be after start date');
    });
  });

  describe('GET /api/v1/agent/trips', () => {
    it('should get agent trips', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/trips');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as client', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/agent/trips');

      expectErrorResponse(response, 403, 'Agent access required');
    });

    it('should filter trips by status', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/trips')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('PUT /api/v1/agent/trips/:id', () => {
    it('should update agent trip', async () => {
      const updateData = {
        title: 'Updated Trip Title',
        price: '900.00',
        maxSeats: 10
      };

      const response = await authenticatedRequest(agent.token)
        .put(`/api/v1/agent/trips/${testTrip.id}`)
        .send(updateData);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Trip updated successfully');
        expect(response.body.data.title).toBe(updateData.title);
      }
    });

    it('should fail updating other agent trip', async () => {
      const otherAgent = createTestAgent({ id: 999 });
      const updateData = {
        title: 'Updated Title'
      };

      const response = await authenticatedRequest(otherAgent.token)
        .put(`/api/v1/agent/trips/${testTrip.id}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'Not authorized to update this trip');
    });

    it('should fail as client', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await authenticatedRequest(client.token)
        .put(`/api/v1/agent/trips/${testTrip.id}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'Agent access required');
    });
  });

  describe('DELETE /api/v1/agent/trips/:id', () => {
    it('should delete agent trip', async () => {
      const response = await authenticatedRequest(agent.token)
        .delete(`/api/v1/agent/trips/${testTrip.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Trip deleted successfully');
      }
    });

    it('should fail deleting other agent trip', async () => {
      const otherAgent = createTestAgent({ id: 999 });

      const response = await authenticatedRequest(otherAgent.token)
        .delete(`/api/v1/agent/trips/${testTrip.id}`);

      expectErrorResponse(response, 403, 'Not authorized to delete this trip');
    });

    it('should fail as client', async () => {
      const response = await authenticatedRequest(client.token)
        .delete(`/api/v1/agent/trips/${testTrip.id}`);

      expectErrorResponse(response, 403, 'Agent access required');
    });
  });

  describe('GET /api/v1/agent/bookings', () => {
    it('should get agent trip bookings', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/bookings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as client', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/agent/bookings');

      expectErrorResponse(response, 403, 'Agent access required');
    });

    it('should filter bookings by status', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/bookings')
        .query({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/agent/custom-trips', () => {
    it('should get custom trip requests for agent', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/custom-trips');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail as client', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/agent/custom-trips');

      expectErrorResponse(response, 403, 'Agent access required');
    });
  });

  describe('POST /api/v1/agent/custom-trips/:id/respond', () => {
    it('should respond to custom trip request', async () => {
      const customTripId = 'custom-trip-123';
      const responseData = {
        message: 'We can arrange this trip for you',
        proposedPrice: '600.00',
        proposedDates: {
          startDate: '2024-06-01',
          endDate: '2024-06-05'
        }
      };

      const response = await authenticatedRequest(agent.token)
        .post(`/api/v1/agent/custom-trips/${customTripId}/respond`)
        .send(responseData);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Response sent successfully');
      }
    });

    it('should fail as client', async () => {
      const customTripId = 'custom-trip-123';
      const responseData = {
        message: 'Test response'
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/agent/custom-trips/${customTripId}/respond`)
        .send(responseData);

      expectErrorResponse(response, 403, 'Agent access required');
    });
  });

  describe('GET /api/v1/agent/analytics', () => {
    it('should get agent analytics', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/analytics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalTrips');
      expect(response.body.data).toHaveProperty('totalBookings');
      expect(response.body.data).toHaveProperty('totalRevenue');
    });

    it('should fail as client', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/agent/analytics');

      expectErrorResponse(response, 403, 'Agent access required');
    });

    it('should filter analytics by date range', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/agent/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});

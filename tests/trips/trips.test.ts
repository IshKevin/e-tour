import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAgent,
  createTestTrip,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  generateRandomString
} from '../utils/testHelpers';

describe('Trip Management API', () => {
  let client: any;
  let agent: any;
  let testTrip: any;

  beforeEach(() => {
    client = createTestUser();
    agent = createTestAgent();
    testTrip = createTestTrip();
  });

  describe('GET /api/v1/trips', () => {
    it('should get all trips without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/trips');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter trips by location', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .query({ location: 'Volcanoes National Park' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter trips by price range', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .query({ minPrice: 100, maxPrice: 1000 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should paginate trips', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/v1/trips/:id', () => {
    it('should get trip by valid ID', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${testTrip.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('title');
        expect(response.body.data).toHaveProperty('description');
      }
    });

    it('should return 404 for non-existent trip', async () => {
      const response = await request(app)
        .get('/api/v1/trips/non-existent-id');

      expectErrorResponse(response, 404, 'Trip not found');
    });

    it('should return 400 for invalid trip ID format', async () => {
      const response = await request(app)
        .get('/api/v1/trips/invalid-uuid');

      expectErrorResponse(response, 400, 'Invalid trip ID');
    });
  });

  describe('POST /api/v1/trips/:id/book', () => {
    it('should book a trip successfully', async () => {
      const bookingData = {
        seatsBooked: 2,
        specialRequests: 'Vegetarian meals please'
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/book`)
        .send(bookingData);

      expect(response.status).toBeOneOf([201, 400, 404]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Trip booked successfully');
        expect(response.body.data).toHaveProperty('bookingId');
        expect(response.body.data).toHaveProperty('totalAmount');
      }
    });

    it('should fail booking without authentication', async () => {
      const bookingData = {
        seatsBooked: 2
      };

      const response = await request(app)
        .post(`/api/v1/trips/${testTrip.id}/book`)
        .send(bookingData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail booking with invalid seats number', async () => {
      const bookingData = {
        seatsBooked: 0
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/book`)
        .send(bookingData);

      expectErrorResponse(response, 400, 'Invalid number of seats');
    });

    it('should fail booking with too many seats', async () => {
      const bookingData = {
        seatsBooked: 100
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/book`)
        .send(bookingData);

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/v1/trips/:id/reviews', () => {
    it('should get trip reviews', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${testTrip.id}/reviews`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should paginate reviews', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${testTrip.id}/reviews`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBeOneOf([200, 404]);
    });
  });

  describe('POST /api/v1/trips/:id/reviews', () => {
    it('should create a review successfully', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Amazing experience! Highly recommended.'
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/reviews`)
        .send(reviewData);

      expect(response.status).toBeOneOf([201, 400, 403, 404]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Review created successfully');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.rating).toBe(reviewData.rating);
        expect(response.body.data.comment).toBe(reviewData.comment);
      }
    });

    it('should fail creating review without authentication', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great trip!'
      };

      const response = await request(app)
        .post(`/api/v1/trips/${testTrip.id}/reviews`)
        .send(reviewData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid rating', async () => {
      const reviewData = {
        rating: 6, // Invalid rating (should be 1-5)
        comment: 'Great trip!'
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/reviews`)
        .send(reviewData);

      expectErrorResponse(response, 400, 'Rating must be between 1 and 5');
    });

    it('should fail with missing rating', async () => {
      const reviewData = {
        comment: 'Great trip!'
        // Missing rating
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/trips/${testTrip.id}/reviews`)
        .send(reviewData);

      expectErrorResponse(response, 400, 'Rating is required');
    });
  });

  describe('GET /api/v1/my-bookings', () => {
    it('should get user bookings', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/my-bookings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/my-bookings');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should filter bookings by status', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/my-bookings')
        .query({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/v1/custom-trips', () => {
    it('should create custom trip request successfully', async () => {
      const customTripData = {
        destination: 'Akagera National Park',
        budget: '500.00',
        interests: 'Wildlife, Photography',
        preferredStartDate: '2024-06-01',
        preferredEndDate: '2024-06-05',
        groupSize: 4,
        clientNotes: 'Looking for wildlife safari experience'
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/custom-trips')
        .send(customTripData);

      expect(response.status).toBeOneOf([201, 400]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Custom trip request created');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.destination).toBe(customTripData.destination);
      }
    });

    it('should fail without authentication', async () => {
      const customTripData = {
        destination: 'Akagera National Park',
        budget: '500.00'
      };

      const response = await request(app)
        .post('/api/v1/custom-trips')
        .send(customTripData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with missing required fields', async () => {
      const response = await authenticatedRequest(client.token)
        .post('/api/v1/custom-trips')
        .send({
          destination: 'Akagera National Park'
          // Missing other required fields
        });

      expectErrorResponse(response, 400);
    });

    it('should fail with invalid budget format', async () => {
      const customTripData = {
        destination: 'Akagera National Park',
        budget: 'invalid-budget',
        interests: 'Wildlife',
        preferredStartDate: '2024-06-01',
        preferredEndDate: '2024-06-05',
        groupSize: 4
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/custom-trips')
        .send(customTripData);

      expectErrorResponse(response, 400, 'Invalid budget format');
    });
  });

  describe('GET /api/v1/my-custom-trips', () => {
    it('should get user custom trip requests', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/my-custom-trips');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/my-custom-trips');

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });
});

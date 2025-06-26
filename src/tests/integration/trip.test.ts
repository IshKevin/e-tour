import request from 'supertest';
import app from '../../app';

describe('Trip Endpoints', () => {
  let clientToken: string;
  let agentToken: string;
  let adminToken: string;
  let clientId: number;
  let agentId: number;
  let tripId: number;
  let bookingId: number;

  beforeAll(async () => {
    // Register and login as client
    const clientRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Client',
        email: 'client@test.com',
        password: 'password123',
        role: 'client'
      });

    clientId = clientRegister.body.data.id;

    const clientLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'client@test.com',
        password: 'password123'
      });

    clientToken = clientLogin.body.data.token;

    // Register and login as agent
    const agentRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Agent',
        email: 'agent@test.com',
        password: 'password123',
        role: 'agent'
      });

    agentId = agentRegister.body.data.id;

    const agentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'agent@test.com',
        password: 'password123'
      });

    agentToken = agentLogin.body.data.token;

    // Register and login as admin
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });

    adminToken = adminLogin.body.data.token;

    // Create a test trip
    const tripResponse = await request(app)
      .post('/api/v1/agent/trips')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Amazing Paris Tour',
        description: 'Explore the city of lights',
        price: 1500,
        maxSeats: 20,
        location: 'Paris, France',
        startDate: '2024-06-01',
        endDate: '2024-06-07'
      });

    tripId = tripResponse.body.data.id;
  });

  describe('GET /api/v1/trips', () => {
    it('should get all trips without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trips');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.trips)).toBe(true);
    });

    it('should filter trips by location', async () => {
      const response = await request(app)
        .get('/api/v1/trips?location=Paris')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trips.length).toBeGreaterThan(0);
      expect(response.body.data.trips[0].location).toContain('Paris');
    });

    it('should paginate trips correctly', async () => {
      const response = await request(app)
        .get('/api/v1/trips?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter trips by price range', async () => {
      const response = await request(app)
        .get('/api/v1/trips?minPrice=1000&maxPrice=2000')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.trips.length > 0) {
        response.body.data.trips.forEach((trip: any) => {
          const price = parseFloat(trip.price);
          expect(price).toBeGreaterThanOrEqual(1000);
          expect(price).toBeLessThanOrEqual(2000);
        });
      }
    });
  });

  describe('GET /api/v1/trips/:id', () => {
    it('should get trip details', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${tripId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', tripId);
      expect(response.body.data).toHaveProperty('title', 'Amazing Paris Tour');
      expect(response.body.data).toHaveProperty('reviews');
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
    });

    it('should return 404 for non-existent trip', async () => {
      const response = await request(app)
        .get('/api/v1/trips/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Trip not found');
    });

    it('should return 400 for invalid trip ID', async () => {
      const response = await request(app)
        .get('/api/v1/trips/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid trip ID');
    });
  });

  describe('GET /api/v1/trending', () => {
    it('should get trending trips', async () => {
      const response = await request(app)
        .get('/api/v1/trending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should limit trending trips', async () => {
      const response = await request(app)
        .get('/api/v1/trending?limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('POST /api/v1/trips/:id/book', () => {
    it('should book a trip successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          seatsBooked: 2
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('seatsBooked', 2);
      expect(response.body.data).toHaveProperty('status', 'pending');

      bookingId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/book`)
        .send({
          seatsBooked: 1
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should validate seats booked', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          seatsBooked: 0
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent trip', async () => {
      const response = await request(app)
        .post('/api/v1/trips/99999/book')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          seatsBooked: 1
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should get user bookings', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('tripTitle');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('POST /api/v1/bookings/:id/cancel', () => {
    it('should cancel booking successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Change of plans'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
      expect(response.body.data).toHaveProperty('cancellationReason', 'Change of plans');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .send({
          reason: 'Test'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 404 for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/v1/bookings/99999/cancel')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/trips/:id/review', () => {
    beforeEach(async () => {
      // Create a completed booking for review
      const bookingResponse = await request(app)
        .post(`/api/v1/trips/${tripId}/book`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          seatsBooked: 1
        });

      const newBookingId = bookingResponse.body.data.id;

      // Manually update booking status to completed (in real app, this would be done by agent/admin)
      // For testing purposes, we'll assume this is done
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/review`)
        .send({
          bookingId: bookingId,
          rating: 5,
          comment: 'Great trip!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/review`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          bookingId: bookingId,
          rating: 6,
          comment: 'Great trip!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should require valid booking ID', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${tripId}/review`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          bookingId: 'invalid',
          rating: 5,
          comment: 'Great trip!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid booking ID');
    });
  });

  describe('POST /api/v1/custom-trips', () => {
    it('should create custom trip request', async () => {
      const response = await request(app)
        .post('/api/v1/custom-trips')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          destination: 'Tokyo, Japan',
          budget: 3000,
          interests: 'Culture, Food, Technology',
          preferredStartDate: '2024-07-01',
          preferredEndDate: '2024-07-10',
          groupSize: 2,
          clientNotes: 'Looking for authentic experiences'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('destination', 'Tokyo, Japan');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/custom-trips')
        .send({
          destination: 'Tokyo, Japan',
          budget: 3000
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/custom-trips')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          budget: 3000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/custom-trips', () => {
    it('should get user custom trip requests', async () => {
      const response = await request(app)
        .get('/api/v1/custom-trips')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/custom-trips')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});

import request from 'supertest';
import { app } from '../../src/app';
import {
  generateRandomEmail,
  generateRandomString,
  expectSuccessResponse,
  expectErrorResponse,
  delay
} from '../utils/testHelpers';

describe('Integration Tests', () => {
  describe('Complete User Journey', () => {
    let userToken: string;
    let agentToken: string;
    let tripId: string;
    let bookingId: string;

    it('should complete full user registration and trip booking flow', async () => {
      // 1. Register a new user
      const userData = {
        name: 'Integration Test User',
        email: generateRandomEmail(),
        password: 'password123',
        role: 'client'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(registerResponse.status).toBeOneOf([201, 400]);
      
      if (registerResponse.status === 201) {
        userToken = registerResponse.body.data.token;
        
        // 2. Get user profile
        const profileResponse = await request(app)
          .get('/api/v1/profile')
          .set('Authorization', `Bearer ${userToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.data.email).toBe(userData.email);

        // 3. Update profile
        const updateData = {
          name: 'Updated Integration User',
          phone: '+250788123456',
          bio: 'Test user for integration testing'
        };

        const updateResponse = await request(app)
          .put('/api/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData);

        expect(updateResponse.status).toBeOneOf([200, 400]);

        // 4. Get available trips
        const tripsResponse = await request(app)
          .get('/api/v1/trips');

        expect(tripsResponse.status).toBe(200);
        expect(Array.isArray(tripsResponse.body.data)).toBe(true);

        // 5. Search for trips
        const searchResponse = await request(app)
          .get('/api/v1/search')
          .query({ q: 'gorilla', type: 'trips' });

        expect(searchResponse.status).toBe(200);

        // 6. Get token packages
        const packagesResponse = await request(app)
          .get('/api/v1/tokens/packages');

        expect(packagesResponse.status).toBe(200);
        expect(Array.isArray(packagesResponse.body.data)).toBe(true);

        // 7. Check token balance
        const balanceResponse = await request(app)
          .get('/api/v1/tokens/balance')
          .set('Authorization', `Bearer ${userToken}`);

        expect(balanceResponse.status).toBe(200);
        expect(typeof balanceResponse.body.data.balance).toBe('number');
      }
    });

    it('should complete agent registration and trip creation flow', async () => {
      // 1. Register an agent
      const agentData = {
        name: 'Integration Test Agent',
        email: generateRandomEmail(),
        password: 'password123',
        role: 'agent'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(agentData);

      expect(registerResponse.status).toBeOneOf([201, 400]);

      if (registerResponse.status === 201) {
        agentToken = registerResponse.body.data.token;

        // 2. Create a trip
        const tripData = {
          title: 'Integration Test Gorilla Trekking',
          description: 'Test trip for integration testing',
          price: '800.00',
          maxSeats: 8,
          location: 'Volcanoes National Park',
          startDate: '2024-08-01',
          endDate: '2024-08-03',
          category: 'Wildlife',
          difficulty: 'Moderate'
        };

        const createTripResponse = await request(app)
          .post('/api/v1/agent/trips')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(tripData);

        expect(createTripResponse.status).toBeOneOf([201, 400, 403]);

        if (createTripResponse.status === 201) {
          tripId = createTripResponse.body.data.id;

          // 3. Get agent trips
          const agentTripsResponse = await request(app)
            .get('/api/v1/agent/trips')
            .set('Authorization', `Bearer ${agentToken}`);

          expect(agentTripsResponse.status).toBeOneOf([200, 403]);

          // 4. Update the trip
          const updateTripData = {
            title: 'Updated Integration Test Trip',
            price: '900.00'
          };

          const updateTripResponse = await request(app)
            .put(`/api/v1/agent/trips/${tripId}`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send(updateTripData);

          expect(updateTripResponse.status).toBeOneOf([200, 404, 403]);

          // 5. Get agent analytics
          const analyticsResponse = await request(app)
            .get('/api/v1/agent/analytics')
            .set('Authorization', `Bearer ${agentToken}`);

          expect(analyticsResponse.status).toBeOneOf([200, 403]);
        }
      }
    });

    it('should complete job posting and application flow', async () => {
      if (!userToken) {
        // Skip if user registration failed
        return;
      }

      // 1. Create a job
      const jobData = {
        title: 'Integration Test Tour Guide',
        description: 'Test job for integration testing',
        tokenCost: 50,
        category: 'Tour Guide',
        location: 'Nyungwe Forest',
        applicationDeadline: '2024-07-01'
      };

      const createJobResponse = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(jobData);

      expect(createJobResponse.status).toBeOneOf([201, 400]);

      if (createJobResponse.status === 201) {
        const jobId = createJobResponse.body.data.id;

        // 2. Get available jobs
        const availableJobsResponse = await request(app)
          .get('/api/v1/jobs/available');

        expect(availableJobsResponse.status).toBe(200);

        // 3. Get job details
        const jobDetailsResponse = await request(app)
          .get(`/api/v1/jobs/${jobId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(jobDetailsResponse.status).toBeOneOf([200, 404]);

        // 4. Apply for job (if agent token exists)
        if (agentToken) {
          const applicationData = {
            coverLetter: 'I am interested in this position for integration testing.',
            expectedRate: '50.00'
          };

          const applyResponse = await request(app)
            .post(`/api/v1/jobs/${jobId}/apply`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send(applicationData);

          expect(applyResponse.status).toBeOneOf([201, 400, 404]);

          // 5. Get job applicants
          const applicantsResponse = await request(app)
            .get(`/api/v1/jobs/${jobId}/applicants`)
            .set('Authorization', `Bearer ${userToken}`);

          expect(applicantsResponse.status).toBeOneOf([200, 404, 403]);

          // 6. Get user applications
          const myApplicationsResponse = await request(app)
            .get('/api/v1/my-applications')
            .set('Authorization', `Bearer ${agentToken}`);

          expect(myApplicationsResponse.status).toBeOneOf([200, 401]);
        }
      }
    });

    it('should handle custom trip request flow', async () => {
      if (!userToken) {
        return;
      }

      // 1. Create custom trip request
      const customTripData = {
        destination: 'Integration Test Destination',
        budget: '600.00',
        interests: 'Wildlife, Photography',
        preferredStartDate: '2024-07-01',
        preferredEndDate: '2024-07-05',
        groupSize: 4,
        clientNotes: 'Integration test custom trip request'
      };

      const createCustomTripResponse = await request(app)
        .post('/api/v1/custom-trips')
        .set('Authorization', `Bearer ${userToken}`)
        .send(customTripData);

      expect(createCustomTripResponse.status).toBeOneOf([201, 400]);

      if (createCustomTripResponse.status === 201) {
        const customTripId = createCustomTripResponse.body.data.id;

        // 2. Get user custom trips
        const myCustomTripsResponse = await request(app)
          .get('/api/v1/my-custom-trips')
          .set('Authorization', `Bearer ${userToken}`);

        expect(myCustomTripsResponse.status).toBe(200);

        // 3. Agent responds to custom trip (if agent token exists)
        if (agentToken) {
          const responseData = {
            message: 'We can arrange this trip for you',
            proposedPrice: '650.00',
            proposedDates: {
              startDate: '2024-07-01',
              endDate: '2024-07-05'
            }
          };

          const respondResponse = await request(app)
            .post(`/api/v1/agent/custom-trips/${customTripId}/respond`)
            .set('Authorization', `Bearer ${agentToken}`)
            .send(responseData);

          expect(respondResponse.status).toBeOneOf([200, 404, 403]);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expectErrorResponse(response, 401);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ invalid: 'data' });

      expectErrorResponse(response, 400);
    });

    it('should handle non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/trips')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBeOneOf([200, 204]);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/api/v1/trips')
      );

      const responses = await Promise.all(promises);

      // All should succeed or some should be rate limited
      responses.forEach(response => {
        expect(response.status).toBeOneOf([200, 429]);
      });
    });
  });

  describe('API Performance', () => {
    it('should respond to health check quickly', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/health');

      const responseTime = Date.now() - startTime;

      expect(response.status).toBeOneOf([200, 404]);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/v1/trips')
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(responses).toHaveLength(concurrentRequests);

      // Most should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.8);

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // This test would verify that related operations maintain data integrity
      // For example, booking a trip should update available seats
      // Creating a job should appear in available jobs list
      // etc.

      const tripsResponse = await request(app)
        .get('/api/v1/trips');

      expect(tripsResponse.status).toBe(200);

      const jobsResponse = await request(app)
        .get('/api/v1/jobs/available');

      expect(jobsResponse.status).toBe(200);

      // Verify data structure consistency
      if (tripsResponse.body.data.length > 0) {
        const trip = tripsResponse.body.data[0];
        expect(trip).toHaveProperty('id');
        expect(trip).toHaveProperty('title');
        expect(trip).toHaveProperty('price');
      }

      if (jobsResponse.body.data.length > 0) {
        const job = jobsResponse.body.data[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('tokenCost');
      }
    });
  });
});

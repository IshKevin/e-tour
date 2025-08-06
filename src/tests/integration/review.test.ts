import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  testUsers,
  testTrip,
  testBooking,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  expectForbiddenError,
  TEST_CONSTANTS
} from '../setup';

describe('Review System Tests', () => {
  describe('GET /api/v1/trips/:id/reviews', () => {
    test('should get trip reviews successfully (public)', async () => {
      const response = await makeRequest()
        .get(`/api/v1/trips/${testTrip.id}/reviews`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('reviews');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.reviewsInfo).toHaveProperty('tripId', testTrip.id);
    });

    test('should support pagination', async () => {
      const response = await makeRequest()
        .get(`/api/v1/trips/${testTrip.id}/reviews?page=1&limit=5`);

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support rating filter', async () => {
      const response = await makeRequest()
        .get(`/api/v1/trips/${testTrip.id}/reviews?rating=5`);

      expectSuccessResponse(response);
    });

    test('should support sorting', async () => {
      const response = await makeRequest()
        .get(`/api/v1/trips/${testTrip.id}/reviews?sortBy=newest`);

      expectSuccessResponse(response);
    });

    test('should handle invalid trip ID', async () => {
      const response = await makeRequest()
        .get('/api/v1/trips/invalid-uuid/reviews');

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/v1/agents/:id/reviews', () => {
    test('should get agent reviews successfully (public)', async () => {
      const response = await makeRequest()
        .get(`/api/v1/agents/${testUsers.agent.id}/reviews`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('reviews');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.agentInfo).toHaveProperty('agentId', testUsers.agent.id);
    });

    test('should include category ratings', async () => {
      const response = await makeRequest()
        .get(`/api/v1/agents/${testUsers.agent.id}/reviews`);

      expectSuccessResponse(response);
      expect(response.body.data.agentInfo).toHaveProperty('categoryRatings');
    });

    test('should support pagination and sorting', async () => {
      const response = await makeRequest()
        .get(`/api/v1/agents/${testUsers.agent.id}/reviews?page=1&limit=10&sortBy=helpful`);

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('should handle invalid agent ID', async () => {
      const response = await makeRequest()
        .get('/api/v1/agents/invalid-uuid/reviews');

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/v1/agents/:id/review', () => {
    const validReviewData = {
      rating: 5,
      comment: 'Excellent service! Highly recommended.',
      bookingId: testBooking.id,
      categories: {
        communication: 5,
        professionalism: 5,
        knowledge: 5,
        responsiveness: 5
      }
    };

    test('should create agent review successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(validReviewData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('reviewId');
      expect(response.body.data.reviewInfo).toHaveProperty('rating', 5);
      expect(response.body.data.reviewInfo).toHaveProperty('categories');
      expect(response.body.data.reviewInfo.categories).toHaveProperty('communication', 5);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(validReviewData);

      expectAuthError(response);
    });

    test('should validate rating range', async () => {
      const invalidData = {
        ...validReviewData,
        rating: 6 // Invalid rating
      };

      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate category ratings', async () => {
      const invalidData = {
        ...validReviewData,
        categories: {
          communication: 6, // Invalid rating
          professionalism: 5,
          knowledge: 5,
          responsiveness: 5
        }
      };

      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate booking ID format', async () => {
      const invalidData = {
        ...validReviewData,
        bookingId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate comment length', async () => {
      const invalidData = {
        ...validReviewData,
        comment: 'a'.repeat(1001) // Too long
      };

      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('POST /api/v1/admin/reviews/:id/report', () => {
    const validReportData = {
      reason: 'spam',
      adminNotes: 'Suspicious review pattern detected'
    };

    test('should report review successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send(validReportData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data.reportInfo).toHaveProperty('reason', 'spam');
      expect(response.body.data.moderationInfo).toHaveProperty('priority');
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send(validReportData);

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send(validReportData);

      expectAuthError(response);
    });

    test('should validate report reason', async () => {
      const invalidData = {
        ...validReportData,
        reason: 'invalid_reason'
      };

      const response = await makeRequest(testTokens.admin)
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate admin notes length', async () => {
      const invalidData = {
        ...validReportData,
        adminNotes: 'a'.repeat(1001) // Too long
      };

      const response = await makeRequest(testTokens.admin)
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('PUT /api/v1/admin/reviews/:id/moderate', () => {
    const validModerationData = {
      status: 'approved',
      moderatorNotes: 'Review meets community guidelines'
    };

    test('should moderate review successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send(validModerationData);

      expectSuccessResponse(response, 200);
      expect(response.body.data.moderationInfo).toHaveProperty('action', 'approved');
      expect(response.body.data.impactInfo).toHaveProperty('visibility');
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send(validModerationData);

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send(validModerationData);

      expectAuthError(response);
    });

    test('should validate moderation status', async () => {
      const invalidData = {
        ...validModerationData,
        status: 'invalid_status'
      };

      const response = await makeRequest(testTokens.admin)
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate moderator notes length', async () => {
      const invalidData = {
        ...validModerationData,
        moderatorNotes: 'a'.repeat(1001) // Too long
      };

      const response = await makeRequest(testTokens.admin)
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('Review Integration Tests', () => {
    test('should handle complete review workflow', async () => {
      // 1. Create a review
      const reviewResponse = await makeRequest(testTokens.client)
        .post(`/api/v1/agents/${testUsers.agent.id}/review`)
        .send({
          rating: 4,
          comment: 'Good service overall',
          bookingId: testBooking.id,
          categories: {
            communication: 4,
            professionalism: 5,
            knowledge: 4,
            responsiveness: 4
          }
        });

      expectSuccessResponse(reviewResponse, 201);

      // 2. Get agent reviews to verify it appears
      const agentReviewsResponse = await makeRequest()
        .get(`/api/v1/agents/${testUsers.agent.id}/reviews`);

      expectSuccessResponse(agentReviewsResponse);
      expect(agentReviewsResponse.body.data.reviews.length).toBeGreaterThanOrEqual(0);

      // 3. Admin reports the review
      const reportResponse = await makeRequest(testTokens.admin)
        .post(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/report`)
        .send({
          reason: 'inappropriate_content',
          adminNotes: 'Contains inappropriate language'
        });

      expectSuccessResponse(reportResponse, 201);

      // 4. Admin moderates the review
      const moderateResponse = await makeRequest(testTokens.admin)
        .put(`/api/v1/admin/reviews/${TEST_CONSTANTS.VALID_UUID}/moderate`)
        .send({
          status: 'rejected',
          moderatorNotes: 'Violates community guidelines'
        });

      expectSuccessResponse(moderateResponse, 200);
    });
  });
});

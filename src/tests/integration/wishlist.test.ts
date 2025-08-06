import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  testTrip,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  TEST_CONSTANTS
} from '../setup';

describe('Wishlist System Tests', () => {
  describe('POST /api/v1/wishlist/add', () => {
    const validWishlistData = {
      tripId: testTrip.id,
      notes: 'Interested for summer vacation'
    };

    test('should add trip to wishlist successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(validWishlistData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('wishlistInfo');
      expect(response.body.data.wishlistInfo).toHaveProperty('itemId');
      expect(response.body.data.tripInfo).toHaveProperty('id', testTrip.id);
      expect(response.body.data.tripInfo).toHaveProperty('isAvailable');
      expect(response.body.data.tripInfo).toHaveProperty('canBook');
    });

    test('should add trip without notes', async () => {
      const dataWithoutNotes = {
        tripId: testTrip.id
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(dataWithoutNotes);

      expectSuccessResponse(response, 201);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/wishlist/add')
        .send(validWishlistData);

      expectAuthError(response);
    });

    test('should validate trip ID format', async () => {
      const invalidData = {
        tripId: 'invalid-uuid',
        notes: 'Test notes'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate notes length', async () => {
      const invalidData = {
        tripId: testTrip.id,
        notes: 'a'.repeat(501) // Too long
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should handle duplicate trip addition', async () => {
      // First addition
      await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(validWishlistData);

      // Second addition (should fail)
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send(validWishlistData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('already in your wishlist');
    });
  });

  describe('DELETE /api/v1/wishlist/remove', () => {
    const removeData = {
      tripId: testTrip.id
    };

    test('should remove trip from wishlist successfully', async () => {
      // First add the trip
      await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send({ tripId: testTrip.id });

      // Then remove it
      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/remove')
        .send(removeData);

      expectSuccessResponse(response, 200);
      expect(response.body.data.removalInfo).toHaveProperty('tripId', testTrip.id);
      expect(response.body.data.suggestions).toHaveProperty('message');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .delete('/api/v1/wishlist/remove')
        .send(removeData);

      expectAuthError(response);
    });

    test('should validate trip ID format', async () => {
      const invalidData = {
        tripId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/remove')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should handle removing non-existent trip', async () => {
      const nonExistentData = {
        tripId: TEST_CONSTANTS.VALID_UUID
      };

      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/remove')
        .send(nonExistentData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('not found in your wishlist');
    });
  });

  describe('GET /api/v1/wishlist', () => {
    test('should get user wishlist successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('wishlistItems');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('wishlistInfo');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data).toHaveProperty('actions');
    });

    test('should support pagination', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist?page=1&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support sorting', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist?sortBy=trip_name');

      expectSuccessResponse(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get('/api/v1/wishlist');

      expectAuthError(response);
    });

    test('should return empty wishlist for new user', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(response);
      expect(response.body.data.wishlistItems).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('DELETE /api/v1/wishlist/clear', () => {
    test('should clear wishlist successfully', async () => {
      // First add some trips
      await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send({ tripId: testTrip.id });

      // Then clear the wishlist
      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/clear');

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('clearInfo');
      expect(response.body.data.clearInfo).toHaveProperty('itemsRemoved');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data.recommendations).toHaveProperty('message');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .delete('/api/v1/wishlist/clear');

      expectAuthError(response);
    });

    test('should handle clearing empty wishlist', async () => {
      const response = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/clear');

      expectSuccessResponse(response, 200);
      expect(response.body.data.clearInfo.itemsRemoved).toBe(0);
    });
  });

  describe('Wishlist Integration Tests', () => {
    test('should handle complete wishlist workflow', async () => {
      // 1. Start with empty wishlist
      const emptyResponse = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(emptyResponse);
      const initialCount = emptyResponse.body.data.pagination.total;

      // 2. Add trip to wishlist
      const addResponse = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send({
          tripId: testTrip.id,
          notes: 'Planning for summer vacation'
        });

      expectSuccessResponse(addResponse, 201);

      // 3. Verify trip is in wishlist
      const wishlistResponse = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(wishlistResponse);
      expect(wishlistResponse.body.data.pagination.total).toBe(initialCount + 1);

      // 4. Try to add same trip again (should fail)
      const duplicateResponse = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send({ tripId: testTrip.id });

      expectErrorResponse(duplicateResponse, 400);

      // 5. Remove trip from wishlist
      const removeResponse = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/remove')
        .send({ tripId: testTrip.id });

      expectSuccessResponse(removeResponse, 200);

      // 6. Verify trip is removed
      const finalResponse = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(finalResponse);
      expect(finalResponse.body.data.pagination.total).toBe(initialCount);
    });

    test('should handle wishlist with multiple trips', async () => {
      // Add multiple trips (using same trip ID for simplicity in test)
      const trip1Response = await makeRequest(testTokens.client)
        .post('/api/v1/wishlist/add')
        .send({
          tripId: testTrip.id,
          notes: 'First trip'
        });

      expectSuccessResponse(trip1Response, 201);

      // Get wishlist with pagination
      const paginatedResponse = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist?page=1&limit=1');

      expectSuccessResponse(paginatedResponse);
      expect(paginatedResponse.body.data.pagination.limit).toBe(1);

      // Clear entire wishlist
      const clearResponse = await makeRequest(testTokens.client)
        .delete('/api/v1/wishlist/clear');

      expectSuccessResponse(clearResponse, 200);
      expect(clearResponse.body.data.clearInfo.itemsRemoved).toBeGreaterThan(0);

      // Verify wishlist is empty
      const emptyResponse = await makeRequest(testTokens.client)
        .get('/api/v1/wishlist');

      expectSuccessResponse(emptyResponse);
      expect(emptyResponse.body.data.pagination.total).toBe(0);
    });
  });
});

import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  testTrip,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  expectForbiddenError,
  TEST_CONSTANTS
} from '../setup';

describe('Promotional System Tests', () => {
  describe('POST /api/v1/promotions/validate', () => {
    const validValidationData = {
      code: 'SUMMER2024',
      tripAmount: 500.00,
      tripId: testTrip.id
    };

    test('should validate discount code successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(validValidationData);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('discountAmount');
      expect(response.body.data).toHaveProperty('finalAmount');
      expect(response.body.data).toHaveProperty('validationInfo');
      expect(response.body.data.validationInfo).toHaveProperty('code', 'SUMMER2024');
    });

    test('should validate without trip ID', async () => {
      const dataWithoutTripId = {
        code: 'GENERAL10',
        tripAmount: 300.00
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(dataWithoutTripId);

      expectSuccessResponse(response, 200);
    });

    test('should handle invalid discount code', async () => {
      const invalidCodeData = {
        code: 'INVALID_CODE',
        tripAmount: 500.00
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(invalidCodeData);

      expectSuccessResponse(response, 400); // Still success response but with isValid: false
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.message).toContain('Invalid or expired');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/promotions/validate')
        .send(validValidationData);

      expectAuthError(response);
    });

    test('should validate trip amount', async () => {
      const invalidData = {
        code: 'SUMMER2024',
        tripAmount: -100 // Invalid amount
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate code format', async () => {
      const invalidData = {
        code: '', // Empty code
        tripAmount: 500.00
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate trip ID format when provided', async () => {
      const invalidData = {
        code: 'SUMMER2024',
        tripAmount: 500.00,
        tripId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('POST /api/v1/promotions/admin/discount-codes', () => {
    const validDiscountCodeData = {
      code: 'TESTCODE2024',
      name: 'Test Discount Code',
      description: 'A test discount code for automated testing',
      discountType: 'percentage',
      discountValue: 15,
      minimumOrderAmount: 100,
      maximumDiscountAmount: 200,
      usageLimit: 1000,
      userUsageLimit: 1,
      validFrom: '2024-06-01T00:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
      isFirstTimeUserOnly: false,
      applicableToTrips: [testTrip.id]
    };

    test('should create discount code successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(validDiscountCodeData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('codeInfo');
      expect(response.body.data.codeInfo).toHaveProperty('code', 'TESTCODE2024');
      expect(response.body.data.codeInfo).toHaveProperty('type', 'percentage');
      expect(response.body.data).toHaveProperty('usageInfo');
      expect(response.body.data).toHaveProperty('validityInfo');
    });

    test('should create fixed amount discount code', async () => {
      const fixedAmountData = {
        ...validDiscountCodeData,
        code: 'FIXED50',
        discountType: 'fixed_amount',
        discountValue: 50
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(fixedAmountData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.codeInfo.type).toBe('fixed_amount');
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(validDiscountCodeData);

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/promotions/admin/discount-codes')
        .send(validDiscountCodeData);

      expectAuthError(response);
    });

    test('should validate discount type', async () => {
      const invalidData = {
        ...validDiscountCodeData,
        discountType: 'invalid_type'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate discount value', async () => {
      const invalidData = {
        ...validDiscountCodeData,
        discountValue: -10 // Invalid value
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate date formats', async () => {
      const invalidData = {
        ...validDiscountCodeData,
        validFrom: 'invalid-date'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate trip IDs in applicableToTrips', async () => {
      const invalidData = {
        ...validDiscountCodeData,
        applicableToTrips: ['invalid-uuid']
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('GET /api/v1/promotions/admin/discount-codes', () => {
    test('should get discount codes successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .get('/api/v1/promotions/admin/discount-codes');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('discountCodes');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('codesInfo');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('managementOptions');
    });

    test('should support pagination', async () => {
      const response = await makeRequest(testTokens.admin)
        .get('/api/v1/promotions/admin/discount-codes?page=1&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support status filtering', async () => {
      const response = await makeRequest(testTokens.admin)
        .get('/api/v1/promotions/admin/discount-codes?status=active');

      expectSuccessResponse(response);
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/promotions/admin/discount-codes');

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get('/api/v1/promotions/admin/discount-codes');

      expectAuthError(response);
    });
  });

  describe('POST /api/v1/promotions/admin/campaigns', () => {
    const validCampaignData = {
      name: 'Summer Campaign 2024',
      description: 'Promote summer destinations and activities',
      campaignType: 'seasonal',
      targetAudience: {
        userTypes: ['client'],
        locations: ['US', 'CA'],
        ageGroups: ['25-35', '36-45'],
        previousBookings: false
      },
      discountCodeIds: [TEST_CONSTANTS.VALID_UUID],
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2024-08-31T23:59:59Z',
      budget: 10000,
      targetReach: 5000
    };

    test('should create promotional campaign successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(validCampaignData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('campaignInfo');
      expect(response.body.data.campaignInfo).toHaveProperty('name', 'Summer Campaign 2024');
      expect(response.body.data.campaignInfo).toHaveProperty('type', 'seasonal');
      expect(response.body.data).toHaveProperty('budgetInfo');
      expect(response.body.data).toHaveProperty('targetingInfo');
    });

    test('should create campaign without budget', async () => {
      const noBudgetData = {
        ...validCampaignData,
        name: 'No Budget Campaign',
        budget: undefined
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(noBudgetData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.budgetInfo.budget).toBe('No budget set');
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/admin/campaigns')
        .send(validCampaignData);

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/promotions/admin/campaigns')
        .send(validCampaignData);

      expectAuthError(response);
    });

    test('should validate campaign name', async () => {
      const invalidData = {
        ...validCampaignData,
        name: '' // Empty name
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate date formats', async () => {
      const invalidData = {
        ...validCampaignData,
        startDate: 'invalid-date'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate budget amount', async () => {
      const invalidData = {
        ...validCampaignData,
        budget: -1000 // Negative budget
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate discount code IDs', async () => {
      const invalidData = {
        ...validCampaignData,
        discountCodeIds: ['invalid-uuid']
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('Promotional Integration Tests', () => {
    test('should handle complete promotional workflow', async () => {
      // 1. Admin creates a discount code
      const createCodeResponse = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/discount-codes')
        .send({
          code: 'INTEGRATION2024',
          name: 'Integration Test Code',
          description: 'Test code for integration testing',
          discountType: 'percentage',
          discountValue: 20,
          minimumOrderAmount: 50,
          usageLimit: 100,
          validFrom: '2024-01-01T00:00:00Z',
          validUntil: '2024-12-31T23:59:59Z'
        });

      expectSuccessResponse(createCodeResponse, 201);

      // 2. Admin views all discount codes
      const codesListResponse = await makeRequest(testTokens.admin)
        .get('/api/v1/promotions/admin/discount-codes');

      expectSuccessResponse(codesListResponse);
      expect(codesListResponse.body.data.discountCodes.length).toBeGreaterThanOrEqual(0);

      // 3. Client validates the discount code
      const validateResponse = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send({
          code: 'INTEGRATION2024',
          tripAmount: 100.00
        });

      expectSuccessResponse(validateResponse, 200);
      expect(validateResponse.body.data.isValid).toBe(true);
      expect(validateResponse.body.data.discountAmount).toBe(20); // 20% of 100

      // 4. Admin creates a campaign using the discount code
      const createCampaignResponse = await makeRequest(testTokens.admin)
        .post('/api/v1/promotions/admin/campaigns')
        .send({
          name: 'Integration Test Campaign',
          description: 'Campaign for integration testing',
          campaignType: 'test',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          budget: 5000,
          targetReach: 1000
        });

      expectSuccessResponse(createCampaignResponse, 201);
    });

    test('should handle discount code validation edge cases', async () => {
      // Test with minimum order amount not met
      const belowMinimumResponse = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send({
          code: 'MINIMUM100',
          tripAmount: 50.00 // Below minimum
        });

      expectSuccessResponse(belowMinimumResponse, 400);
      expect(belowMinimumResponse.body.data.isValid).toBe(false);
      expect(belowMinimumResponse.body.data.message).toContain('Minimum order amount');

      // Test with expired code
      const expiredCodeResponse = await makeRequest(testTokens.client)
        .post('/api/v1/promotions/validate')
        .send({
          code: 'EXPIRED2020',
          tripAmount: 200.00
        });

      expectSuccessResponse(expiredCodeResponse, 400);
      expect(expiredCodeResponse.body.data.isValid).toBe(false);
      expect(expiredCodeResponse.body.data.message).toContain('expired');
    });
  });
});

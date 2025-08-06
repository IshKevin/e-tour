import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  testUsers,
  testBooking,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  TEST_CONSTANTS
} from '../setup';

describe('Payment System Tests', () => {
  describe('POST /api/v1/payments/process', () => {
    const validPaymentData = {
      bookingId: testBooking.id,
      paymentMethod: 'card',
      paymentDetails: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'Test User'
      },
      amount: 500.00,
      currency: 'USD'
    };

    test('should process payment successfully with valid data', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send(validPaymentData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data).toHaveProperty('amount', validPaymentData.amount);
      expect(response.body.data.paymentInfo).toHaveProperty('method', 'card');
    });

    test('should process mobile money payment', async () => {
      const mobileMoneyData = {
        ...validPaymentData,
        paymentMethod: 'mobile_money',
        mobileMoneyDetails: {
          phoneNumber: '+1234567890',
          provider: 'mtn'
        }
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send(mobileMoneyData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.paymentInfo.method).toBe('mobile_money');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/payments/process')
        .send(validPaymentData);

      expectAuthError(response);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        bookingId: testBooking.id,
        // Missing required fields
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate booking ID format', async () => {
      const invalidData = {
        ...validPaymentData,
        bookingId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate payment amount', async () => {
      const invalidData = {
        ...validPaymentData,
        amount: -100
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('POST /api/v1/payments/refund', () => {
    const validRefundData = {
      paymentId: TEST_CONSTANTS.VALID_UUID,
      reason: 'Trip cancelled by user',
      refundAmount: 500.00
    };

    test('should process refund successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/refund')
        .send(validRefundData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('refundId');
      expect(response.body.data).toHaveProperty('status', 'processed');
      expect(response.body.data).toHaveProperty('refundAmount', validRefundData.refundAmount);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/payments/refund')
        .send(validRefundData);

      expectAuthError(response);
    });

    test('should validate payment ID format', async () => {
      const invalidData = {
        ...validRefundData,
        paymentId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/refund')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate refund amount', async () => {
      const invalidData = {
        ...validRefundData,
        refundAmount: -100
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/refund')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments/history', () => {
    test('should get payment history successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/payments/history');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    test('should support pagination', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/payments/history?page=1&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support status filtering', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/payments/history?status=completed');

      expectSuccessResponse(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get('/api/v1/payments/history');

      expectAuthError(response);
    });
  });

  describe('POST /api/v1/payments/invoice', () => {
    const validInvoiceData = {
      paymentId: TEST_CONSTANTS.VALID_UUID
    };

    test('should generate invoice successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/invoice')
        .send(validInvoiceData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('invoiceId');
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data).toHaveProperty('downloadUrl');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/payments/invoice')
        .send(validInvoiceData);

      expectAuthError(response);
    });

    test('should validate payment ID format', async () => {
      const invalidData = {
        paymentId: 'invalid-uuid'
      };

      const response = await makeRequest(testTokens.client)
        .post('/api/v1/payments/invoice')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('GET /api/v1/payments/:id/status', () => {
    test('should get payment status successfully', async () => {
      const response = await makeRequest(testTokens.client)
        .get(`/api/v1/payments/${TEST_CONSTANTS.VALID_UUID}/status`);

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('lastUpdated');
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .get(`/api/v1/payments/${TEST_CONSTANTS.VALID_UUID}/status`);

      expectAuthError(response);
    });

    test('should validate payment ID format', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/payments/invalid-uuid/status');

      expectErrorResponse(response, 400);
    });

    test('should handle non-existent payment', async () => {
      const nonExistentId = 'non-existent-uuid-1234-5678-9012-123456789012';
      const response = await makeRequest(testTokens.client)
        .get(`/api/v1/payments/${nonExistentId}/status`);

      expectErrorResponse(response, 404);
    });
  });

  describe('Payment Integration Tests', () => {
    test('should handle complete payment flow', async () => {
      // 1. Process payment
      const paymentResponse = await makeRequest(testTokens.client)
        .post('/api/v1/payments/process')
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'card',
          paymentDetails: {
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            cardholderName: 'Test User'
          },
          amount: 500.00,
          currency: 'USD'
        });

      expectSuccessResponse(paymentResponse, 201);
      const paymentId = paymentResponse.body.data.paymentId;

      // 2. Check payment status
      const statusResponse = await makeRequest(testTokens.client)
        .get(`/api/v1/payments/${paymentId}/status`);

      expectSuccessResponse(statusResponse);
      expect(statusResponse.body.data.status).toBe('completed');

      // 3. Generate invoice
      const invoiceResponse = await makeRequest(testTokens.client)
        .post('/api/v1/payments/invoice')
        .send({ paymentId });

      expectSuccessResponse(invoiceResponse, 201);

      // 4. Check payment history
      const historyResponse = await makeRequest(testTokens.client)
        .get('/api/v1/payments/history');

      expectSuccessResponse(historyResponse);
      expect(historyResponse.body.data.payments.length).toBeGreaterThan(0);
    });
  });
});

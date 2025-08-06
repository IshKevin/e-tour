import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  expectForbiddenError
} from '../setup';

describe('System Services Tests', () => {
  describe('Utility Services', () => {
    describe('GET /api/v1/utils/weather', () => {
      test('should get weather information successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/weather?location=Paris');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('location', 'Paris');
        expect(response.body.data).toHaveProperty('temperature');
        expect(response.body.data).toHaveProperty('condition');
        expect(response.body.data).toHaveProperty('humidity');
        expect(response.body.data).toHaveProperty('windSpeed');
        expect(response.body.data).toHaveProperty('forecast');
        expect(Array.isArray(response.body.data.forecast)).toBe(true);
      });

      test('should require location parameter', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/weather');

        expectErrorResponse(response, 400);
        expect(response.body.message).toContain('Location parameter is required');
      });
    });

    describe('GET /api/v1/utils/currency', () => {
      test('should get currency rates successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/currency');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('baseCurrency', 'USD');
        expect(response.body.data).toHaveProperty('rates');
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(typeof response.body.data.rates).toBe('object');
      });

      test('should support custom base currency', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/currency?base=EUR');

        expectSuccessResponse(response);
        expect(response.body.data.baseCurrency).toBe('EUR');
      });
    });

    describe('GET /api/v1/utils/currency/convert', () => {
      test('should convert currency successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/currency/convert?amount=100&from=USD&to=EUR');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('originalAmount', 100);
        expect(response.body.data).toHaveProperty('fromCurrency', 'USD');
        expect(response.body.data).toHaveProperty('toCurrency', 'EUR');
        expect(response.body.data).toHaveProperty('exchangeRate');
        expect(response.body.data).toHaveProperty('convertedAmount');
        expect(response.body.data).toHaveProperty('lastUpdated');
      });

      test('should require all parameters', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/currency/convert?amount=100&from=USD');

        expectErrorResponse(response, 400);
        expect(response.body.message).toContain('Amount, from, and to parameters are required');
      });

      test('should validate amount parameter', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/currency/convert?amount=invalid&from=USD&to=EUR');

        expectErrorResponse(response, 400);
      });
    });

    describe('GET /api/v1/utils/locations', () => {
      test('should get location suggestions successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/locations?q=Par');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('query', 'Par');
        expect(response.body.data).toHaveProperty('suggestions');
        expect(response.body.data).toHaveProperty('totalResults');
        expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      });

      test('should require minimum query length', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/locations?q=P');

        expectErrorResponse(response, 400);
        expect(response.body.message).toContain('at least 2 characters');
      });

      test('should handle empty query', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/locations');

        expectErrorResponse(response, 400);
      });
    });

    describe('GET /api/v1/utils/timezone', () => {
      test('should get timezone information successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/timezone?location=Paris');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('location', 'Paris');
        expect(response.body.data).toHaveProperty('timezone');
        expect(response.body.data).toHaveProperty('offset');
        expect(response.body.data).toHaveProperty('currentTime');
      });

      test('should require location parameter', async () => {
        const response = await makeRequest()
          .get('/api/v1/utils/timezone');

        expectErrorResponse(response, 400);
        expect(response.body.message).toContain('Location parameter is required');
      });
    });
  });

  describe('Advanced Notifications', () => {
    describe('GET /api/v1/admin/notifications/templates', () => {
      test('should get notification templates successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/notifications/templates');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('templates');
        expect(response.body.data).toHaveProperty('totalTemplates');
        expect(response.body.data).toHaveProperty('activeTemplates');
        expect(Array.isArray(response.body.data.templates)).toBe(true);
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/notifications/templates');

        expectForbiddenError(response);
      });

      test('should require authentication', async () => {
        const response = await makeRequest()
          .get('/api/v1/admin/notifications/templates');

        expectAuthError(response);
      });
    });

    describe('POST /api/v1/admin/notifications/bulk', () => {
      const validBulkData = {
        templateId: 'template-uuid-1234',
        recipients: ['user1@example.com', 'user2@example.com'],
        variables: {
          userName: 'John Doe',
          tripName: 'Paris Adventure'
        }
      };

      test('should send bulk notifications successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .post('/api/v1/admin/notifications/bulk')
          .send(validBulkData);

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('results');
        expect(response.body.data.summary).toHaveProperty('totalRecipients', 2);
        expect(response.body.data.summary).toHaveProperty('successful');
        expect(response.body.data.summary).toHaveProperty('failed');
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .post('/api/v1/admin/notifications/bulk')
          .send(validBulkData);

        expectForbiddenError(response);
      });

      test('should validate required fields', async () => {
        const invalidData = {
          templateId: 'template-uuid-1234'
          // Missing recipients
        };

        const response = await makeRequest(testTokens.admin)
          .post('/api/v1/admin/notifications/bulk')
          .send(invalidData);

        expectErrorResponse(response, 400);
      });
    });

    describe('GET /api/v1/admin/notifications/history', () => {
      test('should get notification history successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/notifications/history');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('notifications');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.notifications)).toBe(true);
      });

      test('should support pagination', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/notifications/history?page=1&limit=10');

        expectSuccessResponse(response);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(10);
      });

      test('should support type filtering', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/notifications/history?type=email');

        expectSuccessResponse(response);
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/notifications/history');

        expectForbiddenError(response);
      });
    });
  });

  describe('Advanced Analytics', () => {
    describe('GET /api/v1/analytics/dashboard', () => {
      test('should get dashboard metrics successfully (authenticated)', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/analytics/dashboard');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('totalUsers');
        expect(response.body.data).toHaveProperty('totalTrips');
        expect(response.body.data).toHaveProperty('totalBookings');
        expect(response.body.data).toHaveProperty('totalRevenue');
      });

      test('should return agent-specific metrics for agents', async () => {
        const response = await makeRequest(testTokens.agent)
          .get('/api/v1/analytics/dashboard');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('myTrips');
        expect(response.body.data).toHaveProperty('myBookings');
        expect(response.body.data).toHaveProperty('myRevenue');
        expect(response.body.data).toHaveProperty('myRating');
      });

      test('should require authentication', async () => {
        const response = await makeRequest()
          .get('/api/v1/analytics/dashboard');

        expectAuthError(response);
      });
    });

    describe('GET /api/v1/admin/analytics/bookings', () => {
      test('should get booking analytics successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/analytics/bookings');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('timeRange');
        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('summary');
        expect(Array.isArray(response.body.data.data)).toBe(true);
      });

      test('should support time range parameter', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/analytics/bookings?timeRange=7d');

        expectSuccessResponse(response);
        expect(response.body.data.timeRange).toBe('7d');
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/analytics/bookings');

        expectForbiddenError(response);
      });
    });

    describe('GET /api/v1/admin/analytics/users', () => {
      test('should get user analytics successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/analytics/users');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('totalUsers');
        expect(response.body.data).toHaveProperty('newUsersThisMonth');
        expect(response.body.data).toHaveProperty('activeUsers');
        expect(response.body.data).toHaveProperty('usersByCountry');
        expect(response.body.data).toHaveProperty('usersByAge');
        expect(Array.isArray(response.body.data.usersByCountry)).toBe(true);
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/analytics/users');

        expectForbiddenError(response);
      });
    });

    describe('GET /api/v1/admin/analytics/revenue', () => {
      test('should get revenue analytics successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/analytics/revenue');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('timeRange');
        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('summary');
        expect(Array.isArray(response.body.data.data)).toBe(true);
      });

      test('should support time range parameter', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/analytics/revenue?timeRange=90d');

        expectSuccessResponse(response);
        expect(response.body.data.timeRange).toBe('90d');
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/analytics/revenue');

        expectForbiddenError(response);
      });
    });

    describe('POST /api/v1/admin/analytics/reports', () => {
      const validReportData = {
        metrics: ['bookings', 'revenue', 'users'],
        timeRange: '30d',
        filters: {
          location: 'US',
          userType: 'client'
        }
      };

      test('should generate custom report successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .post('/api/v1/admin/analytics/reports')
          .send(validReportData);

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('reportId');
        expect(response.body.data).toHaveProperty('generatedAt');
        expect(response.body.data).toHaveProperty('config');
        expect(response.body.data).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('downloadUrl');
        expect(response.body.data).toHaveProperty('expiresAt');
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .post('/api/v1/admin/analytics/reports')
          .send(validReportData);

        expectForbiddenError(response);
      });

      test('should validate metrics array', async () => {
        const invalidData = {
          ...validReportData,
          metrics: 'invalid' // Should be array
        };

        const response = await makeRequest(testTokens.admin)
          .post('/api/v1/admin/analytics/reports')
          .send(invalidData);

        expectErrorResponse(response, 400);
      });
    });
  });

  describe('System Administration', () => {
    describe('GET /api/v1/health', () => {
      test('should get system health successfully (public)', async () => {
        const response = await makeRequest()
          .get('/api/v1/health');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('status', 'healthy');
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('uptime');
        expect(response.body.data).toHaveProperty('memory');
        expect(response.body.data).toHaveProperty('services');
        expect(response.body.data).toHaveProperty('version');
        expect(response.body.data).toHaveProperty('environment');
      });
    });

    describe('GET /api/v1/admin/system/stats', () => {
      test('should get system statistics successfully (admin)', async () => {
        const response = await makeRequest(testTokens.admin)
          .get('/api/v1/admin/system/stats');

        expectSuccessResponse(response);
        expect(response.body.data).toHaveProperty('totalRequests');
        expect(response.body.data).toHaveProperty('averageResponseTime');
        expect(response.body.data).toHaveProperty('errorRate');
        expect(response.body.data).toHaveProperty('activeConnections');
        expect(response.body.data).toHaveProperty('cpuUsage');
        expect(response.body.data).toHaveProperty('memoryUsage');
        expect(response.body.data).toHaveProperty('diskUsage');
        expect(response.body.data).toHaveProperty('lastRestart');
      });

      test('should require admin authentication', async () => {
        const response = await makeRequest(testTokens.client)
          .get('/api/v1/admin/system/stats');

        expectForbiddenError(response);
      });

      test('should require authentication', async () => {
        const response = await makeRequest()
          .get('/api/v1/admin/system/stats');

        expectAuthError(response);
      });
    });
  });

  describe('System Integration Tests', () => {
    test('should handle complete utility services workflow', async () => {
      // 1. Get weather for a location
      const weatherResponse = await makeRequest()
        .get('/api/v1/utils/weather?location=Paris');

      expectSuccessResponse(weatherResponse);

      // 2. Get currency rates
      const currencyResponse = await makeRequest()
        .get('/api/v1/utils/currency');

      expectSuccessResponse(currencyResponse);

      // 3. Convert currency
      const convertResponse = await makeRequest()
        .get('/api/v1/utils/currency/convert?amount=500&from=USD&to=EUR');

      expectSuccessResponse(convertResponse);

      // 4. Get location suggestions
      const locationResponse = await makeRequest()
        .get('/api/v1/utils/locations?q=Par');

      expectSuccessResponse(locationResponse);

      // 5. Get timezone info
      const timezoneResponse = await makeRequest()
        .get('/api/v1/utils/timezone?location=Paris');

      expectSuccessResponse(timezoneResponse);
    });

    test('should handle complete analytics workflow (admin)', async () => {
      // 1. Get dashboard metrics
      const dashboardResponse = await makeRequest(testTokens.admin)
        .get('/api/v1/analytics/dashboard');

      expectSuccessResponse(dashboardResponse);

      // 2. Get booking analytics
      const bookingAnalyticsResponse = await makeRequest(testTokens.admin)
        .get('/api/v1/admin/analytics/bookings?timeRange=30d');

      expectSuccessResponse(bookingAnalyticsResponse);

      // 3. Get user analytics
      const userAnalyticsResponse = await makeRequest(testTokens.admin)
        .get('/api/v1/admin/analytics/users');

      expectSuccessResponse(userAnalyticsResponse);

      // 4. Get revenue analytics
      const revenueAnalyticsResponse = await makeRequest(testTokens.admin)
        .get('/api/v1/admin/analytics/revenue?timeRange=30d');

      expectSuccessResponse(revenueAnalyticsResponse);

      // 5. Generate custom report
      const reportResponse = await makeRequest(testTokens.admin)
        .post('/api/v1/admin/analytics/reports')
        .send({
          metrics: ['bookings', 'revenue'],
          timeRange: '30d',
          filters: { location: 'US' }
        });

      expectSuccessResponse(reportResponse);
    });
  });
});

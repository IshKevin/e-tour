import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/etour_test_db';

// Global test setup
beforeAll(async () => {
  // Setup test database or mock database
  console.log('Setting up test environment...');
  
  // In a real application, you would:
  // 1. Set up a test database
  // 2. Run migrations
  // 3. Seed test data if needed
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Cleaning up test environment...');
  
  // In a real application, you would:
  // 1. Close database connections
  // 2. Clean up test data
  // 3. Reset any global state
});

beforeEach(async () => {
  // Reset state before each test
  // In a real application, you might:
  // 1. Clear test database tables
  // 2. Reset mocks
  // 3. Restore default state
});

// Global test utilities
export const testUtils = {
  // Helper function to create test user
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'client',
    ...overrides,
  }),

  // Helper function to create test trip
  createTestTrip: (overrides = {}) => ({
    title: 'Test Trip',
    description: 'A test trip description',
    price: 1000,
    maxSeats: 10,
    location: 'Test Location',
    startDate: '2024-06-01',
    endDate: '2024-06-07',
    ...overrides,
  }),

  // Helper function to create test job
  createTestJob: (overrides = {}) => ({
    title: 'Test Job',
    description: 'A test job description',
    tokenCost: 50,
    category: 'Test Category',
    location: 'Test Location',
    ...overrides,
  }),

  // Helper function to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper function to generate random email
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,

  // Helper function to generate random string
  randomString: (length: number = 10) => Math.random().toString(36).substr(2, length),
};

// Mock external services for testing
export const mockServices = {
  // Mock email service
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },

  // Mock payment service
  paymentService: {
    processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'test-123' }),
    refundPayment: jest.fn().mockResolvedValue({ success: true }),
  },

  // Mock file upload service
  fileUploadService: {
    uploadFile: jest.fn().mockResolvedValue({ url: 'https://example.com/test-file.jpg' }),
    deleteFile: jest.fn().mockResolvedValue(true),
  },
};

// Custom matchers for testing
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidJWT(): R;
      toBeValidUUID(): R;
    }
  }
}

export default testUtils;

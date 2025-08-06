import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';
import { db } from '../config/database';
import { users } from '../db/schema/user.schema';
import { trips } from '../db/schema/trips.schema';
import { bookings } from '../db/schema/booking.schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Test database setup
export const testDb = db;

// Test user data
export const testUsers = {
  client: {
    id: 'test-client-uuid',
    name: 'Test Client',
    email: 'client@test.com',
    password: 'password123',
    role: 'client' as const,
    isEmailVerified: true
  },
  agent: {
    id: 'test-agent-uuid',
    name: 'Test Agent',
    email: 'agent@test.com',
    password: 'password123',
    role: 'agent' as const,
    isEmailVerified: true
  },
  admin: {
    id: 'test-admin-uuid',
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin' as const,
    isEmailVerified: true
  }
};

// Test trip data
export const testTrip = {
  id: 'test-trip-uuid',
  title: 'Test Paris Adventure',
  description: 'A wonderful test trip to Paris',
  price: '500.00',
  location: 'Paris, France',
  startDate: new Date('2024-07-01'),
  endDate: new Date('2024-07-07'),
  maxSeats: 20,
  availableSeats: 15,
  agentId: 'test-agent-uuid',
  status: 'active' as const
};

// Test booking data
export const testBooking = {
  id: 'test-booking-uuid',
  tripId: 'test-trip-uuid',
  clientId: 'test-client-uuid',
  numberOfSeats: 2,
  totalAmount: '1000.00',
  status: 'confirmed' as const,
  bookingDate: new Date()
};

// JWT token generation
export const generateToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );
};

// Test tokens
export const testTokens = {
  client: generateToken(testUsers.client),
  agent: generateToken(testUsers.agent),
  admin: generateToken(testUsers.admin)
};

// Test request helpers
export const makeRequest = (token?: string) => {
  const req = request(app);
  if (token) {
    return req.set('Authorization', `Bearer ${token}`);
  }
  return req;
};

// Database cleanup helpers
export const cleanupDatabase = async () => {
  try {
    // Clean up in reverse dependency order
    await testDb.delete(bookings);
    await testDb.delete(trips);
    await testDb.delete(users);
  } catch (error) {
    console.warn('Database cleanup warning:', error);
  }
};

// Seed test data
export const seedTestData = async () => {
  try {
    // Insert test users
    await testDb.insert(users).values([
      testUsers.client,
      testUsers.agent,
      testUsers.admin
    ]).onConflictDoNothing();

    // Insert test trip
    await testDb.insert(trips).values(testTrip).onConflictDoNothing();

    // Insert test booking
    await testDb.insert(bookings).values(testBooking).onConflictDoNothing();
  } catch (error) {
    console.warn('Database seeding warning:', error);
  }
};

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Clean and seed database
  await cleanupDatabase();
  await seedTestData();
});

afterAll(async () => {
  // Clean up after all tests
  await cleanupDatabase();
});

beforeEach(async () => {
  // Reset any test-specific data if needed
});

afterEach(async () => {
  // Clean up after each test if needed
});

// Common test utilities
export const expectSuccessResponse = (response: any, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('metadata');
};

export const expectErrorResponse = (response: any, expectedStatus: number = 400) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('error');
};

export const expectValidationError = (response: any) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('validationErrors');
};

export const expectAuthError = (response: any) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body.message).toContain('Authentication');
};

export const expectForbiddenError = (response: any) => {
  expect(response.status).toBe(403);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body.message).toContain('Access denied');
};

// Mock data generators
export const generateMockTrip = (overrides: any = {}) => ({
  title: 'Mock Trip',
  description: 'A mock trip for testing',
  price: '300.00',
  location: 'Test Location',
  startDate: new Date('2024-08-01'),
  endDate: new Date('2024-08-07'),
  maxSeats: 10,
  availableSeats: 8,
  agentId: testUsers.agent.id,
  status: 'active',
  ...overrides
});

export const generateMockUser = (overrides: any = {}) => ({
  name: 'Mock User',
  email: 'mock@test.com',
  password: 'password123',
  role: 'client',
  isEmailVerified: true,
  ...overrides
});

export const generateMockBooking = (overrides: any = {}) => ({
  tripId: testTrip.id,
  clientId: testUsers.client.id,
  numberOfSeats: 1,
  totalAmount: '500.00',
  status: 'confirmed',
  bookingDate: new Date(),
  ...overrides
});

// Test constants
export const TEST_CONSTANTS = {
  VALID_UUID: 'test-uuid-1234-5678-9012-123456789012',
  INVALID_UUID: 'invalid-uuid',
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'password123',
  WEAK_PASSWORD: '123',
  FUTURE_DATE: '2024-12-31',
  PAST_DATE: '2020-01-01'
};

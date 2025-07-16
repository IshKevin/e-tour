import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import request from 'supertest';

export interface TestUser {
  id: number;
  email: string;
  name: string;
  role: 'client' | 'agent' | 'admin';
  token: string;
}

export interface TestTrip {
  id: string;
  title: string;
  description: string;
  price: string;
  maxSeats: number;
  location: string;
  startDate: string;
  endDate: string;
  agentId: number;
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(payload: any): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
}

/**
 * Create a test user with token
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const user = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'client' as const,
    ...overrides
  };

  const token = generateTestToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return { ...user, token };
}

/**
 * Create a test agent with token
 */
export function createTestAgent(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    id: 2,
    email: 'agent@example.com',
    name: 'Test Agent',
    role: 'agent',
    ...overrides
  });
}

/**
 * Create a test admin with token
 */
export function createTestAdmin(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    id: 3,
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin',
    ...overrides
  });
}

/**
 * Create a test trip
 */
export function createTestTrip(overrides: Partial<TestTrip> = {}): TestTrip {
  return {
    id: 'trip-123',
    title: 'Test Gorilla Trekking',
    description: 'Amazing gorilla trekking experience in Volcanoes National Park',
    price: '800.00',
    maxSeats: 8,
    location: 'Volcanoes National Park',
    startDate: '2024-06-01',
    endDate: '2024-06-03',
    agentId: 2,
    ...overrides
  };
}

/**
 * Make authenticated request
 */
export function authenticatedRequest(token: string) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

/**
 * Register a test user
 */
export async function registerTestUser(userData: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  return request(app)
    .post('/api/v1/auth/register')
    .send(userData);
}

/**
 * Login a test user
 */
export async function loginTestUser(credentials: {
  email: string;
  password: string;
}) {
  return request(app)
    .post('/api/v1/auth/login')
    .send(credentials);
}

/**
 * Create a test booking
 */
export function createTestBooking(overrides: any = {}) {
  return {
    id: 'booking-123',
    tripId: 'trip-123',
    userId: 1,
    seatsBooked: 2,
    totalAmount: '1600.00',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create test job data
 */
export function createTestJob(overrides: any = {}) {
  return {
    id: 'job-123',
    title: 'Tour Guide Needed',
    description: 'Looking for experienced tour guide for Nyungwe Forest',
    tokenCost: 50,
    category: 'Tour Guide',
    location: 'Nyungwe Forest',
    applicationDeadline: '2024-06-01',
    clientId: 1,
    status: 'active',
    ...overrides
  };
}

/**
 * Create test custom trip request
 */
export function createTestCustomTrip(overrides: any = {}) {
  return {
    id: 'custom-trip-123',
    destination: 'Akagera National Park',
    budget: '500.00',
    interests: 'Wildlife, Photography',
    preferredStartDate: '2024-06-01',
    preferredEndDate: '2024-06-05',
    groupSize: 4,
    clientNotes: 'Looking for wildlife safari experience',
    clientId: 1,
    status: 'pending',
    ...overrides
  };
}

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random email
 */
export function generateRandomEmail(): string {
  const randomString = Math.random().toString(36).substring(7);
  return `test-${randomString}@example.com`;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Mock file for upload tests
 */
export function createMockFile(filename: string = 'test.jpg') {
  return {
    fieldname: 'image',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake image data'),
    size: 125000,
  };
}

/**
 * Expect error response format
 */
export function expectErrorResponse(response: any, statusCode: number, errorMessage?: string) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
}

/**
 * Expect success response format
 */
export function expectSuccessResponse(response: any, statusCode: number = 200, message?: string) {
  expect(response.status).toBe(statusCode);
  if (message) {
    expect(response.body).toHaveProperty('message', message);
  }
  expect(response.body).toHaveProperty('data');
}

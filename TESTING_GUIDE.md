# E-Tour Backend Testing Guide

## Overview

This document provides comprehensive information about the testing strategy, setup, and execution for the E-Tour backend application.

## Testing Strategy

### Test Types

1. **Unit Tests** - Test individual functions and services in isolation
2. **Integration Tests** - Test API endpoints and their interactions with the database
3. **End-to-End Tests** - Test complete user workflows (future implementation)

### Test Structure

```
src/tests/
├── unit/                    # Unit tests for services and utilities
│   ├── user.service.test.ts
│   ├── trip.service.test.ts
│   ├── token.service.test.ts
│   └── notification.service.test.ts
├── integration/             # Integration tests for API endpoints
│   ├── auth.test.ts
│   ├── trip.test.ts
│   ├── agent.test.ts
│   ├── token-job.test.ts
│   └── admin-notifications.test.ts
└── setup.ts                # Test configuration and utilities
```

## Test Coverage

### Unit Tests Coverage

- **User Service** - Authentication, profile management, email verification
- **Trip Service** - Trip management, booking, reviews, cancellations
- **Token Service** - Token purchases, usage, refunds, statistics
- **Notification Service** - Notification creation, management, broadcasting

### Integration Tests Coverage

- **Authentication Endpoints** (7 endpoints)
  - User registration and login
  - Email verification and password reset
  - Profile management

- **Trip Management Endpoints** (10 endpoints)
  - Trip browsing with filters and pagination
  - Trip booking and cancellation
  - Review submission
  - Custom trip requests

- **Agent Management Endpoints** (7 endpoints)
  - Trip creation and management
  - Booking oversight
  - Performance metrics

- **Token & Job Marketplace Endpoints** (10 endpoints)
  - Token package purchases
  - Job posting and applications
  - Application management

- **Admin Panel Endpoints** (11 endpoints)
  - User management
  - System statistics
  - Contact message handling

- **Utility Endpoints** (8 endpoints)
  - Notifications
  - Search functionality
  - Contact forms

## Running Tests

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Test Database** (PostgreSQL recommended)
3. **Environment Variables** configured for testing

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests for CI/CD
npm run test:ci
```

### Environment Setup

Create a `.env.test` file for test-specific configuration:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/etour_test_db
JWT_SECRET=test-jwt-secret-key-for-testing-only
```

## Test Configuration

### Jest Configuration

The project uses Jest with the following configuration:

- **Test Environment**: Node.js
- **TypeScript Support**: ts-jest
- **Coverage Threshold**: 70% for branches, functions, lines, and statements
- **Test Timeout**: 30 seconds
- **Setup Files**: Custom test utilities and mocks

### Mock Strategy

- **Database**: Mocked using Jest mocks for unit tests
- **External Services**: Email, payment, and file upload services are mocked
- **Authentication**: JWT tokens generated for test users

## Test Utilities

### Custom Matchers

```typescript
// Email validation
expect('test@example.com').toBeValidEmail();

// JWT token validation
expect(token).toBeValidJWT();

// UUID validation
expect(uuid).toBeValidUUID();
```

### Helper Functions

```typescript
// Create test user
const user = testUtils.createTestUser({ role: 'agent' });

// Create test trip
const trip = testUtils.createTestTrip({ price: 2000 });

// Generate random email
const email = testUtils.randomEmail();

// Wait for async operations
await testUtils.wait(1000);
```

## Test Examples

### Unit Test Example

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should hash password and create user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client' as const,
      };

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result).not.toHaveProperty('password');
    });
  });
});
```

### Integration Test Example

```typescript
describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(userData.email);
    });
  });
});
```

## Test Data Management

### Test Database

For integration tests, consider using:

1. **In-Memory Database** - SQLite for fast, isolated tests
2. **Test Database** - Separate PostgreSQL instance
3. **Database Transactions** - Rollback after each test

### Data Cleanup

- Tests should clean up after themselves
- Use database transactions that rollback
- Clear mocks between tests
- Reset global state

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: etour_test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## Best Practices

### Writing Tests

1. **Descriptive Names** - Test names should clearly describe what is being tested
2. **Arrange-Act-Assert** - Structure tests with clear setup, execution, and verification
3. **Single Responsibility** - Each test should verify one specific behavior
4. **Independent Tests** - Tests should not depend on each other
5. **Mock External Dependencies** - Isolate the code under test

### Test Organization

1. **Group Related Tests** - Use `describe` blocks to organize tests logically
2. **Setup and Teardown** - Use `beforeEach` and `afterEach` for test preparation
3. **Shared Utilities** - Extract common test logic into helper functions
4. **Test Data Factories** - Use factory functions for creating test data

### Performance

1. **Parallel Execution** - Run tests in parallel when possible
2. **Fast Feedback** - Unit tests should run quickly
3. **Selective Testing** - Run only affected tests during development
4. **Resource Management** - Clean up resources to prevent memory leaks

## Debugging Tests

### Common Issues

1. **Async/Await** - Ensure proper handling of asynchronous operations
2. **Database State** - Tests failing due to shared database state
3. **Mock Configuration** - Incorrect mock setup causing unexpected behavior
4. **Timeout Issues** - Tests taking too long to complete

### Debugging Tools

```bash
# Run specific test file
npm test -- user.service.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test
npm test -- --testNamePattern="should create user"
```

## Coverage Reports

### Viewing Coverage

After running `npm run test:coverage`, coverage reports are available:

- **Terminal Output** - Summary in console
- **HTML Report** - `coverage/lcov-report/index.html`
- **LCOV File** - `coverage/lcov.info` for CI tools

### Coverage Goals

- **Minimum**: 70% coverage across all metrics
- **Target**: 80%+ coverage for critical business logic
- **Focus Areas**: Services, controllers, and utility functions

## Future Improvements

1. **E2E Tests** - Implement end-to-end testing with tools like Cypress
2. **Performance Tests** - Add load testing for API endpoints
3. **Visual Regression** - Test UI components if frontend is added
4. **Contract Testing** - API contract testing with tools like Pact
5. **Mutation Testing** - Verify test quality with mutation testing

## Troubleshooting

### Common Test Failures

1. **Database Connection** - Ensure test database is running and accessible
2. **Environment Variables** - Check that test environment variables are set
3. **Port Conflicts** - Ensure test server ports are available
4. **Mock Issues** - Verify mocks are properly configured and reset

### Getting Help

1. Check test logs for detailed error messages
2. Review Jest documentation for configuration issues
3. Verify database schema matches test expectations
4. Ensure all dependencies are installed and up to date

This testing guide provides a comprehensive foundation for maintaining and extending the test suite as the application grows.

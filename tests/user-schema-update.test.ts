import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../src/db';
import { users } from '../src/db/schema/user.schema';
import { userService } from '../src/services/user.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

describe('User Schema Update Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(users).where(users.email.like('%test-schema%'));
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await db.delete(users).where(users.id.eq(testUser.id));
    }
  });

  describe('User Creation with New Fields', () => {
    test('should create user with company name and location', async () => {
      const userData = {
        name: 'Test User Schema',
        email: `test-schema-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client' as const,
        companyName: 'Test Company Ltd',
        location: 'Kigali, Rwanda',
        notificationsEnabled: true,
        agreedToTerms: true,
      };

      testUser = await userService.createUser(userData);

      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(typeof testUser.id).toBe('string');
      expect(uuidValidate(testUser.id)).toBe(true);
      expect(testUser.companyName).toBe(userData.companyName);
      expect(testUser.location).toBe(userData.location);
      expect(testUser.notificationsEnabled).toBe(true);
      expect(testUser.agreedToTerms).toBe(true);
      expect(testUser.termsAgreedAt).toBeDefined();
      expect(testUser.termsAgreedAt).toBeInstanceOf(Date);
    });

    test('should create user with optional fields as null', async () => {
      const userData = {
        name: 'Test User Optional',
        email: `test-optional-${Date.now()}@example.com`,
        password: 'password123',
        role: 'agent' as const,
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.companyName).toBeNull();
      expect(user.location).toBeNull();
      expect(user.notificationsEnabled).toBe(true); // default value
      expect(user.agreedToTerms).toBe(false); // default value
      expect(user.termsAgreedAt).toBeNull();

      // Clean up
      await db.delete(users).where(users.id.eq(user.id));
    });

    test('should create user with partial optional fields', async () => {
      const userData = {
        name: 'Test User Partial',
        email: `test-partial-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client' as const,
        companyName: 'Partial Company',
        notificationsEnabled: false,
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.companyName).toBe('Partial Company');
      expect(user.location).toBeNull();
      expect(user.notificationsEnabled).toBe(false);
      expect(user.agreedToTerms).toBe(false);
      expect(user.termsAgreedAt).toBeNull();

      // Clean up
      await db.delete(users).where(users.id.eq(user.id));
    });
  });

  describe('User Update Operations', () => {
    test('should update user profile with new fields', async () => {
      const updateData = {
        companyName: 'Updated Company Ltd',
        location: 'Butare, Rwanda',
        notificationsEnabled: false,
      };

      const updatedUser = await userService.updateUser(testUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.companyName).toBe(updateData.companyName);
      expect(updatedUser?.location).toBe(updateData.location);
      expect(updatedUser?.notificationsEnabled).toBe(false);
      expect(updatedUser?.updatedAt).toBeDefined();
    });

    test('should update terms agreement', async () => {
      // First, set terms to false
      await userService.updateTermsAgreement(testUser.id, false);
      let user = await userService.getUserById(testUser.id);
      expect(user?.agreedToTerms).toBe(false);
      expect(user?.termsAgreedAt).toBeNull();

      // Then, agree to terms
      const updatedUser = await userService.updateTermsAgreement(testUser.id, true);
      expect(updatedUser?.agreedToTerms).toBe(true);
      expect(updatedUser?.termsAgreedAt).toBeDefined();
      expect(updatedUser?.termsAgreedAt).toBeInstanceOf(Date);
    });

    test('should update notification preferences', async () => {
      const updatedUser = await userService.updateNotificationPreference(testUser.id, false);
      expect(updatedUser?.notificationsEnabled).toBe(false);

      const updatedUser2 = await userService.updateNotificationPreference(testUser.id, true);
      expect(updatedUser2?.notificationsEnabled).toBe(true);
    });
  });

  describe('Database Constraints and Indexes', () => {
    test('should handle null values correctly', async () => {
      const userData = {
        name: 'Test Null Values',
        email: `test-null-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client' as const,
        companyName: null,
        location: null,
      };

      const user = await userService.createUser(userData);
      expect(user.companyName).toBeNull();
      expect(user.location).toBeNull();

      // Clean up
      await db.delete(users).where(users.id.eq(user.id));
    });

    test('should handle long company names and locations', async () => {
      const longCompanyName = 'A'.repeat(255); // Max length
      const longLocation = 'B'.repeat(255); // Max length

      const userData = {
        name: 'Test Long Values',
        email: `test-long-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client' as const,
        companyName: longCompanyName,
        location: longLocation,
      };

      const user = await userService.createUser(userData);
      expect(user.companyName).toBe(longCompanyName);
      expect(user.location).toBe(longLocation);

      // Clean up
      await db.delete(users).where(users.id.eq(user.id));
    });
  });

  describe('Data Retrieval', () => {
    test('should retrieve user with all new fields', async () => {
      const retrievedUser = await userService.getUserById(testUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.companyName).toBeDefined();
      expect(retrievedUser?.location).toBeDefined();
      expect(typeof retrievedUser?.notificationsEnabled).toBe('boolean');
      expect(typeof retrievedUser?.agreedToTerms).toBe('boolean');
      expect(retrievedUser?.termsAgreedAt).toBeDefined();
    });

    test('should retrieve user by email with new fields', async () => {
      const retrievedUser = await userService.getUserByEmail(testUser.email);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(testUser.id);
      expect(retrievedUser?.companyName).toBeDefined();
      expect(retrievedUser?.location).toBeDefined();
      expect(typeof retrievedUser?.notificationsEnabled).toBe('boolean');
      expect(typeof retrievedUser?.agreedToTerms).toBe('boolean');
    });
  });

  describe('Field Validation', () => {
    test('should handle boolean field updates correctly', async () => {
      // Test notification preference toggle
      await userService.updateNotificationPreference(testUser.id, false);
      let user = await userService.getUserById(testUser.id);
      expect(user?.notificationsEnabled).toBe(false);

      await userService.updateNotificationPreference(testUser.id, true);
      user = await userService.getUserById(testUser.id);
      expect(user?.notificationsEnabled).toBe(true);
    });

    test('should handle terms agreement timestamp correctly', async () => {
      const beforeTime = new Date();
      
      await userService.updateTermsAgreement(testUser.id, true);
      const user = await userService.getUserById(testUser.id);
      
      const afterTime = new Date();
      
      expect(user?.agreedToTerms).toBe(true);
      expect(user?.termsAgreedAt).toBeDefined();
      expect(user?.termsAgreedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(user?.termsAgreedAt!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Migration Compatibility', () => {
    test('should work with existing UUID system', async () => {
      const user = await userService.getUserById(testUser.id);
      
      expect(user).toBeDefined();
      expect(typeof user?.id).toBe('string');
      expect(uuidValidate(user!.id)).toBe(true);
      
      // Verify all new fields are accessible
      expect(user).toHaveProperty('companyName');
      expect(user).toHaveProperty('location');
      expect(user).toHaveProperty('notificationsEnabled');
      expect(user).toHaveProperty('agreedToTerms');
      expect(user).toHaveProperty('termsAgreedAt');
    });
  });
});

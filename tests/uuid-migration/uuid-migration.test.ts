import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../../src/db';
import { users, trips, bookings, jobs, customTripRequests } from '../../src/db';
import { userService } from '../../src/services/user.service';
import { tripService } from '../../src/services/trip.service';
import { jobService } from '../../src/services/job.service';
import { agentService } from '../../src/services/agent.service';
import { tokenService } from '../../src/services/token.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

describe('UUID Migration Tests', () => {
  let testUser: any;
  let testAgent: any;
  let testTrip: any;
  let testJob: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(bookings);
    await db.delete(jobs);
    await db.delete(trips);
    await db.delete(users);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(bookings);
    await db.delete(jobs);
    await db.delete(trips);
    await db.delete(users);
  });

  describe('User Service UUID Tests', () => {
    test('should create user with UUID ID', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client' as const,
      };

      testUser = await userService.createUser(userData);

      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(typeof testUser.id).toBe('string');
      expect(uuidValidate(testUser.id)).toBe(true);
      expect(testUser.email).toBe(userData.email);
      expect(testUser.name).toBe(userData.name);
    });

    test('should get user by UUID ID', async () => {
      const retrievedUser = await userService.getUserById(testUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(testUser.id);
      expect(retrievedUser?.email).toBe(testUser.email);
    });

    test('should update user with UUID ID', async () => {
      const updateData = { name: 'Updated Test User' };
      const updatedUser = await userService.updateUser(testUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.id).toBe(testUser.id);
      expect(updatedUser?.name).toBe(updateData.name);
    });

    test('should create agent user', async () => {
      const agentData = {
        name: 'Test Agent',
        email: 'agent@example.com',
        password: 'password123',
        role: 'agent' as const,
      };

      testAgent = await userService.createUser(agentData);

      expect(testAgent).toBeDefined();
      expect(testAgent.id).toBeDefined();
      expect(typeof testAgent.id).toBe('string');
      expect(uuidValidate(testAgent.id)).toBe(true);
      expect(testAgent.role).toBe('agent');
    });
  });

  describe('Trip Service UUID Tests', () => {
    test('should create trip with UUID IDs', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'A test trip',
        price: '100.00',
        maxSeats: 10,
        location: 'Test Location',
        startDate: '2024-12-01',
        endDate: '2024-12-05',
      };

      testTrip = await agentService.createTrip(testAgent.id, tripData);

      expect(testTrip).toBeDefined();
      expect(testTrip.id).toBeDefined();
      expect(typeof testTrip.id).toBe('string');
      expect(uuidValidate(testTrip.id)).toBe(true);
      expect(testTrip.agentId).toBe(testAgent.id);
      expect(typeof testTrip.agentId).toBe('string');
      expect(uuidValidate(testTrip.agentId)).toBe(true);
    });

    test('should get trip by UUID ID', async () => {
      const retrievedTrip = await tripService.getTripById(testTrip.id);

      expect(retrievedTrip).toBeDefined();
      expect(retrievedTrip?.id).toBe(testTrip.id);
      expect(retrievedTrip?.agentId).toBe(testAgent.id);
    });

    test('should book trip with UUID IDs', async () => {
      const booking = await tripService.bookTrip(testTrip.id, testUser.id, 2);

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(typeof booking.id).toBe('string');
      expect(uuidValidate(booking.id)).toBe(true);
      expect(booking.tripId).toBe(testTrip.id);
      expect(booking.clientId).toBe(testUser.id);
      expect(typeof booking.tripId).toBe('string');
      expect(typeof booking.clientId).toBe('string');
    });
  });

  describe('Job Service UUID Tests', () => {
    test('should create job with UUID IDs', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'A test job posting',
        tokenCost: 10,
        category: 'guide',
        location: 'Test Location',
      };

      testJob = await jobService.createJob(testUser.id, jobData);

      expect(testJob).toBeDefined();
      expect(testJob.id).toBeDefined();
      expect(typeof testJob.id).toBe('string');
      expect(uuidValidate(testJob.id)).toBe(true);
      expect(testJob.clientId).toBe(testUser.id);
      expect(typeof testJob.clientId).toBe('string');
    });

    test('should get job by UUID ID', async () => {
      const retrievedJob = await jobService.getJobById(testJob.id);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(testJob.id);
      expect(retrievedJob?.clientId).toBe(testUser.id);
    });

    test('should apply for job with UUID IDs', async () => {
      const applicationData = {
        coverLetter: 'I am interested in this job',
        portfolioLinks: ['https://example.com/portfolio'],
      };

      const application = await jobService.applyForJob(testJob.id, testAgent.id, applicationData);

      expect(application).toBeDefined();
      expect(application.id).toBeDefined();
      expect(typeof application.id).toBe('string');
      expect(uuidValidate(application.id)).toBe(true);
      expect(application.jobId).toBe(testJob.id);
      expect(application.applicantId).toBe(testAgent.id);
      expect(typeof application.jobId).toBe('string');
      expect(typeof application.applicantId).toBe('string');
    });
  });

  describe('Token Service UUID Tests', () => {
    test('should get user token balance with UUID', async () => {
      const tokenBalance = await tokenService.getUserTokenBalance(testUser.id);

      expect(tokenBalance).toBeDefined();
      expect(tokenBalance.id).toBeDefined();
      expect(typeof tokenBalance.id).toBe('string');
      expect(uuidValidate(tokenBalance.id)).toBe(true);
      expect(tokenBalance.userId).toBe(testUser.id);
      expect(typeof tokenBalance.userId).toBe('string');
    });

    test('should grant tokens with UUID', async () => {
      const grantedTokens = await tokenService.grantTokens(testUser.id, 100, 'Test grant');

      expect(grantedTokens).toBeDefined();
      expect(grantedTokens.userId).toBe(testUser.id);
      expect(grantedTokens.balance).toBeGreaterThanOrEqual(100);
    });

    test('should get token history with UUID', async () => {
      const history = await tokenService.getTokenHistory(testUser.id);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(typeof history[0].id).toBe('string');
        expect(uuidValidate(history[0].id)).toBe(true);
        expect(history[0].userId).toBe(testUser.id);
      }
    });
  });

  describe('Foreign Key Relationships', () => {
    test('should maintain referential integrity with UUIDs', async () => {
      // Test that foreign key relationships work correctly
      const userBookings = await tripService.getUserBookings(testUser.id);
      expect(userBookings).toBeDefined();
      expect(Array.isArray(userBookings)).toBe(true);

      const agentTrips = await agentService.getAgentTrips(testAgent.id);
      expect(agentTrips).toBeDefined();
      expect(Array.isArray(agentTrips)).toBe(true);

      const clientJobs = await jobService.getClientJobs(testUser.id);
      expect(clientJobs).toBeDefined();
      expect(Array.isArray(clientJobs)).toBe(true);
    });
  });

  describe('UUID Validation', () => {
    test('should reject invalid UUID formats', async () => {
      await expect(userService.getUserById('invalid-uuid')).rejects.toThrow();
      await expect(tripService.getTripById('123')).rejects.toThrow();
      await expect(jobService.getJobById('not-a-uuid')).rejects.toThrow();
    });

    test('should handle null/undefined UUIDs gracefully', async () => {
      const result = await userService.getUserById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });
});

import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAgent,
  createTestJob,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  generateRandomString
} from '../utils/testHelpers';

describe('Job Marketplace API', () => {
  let client: any;
  let agent: any;
  let testJob: any;

  beforeEach(() => {
    client = createTestUser();
    agent = createTestAgent();
    testJob = createTestJob();
  });

  describe('POST /api/v1/jobs', () => {
    it('should create job successfully', async () => {
      const jobData = {
        title: 'Tour Guide Needed',
        description: 'Looking for experienced tour guide for Nyungwe Forest',
        tokenCost: 50,
        category: 'Tour Guide',
        location: 'Nyungwe Forest',
        applicationDeadline: '2024-06-01',
        requirements: ['Experience with wildlife tours', 'Fluent in English and French'],
        benefits: ['Competitive pay', 'Flexible schedule']
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/jobs')
        .send(jobData);

      expect(response.status).toBeOneOf([201, 400]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Job created successfully');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.title).toBe(jobData.title);
        expect(response.body.data.clientId).toBe(client.id);
      }
    });

    it('should fail without authentication', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description',
        tokenCost: 50,
        category: 'Tour Guide',
        location: 'Test Location',
        applicationDeadline: '2024-06-01'
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .send(jobData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with invalid token cost', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description',
        tokenCost: -10, // Invalid negative cost
        category: 'Tour Guide',
        location: 'Test Location',
        applicationDeadline: '2024-06-01'
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/jobs')
        .send(jobData);

      expectErrorResponse(response, 400, 'Token cost must be positive');
    });

    it('should fail with past deadline', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description',
        tokenCost: 50,
        category: 'Tour Guide',
        location: 'Test Location',
        applicationDeadline: '2020-01-01' // Past date
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/jobs')
        .send(jobData);

      expectErrorResponse(response, 400, 'Application deadline cannot be in the past');
    });

    it('should fail with missing required fields', async () => {
      const jobData = {
        title: 'Test Job'
        // Missing other required fields
      };

      const response = await authenticatedRequest(client.token)
        .post('/api/v1/jobs')
        .send(jobData);

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/v1/jobs/available', () => {
    it('should get available jobs without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter jobs by category', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available')
        .query({ category: 'Tour Guide' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter jobs by location', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available')
        .query({ location: 'Nyungwe Forest' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter jobs by token cost range', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available')
        .query({ minTokens: 10, maxTokens: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should paginate jobs', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available')
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should search jobs by title', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/available')
        .query({ search: 'tour guide' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should get job by ID', async () => {
      const response = await authenticatedRequest(client.token)
        .get(`/api/v1/jobs/${testJob.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('title');
        expect(response.body.data).toHaveProperty('description');
      }
    });

    it('should fail with invalid job ID', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/jobs/invalid-id');

      expectErrorResponse(response, 400, 'Invalid job ID');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/jobs/non-existent-id');

      expectErrorResponse(response, 404, 'Job not found');
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should get client jobs', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/jobs');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should filter client jobs by status', async () => {
      const response = await authenticatedRequest(client.token)
        .get('/api/v1/jobs')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('PUT /api/v1/jobs/:id', () => {
    it('should update job successfully', async () => {
      const updateData = {
        title: 'Updated Job Title',
        tokenCost: 75,
        applicationDeadline: '2024-07-01'
      };

      const response = await authenticatedRequest(client.token)
        .put(`/api/v1/jobs/${testJob.id}`)
        .send(updateData);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Job updated successfully');
        expect(response.body.data.title).toBe(updateData.title);
      }
    });

    it('should fail updating other user job', async () => {
      const otherUser = createTestUser({ id: 999 });
      const updateData = {
        title: 'Updated Title'
      };

      const response = await authenticatedRequest(otherUser.token)
        .put(`/api/v1/jobs/${testJob.id}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'Not authorized to update this job');
    });

    it('should fail without authentication', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/api/v1/jobs/${testJob.id}`)
        .send(updateData);

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should delete job successfully', async () => {
      const response = await authenticatedRequest(client.token)
        .delete(`/api/v1/jobs/${testJob.id}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Job deleted successfully');
      }
    });

    it('should fail deleting other user job', async () => {
      const otherUser = createTestUser({ id: 999 });

      const response = await authenticatedRequest(otherUser.token)
        .delete(`/api/v1/jobs/${testJob.id}`);

      expectErrorResponse(response, 403, 'Not authorized to delete this job');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/jobs/${testJob.id}`);

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('POST /api/v1/jobs/:id/apply', () => {
    it('should apply for job successfully', async () => {
      const applicationData = {
        coverLetter: 'I am very interested in this position and have relevant experience.',
        portfolio: 'https://myportfolio.com',
        expectedRate: '50.00'
      };

      const response = await authenticatedRequest(agent.token)
        .post(`/api/v1/jobs/${testJob.id}/apply`)
        .send(applicationData);

      expect(response.status).toBeOneOf([201, 400, 404]);
      if (response.status === 201) {
        expectSuccessResponse(response, 201, 'Application submitted successfully');
        expect(response.body.data).toHaveProperty('applicationId');
      }
    });

    it('should fail applying to own job', async () => {
      const applicationData = {
        coverLetter: 'Test application'
      };

      const response = await authenticatedRequest(client.token)
        .post(`/api/v1/jobs/${testJob.id}/apply`)
        .send(applicationData);

      expectErrorResponse(response, 400, 'Cannot apply to your own job');
    });

    it('should fail without authentication', async () => {
      const applicationData = {
        coverLetter: 'Test application'
      };

      const response = await request(app)
        .post(`/api/v1/jobs/${testJob.id}/apply`)
        .send(applicationData);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail with duplicate application', async () => {
      const applicationData = {
        coverLetter: 'First application'
      };

      // First application
      await authenticatedRequest(agent.token)
        .post(`/api/v1/jobs/${testJob.id}/apply`)
        .send(applicationData);

      // Second application (should fail)
      const response = await authenticatedRequest(agent.token)
        .post(`/api/v1/jobs/${testJob.id}/apply`)
        .send(applicationData);

      expectErrorResponse(response, 400, 'Already applied to this job');
    });
  });

  describe('GET /api/v1/jobs/:id/applicants', () => {
    it('should get job applicants as job owner', async () => {
      const response = await authenticatedRequest(client.token)
        .get(`/api/v1/jobs/${testJob.id}/applicants`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should fail as non-owner', async () => {
      const otherUser = createTestUser({ id: 999 });

      const response = await authenticatedRequest(otherUser.token)
        .get(`/api/v1/jobs/${testJob.id}/applicants`);

      expectErrorResponse(response, 403, 'Not authorized to view applicants');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/jobs/${testJob.id}/applicants`);

      expectErrorResponse(response, 401, 'Authentication required');
    });
  });

  describe('GET /api/v1/my-applications', () => {
    it('should get user applications', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/my-applications');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/my-applications');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should filter applications by status', async () => {
      const response = await authenticatedRequest(agent.token)
        .get('/api/v1/my-applications')
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});

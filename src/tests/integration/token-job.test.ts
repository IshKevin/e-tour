import request from 'supertest';
import app from '../../app';

describe('Token and Job Marketplace Endpoints', () => {
  let clientToken: string;
  let agentToken: string;
  let adminToken: string;
  let clientId: number;
  let agentId: number;
  let jobId: number;

  beforeAll(async () => {
    // Register and login as client
    const clientRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Client',
        email: 'client@test.com',
        password: 'password123',
        role: 'client'
      });

    clientId = clientRegister.body.data.id;

    const clientLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'client@test.com',
        password: 'password123'
      });

    clientToken = clientLogin.body.data.token;

    // Register and login as agent
    const agentRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Agent',
        email: 'agent@test.com',
        password: 'password123',
        role: 'agent'
      });

    agentId = agentRegister.body.data.id;

    const agentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'agent@test.com',
        password: 'password123'
      });

    agentToken = agentLogin.body.data.token;

    // Register and login as admin
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });

    adminToken = adminLogin.body.data.token;
  });

  describe('Token System Endpoints', () => {
    describe('GET /api/v1/tokens/packages', () => {
      it('should get token packages without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/packages')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(4);
        
        const packages = response.body.data;
        expect(packages[0]).toHaveProperty('id', 'basic');
        expect(packages[1]).toHaveProperty('id', 'standard');
        expect(packages[2]).toHaveProperty('id', 'premium');
        expect(packages[3]).toHaveProperty('id', 'enterprise');

        packages.forEach((pkg: any) => {
          expect(pkg).toHaveProperty('name');
          expect(pkg).toHaveProperty('tokens');
          expect(pkg).toHaveProperty('price');
          expect(pkg).toHaveProperty('description');
        });
      });
    });

    describe('POST /api/v1/tokens/purchase', () => {
      it('should purchase tokens successfully', async () => {
        const response = await request(app)
          .post('/api/v1/tokens/purchase')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            packageId: 'basic',
            paymentReference: 'payment-test-123'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tokens');
        expect(response.body.data).toHaveProperty('transaction');
        expect(response.body.data).toHaveProperty('package');

        expect(response.body.data.tokens).toHaveProperty('balance', 100);
        expect(response.body.data.transaction).toHaveProperty('type', 'purchase');
        expect(response.body.data.transaction).toHaveProperty('amount', 100);
        expect(response.body.data.package).toHaveProperty('id', 'basic');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/tokens/purchase')
          .send({
            packageId: 'basic',
            paymentReference: 'payment-test-123'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should validate package ID', async () => {
        const response = await request(app)
          .post('/api/v1/tokens/purchase')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            packageId: 'invalid-package',
            paymentReference: 'payment-test-123'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid token package');
      });

      it('should require payment reference', async () => {
        const response = await request(app)
          .post('/api/v1/tokens/purchase')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            packageId: 'basic'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/tokens/balance', () => {
      it('should get token balance', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/balance')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('balance');
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(typeof response.body.data.balance).toBe('number');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/balance')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('GET /api/v1/tokens/history', () => {
      it('should get token transaction history', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/history')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        if (response.body.data.length > 0) {
          const transaction = response.body.data[0];
          expect(transaction).toHaveProperty('id');
          expect(transaction).toHaveProperty('type');
          expect(transaction).toHaveProperty('amount');
          expect(transaction).toHaveProperty('createdAt');
        }
      });

      it('should limit results', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/history?limit=5')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/tokens/history')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });
  });

  describe('Job Marketplace Endpoints', () => {
    describe('POST /api/v1/jobs', () => {
      it('should create job post successfully', async () => {
        const jobData = {
          title: 'Tour Guide Needed',
          description: 'Looking for experienced tour guide for Paris trip',
          tokenCost: 50,
          category: 'Tour Guide',
          location: 'Paris, France',
          applicationDeadline: '2024-07-01'
        };

        const response = await request(app)
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${clientToken}`)
          .send(jobData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('title', jobData.title);
        expect(response.body.data).toHaveProperty('tokenCost', jobData.tokenCost);
        expect(response.body.data).toHaveProperty('status', 'open');

        jobId = response.body.data.id;
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/jobs')
          .send({
            title: 'Test Job',
            description: 'Test description',
            tokenCost: 50
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            title: 'Test Job'
            // Missing required fields
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should validate token cost is positive', async () => {
        const response = await request(app)
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            title: 'Test Job',
            description: 'Test description',
            tokenCost: 0
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/jobs/available', () => {
      it('should get available jobs without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/jobs/available')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should limit results', async () => {
        const response = await request(app)
          .get('/api/v1/jobs/available?limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });
    });

    describe('GET /api/v1/jobs', () => {
      it('should get client jobs', async () => {
        const response = await request(app)
          .get('/api/v1/jobs')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/jobs')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('POST /api/v1/jobs/:id/apply', () => {
      it('should apply for job successfully', async () => {
        const applicationData = {
          coverLetter: 'I am very interested in this position and have 5 years of experience...',
          portfolioLinks: ['https://example.com/portfolio1', 'https://example.com/portfolio2']
        };

        const response = await request(app)
          .post(`/api/v1/jobs/${jobId}/apply`)
          .set('Authorization', `Bearer ${agentToken}`)
          .send(applicationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('jobId', jobId);
        expect(response.body.data).toHaveProperty('applicantId', agentId);
        expect(response.body.data).toHaveProperty('status', 'pending');
        expect(response.body.data).toHaveProperty('coverLetter', applicationData.coverLetter);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/v1/jobs/${jobId}/apply`)
          .send({
            coverLetter: 'Test application'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 400 for invalid job ID', async () => {
        const response = await request(app)
          .post('/api/v1/jobs/invalid/apply')
          .set('Authorization', `Bearer ${agentToken}`)
          .send({
            coverLetter: 'Test application'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid job ID');
      });

      it('should prevent duplicate applications', async () => {
        const response = await request(app)
          .post(`/api/v1/jobs/${jobId}/apply`)
          .set('Authorization', `Bearer ${agentToken}`)
          .send({
            coverLetter: 'Another application'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/jobs/:id/applicants', () => {
      it('should get job applicants for job owner', async () => {
        const response = await request(app)
          .get(`/api/v1/jobs/${jobId}/applicants`)
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        if (response.body.data.length > 0) {
          const applicant = response.body.data[0];
          expect(applicant).toHaveProperty('id');
          expect(applicant).toHaveProperty('applicantId');
          expect(applicant).toHaveProperty('status');
          expect(applicant).toHaveProperty('applicantName');
          expect(applicant).toHaveProperty('applicantEmail');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/jobs/${jobId}/applicants`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 400 for invalid job ID', async () => {
        const response = await request(app)
          .get('/api/v1/jobs/invalid/applicants')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid job ID');
      });
    });

    describe('GET /api/v1/my-applications', () => {
      it('should get user applications', async () => {
        const response = await request(app)
          .get('/api/v1/my-applications')
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/my-applications')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('POST /api/v1/jobs/:id/applicants/:applicantId/accept', () => {
      it('should accept applicant successfully', async () => {
        const response = await request(app)
          .post(`/api/v1/jobs/${jobId}/applicants/${agentId}/accept`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            feedback: 'Great application! Looking forward to working with you.'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('status', 'accepted');
        expect(response.body.data).toHaveProperty('feedback');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/v1/jobs/${jobId}/applicants/${agentId}/accept`)
          .send({
            feedback: 'Test feedback'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 400 for invalid IDs', async () => {
        const response = await request(app)
          .post('/api/v1/jobs/invalid/applicants/invalid/accept')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            feedback: 'Test feedback'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid job or applicant ID');
      });
    });

    describe('PUT /api/v1/jobs/:id', () => {
      it('should update job successfully', async () => {
        const updateData = {
          title: 'Updated Job Title',
          description: 'Updated job description'
        };

        const response = await request(app)
          .put(`/api/v1/jobs/${jobId}`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('title', updateData.title);
        expect(response.body.data).toHaveProperty('description', updateData.description);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .put(`/api/v1/jobs/${jobId}`)
          .send({
            title: 'Updated Title'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });
  });

  describe('Admin Token Management', () => {
    describe('POST /api/v1/admin/tokens/grant', () => {
      it('should grant tokens to user', async () => {
        const response = await request(app)
          .post('/api/v1/admin/tokens/grant')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: clientId,
            amount: 500,
            description: 'Bonus tokens for testing'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('balance');
      });

      it('should require admin role', async () => {
        const response = await request(app)
          .post('/api/v1/admin/tokens/grant')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            userId: agentId,
            amount: 100
          })
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
      });
    });

    describe('GET /api/v1/admin/tokens/stats', () => {
      it('should get token statistics', async () => {
        const response = await request(app)
          .get('/api/v1/admin/tokens/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalUsers');
        expect(response.body.data).toHaveProperty('totalTokensInCirculation');
        expect(response.body.data).toHaveProperty('totalTokensPurchased');
        expect(response.body.data).toHaveProperty('topUsers');
      });

      it('should require admin role', async () => {
        const response = await request(app)
          .get('/api/v1/admin/tokens/stats')
          .set('Authorization', `Bearer ${clientToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
      });
    });
  });
});

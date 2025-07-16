// import request from 'supertest';
// import app from '../../app';

// describe('Admin and Notification Endpoints', () => {
//   let adminToken: string;
//   let clientToken: string;
//   let agentToken: string;
//   let clientId: number;
//   let agentId: number;
//   let adminId: number;

//   beforeAll(async () => {
//     // Register and login as admin
//     const adminRegister = await request(app)
//       .post('/api/v1/auth/register')
//       .send({
//         name: 'Test Admin',
//         email: 'admin@test.com',
//         password: 'password123',
//         role: 'admin'
//       });

//     adminId = adminRegister.body.data.id;

//     const adminLogin = await request(app)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@test.com',
//         password: 'password123'
//       });

//     adminToken = adminLogin.body.data.token;

//     // Register and login as client
//     const clientRegister = await request(app)
//       .post('/api/v1/auth/register')
//       .send({
//         name: 'Test Client',
//         email: 'client@test.com',
//         password: 'password123',
//         role: 'client'
//       });

//     clientId = clientRegister.body.data.id;

//     const clientLogin = await request(app)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'client@test.com',
//         password: 'password123'
//       });

//     clientToken = clientLogin.body.data.token;

//     // Register and login as agent
//     const agentRegister = await request(app)
//       .post('/api/v1/auth/register')
//       .send({
//         name: 'Test Agent',
//         email: 'agent@test.com',
//         password: 'password123',
//         role: 'agent'
//       });

//     agentId = agentRegister.body.data.id;

//     const agentLogin = await request(app)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'agent@test.com',
//         password: 'password123'
//       });

//     agentToken = agentLogin.body.data.token;
//   });

//   describe('Admin User Management', () => {
//     describe('GET /api/v1/admin/users', () => {
//       it('should get all users', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/users')
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(Array.isArray(response.body.data)).toBe(true);
//         expect(response.body.data.length).toBeGreaterThan(0);

//         const user = response.body.data[0];
//         expect(user).toHaveProperty('id');
//         expect(user).toHaveProperty('name');
//         expect(user).toHaveProperty('email');
//         expect(user).toHaveProperty('role');
//         expect(user).toHaveProperty('status');
//         expect(user).not.toHaveProperty('passwordHash');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/users')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });

//       it('should require authentication', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/users')
//           .expect(401);

//         expect(response.body).toHaveProperty('error', 'Unauthorized');
//       });
//     });

//     describe('GET /api/v1/admin/users/:id', () => {
//       it('should get user details', async () => {
//         const response = await request(app)
//           .get(`/api/v1/admin/users/${clientId}`)
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('id', clientId);
//         expect(response.body.data).toHaveProperty('name');
//         expect(response.body.data).toHaveProperty('email');
//         expect(response.body.data).toHaveProperty('role', 'client');
//         expect(response.body.data).toHaveProperty('stats');
//       });

//       it('should return 404 for non-existent user', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/users/99999')
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(404);

//         expect(response.body).toHaveProperty('error', 'User not found');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .get(`/api/v1/admin/users/${clientId}`)
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });

//     describe('POST /api/v1/admin/users/:id/suspend', () => {
//       it('should suspend user', async () => {
//         const response = await request(app)
//           .post(`/api/v1/admin/users/${clientId}/suspend`)
//           .set('Authorization', `Bearer ${adminToken}`)
//           .send({
//             reason: 'Violation of terms of service'
//           })
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('status', 'suspended');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .post(`/api/v1/admin/users/${clientId}/suspend`)
//           .set('Authorization', `Bearer ${agentToken}`)
//           .send({
//             reason: 'Test reason'
//           })
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });

//     describe('POST /api/v1/admin/users/:id/reactivate', () => {
//       it('should reactivate user', async () => {
//         const response = await request(app)
//           .post(`/api/v1/admin/users/${clientId}/reactivate`)
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('status', 'active');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .post(`/api/v1/admin/users/${clientId}/reactivate`)
//           .set('Authorization', `Bearer ${agentToken}`)
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });
//   });

//   describe('Admin System Statistics', () => {
//     describe('GET /api/v1/admin/stats', () => {
//       it('should get system statistics', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/stats')
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('users');
//         expect(response.body.data).toHaveProperty('trips');
//         expect(response.body.data).toHaveProperty('bookings');
//         expect(response.body.data).toHaveProperty('customTrips');

//         expect(response.body.data.users).toHaveProperty('totalUsers');
//         expect(response.body.data.users).toHaveProperty('activeUsers');
//         expect(response.body.data.users).toHaveProperty('totalClients');
//         expect(response.body.data.users).toHaveProperty('totalAgents');

//         expect(response.body.data.trips).toHaveProperty('totalTrips');
//         expect(response.body.data.trips).toHaveProperty('activeTrips');

//         expect(response.body.data.bookings).toHaveProperty('totalBookings');
//         expect(response.body.data.bookings).toHaveProperty('totalRevenue');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/stats')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });
//   });

//   describe('Contact Message Management', () => {
//     let messageId: number;

//     beforeEach(async () => {
//       // Create a contact message for testing
//       const messageResponse = await request(app)
//         .post('/api/v1/contact')
//         .send({
//           name: 'Test User',
//           email: 'test@example.com',
//           subject: 'Test Subject',
//           message: 'This is a test message'
//         });

//       messageId = messageResponse.body.data.id;
//     });

//     describe('GET /api/v1/admin/contact-messages', () => {
//       it('should get all contact messages', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/contact-messages')
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(Array.isArray(response.body.data)).toBe(true);
//       });

//       it('should filter by status', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/contact-messages?status=new')
//           .set('Authorization', `Bearer ${adminToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(Array.isArray(response.body.data)).toBe(true);
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .get('/api/v1/admin/contact-messages')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });

//     describe('PUT /api/v1/admin/contact-messages/:id/status', () => {
//       it('should update message status', async () => {
//         const response = await request(app)
//           .put(`/api/v1/admin/contact-messages/${messageId}/status`)
//           .set('Authorization', `Bearer ${adminToken}`)
//           .send({
//             status: 'in_progress'
//           })
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('status', 'in_progress');
//       });

//       it('should require admin role', async () => {
//         const response = await request(app)
//           .put(`/api/v1/admin/contact-messages/${messageId}/status`)
//           .set('Authorization', `Bearer ${clientToken}`)
//           .send({
//             status: 'resolved'
//           })
//           .expect(403);

//         expect(response.body).toHaveProperty('error', 'Access denied. Admin role required.');
//       });
//     });
//   });

//   describe('Notification Endpoints', () => {
//     describe('GET /api/v1/notifications', () => {
//       it('should get user notifications', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('notifications');
//         expect(response.body.data).toHaveProperty('unreadCount');
//         expect(Array.isArray(response.body.data.notifications)).toBe(true);
//         expect(typeof response.body.data.unreadCount).toBe('number');
//       });

//       it('should filter unread notifications', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications?unreadOnly=true')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('notifications');
//         expect(Array.isArray(response.body.data.notifications)).toBe(true);
//       });

//       it('should limit results', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications?limit=5')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data.notifications.length).toBeLessThanOrEqual(5);
//       });

//       it('should require authentication', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications')
//           .expect(401);

//         expect(response.body).toHaveProperty('error', 'Unauthorized');
//       });
//     });

//     describe('GET /api/v1/notifications/unread-count', () => {
//       it('should get unread notification count', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications/unread-count')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('count');
//         expect(typeof response.body.data.count).toBe('number');
//       });

//       it('should require authentication', async () => {
//         const response = await request(app)
//           .get('/api/v1/notifications/unread-count')
//           .expect(401);

//         expect(response.body).toHaveProperty('error', 'Unauthorized');
//       });
//     });

//     describe('POST /api/v1/notifications/read-all', () => {
//       it('should mark all notifications as read', async () => {
//         const response = await request(app)
//           .post('/api/v1/notifications/read-all')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('count');
//         expect(typeof response.body.data.count).toBe('number');
//       });

//       it('should require authentication', async () => {
//         const response = await request(app)
//           .post('/api/v1/notifications/read-all')
//           .expect(401);

//         expect(response.body).toHaveProperty('error', 'Unauthorized');
//       });
//     });
//   });

//   describe('Contact Form', () => {
//     describe('POST /api/v1/contact', () => {
//       it('should submit contact message without authentication', async () => {
//         const messageData = {
//           name: 'John Doe',
//           email: 'john@example.com',
//           subject: 'Question about booking',
//           message: 'I have a question about the booking process...'
//         };

//         const response = await request(app)
//           .post('/api/v1/contact')
//           .send(messageData)
//           .expect(201);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('id');
//         expect(response.body.data).toHaveProperty('name', messageData.name);
//         expect(response.body.data).toHaveProperty('email', messageData.email);
//         expect(response.body.data).toHaveProperty('subject', messageData.subject);
//         expect(response.body.data).toHaveProperty('status', 'new');
//       });

//       it('should submit contact message with authentication', async () => {
//         const messageData = {
//           name: 'Authenticated User',
//           email: 'auth@example.com',
//           subject: 'Authenticated Question',
//           message: 'This is from an authenticated user'
//         };

//         const response = await request(app)
//           .post('/api/v1/contact')
//           .set('Authorization', `Bearer ${clientToken}`)
//           .send(messageData)
//           .expect(201);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('userId', clientId);
//       });

//       it('should validate required fields', async () => {
//         const response = await request(app)
//           .post('/api/v1/contact')
//           .send({
//             name: 'Test User'
//             // Missing required fields
//           })
//           .expect(400);

//         expect(response.body).toHaveProperty('error');
//       });

//       it('should validate email format', async () => {
//         const response = await request(app)
//           .post('/api/v1/contact')
//           .send({
//             name: 'Test User',
//             email: 'invalid-email',
//             subject: 'Test',
//             message: 'Test message'
//           })
//           .expect(400);

//         expect(response.body).toHaveProperty('error');
//       });
//     });
//   });

//   describe('Search Endpoints', () => {
//     describe('GET /api/v1/search', () => {
//       it('should search for trips and agents', async () => {
//         const response = await request(app)
//           .get('/api/v1/search?query=Paris')
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('trips');
//         expect(response.body.data).toHaveProperty('agents');
//         expect(Array.isArray(response.body.data.trips)).toBe(true);
//         expect(Array.isArray(response.body.data.agents)).toBe(true);
//       });

//       it('should filter by type', async () => {
//         const response = await request(app)
//           .get('/api/v1/search?query=test&type=trips')
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data).toHaveProperty('trips');
//         expect(response.body.data).toHaveProperty('agents');
//       });

//       it('should limit results', async () => {
//         const response = await request(app)
//           .get('/api/v1/search?query=test&limit=5')
//           .expect(200);

//         expect(response.body.success).toBe(true);
//       });

//       it('should require search query', async () => {
//         const response = await request(app)
//           .get('/api/v1/search')
//           .expect(400);

//         expect(response.body).toHaveProperty('error');
//       });
//     });

//     describe('GET /api/v1/destinations/popular', () => {
//       it('should get popular destinations', async () => {
//         const response = await request(app)
//           .get('/api/v1/destinations/popular')
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(Array.isArray(response.body.data)).toBe(true);
//       });

//       it('should limit results', async () => {
//         const response = await request(app)
//           .get('/api/v1/destinations/popular?limit=3')
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(response.body.data.length).toBeLessThanOrEqual(3);
//       });
//     });

//     describe('POST /api/v1/suggestions/activities', () => {
//       it('should get activity suggestions', async () => {
//         const suggestionData = {
//           location: 'Paris',
//           interests: ['museums', 'food'],
//           budget: 1000
//         };

//         const response = await request(app)
//           .post('/api/v1/suggestions/activities')
//           .send(suggestionData)
//           .expect(200);

//         expect(response.body.success).toBe(true);
//         expect(Array.isArray(response.body.data)).toBe(true);
//       });

//       it('should validate required fields', async () => {
//         const response = await request(app)
//           .post('/api/v1/suggestions/activities')
//           .send({
//             interests: ['museums']
//             // Missing location
//           })
//           .expect(400);

//         expect(response.body).toHaveProperty('error');
//       });
//     });
//   });
// });

// import request from 'supertest';
// import app from '../../app';

// describe('Agent Endpoints', () => {
//   let agentToken: string;
//   let clientToken: string;
//   let agentId: number;
//   let tripId: number;

//   beforeAll(async () => {
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

//     // Register and login as client for booking tests
//     await request(app)
//       .post('/api/v1/auth/register')
//       .send({
//         name: 'Test Client',
//         email: 'client@test.com',
//         password: 'password123',
//         role: 'client'
//       });

//     const clientLogin = await request(app)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'client@test.com',
//         password: 'password123'
//       });

//     clientToken = clientLogin.body.data.token;
//   });

//   describe('POST /api/v1/agent/trips', () => {
//     it('should create a trip successfully', async () => {
//       const tripData = {
//         title: 'Amazing Paris Tour',
//         description: 'Explore the city of lights with our expert guide',
//         itinerary: 'Day 1: Eiffel Tower, Day 2: Louvre Museum...',
//         price: 1500,
//         maxSeats: 20,
//         location: 'Paris, France',
//         startDate: '2024-06-01',
//         endDate: '2024-06-07',
//         images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
//       };

//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send(tripData)
//         .expect(201);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toHaveProperty('id');
//       expect(response.body.data).toHaveProperty('title', tripData.title);
//       expect(response.body.data).toHaveProperty('price', tripData.price.toString());
//       expect(response.body.data).toHaveProperty('maxSeats', tripData.maxSeats);
//       expect(response.body.data).toHaveProperty('availableSeats', tripData.maxSeats);
//       expect(response.body.data).toHaveProperty('status', 'active');

//       tripId = response.body.data.id;
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .send({
//           title: 'Test Trip',
//           price: 1000,
//           maxSeats: 10,
//           location: 'Test Location',
//           startDate: '2024-06-01',
//           endDate: '2024-06-07'
//         })
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${clientToken}`)
//         .send({
//           title: 'Test Trip',
//           price: 1000,
//           maxSeats: 10,
//           location: 'Test Location',
//           startDate: '2024-06-01',
//           endDate: '2024-06-07'
//         })
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });

//     it('should validate required fields', async () => {
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           title: 'Test Trip'
//           // Missing required fields
//         })
//         .expect(400);

//       expect(response.body).toHaveProperty('error');
//     });

//     it('should validate price is positive', async () => {
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           title: 'Test Trip',
//           price: -100,
//           maxSeats: 10,
//           location: 'Test Location',
//           startDate: '2024-06-01',
//           endDate: '2024-06-07'
//         })
//         .expect(400);

//       expect(response.body).toHaveProperty('error');
//     });

//     it('should validate maxSeats is at least 1', async () => {
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           title: 'Test Trip',
//           price: 1000,
//           maxSeats: 0,
//           location: 'Test Location',
//           startDate: '2024-06-01',
//           endDate: '2024-06-07'
//         })
//         .expect(400);

//       expect(response.body).toHaveProperty('error');
//     });
//   });

//   describe('GET /api/v1/agent/trips', () => {
//     it('should get agent trips', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(Array.isArray(response.body.data)).toBe(true);
//       expect(response.body.data.length).toBeGreaterThan(0);
//       expect(response.body.data[0]).toHaveProperty('id');
//       expect(response.body.data[0]).toHaveProperty('title');
//       expect(response.body.data[0]).toHaveProperty('bookingsCount');
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/trips')
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${clientToken}`)
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });
//   });

//   describe('GET /api/v1/agent/trips/:id', () => {
//     it('should get agent trip details', async () => {
//       const response = await request(app)
//         .get(`/api/v1/agent/trips/${tripId}`)
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toHaveProperty('id', tripId);
//       expect(response.body.data).toHaveProperty('title');
//       expect(response.body.data).toHaveProperty('bookings');
//       expect(Array.isArray(response.body.data.bookings)).toBe(true);
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .get(`/api/v1/agent/trips/${tripId}`)
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .get(`/api/v1/agent/trips/${tripId}`)
//         .set('Authorization', `Bearer ${clientToken}`)
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });

//     it('should return 404 for non-existent trip', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/trips/99999')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(404);

//       expect(response.body).toHaveProperty('error', 'Trip not found');
//     });

//     it('should return 400 for invalid trip ID', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/trips/invalid')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(400);

//       expect(response.body).toHaveProperty('error', 'Invalid trip ID');
//     });
//   });

//   describe('PUT /api/v1/agent/trips/:id', () => {
//     it('should update trip successfully', async () => {
//       const updateData = {
//         title: 'Updated Paris Tour',
//         description: 'Updated description',
//         price: 1600
//       };

//       const response = await request(app)
//         .put(`/api/v1/agent/trips/${tripId}`)
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send(updateData)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toHaveProperty('title', updateData.title);
//       expect(response.body.data).toHaveProperty('description', updateData.description);
//       expect(response.body.data).toHaveProperty('price', updateData.price.toString());
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .put(`/api/v1/agent/trips/${tripId}`)
//         .send({
//           title: 'Updated Title'
//         })
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .put(`/api/v1/agent/trips/${tripId}`)
//         .set('Authorization', `Bearer ${clientToken}`)
//         .send({
//           title: 'Updated Title'
//         })
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });

//     it('should validate price if provided', async () => {
//       const response = await request(app)
//         .put(`/api/v1/agent/trips/${tripId}`)
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           price: -100
//         })
//         .expect(400);

//       expect(response.body).toHaveProperty('error');
//     });

//     it('should return 400 for invalid trip ID', async () => {
//       const response = await request(app)
//         .put('/api/v1/agent/trips/invalid')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           title: 'Updated Title'
//         })
//         .expect(400);

//       expect(response.body).toHaveProperty('error', 'Invalid trip ID');
//     });
//   });

//   describe('GET /api/v1/agent/bookings', () => {
//     beforeEach(async () => {
//       // Create a booking for testing
//       await request(app)
//         .post(`/api/v1/trips/${tripId}/book`)
//         .set('Authorization', `Bearer ${clientToken}`)
//         .send({
//           seatsBooked: 2
//         });
//     });

//     it('should get agent bookings', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/bookings')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(Array.isArray(response.body.data)).toBe(true);
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/bookings')
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/bookings')
//         .set('Authorization', `Bearer ${clientToken}`)
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });
//   });

//   describe('GET /api/v1/agent/performance', () => {
//     it('should get agent performance metrics', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/performance')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toHaveProperty('bookingStats');
//       expect(response.body.data).toHaveProperty('tripStats');
//       expect(response.body.data).toHaveProperty('ranking');
//       expect(response.body.data).toHaveProperty('recentReviews');

//       expect(response.body.data.bookingStats).toHaveProperty('totalBookings');
//       expect(response.body.data.bookingStats).toHaveProperty('totalRevenue');
//       expect(response.body.data.bookingStats).toHaveProperty('confirmationRate');

//       expect(response.body.data.tripStats).toHaveProperty('totalTrips');
//       expect(response.body.data.tripStats).toHaveProperty('activeTrips');
//       expect(response.body.data.tripStats).toHaveProperty('averageRating');
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/performance')
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .get('/api/v1/agent/performance')
//         .set('Authorization', `Bearer ${clientToken}`)
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });
//   });

//   describe('DELETE /api/v1/agent/trips/:id', () => {
//     let deletableTrip: number;

//     beforeEach(async () => {
//       // Create a trip without bookings for deletion testing
//       const response = await request(app)
//         .post('/api/v1/agent/trips')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .send({
//           title: 'Deletable Trip',
//           description: 'This trip can be deleted',
//           price: 1000,
//           maxSeats: 10,
//           location: 'Test Location',
//           startDate: '2024-08-01',
//           endDate: '2024-08-07'
//         });

//       deletableTrip = response.body.data.id;
//     });

//     it('should delete trip without bookings', async () => {
//       const response = await request(app)
//         .delete(`/api/v1/agent/trips/${deletableTrip}`)
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(200);

//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toHaveProperty('status', 'deleted');
//     });

//     it('should require authentication', async () => {
//       const response = await request(app)
//         .delete(`/api/v1/agent/trips/${deletableTrip}`)
//         .expect(401);

//       expect(response.body).toHaveProperty('error', 'Unauthorized');
//     });

//     it('should require agent role', async () => {
//       const response = await request(app)
//         .delete(`/api/v1/agent/trips/${deletableTrip}`)
//         .set('Authorization', `Bearer ${clientToken}`)
//         .expect(403);

//       expect(response.body).toHaveProperty('error', 'Access denied. Agent role required.');
//     });

//     it('should return 400 for invalid trip ID', async () => {
//       const response = await request(app)
//         .delete('/api/v1/agent/trips/invalid')
//         .set('Authorization', `Bearer ${agentToken}`)
//         .expect(400);

//       expect(response.body).toHaveProperty('error', 'Invalid trip ID');
//     });
//   });
// });

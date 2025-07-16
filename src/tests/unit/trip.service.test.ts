// import { tripService } from '../../services/trip.service';

// // Mock the database
// jest.mock('../../db', () => ({
//   db: {
//     select: jest.fn(),
//     insert: jest.fn(),
//     update: jest.fn(),
//     delete: jest.fn(),
//   },
// }));

// describe('TripService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('getTrips', () => {
//     it('should return trips with pagination', async () => {
//       const mockTrips = [
//         {
//           id: 1,
//           title: 'Paris Adventure',
//           location: 'Paris, France',
//           price: '1500',
//           startDate: '2024-06-01',
//           endDate: '2024-06-07',
//           averageRating: '4.5',
//           totalReviews: 10,
//           agentName: 'John Agent',
//         },
//       ];

//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           leftJoin: jest.fn().mockReturnValue({
//             where: jest.fn().mockReturnValue({
//               orderBy: jest.fn().mockReturnValue({
//                 limit: jest.fn().mockReturnValue({
//                   offset: jest.fn().mockResolvedValue(mockTrips),
//                 }),
//               }),
//             }),
//           }),
//         }),
//       });

//       // Mock count query
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([{ count: 1 }]),
//         }),
//       });

//       const result = await tripService.getTrips({ page: 1, limit: 10 });

//       expect(result).toHaveProperty('trips');
//       expect(result).toHaveProperty('pagination');
//       expect(result.trips).toEqual(mockTrips);
//       expect(result.pagination).toEqual({
//         page: 1,
//         limit: 10,
//         total: 1,
//         totalPages: 1,
//       });
//     });

//     it('should apply location filter', async () => {
//       const mockDb = require('../../db').db;
//       const mockQuery = {
//         from: jest.fn().mockReturnValue({
//           leftJoin: jest.fn().mockReturnValue({
//             where: jest.fn().mockReturnValue({
//               orderBy: jest.fn().mockReturnValue({
//                 limit: jest.fn().mockReturnValue({
//                   offset: jest.fn().mockResolvedValue([]),
//                 }),
//               }),
//             }),
//           }),
//         }),
//       };

//       mockDb.select.mockReturnValue(mockQuery);

//       await tripService.getTrips({ location: 'Paris' });

//       expect(mockQuery.from().leftJoin().where).toHaveBeenCalled();
//     });
//   });

//   describe('getTripById', () => {
//     it('should return trip with reviews', async () => {
//       const mockTrip = {
//         id: 1,
//         title: 'Paris Adventure',
//         description: 'Amazing trip to Paris',
//         price: '1500',
//         location: 'Paris, France',
//         agentName: 'John Agent',
//         agentEmail: 'john@example.com',
//       };

//       const mockReviews = [
//         {
//           id: 1,
//           rating: 5,
//           comment: 'Great trip!',
//           clientName: 'Jane Client',
//           createdAt: new Date(),
//         },
//       ];

//       const mockDb = require('../../db').db;
      
//       // Mock trip query
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           leftJoin: jest.fn().mockReturnValue({
//             where: jest.fn().mockResolvedValue([mockTrip]),
//           }),
//         }),
//       });

//       // Mock reviews query
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           leftJoin: jest.fn().mockReturnValue({
//             where: jest.fn().mockReturnValue({
//               orderBy: jest.fn().mockReturnValue({
//                 limit: jest.fn().mockResolvedValue(mockReviews),
//               }),
//             }),
//           }),
//         }),
//       });

//       const result = await tripService.getTripById(1);

//       expect(result).toEqual({
//         ...mockTrip,
//         reviews: mockReviews,
//       });
//     });

//     it('should return null for non-existent trip', async () => {
//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           leftJoin: jest.fn().mockReturnValue({
//             where: jest.fn().mockResolvedValue([]),
//           }),
//         }),
//       });

//       const result = await tripService.getTripById(999);

//       expect(result).toBeNull();
//     });
//   });

//   describe('bookTrip', () => {
//     it('should successfully book a trip', async () => {
//       const mockTrip = {
//         id: 1,
//         price: '1500',
//         availableSeats: 10,
//         status: 'active',
//       };

//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         seatsBooked: 2,
//         totalPrice: '3000',
//         status: 'pending',
//       };

//       const mockDb = require('../../db').db;

//       // Mock trip selection
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockTrip]),
//         }),
//       });

//       // Mock booking insertion
//       mockDb.insert.mockReturnValue({
//         values: jest.fn().mockReturnValue({
//           returning: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       // Mock trip update
//       mockDb.update.mockReturnValue({
//         set: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       const result = await tripService.bookTrip(1, 1, 2);

//       expect(result).toEqual(mockBooking);
//     });

//     it('should throw error for insufficient seats', async () => {
//       const mockTrip = {
//         id: 1,
//         price: '1500',
//         availableSeats: 1,
//         status: 'active',
//       };

//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockTrip]),
//         }),
//       });

//       await expect(tripService.bookTrip(1, 1, 2)).rejects.toThrow('Not enough seats available');
//     });

//     it('should throw error for non-existent trip', async () => {
//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       await expect(tripService.bookTrip(999, 1, 2)).rejects.toThrow('Trip not found');
//     });
//   });

//   describe('cancelBooking', () => {
//     it('should successfully cancel a booking', async () => {
//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         seatsBooked: 2,
//         status: 'confirmed',
//       };

//       const mockCancelledBooking = {
//         ...mockBooking,
//         status: 'cancelled',
//         cancellationDate: new Date(),
//         cancellationReason: 'Change of plans',
//       };

//       const mockDb = require('../../db').db;

//       // Mock booking selection
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       // Mock booking update
//       mockDb.update.mockReturnValueOnce({
//         set: jest.fn().mockReturnValue({
//           where: jest.fn().mockReturnValue({
//             returning: jest.fn().mockResolvedValue([mockCancelledBooking]),
//           }),
//         }),
//       });

//       // Mock trip update (restore seats)
//       mockDb.update.mockReturnValueOnce({
//         set: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       const result = await tripService.cancelBooking(1, 1, 'Change of plans');

//       expect(result).toEqual(mockCancelledBooking);
//     });

//     it('should throw error for non-existent booking', async () => {
//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       await expect(tripService.cancelBooking(999, 1)).rejects.toThrow('Booking not found');
//     });

//     it('should throw error for already cancelled booking', async () => {
//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         status: 'cancelled',
//       };

//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       await expect(tripService.cancelBooking(1, 1)).rejects.toThrow('Booking already cancelled');
//     });
//   });

//   describe('submitReview', () => {
//     it('should successfully submit a review', async () => {
//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         status: 'completed',
//       };

//       const mockReview = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         bookingId: 1,
//         rating: 5,
//         comment: 'Great trip!',
//       };

//       const mockDb = require('../../db').db;

//       // Mock booking verification
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       // Mock existing review check
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       // Mock review insertion
//       mockDb.insert.mockReturnValue({
//         values: jest.fn().mockReturnValue({
//           returning: jest.fn().mockResolvedValue([mockReview]),
//         }),
//       });

//       // Mock rating calculation
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([{ avgRating: 4.5, reviewCount: 10 }]),
//         }),
//       });

//       // Mock trip update
//       mockDb.update.mockReturnValue({
//         set: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([]),
//         }),
//       });

//       const result = await tripService.submitReview(1, 1, 1, 5, 'Great trip!');

//       expect(result).toEqual(mockReview);
//     });

//     it('should throw error for non-completed booking', async () => {
//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         status: 'pending',
//       };

//       const mockDb = require('../../db').db;
//       mockDb.select.mockReturnValue({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       await expect(tripService.submitReview(1, 1, 1, 5)).rejects.toThrow('Booking not found or not completed');
//     });

//     it('should throw error for duplicate review', async () => {
//       const mockBooking = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         status: 'completed',
//       };

//       const mockExistingReview = {
//         id: 1,
//         clientId: 1,
//         tripId: 1,
//         bookingId: 1,
//       };

//       const mockDb = require('../../db').db;

//       // Mock booking verification
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockBooking]),
//         }),
//       });

//       // Mock existing review check
//       mockDb.select.mockReturnValueOnce({
//         from: jest.fn().mockReturnValue({
//           where: jest.fn().mockResolvedValue([mockExistingReview]),
//         }),
//       });

//       await expect(tripService.submitReview(1, 1, 1, 5)).rejects.toThrow('Review already submitted for this booking');
//     });
//   });
// });

import { Request, Response } from 'express';
import { tripService, TripFilters } from '../../services/trip.service';
import { customTripService } from '../../services/customTrip.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const tripFiltersSchema = z.object({
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const bookTripSchema = z.object({
  seatsBooked: z.number().min(1, 'At least 1 seat must be booked'),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().optional(),
});

const customTripRequestSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  budget: z.number().min(0, 'Budget must be positive'),
  interests: z.string().optional(),
  preferredStartDate: z.string().optional(),
  preferredEndDate: z.string().optional(),
  groupSize: z.number().min(1).optional(),
  clientNotes: z.string().optional(),
});

export const tripController = {
  // GET /api/trips - Fetch available trips with filters
  async getTrips(req: Request, res: Response): Promise<Response> {
    const filters = tripFiltersSchema.parse(req.query);
    const result = await tripService.getTrips(filters as TripFilters);
    return successResponse(res, 200, 'Trips fetched successfully', result);
  },

  // GET /api/trips/:id - Fetch specific trip details
  async getTripById(req: Request, res: Response): Promise<Response> {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    const trip = await tripService.getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    return successResponse(res, 200, 'Trip details fetched successfully', trip);
  },

  // POST /api/trips/:id/book - Book a trip
  async bookTrip(req: Request, res: Response): Promise<Response> {
    const tripId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { seatsBooked } = bookTripSchema.parse(req.body);
      const booking = await tripService.bookTrip(tripId, clientId, seatsBooked);
      return successResponse(res, 201, 'Trip booked successfully', booking);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/bookings - Get user bookings
  async getUserBookings(req: Request, res: Response): Promise<Response> {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookings = await tripService.getUserBookings(clientId);
    return successResponse(res, 200, 'Bookings fetched successfully', bookings);
  },

  // POST /api/bookings/:id/cancel - Cancel booking
  async cancelBooking(req: Request, res: Response): Promise<Response> {
    const bookingId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { reason } = cancelBookingSchema.parse(req.body);
      const cancelledBooking = await tripService.cancelBooking(bookingId, clientId, reason);
      return successResponse(res, 200, 'Booking cancelled successfully', cancelledBooking);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // POST /api/trips/:id/review - Submit review
  async submitReview(req: Request, res: Response): Promise<Response> {
    const tripId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { rating, comment } = reviewSchema.parse(req.body);
      const bookingId = parseInt(req.body.bookingId);
      
      if (isNaN(bookingId)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const review = await tripService.submitReview(clientId, tripId, bookingId, rating, comment);
      return successResponse(res, 201, 'Review submitted successfully', review);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/trending - Get trending trips
  async getTrendingTrips(req: Request, res: Response): Promise<Response> {
    const limit = parseInt(req.query.limit as string) || 10;
    const trendingTrips = await tripService.getTrendingTrips(limit);
    return successResponse(res, 200, 'Trending trips fetched successfully', trendingTrips);
  },

  // POST /api/custom-trips - Submit custom trip request
  async createCustomTripRequest(req: Request, res: Response): Promise<Response> {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestData = customTripRequestSchema.parse(req.body);
    const customTrip = await customTripService.createCustomTripRequest(clientId, requestData);
    return successResponse(res, 201, 'Custom trip request submitted successfully', customTrip);
  },

  // GET /api/custom-trips - Get user's custom trip requests
  async getUserCustomTripRequests(req: Request, res: Response): Promise<Response> {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customTrips = await customTripService.getClientCustomTripRequests(clientId);
    return successResponse(res, 200, 'Custom trip requests fetched successfully', customTrips);
  },

  // GET /api/custom-trips/:id - Get specific custom trip request
  async getCustomTripRequestById(req: Request, res: Response): Promise<Response> {
    const requestId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customTrip = await customTripService.getCustomTripRequestById(requestId, clientId);
    if (!customTrip) {
      return res.status(404).json({ error: 'Custom trip request not found' });
    }

    return successResponse(res, 200, 'Custom trip request details fetched successfully', customTrip);
  },
};

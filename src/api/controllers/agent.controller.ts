import { Request, Response } from 'express';
import { agentService } from '../../services/agent.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse
} from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  itinerary: z.string().max(5000, 'Itinerary cannot exceed 5000 characters').optional(),
  price: z.union([z.coerce.number().min(0, 'Price must be positive'), z.string().min(1, 'Price is required')]),
  maxSeats: z.coerce.number().min(1, 'At least 1 seat is required').max(1000, 'Maximum seats cannot exceed 1000'),
  location: z.string().min(1, 'Location is required').max(255, 'Location cannot exceed 255 characters'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  images: z.array(z.string().url('Each image must be a valid URL')).max(10, 'Maximum 10 images allowed').optional(),
});

const updateTripSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title cannot exceed 255 characters').optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  itinerary: z.string().max(5000, 'Itinerary cannot exceed 5000 characters').optional(),
  price: z.union([z.coerce.number().min(0, 'Price must be positive'), z.string().min(1, 'Price cannot be empty')]).optional(),
  maxSeats: z.coerce.number().min(1, 'At least 1 seat is required').max(1000, 'Maximum seats cannot exceed 1000').optional(),
  location: z.string().min(1, 'Location cannot be empty').max(255, 'Location cannot exceed 255 characters').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).max(10, 'Maximum 10 images allowed').optional(),
  status: z.enum(['active', 'inactive'], { errorMap: () => ({ message: 'Status must be either active or inactive' }) }).optional(),
});

export const agentController = {
  // POST /api/agent/trips - Create a new trip
  async createTrip(req: Request, res: Response): Promise<Response> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        return errorResponse(res, 401, 'Authentication required');
      }

      if (req.user?.role !== 'agent') {
        return errorResponse(res, 403, 'Access denied. Agent role required');
      }

      const tripData = createTripSchema.parse(req.body);

      // Validate date logic
      const startDate = new Date(tripData.startDate);
      const endDate = new Date(tripData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return errorResponse(res, 400, 'Start date cannot be in the past');
      }

      if (endDate <= startDate) {
        return errorResponse(res, 400, 'End date must be after start date');
      }

      const trip = await agentService.createTrip(agentId, {
        ...tripData,
        price: typeof tripData.price === 'number' ? tripData.price.toString() : tripData.price,
        availableSeats: tripData.maxSeats,
      });
      // Enhance trip creation response
      const enhancedTrip = {
        ...trip,
        managementInfo: {
          status: 'active',
          visibility: 'public',
          canEdit: true,
          canDelete: true
        },
        bookingInfo: {
          totalSeats: trip.maxSeats,
          availableSeats: trip.availableSeats,
          occupancyRate: 0
        },
        nextSteps: [
          'Your trip is now live and visible to customers',
          'Monitor bookings through your agent dashboard',
          'Update trip details anytime before the start date'
        ]
      };

      return successResponse(
        res,
        201,
        'Trip created successfully! Your trip is now live and available for bookings.',
        enhancedTrip,
        { version: 'v1' }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(res, 'Invalid trip data', error.errors);
      }
      console.error('Error creating trip:', error);
      return errorResponse(res, 500, 'Internal server error while creating trip');
    }
  },

  // GET /api/agent/trips - Get agent's trips
  async getAgentTrips(req: Request, res: Response): Promise<Response> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        return errorResponse(
          res,
          401,
          'Authentication is required to access agent resources. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (req.user?.role !== 'agent') {
        return errorResponse(
          res,
          403,
          'Access denied. This endpoint requires agent privileges.',
          null,
          { requiredRole: 'agent', currentRole: req.user?.role }
        );
      }

      const trips = await agentService.getAgentTrips(agentId);

      // Enhance trips with management information
      const enhancedTrips = trips.map((trip: any) => ({
        ...trip,
        managementInfo: {
          canEdit: new Date(trip.startDate) > new Date(),
          canDelete: trip.totalBookings === 0,
          isActive: trip.status === 'active'
        },
        performanceInfo: {
          occupancyRate: Math.round(((trip.maxSeats - trip.availableSeats) / trip.maxSeats) * 100),
          revenue: parseFloat(trip.price) * (trip.maxSeats - trip.availableSeats),
          averageRating: parseFloat(trip.averageRating || '0')
        },
        priceInfo: {
          amount: parseFloat(trip.price),
          currency: 'RWF',
          formatted: `${parseFloat(trip.price).toLocaleString()} RWF`
        }
      }));

      return successResponse(
        res,
        200,
        `Found ${enhancedTrips.length} trip${enhancedTrips.length !== 1 ? 's' : ''} in your portfolio`,
        enhancedTrips,
        {
          version: 'v1',
          filters: { agentId }
        }
      );
    } catch (error) {
      console.error('Error fetching agent trips:', error);
      return errorResponse(
        res,
        500,
        'Unable to retrieve your trips at this time. Please try again later.',
        error,
        {
          operation: 'fetch_agent_trips',
          agentId: req.user?.id,
          suggestion: 'Please refresh the page or contact support if the issue persists'
        }
      );
    }
  },

  // GET /api/agent/trips/:id - Get specific trip details
  async getAgentTripById(req: Request, res: Response): Promise<Response> {
    const tripId = req.params.id;
    const agentId = req.user?.id;

    if (!tripId || typeof tripId !== 'string') {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    const trip = await agentService.getAgentTripById(tripId, agentId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    return successResponse(res, 200, 'Trip details fetched successfully', trip);
  },

  // PUT /api/agent/trips/:id - Update trip
  async updateTrip(req: Request, res: Response): Promise<Response> {
    const tripId = req.params.id;
    const agentId = req.user?.id;

    if (!tripId || typeof tripId !== 'string') {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    try {
      const updateData = updateTripSchema.parse(req.body);

      // Convert price to string if provided as number
      const processedData: any = { ...updateData };
      if (updateData.price !== undefined) {
        processedData.price = typeof updateData.price === 'number' ? updateData.price.toString() : updateData.price;
      }

      const updatedTrip = await agentService.updateTrip(tripId, agentId, processedData);
      return successResponse(res, 200, 'Trip updated successfully', updatedTrip);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // DELETE /api/agent/trips/:id - Soft delete trip
  async deleteTrip(req: Request, res: Response): Promise<Response> {
    const tripId = req.params.id;
    const agentId = req.user?.id;

    if (!tripId || typeof tripId !== 'string') {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    try {
      const deletedTrip = await agentService.deleteTrip(tripId, agentId);
      return successResponse(res, 200, 'Trip deleted successfully', deletedTrip);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/agent/bookings - Get bookings for agent's trips
  async getAgentBookings(req: Request, res: Response): Promise<Response> {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    const bookings = await agentService.getAgentBookings(agentId);
    return successResponse(res, 200, 'Agent bookings fetched successfully', bookings);
  },

  // GET /api/agent/performance - Get agent performance metrics
  async getAgentPerformance(req: Request, res: Response): Promise<Response> {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    const performance = await agentService.getAgentPerformance(agentId);
    return successResponse(res, 200, 'Agent performance metrics fetched successfully', performance);
  },
};

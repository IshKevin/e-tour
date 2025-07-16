import { Request, Response } from 'express';
import { agentService } from '../../services/agent.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  itinerary: z.string().optional(),
  price: z.union([z.number().min(0, 'Price must be positive'), z.string().min(1)]),
  maxSeats: z.number().min(1, 'At least 1 seat is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  images: z.array(z.string()).optional(),
});

const updateTripSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  itinerary: z.string().optional(),
  price: z.union([z.number().min(0), z.string().min(1)]).optional(),
  maxSeats: z.number().min(1).optional(),
  location: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const agentController = {
  // POST /api/agent/trips - Create a new trip
  async createTrip(req: Request, res: Response): Promise<Response> {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    try {
      const tripData = createTripSchema.parse(req.body);
      const trip = await agentService.createTrip(agentId, {
        ...tripData,
        price: typeof tripData.price === 'number' ? tripData.price.toString() : tripData.price,
        availableSeats: tripData.maxSeats,
      });
      return successResponse(res, 201, 'Trip created successfully', trip);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/agent/trips - Get agent's trips
  async getAgentTrips(req: Request, res: Response): Promise<Response> {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user?.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    const trips = await agentService.getAgentTrips(agentId);
    return successResponse(res, 200, 'Agent trips fetched successfully', trips);
  },

  // GET /api/agent/trips/:id - Get specific trip details
  async getAgentTripById(req: Request, res: Response): Promise<Response> {
    const tripId = parseInt(req.params.id);
    const agentId = req.user?.id;

    if (isNaN(tripId)) {
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
    const tripId = parseInt(req.params.id);
    const agentId = req.user?.id;

    if (isNaN(tripId)) {
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
    const tripId = parseInt(req.params.id);
    const agentId = req.user?.id;

    if (isNaN(tripId)) {
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

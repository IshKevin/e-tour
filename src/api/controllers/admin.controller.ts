import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const suspendUserSchema = z.object({
  reason: z.string().optional(),
});

const assignAgentSchema = z.object({
  agentId: z.number().min(1, 'Agent ID is required'),
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
  status: z.enum(['active', 'inactive', 'deleted']).optional(),
  images: z.array(z.string()).optional(),
});

// Middleware to check admin role
const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

export const adminController = {
  // GET /api/admin/users - Get all users
  async getAllUsers(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const users = await adminService.getAllUsers();
    return successResponse(res, 200, 'Users fetched successfully', users);
  },

  // GET /api/admin/users/:id - Get user by ID
  async getUserById(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await adminService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return successResponse(res, 200, 'User details fetched successfully', user);
  },

  // POST /api/admin/users/:id/suspend - Suspend user
  async suspendUser(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const { reason } = suspendUserSchema.parse(req.body);
      const suspendedUser = await adminService.suspendUser(userId, reason);
      return successResponse(res, 200, 'User suspended successfully', suspendedUser);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // POST /api/admin/users/:id/reactivate - Reactivate user
  async reactivateUser(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const reactivatedUser = await adminService.reactivateUser(userId);
      return successResponse(res, 200, 'User reactivated successfully', reactivatedUser);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/admin/trips - Get all trips
  async getAllTrips(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const trips = await adminService.getAllTrips();
    return successResponse(res, 200, 'Trips fetched successfully', trips);
  },

  // PUT /api/admin/trips/:id - Update trip
  async updateTrip(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ error: 'Invalid trip ID' });
    }

    try {
      const updateData = updateTripSchema.parse(req.body);

      // Convert price to string if provided as number
      const processedData: any = { ...updateData };
      if (updateData.price !== undefined) {
        processedData.price = typeof updateData.price === 'number' ? updateData.price.toString() : updateData.price;
      }

      const updatedTrip = await adminService.updateTrip(tripId, processedData);
      return successResponse(res, 200, 'Trip updated successfully', updatedTrip);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/admin/bookings - Get all bookings
  async getAllBookings(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const bookings = await adminService.getAllBookings();
    return successResponse(res, 200, 'Bookings fetched successfully', bookings);
  },

  // GET /api/admin/custom-trips - Get all custom trip requests
  async getAllCustomTripRequests(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const customTrips = await adminService.getAllCustomTripRequests();
    return successResponse(res, 200, 'Custom trip requests fetched successfully', customTrips);
  },

  // POST /api/admin/custom-trips/:id/assign - Assign agent to custom trip
  async assignAgentToCustomTrip(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }

    try {
      const { agentId } = assignAgentSchema.parse(req.body);
      const updatedRequest = await adminService.assignAgentToCustomTrip(requestId, agentId);
      return successResponse(res, 200, 'Agent assigned successfully', updatedRequest);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/admin/stats - Get system statistics
  async getSystemStats(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const stats = await adminService.getSystemStats();
    return successResponse(res, 200, 'System statistics fetched successfully', stats);
  },
};

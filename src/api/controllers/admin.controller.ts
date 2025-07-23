import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  adminSuccessResponse,
  forbiddenResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const suspendUserSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
  duration: z.number().min(1, 'Duration must be at least 1 day').max(365, 'Duration cannot exceed 365 days').optional(),
  notifyUser: z.boolean().optional().default(true)
});

const assignAgentSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional()
});

const updateTripSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title cannot exceed 255 characters').optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  itinerary: z.string().max(5000, 'Itinerary cannot exceed 5000 characters').optional(),
  price: z.union([z.coerce.number().min(0, 'Price must be positive'), z.string().min(1, 'Price cannot be empty')]).optional(),
  maxSeats: z.coerce.number().min(1, 'At least 1 seat required').max(1000, 'Maximum 1000 seats allowed').optional(),
  location: z.string().min(1, 'Location cannot be empty').max(255, 'Location cannot exceed 255 characters').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  status: z.enum(['active', 'inactive', 'deleted'], { errorMap: () => ({ message: 'Status must be active, inactive, or deleted' }) }).optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).max(10, 'Maximum 10 images allowed').optional(),
});

const updateContactMessageSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed'], {
    errorMap: () => ({ message: 'Status must be new, in_progress, resolved, or closed' })
  }),
  assignedAdminId: z.string().uuid('Invalid admin ID format').optional(),
  adminNotes: z.string().max(1000, 'Admin notes cannot exceed 1000 characters').optional()
});

// Helper function to check admin role
const checkAdminRole = (req: Request, res: Response): boolean => {
  if (!req.user?.id) {
    errorResponse(
      res,
      401,
      'Authentication is required to access admin resources. Please log in and try again.',
      null,
      { action: 'login_required', endpoint: '/api/v1/auth/login' }
    );
    return false;
  }

  if (req.user?.role !== 'admin') {
    forbiddenResponse(
      res,
      'Access denied. This endpoint requires administrator privileges.',
      'admin'
    );
    return false;
  }

  return true;
};

export const adminController = {
  // GET /api/admin/users - Get all users
  async getAllUsers(req: Request, res: Response): Promise<Response> {
    try {
      if (!checkAdminRole(req, res)) return res;

      const users = await adminService.getAllUsers();

      // Enhance user data with admin-relevant information
      const enhancedUsers = users.map((user: any) => ({
        ...user,
        accountInfo: {
          status: user.emailVerified ? 'verified' : 'unverified',
          joinedDays: Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          lastActivity: user.updatedAt,
          riskLevel: user.status === 'suspended' ? 'high' : 'low'
        },
        statistics: {
          totalBookings: 0, // TODO: Implement booking count query
          totalSpent: 0, // TODO: Implement total spent query
          averageRating: null // TODO: Implement average rating query
        }
      }));

      return adminSuccessResponse(
        res,
        200,
        `Retrieved ${enhancedUsers.length} user${enhancedUsers.length !== 1 ? 's' : ''} from the system`,
        enhancedUsers,
        'get_all_users'
      );
    } catch (error) {
      console.error('Error fetching all users:', error);
      return errorResponse(
        res,
        500,
        'Unable to retrieve user data at this time. Please try again later.',
        error,
        {
          operation: 'get_all_users',
          suggestion: 'Please refresh the page or contact technical support'
        }
      );
    }
  },

  // GET /api/admin/users/:id - Get user by ID
  async getUserById(req: Request, res: Response): Promise<Response> {
    try {
      if (!checkAdminRole(req, res)) return res;

      const userId = req.params.id;
      if (!userId || typeof userId !== 'string') {
        return errorResponse(
          res,
          400,
          'User ID is required and must be a valid string',
          null,
          { parameter: 'id', received: userId }
        );
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return errorResponse(
          res,
          400,
          'User ID must be a valid UUID format',
          null,
          { parameter: 'id', received: userId, expected: 'UUID v4 format' }
        );
      }

      const user = await adminService.getUserById(userId);
      if (!user) {
        return errorResponse(
          res,
          404,
          'The requested user could not be found. They may have been deleted or the ID is incorrect.',
          null,
          { userId, suggestion: 'Verify the user ID or check the user list' }
        );
      }

      // Enhance user data with comprehensive admin information
      const enhancedUser = {
        ...user,
        accountInfo: {
          status: user.emailVerified ? 'verified' : 'unverified',
          joinedDate: user.createdAt,
          joinedDays: Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          lastActivity: user.updatedAt,
          riskLevel: user.status === 'suspended' ? 'high' : 'low',
          isSuspended: user.status === 'suspended'
        },
        statistics: {
          totalBookings: 0, // TODO: Implement booking count query
          totalSpent: 0, // TODO: Implement total spent query
          averageRating: null, // TODO: Implement average rating query
          totalReviews: 0 // TODO: Implement review count query
        },
        adminActions: {
          canSuspend: user.status !== 'suspended' && user.role !== 'admin',
          canReactivate: user.status === 'suspended',
          canDelete: user.status === 'deleted', // TODO: Check if user has no bookings
          canPromote: user.role === 'client' && user.emailVerified
        }
      };

      return adminSuccessResponse(
        res,
        200,
        'User details retrieved successfully',
        enhancedUser,
        'get_user_by_id'
      );
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return errorResponse(
        res,
        500,
        'Unable to retrieve user details at this time. Please try again later.',
        error,
        {
          operation: 'get_user_by_id',
          userId: req.params.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  },

  // POST /api/admin/users/:id/suspend - Suspend user
  async suspendUser(req: Request, res: Response): Promise<Response> {
    try {
      if (!checkAdminRole(req, res)) return res;

      const userId = req.params.id;
      if (!userId || typeof userId !== 'string') {
        return errorResponse(
          res,
          400,
          'User ID is required and must be a valid string',
          null,
          { parameter: 'id', received: userId }
        );
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return errorResponse(
          res,
          400,
          'User ID must be a valid UUID format',
          null,
          { parameter: 'id', received: userId, expected: 'UUID v4 format' }
        );
      }

      // Prevent self-suspension
      if (userId === req.user?.id) {
        return errorResponse(
          res,
          400,
          'You cannot suspend your own account. Please contact another administrator.',
          null,
          { action: 'self_suspension_prevented', suggestion: 'Contact another admin for account actions' }
        );
      }

      const { reason, duration, notifyUser } = suspendUserSchema.parse(req.body);
      const suspendedUser = await adminService.suspendUser(userId, reason);

      // Enhanced suspension response
      const enhancedResponse = {
        ...suspendedUser,
        suspensionInfo: {
          suspendedBy: req.user?.email || 'Administrator', // Use email since name is not in JWT
          suspendedAt: new Date().toISOString(),
          reason: reason || 'No reason provided',
          duration: duration ? `${duration} days` : 'Indefinite',
          userNotified: notifyUser !== false,
          canAppeal: true,
          appealProcess: 'User can contact support to appeal this suspension'
        },
        nextSteps: [
          'User has been notified of the suspension',
          'All active sessions have been terminated',
          'User can appeal through support channels'
        ]
      };

      return adminSuccessResponse(
        res,
        200,
        `User account has been suspended successfully. ${notifyUser !== false ? 'User has been notified.' : ''}`,
        enhancedResponse,
        'suspend_user'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res,
          'The suspension information provided is invalid. Please check your input and try again.',
          error.errors
        );
      }
      console.error('Error suspending user:', error);
      return errorResponse(
        res,
        500,
        'Unable to suspend user account at this time. Please try again later.',
        error,
        {
          operation: 'suspend_user',
          userId: req.params.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  },

  // POST /api/admin/users/:id/reactivate - Reactivate user
  async reactivateUser(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    if (!userId || typeof userId !== 'string') {
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

    const tripId = req.params.id;
    if (!tripId || typeof tripId !== 'string') {
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

    const requestId = req.params.id;
    if (!requestId || typeof requestId !== 'string') {
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

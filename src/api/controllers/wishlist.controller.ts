import { Request, Response } from 'express';
import { wishlistService } from '../../services/wishlist.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const addToWishlistSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID format'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
});

const removeFromWishlistSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID format')
});

export const wishlistController = {
  // POST /api/wishlist/add - Add to wishlist
  async addToWishlist(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to add items to wishlist. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { tripId, notes } = addToWishlistSchema.parse(req.body);
      const wishlistItem = await wishlistService.addToWishlist(userId, tripId, notes);

      // Enhanced wishlist response
      const enhancedWishlistItem = {
        ...wishlistItem,
        wishlistInfo: {
          itemId: wishlistItem.id,
          addedAt: wishlistItem.createdAt,
          notes: wishlistItem.notes,
          canEdit: true,
          canRemove: true
        },
        tripInfo: {
          ...wishlistItem.trip,
          isAvailable: (wishlistItem.trip?.availableSeats || 0) > 0,
          canBook: wishlistItem.trip?.status === 'active' && (wishlistItem.trip?.availableSeats || 0) > 0
        },
        recommendations: {
          message: 'Based on this trip, you might also like similar adventures',
          showSimilar: true
        },
        nextSteps: [
          'Trip has been added to your wishlist',
          'You can view all saved trips in your wishlist',
          'Book this trip anytime from your wishlist'
        ]
      };

      return successResponse(
        res, 
        201, 
        'Trip added to your wishlist successfully! You can book it anytime from your saved trips.',
        enhancedWishlistItem,
        {
          version: 'v1',
          service: 'wishlist-service',
          operation: 'add_to_wishlist'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The wishlist information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error adding to wishlist:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to add trip to wishlist at this time. Please try again later.',
        error,
        { 
          operation: 'add_to_wishlist',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // DELETE /api/wishlist/remove - Remove from wishlist
  async removeFromWishlist(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to remove items from wishlist. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { tripId } = removeFromWishlistSchema.parse(req.body);
      const removedItem = await wishlistService.removeFromWishlist(userId, tripId);

      // Enhanced removal response
      const enhancedRemoval = {
        removedItem,
        removalInfo: {
          tripId: tripId,
          removedAt: new Date().toISOString(),
          canUndo: false, // For future implementation
          reason: 'User requested removal'
        },
        suggestions: {
          message: 'Trip removed from your wishlist',
          alternatives: 'Discover similar trips you might like',
          browseMore: true
        },
        nextSteps: [
          'Trip has been removed from your wishlist',
          'You can still find this trip by searching',
          'Explore similar trips in our recommendations'
        ]
      };

      return successResponse(
        res, 
        200, 
        'Trip removed from your wishlist successfully.',
        enhancedRemoval,
        {
          version: 'v1',
          service: 'wishlist-service',
          operation: 'remove_from_wishlist'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The removal request is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error removing from wishlist:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to remove trip from wishlist at this time. Please try again later.',
        error,
        { 
          operation: 'remove_from_wishlist',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // GET /api/wishlist - Get user wishlist
  async getUserWishlist(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to view your wishlist. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'date_added'
      };

      const [wishlistData, wishlistStats] = await Promise.all([
        wishlistService.getUserWishlist(userId, filters),
        wishlistService.getWishlistStats(userId)
      ]);

      // Enhanced wishlist response
      const enhancedWishlist = {
        ...wishlistData,
        wishlistInfo: {
          totalItems: wishlistData.pagination.total,
          currentPage: filters.page,
          sortedBy: filters.sortBy,
          lastUpdated: wishlistData.wishlistItems.length > 0 ? wishlistData.wishlistItems[0].createdAt : null
        },
        statistics: wishlistStats,
        features: {
          canShare: true,
          canExport: true,
          canBulkBook: wishlistData.wishlistItems.length > 1,
          hasRecommendations: true
        },
        actions: {
          clearAll: wishlistData.pagination.total > 0,
          sortOptions: ['date_added', 'trip_name', 'price'],
          filterOptions: ['available_only', 'price_range', 'location']
        }
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${wishlistData.wishlistItems.length} item${wishlistData.wishlistItems.length !== 1 ? 's' : ''} from your wishlist`,
        enhancedWishlist,
        {
          version: 'v1',
          service: 'wishlist-service',
          operation: 'get_user_wishlist',
          pagination: wishlistData.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching user wishlist:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve your wishlist at this time. Please try again later.',
        error,
        { 
          operation: 'get_user_wishlist',
          userId: req.user?.id,
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // DELETE /api/wishlist/clear - Clear wishlist
  async clearWishlist(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to clear your wishlist. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const clearResult = await wishlistService.clearWishlist(userId);

      // Enhanced clear response
      const enhancedClearResult = {
        ...clearResult,
        clearInfo: {
          itemsRemoved: clearResult.deletedCount,
          clearedAt: new Date().toISOString(),
          canUndo: false, // For future implementation
          permanent: true
        },
        recommendations: {
          message: 'Your wishlist has been cleared',
          suggestion: 'Discover new trips to add to your wishlist',
          browseTrips: true,
          personalizedRecommendations: true
        },
        nextSteps: [
          'Your wishlist has been completely cleared',
          'Start fresh by exploring our latest trips',
          'Use our recommendations to find trips you might like'
        ]
      };

      return successResponse(
        res, 
        200, 
        `Wishlist cleared successfully! ${clearResult.deletedCount} item${clearResult.deletedCount !== 1 ? 's' : ''} removed.`,
        enhancedClearResult,
        {
          version: 'v1',
          service: 'wishlist-service',
          operation: 'clear_wishlist'
        }
      );
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to clear your wishlist at this time. Please try again later.',
        error,
        { 
          operation: 'clear_wishlist',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  }
};

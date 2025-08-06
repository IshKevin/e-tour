import { Request, Response } from 'express';
import { reviewService } from '../../services/review.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  adminSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const rateAgentSchema = z.object({
  rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
  bookingId: z.string().uuid('Invalid booking ID format'),
  categories: z.object({
    communication: z.coerce.number().min(1, 'Communication rating must be at least 1').max(5, 'Communication rating cannot exceed 5'),
    professionalism: z.coerce.number().min(1, 'Professionalism rating must be at least 1').max(5, 'Professionalism rating cannot exceed 5'),
    knowledge: z.coerce.number().min(1, 'Knowledge rating must be at least 1').max(5, 'Knowledge rating cannot exceed 5'),
    responsiveness: z.coerce.number().min(1, 'Responsiveness rating must be at least 1').max(5, 'Responsiveness rating cannot exceed 5')
  })
});

const reportReviewSchema = z.object({
  reason: z.enum(['spam', 'inappropriate_content', 'fake_review'], {
    errorMap: () => ({ message: 'Reason must be spam, inappropriate_content, or fake_review' })
  }),
  adminNotes: z.string().max(1000, 'Admin notes cannot exceed 1000 characters').optional()
});

const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'hide'], {
    errorMap: () => ({ message: 'Status must be approved, rejected, or hide' })
  }),
  moderatorNotes: z.string().max(1000, 'Moderator notes cannot exceed 1000 characters').optional()
});

export const reviewController = {
  // GET /api/trips/:id/reviews - Get trip reviews
  async getTripReviews(req: Request, res: Response): Promise<Response> {
    try {
      const tripId = req.params.id;
      if (!tripId) {
        return errorResponse(
          res, 
          400, 
          'Trip ID is required to fetch reviews',
          null,
          { parameter: 'id', received: tripId }
        );
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
        sortBy: (req.query.sortBy as string) || 'newest'
      };

      const tripReviews = await reviewService.getTripReviews(tripId, filters);

      // Enhanced trip reviews response
      const enhancedReviews = {
        ...tripReviews,
        reviewsInfo: {
          tripId,
          totalReviews: tripReviews.summary.totalReviews,
          averageRating: tripReviews.summary.averageRating,
          ratingDistribution: calculateRatingDistribution(tripReviews.reviews),
          filters: filters
        },
        helpfulInfo: {
          message: 'Reviews are sorted by helpfulness and recency',
          verifiedOnly: false,
          moderationStatus: 'All reviews are moderated for quality'
        }
      };

      return successResponse(
        res, 
        200, 
        `Found ${tripReviews.reviews.length} review${tripReviews.reviews.length !== 1 ? 's' : ''} for this trip`,
        enhancedReviews,
        {
          version: 'v1',
          service: 'review-service',
          operation: 'get_trip_reviews',
          pagination: tripReviews.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching trip reviews:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to fetch trip reviews at this time. Please try again later.',
        error,
        { 
          operation: 'get_trip_reviews',
          tripId: req.params.id,
          suggestion: 'Please refresh the page or try again later'
        }
      );
    }
  },

  // GET /api/agents/:id/reviews - Get agent reviews
  async getAgentReviews(req: Request, res: Response): Promise<Response> {
    try {
      const agentId = req.params.id;
      if (!agentId) {
        return errorResponse(
          res, 
          400, 
          'Agent ID is required to fetch reviews',
          null,
          { parameter: 'id', received: agentId }
        );
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
        sortBy: (req.query.sortBy as string) || 'helpful'
      };

      const agentReviews = await reviewService.getAgentReviews(agentId, filters);

      // Enhanced agent reviews response
      const enhancedReviews = {
        ...agentReviews,
        agentInfo: {
          agentId,
          totalReviews: agentReviews.summary?.totalReviews || 0,
          averageRating: agentReviews.summary?.averageRating || 0,
          categoryRatings: agentReviews.summary?.categoryRatings || null,
          ratingDistribution: agentReviews.summary?.ratingDistribution || null
        },
        qualityInfo: {
          verifiedReviewsOnly: true,
          moderationStatus: 'All reviews are from verified bookings',
          trustScore: calculateTrustScore(agentReviews.summary?.totalReviews || 0, agentReviews.summary?.averageRating || 0)
        },
        filters: filters
      };

      return successResponse(
        res, 
        200, 
        `Found ${agentReviews.reviews.length} review${agentReviews.reviews.length !== 1 ? 's' : ''} for this agent`,
        enhancedReviews,
        {
          version: 'v1',
          service: 'review-service',
          operation: 'get_agent_reviews',
          pagination: agentReviews.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching agent reviews:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to fetch agent reviews at this time. Please try again later.',
        error,
        { 
          operation: 'get_agent_reviews',
          agentId: req.params.id,
          suggestion: 'Please refresh the page or try again later'
        }
      );
    }
  },

  // POST /api/agents/:id/review - Rate agent
  async rateAgent(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to rate agents. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const agentId = req.params.id;
      if (!agentId) {
        return errorResponse(
          res, 
          400, 
          'Agent ID is required to submit a review',
          null,
          { parameter: 'id', received: agentId }
        );
      }

      const reviewData = rateAgentSchema.parse(req.body);
      const review = await reviewService.rateAgent(userId, agentId, reviewData);

      // Enhanced agent rating response
      const enhancedReview = {
        ...review,
        reviewInfo: {
          reviewId: review.id,
          agentId: agentId,
          rating: review.rating,
          categories: review.categories,
          isVerified: review.isVerified,
          status: review.status
        },
        impactInfo: {
          message: 'Your review helps other travelers make informed decisions',
          visibility: 'Your review is now visible to other users',
          agentNotified: true
        },
        nextSteps: [
          'Your review has been published successfully',
          'The agent has been notified of your feedback',
          'You can edit your review within 24 hours'
        ]
      };

      return successResponse(
        res, 
        201, 
        'Agent review submitted successfully! Thank you for your feedback.',
        enhancedReview,
        {
          version: 'v1',
          service: 'review-service',
          operation: 'rate_agent'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The review information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error rating agent:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to submit agent review at this time. Please try again later.',
        error,
        { 
          operation: 'rate_agent',
          userId: req.user?.id,
          agentId: req.params.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // POST /api/admin/reviews/:id/report - Report review (Admin)
  async reportReview(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to report reviews. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (req.user?.role !== 'admin') {
        return errorResponse(
          res, 
          403, 
          'Access denied. This endpoint requires administrator privileges.',
          null,
          { requiredRole: 'admin', currentRole: req.user?.role }
        );
      }

      const reviewId = req.params.id;
      if (!reviewId) {
        return errorResponse(
          res, 
          400, 
          'Review ID is required to report a review',
          null,
          { parameter: 'id', received: reviewId }
        );
      }

      const { reason, adminNotes } = reportReviewSchema.parse(req.body);
      const report = await reviewService.reportReview(userId, reviewId, reason, adminNotes);

      // Enhanced report response
      const enhancedReport = {
        ...report,
        reportInfo: {
          reportId: report.id,
          reviewId: reviewId,
          reason: reason,
          status: report.status,
          reportedBy: userId
        },
        moderationInfo: {
          priority: reason === 'inappropriate_content' ? 'high' : 'medium',
          estimatedReviewTime: '24-48 hours',
          autoActions: 'Review will be temporarily hidden pending investigation'
        },
        nextSteps: [
          'Report has been submitted for review',
          'The review will be investigated by our moderation team',
          'You will be notified of the outcome'
        ]
      };

      return adminSuccessResponse(
        res, 
        201, 
        'Review report submitted successfully! The review will be investigated by our moderation team.',
        enhancedReport,
        'report_review'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The report information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error reporting review:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to submit review report at this time. Please try again later.',
        error,
        { 
          operation: 'report_review',
          userId: req.user?.id,
          reviewId: req.params.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  },

  // PUT /api/admin/reviews/:id/moderate - Moderate review (Admin)
  async moderateReview(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to moderate reviews. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (req.user?.role !== 'admin') {
        return errorResponse(
          res, 
          403, 
          'Access denied. This endpoint requires administrator privileges.',
          null,
          { requiredRole: 'admin', currentRole: req.user?.role }
        );
      }

      const reviewId = req.params.id;
      if (!reviewId) {
        return errorResponse(
          res, 
          400, 
          'Review ID is required to moderate a review',
          null,
          { parameter: 'id', received: reviewId }
        );
      }

      const { status, moderatorNotes } = moderateReviewSchema.parse(req.body);

      // Map status to service method parameter
      let action: 'approve' | 'reject' | 'hide';
      if (status === 'approved') {
        action = 'approve';
      } else if (status === 'rejected') {
        action = 'reject';
      } else {
        action = 'hide';
      }
      const moderatedReview = await reviewService.moderateReview(userId, reviewId, action, moderatorNotes);

      if (!moderatedReview || !moderatedReview.length) {
        return errorResponse(
          res, 
          404, 
          'Review not found or could not be moderated',
          null,
          { reviewId, suggestion: 'Verify the review ID and try again' }
        );
      }

      // Enhanced moderation response
      const enhancedModeration = {
        review: moderatedReview[0],
        moderationInfo: {
          action: status,
          moderatedBy: userId,
          moderatedAt: new Date().toISOString(),
          notes: moderatorNotes,
          previousStatus: 'pending'
        },
        impactInfo: {
          visibility: status === 'approved' ? 'Review is now visible to users' : 'Review has been hidden from users',
          userNotified: true,
          appealProcess: status === 'rejected' ? 'User can appeal this decision through support' : null
        },
        nextSteps: [
          `Review has been ${status}`,
          'User has been notified of the moderation decision',
          'Moderation log has been updated'
        ]
      };

      return adminSuccessResponse(
        res, 
        200, 
        `Review ${status} successfully! Moderation action has been recorded.`,
        enhancedModeration,
        'moderate_review'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The moderation information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error moderating review:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to moderate review at this time. Please try again later.',
        error,
        { 
          operation: 'moderate_review',
          userId: req.user?.id,
          reviewId: req.params.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  }
};

// Helper functions
function calculateRatingDistribution(reviews: any[]): Record<number, number> {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating as keyof typeof distribution]++;
    }
  });
  return distribution;
}

function calculateTrustScore(totalReviews: number, averageRating: number): string {
  if (totalReviews === 0) return 'No reviews yet';
  if (totalReviews < 5) return 'Building trust';
  if (totalReviews >= 5 && averageRating >= 4.5) return 'Highly trusted';
  if (totalReviews >= 10 && averageRating >= 4.0) return 'Trusted';
  if (averageRating >= 3.5) return 'Reliable';
  return 'Needs improvement';
}

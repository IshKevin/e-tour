import { Request, Response } from 'express';
import { promotionalService } from '../../services/promotional.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  adminSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const validateDiscountSchema = z.object({
  code: z.string().min(1, 'Discount code is required').max(50, 'Code cannot exceed 50 characters'),
  tripAmount: z.coerce.number().min(0.01, 'Trip amount must be greater than 0'),
  tripId: z.string().uuid('Invalid trip ID format').optional()
});

const createDiscountCodeSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(50, 'Code cannot exceed 50 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  discountType: z.enum(['percentage', 'fixed_amount'], {
    errorMap: () => ({ message: 'Discount type must be percentage or fixed_amount' })
  }),
  discountValue: z.coerce.number().min(0.01, 'Discount value must be greater than 0'),
  minimumOrderAmount: z.coerce.number().min(0, 'Minimum order amount cannot be negative').optional(),
  maximumDiscountAmount: z.coerce.number().min(0, 'Maximum discount amount cannot be negative').optional(),
  usageLimit: z.coerce.number().min(1, 'Usage limit must be at least 1').optional(),
  userUsageLimit: z.coerce.number().min(1, 'User usage limit must be at least 1').optional(),
  validFrom: z.string().datetime('Invalid start date format'),
  validUntil: z.string().datetime('Invalid end date format'),
  isFirstTimeUserOnly: z.boolean().optional(),
  applicableToTrips: z.array(z.string().uuid('Invalid trip ID format')).optional()
});

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Name cannot exceed 255 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  campaignType: z.string().min(1, 'Campaign type is required').max(50, 'Type cannot exceed 50 characters'),
  targetAudience: z.object({
    userTypes: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    ageGroups: z.array(z.string()).optional(),
    previousBookings: z.boolean().optional()
  }).optional(),
  discountCodeIds: z.array(z.string().uuid('Invalid discount code ID format')).optional(),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  budget: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
  targetReach: z.coerce.number().min(1, 'Target reach must be at least 1').optional()
});

export const promotionalController = {
  // POST /api/promotions/validate - Validate discount code
  async validateDiscountCode(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to validate discount codes. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { code, tripAmount, tripId } = validateDiscountSchema.parse(req.body);
      const validation = await promotionalService.validateDiscountCode(code, userId, tripAmount, tripId);

      // Enhanced validation response
      const enhancedValidation = {
        ...validation,
        validationInfo: {
          code: code.toUpperCase(),
          userId: userId,
          tripAmount: tripAmount,
          validatedAt: new Date().toISOString()
        },
        savingsInfo: validation.isValid ? {
          originalAmount: tripAmount,
          discountAmount: validation.discountAmount,
          finalAmount: validation.finalAmount,
          savingsPercentage: ((validation.discountAmount / tripAmount) * 100).toFixed(2) + '%'
        } : null,
        nextSteps: validation.isValid ? [
          'Discount code is valid and ready to use',
          'Proceed to checkout to apply this discount',
          'Discount will be automatically applied to your booking'
        ] : [
          'Please check the discount code and try again',
          'Contact support if you believe this is an error',
          'Browse our current promotions for available discounts'
        ]
      };

      const statusCode = validation.isValid ? 200 : 400;
      const message = validation.isValid 
        ? `Discount code validated successfully! You'll save $${validation.discountAmount.toFixed(2)}.`
        : validation.message;

      return successResponse(
        res, 
        statusCode, 
        message,
        enhancedValidation,
        {
          version: 'v1',
          service: 'promotional-service',
          operation: 'validate_discount_code'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The discount validation information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error validating discount code:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to validate discount code at this time. Please try again later.',
        error,
        { 
          operation: 'validate_discount_code',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // POST /api/admin/promotions/discount-codes - Create discount code (Admin)
  async createDiscountCode(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to create discount codes. Please log in and try again.',
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

      const discountData = createDiscountCodeSchema.parse(req.body);
      const discountCode = await promotionalService.createDiscountCode(userId, discountData);

      // Enhanced discount code response
      const enhancedDiscountCode = {
        ...discountCode,
        codeInfo: {
          codeId: discountCode.id,
          code: discountCode.code,
          type: discountCode.discountType,
          value: discountCode.discountValue,
          status: discountCode.status
        },
        usageInfo: {
          usageLimit: discountCode.usageLimit || 'Unlimited',
          userUsageLimit: discountCode.userUsageLimit,
          currentUsage: discountCode.usedCount,
          remainingUses: discountCode.usageLimit ? discountCode.usageLimit - discountCode.usedCount : 'Unlimited'
        },
        validityInfo: {
          validFrom: discountCode.validFrom,
          validUntil: discountCode.validUntil,
          isActive: discountCode.status === 'active',
          daysRemaining: Math.ceil((new Date(discountCode.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        },
        nextSteps: [
          'Discount code has been created successfully',
          'Code is now active and ready for use',
          'Share this code with customers or add it to campaigns'
        ]
      };

      return adminSuccessResponse(
        res, 
        201, 
        'Discount code created successfully! It is now active and ready for use.',
        enhancedDiscountCode,
        'create_discount_code'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The discount code information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error creating discount code:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to create discount code at this time. Please try again later.',
        error,
        { 
          operation: 'create_discount_code',
          userId: req.user?.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  },

  // GET /api/admin/promotions/discount-codes - Get discount codes (Admin)
  async getDiscountCodes(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to view discount codes. Please log in and try again.',
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

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string | undefined
      };

      const discountCodesData = await promotionalService.getDiscountCodes(userId, filters);

      // Enhanced discount codes response
      const enhancedDiscountCodes = {
        ...discountCodesData,
        codesInfo: {
          totalCodes: discountCodesData.pagination.total,
          activeCodes: discountCodesData.discountCodes.filter(code => code.status === 'active').length,
          expiredCodes: discountCodesData.discountCodes.filter(code => code.status === 'expired').length,
          usedUpCodes: discountCodesData.discountCodes.filter(code => code.status === 'used_up').length
        },
        statistics: {
          totalUsage: discountCodesData.discountCodes.reduce((sum, code) => sum + code.usedCount, 0),
          averageUsageRate: discountCodesData.discountCodes.length > 0 
            ? (discountCodesData.discountCodes.reduce((sum, code) => sum + code.usedCount, 0) / discountCodesData.discountCodes.length).toFixed(2)
            : '0',
          mostUsedCode: discountCodesData.discountCodes.reduce((max, code) => 
            code.usedCount > (max?.usedCount || 0) ? code : max, null as any)
        },
        managementOptions: {
          canCreateNew: true,
          canEditExisting: true,
          canDeactivate: true,
          canViewUsageHistory: true
        }
      };

      return adminSuccessResponse(
        res, 
        200, 
        `Retrieved ${discountCodesData.discountCodes.length} discount code${discountCodesData.discountCodes.length !== 1 ? 's' : ''}`,
        enhancedDiscountCodes,
        'get_discount_codes'
      );
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve discount codes at this time. Please try again later.',
        error,
        { 
          operation: 'get_discount_codes',
          userId: req.user?.id,
          suggestion: 'Please refresh the page or contact technical support'
        }
      );
    }
  },

  // POST /api/admin/promotions/campaigns - Create promotional campaign (Admin)
  async createPromotionalCampaign(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to create promotional campaigns. Please log in and try again.',
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

      const campaignData = createCampaignSchema.parse(req.body);
      const campaign = await promotionalService.createPromotionalCampaign(userId, campaignData);

      // Enhanced campaign response
      const enhancedCampaign = {
        ...campaign,
        campaignInfo: {
          campaignId: campaign.id,
          name: campaign.name,
          type: campaign.campaignType,
          status: campaign.status,
          duration: Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
        },
        budgetInfo: {
          budget: campaign.budget || 'No budget set',
          spent: campaign.actualSpent,
          remaining: campaign.budget ? (parseFloat(campaign.budget) - parseFloat(campaign.actualSpent || '0')).toFixed(2) : 'N/A'
        },
        targetingInfo: {
          targetAudience: campaign.targetAudience,
          targetReach: campaign.targetReach || 'No target set',
          actualReach: campaign.actualReach
        },
        nextSteps: [
          'Promotional campaign has been created successfully',
          'Campaign is in draft status - activate when ready',
          'Monitor campaign performance through analytics dashboard'
        ]
      };

      return adminSuccessResponse(
        res, 
        201, 
        'Promotional campaign created successfully! You can now activate it to start reaching customers.',
        enhancedCampaign,
        'create_promotional_campaign'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The campaign information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error creating promotional campaign:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to create promotional campaign at this time. Please try again later.',
        error,
        { 
          operation: 'create_promotional_campaign',
          userId: req.user?.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  }
};

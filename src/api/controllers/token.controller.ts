import { Request, Response } from 'express';
import { tokenService, TOKEN_PACKAGES } from '../../services/token.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  tokenSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const purchaseTokensSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required').max(50, 'Package ID cannot exceed 50 characters'),
  paymentReference: z.string().min(1, 'Payment reference is required').max(100, 'Payment reference cannot exceed 100 characters'),
  paymentMethod: z.enum(['card', 'mobile_money', 'bank_transfer'], {
    errorMap: () => ({ message: 'Payment method must be card, mobile_money, or bank_transfer' })
  }).optional().default('card'),
  promoCode: z.string().max(20, 'Promo code cannot exceed 20 characters').optional()
});

export const tokenController = {
  // GET /api/tokens/packages - Get available token packages
  async getTokenPackages(req: Request, res: Response): Promise<Response> {
    const packages = tokenService.getTokenPackages();
    return successResponse(res, 200, 'Token packages fetched successfully', packages);
  },

  // POST /api/tokens/purchase - Purchase token package
  async purchaseTokens(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res,
          401,
          'Authentication is required to purchase tokens. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { packageId, paymentReference, paymentMethod, promoCode } = purchaseTokensSchema.parse(req.body);

      // Validate package exists
      const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
      if (!tokenPackage) {
        return errorResponse(
          res,
          400,
          'Invalid package selected. Please choose a valid token package.',
          null,
          {
            field: 'packageId',
            received: packageId,
            availablePackages: TOKEN_PACKAGES.map(pkg => pkg.id)
          }
        );
      }

      // In a real application, you would:
      // 1. Validate the payment with your payment gateway
      // 2. Ensure the payment was successful
      // 3. Then proceed with token allocation

      const result = await tokenService.purchaseTokens(userId, packageId, paymentReference);

      // Enhanced purchase response
      const enhancedPurchase = {
        tokens: result.tokens,
        transaction: result.transaction,
        packageInfo: {
          name: tokenPackage.name,
          tokensReceived: tokenPackage.tokens,
          bonusTokens: tokenPackage.bonus || 0,
          totalTokens: tokenPackage.tokens + (tokenPackage.bonus || 0),
          pricePerToken: (tokenPackage.price / tokenPackage.tokens).toFixed(2)
        },
        paymentInfo: {
          method: paymentMethod || 'card',
          reference: paymentReference,
          amount: tokenPackage.price,
          currency: 'RWF',
          promoApplied: !!promoCode
        },
        nextSteps: [
          'Tokens have been added to your account',
          'You can now use tokens to post jobs or access premium features',
          'Check your token balance in your profile'
        ]
      };

      return tokenSuccessResponse(
        res,
        201,
        `Token purchase successful! ${tokenPackage.tokens + (tokenPackage.bonus || 0)} tokens have been added to your account.`,
        enhancedPurchase,
        {
          transactionType: 'purchase',
          packageId,
          tokensAdded: tokenPackage.tokens + (tokenPackage.bonus || 0)
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res,
          'The purchase information provided is invalid. Please check your input and try again.',
          error.errors
        );
      }
      console.error('Error purchasing tokens:', error);
      return errorResponse(
        res,
        500,
        'Unable to process token purchase at this time. Please try again later.',
        error,
        {
          operation: 'purchase_tokens',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if payment was deducted'
        }
      );
    }
  },

  // GET /api/tokens/balance - Get user token balance
  async getTokenBalance(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokens = await tokenService.getUserTokenBalance(userId);
    return successResponse(res, 200, 'Token balance fetched successfully', {
      balance: tokens.balance,
      lastUpdated: tokens.updatedAt,
    });
  },

  // GET /api/tokens/history - Get token transaction history
  async getTokenHistory(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = await tokenService.getTokenHistory(userId, limit);
    return successResponse(res, 200, 'Token history fetched successfully', history);
  },

  // Admin endpoints
  // POST /api/admin/tokens/grant - Grant tokens to user (admin only)
  async grantTokens(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const grantTokensSchema = z.object({
      userId: z.string().uuid('Invalid user ID format'),
      amount: z.number().min(1, 'Amount must be positive'),
      description: z.string().optional(),
    });

    try {
      const { userId, amount, description } = grantTokensSchema.parse(req.body);
      const tokens = await tokenService.grantTokens(userId, amount, description);
      return successResponse(res, 200, 'Tokens granted successfully', tokens);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/admin/tokens/stats - Get token statistics (admin only)
  async getTokenStatistics(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const stats = await tokenService.getTokenStatistics();
    return successResponse(res, 200, 'Token statistics fetched successfully', stats);
  },
};

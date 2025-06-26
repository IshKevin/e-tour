import { Request, Response } from 'express';
import { tokenService, TOKEN_PACKAGES } from '../../services/token.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const purchaseTokensSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  paymentReference: z.string().min(1, 'Payment reference is required'),
});

export const tokenController = {
  // GET /api/tokens/packages - Get available token packages
  async getTokenPackages(req: Request, res: Response): Promise<Response> {
    const packages = tokenService.getTokenPackages();
    return successResponse(res, 200, 'Token packages fetched successfully', packages);
  },

  // POST /api/tokens/purchase - Purchase token package
  async purchaseTokens(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { packageId, paymentReference } = purchaseTokensSchema.parse(req.body);
      
      // Validate package exists
      const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
      if (!tokenPackage) {
        return res.status(400).json({ error: 'Invalid token package' });
      }

      // In a real application, you would:
      // 1. Validate the payment with your payment gateway
      // 2. Ensure the payment was successful
      // 3. Then proceed with token allocation
      
      const result = await tokenService.purchaseTokens(userId, packageId, paymentReference);
      return successResponse(res, 200, 'Tokens purchased successfully', {
        tokens: result.tokens,
        transaction: result.transaction,
        package: tokenPackage,
      });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
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
      userId: z.number().min(1, 'User ID is required'),
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

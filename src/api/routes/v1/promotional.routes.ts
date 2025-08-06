import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { promotionalController } from '../../controllers/promotional.controller';

const router = Router();

// Validate discount code (authenticated users)
router.post('/validate', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  promotionalController.validateDiscountCode(req, res).catch(next);
});

// Create discount code (admin only)
router.post('/admin/discount-codes', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  promotionalController.createDiscountCode(req, res).catch(next);
});

// Get discount codes (admin only)
router.get('/admin/discount-codes', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  promotionalController.getDiscountCodes(req, res).catch(next);
});

// Create promotional campaign (admin only)
router.post('/admin/campaigns', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  promotionalController.createPromotionalCampaign(req, res).catch(next);
});

export default router;

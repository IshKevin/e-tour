import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { reviewController } from '../../controllers/review.controller';

const router = Router();

// Get trip reviews (public)
router.get('/trips/:id/reviews', (req: Request, res: Response, next: NextFunction) => {
  reviewController.getTripReviews(req, res).catch(next);
});

// Get agent reviews (public)
router.get('/agents/:id/reviews', (req: Request, res: Response, next: NextFunction) => {
  reviewController.getAgentReviews(req, res).catch(next);
});

// Rate agent (authenticated)
router.post('/agents/:id/review', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  reviewController.rateAgent(req, res).catch(next);
});

// Report review (admin only)
router.post('/admin/reviews/:id/report', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  reviewController.reportReview(req, res).catch(next);
});

// Moderate review (admin only)
router.put('/admin/reviews/:id/moderate', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  reviewController.moderateReview(req, res).catch(next);
});

export default router;

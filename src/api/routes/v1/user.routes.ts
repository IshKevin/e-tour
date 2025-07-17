import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../../controllers/user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Profile routes as specified in Task.md - /api/profile
router.get('/profile', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.getProfile(req, res).catch(next);
});

router.put('/profile', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.updateProfile(req, res).catch(next);
});

// Terms and conditions agreement
router.put('/terms-agreement', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.updateTermsAgreement(req, res).catch(next);
});

// Notification preferences
router.put('/notification-preferences', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.updateNotificationPreference(req, res).catch(next);
});

export default router;
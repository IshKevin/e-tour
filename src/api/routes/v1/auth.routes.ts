import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../../controllers/user.controller';

const router = Router();

router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  userController.createUser(req, res, next).catch(next);
});

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  userController.login(req, res, next).catch(next);
});

router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  userController.logout(req, res).catch(next);
});

router.post('/verify-email', (req: Request, res: Response, next: NextFunction) => {
  userController.verifyEmail(req, res).catch(next);
});

router.post('/resend-verification', (req: Request, res: Response, next: NextFunction) => {
  userController.resendVerificationEmail(req, res).catch(next);
});

router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  userController.requestPasswordReset(req, res).catch(next);
});

router.post('/reset-password/confirm', (req: Request, res: Response, next: NextFunction) => {
  userController.resetPassword(req, res).catch(next);
});

export default router;

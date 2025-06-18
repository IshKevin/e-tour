import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../../controllers/user.controller';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  userController.getAllUsers(req, res, next);
});
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  userController.createUser(req, res, next).catch(next);
});
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  userController.login(req, res, next).catch(next);
});

export default router;
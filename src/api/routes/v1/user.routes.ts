import { Router } from 'express';
import { userController } from '../../controllers/user.controller';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
	await userController.getAllUsers(req, res);
  } catch (err) {
	next(err);
  }
});
router.post('/', async (req, res, next) => {
  try {
    await userController.createUser(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
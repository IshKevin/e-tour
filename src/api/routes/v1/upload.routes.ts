import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { upload } from '../../../services/upload.service';
import { uploadController } from '../../controllers/upload.controller';

const router = Router();

// Upload single image
router.post('/image', authMiddleware, upload.single('image'), (req: Request, res: Response, next: NextFunction) => {
  uploadController.uploadImage(req, res).catch(next);
});

// Upload profile image
router.post('/profile', authMiddleware, upload.single('image'), (req: Request, res: Response, next: NextFunction) => {
  uploadController.uploadProfileImage(req, res).catch(next);
});

// Delete image
router.delete('/image', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  uploadController.deleteImage(req, res).catch(next);
});

export default router;
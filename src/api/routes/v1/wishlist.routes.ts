import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { wishlistController } from '../../controllers/wishlist.controller';

const router = Router();

// Add to wishlist
router.post('/add', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  wishlistController.addToWishlist(req, res).catch(next);
});

// Remove from wishlist
router.delete('/remove', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  wishlistController.removeFromWishlist(req, res).catch(next);
});

// Get user wishlist
router.get('/', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  wishlistController.getUserWishlist(req, res).catch(next);
});

// Clear wishlist
router.delete('/clear', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  wishlistController.clearWishlist(req, res).catch(next);
});

export default router;

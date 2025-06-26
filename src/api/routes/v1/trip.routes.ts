import { Router, Request, Response, NextFunction } from 'express';
import { tripController } from '../../controllers/trip.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/trips', (req: Request, res: Response, next: NextFunction) => {
  tripController.getTrips(req, res).catch(next);
});

router.get('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  tripController.getTripById(req, res).catch(next);
});

router.get('/trending', (req: Request, res: Response, next: NextFunction) => {
  tripController.getTrendingTrips(req, res).catch(next);
});

// Protected routes (require authentication)
router.post('/trips/:id/book', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.bookTrip(req, res).catch(next);
});

router.get('/bookings', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.getUserBookings(req, res).catch(next);
});

router.post('/bookings/:id/cancel', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.cancelBooking(req, res).catch(next);
});

router.post('/trips/:id/review', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.submitReview(req, res).catch(next);
});

router.post('/custom-trips', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.createCustomTripRequest(req, res).catch(next);
});

router.get('/custom-trips', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.getUserCustomTripRequests(req, res).catch(next);
});

router.get('/custom-trips/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tripController.getCustomTripRequestById(req, res).catch(next);
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { adminController } from '../../controllers/admin.controller';
import { contactController } from '../../controllers/contact.controller';
import { tokenController } from '../../controllers/token.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
router.use(authMiddleware);

// User management routes
router.get('/users', (req: Request, res: Response, next: NextFunction) => {
  adminController.getAllUsers(req, res).catch(next);
});

router.get('/users/:id', (req: Request, res: Response, next: NextFunction) => {
  adminController.getUserById(req, res).catch(next);
});

router.post('/users/:id/suspend', (req: Request, res: Response, next: NextFunction) => {
  adminController.suspendUser(req, res).catch(next);
});

router.post('/users/:id/reactivate', (req: Request, res: Response, next: NextFunction) => {
  adminController.reactivateUser(req, res).catch(next);
});

// Trip management routes
router.get('/trips', (req: Request, res: Response, next: NextFunction) => {
  adminController.getAllTrips(req, res).catch(next);
});

router.put('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  adminController.updateTrip(req, res).catch(next);
});

// Booking management routes
router.get('/bookings', (req: Request, res: Response, next: NextFunction) => {
  adminController.getAllBookings(req, res).catch(next);
});

// Custom trip management routes
router.get('/custom-trips', (req: Request, res: Response, next: NextFunction) => {
  adminController.getAllCustomTripRequests(req, res).catch(next);
});

router.post('/custom-trips/:id/assign', (req: Request, res: Response, next: NextFunction) => {
  adminController.assignAgentToCustomTrip(req, res).catch(next);
});

// System statistics
router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  adminController.getSystemStats(req, res).catch(next);
});

// Contact message management
router.get('/contact-messages', (req: Request, res: Response, next: NextFunction) => {
  contactController.getAllContactMessages(req, res).catch(next);
});

router.get('/contact-messages/search', (req: Request, res: Response, next: NextFunction) => {
  contactController.searchContactMessages(req, res).catch(next);
});

router.get('/contact-messages/stats', (req: Request, res: Response, next: NextFunction) => {
  contactController.getContactMessageStats(req, res).catch(next);
});

router.get('/contact-messages/:id', (req: Request, res: Response, next: NextFunction) => {
  contactController.getContactMessageById(req, res).catch(next);
});

router.put('/contact-messages/:id/status', (req: Request, res: Response, next: NextFunction) => {
  contactController.updateMessageStatus(req, res).catch(next);
});

router.post('/contact-messages/:id/assign', (req: Request, res: Response, next: NextFunction) => {
  contactController.assignMessageToAdmin(req, res).catch(next);
});

router.get('/my-assigned-messages', (req: Request, res: Response, next: NextFunction) => {
  contactController.getMyAssignedMessages(req, res).catch(next);
});

// Token management
router.post('/tokens/grant', (req: Request, res: Response, next: NextFunction) => {
  tokenController.grantTokens(req, res).catch(next);
});

router.get('/tokens/stats', (req: Request, res: Response, next: NextFunction) => {
  tokenController.getTokenStatistics(req, res).catch(next);
});

export default router;

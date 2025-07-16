import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from './auth.routes';
import tripRoutes from './trip.routes';
import agentRoutes from './agent.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';
import healthRoutes from './health.routes';
import { userController } from '../../controllers/user.controller';
import { searchController } from '../../controllers/search.controller';
import { tokenController } from '../../controllers/token.controller';
import { jobController } from '../../controllers/job.controller';
import { notificationController } from '../../controllers/notification.controller';
import { contactController } from '../../controllers/contact.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Authentication routes
router.use('/auth', authRoutes);

// Trip-related routes
router.use('/', tripRoutes);

// Agent routes
router.use('/agent', agentRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Upload routes
router.use('/upload', uploadRoutes);

// Health routes
router.use('/health', healthRoutes);

// Profile routes (as specified in Task.md)
router.get('/profile', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.getProfile(req, res).catch(next);
});

router.put('/profile', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  userController.updateProfile(req, res).catch(next);
});

// Search routes
router.get('/search', (req: Request, res: Response, next: NextFunction) => {
  searchController.search(req, res).catch(next);
});

router.post('/suggestions/activities', (req: Request, res: Response, next: NextFunction) => {
  searchController.getActivitySuggestions(req, res).catch(next);
});

router.get('/destinations/popular', (req: Request, res: Response, next: NextFunction) => {
  searchController.getPopularDestinations(req, res).catch(next);
});

// Token routes
router.get('/tokens/packages', (req: Request, res: Response, next: NextFunction) => {
  tokenController.getTokenPackages(req, res).catch(next);
});

router.post('/tokens/purchase', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tokenController.purchaseTokens(req, res).catch(next);
});

router.get('/tokens/balance', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tokenController.getTokenBalance(req, res).catch(next);
});

router.get('/tokens/history', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  tokenController.getTokenHistory(req, res).catch(next);
});

// Job marketplace routes
router.post('/jobs', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.createJob(req, res).catch(next);
});

router.get('/jobs', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.getClientJobs(req, res).catch(next);
});

router.get('/jobs/available', (req: Request, res: Response, next: NextFunction) => {
  jobController.getAvailableJobs(req, res).catch(next);
});

router.get('/jobs/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.getJobById(req, res).catch(next);
});

router.put('/jobs/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.updateJob(req, res).catch(next);
});

router.delete('/jobs/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.deleteJob(req, res).catch(next);
});

router.post('/jobs/:id/apply', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.applyForJob(req, res).catch(next);
});

router.get('/jobs/:id/applicants', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.getJobApplicants(req, res).catch(next);
});

router.post('/jobs/:id/applicants/:applicantId/accept', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.acceptApplicant(req, res).catch(next);
});

router.post('/jobs/:id/applicants/:applicantId/reject', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.rejectApplicant(req, res).catch(next);
});

router.get('/my-applications', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  jobController.getUserApplications(req, res).catch(next);
});

// Notification routes
router.get('/notifications', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  notificationController.getUserNotifications(req, res).catch(next);
});

router.post('/notifications/:id/read', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  notificationController.markAsRead(req, res).catch(next);
});

router.post('/notifications/read-all', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  notificationController.markAllAsRead(req, res).catch(next);
});

router.delete('/notifications/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  notificationController.deleteNotification(req, res).catch(next);
});

router.get('/notifications/unread-count', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  notificationController.getUnreadCount(req, res).catch(next);
});

// Contact routes
router.post('/contact', (req: Request, res: Response, next: NextFunction) => {
  contactController.submitContactMessage(req, res).catch(next);
});

export default router;
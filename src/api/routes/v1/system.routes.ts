import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { utilityController } from '../../controllers/utility.controller';
import { systemController } from '../../controllers/system.controller';

const router = Router();

// Utility endpoints (public/authenticated)
router.get('/utils/weather', (req: Request, res: Response, next: NextFunction) => {
  utilityController.getWeather(req, res).catch(next);
});

router.get('/utils/currency', (req: Request, res: Response, next: NextFunction) => {
  utilityController.getCurrencyRates(req, res).catch(next);
});

router.get('/utils/currency/convert', (req: Request, res: Response, next: NextFunction) => {
  utilityController.convertCurrency(req, res).catch(next);
});

router.get('/utils/locations', (req: Request, res: Response, next: NextFunction) => {
  utilityController.getLocationSuggestions(req, res).catch(next);
});

router.get('/utils/timezone', (req: Request, res: Response, next: NextFunction) => {
  utilityController.getTimezoneInfo(req, res).catch(next);
});

// Notification endpoints (admin only)
router.get('/admin/notifications/templates', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getNotificationTemplates(req, res).catch(next);
});

router.post('/admin/notifications/bulk', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.sendBulkNotifications(req, res).catch(next);
});

router.get('/admin/notifications/history', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getNotificationHistory(req, res).catch(next);
});

// Analytics endpoints
router.get('/analytics/dashboard', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getDashboardMetrics(req, res).catch(next);
});

router.get('/admin/analytics/bookings', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getBookingAnalytics(req, res).catch(next);
});

router.get('/admin/analytics/users', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getUserAnalytics(req, res).catch(next);
});

router.get('/admin/analytics/revenue', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getRevenueAnalytics(req, res).catch(next);
});

router.post('/admin/analytics/reports', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.generateCustomReport(req, res).catch(next);
});

// System monitoring endpoints
router.get('/health', (req: Request, res: Response, next: NextFunction) => {
  systemController.getSystemHealth(req, res).catch(next);
});

router.get('/admin/system/stats', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  systemController.getSystemStats(req, res).catch(next);
});

export default router;

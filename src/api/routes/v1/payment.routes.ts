import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { paymentController } from '../../controllers/payment.controller';

const router = Router();

// Process payment
router.post('/process', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  paymentController.processPayment(req, res).catch(next);
});

// Request refund
router.post('/refund', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  paymentController.requestRefund(req, res).catch(next);
});

// Get payment history
router.get('/history', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  paymentController.getPaymentHistory(req, res).catch(next);
});

// Generate invoice
router.post('/invoice', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  paymentController.generateInvoice(req, res).catch(next);
});

// Get payment status
router.get('/:paymentId/status', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  paymentController.getPaymentStatus(req, res).catch(next);
});

export default router;

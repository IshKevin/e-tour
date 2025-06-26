import { Router, Request, Response, NextFunction } from 'express';
import { agentController } from '../../controllers/agent.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All agent routes require authentication
router.use(authMiddleware);

// Agent trip management routes
router.post('/trips', (req: Request, res: Response, next: NextFunction) => {
  agentController.createTrip(req, res).catch(next);
});

router.get('/trips', (req: Request, res: Response, next: NextFunction) => {
  agentController.getAgentTrips(req, res).catch(next);
});

router.get('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  agentController.getAgentTripById(req, res).catch(next);
});

router.put('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  agentController.updateTrip(req, res).catch(next);
});

router.delete('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  agentController.deleteTrip(req, res).catch(next);
});

// Agent booking management routes
router.get('/bookings', (req: Request, res: Response, next: NextFunction) => {
  agentController.getAgentBookings(req, res).catch(next);
});

// Agent performance routes
router.get('/performance', (req: Request, res: Response, next: NextFunction) => {
  agentController.getAgentPerformance(req, res).catch(next);
});

export default router;

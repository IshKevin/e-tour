import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { messagingController } from '../../controllers/messaging.controller';

const router = Router();

// Send message
router.post('/send', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  messagingController.sendMessage(req, res).catch(next);
});

// Get conversations
router.get('/conversations', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  messagingController.getConversations(req, res).catch(next);
});

// Get conversation messages
router.get('/conversations/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  messagingController.getConversationMessages(req, res).catch(next);
});

// Mark messages as read
router.put('/mark-read', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  messagingController.markMessagesAsRead(req, res).catch(next);
});

// Delete conversation
router.delete('/conversations/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  messagingController.deleteConversation(req, res).catch(next);
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { contentController } from '../../controllers/content.controller';

const router = Router();

// Get blog posts (public)
router.get('/blog', (req: Request, res: Response, next: NextFunction) => {
  contentController.getBlogPosts(req, res).catch(next);
});

// Get single blog post (public)
router.get('/blog/:slug', (req: Request, res: Response, next: NextFunction) => {
  contentController.getBlogPost(req, res).catch(next);
});

// Create blog post (admin only)
router.post('/admin/blog', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  contentController.createBlogPost(req, res).catch(next);
});

// Get FAQ items (public)
router.get('/faq', (req: Request, res: Response, next: NextFunction) => {
  contentController.getFaqItems(req, res).catch(next);
});

// Get legal documents (public)
router.get('/legal', (req: Request, res: Response, next: NextFunction) => {
  contentController.getLegalDocuments(req, res).catch(next);
});

// Search content (public)
router.get('/search', (req: Request, res: Response, next: NextFunction) => {
  contentController.searchContent(req, res).catch(next);
});

export default router;

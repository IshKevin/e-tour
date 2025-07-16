import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: string };
    }
  }
}
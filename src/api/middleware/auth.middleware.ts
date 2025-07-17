import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt';
import { unauthorizedResponse, errorResponse } from '../../utils/response';
import { userService } from '../../services/user.service';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorizedResponse(res, 'Authorization token is required');
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    unauthorizedResponse(res, 'Invalid or expired token');
    return;
  }
};

// Middleware that requires email verification
export const authWithEmailVerificationMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorizedResponse(res, 'Authorization token is required');
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Get user from database to check email verification status
    const user = await userService.getUserById(decoded.id);
    if (!user) {
      unauthorizedResponse(res, 'User not found');
      return;
    }

    if (user.status !== 'active') {
      errorResponse(res, 403, 'Account is suspended or inactive');
      return;
    }

    if (!user.emailVerified) {
      errorResponse(res, 403, 'Email verification required. Please verify your email address to access this resource.');
      return;
    }

    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    unauthorizedResponse(res, 'Invalid or expired token');
    return;
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}
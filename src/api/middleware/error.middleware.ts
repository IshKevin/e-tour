import { NextFunction, Request, Response } from 'express';
import { errorResponse, validationErrorResponse } from '../../utils/response';
import { z } from 'zod';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error middleware caught:', err);

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return validationErrorResponse(res, 'Validation failed', err.errors);
  }

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired');
  }

  // Handle database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return errorResponse(res, 409, 'Resource already exists');
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return errorResponse(res, 400, 'Referenced resource does not exist');
  }

  // Default error response
  return errorResponse(res, 500, 'Internal server error');
};
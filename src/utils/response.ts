import { Response } from 'express';

export const successResponse = (
  res: Response,
  status: number,
  message: string,
  data: any
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (
  res: Response,
  status: number,
  message: string,
  error?: any
) => {
  return res.status(status).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString()
  });
};

export const notFoundResponse = (
  res: Response,
  message: string,
  error?: any
) => {
  return res.status(404).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString()
  });
};

export const validationErrorResponse = (
  res: Response,
  message: string,
  errors: any[]
) => {
  return res.status(422).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
) => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
) => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};
import { Response } from 'express';

export const successResponse = (
  res: Response,
  status: number,
  message: string,
  data: any
) => {
  return res.status(status).json({ message, data });
};
export const errorResponse = (
  res: Response,
  status: number,
  message: string,
  error?: any
) => {
  return res.status(status).json({ message, error });
};

export const notFoundResponse = (
  res: Response,
  message: string,
  error?: any
) => {
  return res.status(404).json({ message, error });
};

export const validationErrorResponse = (
  res: Response,
  message: string,
  errors: any[]
) => {
  return res.status(422).json({ message, errors });
};
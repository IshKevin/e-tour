import { Response } from 'express';

export const successResponse = (
  res: Response,
  status: number,
  message: string,
  data: any
) => {
  return res.status(status).json({ message, data });
};
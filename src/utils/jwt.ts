import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateToken = (user: { id: number; email: string; role: string }) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: '1d', 
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as { id: number; email: string; role: string };
};
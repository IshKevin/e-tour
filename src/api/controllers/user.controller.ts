import { Request, Response } from 'express';
import { userService } from '../../services/user.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';
import { generateToken } from '../../utils/jwt';


const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['tourist', 'admin', 'service_provider']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const userController = {
  async getAllUsers(req: Request, res: Response, next: unknown) {
    const users = await userService.getAllUsers();
    return successResponse(res, 200, 'Users fetched successfully', users);
  },
   
  async createUser(req: Request, res: Response, next: unknown) {
    const validatedData = createUserSchema.parse(req.body);
    const user = await userService.createUser(validatedData);
    return successResponse(res, 201, 'User created successfully', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  },

  async login(req: Request, res: Response, next: unknown) {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userService.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken({ id: Number(user.id), email: user.email, role: user.role });
    return successResponse(res, 200, 'Login successful', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  },
};
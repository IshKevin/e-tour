import { Request, Response } from 'express';
import { userService } from '../../services/user.service';
import { emailService } from '../../services/email.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';
import { generateToken } from '../../utils/jwt';


const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['client', 'agent', 'admin']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const verifyEmailSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z.string().min(6, 'Verification code must be 6 characters'),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
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
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    return successResponse(res, 200, 'Login successful', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      token,
    });
  },

  async logout(req: Request, res: Response): Promise<Response> {
    // JWT tokens are stateless, so logout is handled on the client side
    // In a production app, you might want to maintain a blacklist of tokens
    return successResponse(res, 200, 'Logout successful', null);
  },

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const { userId, code } = verifyEmailSchema.parse(req.body);
    const isVerified = await userService.verifyEmail(userId, code);

    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    return successResponse(res, 200, 'Email verified successfully', null);
  },

  async requestPasswordReset(req: Request, res: Response): Promise<Response> {
    const { email } = resetPasswordRequestSchema.parse(req.body);
    const user = await userService.getUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return successResponse(res, 200, 'If the email exists, a reset link has been sent', null);
    }

    const resetToken = await userService.createPasswordReset(user.id);
    await emailService.sendPasswordResetEmail(email, resetToken);

    return successResponse(res, 200, 'Password reset email sent', null);
  },

  async resetPassword(req: Request, res: Response): Promise<Response> {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const userId = await userService.verifyPasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    await userService.updatePassword(userId, newPassword);
    await userService.usePasswordResetToken(token);

    return successResponse(res, 200, 'Password reset successfully', null);
  },

  async getProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return successResponse(res, 200, 'Profile fetched successfully', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  },

  async updateProfile(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateData = updateProfileSchema.parse(req.body);
    const updatedUser = await userService.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return successResponse(res, 200, 'Profile updated successfully', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      emailVerified: updatedUser.emailVerified,
    });
  },
};
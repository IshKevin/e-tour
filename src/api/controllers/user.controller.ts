import { Request, Response } from 'express';
import { userService } from '../../services/user.service';
import { emailService } from '../../services/email.service';
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } from '../../utils/response';
import { z } from 'zod';
import { generateToken } from '../../utils/jwt';


const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['client', 'agent', 'admin']).optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  location: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  agreedToTerms: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const verifyEmailSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z.string().min(6, 'Verification code must be at least 6 characters').max(10, 'Verification code must be at most 10 characters'),
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
  companyName: z.string().optional(),
  location: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
});

const updateTermsSchema = z.object({
  agreedToTerms: z.boolean(),
});

const updateNotificationSchema = z.object({
  notificationsEnabled: z.boolean(),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email'),
});

export const userController = {
  async getAllUsers(req: Request, res: Response, next: unknown) {
    const users = await userService.getAllUsers();
    return successResponse(res, 200, 'Users fetched successfully', users);
  },
   
  async createUser(req: Request, res: Response, next: unknown) {
    try {
      const validatedData = createUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await userService.getUserByEmail(validatedData.email);
      if (existingUser) {
        return errorResponse(res, 409, 'User with this email already exists');
      }

      // Create the user
      const user = await userService.createUser(validatedData);

      // Generate email verification code
      const verificationCode = await userService.createEmailVerification(user.id);

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(user.email, verificationCode);

      if (!emailSent) {
        console.warn(`Failed to send verification email to ${user.email}`);
      }

      return successResponse(res, 201, 'User created successfully. Please check your email to verify your account.', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        emailSent: emailSent
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(res, 'Validation failed', error.errors);
      }
      console.error('Registration error:', error);
      return errorResponse(res, 500, 'Internal server error during registration');
    }
  },

  async login(req: Request, res: Response, next: unknown) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await userService.verifyPassword(email, password);
      if (!user) {
        return unauthorizedResponse(res, 'Invalid email or password');
      }

      // Check if user account is active
      if (user.status !== 'active') {
        return errorResponse(res, 403, 'Account is suspended or inactive');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return errorResponse(res, 403, 'Please verify your email address before logging in. Check your inbox for the verification email.');
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role });

      return successResponse(res, 200, 'Login successful', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          profileImage: user.profileImage,
          companyName: user.companyName,
          location: user.location,
          notificationsEnabled: user.notificationsEnabled
        },
        token,
        expiresIn: '1d'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(res, 'Validation failed', error.errors);
      }
      console.error('Login error:', error);
      return errorResponse(res, 500, 'Internal server error during login');
    }
  },

  async logout(req: Request, res: Response): Promise<Response> {
    // JWT tokens are stateless, so logout is handled on the client side
    // In a production app, you might want to maintain a blacklist of tokens
    return successResponse(res, 200, 'Logout successful', null);
  },

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      console.log('📧 Email verification request received:', req.body);
      const { userId, code } = verifyEmailSchema.parse(req.body);

      console.log(`🔍 Verifying email for userId: ${userId}, code: ${code}`);

      // Check if user exists
      const user = await userService.getUserById(userId);
      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return errorResponse(res, 404, 'User not found');
      }

      console.log(`👤 User found: ${user.email}, emailVerified: ${user.emailVerified}`);

      // Check if email is already verified
      if (user.emailVerified) {
        console.log(`✅ Email already verified for user: ${userId}`);
        return successResponse(res, 200, 'Email is already verified', {
          emailVerified: true
        });
      }

      const isVerified = await userService.verifyEmail(userId, code);

      if (!isVerified) {
        console.log(`❌ Verification failed for userId: ${userId}, code: ${code}`);
        return errorResponse(res, 400, 'Invalid or expired verification code. Please request a new verification email.');
      }

      console.log(`🎉 Email verification successful for userId: ${userId}`);
      return successResponse(res, 200, 'Email verified successfully! You can now log in to your account.', {
        emailVerified: true,
        userId: userId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Validation error in email verification:', error.errors);
        return validationErrorResponse(res, 'Validation failed', error.errors);
      }
      console.error('❌ Email verification error:', error);
      return errorResponse(res, 500, 'Internal server error during email verification');
    }
  },

  async resendVerificationEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = resendVerificationSchema.parse(req.body);

      const user = await userService.getUserByEmail(email);
      if (!user) {
        return errorResponse(res, 404, 'User not found with this email address');
      }

      if (user.emailVerified) {
        return successResponse(res, 200, 'Email is already verified', {
          emailVerified: true
        });
      }

      // Generate new verification code
      const verificationCode = await userService.createEmailVerification(user.id);

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(user.email, verificationCode);

      if (!emailSent) {
        return errorResponse(res, 500, 'Failed to send verification email. Please try again later.');
      }

      return successResponse(res, 200, 'Verification email sent successfully. Please check your inbox.', {
        emailSent: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(res, 'Validation failed', error.errors);
      }
      console.error('Resend verification error:', error);
      return errorResponse(res, 500, 'Internal server error while sending verification email');
    }
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
      companyName: updatedUser.companyName,
      location: updatedUser.location,
      notificationsEnabled: updatedUser.notificationsEnabled,
      agreedToTerms: updatedUser.agreedToTerms,
      termsAgreedAt: updatedUser.termsAgreedAt,
    });
  },

  async updateTermsAgreement(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agreedToTerms } = updateTermsSchema.parse(req.body);
    const updatedUser = await userService.updateTermsAgreement(userId, agreedToTerms);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return successResponse(res, 200, 'Terms agreement updated successfully', {
      id: updatedUser.id,
      agreedToTerms: updatedUser.agreedToTerms,
      termsAgreedAt: updatedUser.termsAgreedAt,
    });
  },

  async updateNotificationPreference(req: Request, res: Response): Promise<Response> {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationsEnabled } = updateNotificationSchema.parse(req.body);
    const updatedUser = await userService.updateNotificationPreference(userId, notificationsEnabled);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return successResponse(res, 200, 'Notification preference updated successfully', {
      id: updatedUser.id,
      notificationsEnabled: updatedUser.notificationsEnabled,
    });
  },
};
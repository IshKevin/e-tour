import { db } from '../db';
import { users, User, NewUser } from '../db/schema/user.schema';
import { emailVerifications, NewEmailVerification } from '../db/schema/emailVerifications.schema';
import { passwordResets, NewPasswordReset } from '../db/schema/passwordResets.schema';
import bcrypt from 'bcrypt';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

export const userService = {
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.status, 'active'));
  },

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: 'client' | 'agent' | 'admin';
    phone?: string;
    companyName?: string;
    location?: string;
    notificationsEnabled?: boolean;
    agreedToTerms?: boolean;
  }): Promise<User> {
    const { password, agreedToTerms, ...rest } = data;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser: NewUser = {
      ...rest,
      passwordHash,
      role: data.role ?? 'client',
      agreedToTerms: agreedToTerms ?? false,
      termsAgreedAt: agreedToTerms ? new Date() : undefined,
      notificationsEnabled: data.notificationsEnabled ?? true,
    };
    const [user] = await db.insert(users).values(newUser).returning();
    return user;
  },

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  },

  async updateTermsAgreement(id: string, agreed: boolean): Promise<User | null> {
    const updateData: Partial<User> = {
      agreedToTerms: agreed,
      termsAgreedAt: agreed ? new Date() : null,
      updatedAt: new Date(),
    };

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || null;
  },

  async updateNotificationPreference(id: string, enabled: boolean): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        notificationsEnabled: enabled,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.status !== 'active') return null;
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  },

  async updatePassword(id: string, newPassword: string): Promise<User | null> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const [updatedUser] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || null;
  },

  async suspendUser(id: string): Promise<User | null> {
    const [suspendedUser] = await db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return suspendedUser || null;
  },

  // Email verification methods
  async createEmailVerification(userId: string): Promise<string> {
    console.log(`📧 Creating email verification for userId: ${userId}`);

    // Invalidate any existing unverified codes for this user
    const invalidatedResult = await db
      .update(emailVerifications)
      .set({ verified: true, verifiedAt: new Date() })
      .where(
        and(
          eq(emailVerifications.userId, userId),
          eq(emailVerifications.verified, false)
        )
      )
      .returning();

    if (invalidatedResult.length > 0) {
      console.log(`🔄 Invalidated ${invalidatedResult.length} existing verification codes for user ${userId}`);
    }

    // Generate a proper 6-character alphanumeric code
    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log(`🔑 Generated verification code: ${verificationCode}, expires at: ${expiresAt}`);

    const verificationData: NewEmailVerification = {
      userId,
      verificationCode,
      expiresAt,
    };

    const [insertedVerification] = await db.insert(emailVerifications).values(verificationData).returning();
    console.log(`✅ Verification record created with ID: ${insertedVerification.id}`);

    return verificationCode;
  },

  // Helper method to generate a proper 6-character verification code
  generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    console.log(`🔍 Verifying email for userId: ${userId}, code: ${code}`);

    // First, let's check all verification records for this user for debugging
    const allVerifications = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, userId));

    console.log(`📋 All verification records for user ${userId}:`, allVerifications.map(v => ({
      id: v.id,
      code: v.verificationCode,
      verified: v.verified,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt
    })));

    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, userId),
          eq(emailVerifications.verificationCode, code),
          eq(emailVerifications.verified, false),
          gt(emailVerifications.expiresAt, new Date())
        )
      );

    if (!verification) {
      console.log(`❌ No valid verification found for userId: ${userId}, code: ${code}`);
      return false;
    }

    console.log(`✅ Valid verification found:`, {
      id: verification.id,
      code: verification.verificationCode,
      expiresAt: verification.expiresAt
    });

    // Mark verification as used
    await db
      .update(emailVerifications)
      .set({ verified: true, verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    // Mark user email as verified
    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    console.log(`🎉 Email verification successful for userId: ${userId}`);
    return true;
  },

  // Password reset methods
  async createPasswordReset(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const resetData: NewPasswordReset = {
      userId,
      token,
      expiresAt,
    };

    await db.insert(passwordResets).values(resetData);
    return token;
  },

  async verifyPasswordResetToken(token: string): Promise<string | null> {
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.token, token),
          eq(passwordResets.used, false),
          gt(passwordResets.expiresAt, new Date())
        )
      );

    return reset ? reset.userId : null;
  },

  async usePasswordResetToken(token: string): Promise<boolean> {
    const [reset] = await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.token, token))
      .returning();

    return !!reset;
  },
};
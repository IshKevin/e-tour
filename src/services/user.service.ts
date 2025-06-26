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

  async getUserById(id: number): Promise<User | null> {
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
  }): Promise<User> {
    const { password, ...rest } = data;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser: NewUser = {
      ...rest,
      passwordHash,
      role: data.role ?? 'client',
    };
    const [user] = await db.insert(users).values(newUser).returning();
    return user;
  },

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
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

  async updatePassword(id: number, newPassword: string): Promise<User | null> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const [updatedUser] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || null;
  },

  async suspendUser(id: number): Promise<User | null> {
    const [suspendedUser] = await db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return suspendedUser || null;
  },

  // Email verification methods
  async createEmailVerification(userId: number): Promise<string> {
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const verificationData: NewEmailVerification = {
      userId,
      verificationCode,
      expiresAt,
    };

    await db.insert(emailVerifications).values(verificationData);
    return verificationCode;
  },

  async verifyEmail(userId: number, code: string): Promise<boolean> {
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

    if (!verification) return false;

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

    return true;
  },

  // Password reset methods
  async createPasswordReset(userId: number): Promise<string> {
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

  async verifyPasswordResetToken(token: string): Promise<number | null> {
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
import { db } from '../db';
import { users, User, NewUser } from '../db/schema/user.schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

export const userService = {
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
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
    role?: 'tourist' | 'admin' | 'service_provider';
  }): Promise<User> {
    const { password, ...rest } = data;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser: NewUser = {
      ...rest,
      password_hash,
      role: data.role || 'tourist',
    };
    const [user] = await db.insert(users).values(newUser).returning();
    return user;
  },

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...data, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  },
};
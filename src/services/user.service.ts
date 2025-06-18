import { db } from '../db';
import { users } from '../db/schema/user.schema';
import { eq } from 'drizzle-orm';

export const userService = {
  async getAllUsers() {
    return db.select().from(users);
  },
  async createUser(data: { name: string; email: string }) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
  async getUserById(id: string) {
    return db.select().from(users).where(eq(users.id, id)).limit(1);
  },
  async updateUser(id: string, data: { name?: string; email?: string }) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  },
  async deleteUser(id: string) {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    return user;
  }
};
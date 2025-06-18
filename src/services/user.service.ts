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
};
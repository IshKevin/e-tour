import { pgTable, serial, integer, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  used: boolean('used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('password_resets_user_idx').on(table.userId),
  tokenIdx: index('password_resets_token_idx').on(table.token)
}));

export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
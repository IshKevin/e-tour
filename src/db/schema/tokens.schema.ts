import { pgTable, serial, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  balance: integer('balance').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('tokens_user_idx').on(table.userId)
}));

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
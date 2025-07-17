import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const messageStatusEnum = pgEnum('message_status', ['new', 'in_progress', 'resolved', 'closed']);

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: messageStatusEnum('status').default('new').notNull(),
  assignedAdminId: uuid('assigned_admin_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('contact_messages_user_idx').on(table.userId),
  statusIdx: index('contact_messages_status_idx').on(table.status),
  adminIdx: index('contact_messages_admin_idx').on(table.assignedAdminId)
}));

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
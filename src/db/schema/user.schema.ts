import { pgTable, serial, varchar, text, timestamp, pgEnum, boolean, index } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['client', 'agent', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('client').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  profileImage: text('profile_image'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.status)
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
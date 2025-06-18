import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50, enum: ['tourist', 'admin', 'service_provider'] })
    .notNull()
    .default('tourist'),
  is_logged_in: boolean('is_logged_in').notNull().default(false),
  tourist_features_access: boolean('tourist_features_access').notNull().default(true),
  admin_access: boolean('admin_access').notNull().default(false),
  service_provider_listings: jsonb('service_provider_listings').notNull().default({}),
  created_at: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
import { pgTable, serial, varchar, json, text, timestamp } from 'drizzle-orm/pg-core';

export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 255 }).notNull().unique(),
  configValue: json('config_value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
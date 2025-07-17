import { pgTable, uuid, varchar, json, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: varchar('record_id', { length: 36 }),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  tableIdx: index('audit_logs_table_idx').on(table.tableName),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  dateIdx: index('audit_logs_date_idx').on(table.createdAt)
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
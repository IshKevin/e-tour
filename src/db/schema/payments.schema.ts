import { pgTable, serial, integer, decimal, varchar, timestamp, pgEnum, json, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const paymentStatusEnum = pgEnum('payment_status_enum', ['pending', 'completed', 'failed', 'refunded']);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  referenceType: varchar('reference_type', { length: 100 }).notNull(), // 'booking', 'tokens'
  referenceId: integer('reference_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  gatewayReference: varchar('gateway_reference', { length: 255 }),
  gatewayResponse: json('gateway_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('payments_user_idx').on(table.userId),
  referenceIdx: index('payments_reference_idx').on(table.referenceType, table.referenceId),
  statusIdx: index('payments_status_idx').on(table.status)
}));

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

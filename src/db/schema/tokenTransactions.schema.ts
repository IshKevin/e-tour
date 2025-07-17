import { pgTable, uuid, integer, decimal, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'usage', 'refund', 'admin_grant']);

export const tokenTransactions = pgTable('token_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  referenceId: varchar('reference_id', { length: 255 }),
  referenceType: varchar('reference_type', { length: 100 }),
  paymentReference: varchar('payment_reference', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('token_transactions_user_idx').on(table.userId),
  typeIdx: index('token_transactions_type_idx').on(table.type),
  dateIdx: index('token_transactions_date_idx').on(table.createdAt)
}));

export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type NewTokenTransaction = typeof tokenTransactions.$inferInsert;
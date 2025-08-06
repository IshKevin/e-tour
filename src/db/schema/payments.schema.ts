import { pgTable, uuid, decimal, varchar, timestamp, pgEnum, json, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { bookings } from './booking.schema';

export const paymentMethodEnum = pgEnum('payment_method', ['card', 'mobile_money', 'bank_transfer']);
export const paymentStatusEnum = pgEnum('payment_status_enum', ['pending', 'completed', 'failed', 'refunded']);
export const refundStatusEnum = pgEnum('refund_status', ['pending', 'approved', 'rejected', 'completed']);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id),
  referenceType: varchar('reference_type', { length: 100 }).notNull(), // 'booking', 'tokens'
  referenceId: varchar('reference_id', { length: 36 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').default('card').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  paymentReference: varchar('payment_reference', { length: 100 }).notNull(),
  gatewayReference: varchar('gateway_reference', { length: 255 }),
  gatewayResponse: json('gateway_response'),
  paymentDetails: json('payment_details'), // Store payment method specific details
  failureReason: varchar('failure_reason', { length: 500 }),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('payments_user_idx').on(table.userId),
  bookingIdx: index('payments_booking_idx').on(table.bookingId),
  referenceIdx: index('payments_reference_idx').on(table.referenceType, table.referenceId),
  statusIdx: index('payments_status_idx').on(table.status),
  methodIdx: index('payments_method_idx').on(table.paymentMethod)
}));

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 500 }).notNull(),
  status: refundStatusEnum('status').default('pending').notNull(),
  refundMethod: paymentMethodEnum('refund_method').default('card').notNull(),
  refundReference: varchar('refund_reference', { length: 100 }),
  adminNotes: varchar('admin_notes', { length: 1000 }),
  processedBy: uuid('processed_by').references(() => users.id),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at')
}, (table) => ({
  paymentIdx: index('refunds_payment_idx').on(table.paymentId),
  userIdx: index('refunds_user_idx').on(table.userId),
  statusIdx: index('refunds_status_idx').on(table.status)
}));

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF').notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  invoiceData: json('invoice_data').notNull(), // Store complete invoice details
  format: varchar('format', { length: 10 }).default('pdf').notNull(),
  fileUrl: varchar('file_url', { length: 500 }),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at')
}, (table) => ({
  paymentIdx: index('invoices_payment_idx').on(table.paymentId),
  userIdx: index('invoices_user_idx').on(table.userId),
  numberIdx: index('invoices_number_idx').on(table.invoiceNumber)
}));

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

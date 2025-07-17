import { pgTable, uuid, integer, decimal, timestamp, pgEnum, varchar, text, date, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';

export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);
export const bookingPaymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  seatsBooked: integer('seats_booked').notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum('status').default('pending').notNull(),
  paymentStatus: bookingPaymentStatusEnum('payment_status').default('pending').notNull(),
  paymentReference: varchar('payment_reference', { length: 255 }),
  bookingDate: timestamp('booking_date').defaultNow().notNull(),
  cancellationDate: timestamp('cancellation_date'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clientIdx: index('bookings_client_idx').on(table.clientId),
  tripIdx: index('bookings_trip_idx').on(table.tripId),
  statusIdx: index('bookings_status_idx').on(table.status),
  dateIdx: index('bookings_date_idx').on(table.bookingDate)
}));

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
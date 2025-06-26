import { pgTable, serial, integer, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';
import { bookings } from './booking.schema';

export const reviewStatusEnum = pgEnum('review_status', ['active', 'hidden', 'flagged']);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  status: reviewStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clientIdx: index('reviews_client_idx').on(table.clientId),
  tripIdx: index('reviews_trip_idx').on(table.tripId),
  ratingIdx: index('reviews_rating_idx').on(table.rating),
  statusIdx: index('reviews_status_idx').on(table.status)
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
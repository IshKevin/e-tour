import { pgTable, uuid, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';

export const wishlist = pgTable('wishlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  notes: text('notes'), // Optional user notes about why they saved this trip
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('wishlist_user_idx').on(table.userId),
  tripIdx: index('wishlist_trip_idx').on(table.tripId),
  userTripIdx: index('wishlist_user_trip_idx').on(table.userId, table.tripId), // Unique constraint
  createdAtIdx: index('wishlist_created_at_idx').on(table.createdAt)
}));

export type Wishlist = typeof wishlist.$inferSelect;
export type NewWishlist = typeof wishlist.$inferInsert;

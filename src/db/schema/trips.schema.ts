import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, decimal, date, json, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const tripStatusEnum = pgEnum('trip_status', ['active', 'inactive', 'deleted']);

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  itinerary: text('itinerary'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  maxSeats: integer('max_seats').notNull(),
  availableSeats: integer('available_seats').notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: tripStatusEnum('status').default('active').notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').default(0),
  images: json('images').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  agentIdx: index('trips_agent_idx').on(table.agentId),
  locationIdx: index('trips_location_idx').on(table.location),
  statusIdx: index('trips_status_idx').on(table.status),
  dateIdx: index('trips_date_idx').on(table.startDate),
  priceIdx: index('trips_price_idx').on(table.price)
}));

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
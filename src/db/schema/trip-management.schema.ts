import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, decimal, date, json, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';

export const availabilityStatusEnum = pgEnum('availability_status', ['available', 'limited', 'full', 'blocked']);

export const tripAvailability = pgTable('trip_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  date: date('date').notNull(),
  availableSeats: integer('available_seats').notNull(),
  priceAdjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).default('0').notNull(),
  status: availabilityStatusEnum('status').default('available').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tripIdx: index('trip_availability_trip_idx').on(table.tripId),
  dateIdx: index('trip_availability_date_idx').on(table.date),
  tripDateIdx: index('trip_availability_trip_date_idx').on(table.tripId, table.date), // Unique constraint
  statusIdx: index('trip_availability_status_idx').on(table.status)
}));

export const tripCategories = pgTable('trip_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }), // Emoji or icon identifier
  color: varchar('color', { length: 7 }), // Hex color code
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('trip_categories_name_idx').on(table.name),
  activeIdx: index('trip_categories_active_idx').on(table.isActive),
  sortIdx: index('trip_categories_sort_idx').on(table.sortOrder)
}));

export const tripCategoryAssignments = pgTable('trip_category_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  categoryId: uuid('category_id').references(() => tripCategories.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tripIdx: index('trip_category_assignments_trip_idx').on(table.tripId),
  categoryIdx: index('trip_category_assignments_category_idx').on(table.categoryId),
  tripCategoryIdx: index('trip_category_assignments_trip_category_idx').on(table.tripId, table.categoryId) // Unique constraint
}));

export const featuredTrips = pgTable('featured_trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  priority: integer('priority').default(1).notNull(), // 1 = highest priority
  featuredUntil: timestamp('featured_until'),
  reason: varchar('reason', { length: 255 }), // Why this trip is featured
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tripIdx: index('featured_trips_trip_idx').on(table.tripId),
  priorityIdx: index('featured_trips_priority_idx').on(table.priority),
  featuredUntilIdx: index('featured_trips_featured_until_idx').on(table.featuredUntil),
  createdByIdx: index('featured_trips_created_by_idx').on(table.createdBy)
}));

export const tripTags = pgTable('trip_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  color: varchar('color', { length: 7 }), // Hex color code
  isActive: boolean('is_active').default(true).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('trip_tags_name_idx').on(table.name),
  activeIdx: index('trip_tags_active_idx').on(table.isActive),
  usageIdx: index('trip_tags_usage_idx').on(table.usageCount)
}));

export const tripTagAssignments = pgTable('trip_tag_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  tagId: uuid('tag_id').references(() => tripTags.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tripIdx: index('trip_tag_assignments_trip_idx').on(table.tripId),
  tagIdx: index('trip_tag_assignments_tag_idx').on(table.tagId),
  tripTagIdx: index('trip_tag_assignments_trip_tag_idx').on(table.tripId, table.tagId) // Unique constraint
}));

export type TripAvailability = typeof tripAvailability.$inferSelect;
export type NewTripAvailability = typeof tripAvailability.$inferInsert;
export type TripCategory = typeof tripCategories.$inferSelect;
export type NewTripCategory = typeof tripCategories.$inferInsert;
export type TripCategoryAssignment = typeof tripCategoryAssignments.$inferSelect;
export type NewTripCategoryAssignment = typeof tripCategoryAssignments.$inferInsert;
export type FeaturedTrip = typeof featuredTrips.$inferSelect;
export type NewFeaturedTrip = typeof featuredTrips.$inferInsert;
export type TripTag = typeof tripTags.$inferSelect;
export type NewTripTag = typeof tripTags.$inferInsert;
export type TripTagAssignment = typeof tripTagAssignments.$inferSelect;
export type NewTripTagAssignment = typeof tripTagAssignments.$inferInsert;

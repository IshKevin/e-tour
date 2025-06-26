import { pgTable, serial, integer, varchar, text, timestamp, pgEnum, date, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { customTripRequests } from './customTripRequests.schema';

export const jobStatusEnum = pgEnum('job_status', ['open', 'closed', 'filled']);

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  customTripId: integer('custom_trip_id').references(() => customTripRequests.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  tokenCost: integer('token_cost').notNull(),
  category: varchar('category', { length: 100 }),
  location: varchar('location', { length: 255 }),
  status: jobStatusEnum('status').default('open').notNull(),
  applicationDeadline: date('application_deadline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  clientIdx: index('jobs_client_idx').on(table.clientId),
  statusIdx: index('jobs_status_idx').on(table.status),
  categoryIdx: index('jobs_category_idx').on(table.category),
  locationIdx: index('jobs_location_idx').on(table.location)
}));

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
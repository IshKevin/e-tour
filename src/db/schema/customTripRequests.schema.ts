import { pgTable, serial, integer, varchar, decimal, text, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const customTripStatusEnum = pgEnum('custom_trip_status', ['pending', 'assigned', 'responded', 'completed', 'cancelled']);

export const customTripRequests = pgTable('custom_trip_requests', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id),
  destination: varchar('destination', { length: 255 }).notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
  interests: text('interests'),
  preferredStartDate: date('preferred_start_date'),
  preferredEndDate: date('preferred_end_date'),
  groupSize: integer('group_size').default(1),
  status: customTripStatusEnum('status').default('pending').notNull(),
  clientNotes: text('client_notes'),
  agentResponse: text('agent_response'),
  quotedPrice: decimal('quoted_price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clientIdx: index('custom_trips_client_idx').on(table.clientId),
  agentIdx: index('custom_trips_agent_idx').on(table.assignedAgentId),
  statusIdx: index('custom_trips_status_idx').on(table.status),
  destinationIdx: index('custom_trips_destination_idx').on(table.destination)
}));

export type CustomTripRequest = typeof customTripRequests.$inferSelect;
export type NewCustomTripRequest = typeof customTripRequests.$inferInsert;
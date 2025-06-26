import { pgTable, serial, integer, varchar, decimal, json, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const activityRecommendationLogs = pgTable('activity_recommendation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  destination: varchar('destination', { length: 255 }).notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  interests: json('interests').$type<string[]>(),
  recommendations: json('recommendations'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('activity_logs_user_idx').on(table.userId),
  destinationIdx: index('activity_logs_destination_idx').on(table.destination),
  dateIdx: index('activity_logs_date_idx').on(table.createdAt)
}));

export type ActivityRecommendationLog = typeof activityRecommendationLogs.$inferSelect;
export type NewActivityRecommendationLog = typeof activityRecommendationLogs.$inferInsert;
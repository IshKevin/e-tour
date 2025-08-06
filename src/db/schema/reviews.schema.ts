import { pgTable, uuid, integer, text, timestamp, pgEnum, index, boolean, json, decimal, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';
import { bookings } from './booking.schema';

export const reviewStatusEnum = pgEnum('review_status', ['active', 'hidden', 'flagged', 'pending', 'approved', 'rejected']);
export const reviewTypeEnum = pgEnum('review_type', ['trip', 'agent']);

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id).notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  status: reviewStatusEnum('status').default('active').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  reportCount: integer('report_count').default(0).notNull(),
  moderatorNotes: text('moderator_notes'),
  moderatedBy: uuid('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clientIdx: index('reviews_client_idx').on(table.clientId),
  tripIdx: index('reviews_trip_idx').on(table.tripId),
  ratingIdx: index('reviews_rating_idx').on(table.rating),
  statusIdx: index('reviews_status_idx').on(table.status)
}));

export const agentReviews = pgTable('agent_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  agentId: uuid('agent_id').references(() => users.id).notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id),
  rating: integer('rating').notNull(), // 1-5 scale
  comment: text('comment'),
  categories: json('categories').$type<{
    communication: number;
    professionalism: number;
    knowledge: number;
    responsiveness: number;
  }>(),
  status: reviewStatusEnum('status').default('pending').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  reportCount: integer('report_count').default(0).notNull(),
  moderatorNotes: text('moderator_notes'),
  moderatedBy: uuid('moderated_by').references(() => users.id),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('agent_reviews_user_idx').on(table.userId),
  agentIdx: index('agent_reviews_agent_idx').on(table.agentId),
  statusIdx: index('agent_reviews_status_idx').on(table.status),
  ratingIdx: index('agent_reviews_rating_idx').on(table.rating)
}));

export const reviewReports = pgTable('review_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').references(() => reviews.id).notNull(),
  reporterId: uuid('reporter_id').references(() => users.id).notNull(),
  reason: varchar('reason', { length: 100 }).notNull(), // 'spam', 'inappropriate_content', 'fake_review'
  description: text('description'),
  status: pgEnum('report_status', ['pending', 'reviewed', 'resolved', 'dismissed'])('status').default('pending').notNull(),
  adminNotes: text('admin_notes'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  reviewIdx: index('review_reports_review_idx').on(table.reviewId),
  reporterIdx: index('review_reports_reporter_idx').on(table.reporterId),
  statusIdx: index('review_reports_status_idx').on(table.status)
}));

export const agentRatings = pgTable('agent_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => users.id).notNull().unique(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  communicationRating: decimal('communication_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  professionalismRating: decimal('professionalism_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  knowledgeRating: decimal('knowledge_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  responsivenessRating: decimal('responsiveness_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  fiveStarCount: integer('five_star_count').default(0).notNull(),
  fourStarCount: integer('four_star_count').default(0).notNull(),
  threeStarCount: integer('three_star_count').default(0).notNull(),
  twoStarCount: integer('two_star_count').default(0).notNull(),
  oneStarCount: integer('one_star_count').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  agentIdx: index('agent_ratings_agent_idx').on(table.agentId),
  ratingIdx: index('agent_ratings_rating_idx').on(table.averageRating)
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type AgentReview = typeof agentReviews.$inferSelect;
export type NewAgentReview = typeof agentReviews.$inferInsert;
export type ReviewReport = typeof reviewReports.$inferSelect;
export type NewReviewReport = typeof reviewReports.$inferInsert;
export type AgentRating = typeof agentRatings.$inferSelect;
export type NewAgentRating = typeof agentRatings.$inferInsert;
import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, decimal, boolean, json, index, date } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed_amount']);
export const promoStatusEnum = pgEnum('promo_status', ['active', 'inactive', 'expired', 'used_up']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);

export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: decimal('minimum_order_amount', { precision: 10, scale: 2 }).default('0'),
  maximumDiscountAmount: decimal('maximum_discount_amount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'), // null = unlimited
  usedCount: integer('used_count').default(0).notNull(),
  userUsageLimit: integer('user_usage_limit').default(1).notNull(), // How many times one user can use this code
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  status: promoStatusEnum('status').default('active').notNull(),
  isFirstTimeUserOnly: boolean('is_first_time_user_only').default(false).notNull(),
  applicableToTrips: json('applicable_to_trips').$type<string[]>(), // Trip IDs this code applies to
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  codeIdx: index('discount_codes_code_idx').on(table.code),
  statusIdx: index('discount_codes_status_idx').on(table.status),
  validFromIdx: index('discount_codes_valid_from_idx').on(table.validFrom),
  validUntilIdx: index('discount_codes_valid_until_idx').on(table.validUntil),
  createdByIdx: index('discount_codes_created_by_idx').on(table.createdBy)
}));

export const discountCodeUsage = pgTable('discount_code_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  discountCodeId: uuid('discount_code_id').references(() => discountCodes.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id),
  originalAmount: decimal('original_amount', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull()
}, (table) => ({
  discountCodeIdx: index('discount_code_usage_code_idx').on(table.discountCodeId),
  userIdx: index('discount_code_usage_user_idx').on(table.userId),
  tripIdx: index('discount_code_usage_trip_idx').on(table.tripId),
  usedAtIdx: index('discount_code_usage_used_at_idx').on(table.usedAt)
}));

export const promotionalCampaigns = pgTable('promotional_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  campaignType: varchar('campaign_type', { length: 50 }).notNull(), // 'seasonal', 'flash_sale', 'loyalty', etc.
  targetAudience: json('target_audience').$type<{
    userTypes?: string[];
    locations?: string[];
    ageGroups?: string[];
    previousBookings?: boolean;
  }>(),
  discountCodeIds: json('discount_code_ids').$type<string[]>(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  actualSpent: decimal('actual_spent', { precision: 10, scale: 2 }).default('0'),
  targetReach: integer('target_reach'),
  actualReach: integer('actual_reach').default(0),
  status: campaignStatusEnum('status').default('draft').notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('promotional_campaigns_name_idx').on(table.name),
  statusIdx: index('promotional_campaigns_status_idx').on(table.status),
  startDateIdx: index('promotional_campaigns_start_date_idx').on(table.startDate),
  endDateIdx: index('promotional_campaigns_end_date_idx').on(table.endDate),
  createdByIdx: index('promotional_campaigns_created_by_idx').on(table.createdBy)
}));

export const campaignMetrics = pgTable('campaign_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => promotionalCampaigns.id).notNull(),
  date: date('date').notNull(),
  impressions: integer('impressions').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  conversions: integer('conversions').default(0).notNull(),
  revenue: decimal('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  campaignIdx: index('campaign_metrics_campaign_idx').on(table.campaignId),
  dateIdx: index('campaign_metrics_date_idx').on(table.date),
  campaignDateIdx: index('campaign_metrics_campaign_date_idx').on(table.campaignId, table.date)
}));

export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
export type DiscountCodeUsage = typeof discountCodeUsage.$inferSelect;
export type NewDiscountCodeUsage = typeof discountCodeUsage.$inferInsert;
export type PromotionalCampaign = typeof promotionalCampaigns.$inferSelect;
export type NewPromotionalCampaign = typeof promotionalCampaigns.$inferInsert;
export type CampaignMetrics = typeof campaignMetrics.$inferSelect;
export type NewCampaignMetrics = typeof campaignMetrics.$inferInsert;

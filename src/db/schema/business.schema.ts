
import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.schema';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categories: varchar('categories', { length: 100 }).array(), 
  specializations: varchar('specializations', { length: 100 }).array(),
  business_hours: jsonb('business_hours').notNull().default({}),
  seasonal_schedules: jsonb('seasonal_schedules').default({}),
  contact_info: jsonb('contact_info').notNull().default({}),
  social_media_links: jsonb('social_media_links').default({}),
  location: jsonb('location').notNull().default({}),
  service_areas: varchar('service_areas', { length: 255 }).array(),
  photos: text('photos').array(),
  videos: text('videos').array(),
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
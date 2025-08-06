import { pgTable, uuid, varchar, text, timestamp, pgEnum, boolean, json, index, integer } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);
export const contentTypeEnum = pgEnum('content_type', ['blog', 'faq', 'terms', 'privacy', 'about', 'help']);

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  featuredImage: varchar('featured_image', { length: 500 }),
  tags: json('tags').$type<string[]>(),
  categories: json('categories').$type<string[]>(),
  status: contentStatusEnum('status').default('draft').notNull(),
  publishedAt: timestamp('published_at'),
  viewCount: integer('view_count').default(0).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  seoKeywords: json('seo_keywords').$type<string[]>(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  slugIdx: index('blog_posts_slug_idx').on(table.slug),
  statusIdx: index('blog_posts_status_idx').on(table.status),
  publishedAtIdx: index('blog_posts_published_at_idx').on(table.publishedAt),
  authorIdx: index('blog_posts_author_idx').on(table.authorId),
  viewCountIdx: index('blog_posts_view_count_idx').on(table.viewCount)
}));

export const faqItems = pgTable('faq_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  notHelpfulCount: integer('not_helpful_count').default(0).notNull(),
  tags: json('tags').$type<string[]>(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryIdx: index('faq_items_category_idx').on(table.category),
  publishedIdx: index('faq_items_published_idx').on(table.isPublished),
  sortOrderIdx: index('faq_items_sort_order_idx').on(table.sortOrder),
  createdByIdx: index('faq_items_created_by_idx').on(table.createdBy)
}));

export const legalDocuments = pgTable('legal_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  documentType: contentTypeEnum('document_type').notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  effectiveDate: timestamp('effective_date').notNull(),
  lastReviewDate: timestamp('last_review_date'),
  nextReviewDate: timestamp('next_review_date'),
  isActive: boolean('is_active').default(true).notNull(),
  requiresAcceptance: boolean('requires_acceptance').default(false).notNull(),
  acceptanceCount: integer('acceptance_count').default(0).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  slugIdx: index('legal_documents_slug_idx').on(table.slug),
  typeIdx: index('legal_documents_type_idx').on(table.documentType),
  activeIdx: index('legal_documents_active_idx').on(table.isActive),
  effectiveDateIdx: index('legal_documents_effective_date_idx').on(table.effectiveDate),
  createdByIdx: index('legal_documents_created_by_idx').on(table.createdBy)
}));

export const contentCategories: any = pgTable('content_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  postCount: integer('post_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('content_categories_name_idx').on(table.name),
  slugIdx: index('content_categories_slug_idx').on(table.slug),
  parentIdx: index('content_categories_parent_idx').on(table.parentId),
  activeIdx: index('content_categories_active_idx').on(table.isActive),
  sortOrderIdx: index('content_categories_sort_order_idx').on(table.sortOrder)
}));

export const blogComments: any = pgTable('blog_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => blogPosts.id).notNull(),
  parentId: uuid('parent_id'),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  authorEmail: varchar('author_email', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  postIdx: index('blog_comments_post_idx').on(table.postId),
  parentIdx: index('blog_comments_parent_idx').on(table.parentId),
  authorIdx: index('blog_comments_author_idx').on(table.authorId),
  approvedIdx: index('blog_comments_approved_idx').on(table.isApproved),
  createdAtIdx: index('blog_comments_created_at_idx').on(table.createdAt)
}));

export const contentViews = pgTable('content_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'blog', 'faq', 'legal'
  userId: uuid('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  referrer: varchar('referrer', { length: 500 }),
  viewedAt: timestamp('viewed_at').defaultNow().notNull()
}, (table) => ({
  contentIdx: index('content_views_content_idx').on(table.contentId, table.contentType),
  userIdx: index('content_views_user_idx').on(table.userId),
  viewedAtIdx: index('content_views_viewed_at_idx').on(table.viewedAt)
}));

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type FaqItem = typeof faqItems.$inferSelect;
export type NewFaqItem = typeof faqItems.$inferInsert;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type NewLegalDocument = typeof legalDocuments.$inferInsert;
export type ContentCategory = typeof contentCategories.$inferSelect;
export type NewContentCategory = typeof contentCategories.$inferInsert;
export type BlogComment = typeof blogComments.$inferSelect;
export type NewBlogComment = typeof blogComments.$inferInsert;
export type ContentView = typeof contentViews.$inferSelect;
export type NewContentView = typeof contentViews.$inferInsert;

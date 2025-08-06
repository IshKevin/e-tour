CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('blog', 'faq', 'terms', 'privacy', 'about', 'help');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'mobile_money', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."promo_status" AS ENUM('active', 'inactive', 'expired', 'used_up');--> statement-breakpoint
CREATE TYPE "public"."review_type" AS ENUM('trip', 'agent');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'limited', 'full', 'blocked');--> statement-breakpoint
ALTER TYPE "public"."review_status" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."review_status" ADD VALUE 'approved';--> statement-breakpoint
ALTER TYPE "public"."review_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid NOT NULL,
	"author_name" varchar(255) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"featured_image" varchar(500),
	"tags" json,
	"categories" json,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"seo_keywords" json,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "content_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"referrer" varchar(500),
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"not_helpful_count" integer DEFAULT 0 NOT NULL,
	"tags" json,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"document_type" "content_type" NOT NULL,
	"version" varchar(20) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"last_review_date" timestamp,
	"next_review_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_acceptance" boolean DEFAULT false NOT NULL,
	"acceptance_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "legal_documents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"trip_id" uuid,
	"subject" varchar(255) NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"client_unread_count" integer DEFAULT 0 NOT NULL,
	"agent_unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"attachments" json,
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	"is_system_message" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RWF' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"invoice_data" json NOT NULL,
	"format" varchar(10) DEFAULT 'pdf' NOT NULL,
	"file_url" varchar(500),
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"refund_method" "payment_method" DEFAULT 'card' NOT NULL,
	"refund_reference" varchar(100),
	"admin_notes" varchar(1000),
	"processed_by" uuid,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_code_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"original_amount" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"minimum_order_amount" numeric(10, 2) DEFAULT '0',
	"maximum_discount_amount" numeric(10, 2),
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"user_usage_limit" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"status" "promo_status" DEFAULT 'active' NOT NULL,
	"is_first_time_user_only" boolean DEFAULT false NOT NULL,
	"applicable_to_trips" json,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promotional_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"campaign_type" varchar(50) NOT NULL,
	"target_audience" json,
	"discount_code_ids" json,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"budget" numeric(10, 2),
	"actual_spent" numeric(10, 2) DEFAULT '0',
	"target_reach" integer,
	"actual_reach" integer DEFAULT 0,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"communication_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"professionalism_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"knowledge_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"responsiveness_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"five_star_count" integer DEFAULT 0 NOT NULL,
	"four_star_count" integer DEFAULT 0 NOT NULL,
	"three_star_count" integer DEFAULT 0 NOT NULL,
	"two_star_count" integer DEFAULT 0 NOT NULL,
	"one_star_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_ratings_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"booking_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"categories" json,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"moderator_notes" text,
	"moderated_by" uuid,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"featured_until" timestamp,
	"reason" varchar(255),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"date" date NOT NULL,
	"available_seats" integer NOT NULL,
	"price_adjustment" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "availability_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trip_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "trip_category_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trip_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DEFAULT 'new'::text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'::text;--> statement-breakpoint
DROP TYPE "public"."message_status";--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read', 'archived');--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."message_status";--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "status" SET DATA TYPE "public"."message_status" USING "status"::"public"."message_status";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'::"public"."message_status";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE "public"."message_status" USING "status"::"public"."message_status";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "booking_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method" "payment_method" DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_reference" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_details" json;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "helpful_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "report_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderator_notes" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_promotional_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."promotional_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_usage" ADD CONSTRAINT "discount_code_usage_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_usage" ADD CONSTRAINT "discount_code_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_code_usage" ADD CONSTRAINT "discount_code_usage_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_campaigns" ADD CONSTRAINT "promotional_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_ratings" ADD CONSTRAINT "agent_ratings_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_trips" ADD CONSTRAINT "featured_trips_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_trips" ADD CONSTRAINT "featured_trips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_availability" ADD CONSTRAINT "trip_availability_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_category_assignments" ADD CONSTRAINT "trip_category_assignments_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_category_assignments" ADD CONSTRAINT "trip_category_assignments_category_id_trip_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."trip_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_tag_assignments" ADD CONSTRAINT "trip_tag_assignments_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_tag_assignments" ADD CONSTRAINT "trip_tag_assignments_tag_id_trip_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."trip_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_comments_post_idx" ON "blog_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "blog_comments_parent_idx" ON "blog_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "blog_comments_author_idx" ON "blog_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_comments_approved_idx" ON "blog_comments" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "blog_comments_created_at_idx" ON "blog_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_posts_view_count_idx" ON "blog_posts" USING btree ("view_count");--> statement-breakpoint
CREATE INDEX "content_categories_name_idx" ON "content_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "content_categories_slug_idx" ON "content_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_categories_parent_idx" ON "content_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "content_categories_active_idx" ON "content_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "content_categories_sort_order_idx" ON "content_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "content_views_content_idx" ON "content_views" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "content_views_user_idx" ON "content_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_views_viewed_at_idx" ON "content_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "faq_items_category_idx" ON "faq_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "faq_items_published_idx" ON "faq_items" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "faq_items_sort_order_idx" ON "faq_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "faq_items_created_by_idx" ON "faq_items" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "legal_documents_type_idx" ON "legal_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "legal_documents_active_idx" ON "legal_documents" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "legal_documents_effective_date_idx" ON "legal_documents" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "legal_documents_created_by_idx" ON "legal_documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "conversations_client_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "conversations_agent_idx" ON "conversations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "conversations_trip_idx" ON "conversations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "message_attachments_message_idx" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_payment_idx" ON "invoices" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "invoices_user_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_user_idx" ON "refunds" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_metrics_campaign_idx" ON "campaign_metrics" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_metrics_date_idx" ON "campaign_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "campaign_metrics_campaign_date_idx" ON "campaign_metrics" USING btree ("campaign_id","date");--> statement-breakpoint
CREATE INDEX "discount_code_usage_code_idx" ON "discount_code_usage" USING btree ("discount_code_id");--> statement-breakpoint
CREATE INDEX "discount_code_usage_user_idx" ON "discount_code_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discount_code_usage_trip_idx" ON "discount_code_usage" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "discount_code_usage_used_at_idx" ON "discount_code_usage" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "discount_codes_code_idx" ON "discount_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "discount_codes_status_idx" ON "discount_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discount_codes_valid_from_idx" ON "discount_codes" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "discount_codes_valid_until_idx" ON "discount_codes" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "discount_codes_created_by_idx" ON "discount_codes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "promotional_campaigns_name_idx" ON "promotional_campaigns" USING btree ("name");--> statement-breakpoint
CREATE INDEX "promotional_campaigns_status_idx" ON "promotional_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "promotional_campaigns_start_date_idx" ON "promotional_campaigns" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "promotional_campaigns_end_date_idx" ON "promotional_campaigns" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "promotional_campaigns_created_by_idx" ON "promotional_campaigns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "agent_ratings_agent_idx" ON "agent_ratings" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_ratings_rating_idx" ON "agent_ratings" USING btree ("average_rating");--> statement-breakpoint
CREATE INDEX "agent_reviews_user_idx" ON "agent_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_reviews_agent_idx" ON "agent_reviews" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_reviews_status_idx" ON "agent_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_reviews_rating_idx" ON "agent_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "review_reports_review_idx" ON "review_reports" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_reports_reporter_idx" ON "review_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "review_reports_status_idx" ON "review_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "featured_trips_trip_idx" ON "featured_trips" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "featured_trips_priority_idx" ON "featured_trips" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "featured_trips_featured_until_idx" ON "featured_trips" USING btree ("featured_until");--> statement-breakpoint
CREATE INDEX "featured_trips_created_by_idx" ON "featured_trips" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "trip_availability_trip_idx" ON "trip_availability" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_availability_date_idx" ON "trip_availability" USING btree ("date");--> statement-breakpoint
CREATE INDEX "trip_availability_trip_date_idx" ON "trip_availability" USING btree ("trip_id","date");--> statement-breakpoint
CREATE INDEX "trip_availability_status_idx" ON "trip_availability" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trip_categories_name_idx" ON "trip_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "trip_categories_active_idx" ON "trip_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "trip_categories_sort_idx" ON "trip_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "trip_category_assignments_trip_idx" ON "trip_category_assignments" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_category_assignments_category_idx" ON "trip_category_assignments" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "trip_category_assignments_trip_category_idx" ON "trip_category_assignments" USING btree ("trip_id","category_id");--> statement-breakpoint
CREATE INDEX "trip_tag_assignments_trip_idx" ON "trip_tag_assignments" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_tag_assignments_tag_idx" ON "trip_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "trip_tag_assignments_trip_tag_idx" ON "trip_tag_assignments" USING btree ("trip_id","tag_id");--> statement-breakpoint
CREATE INDEX "trip_tags_name_idx" ON "trip_tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "trip_tags_active_idx" ON "trip_tags" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "trip_tags_usage_idx" ON "trip_tags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "wishlist_user_idx" ON "wishlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlist_trip_idx" ON "wishlist" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "wishlist_user_trip_idx" ON "wishlist" USING btree ("user_id","trip_id");--> statement-breakpoint
CREATE INDEX "wishlist_created_at_idx" ON "wishlist" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_method_idx" ON "payments" USING btree ("payment_method");
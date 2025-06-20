CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"categories" varchar(100)[],
	"specializations" varchar(100)[],
	"business_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seasonal_schedules" jsonb DEFAULT '{}'::jsonb,
	"contact_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_media_links" jsonb DEFAULT '{}'::jsonb,
	"location" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"service_areas" varchar(255)[],
	"photos" text[],
	"videos" text[],
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "users" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agreed_to_terms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_agreed_at" timestamp;--> statement-breakpoint
CREATE INDEX "users_location_idx" ON "users" USING btree ("location");--> statement-breakpoint
CREATE INDEX "users_company_idx" ON "users" USING btree ("company_name");
CREATE TYPE "public"."ai_intent" AS ENUM('purchase_intent', 'service_inquiry', 'pricing_inquiry', 'shipping_inquiry', 'availability_inquiry', 'general_comment', 'spam');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('COMMENT', 'DM', 'LIKE', 'SHARE');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('COLD', 'WARM', 'HOT', 'CONVERTED');--> statement-breakpoint
CREATE TYPE "public"."offering_type" AS ENUM('PRODUCT', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'TIKTOK');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('FIXED', 'HOURLY', 'QUOTE', 'RANGE');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED', 'TRIAL');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_preview" varchar(20) NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(255),
	"details" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"platform_user_id" varchar(255) NOT NULL,
	"platform_username" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"post_id" uuid,
	"lead_id" uuid,
	"user_profile_id" uuid,
	"offering_id" uuid,
	"platform" "platform" NOT NULL,
	"type" "interaction_type" NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"sender_username" varchar(255) NOT NULL,
	"content_text" text NOT NULL,
	"received_at" timestamp NOT NULL,
	"post_reference" varchar(512),
	"source_channel" "platform",
	"source_post_id" uuid,
	"is_replied" boolean DEFAULT false,
	"flag_urgent" boolean DEFAULT false,
	"reply_text" text,
	"replied_at" timestamp,
	"ai_intent" varchar(50),
	"ai_confidence" integer,
	"ai_suggestion" text,
	"sentiment" varchar(20),
	"flag_low_confidence" boolean DEFAULT false,
	"is_spam" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"platform_username" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"lead_score" integer DEFAULT 0,
	"last_intent" varchar(50),
	"status" "lead_status" DEFAULT 'COLD' NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp DEFAULT now(),
	"tags" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "offering_type" DEFAULT 'PRODUCT' NOT NULL,
	"post_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" varchar(50),
	"price_type" "price_type" DEFAULT 'FIXED',
	"is_available" boolean DEFAULT true,
	"keywords" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"image_url" varchar(512),
	"caption" text,
	"likes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"posted_at" timestamp,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reply_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"category" text DEFAULT 'SYSTEM' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"business_name" varchar(255),
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"status" "tenant_status" DEFAULT 'TRIAL' NOT NULL,
	"subscription_plan" "subscription_plan" DEFAULT 'FREE',
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "tenants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"display_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"avatar_url" varchar(512),
	"instagram_username" varchar(255),
	"facebook_user_id" varchar(255),
	"whatsapp_phone" varchar(50),
	"tiktok_username" varchar(255),
	"total_lead_score" integer DEFAULT 0,
	"last_intent" varchar(50),
	"status" "lead_status" DEFAULT 'COLD',
	"total_interactions" integer DEFAULT 0,
	"last_interaction_at" timestamp,
	"tags" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" varchar(512) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"events" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_source_post_id_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_templates" ADD CONSTRAINT "reply_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_tenant_idx" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_tenant_platform_idx" ON "connected_accounts" USING btree ("tenant_id","platform");--> statement-breakpoint
CREATE INDEX "interaction_tenant_idx" ON "interactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "interaction_post_idx" ON "interactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "interaction_lead_idx" ON "interactions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "interaction_user_profile_idx" ON "interactions" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "interaction_offering_idx" ON "interactions" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "interaction_source_channel_idx" ON "interactions" USING btree ("source_channel");--> statement-breakpoint
CREATE UNIQUE INDEX "interaction_platform_external_idx" ON "interactions" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "interaction_received_at_idx" ON "interactions" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "interaction_tenant_replied_idx" ON "interactions" USING btree ("tenant_id","is_replied");--> statement-breakpoint
CREATE INDEX "interaction_tenant_received_at_idx" ON "interactions" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_tenant_platform_username_idx" ON "leads" USING btree ("tenant_id","platform","platform_username");--> statement-breakpoint
CREATE INDEX "lead_tenant_score_idx" ON "leads" USING btree ("tenant_id","lead_score");--> statement-breakpoint
CREATE INDEX "offering_tenant_idx" ON "offerings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offering_post_idx" ON "offerings" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "offering_type_idx" ON "offerings" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "post_tenant_idx" ON "posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_platform_external_idx" ON "posts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "user_profile_tenant_idx" ON "user_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_profile_ig_idx" ON "user_profiles" USING btree ("tenant_id","instagram_username");--> statement-breakpoint
CREATE INDEX "user_profile_fb_idx" ON "user_profiles" USING btree ("tenant_id","facebook_user_id");--> statement-breakpoint
CREATE INDEX "user_profile_wa_idx" ON "user_profiles" USING btree ("tenant_id","whatsapp_phone");--> statement-breakpoint
CREATE INDEX "user_profile_score_idx" ON "user_profiles" USING btree ("tenant_id","total_lead_score");--> statement-breakpoint
CREATE INDEX "webhook_tenant_idx" ON "webhooks" USING btree ("tenant_id");
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED', 'TRIAL');--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'LIKE';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'SHARE';--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"platform_username" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"lead_score" integer DEFAULT 0,
	"last_intent" varchar(50),
	"tags" text[],
	"notes" text,
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
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"post_id" uuid,
	"name" varchar(255) NOT NULL,
	"price" varchar(50),
	"description" text,
	"is_available" boolean DEFAULT true,
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
ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contacts" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "connected_accounts" DROP CONSTRAINT "connected_accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "reply_templates" DROP CONSTRAINT "reply_templates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "webhooks" DROP CONSTRAINT "webhooks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'SUPER_ADMIN');--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
DROP INDEX "api_keys_user_id_idx";--> statement-breakpoint
DROP INDEX "api_keys_key_hash_idx";--> statement-breakpoint
DROP INDEX "audit_logs_user_id_idx";--> statement-breakpoint
DROP INDEX "audit_logs_action_idx";--> statement-breakpoint
DROP INDEX "audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "user_id_idx";--> statement-breakpoint
DROP INDEX "platform_external_id_idx";--> statement-breakpoint
DROP INDEX "received_at_idx";--> statement-breakpoint
DROP INDEX "contact_id_idx";--> statement-breakpoint
DROP INDEX "webhooks_user_id_idx";--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "platform_username" varchar(255);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "post_id" uuid;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "reply_templates" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "reply_templates" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "reply_templates" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_tenant_platform_username_idx" ON "leads" USING btree ("tenant_id","platform","platform_username");--> statement-breakpoint
CREATE INDEX "post_tenant_idx" ON "posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_platform_external_idx" ON "posts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "product_tenant_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_post_idx" ON "products" USING btree ("post_id");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_templates" ADD CONSTRAINT "reply_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "interaction_platform_external_idx" ON "interactions" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "interaction_received_at_idx" ON "interactions" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "webhook_tenant_idx" ON "webhooks" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "connected_accounts" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "interactions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "interactions" DROP COLUMN "contact_id";--> statement-breakpoint
ALTER TABLE "interactions" DROP COLUMN "post_url";--> statement-breakpoint
ALTER TABLE "interactions" DROP COLUMN "post_image";--> statement-breakpoint
ALTER TABLE "interactions" DROP COLUMN "post_caption";--> statement-breakpoint
ALTER TABLE "reply_templates" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "webhooks" DROP COLUMN "user_id";--> statement-breakpoint
DROP TYPE "public"."user_status";
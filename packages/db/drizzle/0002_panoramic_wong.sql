ALTER TABLE "user_profiles" RENAME TO "customers";--> statement-breakpoint
ALTER TABLE "interactions" RENAME COLUMN "user_profile_id" TO "customer_id";--> statement-breakpoint
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_user_profile_id_user_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "customers" DROP CONSTRAINT "user_profiles_tenant_id_tenants_id_fk";--> statement-breakpoint
DROP INDEX "interaction_user_profile_idx";--> statement-breakpoint
DROP INDEX "user_profile_tenant_idx";--> statement-breakpoint
DROP INDEX "user_profile_ig_idx";--> statement-breakpoint
DROP INDEX "user_profile_fb_idx";--> statement-breakpoint
DROP INDEX "user_profile_wa_idx";--> statement-breakpoint
DROP INDEX "user_profile_score_idx";--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interaction_customer_idx" ON "interactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_tenant_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_ig_idx" ON "customers" USING btree ("tenant_id","instagram_username");--> statement-breakpoint
CREATE INDEX "customer_fb_idx" ON "customers" USING btree ("tenant_id","facebook_user_id");--> statement-breakpoint
CREATE INDEX "customer_wa_idx" ON "customers" USING btree ("tenant_id","whatsapp_phone");--> statement-breakpoint
CREATE INDEX "customer_score_idx" ON "customers" USING btree ("tenant_id","total_lead_score");--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "post_reference" varchar(512);
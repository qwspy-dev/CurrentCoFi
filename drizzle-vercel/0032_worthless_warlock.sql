ALTER TABLE "campaign_deliveries" ADD COLUMN "recipient_ciphertext" text;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD COLUMN "failure_code" text;--> statement-breakpoint
CREATE INDEX "campaign_deliveries_provider_message_idx" ON "campaign_deliveries" USING btree ("provider_message_id");
ALTER TABLE "api_keys" ADD COLUMN "signing_secret_ciphertext" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "kind" text DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "policies" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "response_error" text;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD COLUMN "secret_ciphertext" text NOT NULL;
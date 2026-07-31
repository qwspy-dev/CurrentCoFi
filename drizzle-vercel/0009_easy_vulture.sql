CREATE TABLE "crosschain_funding_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"user_id" uuid,
	"source_chain" text NOT NULL,
	"source_domain" integer NOT NULL,
	"source_usdc_address" text NOT NULL,
	"destination_chain" text DEFAULT 'ARC-TESTNET' NOT NULL,
	"destination_domain" integer DEFAULT 26 NOT NULL,
	"destination_address" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"protocol_fee_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"forward_fee_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"total_burn_atomic" numeric(78, 0) NOT NULL,
	"transport" text DEFAULT 'cctp-v2-forward' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"idempotency_key" text NOT NULL,
	"source_wallet_id" text,
	"source_challenge_id" text,
	"source_transaction_hash" text,
	"destination_transaction_hash" text,
	"campaign_funding_transaction_hash" text,
	"message_hash" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crosschain_funding_intents" ADD CONSTRAINT "crosschain_funding_intents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosschain_funding_intents" ADD CONSTRAINT "crosschain_funding_intents_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosschain_funding_intents" ADD CONSTRAINT "crosschain_funding_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crosschain_funding_project_key_unique" ON "crosschain_funding_intents" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "crosschain_funding_distribution_idx" ON "crosschain_funding_intents" USING btree ("distribution_id","created_at");--> statement-breakpoint
CREATE INDEX "crosschain_funding_status_idx" ON "crosschain_funding_intents" USING btree ("status","updated_at");
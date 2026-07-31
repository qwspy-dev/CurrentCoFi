CREATE TABLE "gateway_funding_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"user_id" uuid,
	"source_chain" text NOT NULL,
	"source_domain" integer NOT NULL,
	"source_usdc_address" text NOT NULL,
	"destination_address" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"max_fee_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"idempotency_key" text NOT NULL,
	"source_wallet_id" text,
	"source_wallet_address" text,
	"wallet_challenge_id" text,
	"approval_challenge_id" text,
	"deposit_challenge_id" text,
	"sign_challenge_id" text,
	"mint_challenge_id" text,
	"deposit_transaction_hash" text,
	"transfer_id" text,
	"mint_transaction_hash" text,
	"campaign_funding_transaction_hash" text,
	"typed_data" jsonb,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gateway_funding_intents" ADD CONSTRAINT "gateway_funding_intents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_funding_intents" ADD CONSTRAINT "gateway_funding_intents_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_funding_intents" ADD CONSTRAINT "gateway_funding_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_funding_project_key_unique" ON "gateway_funding_intents" USING btree ("project_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "gateway_funding_distribution_idx" ON "gateway_funding_intents" USING btree ("distribution_id","created_at");--> statement-breakpoint
CREATE INDEX "gateway_funding_status_idx" ON "gateway_funding_intents" USING btree ("status","updated_at");
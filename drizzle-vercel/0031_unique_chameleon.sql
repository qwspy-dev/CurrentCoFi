CREATE TABLE "wallet_swaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"circle_wallet_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"token_in_address" text NOT NULL,
	"token_in_symbol" text NOT NULL,
	"token_in_name" text NOT NULL,
	"token_in_decimals" integer NOT NULL,
	"amount_in_atomic" numeric(78, 0) NOT NULL,
	"usdc_out_atomic" numeric(78, 0) NOT NULL,
	"router_address" text NOT NULL,
	"adapter_address" text NOT NULL,
	"status" text DEFAULT 'authorizing' NOT NULL,
	"phase" text DEFAULT 'approval' NOT NULL,
	"approval_challenge_id" text,
	"settlement_challenge_id" text,
	"approval_transaction_hash" text,
	"settlement_transaction_hash" text,
	"settlement_deadline" timestamp with time zone,
	"receipt_number" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_swaps" ADD CONSTRAINT "wallet_swaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_swaps_receipt_unique" ON "wallet_swaps" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_swaps_approval_challenge_unique" ON "wallet_swaps" USING btree ("approval_challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_swaps_settlement_challenge_unique" ON "wallet_swaps" USING btree ("settlement_challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_swaps_settlement_transaction_unique" ON "wallet_swaps" USING btree ("settlement_transaction_hash");--> statement-breakpoint
CREATE INDEX "wallet_swaps_user_created_idx" ON "wallet_swaps" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_swaps_status_idx" ON "wallet_swaps" USING btree ("status","updated_at");
CREATE TABLE "wallet_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"circle_wallet_id" text NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"token_address" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"decimals" integer NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'authorizing' NOT NULL,
	"challenge_id" text NOT NULL,
	"transaction_hash" text,
	"receipt_number" text NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_transfers" ADD CONSTRAINT "wallet_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transfers_challenge_unique" ON "wallet_transfers" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transfers_receipt_unique" ON "wallet_transfers" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transfers_transaction_unique" ON "wallet_transfers" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "wallet_transfers_user_created_idx" ON "wallet_transfers" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_transfers_status_idx" ON "wallet_transfers" USING btree ("status","updated_at");
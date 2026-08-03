CREATE TABLE "social_payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"recipient_user_id" uuid,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"recipient_address" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"paid_amount_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_payment_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"public_token_hash" text NOT NULL,
	"label" text,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payer_user_id" uuid,
	"payer_wallet_id" text,
	"payer_address" text,
	"payment_challenge_id" text,
	"transaction_hash" text,
	"receipt_number" text NOT NULL,
	"paid_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_payment_requests" ADD CONSTRAINT "social_payment_requests_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_payment_requests" ADD CONSTRAINT "social_payment_requests_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_payment_shares" ADD CONSTRAINT "social_payment_shares_request_id_social_payment_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."social_payment_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_payment_shares" ADD CONSTRAINT "social_payment_shares_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "social_payment_requests_slug_unique" ON "social_payment_requests" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "social_payment_requests_creator_idx" ON "social_payment_requests" USING btree ("creator_user_id","created_at");--> statement-breakpoint
CREATE INDEX "social_payment_requests_recipient_idx" ON "social_payment_requests" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "social_payment_requests_status_idx" ON "social_payment_requests" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "social_payment_shares_token_unique" ON "social_payment_shares" USING btree ("public_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "social_payment_shares_receipt_unique" ON "social_payment_shares" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "social_payment_shares_transaction_unique" ON "social_payment_shares" USING btree ("transaction_hash");--> statement-breakpoint
CREATE INDEX "social_payment_shares_request_status_idx" ON "social_payment_shares" USING btree ("request_id","status","created_at");--> statement-breakpoint
CREATE INDEX "social_payment_shares_payer_idx" ON "social_payment_shares" USING btree ("payer_user_id","created_at");
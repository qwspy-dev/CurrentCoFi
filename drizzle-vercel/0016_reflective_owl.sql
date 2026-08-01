CREATE TABLE "checkout_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"success_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_id" uuid NOT NULL,
	"customer_user_id" uuid,
	"customer_wallet_id" text,
	"customer_address" text NOT NULL,
	"merchant_address" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"payment_challenge_id" text,
	"payment_transaction_hash" text,
	"refund_challenge_id" text,
	"refund_transaction_hash" text,
	"receipt_number" text NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"settlement_address" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_links" ADD CONSTRAINT "checkout_links_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_payments" ADD CONSTRAINT "checkout_payments_checkout_id_checkout_links_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkout_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_payments" ADD CONSTRAINT "checkout_payments_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_accounts" ADD CONSTRAINT "merchant_accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_accounts" ADD CONSTRAINT "merchant_accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_links_slug_unique" ON "checkout_links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "checkout_links_merchant_status_idx" ON "checkout_links" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_payments_receipt_unique" ON "checkout_payments" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "checkout_payments_checkout_status_idx" ON "checkout_payments" USING btree ("checkout_id","status","created_at");--> statement-breakpoint
CREATE INDEX "checkout_payments_customer_idx" ON "checkout_payments" USING btree ("customer_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_accounts_project_unique" ON "merchant_accounts" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_accounts_slug_unique" ON "merchant_accounts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "merchant_accounts_owner_idx" ON "merchant_accounts" USING btree ("owner_user_id","created_at");
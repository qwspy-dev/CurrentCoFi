CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"challenge_id" text,
	"transaction_hash" text,
	"receipt_number" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"interval_days" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"success_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"subscriber_user_id" uuid,
	"subscriber_wallet_id" text,
	"subscriber_address" text NOT NULL,
	"merchant_address" text NOT NULL,
	"status" text DEFAULT 'authorizing' NOT NULL,
	"cycle_count" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscriber_user_id_users_id_fk" FOREIGN KEY ("subscriber_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_subscription_period_unique" ON "subscription_payments" USING btree ("subscription_id","period_number");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_receipt_unique" ON "subscription_payments" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "subscription_payments_status_due_idx" ON "subscription_payments" USING btree ("status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_slug_unique" ON "subscription_plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subscription_plans_merchant_status_idx" ON "subscription_plans" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_plan_subscriber_unique" ON "subscriptions" USING btree ("plan_id","subscriber_address");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_status_idx" ON "subscriptions" USING btree ("plan_id","status","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_subscriber_idx" ON "subscriptions" USING btree ("subscriber_user_id","created_at");
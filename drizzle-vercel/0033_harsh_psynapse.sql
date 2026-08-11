CREATE TABLE "checkout_settlement_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"split_id" uuid,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"recipient_address" text NOT NULL,
	"basis_points" integer NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"transaction_hash" text NOT NULL,
	"settled_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"recipient_address" text,
	"basis_points" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_settlement_receipts" ADD CONSTRAINT "checkout_settlement_receipts_payment_id_checkout_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."checkout_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_settlement_receipts" ADD CONSTRAINT "checkout_settlement_receipts_split_id_checkout_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."checkout_splits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_splits" ADD CONSTRAINT "checkout_splits_checkout_id_checkout_links_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkout_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_settlement_receipts_payment_position_unique" ON "checkout_settlement_receipts" USING btree ("payment_id","position");--> statement-breakpoint
CREATE INDEX "checkout_settlement_receipts_recipient_idx" ON "checkout_settlement_receipts" USING btree ("recipient_address","settled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_splits_checkout_position_unique" ON "checkout_splits" USING btree ("checkout_id","position");--> statement-breakpoint
CREATE INDEX "checkout_splits_checkout_status_idx" ON "checkout_splits" USING btree ("checkout_id","status");
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "referrals_distribution_code_unique";--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_code_unique" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_distribution_referrer_unique" ON "referral_codes" USING btree ("distribution_id","referrer_user_id");--> statement-breakpoint
CREATE INDEX "referrals_distribution_code_idx" ON "referrals" USING btree ("distribution_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_distribution_users_unique" ON "referrals" USING btree ("distribution_id","referrer_user_id","referred_user_id");
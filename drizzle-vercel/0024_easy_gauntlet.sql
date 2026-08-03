CREATE TABLE "giveaway_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giveaway_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"identity_type" text NOT NULL,
	"identity_hash" text NOT NULL,
	"identity_ciphertext" text NOT NULL,
	"masked_identity" text NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by_code" text,
	"entry_digest" text NOT NULL,
	"status" text DEFAULT 'entered' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"distribution_id" uuid NOT NULL,
	"public_slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'awaiting_funding' NOT NULL,
	"entry_deadline" timestamp with time zone NOT NULL,
	"max_entries" integer DEFAULT 1000 NOT NULL,
	"claim_token_ciphertext" text NOT NULL,
	"randomness_ciphertext" text NOT NULL,
	"randomness_commitment" text NOT NULL,
	"entry_set_digest" text,
	"draw_digest" text,
	"revealed_randomness" text,
	"winner_entry_id" uuid,
	"drawn_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "giveaway_entries" ADD CONSTRAINT "giveaway_entries_giveaway_id_giveaways_id_fk" FOREIGN KEY ("giveaway_id") REFERENCES "public"."giveaways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "giveaway_entries_identity_unique" ON "giveaway_entries" USING btree ("giveaway_id","identity_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "giveaway_entries_referral_unique" ON "giveaway_entries" USING btree ("giveaway_id","referral_code");--> statement-breakpoint
CREATE INDEX "giveaway_entries_status_idx" ON "giveaway_entries" USING btree ("giveaway_id","status","created_at");--> statement-breakpoint
CREATE INDEX "giveaway_entries_referred_idx" ON "giveaway_entries" USING btree ("giveaway_id","referred_by_code");--> statement-breakpoint
CREATE UNIQUE INDEX "giveaways_public_slug_unique" ON "giveaways" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "giveaways_distribution_unique" ON "giveaways" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "giveaways_project_status_idx" ON "giveaways" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "giveaways_deadline_idx" ON "giveaways" USING btree ("status","entry_deadline");
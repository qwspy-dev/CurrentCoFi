CREATE TABLE "bounties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"distribution_id" uuid NOT NULL,
	"public_slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'awaiting_funding' NOT NULL,
	"submission_deadline" timestamp with time zone NOT NULL,
	"claim_token_ciphertext" text NOT NULL,
	"awarded_submission_id" uuid,
	"awarded_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bounty_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"contact_type" text NOT NULL,
	"contact_hash" text NOT NULL,
	"contact_ciphertext" text NOT NULL,
	"masked_contact" text NOT NULL,
	"work_url" text NOT NULL,
	"work_summary" text NOT NULL,
	"proof_digest" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bounties_public_slug_unique" ON "bounties" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "bounties_distribution_unique" ON "bounties" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "bounties_project_status_idx" ON "bounties" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "bounties_deadline_idx" ON "bounties" USING btree ("status","submission_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "bounty_submissions_bounty_contact_unique" ON "bounty_submissions" USING btree ("bounty_id","contact_hash");--> statement-breakpoint
CREATE INDEX "bounty_submissions_bounty_status_idx" ON "bounty_submissions" USING btree ("bounty_id","status","created_at");
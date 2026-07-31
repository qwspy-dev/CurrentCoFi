CREATE TABLE "pilot_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilot_id" uuid NOT NULL,
	"signer_name" text NOT NULL,
	"signer_role" text NOT NULL,
	"statement" text NOT NULL,
	"digest" text NOT NULL,
	"proof" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid,
	"owner_user_id" uuid,
	"public_slug" text NOT NULL,
	"partner_name" text NOT NULL,
	"partner_website" text,
	"use_case" text NOT NULL,
	"status" text DEFAULT 'onboarding' NOT NULL,
	"integration_mode" text DEFAULT 'hosted-links' NOT NULL,
	"target_recipients" integer DEFAULT 100 NOT NULL,
	"target_claim_rate_bps" integer DEFAULT 5000 NOT NULL,
	"target_activation_rate_bps" integer DEFAULT 2500 NOT NULL,
	"requested_integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"starts_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_attestations" ADD CONSTRAINT "pilot_attestations_pilot_id_pilot_engagements_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilot_engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_engagements" ADD CONSTRAINT "pilot_engagements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_engagements" ADD CONSTRAINT "pilot_engagements_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_engagements" ADD CONSTRAINT "pilot_engagements_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_attestations_pilot_unique" ON "pilot_attestations" USING btree ("pilot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_attestations_digest_unique" ON "pilot_attestations" USING btree ("digest");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_engagements_public_slug_unique" ON "pilot_engagements" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "pilot_engagements_project_status_idx" ON "pilot_engagements" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "pilot_engagements_distribution_idx" ON "pilot_engagements" USING btree ("distribution_id");
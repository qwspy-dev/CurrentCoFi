CREATE TABLE "pilot_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"pilot_id" uuid,
	"public_slug" text NOT NULL,
	"organization_name" text NOT NULL,
	"website_url" text,
	"applicant_name" text NOT NULL,
	"applicant_role" text NOT NULL,
	"contact_hash" text NOT NULL,
	"contact_ciphertext" text NOT NULL,
	"status_secret_hash" text NOT NULL,
	"use_case" text NOT NULL,
	"audience_description" text NOT NULL,
	"expected_recipients" integer DEFAULT 100 NOT NULL,
	"integration_mode" text DEFAULT 'hosted-links' NOT NULL,
	"requested_integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readiness" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"review_notes" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"public_slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"integration_mode" text DEFAULT 'hosted-links' NOT NULL,
	"requested_integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_recipients" integer DEFAULT 100 NOT NULL,
	"max_applications" integer DEFAULT 25 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_invitation_id_pilot_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."pilot_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_pilot_id_pilot_engagements_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."pilot_engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_applications" ADD CONSTRAINT "pilot_applications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_invitations" ADD CONSTRAINT "pilot_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_invitations" ADD CONSTRAINT "pilot_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_applications_public_slug_unique" ON "pilot_applications" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_applications_invite_contact_unique" ON "pilot_applications" USING btree ("invitation_id","contact_hash");--> statement-breakpoint
CREATE INDEX "pilot_applications_project_status_idx" ON "pilot_applications" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "pilot_applications_invitation_idx" ON "pilot_applications" USING btree ("invitation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_invitations_public_slug_unique" ON "pilot_invitations" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "pilot_invitations_project_status_idx" ON "pilot_invitations" USING btree ("project_id","status","created_at");
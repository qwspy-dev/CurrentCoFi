CREATE TABLE "evidence_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid,
	"created_by_user_id" uuid,
	"created_by_key_id" uuid,
	"public_slug" text NOT NULL,
	"schema_version" text DEFAULT 'current-evidence-v1' NOT NULL,
	"digest" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_reports" ADD CONSTRAINT "evidence_reports_created_by_key_id_api_keys_id_fk" FOREIGN KEY ("created_by_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_reports_public_slug_unique" ON "evidence_reports" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "evidence_reports_project_created_idx" ON "evidence_reports" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_reports_distribution_idx" ON "evidence_reports" USING btree ("distribution_id","created_at");
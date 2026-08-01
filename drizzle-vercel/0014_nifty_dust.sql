CREATE TABLE "campaign_quality_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"review_threshold" integer DEFAULT 45 NOT NULL,
	"hold_threshold" integer DEFAULT 70 NOT NULL,
	"burst_window_minutes" integer DEFAULT 10 NOT NULL,
	"burst_referral_count" integer DEFAULT 8 NOT NULL,
	"minimum_account_age_minutes" integer DEFAULT 60 NOT NULL,
	"minimum_activation_delay_seconds" integer DEFAULT 30 NOT NULL,
	"action" text DEFAULT 'review' NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_quality_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"subject_user_id" uuid,
	"score" integer NOT NULL,
	"band" text NOT NULL,
	"decision" text NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_quality_policies" ADD CONSTRAINT "campaign_quality_policies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_quality_policies" ADD CONSTRAINT "campaign_quality_policies_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_quality_policies" ADD CONSTRAINT "campaign_quality_policies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_quality_assessments" ADD CONSTRAINT "participant_quality_assessments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_quality_assessments" ADD CONSTRAINT "participant_quality_assessments_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_quality_assessments" ADD CONSTRAINT "participant_quality_assessments_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_quality_assessments" ADD CONSTRAINT "participant_quality_assessments_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_quality_policies_distribution_unique" ON "campaign_quality_policies" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "campaign_quality_policies_project_idx" ON "campaign_quality_policies" USING btree ("project_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_quality_referral_unique" ON "participant_quality_assessments" USING btree ("referral_id");--> statement-breakpoint
CREATE INDEX "participant_quality_project_decision_idx" ON "participant_quality_assessments" USING btree ("project_id","decision","evaluated_at");--> statement-breakpoint
CREATE INDEX "participant_quality_distribution_idx" ON "participant_quality_assessments" USING btree ("distribution_id","evaluated_at");
CREATE TABLE "payroll_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"identity_type" text NOT NULL,
	"identity_hash" text NOT NULL,
	"identity_ciphertext" text NOT NULL,
	"masked_identity" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"distribution_id" uuid,
	"cycle_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"member_count" integer NOT NULL,
	"total_amount_atomic" numeric(78, 0) NOT NULL,
	"prepared_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"token_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"cadence_days" integer NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"claim_expires_hours" integer DEFAULT 168 NOT NULL,
	"refund_address" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payroll_members" ADD CONSTRAINT "payroll_members_schedule_id_payroll_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."payroll_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_schedule_id_payroll_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."payroll_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_schedules" ADD CONSTRAINT "payroll_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_schedules" ADD CONSTRAINT "payroll_schedules_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_schedules" ADD CONSTRAINT "payroll_schedules_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_members_schedule_identity_unique" ON "payroll_members" USING btree ("schedule_id","identity_hash");--> statement-breakpoint
CREATE INDEX "payroll_members_schedule_status_idx" ON "payroll_members" USING btree ("schedule_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_runs_schedule_cycle_unique" ON "payroll_runs" USING btree ("schedule_id","cycle_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_runs_distribution_unique" ON "payroll_runs" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_schedule_status_idx" ON "payroll_runs" USING btree ("schedule_id","status","cycle_at");--> statement-breakpoint
CREATE INDEX "payroll_schedules_project_status_idx" ON "payroll_schedules" USING btree ("project_id","status","next_run_at");--> statement-breakpoint
CREATE INDEX "payroll_schedules_due_idx" ON "payroll_schedules" USING btree ("status","next_run_at");
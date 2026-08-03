CREATE TABLE "vesting_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"distribution_id" uuid NOT NULL,
	"public_slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'awaiting_funding' NOT NULL,
	"cliff_at" timestamp with time zone NOT NULL,
	"release_count" integer NOT NULL,
	"interval_days" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vesting_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"identity_type" text NOT NULL,
	"identity_hash" text NOT NULL,
	"identity_ciphertext" text NOT NULL,
	"masked_identity" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"access_token_ciphertext" text NOT NULL,
	"total_amount_atomic" numeric(78, 0) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vesting_tranches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"unlock_at" timestamp with time zone NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"claim_token_ciphertext" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD COLUMN "available_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vesting_batches" ADD CONSTRAINT "vesting_batches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_batches" ADD CONSTRAINT "vesting_batches_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_batches" ADD CONSTRAINT "vesting_batches_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_schedules" ADD CONSTRAINT "vesting_schedules_batch_id_vesting_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."vesting_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_tranches" ADD CONSTRAINT "vesting_tranches_schedule_id_vesting_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."vesting_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_tranches" ADD CONSTRAINT "vesting_tranches_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_batches_distribution_unique" ON "vesting_batches" USING btree ("distribution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_batches_slug_unique" ON "vesting_batches" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "vesting_batches_project_status_idx" ON "vesting_batches" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_schedules_batch_identity_unique" ON "vesting_schedules" USING btree ("batch_id","identity_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_schedules_access_unique" ON "vesting_schedules" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "vesting_schedules_batch_idx" ON "vesting_schedules" USING btree ("batch_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_tranches_allocation_unique" ON "vesting_tranches" USING btree ("allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vesting_tranches_schedule_position_unique" ON "vesting_tranches" USING btree ("schedule_id","position");--> statement-breakpoint
CREATE INDEX "vesting_tranches_schedule_unlock_idx" ON "vesting_tranches" USING btree ("schedule_id","unlock_at");
CREATE TABLE "public_drop_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drop_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"claim_token_ciphertext" text NOT NULL,
	"display_name" text,
	"identity_type" text,
	"identity_hash" text,
	"identity_ciphertext" text,
	"masked_identity" text,
	"referral_code" text,
	"referred_by_code" text,
	"reserved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"distribution_id" uuid NOT NULL,
	"public_slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'awaiting_funding' NOT NULL,
	"claim_amount_atomic" numeric(78, 0) NOT NULL,
	"max_claims" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_drop_slots" ADD CONSTRAINT "public_drop_slots_drop_id_public_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."public_drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_drop_slots" ADD CONSTRAINT "public_drop_slots_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_drops" ADD CONSTRAINT "public_drops_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_drops" ADD CONSTRAINT "public_drops_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_drops" ADD CONSTRAINT "public_drops_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "public_drop_slots_allocation_unique" ON "public_drop_slots" USING btree ("allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "public_drop_slots_position_unique" ON "public_drop_slots" USING btree ("drop_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "public_drop_slots_identity_unique" ON "public_drop_slots" USING btree ("drop_id","identity_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "public_drop_slots_referral_unique" ON "public_drop_slots" USING btree ("drop_id","referral_code");--> statement-breakpoint
CREATE INDEX "public_drop_slots_available_idx" ON "public_drop_slots" USING btree ("drop_id","identity_hash","position");--> statement-breakpoint
CREATE UNIQUE INDEX "public_drops_slug_unique" ON "public_drops" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "public_drops_distribution_unique" ON "public_drops" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "public_drops_project_status_idx" ON "public_drops" USING btree ("project_id","status","created_at");
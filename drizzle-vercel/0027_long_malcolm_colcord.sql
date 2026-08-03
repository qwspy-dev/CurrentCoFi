CREATE TABLE "campaign_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"identity_type" text NOT NULL,
	"masked_identity" text NOT NULL,
	"claim_url_ciphertext" text NOT NULL,
	"channel" text DEFAULT 'unassigned' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"sent_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD CONSTRAINT "campaign_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD CONSTRAINT "campaign_deliveries_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliveries" ADD CONSTRAINT "campaign_deliveries_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_deliveries_allocation_unique" ON "campaign_deliveries" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "campaign_deliveries_project_status_idx" ON "campaign_deliveries" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "campaign_deliveries_distribution_idx" ON "campaign_deliveries" USING btree ("distribution_id","created_at");
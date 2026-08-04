CREATE TABLE "campaign_destination_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"destination_origin" text NOT NULL,
	"open_count" integer DEFAULT 1 NOT NULL,
	"first_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_destination_clicks" ADD CONSTRAINT "campaign_destination_clicks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_destination_clicks" ADD CONSTRAINT "campaign_destination_clicks_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_destination_clicks" ADD CONSTRAINT "campaign_destination_clicks_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_destination_clicks" ADD CONSTRAINT "campaign_destination_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_destination_clicks_allocation_unique" ON "campaign_destination_clicks" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "campaign_destination_clicks_project_idx" ON "campaign_destination_clicks" USING btree ("project_id","last_opened_at");--> statement-breakpoint
CREATE INDEX "campaign_destination_clicks_distribution_idx" ON "campaign_destination_clicks" USING btree ("distribution_id","last_opened_at");
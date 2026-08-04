CREATE TABLE "discovery_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL,
	"event_type" text NOT NULL,
	"day_bucket" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discovery_interactions" ADD CONSTRAINT "discovery_interactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discovery_interactions_daily_unique" ON "discovery_interactions" USING btree ("resource_type","resource_id","visitor_hash","event_type","day_bucket");--> statement-breakpoint
CREATE INDEX "discovery_interactions_resource_idx" ON "discovery_interactions" USING btree ("resource_type","resource_id","event_type");--> statement-breakpoint
CREATE INDEX "discovery_interactions_project_day_idx" ON "discovery_interactions" USING btree ("project_id","day_bucket");
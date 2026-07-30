CREATE TABLE "identity_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"verifier_key_id" uuid,
	"identity_type" text NOT NULL,
	"identity_hash" text NOT NULL,
	"wallet_address" text NOT NULL,
	"external_event_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity_attestations" ADD CONSTRAINT "identity_attestations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_attestations" ADD CONSTRAINT "identity_attestations_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_attestations" ADD CONSTRAINT "identity_attestations_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_attestations" ADD CONSTRAINT "identity_attestations_verifier_key_id_api_keys_id_fk" FOREIGN KEY ("verifier_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_attestations_project_event_unique" ON "identity_attestations" USING btree ("project_id","external_event_id");--> statement-breakpoint
CREATE INDEX "identity_attestations_claim_idx" ON "identity_attestations" USING btree ("allocation_id","wallet_address","expires_at");--> statement-breakpoint
CREATE INDEX "identity_attestations_distribution_idx" ON "identity_attestations" USING btree ("distribution_id","created_at");
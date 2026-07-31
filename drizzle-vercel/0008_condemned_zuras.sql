CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"api_key_id" uuid,
	"reviewed_by_user_id" uuid,
	"kind" text DEFAULT 'reward_distribution' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"amount_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"asset_address" text,
	"idempotency_key" text NOT NULL,
	"request_payload" jsonb NOT NULL,
	"policy_decision" jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_code" text,
	"reviewed_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_actions_key_idempotency_unique" ON "agent_actions" USING btree ("api_key_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "agent_actions_project_status_idx" ON "agent_actions" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "agent_actions_key_created_idx" ON "agent_actions" USING btree ("api_key_id","created_at");
CREATE TABLE "token_economy_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"kind" text NOT NULL,
	"reference" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"duration_days" integer,
	"contract_action_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"approval_challenge_id" text,
	"execution_challenge_id" text,
	"transaction_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_economy_actions" ADD CONSTRAINT "token_economy_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_economy_actions" ADD CONSTRAINT "token_economy_actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "token_economy_contract_action_unique" ON "token_economy_actions" USING btree ("contract_action_id");--> statement-breakpoint
CREATE INDEX "token_economy_project_kind_idx" ON "token_economy_actions" USING btree ("project_id","kind");--> statement-breakpoint
CREATE INDEX "token_economy_status_idx" ON "token_economy_actions" USING btree ("status");
CREATE TABLE "agent_settlement_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"reviewer_user_id" uuid,
	"status" text DEFAULT 'awaiting_settlement' NOT NULL,
	"approval_challenge_id" text,
	"funding_challenge_id" text,
	"transaction_hash" text,
	"failure_code" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_settlement_handoffs" ADD CONSTRAINT "agent_settlement_handoffs_action_id_agent_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."agent_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_settlement_handoffs" ADD CONSTRAINT "agent_settlement_handoffs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_settlement_handoffs" ADD CONSTRAINT "agent_settlement_handoffs_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_settlement_handoffs" ADD CONSTRAINT "agent_settlement_handoffs_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_settlement_action_unique" ON "agent_settlement_handoffs" USING btree ("action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_settlement_distribution_unique" ON "agent_settlement_handoffs" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "agent_settlement_project_status_idx" ON "agent_settlement_handoffs" USING btree ("project_id","status","created_at");--> statement-breakpoint
INSERT INTO "agent_settlement_handoffs" ("action_id", "project_id", "distribution_id", "status", "transaction_hash", "settled_at")
SELECT
	"id",
	"project_id",
	(("result" ->> 'distributionId')::uuid),
	CASE
		WHEN ("result" ->> 'fundingTransactionHash') IS NOT NULL THEN 'settled'
		ELSE 'awaiting_settlement'
	END,
	("result" ->> 'fundingTransactionHash'),
	CASE
		WHEN ("result" ->> 'fundingTransactionHash') IS NOT NULL THEN "updated_at"
		ELSE NULL
	END
FROM "agent_actions"
WHERE ("result" ->> 'distributionId') IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "agent_actions"
SET
	"status" = 'awaiting_settlement',
	"result" = "result" || '{"settlementStatus":"awaiting_settlement"}'::jsonb,
	"updated_at" = now()
WHERE
	"status" = 'completed'
	AND ("result" ->> 'distributionId') IS NOT NULL
	AND ("result" ->> 'fundingTransactionHash') IS NULL;

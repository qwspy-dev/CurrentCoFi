CREATE TABLE "community_treasuries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"public_slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"treasury_address" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treasury_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"category" text NOT NULL,
	"limit_atomic" numeric(78, 0) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treasury_id" uuid NOT NULL,
	"budget_id" uuid,
	"creator_user_id" uuid,
	"token_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"recipient_address" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approvals_required" integer DEFAULT 1 NOT NULL,
	"approval_count" integer DEFAULT 0 NOT NULL,
	"transfer_id" uuid,
	"transaction_hash" text,
	"proof_url" text,
	"executed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_treasuries" ADD CONSTRAINT "community_treasuries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_treasuries" ADD CONSTRAINT "community_treasuries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_approvals" ADD CONSTRAINT "treasury_approvals_proposal_id_treasury_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."treasury_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_approvals" ADD CONSTRAINT "treasury_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_budgets" ADD CONSTRAINT "treasury_budgets_treasury_id_community_treasuries_id_fk" FOREIGN KEY ("treasury_id") REFERENCES "public"."community_treasuries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_budgets" ADD CONSTRAINT "treasury_budgets_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_proposals" ADD CONSTRAINT "treasury_proposals_treasury_id_community_treasuries_id_fk" FOREIGN KEY ("treasury_id") REFERENCES "public"."community_treasuries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_proposals" ADD CONSTRAINT "treasury_proposals_budget_id_treasury_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."treasury_budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_proposals" ADD CONSTRAINT "treasury_proposals_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_proposals" ADD CONSTRAINT "treasury_proposals_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_proposals" ADD CONSTRAINT "treasury_proposals_transfer_id_wallet_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."wallet_transfers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_treasuries_project_unique" ON "community_treasuries" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_treasuries_slug_unique" ON "community_treasuries" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "community_treasuries_owner_idx" ON "community_treasuries" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "treasury_approvals_proposal_user_unique" ON "treasury_approvals" USING btree ("proposal_id","user_id");--> statement-breakpoint
CREATE INDEX "treasury_approvals_proposal_idx" ON "treasury_approvals" USING btree ("proposal_id","created_at");--> statement-breakpoint
CREATE INDEX "treasury_budgets_treasury_status_idx" ON "treasury_budgets" USING btree ("treasury_id","status","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "treasury_proposals_transfer_unique" ON "treasury_proposals" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "treasury_proposals_treasury_status_idx" ON "treasury_proposals" USING btree ("treasury_id","status","created_at");--> statement-breakpoint
CREATE INDEX "treasury_proposals_budget_idx" ON "treasury_proposals" USING btree ("budget_id","created_at");
CREATE TABLE "escrow_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_user_id" uuid,
	"token_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'awaiting_funding' NOT NULL,
	"client_address" text NOT NULL,
	"provider_address" text NOT NULL,
	"refund_address" text NOT NULL,
	"arbitrator_address" text NOT NULL,
	"contract_deal_id" text NOT NULL,
	"contract_address" text,
	"terms_hash" text NOT NULL,
	"total_amount_atomic" numeric(78, 0) NOT NULL,
	"released_amount_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"refunded_amount_atomic" numeric(78, 0) DEFAULT '0' NOT NULL,
	"milestone_count" integer NOT NULL,
	"next_milestone" integer DEFAULT 0 NOT NULL,
	"funding_transaction_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreement_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"amount_atomic" numeric(78, 0) NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"proof_hash" text,
	"submission_transaction_hash" text,
	"settlement_transaction_hash" text,
	"submitted_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escrow_agreements" ADD CONSTRAINT "escrow_agreements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_agreements" ADD CONSTRAINT "escrow_agreements_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_agreements" ADD CONSTRAINT "escrow_agreements_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_milestones" ADD CONSTRAINT "escrow_milestones_agreement_id_escrow_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."escrow_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "escrow_agreements_contract_deal_unique" ON "escrow_agreements" USING btree ("contract_deal_id");--> statement-breakpoint
CREATE INDEX "escrow_agreements_project_status_idx" ON "escrow_agreements" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "escrow_agreements_client_idx" ON "escrow_agreements" USING btree ("client_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "escrow_milestones_agreement_position_unique" ON "escrow_milestones" USING btree ("agreement_id","position");--> statement-breakpoint
CREATE INDEX "escrow_milestones_status_due_idx" ON "escrow_milestones" USING btree ("status","due_at");
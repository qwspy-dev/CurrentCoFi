CREATE TABLE "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_by_user_id" uuid,
	"email_hash" text NOT NULL,
	"masked_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"role" "member_role" DEFAULT 'operator' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_workspace_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"active_project_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_preferences" ADD CONSTRAINT "user_workspace_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_preferences" ADD CONSTRAINT "user_workspace_preferences_active_project_id_projects_id_fk" FOREIGN KEY ("active_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_token_unique" ON "project_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "project_invitations_project_status_idx" ON "project_invitations" USING btree ("project_id","status","created_at");--> statement-breakpoint
CREATE INDEX "project_invitations_email_status_idx" ON "project_invitations" USING btree ("email_hash","status","expires_at");--> statement-breakpoint
CREATE INDEX "user_workspace_preferences_project_idx" ON "user_workspace_preferences" USING btree ("active_project_id");
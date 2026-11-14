CREATE TABLE "mcp_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"client_id" varchar(255),
	"client_name" varchar(255),
	"tool" varchar(128) NOT NULL,
	"procedure_path" varchar(255),
	"sql_query" text,
	"target" varchar(512),
	"outcome" varchar(16) NOT NULL,
	"error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_activity_outcome_check" CHECK ("mcp_activity"."outcome" IN ('allowed', 'denied', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "mcp_activity" ADD CONSTRAINT "mcp_activity_actor_user_id_auth_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_activity_actor_created_idx" ON "mcp_activity" USING btree ("actor_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "mcp_activity_created_idx" ON "mcp_activity" USING btree ("created_at","id");
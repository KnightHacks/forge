CREATE TABLE "knight_hacks_issue_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_display_name" varchar(255) NOT NULL,
	"action" varchar(64) NOT NULL,
	"changed_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_issue_reminder_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"reminder_key" varchar(32) NOT NULL,
	"destination_snapshot" varchar(32) NOT NULL,
	"content_snapshot" text NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_reminder_delivery_identity_unique" UNIQUE("issue_id","due_at","reminder_key")
);
--> statement-breakpoint
ALTER TABLE "auth_roles" ADD COLUMN "issue_reminders_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "archived_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "archive_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "creation_key" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD COLUMN "creation_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "knight_hacks_template" ADD COLUMN "normalized_name" varchar(100);--> statement-breakpoint
ALTER TABLE "knight_hacks_template" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_template" ADD COLUMN "disabled_reason" text;--> statement-breakpoint
UPDATE "knight_hacks_issue"
SET "due_at" = "date" AT TIME ZONE 'America/New_York'
WHERE "date" IS NOT NULL;--> statement-breakpoint
INSERT INTO "knight_hacks_issue_history"
  ("issue_id", "actor_display_name", "action", "changed_fields", "after", "created_at")
SELECT
  "id",
  'Reforge system',
  'tracking_started',
  ARRAY[]::text[],
  jsonb_build_object('message', 'Reforge history tracking began'),
  CURRENT_TIMESTAMP
FROM "knight_hacks_issue";--> statement-breakpoint
UPDATE "knight_hacks_template"
SET
  "disabled_at" = CURRENT_TIMESTAMP,
  "disabled_reason" = CASE
    WHEN length(btrim("name")) > 100 THEN 'Template name exceeds 100 characters.'
    WHEN jsonb_typeof("body") <> 'object' THEN 'Template body is not an object.'
    ELSE 'Template issue name is missing.'
  END
WHERE
  length(btrim("name")) > 100
  OR jsonb_typeof("body") <> 'object'
  OR NULLIF(btrim("body"->>'name'), '') IS NULL;--> statement-breakpoint
UPDATE "knight_hacks_template"
SET "normalized_name" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE "disabled_at" IS NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_history" ADD CONSTRAINT "knight_hacks_issue_history_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_history" ADD CONSTRAINT "knight_hacks_issue_history_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_reminder_delivery" ADD CONSTRAINT "knight_hacks_issue_reminder_delivery_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_history_issue_created_idx" ON "knight_hacks_issue_history" USING btree ("issue_id","created_at","id");--> statement-breakpoint
CREATE INDEX "issue_reminder_delivery_pending_idx" ON "knight_hacks_issue_reminder_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "knight_hacks_issue_archived_by_auth_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_due_at_idx" ON "knight_hacks_issue" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "issue_archive_idx" ON "knight_hacks_issue" USING btree ("archived_at","archive_batch_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "knight_hacks_issue_creation_key_unique" UNIQUE("creation_key");--> statement-breakpoint
ALTER TABLE "knight_hacks_template" ADD CONSTRAINT "knight_hacks_template_normalized_name_unique" UNIQUE("normalized_name");

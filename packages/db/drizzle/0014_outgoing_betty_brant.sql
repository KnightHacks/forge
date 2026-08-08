CREATE TYPE "public"."form_callback_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."form_kind" AS ENUM('general', 'event_feedback', 'system');--> statement-breakpoint
CREATE TYPE "public"."form_response_mode" AS ENUM('single_locked', 'single_editable', 'multiple_locked');--> statement-breakpoint
CREATE TYPE "public"."form_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "auth_roles" ADD COLUMN "event_feedback_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "auth_roles"
SET "event_feedback_excluded" = true
WHERE "name" IN (
	'Dev Team', 'Workshop Team', 'Sponsorship Team', 'Outreach Team',
	'Design Team', 'KH IX Team', 'President', 'Vice President', 'Treasurer',
	'Secretary', 'Hack Lead', 'Dev Lead', 'Officers', 'Design Director',
	'Sponsorship Director', 'Outreach Director', 'Workshop Director', 'Directors'
);--> statement-breakpoint
CREATE TABLE "knight_hacks_event_feedback_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"reward_points" integer DEFAULT 5 NOT NULL,
	"template_revision" integer DEFAULT 1 NOT NULL,
	"custom_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_event_feedback_config_eventId_unique" UNIQUE("event_id"),
	CONSTRAINT "knight_hacks_event_feedback_config_formId_unique" UNIQUE("form_id"),
	CONSTRAINT "knight_hacks_event_feedback_config_window_check" CHECK ("knight_hacks_event_feedback_config"."closes_at" > "knight_hacks_event_feedback_config"."opens_at"),
	CONSTRAINT "knight_hacks_event_feedback_config_reward_check" CHECK ("knight_hacks_event_feedback_config"."reward_points" = 5)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_event_feedback_reward" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"response_id" uuid,
	"points_awarded" integer DEFAULT 5 NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_event_feedback_reward_event_member_unique" UNIQUE("event_id","member_id"),
	CONSTRAINT "knight_hacks_event_feedback_reward_points_check" CHECK ("knight_hacks_event_feedback_reward"."points_awarded" = 5)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"response_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"object_name" varchar(512) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_form_attachment_objectName_unique" UNIQUE("object_name")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_callback_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"callback_slug" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"mappings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_form_callback_configuration_form_slug_unique" UNIQUE("form_id","callback_slug")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_callback_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration_id" uuid NOT NULL,
	"response_id" uuid,
	"callback_slug" varchar(255) NOT NULL,
	"input" jsonb NOT NULL,
	"status" "form_callback_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_section_edit_role" (
	"section_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_form_section_edit_role_section_id_role_id_pk" PRIMARY KEY("section_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_section_view_role" (
	"section_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_form_section_view_role_section_id_role_id_pk" PRIMARY KEY("section_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_single_response_claim" (
	"form_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_form_single_response_claim_form_id_user_id_pk" PRIMARY KEY("form_id","user_id"),
	CONSTRAINT "knight_hacks_form_single_response_claim_responseId_unique" UNIQUE("response_id")
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response" ADD COLUMN "form_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response" ADD COLUMN "response_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "kind" "form_kind" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "state" "form_state" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "opens_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "closes_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "manually_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "response_mode" "form_response_mode" DEFAULT 'single_locked' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
INSERT INTO "knight_hacks_form_sections" ("name", "order")
SELECT DISTINCT legacy_form."section", 0
FROM "knight_hacks_form_schemas" AS legacy_form
WHERE NOT EXISTS (
	SELECT 1
	FROM "knight_hacks_form_sections" AS existing_section
	WHERE existing_section."name" = legacy_form."section"
)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "knight_hacks_form_schemas" AS legacy_form
SET "section_id" = section_row."id",
	"state" = 'archived',
	"closes_at" = CURRENT_TIMESTAMP,
	"archived_at" = CURRENT_TIMESTAMP,
	"response_mode" = CASE
		WHEN EXISTS (
			SELECT 1 FROM "knight_hacks_trpc_form_connection" AS callback
			WHERE callback."form" = legacy_form."id"
		) THEN 'single_locked'::"form_response_mode"
		WHEN legacy_form."allow_resubmission" THEN 'multiple_locked'::"form_response_mode"
		WHEN legacy_form."allow_edit" THEN 'single_editable'::"form_response_mode"
		ELSE 'single_locked'::"form_response_mode"
	END
FROM "knight_hacks_form_sections" AS section_row
WHERE section_row."name" = legacy_form."section";--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ALTER COLUMN "section_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" DROP CONSTRAINT "knight_hacks_form_schemas_section_id_knight_hacks_form_sections_id_fk";--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD CONSTRAINT "knight_hacks_form_schemas_section_id_knight_hacks_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."knight_hacks_form_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "knight_hacks_form_section_view_role" ("section_id", "role_id")
SELECT "section_id", "role_id" FROM "knight_hacks_form_section_roles"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "knight_hacks_form_section_edit_role" ("section_id", "role_id")
SELECT "section_id", "role_id" FROM "knight_hacks_form_section_roles"
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "knight_hacks_form_response" AS response
SET "response_snapshot" = jsonb_build_object(
	'legacy', true,
	'formRevision', 1,
	'definition', form_schema."form_data"
)
FROM "knight_hacks_form_schemas" AS form_schema
WHERE form_schema."id" = response."form";--> statement-breakpoint
INSERT INTO "knight_hacks_form_single_response_claim"
	("form_id", "user_id", "response_id")
SELECT DISTINCT ON (response."form", response."user_id")
	response."form", response."user_id", response."id"
FROM "knight_hacks_form_response" AS response
JOIN "knight_hacks_form_schemas" AS form_schema ON form_schema."id" = response."form"
WHERE form_schema."response_mode" <> 'multiple_locked'
ORDER BY response."form", response."user_id", response."created_at", response."id"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "knight_hacks_form_sections" ("id", "name", "order")
VALUES ('15fd674e-16e4-4f41-a2c9-b0d337f39ea1', 'Event Feedback', 0)
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
WITH qualifying_event AS (
	SELECT event.*
	FROM "knight_hacks_event" AS event
	WHERE event."hackathon_id" IS NULL
		AND event."end_datetime" + INTERVAL '7 days' > CURRENT_TIMESTAMP
		AND NOT EXISTS (
			SELECT 1
			FROM "auth_roles" AS protected_role
			WHERE protected_role."event_feedback_excluded" = true
				AND protected_role."id"::text = ANY(event."roles")
		)
)
INSERT INTO "knight_hacks_form_schemas" (
	"id", "name", "slug_name", "kind", "state", "opens_at", "closes_at",
	"manually_closed", "response_mode", "published_at", "dues_only",
	"allow_resubmission", "allow_edit", "form_data", "form_validator_json",
	"section", "section_id", "is_closed"
)
SELECT
	gen_random_uuid(),
	event."name" || ' Feedback',
	'event-feedback-' || replace(event."id"::text, '-', ''),
	'event_feedback'::"form_kind",
	'published'::"form_state",
	event."end_datetime",
	event."end_datetime" + INTERVAL '7 days',
	false,
	'single_locked'::"form_response_mode",
	CURRENT_TIMESTAMP,
	false,
	false,
	false,
	jsonb_build_object(
		'title', event."name" || ' Feedback',
		'description', 'Tell us what worked and how we can improve future events.',
		'instructions', '[]'::jsonb,
		'questions', jsonb_build_array(
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000001', 'prompt', 'Overall', 'required', true, 'retired', false, 'type', 'linear_scale', 'min', 1, 'max', 5),
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000002', 'prompt', 'Fun', 'required', true, 'retired', false, 'type', 'linear_scale', 'min', 1, 'max', 5),
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000003', 'prompt', 'Learning', 'required', true, 'retired', false, 'type', 'linear_scale', 'min', 1, 'max', 5),
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000004', 'prompt', 'What worked?', 'required', false, 'retired', false, 'type', 'paragraph', 'maxLength', 2000),
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000005', 'prompt', 'What should improve?', 'required', false, 'retired', false, 'type', 'paragraph', 'maxLength', 2000),
			jsonb_build_object('id', 'f0a00000-0000-4000-8000-000000000006', 'prompt', 'How did you hear about this event?', 'required', true, 'retired', false, 'type', 'multiple_choice', 'optionSource', 'preset', 'presetCatalogId', 'EVENT_FEEDBACK_HEARD', 'manualOptions', '[]'::jsonb, 'allowOther', true)
		)
	),
	'{}'::jsonb,
	'Event Feedback',
	(SELECT section."id" FROM "knight_hacks_form_sections" AS section WHERE section."name" = 'Event Feedback'),
	false
FROM qualifying_event AS event
ON CONFLICT ("slug_name") DO NOTHING;--> statement-breakpoint
INSERT INTO "knight_hacks_event_feedback_config" (
	"event_id", "form_id", "opens_at", "closes_at", "reward_points",
	"template_revision", "custom_questions"
)
SELECT
	event."id",
	form."id",
	event."end_datetime",
	event."end_datetime" + INTERVAL '7 days',
	5,
	1,
	'[]'::jsonb
FROM "knight_hacks_event" AS event
JOIN "knight_hacks_form_schemas" AS form
	ON form."slug_name" = 'event-feedback-' || replace(event."id"::text, '-', '')
WHERE event."hackathon_id" IS NULL
	AND event."end_datetime" + INTERVAL '7 days' > CURRENT_TIMESTAMP
ON CONFLICT ("event_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_config" ADD CONSTRAINT "knight_hacks_event_feedback_config_event_id_knight_hacks_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."knight_hacks_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_config" ADD CONSTRAINT "knight_hacks_event_feedback_config_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_reward" ADD CONSTRAINT "knight_hacks_event_feedback_reward_event_id_knight_hacks_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."knight_hacks_event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_reward" ADD CONSTRAINT "knight_hacks_event_feedback_reward_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_reward" ADD CONSTRAINT "knight_hacks_event_feedback_reward_response_id_knight_hacks_form_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."knight_hacks_form_response"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_attachment" ADD CONSTRAINT "knight_hacks_form_attachment_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_attachment" ADD CONSTRAINT "knight_hacks_form_attachment_response_id_knight_hacks_form_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."knight_hacks_form_response"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_attachment" ADD CONSTRAINT "knight_hacks_form_attachment_owner_user_id_auth_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_callback_configuration" ADD CONSTRAINT "knight_hacks_form_callback_configuration_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_callback_execution" ADD CONSTRAINT "knight_hacks_form_callback_execution_configuration_id_knight_hacks_form_callback_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."knight_hacks_form_callback_configuration"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_callback_execution" ADD CONSTRAINT "knight_hacks_form_callback_execution_response_id_knight_hacks_form_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."knight_hacks_form_response"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_edit_role" ADD CONSTRAINT "knight_hacks_form_section_edit_role_section_id_knight_hacks_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."knight_hacks_form_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_edit_role" ADD CONSTRAINT "knight_hacks_form_section_edit_role_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_view_role" ADD CONSTRAINT "knight_hacks_form_section_view_role_section_id_knight_hacks_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."knight_hacks_form_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_view_role" ADD CONSTRAINT "knight_hacks_form_section_view_role_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_single_response_claim" ADD CONSTRAINT "knight_hacks_form_single_response_claim_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_single_response_claim" ADD CONSTRAINT "knight_hacks_form_single_response_claim_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_single_response_claim" ADD CONSTRAINT "knight_hacks_form_single_response_claim_response_id_knight_hacks_form_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."knight_hacks_form_response"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_form_attachment_form_idx" ON "knight_hacks_form_attachment" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_form_attachment_response_idx" ON "knight_hacks_form_attachment" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_form_callback_execution_status_available_idx" ON "knight_hacks_form_callback_execution" USING btree ("status","available_at");

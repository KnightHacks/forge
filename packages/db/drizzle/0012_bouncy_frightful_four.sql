CREATE TYPE "public"."event_discord_entity_type" AS ENUM('external', 'voice', 'stage');--> statement-breakpoint
CREATE TYPE "public"."event_google_destination" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TYPE "public"."event_sync_state" AS ENUM('pending', 'synced', 'error', 'unknown');--> statement-breakpoint
CREATE TABLE "knight_hacks_event_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"normalized_name" varchar(64) NOT NULL,
	"default_points" integer DEFAULT 0 NOT NULL,
	"color" varchar(7) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_event_tag_normalizedName_unique" UNIQUE("normalized_name"),
	CONSTRAINT "knight_hacks_event_tag_default_points_check" CHECK ("knight_hacks_event_tag"."default_points" >= 0),
	CONSTRAINT "knight_hacks_event_tag_color_check" CHECK ("knight_hacks_event_tag"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "discord_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "google_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "tag" SET DATA TYPE text USING "tag"::text;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "start_datetime" SET DATA TYPE timestamp with time zone USING "start_datetime" AT TIME ZONE 'America/New_York';--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "end_datetime" SET DATA TYPE timestamp with time zone USING "end_datetime" AT TIME ZONE 'America/New_York';--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "tag_color" varchar(7);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "legacy" boolean;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_sync_state" "event_sync_state";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_sync_state" "event_sync_state";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_last_error" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_last_error" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "deletion_intent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "creation_key" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "creation_payload_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "sync_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "sync_lease_token" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "sync_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "sync_lease_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_outbound_attempt_token" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_outbound_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_outbound_attempt_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_outbound_attempt_token" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_outbound_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_outbound_attempt_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_applied_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_applied_entity_type" "event_discord_entity_type";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_applied_channel_id" varchar(255);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_applied_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_applied_destination" "event_google_destination";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "google_applied_calendar_id" varchar(255);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "visibility_revision" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "visibility_dues_paying" boolean;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "visibility_roles" varchar(255)[];--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "visibility_internal" boolean;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_no_projection_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "discord_no_projection_acknowledged_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD COLUMN "checked_in_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD COLUMN "points_awarded" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD COLUMN "points_awarded_estimated" boolean;--> statement-breakpoint
INSERT INTO "knight_hacks_event_tag" ("name", "normalized_name", "default_points", "color", "active") VALUES
	('GBM', 'gbm', 35, '#2563EB', true),
	('Social', 'social', 25, '#DB2777', true),
	('Kickstart', 'kickstart', 25, '#16A34A', true),
	('Project Launch', 'project launch', 25, '#9333EA', true),
	('Hello World', 'hello world', 25, '#CA8A04', true),
	('Sponsorship', 'sponsorship', 50, '#EA580C', true),
	('Tech Exploration', 'tech exploration', 25, '#0891B2', true),
	('Class Support', 'class support', 25, '#4F46E5', true),
	('Workshop', 'workshop', 25, '#0D9488', true),
	('OPS', 'ops', 20, '#7E22CE', true),
	('Collabs', 'collabs', 40, '#DC2626', true),
	('Check-in', 'check-in', 5, '#4B5563', true),
	('Merch', 'merch', 5, '#65A30D', true),
	('Food', 'food', 5, '#E11D48', true),
	('Ceremony', 'ceremony', 50, '#D97706', true),
	('CAREER-FAIR', 'career-fair', 100, '#4D7C0F', true),
	('RSO-FAIR', 'rso-fair', 50, '#84CC16', true);--> statement-breakpoint
UPDATE "knight_hacks_event" AS "event"
SET "tag_color" = "tag"."color"
FROM "knight_hacks_event_tag" AS "tag"
WHERE "tag"."name" = "event"."tag";--> statement-breakpoint
UPDATE "knight_hacks_event"
SET
	"legacy" = true,
	"discord_sync_state" = NULL,
	"google_sync_state" = NULL,
	"discord_last_error" = NULL,
	"google_last_error" = NULL,
	"published_at" = NULL,
	"deletion_intent_at" = NULL,
	"creation_key" = NULL,
	"creation_payload_hash" = NULL,
	"sync_revision" = 0,
	"sync_lease_token" = NULL,
	"sync_lease_expires_at" = NULL,
	"sync_lease_revision" = NULL,
	"discord_outbound_attempt_token" = NULL,
	"discord_outbound_attempted_at" = NULL,
	"discord_outbound_attempt_revision" = NULL,
	"google_outbound_attempt_token" = NULL,
	"google_outbound_attempted_at" = NULL,
	"google_outbound_attempt_revision" = NULL,
	"discord_applied_revision" = NULL,
	"discord_applied_entity_type" = NULL,
	"discord_applied_channel_id" = NULL,
	"google_applied_revision" = NULL,
	"google_applied_destination" = NULL,
	"google_applied_calendar_id" = NULL,
	"visibility_revision" = NULL,
	"visibility_dues_paying" = NULL,
	"visibility_roles" = NULL,
	"visibility_internal" = NULL,
	"discord_no_projection_acknowledged_at" = NULL,
	"discord_no_projection_acknowledged_by" = NULL;--> statement-breakpoint
UPDATE "knight_hacks_event_attendee" AS "attendance"
SET
	"points_awarded" = COALESCE(
		"event"."points",
		CASE "event"."tag"
			WHEN 'GBM' THEN 35
			WHEN 'Social' THEN 25
			WHEN 'Kickstart' THEN 25
			WHEN 'Project Launch' THEN 25
			WHEN 'Hello World' THEN 25
			WHEN 'Sponsorship' THEN 50
			WHEN 'Tech Exploration' THEN 25
			WHEN 'Class Support' THEN 25
			WHEN 'Workshop' THEN 25
			WHEN 'OPS' THEN 20
			WHEN 'Collabs' THEN 40
			WHEN 'Check-in' THEN 5
			WHEN 'Merch' THEN 5
			WHEN 'Food' THEN 5
			WHEN 'Ceremony' THEN 50
			WHEN 'CAREER-FAIR' THEN 100
			WHEN 'RSO-FAIR' THEN 50
			ELSE NULL
		END
	),
	"points_awarded_estimated" = true
FROM "knight_hacks_event" AS "event"
WHERE "attendance"."event_id" = "event"."id";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "knight_hacks_event" WHERE "tag_color" IS NULL) THEN
		RAISE EXCEPTION 'Event tag-color backfill was incomplete.';
	END IF;
	IF EXISTS (SELECT 1 FROM "knight_hacks_event" WHERE "legacy" IS NULL OR "sync_revision" IS NULL) THEN
		RAISE EXCEPTION 'Event legacy metadata backfill was incomplete.';
	END IF;
	IF EXISTS (SELECT 1 FROM "knight_hacks_event_attendee" WHERE "points_awarded_estimated" IS NULL) THEN
		RAISE EXCEPTION 'Event attendance estimate metadata backfill was incomplete.';
	END IF;
END $$;--> statement-breakpoint
DO $$
DECLARE
	duplicate_groups integer;
BEGIN
	SELECT count(*) INTO duplicate_groups
	FROM (
		SELECT "member_id", "event_id"
		FROM "knight_hacks_event_attendee"
		GROUP BY "member_id", "event_id"
		HAVING count(*) > 1
	) AS duplicates;
	IF duplicate_groups > 0 THEN
		RAISE NOTICE 'Detected % duplicate event attendance member/event groups; rows were preserved.', duplicate_groups;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "tag_color" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "legacy" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "legacy" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "discord_sync_state" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "google_sync_state" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "sync_revision" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "sync_revision" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ALTER COLUMN "points_awarded_estimated" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ALTER COLUMN "points_awarded_estimated" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_discord_no_projection_acknowledged_by_auth_user_id_fk" FOREIGN KEY ("discord_no_projection_acknowledged_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD CONSTRAINT "knight_hacks_event_attendee_checked_in_by_auth_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_event_start_datetime_idx" ON "knight_hacks_event" USING btree ("start_datetime");--> statement-breakpoint
CREATE INDEX "knight_hacks_event_hackathon_id_idx" ON "knight_hacks_event" USING btree ("hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_creationKey_unique" UNIQUE("creation_key");--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_tag_color_check" CHECK ("knight_hacks_event"."tag_color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_sync_revision_check" CHECK ("knight_hacks_event"."sync_revision" >= 0);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_new_club_points_check" CHECK ("knight_hacks_event"."legacy" OR "knight_hacks_event"."hackathon_id" IS NOT NULL OR ("knight_hacks_event"."points" IS NOT NULL AND "knight_hacks_event"."points" >= 0));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_nonlegacy_sync_states_check" CHECK ("knight_hacks_event"."legacy" OR ("knight_hacks_event"."discord_sync_state" IS NOT NULL AND "knight_hacks_event"."google_sync_state" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_creation_identity_pair_check" CHECK (("knight_hacks_event"."creation_key" IS NULL) = ("knight_hacks_event"."creation_payload_hash" IS NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_new_club_creation_identity_check" CHECK ("knight_hacks_event"."legacy" OR "knight_hacks_event"."hackathon_id" IS NOT NULL OR ("knight_hacks_event"."creation_key" IS NOT NULL AND "knight_hacks_event"."creation_payload_hash" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_sync_lease_set_check" CHECK (("knight_hacks_event"."sync_lease_token" IS NULL AND "knight_hacks_event"."sync_lease_expires_at" IS NULL AND "knight_hacks_event"."sync_lease_revision" IS NULL) OR ("knight_hacks_event"."sync_lease_token" IS NOT NULL AND "knight_hacks_event"."sync_lease_expires_at" IS NOT NULL AND "knight_hacks_event"."sync_lease_revision" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_discord_attempt_set_check" CHECK (("knight_hacks_event"."discord_outbound_attempt_token" IS NULL AND "knight_hacks_event"."discord_outbound_attempted_at" IS NULL AND "knight_hacks_event"."discord_outbound_attempt_revision" IS NULL) OR ("knight_hacks_event"."discord_outbound_attempt_token" IS NOT NULL AND "knight_hacks_event"."discord_outbound_attempted_at" IS NOT NULL AND "knight_hacks_event"."discord_outbound_attempt_revision" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_google_attempt_set_check" CHECK (("knight_hacks_event"."google_outbound_attempt_token" IS NULL AND "knight_hacks_event"."google_outbound_attempted_at" IS NULL AND "knight_hacks_event"."google_outbound_attempt_revision" IS NULL) OR ("knight_hacks_event"."google_outbound_attempt_token" IS NOT NULL AND "knight_hacks_event"."google_outbound_attempted_at" IS NOT NULL AND "knight_hacks_event"."google_outbound_attempt_revision" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_visibility_set_check" CHECK (("knight_hacks_event"."visibility_revision" IS NULL AND "knight_hacks_event"."visibility_dues_paying" IS NULL AND "knight_hacks_event"."visibility_roles" IS NULL AND "knight_hacks_event"."visibility_internal" IS NULL) OR ("knight_hacks_event"."visibility_revision" IS NOT NULL AND "knight_hacks_event"."visibility_dues_paying" IS NOT NULL AND "knight_hacks_event"."visibility_roles" IS NOT NULL AND "knight_hacks_event"."visibility_internal" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_visibility_revision_check" CHECK ("knight_hacks_event"."visibility_revision" IS NULL OR "knight_hacks_event"."visibility_revision" <= "knight_hacks_event"."sync_revision");--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_discord_applied_revision_check" CHECK ("knight_hacks_event"."discord_applied_revision" IS NULL OR "knight_hacks_event"."discord_applied_revision" <= "knight_hacks_event"."sync_revision");--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_google_applied_revision_check" CHECK ("knight_hacks_event"."google_applied_revision" IS NULL OR "knight_hacks_event"."google_applied_revision" <= "knight_hacks_event"."sync_revision");--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_discord_synced_state_check" CHECK ("knight_hacks_event"."discord_sync_state" IS DISTINCT FROM 'synced' OR ("knight_hacks_event"."discord_id" IS NOT NULL AND "knight_hacks_event"."discord_applied_revision" IS NOT NULL AND "knight_hacks_event"."discord_applied_revision" = "knight_hacks_event"."sync_revision" AND "knight_hacks_event"."discord_applied_entity_type" IS NOT NULL AND (("knight_hacks_event"."discord_applied_entity_type" = 'external' AND "knight_hacks_event"."discord_applied_channel_id" IS NULL) OR ("knight_hacks_event"."discord_applied_entity_type" IN ('voice', 'stage') AND "knight_hacks_event"."discord_applied_channel_id" IS NOT NULL))));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_google_synced_state_check" CHECK ("knight_hacks_event"."google_sync_state" IS DISTINCT FROM 'synced' OR ("knight_hacks_event"."google_id" IS NOT NULL AND "knight_hacks_event"."google_applied_revision" IS NOT NULL AND "knight_hacks_event"."google_applied_revision" = "knight_hacks_event"."sync_revision" AND "knight_hacks_event"."google_applied_destination" IS NOT NULL AND "knight_hacks_event"."google_applied_calendar_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_published_visibility_check" CHECK ("knight_hacks_event"."published_at" IS NULL OR ("knight_hacks_event"."visibility_revision" IS NOT NULL AND "knight_hacks_event"."visibility_dues_paying" IS NOT NULL AND "knight_hacks_event"."visibility_roles" IS NOT NULL AND "knight_hacks_event"."visibility_internal" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_discord_acknowledgement_time_check" CHECK ("knight_hacks_event"."discord_no_projection_acknowledged_by" IS NULL OR "knight_hacks_event"."discord_no_projection_acknowledged_at" IS NOT NULL);--> statement-breakpoint
DROP TYPE "public"."event_tag";

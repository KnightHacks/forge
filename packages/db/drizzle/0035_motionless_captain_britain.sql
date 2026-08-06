CREATE TYPE "public"."event_publication_work_state" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."hackathon_event_publication_provider" AS ENUM('discord', 'google');--> statement-breakpoint
CREATE TYPE "public"."hacker_agreement_provenance" AS ENUM('explicit', 'legacy_unversioned');--> statement-breakpoint
CREATE TYPE "public"."hacker_agreement_stage" AS ENUM('application', 'confirmation');--> statement-breakpoint
CREATE TYPE "public"."hacker_participant_command_state" AS ENUM('started', 'completed');--> statement-breakpoint
ALTER TYPE "public"."event_sync_state" ADD VALUE 'disabled' BEFORE 'pending';--> statement-breakpoint
CREATE TABLE "knight_hacks_event_publication_work" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"provider" "hackathon_event_publication_provider" NOT NULL,
	"target_enabled" boolean NOT NULL,
	"event_revision" integer NOT NULL,
	"publication_revision" integer NOT NULL,
	"state" "event_publication_work_state" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"last_attempt_at" timestamp with time zone,
	"last_error" varchar(500),
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_event_publication_work_event_provider_unique" UNIQUE("event_id","provider"),
	CONSTRAINT "knight_hacks_event_publication_work_attempt_count_check" CHECK ("knight_hacks_event_publication_work"."attempt_count" >= 0),
	CONSTRAINT "knight_hacks_event_publication_work_revisions_check" CHECK ("knight_hacks_event_publication_work"."event_revision" >= 1 AND "knight_hacks_event_publication_work"."publication_revision" >= 1),
	CONSTRAINT "knight_hacks_event_publication_work_lease_pair_check" CHECK (("knight_hacks_event_publication_work"."lease_token" IS NULL) = ("knight_hacks_event_publication_work"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_agreement_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"stage" "hacker_agreement_stage" NOT NULL,
	"key" varchar(64) NOT NULL,
	"version" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"legal_text" text,
	"url" text,
	"required" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "knight_hacks_hackathon_agreement_definition_version_unique" UNIQUE("hackathon_id","stage","key","version"),
	CONSTRAINT "knight_hacks_hackathon_agreement_definition_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_hackathon_agreement_definition_content_check" CHECK ("knight_hacks_hackathon_agreement_definition"."legal_text" IS NOT NULL OR "knight_hacks_hackathon_agreement_definition"."url" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_event_publication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"provider" "hackathon_event_publication_provider" NOT NULL,
	"desired_enabled" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" uuid,
	"last_reconciled_at" timestamp with time zone,
	"last_converged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_event_publication_provider_unique" UNIQUE("hackathon_id","provider"),
	CONSTRAINT "knight_hacks_hackathon_event_publication_id_scope_unique" UNIQUE("id","hackathon_id","provider"),
	CONSTRAINT "knight_hacks_hackathon_event_publication_revision_check" CHECK ("knight_hacks_hackathon_event_publication"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_portal_authorization_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_client_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"better_auth_session_id" text NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"code_challenge" varchar(128) NOT NULL,
	"code_challenge_method" varchar(8) DEFAULT 'S256' NOT NULL,
	"redirect_uri" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_hash_unique" UNIQUE("code_hash"),
	CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_hash_check" CHECK ("knight_hacks_hackathon_portal_authorization_code"."code_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_method_check" CHECK ("knight_hacks_hackathon_portal_authorization_code"."code_challenge_method" = 'S256')
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_portal_client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"client_id" varchar(128) NOT NULL,
	"name" varchar(120) NOT NULL,
	"production_origin" varchar(2048) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "knight_hacks_hackathon_portal_client_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "knight_hacks_hackathon_portal_client_hackathon_unique" UNIQUE("hackathon_id"),
	CONSTRAINT "knight_hacks_hackathon_portal_client_origin_unique" UNIQUE("production_origin"),
	CONSTRAINT "knight_hacks_hackathon_portal_client_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_hackathon_portal_client_origin_check" CHECK ("knight_hacks_hackathon_portal_client"."production_origin" ~ '^https://[a-z0-9-]+([.][a-z0-9-]+)*[.]knighthacks[.]org$')
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_portal_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_client_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"better_auth_session_id" text NOT NULL,
	"access_token_hash" varchar(64) NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"refresh_version" integer DEFAULT 1 NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_portal_session_access_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "knight_hacks_hackathon_portal_session_refresh_hash_unique" UNIQUE("refresh_token_hash"),
	CONSTRAINT "knight_hacks_hackathon_portal_session_access_hash_check" CHECK ("knight_hacks_hackathon_portal_session"."access_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hackathon_portal_session_refresh_hash_check" CHECK ("knight_hacks_hackathon_portal_session"."refresh_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hackathon_portal_session_refresh_version_check" CHECK ("knight_hacks_hackathon_portal_session"."refresh_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_agreement_acceptance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"agreement_definition_id" uuid NOT NULL,
	"accepted" boolean NOT NULL,
	"provenance" "hacker_agreement_provenance" DEFAULT 'explicit' NOT NULL,
	"accepted_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hacker_agreement_acceptance_attendee_definition_unique" UNIQUE("attendee_id","agreement_definition_id"),
	CONSTRAINT "knight_hacks_hacker_agreement_acceptance_timestamp_check" CHECK (("knight_hacks_hacker_agreement_acceptance"."accepted" = true AND "knight_hacks_hacker_agreement_acceptance"."accepted_at" IS NOT NULL) OR ("knight_hacks_hacker_agreement_acceptance"."accepted" = false AND "knight_hacks_hacker_agreement_acceptance"."accepted_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_check_in_pass" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "knight_hacks_hacker_check_in_pass_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "knight_hacks_hacker_check_in_pass_token_hash_check" CHECK ("knight_hacks_hacker_check_in_pass"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hacker_check_in_pass_version_check" CHECK ("knight_hacks_hacker_check_in_pass"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_participant_command" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"operation" varchar(64) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"state" "hacker_participant_command_state" DEFAULT 'started' NOT NULL,
	"result" jsonb,
	"safe_error_code" varchar(64),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "knight_hacks_hacker_participant_command_identity_unique" UNIQUE("user_id","hackathon_id","operation","idempotency_key"),
	CONSTRAINT "knight_hacks_hacker_participant_command_payload_hash_check" CHECK ("knight_hacks_hacker_participant_command"."payload_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hacker_participant_command_completion_check" CHECK (("knight_hacks_hacker_participant_command"."state" = 'started' AND "knight_hacks_hacker_participant_command"."completed_at" IS NULL) OR ("knight_hacks_hacker_participant_command"."state" <> 'started' AND "knight_hacks_hacker_participant_command"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"gender" "gender" NOT NULL,
	"discord_user" varchar(255) NOT NULL,
	"country" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"school" text NOT NULL,
	"level_of_study" text NOT NULL,
	"major" text NOT NULL,
	"race_or_ethnicity" "race_or_ethnicity" NOT NULL,
	"shirt_size" "shirt_size" NOT NULL,
	"github_profile_url" varchar(255),
	"linkedin_profile_url" varchar(255),
	"website_url" varchar(255),
	"resume_url" varchar(255),
	"dob" date NOT NULL,
	"grad_date" date NOT NULL,
	"food_allergies" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hacker_profile_user_unique" UNIQUE("user_id"),
	CONSTRAINT "knight_hacks_hacker_profile_revision_check" CHECK ("knight_hacks_hacker_profile"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_profile_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"legacy_hacker_id" uuid,
	"revision" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"gender" "gender" NOT NULL,
	"discord_user" varchar(255) NOT NULL,
	"country" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"school" text NOT NULL,
	"level_of_study" text NOT NULL,
	"major" text NOT NULL,
	"race_or_ethnicity" "race_or_ethnicity" NOT NULL,
	"shirt_size" "shirt_size" NOT NULL,
	"github_profile_url" varchar(255),
	"linkedin_profile_url" varchar(255),
	"website_url" varchar(255),
	"resume_url" varchar(255),
	"dob" date NOT NULL,
	"grad_date" date NOT NULL,
	"food_allergies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "knight_hacks_hacker_profile_revision_legacyHackerId_unique" UNIQUE("legacy_hacker_id"),
	CONSTRAINT "knight_hacks_hacker_profile_revision_profile_version_unique" UNIQUE("profile_id","revision"),
	CONSTRAINT "knight_hacks_hacker_profile_revision_id_profile_unique" UNIQUE("id","profile_id"),
	CONSTRAINT "knight_hacks_hacker_profile_revision_version_check" CHECK ("knight_hacks_hacker_profile_revision"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_event_reminder_delivery" ALTER COLUMN "discord_event_id_snapshot" DROP NOT NULL;--> statement-breakpoint
-- Another in-flight Forge worktree introduced this additive field first in
-- the shared development database. Keep the migration safe across that
-- mixed-version overlap; the schema and final constraint remain identical.
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN IF NOT EXISTS "confirmation_capacity" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "timezone" varchar(64) DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "profile_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "survey1" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "survey2" text;--> statement-breakpoint
DO $$
DECLARE
  duplicate_rows jsonb;
  orphan_rows jsonb;
  missing_user_rows jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(problem))
  INTO duplicate_rows
  FROM (
    SELECT
      hacker."user_id",
      attendee."hackathon_id",
      array_agg(attendee."id" ORDER BY attendee."id") AS attendee_ids,
      array_agg(attendee."hacker_id" ORDER BY attendee."hacker_id") AS hacker_ids
    FROM "knight_hacks_hacker_attendee" AS attendee
    JOIN "knight_hacks_hacker" AS hacker ON hacker."id" = attendee."hacker_id"
    GROUP BY hacker."user_id", attendee."hackathon_id"
    HAVING count(*) > 1
  ) AS problem;

  SELECT jsonb_agg(row_to_json(problem))
  INTO orphan_rows
  FROM (
    SELECT attendee."id" AS attendee_id, attendee."hacker_id", attendee."hackathon_id"
    FROM "knight_hacks_hacker_attendee" AS attendee
    LEFT JOIN "knight_hacks_hacker" AS hacker ON hacker."id" = attendee."hacker_id"
    WHERE hacker."id" IS NULL
  ) AS problem;

  SELECT jsonb_agg(row_to_json(problem))
  INTO missing_user_rows
  FROM (
    SELECT hacker."id" AS hacker_id, hacker."user_id"
    FROM "knight_hacks_hacker" AS hacker
    LEFT JOIN "auth_user" AS app_user ON app_user."id" = hacker."user_id"
    WHERE app_user."id" IS NULL
  ) AS problem;

  IF duplicate_rows IS NOT NULL OR orphan_rows IS NOT NULL OR missing_user_rows IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Hacker SDK migration preflight failed. Repair duplicate applications, orphan attendees, or missing users before retrying migration 0035.',
      DETAIL = jsonb_build_object(
        'duplicateApplications', coalesce(duplicate_rows, '[]'::jsonb),
        'orphanAttendees', coalesce(orphan_rows, '[]'::jsonb),
        'missingUsers', coalesce(missing_user_rows, '[]'::jsonb)
      )::text;
  END IF;
END $$;--> statement-breakpoint
WITH ranked_hackers AS (
  SELECT
    hacker.*,
    count(*) OVER (PARTITION BY hacker."user_id")::integer AS revision_count,
    row_number() OVER (
      PARTITION BY hacker."user_id"
      ORDER BY hacker."date_created" DESC, hacker."time_created" DESC, hacker."id" DESC
    ) AS current_rank
  FROM "knight_hacks_hacker" AS hacker
)
INSERT INTO "knight_hacks_hacker_profile" (
  "id", "user_id", "first_name", "last_name", "gender", "discord_user",
  "country", "email", "phone_number", "school", "level_of_study", "major",
  "race_or_ethnicity", "shirt_size", "github_profile_url",
  "linkedin_profile_url", "website_url", "resume_url", "dob", "grad_date",
  "food_allergies", "revision", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), ranked."user_id", ranked."first_name", ranked."last_name",
  ranked."gender", ranked."discord_user", ranked."country", ranked."email",
  ranked."phone_number", ranked."school", ranked."level_of_study", ranked."major",
  ranked."race_or_ethnicity", ranked."shirt_size", ranked."github_profile_url",
  ranked."linkedin_profile_url", ranked."website_url", ranked."resume_url",
  ranked."dob", ranked."grad_date", ranked."food_allergies", ranked.revision_count,
  ranked."date_created"::timestamp + ranked."time_created",
  ranked."date_created"::timestamp + ranked."time_created"
FROM ranked_hackers AS ranked
WHERE ranked.current_rank = 1;--> statement-breakpoint
WITH ordered_hackers AS (
  SELECT
    hacker.*,
    row_number() OVER (
      PARTITION BY hacker."user_id"
      ORDER BY hacker."date_created", hacker."time_created", hacker."id"
    )::integer AS revision_number
  FROM "knight_hacks_hacker" AS hacker
)
INSERT INTO "knight_hacks_hacker_profile_revision" (
  "id", "profile_id", "legacy_hacker_id", "revision", "first_name", "last_name",
  "gender", "discord_user", "country", "email", "phone_number", "school",
  "level_of_study", "major", "race_or_ethnicity", "shirt_size",
  "github_profile_url", "linkedin_profile_url", "website_url", "resume_url",
  "dob", "grad_date", "food_allergies", "created_at", "created_by"
)
SELECT
  gen_random_uuid(), profile."id", ordered."id", ordered.revision_number,
  ordered."first_name", ordered."last_name", ordered."gender", ordered."discord_user",
  ordered."country", ordered."email", ordered."phone_number", ordered."school",
  ordered."level_of_study", ordered."major", ordered."race_or_ethnicity",
  ordered."shirt_size", ordered."github_profile_url", ordered."linkedin_profile_url",
  ordered."website_url", ordered."resume_url", ordered."dob", ordered."grad_date",
  ordered."food_allergies", ordered."date_created"::timestamp + ordered."time_created",
  ordered."user_id"
FROM ordered_hackers AS ordered
JOIN "knight_hacks_hacker_profile" AS profile ON profile."user_id" = ordered."user_id";--> statement-breakpoint
UPDATE "knight_hacks_hacker_attendee" AS attendee
SET
  "profile_id" = revision."profile_id",
  "profile_revision_id" = revision."id",
  "survey1" = hacker."survey_1",
  "survey2" = hacker."survey_2"
FROM "knight_hacks_hacker_profile_revision" AS revision
JOIN "knight_hacks_hacker" AS hacker ON hacker."id" = revision."legacy_hacker_id"
WHERE attendee."hacker_id" = hacker."id";--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_agreement_definition" (
  "id", "hackathon_id", "stage", "key", "version", "title", "legal_text",
  "required", "active", "created_at"
)
SELECT
  gen_random_uuid(), hackathon."id", 'application', agreement."key",
  'legacy_unversioned', agreement."title", 'Legacy unversioned agreement evidence.',
  agreement."required", false, now()
FROM "knight_hacks_hackathon" AS hackathon
CROSS JOIN (
  VALUES
    ('mlh_marketing', 'MLH marketing email consent', false),
    ('mlh_code_of_conduct', 'MLH code of conduct', true),
    ('mlh_data_sharing', 'MLH data sharing', true)
) AS agreement("key", "title", "required")
WHERE EXISTS (
  SELECT 1 FROM "knight_hacks_hacker_attendee" AS attendee
  WHERE attendee."hackathon_id" = hackathon."id"
);--> statement-breakpoint
INSERT INTO "knight_hacks_hacker_agreement_acceptance" (
  "id", "attendee_id", "hackathon_id", "agreement_definition_id", "accepted",
  "provenance", "accepted_at", "recorded_at"
)
SELECT
  gen_random_uuid(), attendee."id", attendee."hackathon_id", definition."id", true,
  'legacy_unversioned', attendee."time_applied", attendee."time_applied"
FROM "knight_hacks_hacker_attendee" AS attendee
JOIN "knight_hacks_hacker" AS hacker ON hacker."id" = attendee."hacker_id"
JOIN "knight_hacks_hackathon_agreement_definition" AS definition
  ON definition."hackathon_id" = attendee."hackathon_id"
  AND definition."version" = 'legacy_unversioned'
WHERE
  (definition."key" = 'mlh_marketing' AND hacker."agrees_to_receive_emails_from_mlh" = true)
  OR (definition."key" = 'mlh_code_of_conduct' AND hacker."agrees_to_mlh_code_of_conduct" = true)
  OR (definition."key" = 'mlh_data_sharing' AND hacker."agrees_to_mlh_data_sharing" = true);--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_event_publication" (
  "id", "hackathon_id", "provider", "desired_enabled", "revision",
  "requested_at", "last_reconciled_at", "last_converged_at", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), hackathon."id", provider."name",
  EXISTS (
    SELECT 1 FROM "knight_hacks_event" AS event
    WHERE event."hackathon_id" = hackathon."id" AND event."legacy" = false
  ),
  1, now(), now(),
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "knight_hacks_event" AS event
      WHERE event."hackathon_id" = hackathon."id" AND event."legacy" = false
    ) AND NOT EXISTS (
      SELECT 1 FROM "knight_hacks_event" AS event
      WHERE event."hackathon_id" = hackathon."id" AND event."legacy" = false
      AND CASE provider."name"
        WHEN 'discord' THEN event."discord_sync_state" IS DISTINCT FROM 'synced'
        ELSE event."google_sync_state" IS DISTINCT FROM 'synced'
      END
    ) THEN now()
    ELSE NULL
  END,
  now(), now()
FROM "knight_hacks_hackathon" AS hackathon
CROSS JOIN (VALUES ('discord'::hackathon_event_publication_provider), ('google'::hackathon_event_publication_provider)) AS provider("name");--> statement-breakpoint
INSERT INTO "knight_hacks_event_publication_work" (
  "id", "publication_id", "event_id", "hackathon_id", "provider",
  "target_enabled", "event_revision", "publication_revision", "state",
  "attempt_count", "next_attempt_at", "last_error", "completed_at",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), publication."id", event."id", event."hackathon_id",
  publication."provider", true, event."sync_revision", publication."revision",
  CASE
    WHEN CASE publication."provider"
      WHEN 'discord' THEN event."discord_sync_state"
      ELSE event."google_sync_state"
    END = 'synced' THEN 'succeeded'::event_publication_work_state
    WHEN CASE publication."provider"
      WHEN 'discord' THEN event."discord_sync_state"
      ELSE event."google_sync_state"
    END = 'unknown' THEN 'blocked'::event_publication_work_state
    WHEN CASE publication."provider"
      WHEN 'discord' THEN event."discord_sync_state"
      ELSE event."google_sync_state"
    END = 'error' THEN 'failed'::event_publication_work_state
    ELSE 'pending'::event_publication_work_state
  END,
  0,
  CASE
    WHEN CASE publication."provider"
      WHEN 'discord' THEN event."discord_sync_state"
      ELSE event."google_sync_state"
    END IN ('synced', 'unknown') THEN NULL
    ELSE now()
  END,
  CASE publication."provider"
    WHEN 'discord' THEN event."discord_last_error"
    ELSE event."google_last_error"
  END,
  CASE
    WHEN CASE publication."provider"
      WHEN 'discord' THEN event."discord_sync_state"
      ELSE event."google_sync_state"
    END = 'synced' THEN now()
    ELSE NULL
  END,
  now(), now()
FROM "knight_hacks_event" AS event
JOIN "knight_hacks_hackathon_event_publication" AS publication
  ON publication."hackathon_id" = event."hackathon_id"
WHERE event."legacy" = false;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_publication_work" ADD CONSTRAINT "knight_hacks_event_publication_work_scoped_publication_fk" FOREIGN KEY ("publication_id","hackathon_id","provider") REFERENCES "public"."knight_hacks_hackathon_event_publication"("id","hackathon_id","provider") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_publication_work" ADD CONSTRAINT "knight_hacks_event_publication_work_scoped_event_fk" FOREIGN KEY ("event_id","hackathon_id") REFERENCES "public"."knight_hacks_event"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_agreement_definition" ADD CONSTRAINT "knight_hacks_hackathon_agreement_definition_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_agreement_definition" ADD CONSTRAINT "knight_hacks_hackathon_agreement_definition_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_event_publication" ADD CONSTRAINT "knight_hacks_hackathon_event_publication_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_event_publication" ADD CONSTRAINT "knight_hacks_hackathon_event_publication_requested_by_auth_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_authorization_code" ADD CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_authorization_code" ADD CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_better_auth_session_id_auth_session_id_fk" FOREIGN KEY ("better_auth_session_id") REFERENCES "public"."auth_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_authorization_code" ADD CONSTRAINT "knight_hacks_hackathon_portal_authorization_code_scoped_client_fk" FOREIGN KEY ("portal_client_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_portal_client"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_client" ADD CONSTRAINT "knight_hacks_hackathon_portal_client_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_client" ADD CONSTRAINT "knight_hacks_hackathon_portal_client_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_session" ADD CONSTRAINT "knight_hacks_hackathon_portal_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_session" ADD CONSTRAINT "knight_hacks_hackathon_portal_session_better_auth_session_id_auth_session_id_fk" FOREIGN KEY ("better_auth_session_id") REFERENCES "public"."auth_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_session" ADD CONSTRAINT "knight_hacks_hackathon_portal_session_scoped_client_fk" FOREIGN KEY ("portal_client_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_portal_client"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_agreement_acceptance" ADD CONSTRAINT "knight_hacks_hacker_agreement_acceptance_scoped_attendee_fk" FOREIGN KEY ("attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_agreement_acceptance" ADD CONSTRAINT "knight_hacks_hacker_agreement_acceptance_scoped_definition_fk" FOREIGN KEY ("agreement_definition_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_agreement_definition"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_pass" ADD CONSTRAINT "knight_hacks_hacker_check_in_pass_scoped_attendee_fk" FOREIGN KEY ("attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_participant_command" ADD CONSTRAINT "knight_hacks_hacker_participant_command_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_participant_command" ADD CONSTRAINT "knight_hacks_hacker_participant_command_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_profile" ADD CONSTRAINT "knight_hacks_hacker_profile_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_profile_revision" ADD CONSTRAINT "knight_hacks_hacker_profile_revision_profile_id_knight_hacks_hacker_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."knight_hacks_hacker_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_profile_revision" ADD CONSTRAINT "knight_hacks_hacker_profile_revision_legacy_hacker_id_knight_hacks_hacker_id_fk" FOREIGN KEY ("legacy_hacker_id") REFERENCES "public"."knight_hacks_hacker"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_profile_revision" ADD CONSTRAINT "knight_hacks_hacker_profile_revision_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_event_publication_work_due_idx" ON "knight_hacks_event_publication_work" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_event_publication_work_health_idx" ON "knight_hacks_event_publication_work" USING btree ("hackathon_id","provider","state");--> statement-breakpoint
CREATE INDEX "knight_hacks_event_publication_work_lease_expiry_idx" ON "knight_hacks_event_publication_work" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_hackathon_agreement_definition_active_unique" ON "knight_hacks_hackathon_agreement_definition" USING btree ("hackathon_id","stage","key") WHERE "knight_hacks_hackathon_agreement_definition"."active" = true;--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_authorization_code_expiry_idx" ON "knight_hacks_hackathon_portal_authorization_code" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_authorization_code_client_expiry_idx" ON "knight_hacks_hackathon_portal_authorization_code" USING btree ("portal_client_id","expires_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_session_access_expiry_idx" ON "knight_hacks_hackathon_portal_session" USING btree ("access_expires_at","revoked_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_session_refresh_expiry_idx" ON "knight_hacks_hackathon_portal_session" USING btree ("refresh_expires_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_session_user_client_idx" ON "knight_hacks_hackathon_portal_session" USING btree ("user_id","portal_client_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_agreement_acceptance_attendee_idx" ON "knight_hacks_hacker_agreement_acceptance" USING btree ("attendee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_hacker_check_in_pass_active_attendee_unique" ON "knight_hacks_hacker_check_in_pass" USING btree ("attendee_id") WHERE "knight_hacks_hacker_check_in_pass"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_check_in_pass_attendee_idx" ON "knight_hacks_hacker_check_in_pass" USING btree ("attendee_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_participant_command_expiry_idx" ON "knight_hacks_hacker_participant_command" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_profile_revision_profile_created_idx" ON "knight_hacks_hacker_profile_revision" USING btree ("profile_id","created_at");--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_profile_id_knight_hacks_hacker_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."knight_hacks_hacker_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_scoped_profile_revision_fk" FOREIGN KEY ("profile_revision_id","profile_id") REFERENCES "public"."knight_hacks_hacker_profile_revision"("id","profile_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_hacker_attendee_profile_hackathon_unique" ON "knight_hacks_hacker_attendee" USING btree ("profile_id","hackathon_id") WHERE "knight_hacks_hacker_attendee"."profile_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_attendee_profile_idx" ON "knight_hacks_hacker_attendee" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_attendee_profile_revision_idx" ON "knight_hacks_hacker_attendee" USING btree ("profile_revision_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD CONSTRAINT "knight_hacks_hackathon_confirmation_capacity_check" CHECK ("knight_hacks_hackathon"."confirmation_capacity" IS NULL OR "knight_hacks_hackathon"."confirmation_capacity" >= 0);

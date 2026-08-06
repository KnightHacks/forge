CREATE TYPE "public"."event_purpose" AS ENUM('event', 'primary_check_in');--> statement-breakpoint
CREATE TYPE "public"."hackathon_event_reminder_state" AS ENUM('pending', 'delivering', 'delivered', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."hacker_check_in_outcome" AS ENUM('checked_in', 'already_checked_in', 'invalid_qr', 'hacker_not_found', 'wrong_status', 'not_checked_in', 'wrong_class', 'not_ready');--> statement-breakpoint
CREATE TYPE "public"."hacker_discord_role_attempt_outcome" AS ENUM('pending', 'succeeded', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."hacker_discord_role_grant_state" AS ENUM('pending', 'succeeded', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."hacker_discord_role_kind" AS ENUM('general', 'class', 'vip');--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_event_reminder_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"event_start_at" timestamp with time zone NOT NULL,
	"reminder_key" varchar(32) NOT NULL,
	"destination_channel_id_snapshot" varchar(20) NOT NULL,
	"role_id_snapshot" varchar(20) NOT NULL,
	"discord_event_id_snapshot" varchar(255) NOT NULL,
	"content_snapshot" text NOT NULL,
	"state" "hackathon_event_reminder_state" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(500),
	"locked_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_event_reminder_delivery_identity_unique" UNIQUE("event_id","reminder_key"),
	CONSTRAINT "knight_hacks_hackathon_event_reminder_channel_id_check" CHECK ("knight_hacks_hackathon_event_reminder_delivery"."destination_channel_id_snapshot" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hackathon_event_reminder_role_id_check" CHECK ("knight_hacks_hackathon_event_reminder_delivery"."role_id_snapshot" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hackathon_event_reminder_attempt_count_check" CHECK ("knight_hacks_hackathon_event_reminder_delivery"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_check_in_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"hacker_attendee_id" uuid,
	"attendance_id" uuid,
	"operator_id" uuid,
	"operator_display_name_snapshot" varchar(255),
	"mode" varchar(16) NOT NULL,
	"outcome" "hacker_check_in_outcome" NOT NULL,
	"event_purpose" "event_purpose" NOT NULL,
	"event_name_snapshot" varchar(255) NOT NULL,
	"hacker_name_snapshot" varchar(511),
	"class_id" uuid,
	"class_name_snapshot" varchar(64),
	"class_color_snapshot" varchar(7),
	"is_vip_snapshot" boolean DEFAULT false NOT NULL,
	"was_minor_at_attempt" boolean,
	"is_repeat_occurrence" boolean DEFAULT false NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "knight_hacks_hacker_check_in_attempt_attendanceId_unique" UNIQUE("attendance_id"),
	CONSTRAINT "knight_hacks_hacker_check_in_attempt_mode_check" CHECK ("knight_hacks_hacker_check_in_attempt"."mode" IN ('scanner', 'manual')),
	CONSTRAINT "knight_hacks_hacker_check_in_attempt_class_color_check" CHECK ("knight_hacks_hacker_check_in_attempt"."class_color_snapshot" IS NULL OR "knight_hacks_hacker_check_in_attempt"."class_color_snapshot" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "knight_hacks_hacker_check_in_attempt_points_check" CHECK ("knight_hacks_hacker_check_in_attempt"."points_awarded" >= 0),
	CONSTRAINT "knight_hacks_hacker_check_in_attempt_success_retention_check" CHECK (("knight_hacks_hacker_check_in_attempt"."outcome" = 'checked_in' AND "knight_hacks_hacker_check_in_attempt"."attendance_id" IS NOT NULL AND "knight_hacks_hacker_check_in_attempt"."expires_at" IS NULL) OR ("knight_hacks_hacker_check_in_attempt"."outcome" <> 'checked_in' AND "knight_hacks_hacker_check_in_attempt"."attendance_id" IS NULL AND "knight_hacks_hacker_check_in_attempt"."expires_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_discord_role_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hacker_attendee_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"source_attendance_id" uuid,
	"kind" "hacker_discord_role_kind" NOT NULL,
	"desired_role_id" varchar(20) NOT NULL,
	"state" "hacker_discord_role_grant_state" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"last_error" varchar(500),
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_logical_unique" UNIQUE("hacker_attendee_id","kind"),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_role_id_check" CHECK ("knight_hacks_hacker_discord_role_grant"."desired_role_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_count_check" CHECK ("knight_hacks_hacker_discord_role_grant"."attempt_count" >= 0),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_lease_pair_check" CHECK (("knight_hacks_hacker_discord_role_grant"."lease_token" IS NULL) = ("knight_hacks_hacker_discord_role_grant"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_discord_role_grant_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"attempt_token" uuid NOT NULL,
	"role_id_snapshot" varchar(20) NOT NULL,
	"discord_user_id_snapshot" varchar(20) NOT NULL,
	"attempted_by" uuid,
	"outcome" "hacker_discord_role_attempt_outcome" DEFAULT 'pending' NOT NULL,
	"error" varchar(500),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_attemptToken_unique" UNIQUE("attempt_token"),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_role_id_check" CHECK ("knight_hacks_hacker_discord_role_grant_attempt"."role_id_snapshot" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_user_id_check" CHECK ("knight_hacks_hacker_discord_role_grant_attempt"."discord_user_id_snapshot" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_completion_check" CHECK (("knight_hacks_hacker_discord_role_grant_attempt"."outcome" = 'pending' AND "knight_hacks_hacker_discord_role_grant_attempt"."finished_at" IS NULL) OR ("knight_hacks_hacker_discord_role_grant_attempt"."outcome" <> 'pending' AND "knight_hacks_hacker_discord_role_grant_attempt"."finished_at" IS NOT NULL))
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "knight_hacks_event"
     WHERE "legacy" = false
       AND (
         "points" IS NULL
         OR "creation_key" IS NULL
         OR "creation_payload_hash" IS NULL
       )
  ) THEN
    RAISE EXCEPTION 'Cannot tighten Reforge event invariants: a non-Legacy event has NULL points or creation identity. Repair those rows before retrying migration 0033.';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" DROP CONSTRAINT "knight_hacks_event_tag_normalizedName_unique";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" DROP CONSTRAINT "knight_hacks_event_new_club_points_check";--> statement-breakpoint
ALTER TABLE "knight_hacks_event" DROP CONSTRAINT "knight_hacks_event_new_club_creation_identity_check";--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" DROP CONSTRAINT "knight_hacks_hacker_attendee_class_id_knight_hacks_hackathon_class_id_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" DROP CONSTRAINT "knight_hacks_hacker_event_attendee_hacker_att_id_knight_hacks_hacker_attendee_id_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" DROP CONSTRAINT "knight_hacks_hacker_event_attendee_event_id_knight_hacks_event_id_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD COLUMN "purpose" "event_purpose" DEFAULT 'event' NOT NULL;--> statement-breakpoint
-- DEPLOYMENT GATE: drain all pre-Reforge Blade pods before hackathon-scoped
-- tags are activated. Older Club binaries do not understand this scope.
ALTER TABLE "knight_hacks_event_tag" ADD COLUMN "hackathon_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "general_hacker_discord_role_id" varchar(20);--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "event_announcement_channel_id" varchar(20);--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "is_first_time" boolean;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "checked_in_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "checked_in_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "points_awarded" integer;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "is_initial_attendance" boolean;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "voided_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD COLUMN "void_reason" varchar(300);--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "knight_hacks_hacker_attendee"
     GROUP BY "hacker_id", "hackathon_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add hacker-attendee uniqueness: duplicate (hacker_id, hackathon_id) rows exist.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "knight_hacks_hacker_attendee" attendee
      JOIN "knight_hacks_hackathon_class" class
        ON class."id" = attendee."class_id"
     WHERE class."hackathon_id" <> attendee."hackathon_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add scoped class integrity: a hacker attendee references another hackathon''s class.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "knight_hacks_hacker_event_attendee" attendance
      JOIN "knight_hacks_hacker_attendee" attendee
        ON attendee."id" = attendance."hacker_att_id"
      JOIN "knight_hacks_event" event
        ON event."id" = attendance."event_id"
     WHERE attendance."hackathon_id" IS DISTINCT FROM attendee."hackathon_id"
        OR attendance."hackathon_id" IS DISTINCT FROM event."hackathon_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add scoped hacker-event attendance integrity: event, attendee, and stored hackathon disagree.';
  END IF;
END $$;--> statement-breakpoint
WITH "latest_profile" AS (
  SELECT DISTINCT ON ("user_id")
         "user_id", "is_first_time"
    FROM "knight_hacks_hacker"
   ORDER BY "user_id", "date_created" DESC, "time_created" DESC, "id" DESC
),
"checked_in_ranked" AS (
  SELECT attendee."id",
         row_number() OVER (
           PARTITION BY hacker."user_id"
           ORDER BY hackathon."start_date", attendee."time_applied", attendee."id"
         ) AS "attendance_rank"
    FROM "knight_hacks_hacker_attendee" attendee
    JOIN "knight_hacks_hacker" hacker ON hacker."id" = attendee."hacker_id"
    JOIN "knight_hacks_hackathon" hackathon ON hackathon."id" = attendee."hackathon_id"
    JOIN "latest_profile" profile ON profile."user_id" = hacker."user_id"
   WHERE attendee."status" = 'checkedin'
     AND profile."is_first_time" = true
)
UPDATE "knight_hacks_hacker_attendee" attendee
   SET "is_first_time" = (ranked."attendance_rank" = 1)
  FROM "checked_in_ranked" ranked
 WHERE ranked."id" = attendee."id";--> statement-breakpoint
WITH "latest_profile" AS (
  SELECT DISTINCT ON ("user_id")
         "id", "user_id", "is_first_time"
    FROM "knight_hacks_hacker"
   ORDER BY "user_id", "date_created" DESC, "time_created" DESC, "id" DESC
),
"historically_admitted" AS (
  SELECT DISTINCT hacker."user_id"
    FROM "knight_hacks_hacker_attendee" attendee
    JOIN "knight_hacks_hacker" hacker ON hacker."id" = attendee."hacker_id"
   WHERE attendee."status" = 'checkedin'
)
UPDATE "knight_hacks_hacker" profile
   SET "is_first_time" = false
  FROM "latest_profile" latest
  JOIN "historically_admitted" admitted ON admitted."user_id" = latest."user_id"
 WHERE profile."id" = latest."id"
   AND latest."is_first_time" = true;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_id_hackathon_unique" UNIQUE("id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_class" ADD CONSTRAINT "knight_hacks_hackathon_class_id_hackathon_unique" UNIQUE("id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_hacker_hackathon_unique" UNIQUE("hacker_id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_id_hackathon_unique" UNIQUE("id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_event_reminder_delivery" ADD CONSTRAINT "knight_hacks_hackathon_event_reminder_scoped_event_fk" FOREIGN KEY ("event_id","hackathon_id") REFERENCES "public"."knight_hacks_event"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_attendance_id_knight_hacks_hacker_event_attendee_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."knight_hacks_hacker_event_attendee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_operator_id_auth_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_scoped_attendee_fk" FOREIGN KEY ("hacker_attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_scoped_class_fk" FOREIGN KEY ("class_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_class"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_scoped_event_fk" FOREIGN KEY ("event_id","hackathon_id") REFERENCES "public"."knight_hacks_event"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ADD CONSTRAINT "knight_hacks_hacker_discord_role_grant_source_attendance_id_knight_hacks_hacker_event_attendee_id_fk" FOREIGN KEY ("source_attendance_id") REFERENCES "public"."knight_hacks_hacker_event_attendee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ADD CONSTRAINT "knight_hacks_hacker_discord_role_grant_scoped_attendee_fk" FOREIGN KEY ("hacker_attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant_attempt" ADD CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_grant_id_knight_hacks_hacker_discord_role_grant_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."knight_hacks_hacker_discord_role_grant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant_attempt" ADD CONSTRAINT "knight_hacks_hacker_discord_role_grant_attempt_attempted_by_auth_user_id_fk" FOREIGN KEY ("attempted_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_event_reminder_delivery_pending_idx" ON "knight_hacks_hackathon_event_reminder_delivery" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_check_in_attempt_hackathon_history_idx" ON "knight_hacks_hacker_check_in_attempt" USING btree ("hackathon_id","attempted_at","id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_check_in_attempt_attendee_history_idx" ON "knight_hacks_hacker_check_in_attempt" USING btree ("hacker_attendee_id","attempted_at","id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_check_in_attempt_expiring_idx" ON "knight_hacks_hacker_check_in_attempt" USING btree ("expires_at") WHERE "knight_hacks_hacker_check_in_attempt"."expires_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_discord_role_grant_repair_queue_idx" ON "knight_hacks_hacker_discord_role_grant" USING btree ("state","lease_expires_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_discord_role_grant_attempt_history_idx" ON "knight_hacks_hacker_discord_role_grant_attempt" USING btree ("grant_id","started_at","id");--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" ADD CONSTRAINT "knight_hacks_event_tag_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_checked_in_by_auth_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_scoped_class_fk" FOREIGN KEY ("class_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_class"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_checked_in_by_auth_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_voided_by_auth_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_scoped_attendee_fk" FOREIGN KEY ("hacker_att_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_scoped_event_fk" FOREIGN KEY ("event_id","hackathon_id") REFERENCES "public"."knight_hacks_event"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_event_one_primary_per_hackathon" ON "knight_hacks_event" USING btree ("hackathon_id") WHERE "knight_hacks_event"."purpose" = 'primary_check_in';--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_event_tag_club_normalized_name_unique" ON "knight_hacks_event_tag" USING btree ("normalized_name") WHERE "knight_hacks_event_tag"."hackathon_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_event_tag_hackathon_normalized_name_unique" ON "knight_hacks_event_tag" USING btree ("hackathon_id","normalized_name") WHERE "knight_hacks_event_tag"."hackathon_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_event_tag_hackathon_idx" ON "knight_hacks_event_tag" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_attendee_checked_in_by_idx" ON "knight_hacks_hacker_attendee" USING btree ("checked_in_by");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_attendee_hackathon_checked_in_idx" ON "knight_hacks_hacker_attendee" USING btree ("hackathon_id","checked_in_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_event_attendee_event_attendee_history_idx" ON "knight_hacks_hacker_event_attendee" USING btree ("event_id","hacker_att_id","checked_in_at","id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_event_attendee_attendee_event_history_idx" ON "knight_hacks_hacker_event_attendee" USING btree ("hacker_att_id","event_id","checked_in_at","id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_event_attendee_hackathon_history_idx" ON "knight_hacks_hacker_event_attendee" USING btree ("hackathon_id","checked_in_at","id");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_event_attendee_checked_in_by_idx" ON "knight_hacks_hacker_event_attendee" USING btree ("checked_in_by");--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_event_attendee_voided_by_idx" ON "knight_hacks_hacker_event_attendee" USING btree ("voided_by");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_hacker_event_attendee_one_active_initial" ON "knight_hacks_hacker_event_attendee" USING btree ("event_id","hacker_att_id") WHERE "knight_hacks_hacker_event_attendee"."is_initial_attendance" = true AND "knight_hacks_hacker_event_attendee"."voided_at" IS NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_primary_requires_hackathon_check" CHECK ("knight_hacks_event"."purpose" <> 'primary_check_in' OR "knight_hacks_event"."hackathon_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_new_points_check" CHECK ("knight_hacks_event"."legacy" OR ("knight_hacks_event"."points" IS NOT NULL AND "knight_hacks_event"."points" >= 0));--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_new_creation_identity_check" CHECK ("knight_hacks_event"."legacy" OR ("knight_hacks_event"."creation_key" IS NOT NULL AND "knight_hacks_event"."creation_payload_hash" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD CONSTRAINT "knight_hacks_hackathon_event_announcement_channel_id_check" CHECK ("knight_hacks_hackathon"."event_announcement_channel_id" IS NULL OR "knight_hacks_hackathon"."event_announcement_channel_id" ~ '^[0-9]{17,20}$');--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD CONSTRAINT "knight_hacks_hackathon_general_hacker_discord_role_id_check" CHECK ("knight_hacks_hackathon"."general_hacker_discord_role_id" IS NULL OR "knight_hacks_hackathon"."general_hacker_discord_role_id" ~ '^[0-9]{17,20}$');--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_points_awarded_check" CHECK ("knight_hacks_hacker_event_attendee"."points_awarded" IS NULL OR "knight_hacks_hacker_event_attendee"."points_awarded" >= 0);--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_void_metadata_check" CHECK (("knight_hacks_hacker_event_attendee"."voided_at" IS NULL AND "knight_hacks_hacker_event_attendee"."void_reason" IS NULL) OR ("knight_hacks_hacker_event_attendee"."voided_at" IS NOT NULL AND "knight_hacks_hacker_event_attendee"."void_reason" IS NOT NULL));

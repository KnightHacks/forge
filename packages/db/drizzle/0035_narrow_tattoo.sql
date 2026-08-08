ALTER TABLE "knight_hacks_hacker_check_in_attempt" DROP CONSTRAINT "knight_hacks_hacker_check_in_attempt_attendance_id_knight_hacks_hacker_event_attendee_id_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" DROP CONSTRAINT "knight_hacks_hacker_discord_role_grant_source_attendance_id_knight_hacks_hacker_event_attendee_id_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ADD COLUMN "source_event_id" uuid;--> statement-breakpoint
UPDATE "knight_hacks_hacker_discord_role_grant" AS "grant"
SET "source_event_id" = "attendance"."event_id"
FROM "knight_hacks_hacker_event_attendee" AS "attendance"
WHERE "attendance"."id" = "grant"."source_attendance_id";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "knight_hacks_hacker_discord_role_grant"
    WHERE "source_attendance_id" IS NULL OR "source_event_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot scope hacker Discord role grants: a grant is missing its source attendance. Repair or remove the orphaned grant before retrying migration 0034.';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ALTER COLUMN "source_attendance_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ALTER COLUMN "source_event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_attempt_scope_unique" UNIQUE("id","hackathon_id","event_id","hacker_att_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_check_in_attempt" ADD CONSTRAINT "knight_hacks_hacker_check_in_attempt_scoped_attendance_fk" FOREIGN KEY ("attendance_id","hackathon_id","event_id","hacker_attendee_id") REFERENCES "public"."knight_hacks_hacker_event_attendee"("id","hackathon_id","event_id","hacker_att_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_discord_role_grant" ADD CONSTRAINT "knight_hacks_hacker_discord_role_grant_scoped_attendance_fk" FOREIGN KEY ("source_attendance_id","hackathon_id","source_event_id","hacker_attendee_id") REFERENCES "public"."knight_hacks_hacker_event_attendee"("id","hackathon_id","event_id","hacker_att_id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "knight_hacks_project_challenge" DROP CONSTRAINT "knight_hacks_project_challenge_hackathon_label_unique";--> statement-breakpoint
DROP INDEX "project_challenge_general_unique";--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "challenge_groups_initialized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "is_group" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "import_label_prefix" varchar(255);--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "knight_hacks_project_challenge_hackathon_label_unique" UNIQUE("hackathon_id","label","is_group");--> statement-breakpoint
-- Classify the previous import-created umbrella rows once; runtime uses group metadata.
UPDATE "knight_hacks_project_challenge" SET "is_group" = true WHERE "is_general" OR "label" = 'MLH Challenges';
--> statement-breakpoint
-- Legacy inventories may have had General without an MLH umbrella. Seed the
-- missing starter before marking this event initialized, so later deletion is
-- still intentional and does not cause automatic recreation.
INSERT INTO "knight_hacks_project_challenge" ("hackathon_id", "label", "is_group", "is_general", "is_scheduled")
SELECT DISTINCT c."hackathon_id", 'MLH Challenges', true, false, false
FROM "knight_hacks_project_challenge" c
WHERE c."is_group" AND c."is_general"
ON CONFLICT ("hackathon_id", "label", "is_group") DO NOTHING;
--> statement-breakpoint
UPDATE "knight_hacks_project_challenge" SET "import_label_prefix" = 'MLH' WHERE "is_group" AND "label" = 'MLH Challenges';
--> statement-breakpoint
UPDATE "knight_hacks_project_to_challenge" m SET "is_opt_in" = false FROM "knight_hacks_project_challenge" c WHERE m."challenge_id" = c."id" AND c."is_group";
--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_judging_configuration" ("hackathon_id", "challenge_groups_initialized_at") SELECT DISTINCT "hackathon_id", now() FROM "knight_hacks_project_challenge" WHERE "is_group" ON CONFLICT ("hackathon_id") DO UPDATE SET "challenge_groups_initialized_at" = EXCLUDED."challenge_groups_initialized_at";

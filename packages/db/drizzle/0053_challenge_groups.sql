ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "is_general" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "is_scheduled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ADD COLUMN "is_opt_in" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "project_challenge_parent_scope_fk" FOREIGN KEY ("parent_id","hackathon_id") REFERENCES "public"."knight_hacks_project_challenge"("id","hackathon_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_challenge_general_unique" ON "knight_hacks_project_challenge" USING btree ("hackathon_id") WHERE "knight_hacks_project_challenge"."is_general";--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "project_challenge_root_general" CHECK (NOT "knight_hacks_project_challenge"."is_general" OR "knight_hacks_project_challenge"."parent_id" IS NULL);--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "project_challenge_not_self" CHECK ("knight_hacks_project_challenge"."parent_id" IS NULL OR "knight_hacks_project_challenge"."parent_id" <> "knight_hacks_project_challenge"."id");
--> statement-breakpoint
-- Preserve legacy defaults once. Runtime grouping and timing use saved flags.
UPDATE "knight_hacks_project_challenge" SET "is_general" = true WHERE "label" = 'General';
--> statement-breakpoint
UPDATE "knight_hacks_project_challenge" SET "is_scheduled" = false WHERE "label" ILIKE '%mlh%';
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "tag_color" varchar(7);
--> statement-breakpoint
-- Only initialize hackathons that have never had group setup. Organizer deletions
-- remain intentional, and custom group names/settings are not overwritten.
INSERT INTO "knight_hacks_project_challenge" ("hackathon_id", "label", "is_group", "is_general", "is_scheduled", "import_label_prefix")
SELECT h."id", defaults."label", true, defaults."every_project", defaults."scheduled",
  CASE WHEN EXISTS (SELECT 1 FROM "knight_hacks_project_challenge" c WHERE c."hackathon_id" = h."id" AND c."is_group" AND c."import_label_prefix" = 'MLH') THEN NULL ELSE defaults."import_match" END
FROM "knight_hacks_hackathon" h
LEFT JOIN "knight_hacks_hackathon_judging_configuration" config ON config."hackathon_id" = h."id"
CROSS JOIN (VALUES ('General', true, true, NULL::varchar), ('MLH Challenges', false, false, 'MLH'::varchar)) AS defaults("label", "every_project", "scheduled", "import_match")
WHERE config."challenge_groups_initialized_at" IS NULL
ON CONFLICT ("hackathon_id", "label", "is_group") DO NOTHING;
--> statement-breakpoint
INSERT INTO "knight_hacks_project_to_challenge" ("project_id", "challenge_id", "hackathon_id", "is_opt_in")
SELECT p."id", c."id", p."hackathon_id", false
FROM "knight_hacks_project" p
JOIN "knight_hacks_project_challenge" c ON c."hackathon_id" = p."hackathon_id" AND c."is_group" AND c."is_general"
LEFT JOIN "knight_hacks_hackathon_judging_configuration" config ON config."hackathon_id" = p."hackathon_id"
WHERE config."challenge_groups_initialized_at" IS NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_judging_configuration" ("hackathon_id", "challenge_groups_initialized_at")
SELECT "id", now() FROM "knight_hacks_hackathon"
ON CONFLICT ("hackathon_id") DO UPDATE SET "challenge_groups_initialized_at" = EXCLUDED."challenge_groups_initialized_at"
WHERE "knight_hacks_hackathon_judging_configuration"."challenge_groups_initialized_at" IS NULL;
--> statement-breakpoint
UPDATE "knight_hacks_project_challenge"
SET "tag_color" = '#e93227'
WHERE "is_group" AND "import_label_prefix" = 'MLH';

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

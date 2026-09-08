ALTER TABLE "knight_hacks_project_challenge" ADD COLUMN "tag_color" varchar(7);
--> statement-breakpoint
UPDATE "knight_hacks_project_challenge"
SET "tag_color" = '#e93227'
WHERE "is_group" AND "import_label_prefix" = 'MLH';

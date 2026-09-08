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

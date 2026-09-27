ALTER TABLE "knight_hacks_project_to_challenge" ADD COLUMN "hackathon_id" uuid;--> statement-breakpoint
UPDATE "knight_hacks_project_to_challenge" AS "link"
SET "hackathon_id" = "project"."hackathon_id"
FROM "knight_hacks_project" AS "project"
WHERE "project"."id" = "link"."project_id";--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ALTER COLUMN "hackathon_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project" ADD CONSTRAINT "knight_hacks_project_id_hackathon_unique" UNIQUE("id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "knight_hacks_project_challenge_id_hackathon_unique" UNIQUE("id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ADD CONSTRAINT "knight_hacks_project_to_challenge_project_scope_fk" FOREIGN KEY ("project_id","hackathon_id") REFERENCES "public"."knight_hacks_project"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ADD CONSTRAINT "knight_hacks_project_to_challenge_challenge_scope_fk" FOREIGN KEY ("challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_challenge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" DROP CONSTRAINT "knight_hacks_project_to_challenge_project_id_knight_hacks_project_id_fk";--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" DROP CONSTRAINT "knight_hacks_project_to_challenge_challenge_id_knight_hacks_project_challenge_id_fk";--> statement-breakpoint
CREATE INDEX "knight_hacks_project_to_challenge_hackathon_idx" ON "knight_hacks_project_to_challenge" USING btree ("hackathon_id");

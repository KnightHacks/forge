ALTER TABLE "knight_hacks_project_to_challenge" ADD CONSTRAINT "knight_hacks_project_to_challenge_project_challenge_hackathon_unique" UNIQUE("project_id","challenge_id","hackathon_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" DROP CONSTRAINT "knight_hacks_project_evaluation_project_scope_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" DROP CONSTRAINT "knight_hacks_project_evaluation_challenge_scope_fk";
--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD CONSTRAINT "knight_hacks_project_evaluation_project_challenge_scope_fk" FOREIGN KEY ("project_id","challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_to_challenge"("project_id","challenge_id","hackathon_id") ON DELETE restrict ON UPDATE no action;

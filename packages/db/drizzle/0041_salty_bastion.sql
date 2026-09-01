DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "auth_judge_session" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "knight_hacks_challenges" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "knight_hacks_judged_submission" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "knight_hacks_judges" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "knight_hacks_submissions" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "knight_hacks_teams" LIMIT 1)
	THEN
		RAISE EXCEPTION 'Project judging migration stopped: legacy judging tables contain data.';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "knight_hacks_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"submission_url" text NOT NULL,
	"description" text NOT NULL,
	"demo_links" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"video_url" text,
	"technologies" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"universities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"prize_categories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"participant_count" integer NOT NULL,
	"project_created_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_project_hackathon_submission_url_unique" UNIQUE("hackathon_id","submission_url"),
	CONSTRAINT "knight_hacks_project_participant_count_check" CHECK ("knight_hacks_project"."participant_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_project_challenge_hackathon_label_unique" UNIQUE("hackathon_id","label")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320),
	"display_order" integer NOT NULL,
	CONSTRAINT "knight_hacks_project_member_project_order_unique" UNIQUE("project_id","display_order"),
	CONSTRAINT "knight_hacks_project_member_display_order_check" CHECK ("knight_hacks_project_member"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_to_challenge" (
	"project_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_project_to_challenge_project_id_challenge_id_pk" PRIMARY KEY("project_id","challenge_id")
);
--> statement-breakpoint
DROP TABLE "auth_judge_session" CASCADE;--> statement-breakpoint
DROP TABLE "knight_hacks_challenges" CASCADE;--> statement-breakpoint
DROP TABLE "knight_hacks_judged_submission" CASCADE;--> statement-breakpoint
DROP TABLE "knight_hacks_judges" CASCADE;--> statement-breakpoint
DROP TABLE "knight_hacks_submissions" CASCADE;--> statement-breakpoint
DROP TABLE "knight_hacks_teams" CASCADE;--> statement-breakpoint
ALTER TABLE "knight_hacks_project" ADD CONSTRAINT "knight_hacks_project_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project" ADD CONSTRAINT "knight_hacks_project_deleted_by_user_id_auth_user_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_challenge" ADD CONSTRAINT "knight_hacks_project_challenge_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_member" ADD CONSTRAINT "knight_hacks_project_member_project_id_knight_hacks_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."knight_hacks_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ADD CONSTRAINT "knight_hacks_project_to_challenge_project_id_knight_hacks_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."knight_hacks_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_to_challenge" ADD CONSTRAINT "knight_hacks_project_to_challenge_challenge_id_knight_hacks_project_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."knight_hacks_project_challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_project_hackathon_idx" ON "knight_hacks_project" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_project_hackathon_deleted_idx" ON "knight_hacks_project" USING btree ("hackathon_id","deleted_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_project_challenge_hackathon_idx" ON "knight_hacks_project_challenge" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_project_member_project_idx" ON "knight_hacks_project_member" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_project_to_challenge_challenge_idx" ON "knight_hacks_project_to_challenge" USING btree ("challenge_id");

CREATE TYPE "public"."judging_response_visibility" AS ENUM('public', 'public_optional', 'private');--> statement-breakpoint
CREATE TYPE "public"."judging_rubric_item_kind" AS ENUM('rating', 'short_response');--> statement-breakpoint
CREATE TYPE "public"."judging_state" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" DROP CONSTRAINT "knight_hacks_judge_user_id_auth_user_id_fk";--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" DROP CONSTRAINT "knight_hacks_judge_kind_identity_check";--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" ADD CONSTRAINT "knight_hacks_judge_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" ADD CONSTRAINT "knight_hacks_judge_kind_identity_check" CHECK ("knight_hacks_judge"."kind" = 'member' OR ("knight_hacks_judge"."kind" = 'guest' AND "knight_hacks_judge"."user_id" IS NULL));--> statement-breakpoint
CREATE TABLE "knight_hacks_judge_deliberation_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judge_deliberation_entry_section_project_unique" UNIQUE("section_id","project_id"),
	CONSTRAINT "knight_hacks_judge_deliberation_entry_section_order_unique" UNIQUE("section_id","display_order"),
	CONSTRAINT "knight_hacks_judge_deliberation_entry_order_check" CHECK ("knight_hacks_judge_deliberation_entry"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judge_deliberation_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judge_deliberation_section_judge_order_unique" UNIQUE("judge_id","display_order"),
	CONSTRAINT "knight_hacks_judge_deliberation_section_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_judge_deliberation_section_order_check" CHECK ("knight_hacks_judge_deliberation_section"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_rubric_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"kind" "judging_rubric_item_kind" NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"display_order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"member_visibility_policy" "judging_response_visibility",
	"guest_visibility_policy" "judging_response_visibility",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judging_rubric_item_hackathon_order_unique" UNIQUE("hackathon_id","display_order"),
	CONSTRAINT "knight_hacks_judging_rubric_item_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_judging_rubric_item_display_order_check" CHECK ("knight_hacks_judging_rubric_item"."display_order" >= 0),
	CONSTRAINT "knight_hacks_judging_rubric_item_visibility_check" CHECK (("knight_hacks_judging_rubric_item"."kind" = 'rating' AND "knight_hacks_judging_rubric_item"."required" = true AND "knight_hacks_judging_rubric_item"."member_visibility_policy" IS NULL AND "knight_hacks_judging_rubric_item"."guest_visibility_policy" IS NULL) OR ("knight_hacks_judging_rubric_item"."kind" = 'short_response' AND "knight_hacks_judging_rubric_item"."member_visibility_policy" IS NOT NULL AND "knight_hacks_judging_rubric_item"."guest_visibility_policy" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_project_evaluation_judge_project_challenge_unique" UNIQUE("judge_id","project_id","challenge_id"),
	CONSTRAINT "knight_hacks_project_evaluation_id_hackathon_unique" UNIQUE("id","hackathon_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_evaluation_rating" (
	"evaluation_id" uuid NOT NULL,
	"rubric_item_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "knight_hacks_project_evaluation_rating_evaluation_id_rubric_item_id_pk" PRIMARY KEY("evaluation_id","rubric_item_id"),
	CONSTRAINT "knight_hacks_project_evaluation_rating_value_check" CHECK ("knight_hacks_project_evaluation_rating"."value" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_evaluation_response" (
	"evaluation_id" uuid NOT NULL,
	"rubric_item_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"value" text NOT NULL,
	"is_public" boolean NOT NULL,
	CONSTRAINT "knight_hacks_project_evaluation_response_evaluation_id_rubric_item_id_pk" PRIMARY KEY("evaluation_id","rubric_item_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_evaluation_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"actor_kind" "judge_kind" NOT NULL,
	"rating_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_project_evaluation_revision_unique" UNIQUE("evaluation_id","revision"),
	CONSTRAINT "knight_hacks_project_evaluation_revision_revision_check" CHECK ("knight_hacks_project_evaluation_revision"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "state" "judging_state" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "display_all_results_to_members" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge_deliberation_entry" ADD CONSTRAINT "knight_hacks_judge_deliberation_entry_section_scope_fk" FOREIGN KEY ("section_id","hackathon_id") REFERENCES "public"."knight_hacks_judge_deliberation_section"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge_deliberation_entry" ADD CONSTRAINT "knight_hacks_judge_deliberation_entry_project_scope_fk" FOREIGN KEY ("project_id","hackathon_id") REFERENCES "public"."knight_hacks_project"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge_deliberation_section" ADD CONSTRAINT "knight_hacks_judge_deliberation_section_judge_scope_fk" FOREIGN KEY ("judge_id","hackathon_id") REFERENCES "public"."knight_hacks_judge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_rubric_item" ADD CONSTRAINT "knight_hacks_judging_rubric_item_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD CONSTRAINT "knight_hacks_project_evaluation_project_scope_fk" FOREIGN KEY ("project_id","hackathon_id") REFERENCES "public"."knight_hacks_project"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD CONSTRAINT "knight_hacks_project_evaluation_challenge_scope_fk" FOREIGN KEY ("challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_challenge"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD CONSTRAINT "knight_hacks_project_evaluation_judge_scope_fk" FOREIGN KEY ("judge_id","hackathon_id") REFERENCES "public"."knight_hacks_judge"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_rating" ADD CONSTRAINT "knight_hacks_project_evaluation_rating_evaluation_scope_fk" FOREIGN KEY ("evaluation_id","hackathon_id") REFERENCES "public"."knight_hacks_project_evaluation"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_rating" ADD CONSTRAINT "knight_hacks_project_evaluation_rating_rubric_scope_fk" FOREIGN KEY ("rubric_item_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_rubric_item"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_response" ADD CONSTRAINT "knight_hacks_project_evaluation_response_evaluation_scope_fk" FOREIGN KEY ("evaluation_id","hackathon_id") REFERENCES "public"."knight_hacks_project_evaluation"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_response" ADD CONSTRAINT "knight_hacks_project_evaluation_response_rubric_scope_fk" FOREIGN KEY ("rubric_item_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_rubric_item"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_revision" ADD CONSTRAINT "knight_hacks_project_evaluation_revision_evaluation_scope_fk" FOREIGN KEY ("evaluation_id","hackathon_id") REFERENCES "public"."knight_hacks_project_evaluation"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_project_evaluation_project_challenge_idx" ON "knight_hacks_project_evaluation" USING btree ("project_id","challenge_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_project_evaluation_judge_idx" ON "knight_hacks_project_evaluation" USING btree ("judge_id","updated_at");

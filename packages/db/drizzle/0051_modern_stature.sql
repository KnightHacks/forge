CREATE TABLE "knight_hacks_judging_appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judging_appointment_task_unique" UNIQUE("schedule_id","project_id","challenge_id"),
	CONSTRAINT "knight_hacks_judging_appointment_room_slot_unique" UNIQUE("schedule_id","room_id","starts_at"),
	CONSTRAINT "knight_hacks_judging_appointment_scope_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_judging_appointment_times_check" CHECK ("knight_hacks_judging_appointment"."starts_at" < "knight_hacks_judging_appointment"."deadline_at" AND "knight_hacks_judging_appointment"."deadline_at" <= "knight_hacks_judging_appointment"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_building" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judging_building_name_check" CHECK (length(btrim("knight_hacks_judging_building"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"setup_minutes" integer NOT NULL,
	"judging_minutes" integer NOT NULL,
	"teardown_minutes" integer NOT NULL,
	"same_building_break_minutes" integer NOT NULL,
	"different_building_break_minutes" integer NOT NULL,
	"reduced_breaks_acknowledged_at" timestamp with time zone,
	"first_result_at" timestamp with time zone,
	"saved_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judging_schedule_hackathon_unique" UNIQUE("hackathon_id"),
	CONSTRAINT "knight_hacks_judging_schedule_scope_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_judging_schedule_timing_check" CHECK ("knight_hacks_judging_schedule"."ends_at" > "knight_hacks_judging_schedule"."starts_at" AND "knight_hacks_judging_schedule"."setup_minutes" >= 0 AND "knight_hacks_judging_schedule"."judging_minutes" > 0 AND "knight_hacks_judging_schedule"."teardown_minutes" >= 0 AND "knight_hacks_judging_schedule"."same_building_break_minutes" > 0 AND "knight_hacks_judging_schedule"."different_building_break_minutes" >= "knight_hacks_judging_schedule"."same_building_break_minutes"),
	CONSTRAINT "knight_hacks_judging_schedule_minute_check" CHECK (extract(second from "knight_hacks_judging_schedule"."starts_at") = 0 AND extract(second from "knight_hacks_judging_schedule"."ends_at") = 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_schedule_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"source_fingerprint" text NOT NULL,
	"timing" jsonb NOT NULL,
	"problem" jsonb NOT NULL,
	"checkpoint" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'searching' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_evaluation_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"appointment_id" uuid,
	"evaluation_id" uuid,
	"base_evaluation_revision" integer,
	"ratings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deadline_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_evaluation_draft_author_unique" UNIQUE("judge_id","project_id","challenge_id")
);
--> statement-breakpoint
DROP INDEX "knight_hacks_judging_room_active_name_unique";--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room" ADD COLUMN "building_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD COLUMN "is_complete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD COLUMN "auto_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_appointment" ADD CONSTRAINT "knight_hacks_judging_appointment_schedule_fk" FOREIGN KEY ("schedule_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_schedule"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_appointment" ADD CONSTRAINT "knight_hacks_judging_appointment_room_fk" FOREIGN KEY ("room_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_room"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_appointment" ADD CONSTRAINT "knight_hacks_judging_appointment_project_challenge_fk" FOREIGN KEY ("project_id","challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_to_challenge"("project_id","challenge_id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_schedule" ADD CONSTRAINT "knight_hacks_judging_schedule_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_schedule" ADD CONSTRAINT "knight_hacks_judging_schedule_saved_by_user_id_auth_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_schedule_job" ADD CONSTRAINT "knight_hacks_judging_schedule_job_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_schedule_job" ADD CONSTRAINT "knight_hacks_judging_schedule_job_created_by_user_id_auth_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_draft" ADD CONSTRAINT "knight_hacks_project_evaluation_draft_evaluation_id_knight_hacks_project_evaluation_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."knight_hacks_project_evaluation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_draft" ADD CONSTRAINT "knight_hacks_evaluation_draft_appointment_fk" FOREIGN KEY ("appointment_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_appointment"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_draft" ADD CONSTRAINT "knight_hacks_evaluation_draft_project_fk" FOREIGN KEY ("project_id","challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_to_challenge"("project_id","challenge_id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation_draft" ADD CONSTRAINT "knight_hacks_evaluation_draft_judge_fk" FOREIGN KEY ("judge_id","hackathon_id") REFERENCES "public"."knight_hacks_judge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_judging_appointment_project_idx" ON "knight_hacks_judging_appointment" USING btree ("project_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_building_name_unique" ON "knight_hacks_judging_building" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "knight_hacks_judging_schedule_job_hackathon_idx" ON "knight_hacks_judging_schedule_job" USING btree ("hackathon_id","created_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_evaluation_draft_due_idx" ON "knight_hacks_project_evaluation_draft" USING btree ("hackathon_id","deadline_at");--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room" ADD CONSTRAINT "knight_hacks_judging_room_building_id_knight_hacks_judging_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."knight_hacks_judging_building"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_evaluation" ADD CONSTRAINT "knight_hacks_project_evaluation_appointment_fk" FOREIGN KEY ("appointment_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_appointment"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_room_active_location_unique" ON "knight_hacks_judging_room" USING btree ("hackathon_id","building_id",lower(btrim("name"))) WHERE "knight_hacks_judging_room"."archived_at" IS NULL AND "knight_hacks_judging_room"."building_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_room_active_name_unique" ON "knight_hacks_judging_room" USING btree ("hackathon_id","name") WHERE "knight_hacks_judging_room"."archived_at" IS NULL AND "knight_hacks_judging_room"."building_id" IS NULL;
--> statement-breakpoint
INSERT INTO "knight_hacks_judging_building" ("name") VALUES ('ENG'), ('BA'), ('HEC'), ('HS') ON CONFLICT DO NOTHING;

CREATE TABLE "knight_hacks_print_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"hacker_attendee_id" uuid NOT NULL,
	"description" varchar(2000) NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"status_note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_by_user_id" uuid,
	"estimated_ready_at" timestamp with time zone,
	CONSTRAINT "knight_hacks_print_job_scoped_identity_unique" UNIQUE("id","hackathon_id","hacker_attendee_id"),
	CONSTRAINT "knight_hacks_print_job_status_check" CHECK ("knight_hacks_print_job"."status" IN ('received', 'printing', 'needs_clarification', 'ready_for_pickup', 'picked_up', 'cancelled')),
	CONSTRAINT "knight_hacks_print_job_description_not_blank_check" CHECK ("knight_hacks_print_job"."description" ~ '[^[:space:]]'),
	CONSTRAINT "knight_hacks_print_job_clarification_note_check" CHECK ("knight_hacks_print_job"."status" <> 'needs_clarification' OR ("knight_hacks_print_job"."status_note" IS NOT NULL AND "knight_hacks_print_job"."status_note" ~ '[^[:space:]]'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_print_job_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_job_id" uuid,
	"hackathon_id" uuid NOT NULL,
	"hacker_attendee_id" uuid NOT NULL,
	"object_name" varchar(512) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_print_job_file_object_unique" UNIQUE("object_name"),
	CONSTRAINT "knight_hacks_print_job_file_size_check" CHECK ("knight_hacks_print_job_file"."size" > 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_printing_configuration" (
	"hackathon_id" uuid PRIMARY KEY NOT NULL,
	"discord_channel_id" varchar(20),
	"print_minutes" integer DEFAULT 60 NOT NULL,
	"printer_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_printing_configuration_print_minutes_check" CHECK ("knight_hacks_printing_configuration"."print_minutes" BETWEEN 5 AND 600),
	CONSTRAINT "knight_hacks_printing_configuration_printer_count_check" CHECK ("knight_hacks_printing_configuration"."printer_count" BETWEEN 1 AND 20),
	CONSTRAINT "knight_hacks_printing_configuration_channel_id_check" CHECK ("knight_hacks_printing_configuration"."discord_channel_id" IS NULL OR "knight_hacks_printing_configuration"."discord_channel_id" ~ '^[0-9]{17,20}$')
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD CONSTRAINT "knight_hacks_print_job_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD CONSTRAINT "knight_hacks_print_job_status_changed_by_user_id_auth_user_id_fk" FOREIGN KEY ("status_changed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD CONSTRAINT "knight_hacks_print_job_attendee_scope_fk" FOREIGN KEY ("hacker_attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job_file" ADD CONSTRAINT "knight_hacks_print_job_file_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job_file" ADD CONSTRAINT "knight_hacks_print_job_file_attendee_scope_fk" FOREIGN KEY ("hacker_attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job_file" ADD CONSTRAINT "knight_hacks_print_job_file_job_scope_fk" FOREIGN KEY ("print_job_id","hackathon_id","hacker_attendee_id") REFERENCES "public"."knight_hacks_print_job"("id","hackathon_id","hacker_attendee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_printing_configuration" ADD CONSTRAINT "knight_hacks_printing_configuration_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_queue_idx" ON "knight_hacks_print_job" USING btree ("hackathon_id","status","created_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_attendee_idx" ON "knight_hacks_print_job" USING btree ("hacker_attendee_id","created_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_status_changed_by_idx" ON "knight_hacks_print_job" USING btree ("status_changed_by_user_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_file_job_idx" ON "knight_hacks_print_job_file" USING btree ("print_job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_file_attendee_idx" ON "knight_hacks_print_job_file" USING btree ("hacker_attendee_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_print_job_file_staged_idx" ON "knight_hacks_print_job_file" USING btree ("created_at") WHERE "knight_hacks_print_job_file"."print_job_id" IS NULL;
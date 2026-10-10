ALTER TABLE "knight_hacks_print_job" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD COLUMN "category_reminder_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD COLUMN "category_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_print_job" ADD CONSTRAINT "knight_hacks_print_job_category_check" CHECK ("knight_hacks_print_job"."category" IS NULL OR "knight_hacks_print_job"."category" IN ('project', 'personal'));
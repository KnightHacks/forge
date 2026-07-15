ALTER TABLE "knight_hacks_event_feedback_config" DROP CONSTRAINT "knight_hacks_event_feedback_config_window_check";--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback_config" DROP COLUMN "opens_at";--> statement-breakpoint
UPDATE "knight_hacks_form_schemas"
SET "opens_at" = NULL
WHERE "kind" = 'event_feedback';

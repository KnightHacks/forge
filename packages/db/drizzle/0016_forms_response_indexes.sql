CREATE INDEX "knight_hacks_form_response_form_created_idx" ON "knight_hacks_form_response" USING btree ("form","created_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_form_response_user_created_idx" ON "knight_hacks_form_response" USING btree ("user_id","created_at");--> statement-breakpoint
UPDATE "knight_hacks_form_schemas"
SET
	"kind" = 'event_feedback'::"form_kind",
	"state" = 'archived'::"form_state",
	"is_closed" = true,
	"manually_closed" = true,
	"archived_at" = COALESCE("archived_at", CURRENT_TIMESTAMP)
WHERE
	lower("section") = 'feedback'
	OR lower("name") LIKE '% feedback';--> statement-breakpoint
UPDATE "knight_hacks_form_schemas"
SET
	"kind" = 'system'::"form_kind",
	"state" = 'published'::"form_state",
	"response_mode" = 'single_locked'::"form_response_mode",
	"published_at" = COALESCE("published_at", CURRENT_TIMESTAMP),
	"archived_at" = NULL,
	"closes_at" = NULL,
	"manually_closed" = false,
	"is_closed" = false
WHERE
	"id" = 'f0000000-0000-4000-8000-000000000001'
	OR "slug_name" = 'member-signup';

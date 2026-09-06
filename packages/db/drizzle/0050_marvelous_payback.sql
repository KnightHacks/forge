ALTER TABLE "knight_hacks_event" ADD COLUMN "tag_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" ADD COLUMN "emoji" varchar(32);--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" ADD COLUMN "announcement_channel_id" varchar(20);--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" ADD COLUMN "skip_next_week" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_tag_id_knight_hacks_event_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."knight_hacks_event_tag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_tag" ADD CONSTRAINT "knight_hacks_event_tag_announcement_channel_check" CHECK ("knight_hacks_event_tag"."announcement_channel_id" IS NULL OR "knight_hacks_event_tag"."announcement_channel_id" ~ '^[0-9]{17,20}$');
--> statement-breakpoint
-- Attach the scoped template without rewriting the event's name, color, or points snapshot.
UPDATE "knight_hacks_event" AS event
SET "tag_id" = tag."id"
FROM "knight_hacks_event_tag" AS tag
WHERE event."tag_id" IS NULL
  AND event."hackathon_id" IS NOT DISTINCT FROM tag."hackathon_id"
  AND lower(btrim(regexp_replace(event."tag", '\s+', ' ', 'g'))) = tag."normalized_name";
--> statement-breakpoint
-- Preserve the existing Club exclusions once; future changes are tag settings.
UPDATE "knight_hacks_event_tag"
SET "skip_next_week" = true
WHERE "hackathon_id" IS NULL AND "normalized_name" IN ('ops', 'project launch');

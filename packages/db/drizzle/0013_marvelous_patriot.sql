ALTER TABLE "knight_hacks_event" ALTER COLUMN "tag_color" SET DEFAULT '#0D9488';--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ALTER COLUMN "legacy" SET DEFAULT true;--> statement-breakpoint
CREATE INDEX "knight_hacks_event_attendee_event_member_idx" ON "knight_hacks_event_attendee" USING btree ("event_id","member_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_event_attendee_member_event_idx" ON "knight_hacks_event_attendee" USING btree ("member_id","event_id");
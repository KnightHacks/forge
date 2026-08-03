ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "blacklisted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "blacklisted_by" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "blacklist_reason" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "last_status_send_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_blacklisted_by_auth_user_id_fk" FOREIGN KEY ("blacklisted_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_last_status_send_id_email_send_id_fk" FOREIGN KEY ("last_status_send_id") REFERENCES "public"."email_send"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_hacker_attendee_hackathon_status_idx" ON "knight_hacks_hacker_attendee" USING btree ("hackathon_id","status");--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_blacklist_reason_check" CHECK (("knight_hacks_hacker_attendee"."blacklisted_at" is null and "knight_hacks_hacker_attendee"."blacklist_reason" is null)
          or ("knight_hacks_hacker_attendee"."blacklisted_at" is not null and "knight_hacks_hacker_attendee"."blacklist_reason" is not null));
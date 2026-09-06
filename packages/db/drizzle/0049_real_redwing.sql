CREATE TABLE "knight_hacks_judging_announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"room_id" uuid,
	"message" varchar(1000) NOT NULL,
	"include_guests" boolean DEFAULT false NOT NULL,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"published_by_user_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_at" timestamp with time zone,
	"cleared_by_user_id" uuid,
	CONSTRAINT "knight_hacks_judging_announcement_message_not_blank_check" CHECK (length(btrim("knight_hacks_judging_announcement"."message")) > 0)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_announcement" ADD CONSTRAINT "knight_hacks_judging_announcement_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_announcement" ADD CONSTRAINT "knight_hacks_judging_announcement_published_by_user_id_auth_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_announcement" ADD CONSTRAINT "knight_hacks_judging_announcement_cleared_by_user_id_auth_user_id_fk" FOREIGN KEY ("cleared_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_announcement" ADD CONSTRAINT "knight_hacks_judging_announcement_room_scope_fk" FOREIGN KEY ("room_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_room"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_announcement_current_global_unique" ON "knight_hacks_judging_announcement" USING btree ("hackathon_id") WHERE "knight_hacks_judging_announcement"."room_id" IS NULL AND "knight_hacks_judging_announcement"."cleared_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_announcement_current_room_unique" ON "knight_hacks_judging_announcement" USING btree ("room_id") WHERE "knight_hacks_judging_announcement"."room_id" IS NOT NULL AND "knight_hacks_judging_announcement"."cleared_at" IS NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_judging_announcement_current_lookup_idx" ON "knight_hacks_judging_announcement" USING btree ("hackathon_id","room_id","cleared_at");
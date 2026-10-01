CREATE TABLE "knight_hacks_hacker_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"together" boolean DEFAULT true NOT NULL,
	"frozen_at" timestamp with time zone,
	"class_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hacker_team_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "hacker_team_name_required" CHECK (length(trim("knight_hacks_hacker_team"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_team_member" (
	"attendee_id" uuid PRIMARY KEY NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "hacker_team_member_role_valid" CHECK ("knight_hacks_hacker_team_member"."role" in ('pending', 'member', 'owner'))
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_team" ADD CONSTRAINT "knight_hacks_hacker_team_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_team" ADD CONSTRAINT "hacker_team_scoped_class_fk" FOREIGN KEY ("class_id","hackathon_id") REFERENCES "public"."knight_hacks_hackathon_class"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_team_member" ADD CONSTRAINT "hacker_team_member_scoped_team_fk" FOREIGN KEY ("team_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_team"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_team_member" ADD CONSTRAINT "hacker_team_member_scoped_attendee_fk" FOREIGN KEY ("attendee_id","hackathon_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id","hackathon_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hacker_team_hackathon_idx" ON "knight_hacks_hacker_team" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "hacker_team_class_idx" ON "knight_hacks_hacker_team" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "hacker_team_member_team_idx" ON "knight_hacks_hacker_team_member" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "hacker_team_member_hackathon_idx" ON "knight_hacks_hacker_team_member" USING btree ("hackathon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hacker_team_one_owner" ON "knight_hacks_hacker_team_member" USING btree ("team_id") WHERE "knight_hacks_hacker_team_member"."role" = 'owner';
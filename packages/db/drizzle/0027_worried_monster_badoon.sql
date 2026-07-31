CREATE TABLE "knight_hacks_hackathon_class" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" varchar(64) NOT NULL,
	"discord_role_id" varchar(20) NOT NULL,
	"color" varchar(7) NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_class_discord_role_id_check" CHECK ("knight_hacks_hackathon_class"."discord_role_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_hackathon_class_color_check" CHECK ("knight_hacks_hackathon_class"."color" ~ '^#[0-9a-fA-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_status_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"status" text NOT NULL,
	"template_id" uuid NOT NULL,
	"subject" varchar(200) NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_status_email_hackathon_status_unique" UNIQUE("hackathon_id","status"),
	CONSTRAINT "knight_hacks_hackathon_status_email_status_check" CHECK ("knight_hacks_hackathon_status_email"."status" <> 'checkedin')
);
--> statement-breakpoint
ALTER TABLE "email_template" ADD COLUMN "domain" text DEFAULT 'club' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "application_url" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "class_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD COLUMN "is_vip" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_class" ADD CONSTRAINT "knight_hacks_hackathon_class_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_status_email" ADD CONSTRAINT "knight_hacks_hackathon_status_email_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_status_email" ADD CONSTRAINT "knight_hacks_hackathon_status_email_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_class_hackathon_idx" ON "knight_hacks_hackathon_class" USING btree ("hackathon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_hackathon_class_one_vip_per_hackathon" ON "knight_hacks_hackathon_class" USING btree ("hackathon_id") WHERE "knight_hacks_hackathon_class"."kind" = 'vip';--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_class_id_knight_hacks_hackathon_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."knight_hacks_hackathon_class"("id") ON DELETE restrict ON UPDATE no action;
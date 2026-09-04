CREATE TYPE "public"."judge_kind" AS ENUM('member', 'guest');--> statement-breakpoint
CREATE TABLE "knight_hacks_guest_judge_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"access_link_id" uuid NOT NULL,
	"judge_id" uuid,
	"token_hash" char(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"revocation_reason" varchar(80),
	CONSTRAINT "knight_hacks_guest_judge_session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_judging_configuration" (
	"hackathon_id" uuid PRIMARY KEY NOT NULL,
	"project_inventory_locked_at" timestamp with time zone,
	"project_inventory_locked_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"kind" "judge_kind" NOT NULL,
	"user_id" uuid,
	"display_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judge_id_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "knight_hacks_judge_kind_identity_check" CHECK (("knight_hacks_judge"."kind" = 'member' AND "knight_hacks_judge"."user_id" IS NOT NULL) OR ("knight_hacks_judge"."kind" = 'guest' AND "knight_hacks_judge"."user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_judging_room_id_hackathon_unique" UNIQUE("id","hackathon_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_room_access_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"revocation_reason" varchar(80),
	CONSTRAINT "knight_hacks_judging_room_access_link_id_hackathon_unique" UNIQUE("id","hackathon_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judging_room_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"leave_reason" varchar(80)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_guest_judge_session" ADD CONSTRAINT "knight_hacks_guest_judge_session_revoked_by_user_id_auth_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_guest_judge_session" ADD CONSTRAINT "knight_hacks_guest_judge_session_access_link_scope_fk" FOREIGN KEY ("access_link_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_room_access_link"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_guest_judge_session" ADD CONSTRAINT "knight_hacks_guest_judge_session_judge_scope_fk" FOREIGN KEY ("judge_id","hackathon_id") REFERENCES "public"."knight_hacks_judge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD CONSTRAINT "knight_hacks_hackathon_judging_configuration_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD CONSTRAINT "knight_hacks_hackathon_judging_configuration_project_inventory_locked_by_user_id_auth_user_id_fk" FOREIGN KEY ("project_inventory_locked_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" ADD CONSTRAINT "knight_hacks_judge_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judge" ADD CONSTRAINT "knight_hacks_judge_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room" ADD CONSTRAINT "knight_hacks_judging_room_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room" ADD CONSTRAINT "knight_hacks_judging_room_archived_by_user_id_auth_user_id_fk" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room" ADD CONSTRAINT "knight_hacks_judging_room_challenge_scope_fk" FOREIGN KEY ("challenge_id","hackathon_id") REFERENCES "public"."knight_hacks_project_challenge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room_access_link" ADD CONSTRAINT "knight_hacks_judging_room_access_link_created_by_user_id_auth_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room_access_link" ADD CONSTRAINT "knight_hacks_judging_room_access_link_revoked_by_user_id_auth_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room_access_link" ADD CONSTRAINT "knight_hacks_judging_room_access_link_room_scope_fk" FOREIGN KEY ("room_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_room"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room_presence" ADD CONSTRAINT "knight_hacks_judging_room_presence_room_scope_fk" FOREIGN KEY ("room_id","hackathon_id") REFERENCES "public"."knight_hacks_judging_room"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judging_room_presence" ADD CONSTRAINT "knight_hacks_judging_room_presence_judge_scope_fk" FOREIGN KEY ("judge_id","hackathon_id") REFERENCES "public"."knight_hacks_judge"("id","hackathon_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_guest_judge_session_access_link_idx" ON "knight_hacks_guest_judge_session" USING btree ("access_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judge_member_unique" ON "knight_hacks_judge" USING btree ("hackathon_id","user_id") WHERE "knight_hacks_judge"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_room_active_name_unique" ON "knight_hacks_judging_room" USING btree ("hackathon_id","name") WHERE "knight_hacks_judging_room"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_judging_room_hackathon_idx" ON "knight_hacks_judging_room" USING btree ("hackathon_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_room_access_link_active_room_unique" ON "knight_hacks_judging_room_access_link" USING btree ("room_id") WHERE "knight_hacks_judging_room_access_link"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_judging_room_presence_active_judge_unique" ON "knight_hacks_judging_room_presence" USING btree ("judge_id") WHERE "knight_hacks_judging_room_presence"."left_at" IS NULL;--> statement-breakpoint
CREATE INDEX "knight_hacks_judging_room_presence_room_idx" ON "knight_hacks_judging_room_presence" USING btree ("room_id","left_at");

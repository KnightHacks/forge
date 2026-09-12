CREATE TABLE "knight_hacks_project_claim" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_claim_user_event_unique" UNIQUE("user_id","hackathon_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_project_claim_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token" varchar(64),
	"consumed_by_user_id" uuid,
	"consumed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_claim_link_member_unique" UNIQUE("member_id"),
	CONSTRAINT "project_claim_link_token_unique" UNIQUE("token"),
	CONSTRAINT "project_claim_link_consumed_check" CHECK (("knight_hacks_project_claim_link"."consumed_at" IS NULL AND "knight_hacks_project_claim_link"."consumed_by_user_id" IS NULL AND "knight_hacks_project_claim_link"."token" IS NOT NULL) OR ("knight_hacks_project_claim_link"."consumed_at" IS NOT NULL AND "knight_hacks_project_claim_link"."consumed_by_user_id" IS NOT NULL AND "knight_hacks_project_claim_link"."token" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "hacker_schedule_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "hacker_schedule_emergency" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "project_claims_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_judging_configuration" ADD COLUMN "project_claim_url" text;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_member" ADD COLUMN "invited_user_id" uuid;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_member" ADD CONSTRAINT "project_member_id_project_unique" UNIQUE("id","project_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_project_claim" ADD CONSTRAINT "knight_hacks_project_claim_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_claim" ADD CONSTRAINT "project_claim_member_scope_fk" FOREIGN KEY ("member_id","project_id") REFERENCES "public"."knight_hacks_project_member"("id","project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_claim" ADD CONSTRAINT "project_claim_project_scope_fk" FOREIGN KEY ("project_id","hackathon_id") REFERENCES "public"."knight_hacks_project"("id","hackathon_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_claim_link" ADD CONSTRAINT "knight_hacks_project_claim_link_member_id_knight_hacks_project_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_project_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_claim_link" ADD CONSTRAINT "knight_hacks_project_claim_link_consumed_by_user_id_auth_user_id_fk" FOREIGN KEY ("consumed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_project_member" ADD CONSTRAINT "knight_hacks_project_member_invited_user_id_auth_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

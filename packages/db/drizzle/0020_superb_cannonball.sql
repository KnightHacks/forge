CREATE TYPE "public"."alumni_bulletin_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "knight_hacks_alumni_bulletin_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text,
	"image_object_name" varchar(255),
	"image_alt" varchar(240),
	"cta_label" varchar(80),
	"external_url" varchar(2048),
	"form_id" uuid,
	"state" "alumni_bulletin_state" DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alumni_bulletin_action_exclusive" CHECK (NOT ("knight_hacks_alumni_bulletin_post"."external_url" IS NOT NULL AND "knight_hacks_alumni_bulletin_post"."form_id" IS NOT NULL)),
	CONSTRAINT "alumni_bulletin_action_pair" CHECK ((("knight_hacks_alumni_bulletin_post"."external_url" IS NULL AND "knight_hacks_alumni_bulletin_post"."form_id" IS NULL) OR "knight_hacks_alumni_bulletin_post"."cta_label" IS NOT NULL)),
	CONSTRAINT "alumni_bulletin_display_order_nonnegative" CHECK ("knight_hacks_alumni_bulletin_post"."display_order" >= 0),
	CONSTRAINT "alumni_bulletin_image_alt_pair" CHECK ((("knight_hacks_alumni_bulletin_post"."image_object_name" IS NULL AND "knight_hacks_alumni_bulletin_post"."image_alt" IS NULL) OR ("knight_hacks_alumni_bulletin_post"."image_object_name" IS NOT NULL AND "knight_hacks_alumni_bulletin_post"."image_alt" IS NOT NULL))),
	CONSTRAINT "alumni_bulletin_schedule_order" CHECK ("knight_hacks_alumni_bulletin_post"."expires_at" IS NULL OR "knight_hacks_alumni_bulletin_post"."publish_at" IS NULL OR "knight_hacks_alumni_bulletin_post"."expires_at" > "knight_hacks_alumni_bulletin_post"."publish_at")
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD COLUMN "alumni_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "knight_hacks_alumni_bulletin_post" ADD CONSTRAINT "knight_hacks_alumni_bulletin_post_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_alumni_bulletin_post" ADD CONSTRAINT "knight_hacks_alumni_bulletin_post_created_by_user_id_auth_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_alumni_bulletin_post" ADD CONSTRAINT "knight_hacks_alumni_bulletin_post_updated_by_user_id_auth_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_alumni_bulletin_state_order_idx" ON "knight_hacks_alumni_bulletin_post" USING btree ("state","display_order");--> statement-breakpoint
CREATE INDEX "knight_hacks_alumni_bulletin_publication_window_idx" ON "knight_hacks_alumni_bulletin_post" USING btree ("publish_at","expires_at");

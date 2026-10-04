CREATE TABLE "knight_hacks_point_store_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(2000) DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"stock" integer,
	"sold_out" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"image_object_name" text,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "point_store_item_hackathon_unique" UNIQUE("id","hackathon_id"),
	CONSTRAINT "point_store_item_price_check" CHECK ("knight_hacks_point_store_item"."price" BETWEEN 0 AND 1000000),
	CONSTRAINT "point_store_item_stock_check" CHECK ("knight_hacks_point_store_item"."stock" IS NULL OR "knight_hacks_point_store_item"."stock" BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_point_store_purchase" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"attendee_id" uuid,
	"item_id" uuid NOT NULL,
	"hacker_name" text NOT NULL,
	"item_name" varchar(120) NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"total" integer NOT NULL,
	"stock_tracked" boolean NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"voided_by_name" text,
	"void_reason" varchar(500),
	"restocked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "point_store_purchase_amount_check" CHECK ("knight_hacks_point_store_purchase"."unit_price" BETWEEN 0 AND 1000000 AND "knight_hacks_point_store_purchase"."quantity" BETWEEN 1 AND 1000 AND "knight_hacks_point_store_purchase"."total" = "knight_hacks_point_store_purchase"."unit_price" * "knight_hacks_point_store_purchase"."quantity"),
	CONSTRAINT "point_store_purchase_void_check" CHECK (("knight_hacks_point_store_purchase"."voided_at" IS NULL AND NOT "knight_hacks_point_store_purchase"."restocked") OR "knight_hacks_point_store_purchase"."voided_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "store_catalog_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "store_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "store_location" varchar(240) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_item" ADD CONSTRAINT "knight_hacks_point_store_item_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_purchase" ADD CONSTRAINT "knight_hacks_point_store_purchase_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_purchase" ADD CONSTRAINT "knight_hacks_point_store_purchase_attendee_id_knight_hacks_hacker_attendee_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_purchase" ADD CONSTRAINT "knight_hacks_point_store_purchase_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_purchase" ADD CONSTRAINT "knight_hacks_point_store_purchase_voided_by_auth_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_point_store_purchase" ADD CONSTRAINT "point_store_purchase_item_fk" FOREIGN KEY ("item_id","hackathon_id") REFERENCES "public"."knight_hacks_point_store_item"("id","hackathon_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_store_item_hackathon_idx" ON "knight_hacks_point_store_item" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "point_store_purchase_history_idx" ON "knight_hacks_point_store_purchase" USING btree ("hackathon_id","created_at","id");--> statement-breakpoint
CREATE INDEX "point_store_purchase_balance_idx" ON "knight_hacks_point_store_purchase" USING btree ("attendee_id","hackathon_id") WHERE "knight_hacks_point_store_purchase"."voided_at" IS NULL;
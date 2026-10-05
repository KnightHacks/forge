CREATE TABLE "knight_hacks_hackathon_map_configuration" (
	"hackathon_id" uuid PRIMARY KEY NOT NULL,
	"restrictions_enabled" boolean DEFAULT false NOT NULL,
	"rooms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_map_configuration" ADD CONSTRAINT "knight_hacks_hackathon_map_configuration_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;
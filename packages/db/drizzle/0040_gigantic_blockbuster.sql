CREATE TABLE "knight_hacks_dues_configuration" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"payments_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_dues_configuration_singleton_check" CHECK ("knight_hacks_dues_configuration"."id" = 'global')
);
--> statement-breakpoint
INSERT INTO "knight_hacks_dues_configuration" ("id", "payments_enabled")
VALUES ('global', false);

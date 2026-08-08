CREATE TABLE "knight_hacks_hackathon_portal_session_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_session_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"token_kind" varchar(8) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_hackathon_portal_session_credential_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "knight_hacks_hackathon_portal_session_credential_hash_check" CHECK ("knight_hacks_hackathon_portal_session_credential"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "knight_hacks_hackathon_portal_session_credential_kind_check" CHECK ("knight_hacks_hackathon_portal_session_credential"."token_kind" IN ('access', 'refresh'))
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_portal_session_credential" ADD CONSTRAINT "knight_hacks_hackathon_portal_session_credential_portal_session_id_knight_hacks_hackathon_portal_session_id_fk" FOREIGN KEY ("portal_session_id") REFERENCES "public"."knight_hacks_hackathon_portal_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_portal_session_credential" ("portal_session_id", "token_hash", "token_kind", "expires_at", "created_at")
SELECT "id", "access_token_hash", 'access', "access_expires_at", "created_at"
FROM "knight_hacks_hackathon_portal_session";--> statement-breakpoint
INSERT INTO "knight_hacks_hackathon_portal_session_credential" ("portal_session_id", "token_hash", "token_kind", "expires_at", "created_at")
SELECT "id", "refresh_token_hash", 'refresh', "refresh_expires_at", "created_at"
FROM "knight_hacks_hackathon_portal_session";--> statement-breakpoint
CREATE INDEX "knight_hacks_hackathon_portal_session_credential_session_idx" ON "knight_hacks_hackathon_portal_session_credential" USING btree ("portal_session_id");

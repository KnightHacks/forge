CREATE TABLE "knight_hacks_discord_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"label" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"production_id" varchar(20) NOT NULL,
	"development_id" varchar(20),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_discord_config_key_unique" UNIQUE("key"),
	CONSTRAINT "knight_hacks_discord_config_kind_check" CHECK ("knight_hacks_discord_config"."kind" IN ('channel', 'guild', 'role')),
	CONSTRAINT "knight_hacks_discord_config_production_id_check" CHECK ("knight_hacks_discord_config"."production_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_discord_config_development_id_check" CHECK ("knight_hacks_discord_config"."development_id" IS NULL OR "knight_hacks_discord_config"."development_id" ~ '^[0-9]{17,20}$')
);
--> statement-breakpoint
-- Backfill: the exact values that were hard-coded in @forge/consts before this
-- migration, so the switch to table-driven lookups is a no-op in production.
--
-- `development_id` NULL means "reuse production_id", which reproduces the old
-- `ALUMNI_ROLE = PROD_ALUMNI_ROLE` line and the director roles that never had a
-- development counterpart. `recruiting_channel`'s development value really was
-- the *development log* channel, not a development recruiting channel; that was
-- an accident of `RECRUITING_CHANNEL = IS_PROD ? PROD_RECRUITING_CHANNEL :
-- DEV_LOG_CHANNEL` and is preserved verbatim rather than "fixed" here.
--
-- ON CONFLICT DO NOTHING keeps this safe to replay and stops it from clobbering
-- a value an officer has already corrected.
INSERT INTO "knight_hacks_discord_config" ("key", "kind", "label", "description", "production_id", "development_id") VALUES
	('guild', 'guild', 'Knight Hacks Discord server', 'The Discord server every bot, cron job, and role sync operates against. Changing this repoints the entire platform at a different server.', '486628710443778071', '1151877367434850364'),
	('log_channel', 'channel', 'Audit log channel', 'Channel that receives Blade audit log embeds for administrative actions.', '1324885515412963531', '1284582557689843785'),
	('recruiting_channel', 'channel', 'Recruiting notification channel', 'Channel that receives recruiting notifications posted by form callbacks.', '1461758896950608104', '1284582557689843785'),
	('officer_role', 'role', 'Officer role', 'Discord role held by club officers.', '486629374758748180', '1246637685011906560'),
	('admin_role', 'role', 'Admin role', 'Discord role held by Blade administrators.', '1319413082258411652', '1321955700540309645'),
	('volunteer_role', 'role', 'Volunteer role', 'Discord role held by event volunteers.', '1415505872360312974', '1426947077514203279'),
	('alumni_role', 'role', 'Alumni role', 'Discord role the nightly alumni cron grants to members whose graduation date has passed, and revokes from members whose has not.', '486629512101232661', NULL),
	('vip_role', 'role', 'VIP role', 'Discord role held by VIP guests.', '1423358570203844689', '1423366084874080327'),
	('outreach_director_role', 'role', 'Outreach director role', 'Discord role held by the director of the Outreach team.', '779845137822908436', NULL),
	('design_director_role', 'role', 'Design director role', 'Discord role held by the director of the Design team.', '874028482089349172', NULL),
	('development_director_role', 'role', 'Development director role', 'Discord role held by the director of the Development team.', '1082124530077683772', NULL),
	('sponsorship_director_role', 'role', 'Sponsorship director role', 'Discord role held by the director of the Sponsorship team.', '626815399442513920', NULL),
	('workshops_director_role', 'role', 'Workshops director role', 'Discord role held by the director of the Workshops team.', '757002949603098837', NULL),
	('projects_mentorship_director_role', 'role', 'Projects/Mentorship director role', 'Discord role held by the director of the Projects/Mentorship team.', '1244790444626280550', NULL)
ON CONFLICT ("key") DO NOTHING;

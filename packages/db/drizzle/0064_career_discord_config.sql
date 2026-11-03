ALTER TABLE "knight_hacks_discord_config" ALTER COLUMN "production_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_discord_config" ADD CONSTRAINT "knight_hacks_discord_config_production_id_required_check" CHECK ("knight_hacks_discord_config"."key" = 'career_source_health_channel' OR "knight_hacks_discord_config"."production_id" IS NOT NULL);
--> statement-breakpoint
-- #648: production posting channels and opt-in reminder roles supplied by the
-- Career contributor. Digests share each track's posting channel. These keys
-- have no delivery consumers yet; this migration does not enable posting.
--
-- No development IDs have been supplied. NULL retains the existing resolver's
-- production fallback, so configure development destinations before wiring or
-- exercising real Discord delivery outside production.
--
-- An officer must configure the source-health channel in Blade before Discord
-- failure alerts can be enabled. Both IDs intentionally start NULL.
-- Replaying the seed must preserve officer edits, including an unset channel.
INSERT INTO "knight_hacks_discord_config" ("key", "kind", "label", "description", "production_id", "development_id") VALUES
	('career_internship_channel', 'channel', 'Career internship posting channel', 'Channel for internship posts and digests.', '1537949209867583499', NULL),
	('career_new_grad_channel', 'channel', 'Career new-grad posting channel', 'Channel for new-grad posts and digests.', '1537949230742900827', NULL),
	('career_source_health_channel', 'channel', 'Career source-health alert channel', 'Optional channel for job source failure alerts.', NULL, NULL),
	('career_internship_digest_role', 'role', 'Career internship digest role', 'Discord role pinged for internship digests.', '1537949002031562862', NULL),
	('career_new_grad_digest_role', 'role', 'Career new-grad digest role', 'Discord role pinged for new-grad digests.', '1537948941348503683', NULL)
ON CONFLICT ("key") DO NOTHING;

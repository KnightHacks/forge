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
	('career_internship_channel', 'channel', 'Career internship posting channel', 'Channel for internship postings and internship digests. Changing this moves future internship messages.', '1537949209867583499', NULL),
	('career_new_grad_channel', 'channel', 'Career new-grad posting channel', 'Channel for new-grad postings and new-grad digests. Changing this moves future new-grad messages.', '1537949230742900827', NULL),
	('career_source_health_channel', 'channel', 'Career source-health alert channel', 'Optional channel for Career source-failure alerts. An officer must configure this before Discord failure alerts can be enabled.', NULL, NULL),
	('career_internship_digest_role', 'role', 'Career internship digest role', 'Opt-in reminder role mentioned by internship digests. This selects notification recipients and does not grant officer access.', '1537949002031562862', NULL),
	('career_new_grad_digest_role', 'role', 'Career new-grad digest role', 'Opt-in reminder role mentioned by new-grad digests. This selects notification recipients and does not grant officer access.', '1537948941348503683', NULL)
ON CONFLICT ("key") DO NOTHING;

-- Shorten the original Career descriptions to match the existing config copy.
-- Only replace the seeded wording; preserve officer edits and all routing IDs.
UPDATE "knight_hacks_discord_config" AS config
SET "description" = copy."description", "updated_at" = now()
FROM (VALUES
	('career_internship_channel', 'Channel for internship postings and internship digests. Changing this moves future internship messages.', 'Channel for internship posts and digests.'),
	('career_new_grad_channel', 'Channel for new-grad postings and new-grad digests. Changing this moves future new-grad messages.', 'Channel for new-grad posts and digests.'),
	('career_source_health_channel', 'Optional channel for Career source-failure alerts. An officer must configure this before Discord failure alerts can be enabled.', 'Optional channel for job source failure alerts.'),
	('career_internship_digest_role', 'Opt-in reminder role mentioned by internship digests. This selects notification recipients and does not grant officer access.', 'Discord role pinged for internship digests.'),
	('career_new_grad_digest_role', 'Opt-in reminder role mentioned by new-grad digests. This selects notification recipients and does not grant officer access.', 'Discord role pinged for new-grad digests.')
) AS copy("key", "previous_description", "description")
WHERE config."key" = copy."key" AND config."description" = copy."previous_description";

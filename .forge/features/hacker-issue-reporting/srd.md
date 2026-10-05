# Technical requirements

Add nullable issueReportsChannelId and issueReportsRoleId columns on Hackathon, with Discord snowflake checks and an additive generated migration. Existing hackathons default to unconfigured; migrate before deploying the new API. Officer-only getIssueReporting/updateIssueReporting use the existing platform-config permission gate, lock the event while saving, and audit changed fields. Blade's Hackathons detail renders the configuration panel with existing Card/Input/Button tokens.

The participant reportIssue API requires an authenticated applicant of the configured event. Derive event/reporter server-side and never accept channel, role, or identity from the caller. Post through the existing bot; allowed_mentions.parse is empty and roles contains only the configured role. Descriptions are trimmed and bounded to 2000 characters. Five successful reports per user in ten minutes; per-user DB lock serializes the limit. Reuse participant-command idempotency plus Discord nonce deduplication. Missing configuration or Discord failure never reports success.

No production IDs are hardcoded or global Discord-config rows introduced. Live channels must be private and the bot must have channel and role-mention permissions. Numeric judging APIs and UI are untouched by this branch.

Deployment order: database migration, backend/SDK, then frontend. The numeric-privacy branch will be based on this commit. No migration rollback deletes report data; restoring prior code leaves the additive nullable columns intact.

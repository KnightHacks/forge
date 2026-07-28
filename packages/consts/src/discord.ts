import { IS_PROD } from "./util";

//
// Discord organizational state — guild, channel, and role IDs — is no longer
// hard-coded here. It lives in the `knight_hacks_discord_config` table and is
// read through `@forge/utils/discord-config`.
//
// A Discord server gets reorganized and an officer team turns over roughly
// every year, so every one of those IDs failed the "would this require a
// developer change next year?" test. What stays in this file is the part that
// genuinely is a code contract: the set of settings the platform knows how to
// look up, and the kinds of Discord object they point at.
//

/**
 * The kind of Discord object a config row points at. Purely descriptive: it
 * tells an officer editing a row whether to paste a server ID, a channel ID, or
 * a role ID. Nothing branches on it.
 */
export const CONFIG_KINDS = ["channel", "guild", "role"] as const;

export type ConfigKind = (typeof CONFIG_KINDS)[number];

/**
 * Every setting the platform reads out of `knight_hacks_discord_config`.
 *
 * This is a contract, not organizational state: adding a key means adding code
 * that reads it, so it belongs in the codebase. The *values* behind the keys are
 * organizational state and belong to the table.
 *
 * Keys are stable identifiers — renaming one is a breaking change that needs a
 * data migration, exactly like renaming a column.
 */
export const CONFIG_KEYS = [
  "guild",
  "log_channel",
  "recruiting_channel",
  "officer_role",
  "admin_role",
  "volunteer_role",
  "alumni_role",
  "vip_role",
  "outreach_director_role",
  "design_director_role",
  "development_director_role",
  "sponsorship_director_role",
  "workshops_director_role",
  "projects_mentorship_director_role",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

/**
 * @deprecated Read `"guild"` from `@forge/utils/discord-config` instead.
 *
 * These three survive only because `apps/blade`'s Playwright specs and
 * `@forge/api`'s role-management test fixture still compare against the literal
 * snowflake, and `apps/blade` is out of scope for this change. Delete them once
 * those fixtures resolve the guild from the config table.
 */
export const PROD_KNIGHTHACKS_GUILD = "486628710443778071";
/** @deprecated See {@link PROD_KNIGHTHACKS_GUILD}. */
export const DEV_KNIGHTHACKS_GUILD = "1151877367434850364";
/** @deprecated See {@link PROD_KNIGHTHACKS_GUILD}. */
export const KNIGHTHACKS_GUILD = IS_PROD
  ? PROD_KNIGHTHACKS_GUILD
  : DEV_KNIGHTHACKS_GUILD;

/**
 * The club's vanity invite link. Deliberately *not* moved into the config
 * table: it is a URL rather than a Discord snowflake, it has no
 * production/development pair, and every remaining reference to it lives in
 * `legacy/`. Storing it would mean loosening the snowflake check constraint
 * that guards every other row for the sake of one archival value.
 */
export const PERMANENT_INVITE = "https://discord.com/invite/Kv5g9vf";

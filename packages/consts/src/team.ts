// The former `TEAMS` array lived here. Its six Discord director-role snowflakes
// moved to the `knight_hacks_discord_config` table (keys `*_director_role`) and
// are read through `@forge/utils/discord-config`. Its per-team hex colors were
// dropped rather than migrated: `auth_roles.color` is the live source for team
// display color, and nothing ever read the copy stored here.
//
// The club team roster followed. `CLUB_TEAM_DEFINITIONS`,
// `CLUB_EXECUTIVE_ROLE_ORDER`, `CLUB_DIRECTOR_ROLE_ORDER`,
// `CLUB_TEAM_ROLE_CONFIG`, `CLUB_ROSTER_ROLE_NAMES` and
// `EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES` are now rows in `knight_hacks_club_team`
// and `knight_hacks_club_team_role`, keyed by `auth_roles.id` rather than by
// role name. They failed Forge's own test — a new hackathon year meant editing
// `teamRoleName: "KH IX Team"` and redeploying — and they classified members by
// a string a Discord admin can rename, which emptied a team on the public site
// with no error. Read them through `@forge/api`'s guild club-team config.

/**
 * What a club team bucket, and a role's place in it, can be.
 *
 * This is a code contract rather than organizational state: the roster's
 * bucketing rules are written against these three values, so adding a fourth is
 * a code change. It lives here for the same reason `DISCORD.CONFIG_KINDS` does
 * — `@forge/db` types the column with it and the check constraint enumerates
 * it, so the database and the application cannot disagree about the set.
 */
export const CLUB_TEAM_KINDS = ["executive", "director", "team"] as const;

export type ClubTeamKind = (typeof CLUB_TEAM_KINDS)[number];

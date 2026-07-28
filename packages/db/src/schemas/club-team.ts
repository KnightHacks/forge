import { sql } from "drizzle-orm";
import { check, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

import type { TEAM } from "@forge/consts";

import { Roles } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_${name}`);

/**
 * The teams the public Club site renders, in the order it renders them.
 *
 * This used to be `TEAM.CLUB_TEAM_DEFINITIONS`, which meant adding a team,
 * renaming one, or reordering the tab strip was a code change and a deploy.
 *
 * Two of these rows — the executive and director buckets — are not teams anyone
 * applies to; they are the groupings officers and directors are collected into.
 * `kind` is what says so, and it is why the roster code no longer has to know
 * that the literal strings `"executive"` and `"directors"` are special.
 */
export const ClubTeam = createTable(
  "club_team",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    /** Stable identifier the Club site keys its roster payload by. */
    slug: t.varchar({ length: 64 }).notNull().unique(),
    /** Short name for tabs and the mobile picker, e.g. "Design". */
    label: t.varchar({ length: 64 }).notNull(),
    /** Section heading shown when the team is selected, e.g. "Design Team". */
    heading: t.varchar({ length: 128 }).notNull(),
    /**
     * Which sort of bucket this is. `executive` and `director` collect roles
     * classified as such; `team` collects a team's own members and its lead.
     */
    kind: t.varchar({ length: 16 }).$type<TEAM.ClubTeamKind>().notNull(),
    /** Left-to-right order in the Club site's tab strip. */
    displayOrder: t.integer().notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    validKind: check(
      "knight_hacks_club_team_kind_check",
      sql`${table.kind} IN ('executive', 'director', 'team')`,
    ),
    // Ties would make the tab strip order depend on physical row order, which
    // is the sort of "works until it doesn't" ordering bug nobody reproduces.
    uniqueDisplayOrder: uniqueIndex(
      "knight_hacks_club_team_display_order_unique",
    ).on(table.displayOrder),
    // A role classified `executive` resolves its bucket by looking for the team
    // of kind `executive`. Two of them would make that lookup ambiguous.
    singleExecutiveBucket: uniqueIndex("knight_hacks_club_team_kind_unique")
      .on(table.kind)
      .where(sql`${table.kind} <> 'team'`),
  }),
);

/**
 * How one Blade role participates in the club roster.
 *
 * The point of this table is the column it is keyed by. Classification used to
 * be a name match — `inArray(Roles.name, CLUB_ROSTER_ROLE_NAMES)` — so renaming
 * a Discord role emptied a team on the public site with no error and no failing
 * test. `roleId` is a UUID that survives a rename, so names are free to change
 * and are now only display data.
 *
 * One row per role. A role has exactly one `kind`, which decides its primary
 * bucket:
 *
 * - `executive` and `director` roles land in the team of that same kind.
 * - `team` roles land in the team named by `teamId`.
 *
 * An `executive` or `director` role that also names a `teamId` **leads** that
 * team, and appears in both buckets — which is how "Hack Lead" shows up under
 * Executive Officers and at the top of the Hackathon team. There is no separate
 * `is_lead` flag because it would be derivable from those two columns and could
 * therefore disagree with them.
 */
export const ClubTeamRole = createTable(
  "club_team_role",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    /**
     * The classified role. Unique because a role has one place in the roster,
     * and cascading because an unlinked role has no place in it at all.
     */
    roleId: t
      .uuid()
      .notNull()
      .unique()
      .references(() => Roles.id, { onDelete: "cascade" }),
    kind: t.varchar({ length: 16 }).$type<TEAM.ClubTeamKind>().notNull(),
    /**
     * Sort position inside this role's primary bucket. President before Vice
     * President, Design Director before Sponsorship Director. Plain team
     * members all share one rank; their lead is placed ahead of them by the
     * bucketing rule, not by this column.
     */
    rank: t.integer().notNull(),
    /** The team this role belongs to, or leads. Required when `kind` is `team`. */
    teamId: t.uuid().references(() => ClubTeam.id, { onDelete: "restrict" }),
    /**
     * Overrides the label shown on the member's roster card. `NULL` means "use
     * the role name", except for a plain team member, where it means "use the
     * team's label". Only the aggregate "Directors" role needs one today: it
     * shows as the singular "Director".
     */
    rosterLabel: t.varchar({ length: 64 }),
    /**
     * Overrides the badge shown on a Guild profile. `NULL` means "use the role
     * name", except for a team role, where it means `"<team label> Team"`.
     * "Officers" shows as the singular "Officer"; the hackathon team role shows
     * as "Organizer".
     */
    calloutLabel: t.varchar({ length: 64 }),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  }),
  (table) => ({
    validKind: check(
      "knight_hacks_club_team_role_kind_check",
      sql`${table.kind} IN ('executive', 'director', 'team')`,
    ),
    // A `team` role with no team has no bucket to land in, so it would silently
    // vanish from the roster — the failure mode this whole table exists to end.
    teamRoleHasTeam: check(
      "knight_hacks_club_team_role_team_check",
      sql`${table.kind} <> 'team' OR ${table.teamId} IS NOT NULL`,
    ),
  }),
);

export type InsertClubTeam = typeof ClubTeam.$inferInsert;
export type SelectClubTeam = typeof ClubTeam.$inferSelect;
export type InsertClubTeamRole = typeof ClubTeamRole.$inferInsert;
export type SelectClubTeamRole = typeof ClubTeamRole.$inferSelect;

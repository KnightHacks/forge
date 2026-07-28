import { readdir, readFile } from "node:fs/promises";
import type { QueryResultRow } from "pg";
import { z } from "zod";

import { TEAM } from "@forge/consts";

/**
 * Re-runnable classification of Blade roles into the club roster, behind
 * `scripts/classify-club-roles.ts`.
 *
 * Migration `0026` created `knight_hacks_club_team_role` and backfilled it, and
 * that backfill is the only thing that has ever written the table. It resolves
 * role *names* against `auth_roles` and no-ops when none of them match, which
 * is correct — you cannot classify roles that do not exist, and raising instead
 * would make `drizzle-kit migrate` unrunnable on an empty database.
 *
 * The gap is what happens afterwards. `docs/GETTING-STARTED.md` tells every
 * contributor and every new environment to migrate an empty database first, so
 * `auth_roles` is empty at that moment, the backfill classifies nothing, and the
 * migration is then recorded as applied. Roles linked later were reached by
 * nothing: not the migration, not a seed, not a procedure. The result was a
 * permanently empty public Club roster on every fresh environment, with nothing
 * anywhere to say why. This module is the thing that runs afterwards.
 *
 * Two properties matter more than anything else here:
 *
 * * It only ever INSERTs. It never updates and never deletes, so running it
 *   twice changes nothing the second time and an officer's hand edit survives
 *   somebody else re-running it.
 * * Names are a bootstrap input, not the source of truth. They are used exactly
 *   the way the migration used them — to find a role that has no classification
 *   row yet — and never to re-key, correct, or remove one that exists. A role
 *   classified today and renamed in Discord tomorrow keeps its classification,
 *   because the row is keyed by `auth_roles.id`. That is the whole point of the
 *   table, and this tool must not quietly undo it.
 */

const MIGRATION_DIRECTORY = new URL("../../drizzle/", import.meta.url);

/**
 * The `role_seed` literal inside migration `0026`.
 *
 * Read out of the migration rather than restated here on purpose: a second copy
 * of nineteen role names, ranks, and label overrides is a second copy that can
 * disagree with the first, and disagreement would show up as a wrong public
 * roster rather than as an error. The migration is an applied, immutable file,
 * so there is exactly one mapping and it lives where it was first written.
 */
const SEED_LITERAL_PATTERN = /role_seed CONSTANT jsonb := '([\s\S]*?)'\s*;/;

const seedSchema = z.array(
  z.object({
    role_name: z.string(),
    kind: z.enum(TEAM.CLUB_TEAM_KINDS),
    rank: z.number().int(),
    team_slug: z.string().nullable(),
    roster_label: z.string().nullable(),
    callout_label: z.string().nullable(),
  }),
);

export interface ClubRoleSeedEntry {
  roleName: string;
  kind: TEAM.ClubTeamKind;
  rank: number;
  teamSlug: string | null;
  rosterLabel: string | null;
  calloutLabel: string | null;
}

/** The name-to-classification mapping, parsed from migration `0026`. */
export async function readClubRoleSeed(): Promise<ClubRoleSeedEntry[]> {
  const files = (await readdir(MIGRATION_DIRECTORY))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(new URL(file, MIGRATION_DIRECTORY), "utf8");
    const literal = SEED_LITERAL_PATTERN.exec(sql)?.[1];
    if (!literal) continue;

    return seedSchema.parse(JSON.parse(literal)).map((entry) => ({
      roleName: entry.role_name,
      kind: entry.kind,
      rank: entry.rank,
      teamSlug: entry.team_slug,
      rosterLabel: entry.roster_label,
      calloutLabel: entry.callout_label,
    }));
  }

  throw new Error(
    "No migration declares a `role_seed` club roster mapping. This tool reads the mapping out of the migration that introduced it rather than keeping a second copy, so it cannot run without it.",
  );
}

/**
 * The `query` surface this needs, which both a `pg` `Client` and the pool
 * behind `@forge/db/client` satisfy. Narrow on purpose: the script runs against
 * `DATABASE_URL` and the tests run against disposable databases, and neither
 * should have to build a second Drizzle instance to say so.
 */
export interface ClubRoleClient {
  query<Row extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Row[] }>;
}

export interface ClassifiedClubRole {
  roleId: string;
  roleName: string;
  kind: TEAM.ClubTeamKind;
}

export interface UnresolvedClubRole {
  roleName: string;
  kind: TEAM.ClubTeamKind;
  /**
   * `role` — no `auth_roles` row carries this name, so there is nothing to key
   * a classification to. `team` — the role exists but the team it belongs to or
   * leads is not in `knight_hacks_club_team`, so classifying it would put it in
   * no bucket at all.
   */
  reason: "role" | "team";
  teamSlug: string | null;
}

export interface ClubRoleClassificationReport {
  /** Rows this run inserted. */
  classified: ClassifiedClubRole[];
  /** Roles that already had a row, left exactly as they were. */
  alreadyClassified: ClassifiedClubRole[];
  /** Configured roles this run could not key to anything. */
  unresolved: UnresolvedClubRole[];
}

interface RoleRow extends QueryResultRow {
  id: string;
  name: string;
}

interface TeamRow extends QueryResultRow {
  id: string;
  slug: string;
}

interface ClassifiedRow extends QueryResultRow {
  role_id: string;
}

interface PendingRow {
  role_id: string;
  kind: TEAM.ClubTeamKind;
  rank: number;
  team_id: string | null;
  roster_label: string | null;
  callout_label: string | null;
}

/**
 * Classifies every configured role that exists now and is not already
 * classified, and reports what it did.
 *
 * Safe to run at any time, and only useful after Discord roles have been linked
 * in Blade. It returns rather than raises when a name resolves to nothing: a
 * half-linked Blade is the normal state during setup, and a tool nobody can
 * re-run until every role is linked is a tool nobody runs.
 */
export async function classifyClubRoles(
  client: ClubRoleClient,
): Promise<ClubRoleClassificationReport> {
  const seed = await readClubRoleSeed();

  // Issued one at a time rather than in parallel: a single `pg` client executes
  // one query at a time and warns when it is handed a second mid-flight.
  const { rows: roleRows } = await client.query<RoleRow>(
    `SELECT "id", "name" FROM "auth_roles" WHERE "name" = ANY($1::text[])`,
    [seed.map((entry) => entry.roleName)],
  );
  const { rows: teamRows } = await client.query<TeamRow>(
    `SELECT "id", "slug" FROM "knight_hacks_club_team"`,
  );
  const { rows: classifiedRows } = await client.query<ClassifiedRow>(
    `SELECT "role_id" FROM "knight_hacks_club_team_role"`,
  );

  // `auth_roles.name` is not unique, and the migration's INNER JOIN classified
  // every row that matched. Do the same rather than picking one arbitrarily.
  const rolesByName = new Map<string, RoleRow[]>();
  for (const role of roleRows) {
    rolesByName.set(role.name, [...(rolesByName.get(role.name) ?? []), role]);
  }
  const teamIdBySlug = new Map(teamRows.map((team) => [team.slug, team.id]));
  const alreadyClassifiedRoleIds = new Set(
    classifiedRows.map((row) => row.role_id),
  );

  const alreadyClassified: ClassifiedClubRole[] = [];
  const unresolved: UnresolvedClubRole[] = [];
  const pending: PendingRow[] = [];
  const pendingByRoleId = new Map<string, ClassifiedClubRole>();

  for (const entry of seed) {
    const roles = rolesByName.get(entry.roleName) ?? [];
    if (roles.length === 0) {
      unresolved.push({
        roleName: entry.roleName,
        kind: entry.kind,
        reason: "role",
        teamSlug: entry.teamSlug,
      });
      continue;
    }

    const teamId =
      entry.teamSlug === null
        ? null
        : (teamIdBySlug.get(entry.teamSlug) ?? null);
    if (entry.teamSlug !== null && teamId === null) {
      unresolved.push({
        roleName: entry.roleName,
        kind: entry.kind,
        reason: "team",
        teamSlug: entry.teamSlug,
      });
      continue;
    }

    for (const role of roles) {
      const classification = {
        roleId: role.id,
        roleName: entry.roleName,
        kind: entry.kind,
      };

      if (alreadyClassifiedRoleIds.has(role.id)) {
        alreadyClassified.push(classification);
        continue;
      }

      pending.push({
        role_id: role.id,
        kind: entry.kind,
        rank: entry.rank,
        team_id: teamId,
        roster_label: entry.rosterLabel,
        callout_label: entry.calloutLabel,
      });
      pendingByRoleId.set(role.id, classification);
    }
  }

  // `ON CONFLICT DO NOTHING` rather than an upsert: a row that exists is a
  // decision somebody already made, whether this tool made it or an officer did
  // by hand. `RETURNING` is what makes the count below true rather than
  // optimistic — it reports rows that were actually written.
  const { rows: inserted } = await client.query<ClassifiedRow>(
    `INSERT INTO "knight_hacks_club_team_role"
       ("role_id", "kind", "rank", "team_id", "roster_label", "callout_label")
     SELECT pending."role_id", pending."kind", pending."rank", pending."team_id",
            pending."roster_label", pending."callout_label"
     FROM jsonb_to_recordset($1::jsonb) AS pending(
       "role_id" uuid,
       "kind" varchar(16),
       "rank" integer,
       "team_id" uuid,
       "roster_label" varchar(64),
       "callout_label" varchar(64)
     )
     ON CONFLICT ("role_id") DO NOTHING
     RETURNING "role_id"`,
    [JSON.stringify(pending)],
  );

  return {
    classified: inserted.flatMap(
      (row) => pendingByRoleId.get(row.role_id) ?? [],
    ),
    alreadyClassified,
    unresolved,
  };
}

export function formatClubRoleClassificationReport(
  report: ClubRoleClassificationReport,
): string {
  const lines = [
    "Club role classification",
    `classified by this run: ${report.classified.length}`,
    `already classified, left untouched: ${report.alreadyClassified.length}`,
    `configured roles that could not be resolved: ${report.unresolved.length}`,
    "",
  ];

  if (report.classified.length > 0) {
    lines.push("Classified now:");
    for (const role of report.classified) {
      lines.push(`  ${role.roleName} (${role.kind})`);
    }
    lines.push("");
  }

  if (report.unresolved.length > 0) {
    lines.push("Could not resolve:");
    for (const role of report.unresolved) {
      lines.push(
        role.reason === "role"
          ? `  ${role.roleName} (${role.kind}) — no auth_roles row carries this name`
          : `  ${role.roleName} (${role.kind}) — no knight_hacks_club_team row has slug "${role.teamSlug ?? ""}"`,
      );
    }
    lines.push(
      "",
      "Link those Discord roles in Blade and run this again. A team whose",
      "membership role is unresolved renders as an empty tab on the Club site.",
      "",
      "One false alarm to know about: a role that was classified earlier and has",
      "since been renamed in Discord is listed here, and is fine. Classification",
      "is keyed by auth_roles.id, so the rename did not disturb it — names are",
      "only used to bootstrap roles that have no classification row yet.",
      "",
    );
  }

  if (report.classified.length === 0 && report.unresolved.length === 0) {
    lines.push("Nothing to do: every configured role is already classified.");
    lines.push("");
  }

  lines.push("Nothing was updated or deleted. This tool only inserts.");

  return lines.join("\n");
}

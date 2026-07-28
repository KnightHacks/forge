import { readdir, readFile } from "node:fs/promises";
import type { QueryResultRow } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TEAM } from "@forge/consts";

import type { DisposableDatabase } from "../testing";
import { canRunDatabaseTests, provisionDisposableDatabase } from "../testing";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

/**
 * `TEAM.CLUB_TEAM_DEFINITIONS` as it read immediately before this migration.
 *
 * Frozen here for the same reason the Discord config migration freezes its
 * snowflakes: the backfill is the only thing standing between "the roster moved
 * into a table" and "the public Club site quietly renders a different team
 * list", and getting it wrong throws nothing at all — it just publishes the
 * wrong page.
 */
const EXPECTED_TEAMS: {
  slug: string;
  label: string;
  heading: string;
  kind: TEAM.ClubTeamKind;
  displayOrder: number;
}[] = [
  {
    slug: "executive",
    label: "Executive",
    heading: "Executive Officers",
    kind: "executive",
    displayOrder: 0,
  },
  {
    slug: "directors",
    label: "Directors",
    heading: "Directors",
    kind: "director",
    displayOrder: 1,
  },
  {
    slug: "hackathon",
    label: "Hackathon",
    heading: "Hackathon Team",
    kind: "team",
    displayOrder: 2,
  },
  {
    slug: "sponsorship",
    label: "Sponsorship",
    heading: "Sponsorship Team",
    kind: "team",
    displayOrder: 3,
  },
  {
    slug: "workshop",
    label: "Workshop",
    heading: "Workshop Team",
    kind: "team",
    displayOrder: 4,
  },
  {
    slug: "design",
    label: "Design",
    heading: "Design Team",
    kind: "team",
    displayOrder: 5,
  },
  {
    slug: "outreach",
    label: "Outreach",
    heading: "Outreach Team",
    kind: "team",
    displayOrder: 6,
  },
  {
    slug: "development",
    label: "Development",
    heading: "Development Team",
    kind: "team",
    displayOrder: 7,
  },
];

/**
 * `CLUB_EXECUTIVE_ROLE_ORDER`, `CLUB_DIRECTOR_ROLE_ORDER` and
 * `CLUB_TEAM_ROLE_CONFIG` flattened into the rows they become.
 *
 * `rank` restates the array positions those constants encoded, and the labels
 * restate the two places the old code special-cased a name: the aggregate
 * "Directors" role displayed as the singular "Director", and the hackathon team
 * role badged as "Organizer".
 */
const EXPECTED_ROLES: {
  roleName: string;
  kind: TEAM.ClubTeamKind;
  rank: number;
  teamSlug: string | null;
  rosterLabel: string | null;
  calloutLabel: string | null;
}[] = [
  {
    roleName: "President",
    kind: "executive",
    rank: 0,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Vice President",
    kind: "executive",
    rank: 1,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Treasurer",
    kind: "executive",
    rank: 2,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Secretary",
    kind: "executive",
    rank: 3,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Hack Lead",
    kind: "executive",
    rank: 4,
    teamSlug: "hackathon",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Dev Lead",
    kind: "executive",
    rank: 5,
    teamSlug: "development",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Officers",
    kind: "executive",
    rank: 6,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: "Officer",
  },
  {
    roleName: "Design Director",
    kind: "director",
    rank: 0,
    teamSlug: "design",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Sponsorship Director",
    kind: "director",
    rank: 1,
    teamSlug: "sponsorship",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Mentorship Director",
    kind: "director",
    rank: 2,
    teamSlug: null,
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Outreach Director",
    kind: "director",
    rank: 3,
    teamSlug: "outreach",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Workshop Director",
    kind: "director",
    rank: 4,
    teamSlug: "workshop",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Directors",
    kind: "director",
    rank: 5,
    teamSlug: null,
    rosterLabel: "Director",
    calloutLabel: "Director",
  },
  {
    roleName: "KH IX Team",
    kind: "team",
    rank: 1,
    teamSlug: "hackathon",
    rosterLabel: null,
    calloutLabel: "Organizer",
  },
  {
    roleName: "Sponsorship Team",
    kind: "team",
    rank: 1,
    teamSlug: "sponsorship",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Workshop Team",
    kind: "team",
    rank: 1,
    teamSlug: "workshop",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Design Team",
    kind: "team",
    rank: 1,
    teamSlug: "design",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Outreach Team",
    kind: "team",
    rank: 1,
    teamSlug: "outreach",
    rosterLabel: null,
    calloutLabel: null,
  },
  {
    roleName: "Dev Team",
    kind: "team",
    rank: 1,
    teamSlug: "development",
    rosterLabel: null,
    calloutLabel: null,
  },
];

/**
 * `EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES`, which migration `0013` already wrote to
 * `auth_roles.event_feedback_excluded`. Restated so the assertion below can show
 * that the constant is genuinely redundant with the column and not merely
 * deleted.
 */
const EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES = [
  "Dev Team",
  "Workshop Team",
  "Sponsorship Team",
  "Outreach Team",
  "Design Team",
  "KH IX Team",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Hack Lead",
  "Dev Lead",
  "Officers",
  "Design Director",
  "Sponsorship Director",
  "Outreach Director",
  "Workshop Director",
  "Directors",
];

interface ClubTeamRow extends QueryResultRow {
  slug: string;
  label: string;
  heading: string;
  kind: string;
  display_order: number;
}

interface ClubTeamRoleRow extends QueryResultRow {
  role_name: string;
  kind: string;
  rank: number;
  team_slug: string | null;
  roster_label: string | null;
  callout_label: string | null;
}

async function readClubTeamMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes(`CREATE TABLE "knight_hacks_club_team"`)) {
      return { file, sql };
    }
  }
  throw new Error("Club team migration was not found.");
}

/**
 * The classification half of the backfill, as one replayable statement.
 *
 * It is the last statement in the migration and it is a single `DO` block
 * precisely so tests can run it against databases the migration itself never
 * sees — one with a role missing, one with a role renamed.
 */
async function readClubRoleBackfillStatement() {
  const { sql } = await readClubTeamMigration();
  const statements = sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const backfill = statements.at(-1);

  if (!backfill?.includes("knight_hacks_club_team_role")) {
    throw new Error("Club role backfill statement was not found.");
  }

  return backfill;
}

const ROLE_NAMES = EXPECTED_ROLES.map(({ roleName }) => roleName);

function insertRolesSql(roleNames: readonly string[]) {
  const values = roleNames
    .map(
      (name, index) =>
        `('${name.replaceAll("'", "''")}', 'discord-${index}', '0')`,
    )
    .join(", ");

  return `INSERT INTO "auth_roles" ("name", "discord_role_id", "permissions") VALUES ${values}`;
}

const SELECT_CLASSIFICATIONS = `
  SELECT role."name" AS role_name, club_role."kind", club_role."rank",
         team."slug" AS team_slug, club_role."roster_label",
         club_role."callout_label"
  FROM "knight_hacks_club_team_role" AS club_role
  INNER JOIN "auth_roles" AS role ON role."id" = club_role."role_id"
  LEFT JOIN "knight_hacks_club_team" AS team ON team."id" = club_role."team_id"
  ORDER BY role."name"
`;

describe("Club team migration contract", () => {
  it("adds two tables without altering anything that already exists", async () => {
    const { file, sql } = await readClubTeamMigration();

    expect(file.startsWith("0026_")).toBe(true);
    expect(sql).toContain(`CREATE TABLE "knight_hacks_club_team"`);
    expect(sql).toContain(`CREATE TABLE "knight_hacks_club_team_role"`);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    // The only ALTERs are the new table's own foreign keys, which drizzle-kit
    // emits separately. Nothing that predates this migration is touched.
    for (const [statement] of sql.matchAll(/ALTER TABLE "([^"]+)"/g)) {
      expect(statement).toContain(`ALTER TABLE "knight_hacks_club_team_role"`);
    }
  });

  it("constrains kind to exactly the set the application knows", async () => {
    const { sql } = await readClubTeamMigration();
    const kinds = [...TEAM.CLUB_TEAM_KINDS];

    for (const table of [
      "knight_hacks_club_team",
      "knight_hacks_club_team_role",
    ]) {
      expect(sql).toContain(
        `CHECK ("${table}"."kind" IN (${kinds.map((kind) => `'${kind}'`).join(", ")}))`,
      );
    }
    expect(new Set(EXPECTED_TEAMS.map(({ kind }) => kind))).toEqual(
      new Set(kinds),
    );
    expect(new Set(EXPECTED_ROLES.map(({ kind }) => kind))).toEqual(
      new Set(kinds),
    );
  });

  it("resolves role names against real rows rather than trusting them", async () => {
    const backfill = await readClubRoleBackfillStatement();

    expect(backfill).toContain(`INNER JOIN "auth_roles"`);
    expect(backfill).toContain("RAISE EXCEPTION");
    expect(backfill).toContain(`ON CONFLICT ("role_id") DO NOTHING`);
  });

  it("leaves the event feedback exclusion set where migration 0013 put it", async () => {
    // `EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES` and its hand-copied twin in
    // `routers/roles.ts` are both deleted. Neither was the source of truth:
    // `auth_roles.event_feedback_excluded` is, and 0013 already wrote it. This
    // migration therefore adds nothing for it, and this test says why rather
    // than leaving a reviewer to wonder what happened to the eighteen names.
    const [file] = (await readdir(migrationsDirectory))
      .filter((name) => name.startsWith("0013_"))
      .sort();

    if (!file) throw new Error("Migration 0013 was not found.");

    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");

    expect(sql).toContain(`SET "event_feedback_excluded" = true`);
    for (const roleName of EVENT_FEEDBACK_EXCLUDED_ROLE_NAMES) {
      expect(sql).toContain(`'${roleName}'`);
    }

    const { sql: clubTeamSql } = await readClubTeamMigration();

    expect(clubTeamSql).not.toContain("event_feedback_excluded");
  });
});

describe.runIf(canRunDatabaseTests())(
  "Club team backfill against a real database",
  () => {
    let database: DisposableDatabase;

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_club_team");
    }, 120_000);

    afterAll(async () => {
      await database.drop();
    });

    it("lands the team list exactly as the deleted constant described it", async () => {
      const { rows } = await database.client.query<ClubTeamRow>(
        `SELECT "slug", "label", "heading", "kind", "display_order"
         FROM "knight_hacks_club_team" ORDER BY "display_order"`,
      );

      expect(
        rows.map((row) => ({
          slug: row.slug,
          label: row.label,
          heading: row.heading,
          kind: row.kind,
          displayOrder: row.display_order,
        })),
      ).toEqual(EXPECTED_TEAMS);
    });

    it("classifies nothing on a database with no linked roles", async () => {
      // A fresh environment runs every migration before anyone links a Discord
      // role. Raising there would make the migration impossible to apply.
      const { rows } = await database.client.query(
        `SELECT 1 FROM "knight_hacks_club_team_role"`,
      );

      expect(rows).toHaveLength(0);
    });

    it("classifies every configured role once real rows exist", async () => {
      const backfill = await readClubRoleBackfillStatement();

      await database.client.query(insertRolesSql(ROLE_NAMES));
      await database.client.query(backfill);

      const { rows } = await database.client.query<ClubTeamRoleRow>(
        SELECT_CLASSIFICATIONS,
      );

      expect(
        rows.map((row) => ({
          roleName: row.role_name,
          kind: row.kind,
          rank: row.rank,
          teamSlug: row.team_slug,
          rosterLabel: row.roster_label,
          calloutLabel: row.callout_label,
        })),
      ).toEqual(
        [...EXPECTED_ROLES].sort((first, second) =>
          first.roleName.localeCompare(second.roleName),
        ),
      );
    });

    it("can be replayed without duplicating or clobbering a later edit", async () => {
      const backfill = await readClubRoleBackfillStatement();

      await database.client.query(
        `UPDATE "knight_hacks_club_team_role" SET "roster_label" = 'Head of Design'
         WHERE "role_id" = (SELECT "id" FROM "auth_roles" WHERE "name" = 'Design Director')`,
      );
      await database.client.query(backfill);

      const { rows } = await database.client.query<{
        count: string;
        roster_label: string | null;
      }>(
        `SELECT (SELECT count(*) FROM "knight_hacks_club_team_role")::text AS count,
                club_role."roster_label"
         FROM "knight_hacks_club_team_role" AS club_role
         INNER JOIN "auth_roles" AS role ON role."id" = club_role."role_id"
         WHERE role."name" = 'Design Director'`,
      );

      expect(rows[0]?.count).toBe(String(EXPECTED_ROLES.length));
      expect(rows[0]?.roster_label).toBe("Head of Design");
    });

    it("refuses to classify when a team's membership role is missing", async () => {
      // The bug being fixed, caught at migration time: a renamed "Design Team"
      // used to leave the Design tab permanently empty with no error anywhere.
      const backfill = await readClubRoleBackfillStatement();
      const scratch = await provisionDisposableDatabase("forge_club_team_gap");

      try {
        await scratch.client.query(
          insertRolesSql(
            ROLE_NAMES.filter((name) => name !== "Design Team").concat(
              "Brand Team",
            ),
          ),
        );

        await expect(scratch.client.query(backfill)).rejects.toThrow(
          /'Design Team'/,
        );

        const { rows } = await scratch.client.query(
          `SELECT 1 FROM "knight_hacks_club_team_role"`,
        );

        expect(rows).toHaveLength(0);
      } finally {
        await scratch.drop();
      }
    }, 120_000);

    it("names every missing team role at once rather than one per run", async () => {
      const backfill = await readClubRoleBackfillStatement();
      const scratch = await provisionDisposableDatabase("forge_club_team_gaps");

      try {
        await scratch.client.query(
          insertRolesSql(
            ROLE_NAMES.filter(
              (name) => name !== "Design Team" && name !== "Dev Team",
            ),
          ),
        );

        await expect(scratch.client.query(backfill)).rejects.toThrow(
          /'Design Team', 'Dev Team'/,
        );
      } finally {
        await scratch.drop();
      }
    }, 120_000);

    it("tolerates a missing officer or director role, which empties no team", async () => {
      // "Officers" is the live example: an aggregate Discord role that has
      // never been linked in Blade. Nobody leaves the Executive Officers bucket
      // because of it, so it is a notice rather than a failed migration.
      const backfill = await readClubRoleBackfillStatement();
      const scratch = await provisionDisposableDatabase("forge_club_team_agg");

      try {
        await scratch.client.query(
          insertRolesSql(ROLE_NAMES.filter((name) => name !== "Officers")),
        );
        await scratch.client.query(backfill);

        const { rows } = await scratch.client.query<ClubTeamRoleRow>(
          SELECT_CLASSIFICATIONS,
        );

        expect(rows).toHaveLength(EXPECTED_ROLES.length - 1);
        expect(rows.map((row) => row.role_name)).not.toContain("Officers");
      } finally {
        await scratch.drop();
      }
    }, 120_000);

    it("cascades classification away when a role is unlinked", async () => {
      await database.client.query(
        `DELETE FROM "auth_roles" WHERE "name" = 'Workshop Team'`,
      );

      const { rows } = await database.client.query<ClubTeamRoleRow>(
        SELECT_CLASSIFICATIONS,
      );

      expect(rows.map((row) => row.role_name)).not.toContain("Workshop Team");
    });

    it("refuses a team role with no team, and a kind nobody implements", async () => {
      const [{ id: roleId }] = (
        await database.client.query<{ id: string }>(
          `INSERT INTO "auth_roles" ("name", "discord_role_id", "permissions")
           VALUES ('Scratch Role', 'discord-scratch', '0') RETURNING "id"`,
        )
      ).rows as [{ id: string }];

      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_club_team_role" ("role_id", "kind", "rank")
           VALUES ($1, 'team', 1)`,
          [roleId],
        ),
      ).rejects.toThrow(/club_team_role_team_check/);

      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_club_team_role" ("role_id", "kind", "rank")
           VALUES ($1, 'volunteer', 1)`,
          [roleId],
        ),
      ).rejects.toThrow(/club_team_role_kind_check/);
    });

    it("refuses a second bucket for the same non-team kind", async () => {
      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_club_team" ("slug", "label", "heading", "kind", "display_order")
           VALUES ('exec-two', 'Exec Two', 'Exec Two', 'executive', 99)`,
        ),
      ).rejects.toThrow(/knight_hacks_club_team_kind_unique/);
    });

    it("refuses two teams claiming the same tab position", async () => {
      await expect(
        database.client.query(
          `INSERT INTO "knight_hacks_club_team" ("slug", "label", "heading", "kind", "display_order")
           VALUES ('duplicate-order', 'Dupe', 'Dupe', 'team', 0)`,
        ),
      ).rejects.toThrow(/knight_hacks_club_team_display_order_unique/);
    });
  },
);

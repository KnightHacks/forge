import { readFile } from "node:fs/promises";
import type { QueryResultRow } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ClubRoleSeedEntry } from "../club-team/role-classification";
import type { DisposableDatabase } from "../testing";
import {
  classifyClubRoles,
  formatClubRoleClassificationReport,
  readClubRoleSeed,
} from "../club-team/role-classification";
import { canRunDatabaseTests, provisionDisposableDatabase } from "../testing";

/**
 * `scripts/classify-club-roles.ts`, exercised the way a contributor meets it:
 * migrate an empty database, link Discord roles in Blade afterwards, then run
 * the tool. That sequence is the one migration `0026` alone cannot serve — its
 * backfill runs once, at migrate time, when `auth_roles` is still empty — and
 * it is the sequence `docs/GETTING-STARTED.md` tells everyone to follow.
 */

const migrationSourceUrl = new URL(
  "../club-team/role-classification.ts",
  import.meta.url,
);
const clubTeamMigrationUrl = new URL(
  "../../drizzle/0026_cute_sersi.sql",
  import.meta.url,
);

interface ClassificationRow extends QueryResultRow {
  role_name: string;
  kind: string;
  rank: number;
  team_slug: string | null;
  roster_label: string | null;
  callout_label: string | null;
  updated_at: Date;
}

const SELECT_CLASSIFICATIONS = `
  SELECT role."name" AS role_name, club_role."kind", club_role."rank",
         team."slug" AS team_slug, club_role."roster_label",
         club_role."callout_label", club_role."updated_at"
  FROM "knight_hacks_club_team_role" AS club_role
  INNER JOIN "auth_roles" AS role ON role."id" = club_role."role_id"
  LEFT JOIN "knight_hacks_club_team" AS team ON team."id" = club_role."team_id"
  ORDER BY role."name"
`;

/** Linking a Discord role in Blade, which is all `auth_roles` is here. */
function insertRolesSql(roleNames: readonly string[]) {
  const values = roleNames
    .map(
      (name) =>
        `('${name.replaceAll("'", "''")}', 'discord-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}', '0')`,
    )
    .join(", ");

  return `INSERT INTO "auth_roles" ("name", "discord_role_id", "permissions") VALUES ${values}`;
}

function expectedRow(entry: ClubRoleSeedEntry) {
  return {
    roleName: entry.roleName,
    kind: entry.kind,
    rank: entry.rank,
    teamSlug: entry.teamSlug,
    rosterLabel: entry.rosterLabel,
    calloutLabel: entry.calloutLabel,
  };
}

function actualRow(row: ClassificationRow) {
  return {
    roleName: row.role_name,
    kind: row.kind,
    rank: row.rank,
    teamSlug: row.team_slug,
    rosterLabel: row.roster_label,
    calloutLabel: row.callout_label,
  };
}

async function countClassifications(database: DisposableDatabase) {
  const { rows } = await database.client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM "knight_hacks_club_team_role"`,
  );
  return Number(rows[0]?.count);
}

describe("Club role classification mapping", () => {
  it("reads the mapping out of the migration instead of keeping a copy", async () => {
    // The requirement this defends: two copies of nineteen names, ranks and
    // label overrides can disagree, and disagreement here publishes a wrong
    // roster rather than raising anything.
    const seed = await readClubRoleSeed();
    const migration = await readFile(clubTeamMigrationUrl, "utf8");
    const source = await readFile(migrationSourceUrl, "utf8");

    expect(seed.length).toBeGreaterThan(0);
    for (const entry of seed) {
      expect(migration).toContain(`"role_name": "${entry.roleName}"`);
      expect(source).not.toContain(entry.roleName);
    }
  });
});

describe.runIf(canRunDatabaseTests())(
  "Club role classification against a real database",
  () => {
    let database: DisposableDatabase;
    let seed: ClubRoleSeedEntry[];

    beforeAll(async () => {
      database = await provisionDisposableDatabase("forge_club_classify");
      seed = await readClubRoleSeed();
    }, 120_000);

    afterAll(async () => {
      await database.drop();
    });

    it("classifies roles linked after the migration already ran", async () => {
      // The fresh-environment sequence, in order. `pnpm db:migrate` has already
      // run against an empty database by the time this test starts, so the
      // migration's own backfill has already had its one chance and declined.
      expect(await countClassifications(database)).toBe(0);

      await database.client.query(
        insertRolesSql(seed.map((entry) => entry.roleName)),
      );

      const report = await classifyClubRoles(database.client);

      expect(report.classified).toHaveLength(seed.length);
      expect(report.alreadyClassified).toEqual([]);
      expect(report.unresolved).toEqual([]);

      const { rows } = await database.client.query<ClassificationRow>(
        SELECT_CLASSIFICATIONS,
      );

      expect(rows.map(actualRow)).toEqual(
        seed
          .map(expectedRow)
          .sort((first, second) =>
            first.roleName.localeCompare(second.roleName),
          ),
      );
    });

    it("changes nothing at all on a second run", async () => {
      const { rows: before } = await database.client.query<ClassificationRow>(
        SELECT_CLASSIFICATIONS,
      );

      const report = await classifyClubRoles(database.client);

      expect(report.classified).toEqual([]);
      expect(report.alreadyClassified).toHaveLength(seed.length);

      const { rows: after } = await database.client.query<ClassificationRow>(
        SELECT_CLASSIFICATIONS,
      );

      // `updated_at` is compared deliberately: an upsert that wrote identical
      // values would pass a row-by-row comparison of the other columns.
      expect(after).toEqual(before);
      expect(await countClassifications(database)).toBe(seed.length);
    });

    it("leaves an officer's hand edit alone", async () => {
      await database.client.query(
        `UPDATE "knight_hacks_club_team_role" SET "roster_label" = 'Head of Design'
         WHERE "role_id" = (SELECT "id" FROM "auth_roles" WHERE "name" = 'Design Director')`,
      );

      await classifyClubRoles(database.client);

      const { rows } = await database.client.query<{
        roster_label: string | null;
      }>(
        `SELECT club_role."roster_label"
         FROM "knight_hacks_club_team_role" AS club_role
         INNER JOIN "auth_roles" AS role ON role."id" = club_role."role_id"
         WHERE role."name" = 'Design Director'`,
      );

      expect(rows[0]?.roster_label).toBe("Head of Design");
      expect(await countClassifications(database)).toBe(seed.length);
    });

    it("keeps a renamed role classified rather than re-keying it by name", async () => {
      // The bug the tables were created to end. After the rename the name no
      // longer resolves, so the tool reports it — but the row is keyed by
      // `auth_roles.id`, so the team is still populated and the tool must not
      // touch it.
      await database.client.query(
        `UPDATE "auth_roles" SET "name" = 'Community Team' WHERE "name" = 'Outreach Team'`,
      );

      const report = await classifyClubRoles(database.client);

      expect(report.classified).toEqual([]);
      expect(report.unresolved.map((role) => role.roleName)).toEqual([
        "Outreach Team",
      ]);
      expect(await countClassifications(database)).toBe(seed.length);

      const { rows } = await database.client.query<ClassificationRow>(
        SELECT_CLASSIFICATIONS,
      );

      expect(
        rows.find((row) => row.role_name === "Community Team")?.team_slug,
      ).toBe("outreach");
    });

    it("classifies what it can and names what it cannot", async () => {
      const scratch = await provisionDisposableDatabase("forge_club_partial");
      const missing = new Set(["Design Team", "Officers"]);

      try {
        await scratch.client.query(
          insertRolesSql(
            seed
              .map((entry) => entry.roleName)
              .filter((name) => !missing.has(name)),
          ),
        );

        const report = await classifyClubRoles(scratch.client);

        expect(report.classified).toHaveLength(seed.length - missing.size);
        expect(report.unresolved.map((role) => role.roleName)).toEqual([
          "Officers",
          "Design Team",
        ]);
        expect(report.unresolved.every((role) => role.reason === "role")).toBe(
          true,
        );

        const printed = formatClubRoleClassificationReport(report);
        expect(printed).toContain(
          `classified by this run: ${seed.length - missing.size}`,
        );
        expect(printed).toContain("Design Team");
        expect(printed).toContain("Officers");

        // The moment the tool exists for: link the missing role, run it again.
        await scratch.client.query(insertRolesSql(["Design Team"]));

        const second = await classifyClubRoles(scratch.client);

        expect(second.classified.map((role) => role.roleName)).toEqual([
          "Design Team",
        ]);
        expect(second.alreadyClassified).toHaveLength(seed.length - 2);
        expect(second.unresolved.map((role) => role.roleName)).toEqual([
          "Officers",
        ]);
      } finally {
        await scratch.drop();
      }
    }, 120_000);

    it("refuses to classify a role into a team that no longer exists", async () => {
      // A `team` role with no team fails the check constraint, and an executive
      // lead with no team would be filed as leading nothing. Both are reported
      // rather than written.
      const scratch = await provisionDisposableDatabase("forge_club_noteam");

      try {
        await scratch.client.query(
          insertRolesSql(seed.map((entry) => entry.roleName)),
        );
        await scratch.client.query(
          `DELETE FROM "knight_hacks_club_team" WHERE "slug" = 'design'`,
        );

        const report = await classifyClubRoles(scratch.client);

        expect(
          report.unresolved.filter((role) => role.reason === "team"),
        ).toEqual([
          {
            roleName: "Design Director",
            kind: "director",
            reason: "team",
            teamSlug: "design",
          },
          {
            roleName: "Design Team",
            kind: "team",
            reason: "team",
            teamSlug: "design",
          },
        ]);
        expect(report.classified).toHaveLength(seed.length - 2);
      } finally {
        await scratch.drop();
      }
    }, 120_000);
  },
);

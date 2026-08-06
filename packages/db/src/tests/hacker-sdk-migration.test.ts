import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MIGRATION_DIRECTORY = fileURLToPath(
  new URL("../../drizzle/", import.meta.url),
);

async function findHackerSdkMigration() {
  const names = (await readdir(MIGRATION_DIRECTORY))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()
    .reverse();
  for (const name of names) {
    const sql = await readFile(
      new URL(`../../drizzle/${name}`, import.meta.url),
      "utf8",
    );
    if (
      sql.includes("knight_hacks_hacker_profile_revision") &&
      sql.includes("knight_hacks_hackathon_event_publication")
    ) {
      return { name, sql };
    }
  }
  return undefined;
}

describe("Hacker SDK migration contract", () => {
  it("TC-MIG-002 aborts with actionable duplicate and orphan diagnostics", async () => {
    const migration = await findHackerSdkMigration();
    expect(migration, "expected a Hacker SDK migration").toBeDefined();
    if (!migration) return;

    expect(migration.sql).toMatch(/Hacker SDK migration preflight failed/i);
    expect(migration.sql).toMatch(/duplicateApplications/);
    expect(migration.sql).toMatch(/orphanAttendees/);
    expect(migration.sql).toMatch(/missingUsers/);
    expect(migration.sql).toMatch(
      /GROUP BY hacker\."user_id", attendee\."hackathon_id"/,
    );
    expect(migration.sql).toMatch(/HAVING count\(\*\) > 1/);
  });

  it("TC-MIG-001 backfills canonical profiles, all revisions, and attendee references", async () => {
    const migration = await findHackerSdkMigration();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(migration.sql).toMatch(/INSERT INTO "knight_hacks_hacker_profile"/);
    expect(migration.sql).toMatch(
      /INSERT INTO "knight_hacks_hacker_profile_revision"/,
    );
    expect(migration.sql).toMatch(
      /SET\s+"profile_id" = revision\."profile_id",\s+"profile_revision_id" = revision\."id"/s,
    );
    expect(migration.sql).toMatch(/"survey1" = hacker\."survey_1"/);
    expect(migration.sql).not.toMatch(
      /SET[\s\S]{0,300}"is_first_time"\s*=\s*hacker\./i,
    );
  });

  it("TC-MIG-003 preserves existing projection state and backfills provider intent/work", async () => {
    const migration = await findHackerSdkMigration();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(migration.sql).toMatch(
      /INSERT INTO "knight_hacks_hackathon_event_publication"/,
    );
    expect(migration.sql).toMatch(
      /WHERE event\."hackathon_id" = hackathon\."id" AND event\."legacy" = false/,
    );
    expect(migration.sql).toMatch(
      /INSERT INTO "knight_hacks_event_publication_work"/,
    );
    expect(migration.sql).toMatch(/event\."discord_last_error"/);
    expect(migration.sql).toMatch(/event\."google_last_error"/);
    expect(migration.sql).not.toMatch(
      /UPDATE "knight_hacks_event"\s+SET\s+"discord_id"/i,
    );
    expect(migration.sql).not.toMatch(
      /UPDATE "knight_hacks_event"\s+SET\s+"google_id"/i,
    );
  });

  it("TC-AUTH-002 stores only exact production subdomain origins", async () => {
    const migration = await findHackerSdkMigration();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(migration.sql).toContain(
      "^https://[a-z0-9-]+([.][a-z0-9-]+)*[.]knighthacks[.]org$",
    );
  });
});

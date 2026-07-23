import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../../drizzle/0016_breezy_sphinx.sql",
  import.meta.url,
);

describe("Club Operations Issues migration contract", () => {
  it("TC-MIGRATION-003 backfills legacy due instants as Eastern wall time", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("AT TIME ZONE 'America/New_York'");
    expect(sql).toMatch(/UPDATE "knight_hacks_issue"[\s\S]+"due_at"/);
  });

  it("TC-HISTORY-002 creates a truthful tracking boundary", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("tracking_started");
    expect(sql).toContain("Reforge history tracking began");
  });

  it("TC-TEMPLATE-002 normalizes valid legacy names without rewriting bodies", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toMatch(
      /UPDATE "knight_hacks_template"[\s\S]+"normalized_name"/,
    );
    expect(sql).toContain("disabled_reason");
    expect(sql).not.toMatch(/UPDATE "knight_hacks_template"[\s\S]+SET "body"/);
  });
});

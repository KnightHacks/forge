import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../../drizzle/0018_guild_career_network.sql",
  import.meta.url,
);
const companyImageMigration = new URL(
  "../../drizzle/0019_panoramic_silk_fever.sql",
  import.meta.url,
);

describe("Guild Career Network migration contract", () => {
  it("TC-014 preserves legacy company values as approved unconfirmed employment", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).toMatch(
      /INSERT INTO "knight_hacks_company"[\s\S]+FROM "knight_hacks_member"/,
    );
    expect(sql).toContain("'approved'");
    expect(sql).toMatch(
      /INSERT INTO "knight_hacks_employment"[\s\S]+FROM "knight_hacks_member"/,
    );
    expect(sql).toContain("'unknown'");
    expect(sql).toContain(
      `WHEN "normalized_display_name" = 'advanced micro devices' THEN 'AMD'`,
    );
    expect(sql).toContain(
      `WHEN "normalized_display_name" = 'advanced micro devices' THEN 'amd'`,
    );
  });

  it("does not remove or tighten the legacy company column", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).not.toMatch(/DROP COLUMN "company"/);
    expect(sql).not.toMatch(/ALTER COLUMN "company" SET NOT NULL/);
  });

  it("enforces current and chronological employment dates in storage", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).toContain("knight_hacks_employment_current_has_no_end");
    expect(sql).toContain("knight_hacks_employment_date_order");
  });

  it("adds optional company image storage without changing existing companies", async () => {
    const sql = await readFile(companyImageMigration, "utf8");

    expect(sql).toContain(
      `ALTER TABLE "knight_hacks_company" ADD COLUMN "logo_object_name" varchar(255)`,
    );
    expect(sql).not.toContain("NOT NULL");
  });
});

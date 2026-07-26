import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

async function readAlumniMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes("knight_hacks_alumni_bulletin_post")) {
      return sql;
    }
  }

  throw new Error("Alumni dashboard migration was not found.");
}

describe("alumni dashboard migration contract", () => {
  it("adds confirmation and bulletin storage without rewriting legacy members", async () => {
    const sql = await readAlumniMigration();

    expect(sql).toContain(
      `ALTER TABLE "knight_hacks_member" ADD COLUMN "alumni_confirmed_at"`,
    );
    expect(sql).toContain(`CREATE TABLE "knight_hacks_alumni_bulletin_post"`);
    expect(sql).not.toMatch(
      /UPDATE "knight_hacks_member"[\s\S]+alumni_confirmed_at/,
    );
  });

  it("enforces bulletin action, media, schedule, and order invariants", async () => {
    const sql = await readAlumniMigration();

    expect(sql).toContain("alumni_bulletin_image_alt_pair");
    expect(sql).toContain("alumni_bulletin_action_pair");
    expect(sql).toContain(
      `("knight_hacks_alumni_bulletin_post"."external_url" IS NULL AND "knight_hacks_alumni_bulletin_post"."form_id" IS NULL) OR "knight_hacks_alumni_bulletin_post"."cta_label" IS NOT NULL`,
    );
    expect(sql).toContain("alumni_bulletin_action_exclusive");
    expect(sql).toContain("alumni_bulletin_schedule_order");
    expect(sql).toContain("alumni_bulletin_display_order_nonnegative");
  });
});

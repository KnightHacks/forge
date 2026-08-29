import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

async function readDuesEntitlementMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes(`CREATE TABLE "knight_hacks_dues_entitlement"`)) {
      return { file, sql };
    }
  }
  throw new Error("Dues entitlement migration was not found.");
}

describe("dues entitlement migration contract", () => {
  it("separates immutable payments from yearly entitlement state", async () => {
    const { file, sql } = await readDuesEntitlementMigration();

    expect(file.startsWith("0041_")).toBe(true);
    expect(sql).toContain(`CREATE TABLE "knight_hacks_dues_entitlement"`);
    expect(sql).toContain(`UNIQUE("member_id","year")`);
    expect(sql).toContain(`UNIQUE("source_payment_id")`);
    expect(sql).toContain(`ON DELETE set null`);
    expect(sql).toContain(
      `ALTER TABLE "knight_hacks_dues_payment" DROP COLUMN "active"`,
    );
    expect(sql).not.toContain(`DROP TABLE "knight_hacks_dues_payment"`);
  });

  it("normalizes legacy calendar years before backfilling entitlement state", async () => {
    const { sql } = await readDuesEntitlementMigration();
    const normalize = sql.indexOf(
      `UPDATE "knight_hacks_dues_payment"\nSET "year" = "year" - 1`,
    );
    const backfill = sql.indexOf(`INSERT INTO "knight_hacks_dues_entitlement"`);
    const dropActive = sql.indexOf(
      `ALTER TABLE "knight_hacks_dues_payment" DROP COLUMN "active"`,
    );

    expect(normalize).toBeGreaterThan(-1);
    expect(sql).toContain(
      `WHERE "year" = extract(year FROM "payment_date")::integer`,
    );
    expect(sql).toContain(`AND extract(month FROM "payment_date") < 8`);
    expect(backfill).toBeGreaterThan(normalize);
    expect(dropActive).toBeGreaterThan(backfill);
    expect(sql).toContain(`bool_or("active")`);
    expect(sql).toContain(
      `array_agg("id" ORDER BY "active" DESC, "payment_date" DESC, "id")`,
    );
  });
});

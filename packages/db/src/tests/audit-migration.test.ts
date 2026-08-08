import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);

async function readAuditMigration() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
    if (sql.includes(`CREATE TABLE "audit_event"`)) return { file, sql };
  }
  throw new Error("Admin audit migration was not found.");
}

describe("admin audit migration contract", () => {
  it("lands after the alumni migration and creates indexed append-only tables", async () => {
    const { file, sql } = await readAuditMigration();

    expect(file.startsWith("0022_")).toBe(true);
    expect(sql).toContain(`CREATE TABLE "audit_event"`);
    expect(sql).toContain(`CREATE TABLE "audit_subject"`);
    expect(sql).toContain(`audit_subject_one_primary_idx`);
    expect(sql).toContain(`audit_event_occurred_idx`);
    expect(sql).toContain(`audit_event_reject_mutation`);
    expect(sql).toContain(`audit_subject_reject_mutation`);
    expect(sql).toContain(`BEFORE UPDATE OR DELETE ON "audit_event"`);
    expect(sql).toContain(`BEFORE UPDATE OR DELETE ON "audit_subject"`);
  });

  it("adds attachment purpose without backfilling historical admin events", async () => {
    const { sql } = await readAuditMigration();

    expect(sql).toContain(
      `ALTER TABLE "knight_hacks_form_attachment" ADD COLUMN "purpose"`,
    );
    expect(sql).toContain(`SET "purpose" = 'instruction'`);
    expect(sql).toContain(`form_schema."form_data"->'instructions'`);
    expect(sql).not.toMatch(/INSERT INTO "audit_event"/);
  });
});

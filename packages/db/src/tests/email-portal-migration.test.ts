import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MIGRATION_DIRECTORY = fileURLToPath(
  new URL("../../drizzle/", import.meta.url),
);

async function findEmailPortalMigration() {
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
      sql.includes("email_send_recipient") &&
      sql.includes("email_template_revision")
    ) {
      return { name, sql };
    }
  }
  return undefined;
}

describe("Email Portal migration contract", () => {
  it("TC-050 creates additive tables, uniqueness, and operational indexes", async () => {
    const migration = await findEmailPortalMigration();
    expect(migration, "expected an Email Portal migration").toBeDefined();
    if (!migration) return;

    expect(migration.sql).toMatch(/CREATE TABLE "email_template"/);
    expect(migration.sql).toMatch(/CREATE TABLE "email_template_revision"/);
    expect(migration.sql).toMatch(/CREATE TABLE "email_send"/);
    expect(migration.sql).toMatch(/CREATE TABLE "email_send_recipient"/);
    expect(migration.sql).toMatch(/CREATE TABLE "email_send_event"/);
    expect(migration.sql).toMatch(
      /UNIQUE.*email_send_recipient.*send_id.*normalized_email/is,
    );
    expect(migration.sql).toMatch(
      /CREATE INDEX.*email_send.*status.*scheduled_for/is,
    );
    expect(migration.sql).toMatch(
      /CREATE INDEX.*email_send_recipient.*send_id/is,
    );
  });

  it("TC-051 backfills current roster roles without name-based runtime coupling", async () => {
    const migration = await findEmailPortalMigration();
    expect(migration, "expected an Email Portal migration").toBeDefined();
    if (!migration) return;

    expect(migration.sql).toMatch(
      /ADD COLUMN "email_audience_enabled" boolean DEFAULT false NOT NULL/i,
    );
    expect(migration.sql).toMatch(
      /UPDATE "auth_roles".*email_audience_enabled.*WHERE.*name/is,
    );
    expect(migration.sql).not.toMatch(/DROP TABLE "template"/i);
    expect(migration.sql).not.toMatch(/DROP COLUMN.*email_/i);
  });
});

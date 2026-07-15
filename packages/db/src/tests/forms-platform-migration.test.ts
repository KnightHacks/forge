import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const MIGRATION_DIRECTORY = fileURLToPath(
  new URL("../../drizzle/", import.meta.url),
);
const SQL_MIGRATION_PATTERN = /^\d{4}_.+\.sql$/;

async function readMigrations() {
  const names = (await readdir(MIGRATION_DIRECTORY))
    .filter((name) => SQL_MIGRATION_PATTERN.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(
        new URL(`../../drizzle/${name}`, import.meta.url),
        "utf8",
      ),
    })),
  );
}

function formsPlatformMigration(
  migrations: Awaited<ReturnType<typeof readMigrations>>,
) {
  return migrations.find(
    ({ sql }) =>
      sql.includes("form_callback_execution") &&
      sql.includes("event_feedback_reward") &&
      sql.includes("form_section_view_role"),
  );
}

describe("forms platform migration contract", () => {
  it("[TC-053] evolves legacy forms through one reviewed migration", async () => {
    const migration = formsPlatformMigration(await readMigrations());

    expect(migration?.name).toMatch(/^\d{4}_.+\.sql$/);
    expect(migration?.sql).toContain("form_state");
    expect(migration?.sql).toContain("form_response_mode");
    expect(migration?.sql).toContain("'archived'");
    expect(migration?.sql).toContain("CURRENT_TIMESTAMP");
  });

  it("[TC-018, TC-043] encodes single-response and reward idempotency", async () => {
    const migration = formsPlatformMigration(await readMigrations());

    expect(migration?.sql).toMatch(/(?:UNIQUE|PRIMARY KEY)[^;]+form[^;]+user/i);
    expect(migration?.sql).toMatch(
      /UNIQUE[^;]+event[^;]+member|unique[^;]+event[^;]+member/i,
    );
  });

  it("[TC-039] stores an explicit event-to-feedback-form association", async () => {
    const migration = formsPlatformMigration(await readMigrations());

    expect(migration?.sql).toContain("event_feedback_config");
    expect(migration?.sql).toMatch(/event_id[^;]+UNIQUE|UNIQUE[^;]+event_id/i);
    expect(migration?.sql).toMatch(/form_id[^;]+UNIQUE|UNIQUE[^;]+form_id/i);
  });

  it("[TC-042] removes the event-feedback opening gate from storage", async () => {
    const sql = (await readMigrations())
      .map((migration) => migration.sql)
      .join("\n");

    expect(sql).toContain('DROP COLUMN "opens_at"');
    expect(sql).toContain(
      'DROP CONSTRAINT "knight_hacks_event_feedback_config_window_check"',
    );
    expect(sql).toMatch(
      /UPDATE "knight_hacks_form_schemas"[\s\S]+"opens_at" = NULL[\s\S]+event_feedback/,
    );
  });

  it("[TC-054] backfills only current qualifying club events idempotently", async () => {
    const migration = formsPlatformMigration(await readMigrations());

    expect(migration?.sql).toContain("WITH qualifying_event AS");
    expect(migration?.sql).toMatch(/end_datetime[^;]+INTERVAL '7 days'/i);
    expect(migration?.sql).toMatch(/hackathon_id[^;]+IS NULL/i);
    expect(migration?.sql).toMatch(/ON CONFLICT[^;]+DO NOTHING/i);
  });

  it("[TC-053] classifies legacy signup and feedback outside generic forms", async () => {
    const sql = (await readMigrations())
      .map((migration) => migration.sql)
      .join("\n");

    expect(sql).toMatch(
      /member-signup[\s\S]+"kind" = 'system'|"kind" = 'system'[\s\S]+member-signup/i,
    );
    expect(sql).toMatch(
      /lower\("section"\) = 'feedback'[\s\S]+event_feedback|event_feedback[\s\S]+lower\("section"\) = 'feedback'/i,
    );
  });

  it("[TC-054] indexes form response administration and member history", async () => {
    const sql = (await readMigrations())
      .map((migration) => migration.sql)
      .join("\n");

    expect(sql).toContain("knight_hacks_form_response_form_created_idx");
    expect(sql).toContain("knight_hacks_form_response_user_created_idx");
  });
});

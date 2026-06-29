import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { QueryResultRow } from "pg";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EVENTS } from "@forge/consts";

import { migrationTestDatabaseUrl } from "./env";

const MIGRATION_DIRECTORY = fileURLToPath(
  new URL("../../drizzle/", import.meta.url),
);
const SQL_MIGRATION_PATTERN = /^\d{4}_.+\.sql$/;
const EVENT_MIGRATION_MARKERS = [
  "points_awarded_estimated",
  "AT TIME ZONE 'America/New_York'",
] as const;

const CLUB_EVENT_ID = "00000000-0000-4000-8000-000000000101";
const HACKATHON_EVENT_ID = "00000000-0000-4000-8000-000000000102";
const LEGACY_COMBINED_EVENT_ID = "00000000-0000-4000-8000-000000000103";
const MEMBER_ID = "00000000-0000-4000-8000-000000000104";
const USER_ID = "00000000-0000-4000-8000-000000000105";
const ROLE_ID = "00000000-0000-4000-8000-000000000106";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000107";

const LEGACY_DEFAULT_POINTS = EVENTS.EVENT_POINTS;

interface MigrationFile {
  name: string;
  sql: string;
}

interface TableColumnsRow extends QueryResultRow {
  columns: string[];
  table_name: string;
}

interface InformationSchemaColumn extends QueryResultRow {
  column_default: string | null;
  column_name: string;
  data_type: string;
  is_nullable: "NO" | "YES";
}

interface EventMigrationRow extends QueryResultRow {
  discord_id: string | null;
  dues_paying: boolean;
  end_datetime: Date;
  google_id: string | null;
  hackathon_id: string | null;
  id: string;
  legacy: boolean;
  roles: string[];
  start_datetime: Date;
  sync_revision: number;
  tag: string;
  tag_color: string;
}

interface EventTagColorRow extends QueryResultRow {
  tag: string;
  tag_color: string;
}

interface TagTemplateRow extends QueryResultRow {
  active: boolean;
  color: string;
  default_points: number;
  name: string;
  normalized_name: string;
}

interface AttendanceMigrationRow extends QueryResultRow {
  checked_in_at: Date | null;
  checked_in_by: string | null;
  event_id: string;
  points_awarded: number | null;
  points_awarded_estimated: boolean;
}

interface NewEventRow extends QueryResultRow {
  discord_id: null;
  discord_sync_state: string;
  google_id: null;
  google_sync_state: string;
  id: string;
  legacy: boolean;
  points: number;
  sync_revision: number;
}

async function readMigrations(): Promise<MigrationFile[]> {
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

function findEventMigration(
  migrations: MigrationFile[],
): MigrationFile | undefined {
  return migrations.find((migration) =>
    EVENT_MIGRATION_MARKERS.every((marker) => migration.sql.includes(marker)),
  );
}

async function applyMigration(
  client: Client,
  migration: MigrationFile,
): Promise<void> {
  const statements = migration.sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.query(statement);
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function isLoopbackDatabaseUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

function databaseUrlFor(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function seedLegacyFixtures(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO "auth_user"
      ("id", "discord_user_id", "name", "email")
     VALUES ($1, '1459204271655489567', 'legacy-member', 'legacy@example.test')`,
    [USER_ID],
  );
  await client.query(
    `INSERT INTO "knight_hacks_member"
      ("id", "user_id", "first_name", "last_name", "discord_user", "age",
       "email", "school", "level_of_study", "shirt_size", "dob", "grad_date")
     VALUES
      ($1, $2, 'Legacy', 'Member', 'legacy-member', 21,
       'legacy@example.test', 'University of Central Florida',
       'Undergraduate University (3+ year)', 'M', '2004-01-01', '2027-05-01')`,
    [MEMBER_ID, USER_ID],
  );
  await client.query(
    `INSERT INTO "knight_hacks_hackathon"
      ("id", "name", "display_name", "theme", "start_date", "end_date")
     VALUES ($1, 'legacy-hackathon', 'Legacy Hackathon', 'Legacy',
       '2025-03-01 09:00:00', '2025-03-02 18:00:00')`,
    [HACKATHON_ID],
  );
  await client.query(
    `INSERT INTO "knight_hacks_event"
      ("id", "discord_id", "google_id", "name", "tag", "description",
       "start_datetime", "end_datetime", "location", "dues_paying",
       "is_operations_calendar", "roles", "points", "hackathon_id")
     VALUES
      ($1, 'discord-club', 'google-club', 'Legacy Club Event', 'GBM',
       'Production-shaped club history', '2025-02-15 23:30:00',
       '2025-02-16 01:30:00', 'BA1 107', false, false, '{}', 35, NULL),
      ($2, 'discord-hackathon', 'google-hackathon', 'Legacy Hackathon Event',
       'Workshop', 'Production-shaped hackathon history',
       '2025-03-01 14:00:00', '2025-03-01 15:00:00', 'Main Stage', false,
       false, '{}', 25, $4),
      ($3, 'discord-combined', 'google-combined', 'Legacy Combined Audience',
       'Social', 'Malformed legacy dues plus roles event',
       '2025-04-01 18:00:00', '2025-04-01 20:00:00', 'BA1 107', true,
       false, ARRAY[$5]::varchar[], NULL, NULL)`,
    [
      CLUB_EVENT_ID,
      HACKATHON_EVENT_ID,
      LEGACY_COMBINED_EVENT_ID,
      HACKATHON_ID,
      ROLE_ID,
    ],
  );
  await client.query(
    `INSERT INTO "knight_hacks_event_attendee"
      ("id", "member_id", "event_id")
     VALUES
      ('00000000-0000-4000-8000-000000000108', $1, $2),
      ('00000000-0000-4000-8000-000000000109', $1, $2),
      ('00000000-0000-4000-8000-000000000110', $1, $3)`,
    [MEMBER_ID, CLUB_EVENT_ID, LEGACY_COMBINED_EVENT_ID],
  );
}

async function eventColumns(
  client: Client,
): Promise<InformationSchemaColumn[]> {
  const result = await client.query<InformationSchemaColumn>(
    `SELECT "column_name", "data_type", "is_nullable", "column_default"
       FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'knight_hacks_event'`,
  );
  return result.rows;
}

function requireColumn(
  columns: InformationSchemaColumn[],
  ...tokens: string[]
): InformationSchemaColumn {
  const column = columns.find((candidate) =>
    tokens.every((token) => candidate.column_name.includes(token)),
  );
  if (!column) {
    throw new Error(`Expected Event column containing: ${tokens.join(", ")}`);
  }
  return column;
}

function requireNamedColumn(
  columns: InformationSchemaColumn[],
  name: string,
): InformationSchemaColumn {
  const column = columns.find((candidate) => candidate.column_name === name);
  if (!column) throw new Error(`Expected Event column: ${name}`);
  return column;
}

function requireRow<T>(row: T | undefined, description: string): T {
  if (!row) throw new Error(`Expected ${description}`);
  return row;
}

function dynamicColumnValue(
  row: EventMigrationRow,
  column: InformationSchemaColumn,
): unknown {
  return (row as unknown as Record<string, unknown>)[column.column_name];
}

async function findTagTable(client: Client): Promise<string> {
  const result = await client.query<TableColumnsRow>(
    `SELECT "table_name", array_agg("column_name" ORDER BY "column_name") AS "columns"
       FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
      GROUP BY "table_name"`,
  );
  const tagTable = result.rows.find((row) =>
    ["normalized_name", "default_points", "color", "active"].every((column) =>
      row.columns.includes(column),
    ),
  );
  if (!tagTable)
    throw new Error("Expected the configurable club-event tag table");
  return tagTable.table_name;
}

describe("event management migration contract", () => {
  it("TC-NEG-010 includes one reviewed legacy-to-Reforge migration", async () => {
    const migration = findEventMigration(await readMigrations());
    expect(migration?.name).toMatch(/^\d{4}_.+\.sql$/);
  });
});

const runDatabaseContract = isLoopbackDatabaseUrl(migrationTestDatabaseUrl);

describe.runIf(runDatabaseContract)(
  "event management migration against disposable PostgreSQL",
  () => {
    let adminClient: Client | undefined;
    let databaseClient: Client | undefined;
    let databaseName: string | undefined;
    const notices: { message?: string }[] = [];

    function db(): Client {
      if (!databaseClient) throw new Error("Disposable database is not ready");
      return databaseClient;
    }

    beforeAll(async () => {
      if (!migrationTestDatabaseUrl) {
        throw new Error(
          "DATABASE_URL is required for migration integration tests",
        );
      }

      databaseName = `forge_event_${randomUUID().replaceAll("-", "")}`;
      adminClient = new Client({
        connectionString: databaseUrlFor(migrationTestDatabaseUrl, "postgres"),
      });
      await adminClient.connect();
      await adminClient.query(
        `CREATE DATABASE ${quoteIdentifier(databaseName)}`,
      );

      databaseClient = new Client({
        connectionString: databaseUrlFor(
          migrationTestDatabaseUrl,
          databaseName,
        ),
      });
      await databaseClient.connect();
      await databaseClient.query("SET TIME ZONE 'Asia/Tokyo'");

      const migrations = await readMigrations();
      const eventMigration = findEventMigration(migrations);
      if (!eventMigration)
        throw new Error("Event management migration is missing");
      const eventMigrationIndex = migrations.findIndex(
        (migration) => migration.name === eventMigration.name,
      );
      if (eventMigrationIndex !== migrations.length - 1) {
        throw new Error(
          "Event management migration must be the latest migration",
        );
      }

      for (const migration of migrations.slice(0, eventMigrationIndex)) {
        await applyMigration(databaseClient, migration);
      }
      await seedLegacyFixtures(databaseClient);
      databaseClient.on("notice", (notice) => notices.push(notice));
      await applyMigration(databaseClient, eventMigration);
    }, 60_000);

    afterAll(async () => {
      await databaseClient?.end();
      if (adminClient && databaseName) {
        await adminClient.query(
          `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`,
        );
      }
      await adminClient?.end();
    }, 30_000);

    it("TC-NEG-010 preserves club, hackathon, provider, audience, and timestamp data", async () => {
      const columns = await eventColumns(db());
      const tagColumn = requireNamedColumn(columns, "tag");
      const startColumn = requireNamedColumn(columns, "start_datetime");
      const endColumn = requireNamedColumn(columns, "end_datetime");
      expect(tagColumn.data_type).toBe("text");
      expect(startColumn.data_type).toBe("timestamp with time zone");
      expect(endColumn.data_type).toBe("timestamp with time zone");

      const result = await db().query<EventMigrationRow>(
        `SELECT * FROM "knight_hacks_event" ORDER BY "id"`,
      );
      expect(result.rowCount).toBe(3);

      const club = requireRow(
        result.rows.find((row) => row.id === CLUB_EVENT_ID),
        "legacy club event",
      );
      const hackathon = requireRow(
        result.rows.find((row) => row.id === HACKATHON_EVENT_ID),
        "legacy hackathon event",
      );
      const combined = requireRow(
        result.rows.find((row) => row.id === LEGACY_COMBINED_EVENT_ID),
        "legacy combined-audience event",
      );
      expect(club).toMatchObject({
        discord_id: "discord-club",
        google_id: "google-club",
        legacy: true,
        sync_revision: 0,
        tag: "GBM",
      });
      expect(club.start_datetime.toISOString()).toBe(
        "2025-02-16T04:30:00.000Z",
      );
      expect(club.end_datetime.toISOString()).toBe("2025-02-16T06:30:00.000Z");
      expect(hackathon).toMatchObject({
        hackathon_id: HACKATHON_ID,
        legacy: true,
        tag: "Workshop",
      });
      expect(combined).toMatchObject({
        dues_paying: true,
        legacy: true,
        roles: [ROLE_ID],
      });

      const operationalColumns = [
        requireColumn(columns, "discord", "sync", "state"),
        requireColumn(columns, "google", "sync", "state"),
        requireColumn(columns, "published"),
        requireColumn(columns, "creation", "key"),
        requireColumn(columns, "creation", "hash"),
        requireColumn(columns, "lease", "token"),
        requireColumn(columns, "lease", "expir"),
        requireColumn(columns, "discord", "attempt", "token"),
        requireColumn(columns, "google", "attempt", "token"),
        requireColumn(columns, "discord", "applied", "revision"),
        requireColumn(columns, "google", "applied", "revision"),
        requireColumn(columns, "visibility", "revision"),
        requireColumn(columns, "deletion"),
        requireColumn(columns, "discord", "acknowledg", "at"),
      ];
      for (const column of operationalColumns) {
        expect(dynamicColumnValue(club, column), column.column_name).toBeNull();
      }
    });

    it("TC-016 and TC-017 seed every legacy tag template and snapshot a valid color", async () => {
      const tagTable = await findTagTable(db());
      const result = await db().query<TagTemplateRow>(
        `SELECT * FROM ${quoteIdentifier(tagTable)} ORDER BY "name"`,
      );
      expect(result.rowCount).toBe(EVENTS.EVENT_TAGS.length);

      const byName = new Map(
        result.rows.map((row) => [String(row.name), row] as const),
      );
      for (const tag of EVENTS.EVENT_TAGS) {
        const row = requireRow(byName.get(tag), `seeded ${tag} template`);
        expect(row.default_points, tag).toBe(LEGACY_DEFAULT_POINTS[tag]);
        expect(row.active, tag).toBe(true);
        expect(row.normalized_name, tag).toBe(tag.toLowerCase());
        expect(row.color, tag).toMatch(/^#[0-9A-F]{6}$/i);
      }

      const events = await db().query<EventTagColorRow>(
        `SELECT "tag", "tag_color" FROM "knight_hacks_event"`,
      );
      for (const event of events.rows) {
        const template = requireRow(
          byName.get(event.tag),
          `seeded ${event.tag} template`,
        );
        expect(event.tag_color).toBe(template.color);
      }

      await db().query(
        `UPDATE "knight_hacks_event" SET "tag" = 'Community Night'
          WHERE "id" = $1`,
        [CLUB_EVENT_ID],
      );
      const customTag = await db().query<{ tag: string }>(
        `SELECT "tag" FROM "knight_hacks_event" WHERE "id" = $1`,
        [CLUB_EVENT_ID],
      );
      expect(customTag.rows[0]?.tag).toBe("Community Night");
      await db().query(
        `UPDATE "knight_hacks_event" SET "tag" = 'GBM' WHERE "id" = $1`,
        [CLUB_EVENT_ID],
      );
    });

    it("TC-022 and TC-NEG-010 retain duplicate attendance and mark legacy awards Estimated", async () => {
      const result = await db().query<AttendanceMigrationRow>(
        `SELECT * FROM "knight_hacks_event_attendee" ORDER BY "id"`,
      );
      expect(result.rowCount).toBe(3);
      expect(
        result.rows.filter((row) => row.event_id === CLUB_EVENT_ID),
      ).toHaveLength(2);

      for (const row of result.rows) {
        expect(row.checked_in_at).toBeNull();
        expect(row.checked_in_by).toBeNull();
        expect(row.points_awarded_estimated).toBe(true);
      }
      expect(
        result.rows
          .filter((row) => row.event_id === CLUB_EVENT_ID)
          .map((row) => row.points_awarded),
      ).toEqual([35, 35]);
      expect(
        result.rows.find((row) => row.event_id === LEGACY_COMBINED_EVENT_ID)
          ?.points_awarded,
      ).toBe(LEGACY_DEFAULT_POINTS.Social);
      expect(
        notices.some((notice) =>
          /duplicate.*event.*attend|event.*attend.*duplicate/i.test(
            notice.message ?? "",
          ),
        ),
      ).toBe(true);
    });

    it("TC-009 gives new rows pending revision-one defaults and rejects impossible synced state", async () => {
      const columns = await eventColumns(db());
      expect(requireNamedColumn(columns, "discord_id").is_nullable).toBe("YES");
      expect(requireNamedColumn(columns, "google_id").is_nullable).toBe("YES");

      const inserted = await db().query<NewEventRow>(
        `INSERT INTO "knight_hacks_event"
          ("name", "tag", "tag_color", "description", "start_datetime",
           "end_datetime", "location", "dues_paying", "is_operations_calendar",
           "roles", "points")
         VALUES ('New Event', 'Community Night', '#A855F7', 'New event',
           '2027-01-15T18:00:00-05:00', '2027-01-15T20:00:00-05:00',
           'BA1 107', false, false, '{}', 0)
         RETURNING *`,
      );
      expect(inserted.rows[0]).toMatchObject({
        discord_id: null,
        discord_sync_state: "pending",
        google_id: null,
        google_sync_state: "pending",
        legacy: false,
        points: 0,
        sync_revision: 1,
      });

      await expect(
        db().query(
          `UPDATE "knight_hacks_event"
              SET "discord_sync_state" = 'synced'
            WHERE "id" = $1`,
          [requireRow(inserted.rows[0], "inserted Reforge event").id],
        ),
      ).rejects.toThrow();
    });
  },
);

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  applyMigration,
  isLoopbackDatabaseUrl,
  readMigrations,
} from "../testing";
import { migrationTestDatabaseUrl } from "./env";

const HACK_A = randomUUID();
const HACK_B = randomUUID();
const HACK_A_TAG = randomUUID();
const HACK_B_TAG = randomUUID();
const ARCHIVED_TAG = randomUUID();

const LEGACY_EVENTS = [
  { name: "club", tag: "Workshop", hackathonId: null },
  { name: "hack-a", tag: "Workshop", hackathonId: HACK_A },
  { name: "hack-b", tag: "Workshop", hackathonId: HACK_B },
  { name: "archived", tag: "Archived", hackathonId: null },
  { name: "missing", tag: "Removed tag", hackathonId: null },
  { name: "wrong-scope", tag: "Food", hackathonId: HACK_A },
  { name: "spaces", tag: "  PROJECT   LAUNCH  ", hackathonId: null },
  { name: "whitespace", tag: "\tProject   Launch\n", hackathonId: null },
];

interface EventRow {
  name: string;
  tag: string;
  tag_id: string | null;
  tag_color: string;
  points: number;
}

interface TagRow {
  id: string;
  normalized_name: string;
  hackathon_id: string | null;
  emoji: string | null;
  announcement_channel_id: string | null;
  skip_next_week: boolean;
}

async function seedLegacyEvents(client: Client) {
  await client.query(
    `INSERT INTO "knight_hacks_hackathon"
       ("id", "name", "display_name", "theme", "start_date", "end_date")
     VALUES ($1, 'reminder-a', 'Reminder A', 'Test', '2026-10-01', '2026-10-03'),
            ($2, 'reminder-b', 'Reminder B', 'Test', '2027-10-01', '2027-10-03')`,
    [HACK_A, HACK_B],
  );
  await client.query(
    `INSERT INTO "knight_hacks_event_tag"
       ("id", "name", "normalized_name", "color", "hackathon_id", "active")
     VALUES ($1, 'Workshop', 'workshop', '#111111', $4, true),
            ($2, 'Workshop', 'workshop', '#222222', $5, true),
            ($3, 'Archived', 'archived', '#333333', NULL, false),
            (gen_random_uuid(), 'OPS', 'ops', '#444444', $4, true),
            (gen_random_uuid(), 'Project Launch', 'project launch', '#555555', $4, true)`,
    [HACK_A_TAG, HACK_B_TAG, ARCHIVED_TAG, HACK_A, HACK_B],
  );
  for (const event of LEGACY_EVENTS) {
    await client.query(
      `INSERT INTO "knight_hacks_event"
         ("name", "tag", "tag_color", "description", "start_datetime",
          "end_datetime", "location", "points", "hackathon_id")
       VALUES ($1, $2, '#abcdef', 'Original description', '2026-09-07T16:00:00Z',
               '2026-09-07T17:00:00Z', 'HEC 101', 17, $3)`,
      [event.name, event.tag, event.hackathonId],
    );
  }
}

describe.runIf(isLoopbackDatabaseUrl(migrationTestDatabaseUrl))(
  "reminder tag migration against disposable PostgreSQL",
  () => {
    let admin: Client | undefined;
    let client: Client | undefined;
    const databaseName = `forge_reminder_migration_${randomUUID().replaceAll("-", "")}`;

    function db() {
      if (!client) throw new Error("Disposable database is not ready.");
      return client;
    }

    beforeAll(async () => {
      if (!isLoopbackDatabaseUrl(migrationTestDatabaseUrl)) {
        throw new Error(
          "Reminder migration tests require a loopback database.",
        );
      }
      const url = new URL(migrationTestDatabaseUrl);
      url.pathname = "/postgres";
      admin = new Client({ connectionString: url.toString() });
      await admin.connect();
      await admin.query(`CREATE DATABASE "${databaseName}"`);
      url.pathname = `/${databaseName}`;
      client = new Client({ connectionString: url.toString() });
      await client.connect();

      const migrations = await readMigrations();
      const index = migrations.findIndex((migration) =>
        migration.name.startsWith("0050_"),
      );
      if (index === -1) throw new Error("Reminder tag migration is missing.");
      for (const migration of migrations.slice(0, index)) {
        await applyMigration(client, migration);
      }
      await seedLegacyEvents(client);
      for (const migration of migrations.slice(index)) {
        await applyMigration(client, migration);
      }
    }, 120_000);

    afterAll(async () => {
      await client?.end();
      if (admin) {
        await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        await admin.end();
      }
    });

    it("backfills normalized names only within the matching Club or hackathon scope", async () => {
      const { rows: tags } = await db().query<TagRow>(
        `SELECT * FROM "knight_hacks_event_tag"`,
      );
      const clubTag = (name: string) =>
        tags.find(
          (tag) => tag.hackathon_id === null && tag.normalized_name === name,
        )?.id;
      const { rows } = await db().query<EventRow>(
        `SELECT * FROM "knight_hacks_event" ORDER BY "name"`,
      );
      expect(
        Object.fromEntries(rows.map((row) => [row.name, row.tag_id])),
      ).toEqual({
        archived: ARCHIVED_TAG,
        club: clubTag("workshop"),
        "hack-a": HACK_A_TAG,
        "hack-b": HACK_B_TAG,
        missing: null,
        spaces: clubTag("project launch"),
        whitespace: clubTag("project launch"),
        "wrong-scope": null,
      });
      for (const event of LEGACY_EVENTS) {
        expect(rows.find((row) => row.name === event.name)).toMatchObject({
          tag: event.tag,
          tag_color: "#abcdef",
          points: 17,
        });
      }
    });

    it("seeds only Club OPS and Project Launch exclusions and leaves optional settings empty", async () => {
      const { rows } = await db().query<TagRow>(
        `SELECT * FROM "knight_hacks_event_tag" ORDER BY "normalized_name"`,
      );
      expect(
        rows
          .filter((tag) => tag.skip_next_week)
          .map((tag) => ({
            name: tag.normalized_name,
            scope: tag.hackathon_id,
          })),
      ).toEqual([
        { name: "ops", scope: null },
        { name: "project launch", scope: null },
      ]);
      expect(
        rows.every(
          (tag) => tag.emoji === null && tag.announcement_channel_id === null,
        ),
      ).toBe(true);
      const inserted = await db().query<TagRow>(
        `INSERT INTO "knight_hacks_event_tag" ("name", "normalized_name", "color")
         VALUES ('New tag', 'new tag', '#123456') RETURNING *`,
      );
      expect(inserted.rows[0]).toMatchObject({
        emoji: null,
        announcement_channel_id: null,
        skip_next_week: false,
      });
    });

    it("keeps event snapshots and the tag association when settings and the tag name change", async () => {
      await db().query(
        `UPDATE "knight_hacks_event_tag"
         SET "name" = 'Renamed', "normalized_name" = 'renamed', "color" = '#999999',
             "default_points" = 999, "emoji" = '🚀', "announcement_channel_id" = '1284582557689843785',
             "skip_next_week" = true
         WHERE "id" = $1`,
        [ARCHIVED_TAG],
      );
      const event = await db().query<EventRow>(
        `SELECT * FROM "knight_hacks_event" WHERE "name" = 'archived'`,
      );
      expect(event.rows[0]).toMatchObject({
        tag_id: ARCHIVED_TAG,
        tag: "Archived",
        tag_color: "#abcdef",
        points: 17,
      });
      const tag = await db().query<TagRow>(
        `SELECT * FROM "knight_hacks_event_tag" WHERE "id" = $1`,
        [ARCHIVED_TAG],
      );
      expect(tag.rows[0]).toMatchObject({
        emoji: "🚀",
        announcement_channel_id: "1284582557689843785",
        skip_next_week: true,
      });
    });

    it.each([
      "12345",
      "< #1284582557689843785>",
      "1284582557689843785 ",
      "1".repeat(21),
    ])("rejects invalid channel ID %s in storage", async (channel) => {
      await expect(
        db().query(
          `UPDATE "knight_hacks_event_tag" SET "announcement_channel_id" = $1 WHERE "id" = $2`,
          [channel, HACK_A_TAG],
        ),
      ).rejects.toThrow(/announcement_channel_check|value too long/);
    });

    it("rejects missing tag references and preserves event snapshots after tag deletion", async () => {
      await expect(
        db().query(
          `UPDATE "knight_hacks_event" SET "tag_id" = $1 WHERE "name" = 'club'`,
          [randomUUID()],
        ),
      ).rejects.toThrow(/tag_id_knight_hacks_event_tag_id_fk/);
      await db().query(`DELETE FROM "knight_hacks_event_tag" WHERE "id" = $1`, [
        ARCHIVED_TAG,
      ]);
      const { rows } = await db().query<EventRow>(
        `SELECT * FROM "knight_hacks_event" WHERE "name" = 'archived'`,
      );
      expect(rows[0]).toMatchObject({
        tag_id: null,
        tag: "Archived",
        tag_color: "#abcdef",
        points: 17,
      });
    });
  },
);

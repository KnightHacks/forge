import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { db } from "@forge/db/client";
import type * as Schema from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq, sql } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

/**
 * Proves the constraints migration 0055 adds for the 3D printing queue. The API
 * checks the same rules first; these are the backstops that hold when a query
 * is wrong or two requests race.
 */

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

function required<T>(value: T | null | undefined): T {
  assert(value != null);
  return value;
}

/** Drizzle wraps driver errors; the Postgres SQLSTATE is on `cause.code`. */
async function rejectsWith(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ cause: { code } });
}

describe.skipIf(!canRunDatabaseTests())("print job schema", () => {
  let client: typeof db;
  let schema: typeof Schema;
  let database: DisposableDatabase;
  let hackathon: string;
  let otherHackathon: string;
  let attendee: string;
  let otherHackerAttendee: string;
  let attendeeAtOtherHackathon: string;

  async function seedHackathon() {
    const id = randomUUID();
    await client.insert(schema.Hackathon).values({
      id,
      name: `print-${id}`,
      displayName: "Print test hackathon",
      theme: "Test",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2099-01-01"),
      applicationOpen: new Date("2025-01-01"),
      applicationDeadline: new Date("2025-12-01"),
      confirmationDeadline: new Date("2025-12-31"),
      timezone: "America/New_York",
    });
    return id;
  }

  /** One hacker with a checked-in attendee row at each listed hackathon. */
  async function seedHacker(index: number, hackathonIds: string[]) {
    const { User } = await import("@forge/db/schemas/auth");
    const userId = randomUUID();
    await client.insert(User).values({
      id: userId,
      name: `Printer ${index}`,
      discordUserId: `1234567890123456${index.toString().padStart(2, "0")}`,
    });
    const hackerId = randomUUID();
    await client.insert(schema.Hacker).values({
      id: hackerId,
      userId,
      firstName: `Printer${index}`,
      lastName: "Tester",
      gender: "Prefer not to answer",
      raceOrEthnicity: "Prefer not to answer",
      country: "United States of America",
      email: `printer${index}@example.test`,
      phoneNumber: `407556${index.toString().padStart(4, "0")}`,
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate University (3+ year)",
      major: "Computer Science",
      shirtSize: "M",
      discordUser: `printer${index}`,
      dob: "2005-01-01",
      gradDate: "2028-05-01",
      age: 21,
      survey1: "Test",
      survey2: "Test",
    });

    const attendeeIds: string[] = [];
    for (const hackathonId of hackathonIds) {
      const [row] = await client
        .insert(schema.HackerAttendee)
        .values({
          hackerId,
          hackathonId,
          status: "checkedin",
          checkedInAt: new Date(),
        })
        .returning({ id: schema.HackerAttendee.id });
      attendeeIds.push(required(row).id);
    }
    return attendeeIds;
  }

  async function insertJob(
    values: Partial<typeof Schema.PrintJob.$inferInsert> = {},
  ) {
    const [row] = await client
      .insert(schema.PrintJob)
      .values({
        hackathonId: hackathon,
        hackerAttendeeId: attendee,
        description: "A small bracket, PLA, any color",
        ...values,
      })
      .returning();
    return required(row);
  }

  async function insertFile(
    values: Partial<typeof Schema.PrintJobFile.$inferInsert> = {},
  ) {
    const id = randomUUID();
    const [row] = await client
      .insert(schema.PrintJobFile)
      .values({
        id,
        hackathonId: hackathon,
        hackerAttendeeId: attendee,
        objectName: `print-jobs/${hackathon}/${attendee}/${id}-bracket.stl`,
        fileName: "bracket.stl",
        contentType: "model/stl",
        size: 1024,
        ...values,
      })
      .returning();
    return required(row);
  }

  beforeAll(async () => {
    database = await provisionDisposableDatabase("forge_print_jobs");
    vi.stubEnv("DATABASE_URL", database.url);
    ({ db: client } = await import("@forge/db/client"));
    schema = await import("@forge/db/schemas/knight-hacks");
  }, 120_000);

  beforeEach(async () => {
    const { User } = await import("@forge/db/schemas/auth");
    await client.execute(sql`TRUNCATE ${schema.Hackathon}, ${User} CASCADE`);
    hackathon = await seedHackathon();
    otherHackathon = await seedHackathon();
    [attendee = "", attendeeAtOtherHackathon = ""] = await seedHacker(1, [
      hackathon,
      otherHackathon,
    ]);
    [otherHackerAttendee = ""] = await seedHacker(2, [hackathon]);
  }, 30_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await database.drop();
  }, 30_000);

  it("creates a job as received with no note", async () => {
    const job = await insertJob();

    expect(job.status).toBe("received");
    expect(job.statusNote).toBeNull();
    expect(job.statusChangedByUserId).toBeNull();
  });

  it("rejects a status outside the known list", async () => {
    await rejectsWith(
      client.execute(
        sql`INSERT INTO ${schema.PrintJob} (hackathon_id, hacker_attendee_id, description, status)
            VALUES (${hackathon}, ${attendee}, 'Bracket', 'lost')`,
      ),
      CHECK_VIOLATION,
    );
  });

  it("rejects a blank description", async () => {
    await rejectsWith(insertJob({ description: "   " }), CHECK_VIOLATION);
  });

  it("requires a note for needs_clarification and no other status", async () => {
    await rejectsWith(
      insertJob({ status: "needs_clarification" }),
      CHECK_VIOLATION,
    );
    await rejectsWith(
      insertJob({ status: "needs_clarification", statusNote: "   " }),
      CHECK_VIOLATION,
    );

    await expect(
      insertJob({ status: "needs_clarification", statusNote: "Which color?" }),
    ).resolves.toMatchObject({ status: "needs_clarification" });
    await expect(insertJob({ status: "printing" })).resolves.toMatchObject({
      statusNote: null,
    });
  });

  it("rejects a job whose attendee belongs to another hackathon", async () => {
    await rejectsWith(
      insertJob({ hackerAttendeeId: attendeeAtOtherHackathon }),
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("lets a staged file exist before its job and be claimed by its owner", async () => {
    const file = await insertFile();
    expect(file.printJobId).toBeNull();

    const job = await insertJob();
    await client
      .update(schema.PrintJobFile)
      .set({ printJobId: job.id })
      .where(eq(schema.PrintJobFile.id, file.id));

    const [claimed] = await client
      .select({ printJobId: schema.PrintJobFile.printJobId })
      .from(schema.PrintJobFile)
      .where(eq(schema.PrintJobFile.id, file.id));
    expect(claimed?.printJobId).toBe(job.id);
  });

  it("refuses to attach one hacker's file to another hacker's job", async () => {
    const file = await insertFile();
    const othersJob = await insertJob({
      hackerAttendeeId: otherHackerAttendee,
    });

    await rejectsWith(
      client
        .update(schema.PrintJobFile)
        .set({ printJobId: othersJob.id })
        .where(eq(schema.PrintJobFile.id, file.id)),
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("rejects an empty file", async () => {
    await rejectsWith(insertFile({ size: 0 }), CHECK_VIOLATION);
  });

  it("accepts only snowflake channel IDs, or none", async () => {
    await rejectsWith(
      client.insert(schema.PrintingConfiguration).values({
        hackathonId: hackathon,
        // A pasted channel mention, short enough to pass the column length.
        discordChannelId: "<#12345678901234567>",
      }),
      CHECK_VIOLATION,
    );

    await expect(
      client
        .insert(schema.PrintingConfiguration)
        .values({ hackathonId: hackathon, discordChannelId: null })
        .returning(),
    ).resolves.toHaveLength(1);
    await client
      .update(schema.PrintingConfiguration)
      .set({ discordChannelId: "123456789012345678" })
      .where(eq(schema.PrintingConfiguration.hackathonId, hackathon));
  });

  it("removes jobs, files, and configuration with their hackathon", async () => {
    const job = await insertJob();
    await insertFile({ printJobId: job.id });
    await client
      .insert(schema.PrintingConfiguration)
      .values({ hackathonId: hackathon });

    await client
      .delete(schema.Hackathon)
      .where(eq(schema.Hackathon.id, hackathon));

    const counts = await database.client.query<{
      jobs: number;
      files: number;
      configs: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM knight_hacks_print_job) AS jobs,
         (SELECT count(*)::int FROM knight_hacks_print_job_file) AS files,
         (SELECT count(*)::int FROM knight_hacks_printing_configuration) AS configs`,
    );
    expect(counts.rows[0]).toEqual({ jobs: 0, files: 0, configs: 0 });
  });
});

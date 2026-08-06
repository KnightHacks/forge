import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { AuditActor } from "../../utils/audit/service";
import type { correctHackathonEventAttendance } from "../../utils/hackathon-events/correction";

type DatabaseClient = typeof db;
type AuthSchemas = typeof AuthSchemaModule;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type CorrectionService = typeof correctHackathonEventAttendance;

const OPERATOR_ID = "10000000-0000-4000-8000-0000000000c1";
const HACKATHON_ID = "20000000-0000-4000-8000-0000000000c1";
const OTHER_HACKATHON_ID = "20000000-0000-4000-8000-0000000000c2";
const HACKER_ID = "30000000-0000-4000-8000-0000000000c1";
const ATTENDEE_ID = "40000000-0000-4000-8000-0000000000c1";
const EVENT_ID = "50000000-0000-4000-8000-0000000000c1";
const PRIMARY_EVENT_ID = "50000000-0000-4000-8000-0000000000c2";
const LEGACY_EVENT_ID = "50000000-0000-4000-8000-0000000000c3";
const INITIAL_ATTENDANCE_ID = "60000000-0000-4000-8000-0000000000c1";
const REPEAT_ATTENDANCE_ID = "60000000-0000-4000-8000-0000000000c2";
const PRIMARY_ATTENDANCE_ID = "60000000-0000-4000-8000-0000000000c3";
const LEGACY_ATTENDANCE_ID = "60000000-0000-4000-8000-0000000000c4";

const NOW = new Date("2026-08-05T16:00:00.000Z");
const operator: AuditActor = {
  discordUserId: "990000000000000111",
  id: OPERATOR_ID,
  name: "Correction Operator",
  snapshot: { memberId: null, roleColor: null, roleLabel: null },
};

describe.skipIf(!canRunDatabaseTests())(
  "hackathon event attendance correction",
  () => {
    let auth: AuthSchemas;
    let client: DatabaseClient;
    let correctAttendance: CorrectionService;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_correction");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;

      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({ correctHackathonEventAttendance: correctAttendance } =
        await import("../../utils/hackathon-events/correction"));

      await client.insert(auth.User).values({
        discordUserId: "990000000000000111",
        id: OPERATOR_ID,
        name: "Correction Operator",
      });
      const window = {
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        theme: "Correction",
      };
      await client.insert(knightHacks.Hackathon).values([
        {
          ...window,
          displayName: "Correction Hackathon",
          id: HACKATHON_ID,
          name: "correction-hackathon",
        },
        {
          ...window,
          displayName: "Other Hackathon",
          id: OTHER_HACKATHON_ID,
          name: "other-hackathon",
        },
      ]);
      await client.insert(knightHacks.Hacker).values({
        age: 20,
        discordUser: "correction-hacker",
        dob: "2006-01-01",
        email: "correction@example.test",
        firstName: "Correction",
        gradDate: "2030-05-01",
        id: HACKER_ID,
        lastName: "Hacker",
        levelOfStudy: "Undergraduate University (3+ year)",
        phoneNumber: "0000000000",
        school: "University of Central Florida",
        shirtSize: "M",
        survey1: "",
        survey2: "",
        userId: OPERATOR_ID,
      });
      await client.insert(knightHacks.HackerAttendee).values({
        checkedInAt: NOW,
        checkedInBy: OPERATOR_ID,
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ID,
        id: ATTENDEE_ID,
        points: 30,
        status: "checkedin",
      });
      const event = {
        description: "Correction fixture",
        end_datetime: new Date("2026-08-05T18:00:00.000Z"),
        hackathonId: HACKATHON_ID,
        legacy: true,
        location: "Main Stage",
        points: 20,
        start_datetime: new Date("2026-08-05T17:00:00.000Z"),
        tag: "Workshop",
      };
      await client.insert(knightHacks.Event).values([
        { ...event, id: EVENT_ID, name: "Ordinary event" },
        {
          ...event,
          id: PRIMARY_EVENT_ID,
          name: "Primary check-in",
          purpose: "primary_check_in",
        },
        { ...event, id: LEGACY_EVENT_ID, name: "Legacy event" },
      ]);
    }, 120_000);

    beforeEach(async () => {
      await client.delete(knightHacks.HackerEventAttendee);
      await client
        .update(knightHacks.HackerAttendee)
        .set({ points: 30 })
        .where(eq(knightHacks.HackerAttendee.id, ATTENDEE_ID));
      await client.insert(knightHacks.HackerEventAttendee).values([
        {
          checkedInAt: NOW,
          checkedInBy: OPERATOR_ID,
          eventId: EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: INITIAL_ATTENDANCE_ID,
          isInitialAttendance: true,
          pointsAwarded: 20,
        },
        {
          checkedInAt: new Date(NOW.getTime() + 1_000),
          checkedInBy: OPERATOR_ID,
          eventId: EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: REPEAT_ATTENDANCE_ID,
          isInitialAttendance: false,
          pointsAwarded: 0,
        },
        {
          checkedInAt: NOW,
          checkedInBy: OPERATOR_ID,
          eventId: PRIMARY_EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: PRIMARY_ATTENDANCE_ID,
          isInitialAttendance: true,
          pointsAwarded: 20,
        },
        {
          eventId: LEGACY_EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: LEGACY_ATTENDANCE_ID,
        },
      ]);
    });

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    it("soft-voids a repeat without changing points", async () => {
      const result = await correctAttendance(
        {
          attendanceId: REPEAT_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "  Duplicate meal scan  ",
        },
        NOW,
      );

      expect(result).toMatchObject({ pointsRemaining: 30, pointsReversed: 0 });
      const [row] = await client
        .select()
        .from(knightHacks.HackerEventAttendee)
        .where(eq(knightHacks.HackerEventAttendee.id, REPEAT_ATTENDANCE_ID));
      expect(row).toMatchObject({
        voidReason: "Duplicate meal scan",
        voidedBy: OPERATOR_ID,
      });
      expect(row?.voidedAt).toEqual(NOW);
    });

    it("refuses to reverse a point-bearing initial while a repeat remains", async () => {
      await expect(
        correctAttendance({
          attendanceId: INITIAL_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "Wrong person",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const [attendee] = await client
        .select({ points: knightHacks.HackerAttendee.points })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, ATTENDEE_ID));
      expect(attendee?.points).toBe(30);
    });

    it("reverses the exact snapshot after later repeats are voided", async () => {
      await correctAttendance({
        attendanceId: REPEAT_ATTENDANCE_ID,
        hackathonId: HACKATHON_ID,
        operator,
        reason: "Duplicate",
      });
      const result = await correctAttendance({
        attendanceId: INITIAL_ATTENDANCE_ID,
        hackathonId: HACKATHON_ID,
        operator,
        reason: "Wrong person",
      });

      expect(result).toMatchObject({ pointsRemaining: 10, pointsReversed: 20 });
    });

    it("refuses primary admission and Legacy unknown rows", async () => {
      await expect(
        correctAttendance({
          attendanceId: PRIMARY_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "Not allowed",
        }),
      ).rejects.toThrow("Primary hackathon admission cannot be undone");
      await expect(
        correctAttendance({
          attendanceId: LEGACY_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "Unknown history",
        }),
      ).rejects.toThrow("Legacy attendance");
    });

    it("hides cross-hack attendance as not found", async () => {
      await expect(
        correctAttendance({
          attendanceId: REPEAT_ATTENDANCE_ID,
          hackathonId: OTHER_HACKATHON_ID,
          operator,
          reason: "Cross scope",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("serializes two corrections of the same occurrence", async () => {
      const outcomes = await Promise.allSettled([
        correctAttendance({
          attendanceId: REPEAT_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "First correction",
        }),
        correctAttendance({
          attendanceId: REPEAT_ATTENDANCE_ID,
          hackathonId: HACKATHON_ID,
          operator,
          reason: "Second correction",
        }),
      ]);

      expect(
        outcomes.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        outcomes.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
      const [attendee] = await client
        .select({ points: knightHacks.HackerAttendee.points })
        .from(knightHacks.HackerAttendee)
        .where(
          and(
            eq(knightHacks.HackerAttendee.id, ATTENDEE_ID),
            eq(knightHacks.HackerAttendee.hackathonId, HACKATHON_ID),
          ),
        );
      expect(attendee?.points).toBe(30);
    });
  },
);

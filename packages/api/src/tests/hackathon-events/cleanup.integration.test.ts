import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { and, count, eq, inArray } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { cleanupExpiredHackathonCheckInAttempts } from "../../utils/hackathon-events/cleanup";

type AuthSchemas = typeof AuthSchemaModule;
type Cleanup = typeof cleanupExpiredHackathonCheckInAttempts;
type DatabaseClient = typeof db;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;

const NOW = new Date("2026-08-05T16:00:00.000Z");
const OPERATOR_ID = "10000000-0000-4000-8000-000000000601";
const HACKATHON_ID = "20000000-0000-4000-8000-000000000601";
const EVENT_ID = "30000000-0000-4000-8000-000000000601";
const HACKER_ID = "40000000-0000-4000-8000-000000000601";
const ATTENDEE_ID = "50000000-0000-4000-8000-000000000601";
const SUCCESS_OLD_ID = "60000000-0000-4000-8000-000000000601";
const SUCCESS_RECENT_ID = "60000000-0000-4000-8000-000000000602";
const ATTENDANCE_OLD_ID = "70000000-0000-4000-8000-000000000601";
const ATTENDANCE_RECENT_ID = "70000000-0000-4000-8000-000000000602";
const ROLE_GRANT_ID = "80000000-0000-4000-8000-000000000601";
const ROLE_ATTEMPT_TOKEN = "90000000-0000-4000-8000-000000000601";
const OLD_FAILURE_IDS = Array.from(
  { length: 5 },
  (_, index) => `a0000000-0000-4000-8000-00000000060${index + 1}`,
);
const RECENT_FAILURE_ID = "a0000000-0000-4000-8000-00000000060f";

describe.skipIf(!canRunDatabaseTests())(
  "hackathon check-in history cleanup",
  () => {
    let auth: AuthSchemas;
    let cleanup: Cleanup;
    let client: DatabaseClient;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_cleanup");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({ cleanupExpiredHackathonCheckInAttempts: cleanup } =
        await import("../../utils/hackathon-events/cleanup"));

      await client.insert(auth.User).values({
        discordUserId: "990000000000000601",
        id: OPERATOR_ID,
        name: "Cleanup Operator",
      });
      await client.insert(knightHacks.Hackathon).values({
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        displayName: "Cleanup Hackathon",
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        id: HACKATHON_ID,
        name: "cleanup-hackathon",
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        theme: "Cleanup",
      });
      await client.insert(knightHacks.Event).values({
        description: "Cleanup fixture",
        end_datetime: new Date("2026-08-05T18:00:00.000Z"),
        hackathonId: HACKATHON_ID,
        id: EVENT_ID,
        legacy: true,
        location: "Venue",
        name: "Dinner",
        points: 5,
        start_datetime: new Date("2026-08-05T17:00:00.000Z"),
        tag: "Hackathon",
      });
      await client.insert(knightHacks.Hacker).values({
        age: 20,
        discordUser: "cleanup-hacker",
        dob: "2006-01-01",
        email: "cleanup@example.test",
        firstName: "Cleanup",
        gradDate: "2030-05-01",
        id: HACKER_ID,
        lastName: "Hacker",
        levelOfStudy: "Undergraduate University (3+ year)",
        phoneNumber: "4070000601",
        school: "University of Central Florida",
        shirtSize: "M",
        survey1: "",
        survey2: "",
        userId: OPERATOR_ID,
      });
      await client.insert(knightHacks.HackerAttendee).values({
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ID,
        id: ATTENDEE_ID,
        status: "checkedin",
      });
      await client.insert(knightHacks.HackerEventAttendee).values([
        {
          checkedInAt: new Date("2026-06-01T12:00:00.000Z"),
          checkedInBy: OPERATOR_ID,
          eventId: EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: ATTENDANCE_OLD_ID,
          isInitialAttendance: true,
          pointsAwarded: 5,
        },
        {
          checkedInAt: new Date("2026-08-01T12:00:00.000Z"),
          checkedInBy: OPERATOR_ID,
          eventId: EVENT_ID,
          hackerAttId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          id: ATTENDANCE_RECENT_ID,
          isInitialAttendance: false,
          pointsAwarded: 0,
        },
      ]);
      const success = (
        id: string,
        attendanceId: string,
        attemptedAt: Date,
      ) => ({
        attendanceId,
        attemptedAt,
        eventId: EVENT_ID,
        eventNameSnapshot: "Dinner",
        eventPurpose: "event" as const,
        hackerAttendeeId: ATTENDEE_ID,
        hackathonId: HACKATHON_ID,
        hackerNameSnapshot: "Cleanup Hacker",
        id,
        mode: "manual" as const,
        operatorId: OPERATOR_ID,
        outcome: "checked_in" as const,
        pointsAwarded: attendanceId === ATTENDANCE_OLD_ID ? 5 : 0,
      });
      await client.insert(knightHacks.HackerCheckInAttempt).values([
        success(
          SUCCESS_OLD_ID,
          ATTENDANCE_OLD_ID,
          new Date("2026-06-01T12:00:00.000Z"),
        ),
        success(
          SUCCESS_RECENT_ID,
          ATTENDANCE_RECENT_ID,
          new Date("2026-08-01T12:00:00.000Z"),
        ),
        ...OLD_FAILURE_IDS.map((id, index) => ({
          attemptedAt: new Date(`2026-06-0${index + 1}T12:00:00.000Z`),
          eventId: EVENT_ID,
          eventNameSnapshot: "Dinner",
          eventPurpose: "event" as const,
          expiresAt: new Date(`2026-07-0${index + 1}T12:00:00.000Z`),
          hackathonId: HACKATHON_ID,
          id,
          mode: "scanner" as const,
          outcome: "invalid_qr" as const,
        })),
        {
          attemptedAt: new Date("2026-08-01T12:00:00.000Z"),
          eventId: EVENT_ID,
          eventNameSnapshot: "Dinner",
          eventPurpose: "event",
          expiresAt: new Date("2026-08-31T12:00:00.000Z"),
          hackathonId: HACKATHON_ID,
          id: RECENT_FAILURE_ID,
          mode: "scanner",
          outcome: "invalid_qr",
        },
      ]);
      await client.insert(knightHacks.HackerDiscordRoleGrant).values({
        desiredRoleId: "990000000000000602",
        hackerAttendeeId: ATTENDEE_ID,
        hackathonId: HACKATHON_ID,
        id: ROLE_GRANT_ID,
        kind: "general",
        sourceAttendanceId: ATTENDANCE_OLD_ID,
        sourceEventId: EVENT_ID,
        state: "succeeded",
        succeededAt: new Date("2026-06-01T12:00:01.000Z"),
      });
      await client.insert(knightHacks.HackerDiscordRoleGrantAttempt).values({
        attemptedBy: OPERATOR_ID,
        attemptToken: ROLE_ATTEMPT_TOKEN,
        discordUserIdSnapshot: "990000000000000601",
        finishedAt: new Date("2026-06-01T12:00:01.000Z"),
        grantId: ROLE_GRANT_ID,
        outcome: "succeeded",
        roleIdSnapshot: "990000000000000602",
        startedAt: new Date("2026-06-01T12:00:00.000Z"),
      });
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    it("[TC-HIST-003] deletes only expired failures in bounded concurrent batches", async () => {
      const firstPass = await Promise.all([
        cleanup({ limit: 2, now: NOW }),
        cleanup({ limit: 2, now: NOW }),
      ]);
      expect(firstPass.every(({ deleted }) => deleted <= 2)).toBe(true);

      for (let pass = 0; pass < 5; pass += 1) {
        const result = await cleanup({ limit: 2, now: NOW });
        if (result.deleted === 0) break;
      }

      const remaining = await client
        .select({ id: knightHacks.HackerCheckInAttempt.id })
        .from(knightHacks.HackerCheckInAttempt);
      expect(remaining.map(({ id }) => id).sort()).toEqual(
        [RECENT_FAILURE_ID, SUCCESS_OLD_ID, SUCCESS_RECENT_ID].sort(),
      );
      expect(remaining.some(({ id }) => OLD_FAILURE_IDS.includes(id))).toBe(
        false,
      );

      const [attendanceCount] = await client
        .select({ value: count() })
        .from(knightHacks.HackerEventAttendee)
        .where(
          and(
            eq(knightHacks.HackerEventAttendee.eventId, EVENT_ID),
            inArray(knightHacks.HackerEventAttendee.id, [
              ATTENDANCE_OLD_ID,
              ATTENDANCE_RECENT_ID,
            ]),
          ),
        );
      const [roleHistoryCount] = await client
        .select({ value: count() })
        .from(knightHacks.HackerDiscordRoleGrantAttempt)
        .where(
          eq(knightHacks.HackerDiscordRoleGrantAttempt.grantId, ROLE_GRANT_ID),
        );
      expect(attendanceCount?.value).toBe(2);
      expect(roleHistoryCount?.value).toBe(1);
    });
  },
);

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { asc, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { deliverHackathonRoleGrants } from "../../utils/hackathon-events/roles";
import type { RoleDiscordGateway } from "../../utils/roles/discord-gateway";

type AuthSchemas = typeof AuthSchemaModule;
type DatabaseClient = typeof db;
type DeliverRoleGrants = typeof deliverHackathonRoleGrants;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;

const OPERATOR_ID = "10000000-0000-4000-8000-000000000701";
const HACKER_USER_ID = "10000000-0000-4000-8000-000000000702";
const HACKATHON_ID = "20000000-0000-4000-8000-000000000701";
const EVENT_ID = "30000000-0000-4000-8000-000000000701";
const HACKER_ID = "40000000-0000-4000-8000-000000000701";
const ATTENDEE_ID = "50000000-0000-4000-8000-000000000701";
const ATTENDANCE_ID = "60000000-0000-4000-8000-000000000701";
const CHECK_IN_ATTEMPT_ID = "70000000-0000-4000-8000-000000000701";
const RESCAN_ATTEMPT_ID = "70000000-0000-4000-8000-000000000702";
const CLASS_ID = "80000000-0000-4000-8000-000000000701";
const CLASS_ROLE_ID = "990000000000000705";
const OLD_ROLE_ID = "990000000000000701";
const NEW_ROLE_ID = "990000000000000702";
const DISCORD_USER_ID = "990000000000000703";
const NOW = new Date("2026-08-05T16:00:00.000Z");
const LATER = new Date("2026-08-05T16:01:00.000Z");

function deferredVoid() {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => {
      if (!resolvePromise) throw new Error("Deferred promise is unavailable.");
      resolvePromise();
    },
  };
}

async function seedRoleLeaseFixture(
  client: DatabaseClient,
  auth: AuthSchemas,
  knightHacks: KnightHacksSchemas,
) {
  await client.insert(auth.User).values([
    {
      discordUserId: "990000000000000704",
      id: OPERATOR_ID,
      name: "Role Operator",
    },
    {
      discordUserId: DISCORD_USER_ID,
      id: HACKER_USER_ID,
      name: "Role Hacker",
    },
  ]);
  await client.insert(knightHacks.Hackathon).values({
    applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
    applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
    confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
    displayName: "Role Lease Hackathon",
    endDate: new Date("2026-08-10T00:00:00.000Z"),
    generalHackerDiscordRoleId: OLD_ROLE_ID,
    id: HACKATHON_ID,
    name: "role-lease-hackathon",
    startDate: new Date("2026-08-05T00:00:00.000Z"),
    theme: "Role leases",
  });
  await client.insert(knightHacks.Event).values({
    description: "Primary admission fixture",
    end_datetime: new Date("2026-08-05T18:00:00.000Z"),
    hackathonId: HACKATHON_ID,
    id: EVENT_ID,
    legacy: true,
    location: "Venue",
    name: "Overall Check-in",
    points: 0,
    purpose: "primary_check_in",
    start_datetime: new Date("2026-08-05T17:00:00.000Z"),
    tag: "Hackathon",
  });
  await client.insert(knightHacks.Hacker).values({
    age: 20,
    discordUser: "role-hacker",
    dob: "2006-01-01",
    email: "role-hacker@example.test",
    firstName: "Role",
    gradDate: "2030-05-01",
    id: HACKER_ID,
    lastName: "Hacker",
    levelOfStudy: "Undergraduate University (3+ year)",
    phoneNumber: "4070000701",
    school: "University of Central Florida",
    shirtSize: "M",
    survey1: "",
    survey2: "",
    userId: HACKER_USER_ID,
  });
  await client.insert(knightHacks.HackerAttendee).values({
    hackathonId: HACKATHON_ID,
    hackerId: HACKER_ID,
    id: ATTENDEE_ID,
    status: "checkedin",
  });
  await client.insert(knightHacks.HackerEventAttendee).values({
    checkedInAt: NOW,
    checkedInBy: OPERATOR_ID,
    eventId: EVENT_ID,
    hackerAttId: ATTENDEE_ID,
    hackathonId: HACKATHON_ID,
    id: ATTENDANCE_ID,
    isInitialAttendance: true,
    pointsAwarded: 0,
  });
  await client.insert(knightHacks.HackerCheckInAttempt).values({
    attendanceId: ATTENDANCE_ID,
    attemptedAt: NOW,
    eventId: EVENT_ID,
    eventNameSnapshot: "Overall Check-in",
    eventPurpose: "primary_check_in",
    hackerAttendeeId: ATTENDEE_ID,
    hackerNameSnapshot: "Role Hacker",
    hackathonId: HACKATHON_ID,
    id: CHECK_IN_ATTEMPT_ID,
    mode: "manual",
    operatorId: OPERATOR_ID,
    outcome: "checked_in",
  });
}

describe.skipIf(!canRunDatabaseTests())(
  "hackathon Discord role delivery leases",
  () => {
    let auth: AuthSchemas;
    let client: DatabaseClient;
    let deliver: DeliverRoleGrants;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_roles");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({ deliverHackathonRoleGrants: deliver } =
        await import("../../utils/hackathon-events/roles"));

      await seedRoleLeaseFixture(client, auth, knightHacks);
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    beforeEach(async () => {
      await client.delete(knightHacks.HackerDiscordRoleGrantAttempt);
      await client.delete(knightHacks.HackerDiscordRoleGrant);
      await client
        .delete(knightHacks.HackerCheckInAttempt)
        .where(eq(knightHacks.HackerCheckInAttempt.id, RESCAN_ATTEMPT_ID));
      await client
        .update(knightHacks.HackerAttendee)
        .set({ classId: null })
        .where(eq(knightHacks.HackerAttendee.id, ATTENDEE_ID));
      await client.delete(knightHacks.HackathonClass);
      await client
        .update(knightHacks.Hackathon)
        .set({ generalHackerDiscordRoleId: OLD_ROLE_ID })
        .where(eq(knightHacks.Hackathon.id, HACKATHON_ID));
    });

    it("does not let an old Discord completion succeed a newly desired role", async () => {
      const oldCallStarted = deferredVoid();
      const releaseOldCall = deferredVoid();
      const newCallStarted = deferredVoid();
      const releaseNewCall = deferredVoid();
      const calls: string[] = [];
      const gateway = {
        grantRole: async (_discordUserId: string, roleId: string) => {
          calls.push(roleId);
          if (roleId === OLD_ROLE_ID) {
            oldCallStarted.resolve();
            await releaseOldCall.promise;
            return;
          }
          if (roleId === NEW_ROLE_ID) {
            newCallStarted.resolve();
            await releaseNewCall.promise;
            return;
          }
          throw new Error(`Unexpected role ${roleId}`);
        },
      } as RoleDiscordGateway;

      const oldDelivery = deliver({
        actorId: OPERATOR_ID,
        attemptId: CHECK_IN_ATTEMPT_ID,
        gateway,
        hackathonId: HACKATHON_ID,
        now: NOW,
      });
      await oldCallStarted.promise;

      await client
        .update(knightHacks.Hackathon)
        .set({ generalHackerDiscordRoleId: NEW_ROLE_ID })
        .where(eq(knightHacks.Hackathon.id, HACKATHON_ID));

      const newDelivery = deliver({
        actorId: OPERATOR_ID,
        attemptId: CHECK_IN_ATTEMPT_ID,
        gateway,
        hackathonId: HACKATHON_ID,
        now: LATER,
      });
      await newCallStarted.promise;

      let [grant] = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrant)
        .where(
          eq(knightHacks.HackerDiscordRoleGrant.hackerAttendeeId, ATTENDEE_ID),
        );
      let attempts = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrantAttempt)
        .orderBy(
          asc(knightHacks.HackerDiscordRoleGrantAttempt.startedAt),
          asc(knightHacks.HackerDiscordRoleGrantAttempt.id),
        );
      expect(grant).toMatchObject({
        attemptCount: 2,
        desiredRoleId: NEW_ROLE_ID,
        state: "pending",
      });
      expect(grant?.leaseToken).not.toBeNull();
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toMatchObject({
        error: "desired_role_changed",
        outcome: "unknown",
        roleIdSnapshot: OLD_ROLE_ID,
      });
      expect(attempts[0]?.finishedAt).not.toBeNull();
      expect(attempts[1]).toMatchObject({
        finishedAt: null,
        outcome: "pending",
        roleIdSnapshot: NEW_ROLE_ID,
      });

      releaseOldCall.resolve();
      await oldDelivery;

      [grant] = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrant)
        .where(
          eq(knightHacks.HackerDiscordRoleGrant.hackerAttendeeId, ATTENDEE_ID),
        );
      [attempts] = [
        await client
          .select()
          .from(knightHacks.HackerDiscordRoleGrantAttempt)
          .orderBy(
            asc(knightHacks.HackerDiscordRoleGrantAttempt.startedAt),
            asc(knightHacks.HackerDiscordRoleGrantAttempt.id),
          ),
      ];
      expect(grant).toMatchObject({
        desiredRoleId: NEW_ROLE_ID,
        state: "pending",
      });
      expect(attempts[0]).toMatchObject({
        error: "desired_role_changed",
        outcome: "unknown",
      });
      expect(attempts[1]).toMatchObject({ outcome: "pending" });

      releaseNewCall.resolve();
      await newDelivery;

      [grant] = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrant)
        .where(
          eq(knightHacks.HackerDiscordRoleGrant.hackerAttendeeId, ATTENDEE_ID),
        );
      attempts = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrantAttempt)
        .orderBy(
          asc(knightHacks.HackerDiscordRoleGrantAttempt.startedAt),
          asc(knightHacks.HackerDiscordRoleGrantAttempt.id),
        );
      expect(calls).toEqual([OLD_ROLE_ID, NEW_ROLE_ID]);
      expect(grant).toMatchObject({
        desiredRoleId: NEW_ROLE_ID,
        leaseToken: null,
        state: "succeeded",
      });
      expect(attempts.map(({ outcome }) => outcome)).toEqual([
        "unknown",
        "succeeded",
      ]);
    });

    it("repairs role delivery from a repeat primary scan without an attendance link", async () => {
      await client.insert(knightHacks.HackerCheckInAttempt).values({
        attendanceId: null,
        attemptedAt: LATER,
        eventId: EVENT_ID,
        eventNameSnapshot: "Overall Check-in",
        eventPurpose: "primary_check_in",
        expiresAt: new Date(LATER.getTime() + 30 * 24 * 60 * 60_000),
        hackerAttendeeId: ATTENDEE_ID,
        hackerNameSnapshot: "Role Hacker",
        hackathonId: HACKATHON_ID,
        id: RESCAN_ATTEMPT_ID,
        mode: "scanner",
        operatorId: OPERATOR_ID,
        outcome: "already_checked_in",
      });
      const calls: string[] = [];

      const result = await deliver({
        actorId: OPERATOR_ID,
        attemptId: RESCAN_ATTEMPT_ID,
        gateway: {
          grantRole: (_discordUserId, roleId) => {
            calls.push(roleId);
            return Promise.resolve();
          },
        } as RoleDiscordGateway,
        hackathonId: HACKATHON_ID,
        now: LATER,
      });

      expect(calls).toEqual([OLD_ROLE_ID]);
      expect(result).toMatchObject({ failedCount: 0, succeededCount: 1 });
    });

    it("closes an expired pending attempt before leasing a retry", async () => {
      const expiredToken = "90000000-0000-4000-8000-000000000701";
      const [grant] = await client
        .insert(knightHacks.HackerDiscordRoleGrant)
        .values({
          attemptCount: 1,
          desiredRoleId: OLD_ROLE_ID,
          hackerAttendeeId: ATTENDEE_ID,
          hackathonId: HACKATHON_ID,
          kind: "general",
          lastAttemptAt: NOW,
          leaseExpiresAt: new Date(NOW.getTime() + 30_000),
          leaseToken: expiredToken,
          sourceAttendanceId: ATTENDANCE_ID,
          sourceEventId: EVENT_ID,
          state: "pending",
        })
        .returning({ id: knightHacks.HackerDiscordRoleGrant.id });
      if (!grant) throw new Error("Expected role grant fixture.");
      await client.insert(knightHacks.HackerDiscordRoleGrantAttempt).values({
        attemptToken: expiredToken,
        attemptedBy: OPERATOR_ID,
        discordUserIdSnapshot: DISCORD_USER_ID,
        grantId: grant.id,
        roleIdSnapshot: OLD_ROLE_ID,
        startedAt: NOW,
      });

      await deliver({
        actorId: OPERATOR_ID,
        attemptId: CHECK_IN_ATTEMPT_ID,
        gateway: {
          grantRole: (_discordUserId: string, _roleId: string) =>
            Promise.resolve(),
        } as RoleDiscordGateway,
        hackathonId: HACKATHON_ID,
        now: LATER,
      });

      const attempts = await client
        .select()
        .from(knightHacks.HackerDiscordRoleGrantAttempt)
        .orderBy(asc(knightHacks.HackerDiscordRoleGrantAttempt.startedAt));
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toMatchObject({
        error: "lease_expired",
        outcome: "unknown",
      });
      expect(attempts[0]?.finishedAt).toEqual(LATER);
      expect(attempts[1]).toMatchObject({ outcome: "succeeded" });
    });

    it("starts each sequential role lease from a fresh clock reading", async () => {
      await client.insert(knightHacks.HackathonClass).values({
        color: "#123456",
        discordRoleId: CLASS_ROLE_ID,
        hackathonId: HACKATHON_ID,
        id: CLASS_ID,
        kind: "class",
        name: "Class One",
      });
      await client
        .update(knightHacks.HackerAttendee)
        .set({ classId: CLASS_ID })
        .where(eq(knightHacks.HackerAttendee.id, ATTENDEE_ID));
      const ticks = [NOW, LATER];

      await deliver({
        actorId: OPERATOR_ID,
        attemptId: CHECK_IN_ATTEMPT_ID,
        clock: () => ticks.shift() ?? LATER,
        gateway: {
          grantRole: (_discordUserId: string, _roleId: string) =>
            Promise.resolve(),
        } as RoleDiscordGateway,
        hackathonId: HACKATHON_ID,
      });

      const attempts = await client
        .select({
          startedAt: knightHacks.HackerDiscordRoleGrantAttempt.startedAt,
        })
        .from(knightHacks.HackerDiscordRoleGrantAttempt)
        .orderBy(asc(knightHacks.HackerDiscordRoleGrantAttempt.startedAt));
      expect(attempts.map(({ startedAt }) => startedAt)).toEqual([NOW, LATER]);
    });
  },
);

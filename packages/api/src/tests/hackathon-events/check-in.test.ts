import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { asc, eq, inArray } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { AuditActor } from "../../utils/audit/service";
import type { performHackathonEventCheckIn } from "../../utils/hackathon-events/check-in";
import type { correctHackathonEventAttendance } from "../../utils/hackathon-events/correction";

type AuthSchemas = typeof AuthSchemaModule;
type CheckInService = typeof performHackathonEventCheckIn;
type CorrectionService = typeof correctHackathonEventAttendance;
type DatabaseClient = typeof db;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;

const OPERATOR_ID = "10000000-0000-4000-8000-000000000101";
const HACKATHON_ID = "20000000-0000-4000-8000-000000000101";
const PRIMARY_EVENT_ID = "30000000-0000-4000-8000-000000000101";
const ORDINARY_EVENT_ID = "30000000-0000-4000-8000-000000000102";
const DATABASE_ONLY_EVENT_ID = "30000000-0000-4000-8000-000000000103";
const CLASS_A_ID = "40000000-0000-4000-8000-000000000101";
const CLASS_B_ID = "40000000-0000-4000-8000-000000000102";
const CLASS_C_ID = "40000000-0000-4000-8000-000000000103";
const VIP_CLASS_ID = "40000000-0000-4000-8000-0000000001ff";
const GENERAL_ROLE_ID = "990000000000000001";

const NOW = new Date("2026-08-05T16:00:00.000Z");
const LATER = new Date("2026-08-05T16:05:00.000Z");

const people = {
  allocation: 6,
  base: 1,
  pending: 2,
  preloadA1: 7,
  preloadA2: 8,
  preloadB: 9,
  regular: 3,
  vip: 4,
} as const;

function personIds(index: number) {
  const suffix = index.toString(16).padStart(3, "0");
  return {
    attendeeId: `50000000-0000-4000-8000-000000000${suffix}`,
    hackerId: `60000000-0000-4000-8000-000000000${suffix}`,
    userId: `70000000-0000-4000-8000-000000000${suffix}`,
  };
}

const actor: AuditActor = {
  discordUserId: "990000000000000111",
  id: OPERATOR_ID,
  name: "Deterministic Operator",
  snapshot: { memberId: null, roleColor: null, roleLabel: null },
};

describe.skipIf(!canRunDatabaseTests())("hackathon event check-in core", () => {
  let auth: AuthSchemas;
  let checkIn: CheckInService;
  let client: DatabaseClient;
  let correctAttendance: CorrectionService;
  let disposable: DisposableDatabase | undefined;
  let knightHacks: KnightHacksSchemas;

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_hack_check_in");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");
    ({ performHackathonEventCheckIn: checkIn } =
      await import("../../utils/hackathon-events/check-in"));
    ({ correctHackathonEventAttendance: correctAttendance } =
      await import("../../utils/hackathon-events/correction"));

    await client.insert(auth.User).values([
      {
        discordUserId: "990000000000000111",
        id: OPERATOR_ID,
        name: "Deterministic Operator",
      },
      ...Object.values(people).map((index) => ({
        discordUserId: `99000000000000${index.toString().padStart(4, "0")}`,
        id: personIds(index).userId,
        name: `Hacker ${index}`,
      })),
    ]);
    await client.insert(knightHacks.Hackathon).values({
      applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
      applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
      confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
      displayName: "Check-in Hackathon",
      endDate: new Date("2026-08-10T00:00:00.000Z"),
      generalHackerDiscordRoleId: GENERAL_ROLE_ID,
      id: HACKATHON_ID,
      name: "check-in-hackathon",
      startDate: new Date("2026-08-05T00:00:00.000Z"),
      theme: "Check-in",
    });
    await client.insert(knightHacks.HackathonClass).values([
      {
        color: "#110000",
        discordRoleId: "990000000000000011",
        hackathonId: HACKATHON_ID,
        id: CLASS_A_ID,
        kind: "class",
        name: "Alpha",
      },
      {
        color: "#002200",
        discordRoleId: "990000000000000022",
        hackathonId: HACKATHON_ID,
        id: CLASS_B_ID,
        kind: "class",
        name: "Beta",
      },
      {
        color: "#000033",
        discordRoleId: "990000000000000033",
        hackathonId: HACKATHON_ID,
        id: CLASS_C_ID,
        kind: "class",
        name: "Gamma",
      },
      {
        color: "#440044",
        discordRoleId: "990000000000000044",
        hackathonId: HACKATHON_ID,
        id: VIP_CLASS_ID,
        kind: "vip",
        name: "VIP",
      },
    ]);
    const event = {
      description: "Check-in contract fixture",
      end_datetime: new Date("2026-08-05T18:00:00.000Z"),
      hackathonId: HACKATHON_ID,
      legacy: true,
      location: "Venue",
      start_datetime: new Date("2026-08-05T17:00:00.000Z"),
      tag: "Hackathon",
    };
    await client.insert(knightHacks.Event).values([
      {
        ...event,
        id: PRIMARY_EVENT_ID,
        name: "Overall Check-in",
        points: 7,
        purpose: "primary_check_in",
      },
      {
        ...event,
        id: ORDINARY_EVENT_ID,
        name: "Dinner",
        points: 11,
      },
      {
        ...event,
        creationKey: "30000000-0000-4000-8000-000000000201",
        creationPayloadHash: "a".repeat(64),
        id: DATABASE_ONLY_EVENT_ID,
        legacy: false,
        name: "Database-only workshop",
        points: 13,
        publishedAt: null,
      },
    ]);
    await client.insert(knightHacks.Hacker).values(
      Object.values(people).map((index) => ({
        age: index === people.base ? 16 : 20,
        discordUser: `hacker-${index}`,
        dob: index === people.base ? "2009-08-06" : "2000-01-01",
        email: `check-in-${index}@example.test`,
        firstName: `Hacker${index}`,
        gradDate: "2030-05-01",
        id: personIds(index).hackerId,
        isFirstTime: index === people.base,
        lastName: "Fixture",
        levelOfStudy: "Undergraduate University (3+ year)" as const,
        phoneNumber: `407000${index.toString().padStart(4, "0")}`,
        school: "University of Central Florida" as const,
        shirtSize: "M" as const,
        survey1: "",
        survey2: "",
        userId: personIds(index).userId,
      })),
    );
    await client.insert(knightHacks.HackerAttendee).values(
      Object.values(people).map((index) => ({
        hackathonId: HACKATHON_ID,
        hackerId: personIds(index).hackerId,
        id: personIds(index).attendeeId,
        status: "confirmed" as const,
      })),
    );
  }, 120_000);

  beforeEach(async () => {
    await client.delete(knightHacks.HackerDiscordRoleGrant);
    await client.delete(knightHacks.HackerCheckInAttempt);
    await client.delete(knightHacks.HackerEventAttendee);
    await client.update(knightHacks.HackerAttendee).set({
      checkedInAt: null,
      checkedInBy: null,
      classId: null,
      isFirstTime: null,
      isVip: false,
      points: 0,
      status: "confirmed",
    });
    await client.update(knightHacks.Hacker).set({ isFirstTime: false });
    await client
      .update(knightHacks.Hacker)
      .set({ isFirstTime: true })
      .where(eq(knightHacks.Hacker.id, personIds(people.base).hackerId));
  });

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  });

  const manualInput = (
    eventId: string,
    person: number,
    calledClassId: string | null = null,
  ) => ({
    attendeeId: personIds(person).attendeeId,
    calledClassId,
    eventId,
    hackathonId: HACKATHON_ID,
    source: "manual" as const,
  });

  const scannerInput = (
    eventId: string,
    person: number,
    allowRepeat: boolean,
    calledClassId: string | null = null,
  ) => ({
    allowRepeat,
    calledClassId,
    eventId,
    hackathonId: HACKATHON_ID,
    qrPayload: `user:${personIds(person).userId}`,
    source: "scanner" as const,
  });

  it("admits a confirmed first-time VIP with immutable operational snapshots", async () => {
    const ids = personIds(people.base);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ isVip: true })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const outcome = await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.base),
      now: NOW,
    });

    expect(outcome.result).toMatchObject({
      checkedInAt: NOW,
      class: { color: "#110000", id: CLASS_A_ID, name: "Alpha" },
      firstTimeStatus: "first",
      isVip: true,
      name: "Hacker1 Fixture",
      pointsAwarded: 7,
      status: "checked_in",
    });
    if (outcome.result.status !== "checked_in") {
      throw new Error("Expected successful primary check-in.");
    }
    expect(outcome.result.dateOfBirth).toBe("2009-08-06");
    expect(outcome.result.wasMinorAtAttempt).toBe(true);
    const [attendee] = await client
      .select()
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee).toMatchObject({
      checkedInAt: NOW,
      checkedInBy: OPERATOR_ID,
      classId: CLASS_A_ID,
      isFirstTime: true,
      points: 7,
      status: "checkedin",
    });
    const [profile] = await client
      .select({ isFirstTime: knightHacks.Hacker.isFirstTime })
      .from(knightHacks.Hacker)
      .where(eq(knightHacks.Hacker.id, ids.hackerId));
    expect(profile?.isFirstTime).toBe(false);
    const [attendance] = await client
      .select()
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.eventId, PRIMARY_EVENT_ID));
    expect(attendance).toMatchObject({
      checkedInAt: NOW,
      checkedInBy: OPERATOR_ID,
      isInitialAttendance: true,
      pointsAwarded: 7,
    });
    const [attempt] = await client
      .select()
      .from(knightHacks.HackerCheckInAttempt)
      .where(eq(knightHacks.HackerCheckInAttempt.id, outcome.attemptId));
    expect(attempt).toMatchObject({
      attendanceId: attendance?.id,
      attemptedAt: NOW,
      classId: CLASS_A_ID,
      classNameSnapshot: "Alpha",
      eventNameSnapshot: "Overall Check-in",
      eventPurpose: "primary_check_in",
      expiresAt: null,
      hackerNameSnapshot: "Hacker1 Fixture",
      isVipSnapshot: true,
      operatorDisplayNameSnapshot: "Deterministic Operator",
      operatorId: OPERATOR_ID,
      outcome: "checked_in",
      pointsAwarded: 7,
      wasMinorAtAttempt: true,
    });
    const grants = await client
      .select({ kind: knightHacks.HackerDiscordRoleGrant.kind })
      .from(knightHacks.HackerDiscordRoleGrant)
      .where(
        eq(knightHacks.HackerDiscordRoleGrant.hackerAttendeeId, ids.attendeeId),
      );
    expect(grants.map(({ kind }) => kind).sort()).toEqual([
      "class",
      "general",
      "vip",
    ]);
  });

  it("rejects a non-confirmed applicant and retains an expiring attempt", async () => {
    const ids = personIds(people.pending);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ status: "pending" })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const outcome = await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.pending),
      now: NOW,
    });

    expect(outcome.result).toMatchObject({
      currentStatus: "pending",
      status: "wrong_status",
    });
    const [attendee] = await client
      .select()
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee).toMatchObject({
      checkedInAt: null,
      classId: null,
      points: 0,
      status: "pending",
    });
    const [attempt] = await client
      .select()
      .from(knightHacks.HackerCheckInAttempt)
      .where(eq(knightHacks.HackerCheckInAttempt.id, outcome.attemptId));
    expect(attempt).toMatchObject({
      attendanceId: null,
      attemptedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1_000),
      outcome: "wrong_status",
      pointsAwarded: 0,
    });
  });

  it("does not mutate admission metadata or points on a primary rescan", async () => {
    const ids = personIds(people.base);
    await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.base),
      now: NOW,
    });
    const rescan = await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.base),
      now: LATER,
    });

    expect(rescan.result).toMatchObject({
      checkedInAt: NOW,
      firstTimeStatus: "first",
      pointsAwarded: 0,
      status: "already_checked_in",
    });
    const [attendee] = await client
      .select()
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee).toMatchObject({
      checkedInAt: NOW,
      classId: CLASS_A_ID,
      isFirstTime: true,
      points: 7,
    });
    const occurrences = await client
      .select()
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId));
    expect(occurrences).toHaveLength(1);
    const attempts = await client
      .select({ outcome: knightHacks.HackerCheckInAttempt.outcome })
      .from(knightHacks.HackerCheckInAttempt)
      .where(
        eq(knightHacks.HackerCheckInAttempt.hackerAttendeeId, ids.attendeeId),
      );
    expect(attempts.map(({ outcome }) => outcome).sort()).toEqual([
      "already_checked_in",
      "checked_in",
    ]);
  });

  it("requires whole-hack admission before ordinary event attendance", async () => {
    const ids = personIds(people.regular);
    const outcome = await checkIn({
      actor,
      input: manualInput(ORDINARY_EVENT_ID, people.regular),
      now: NOW,
    });

    expect(outcome.result).toMatchObject({ status: "not_checked_in" });
    const [attendee] = await client
      .select({ points: knightHacks.HackerAttendee.points })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee?.points).toBe(0);
    expect(
      await client
        .select()
        .from(knightHacks.HackerEventAttendee)
        .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId)),
    ).toHaveLength(0);
  });

  it("[TC-PUB-010] checks into a database-only event without calendar publication", async () => {
    const ids = personIds(people.regular);
    await client
      .update(knightHacks.HackerAttendee)
      .set({
        checkedInAt: NOW,
        checkedInBy: OPERATOR_ID,
        classId: CLASS_A_ID,
        status: "checkedin",
      })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const outcome = await checkIn({
      actor,
      input: manualInput(DATABASE_ONLY_EVENT_ID, people.regular),
      now: LATER,
    });

    expect(outcome.result).toMatchObject({
      pointsAwarded: 13,
      status: "checked_in",
    });
  });

  it("enforces a called class while allowing VIP bypass", async () => {
    const regular = personIds(people.regular);
    const vip = personIds(people.vip);
    await client
      .update(knightHacks.HackerAttendee)
      .set({
        checkedInAt: NOW,
        checkedInBy: OPERATOR_ID,
        classId: CLASS_A_ID,
        status: "checkedin",
      })
      .where(
        inArray(knightHacks.HackerAttendee.id, [
          regular.attendeeId,
          vip.attendeeId,
        ]),
      );
    await client
      .update(knightHacks.HackerAttendee)
      .set({ isVip: true })
      .where(eq(knightHacks.HackerAttendee.id, vip.attendeeId));

    const rejected = await checkIn({
      actor,
      input: manualInput(ORDINARY_EVENT_ID, people.regular, CLASS_B_ID),
      now: NOW,
    });
    const admittedVip = await checkIn({
      actor,
      input: manualInput(ORDINARY_EVENT_ID, people.vip, CLASS_B_ID),
      now: NOW,
    });

    expect(rejected.result).toMatchObject({
      class: { id: CLASS_A_ID },
      isVip: false,
      status: "wrong_class",
    });
    expect(admittedVip.result).toMatchObject({
      class: { id: CLASS_A_ID },
      isVip: true,
      pointsAwarded: 11,
      status: "checked_in",
    });
  });

  it("supports scanner repeat off/on without awarding points twice", async () => {
    const ids = personIds(people.regular);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ checkedInAt: NOW, classId: CLASS_A_ID, status: "checkedin" })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const first = await checkIn({
      actor,
      input: scannerInput(ORDINARY_EVENT_ID, people.regular, false),
      now: NOW,
    });
    const blockedRepeat = await checkIn({
      actor,
      input: scannerInput(ORDINARY_EVENT_ID, people.regular, false),
      now: LATER,
    });
    const allowedRepeat = await checkIn({
      actor,
      input: scannerInput(ORDINARY_EVENT_ID, people.regular, true),
      now: new Date(LATER.getTime() + 1_000),
    });

    expect(first.result).toMatchObject({
      isRepeatOccurrence: false,
      pointsAwarded: 11,
      status: "checked_in",
    });
    expect(blockedRepeat.result).toMatchObject({
      pointsAwarded: 0,
      status: "already_checked_in",
    });
    expect(allowedRepeat.result).toMatchObject({
      isRepeatOccurrence: true,
      pointsAwarded: 0,
      status: "checked_in",
    });
    const [attendee] = await client
      .select({ points: knightHacks.HackerAttendee.points })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee?.points).toBe(11);
    const occurrences = await client
      .select({
        initial: knightHacks.HackerEventAttendee.isInitialAttendance,
        points: knightHacks.HackerEventAttendee.pointsAwarded,
      })
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId))
      .orderBy(asc(knightHacks.HackerEventAttendee.checkedInAt));
    expect(occurrences).toEqual([
      { initial: true, points: 11 },
      { initial: false, points: 0 },
    ]);
  });

  it("does not award ordinary-event points again after the initial attendance is corrected", async () => {
    const ids = personIds(people.regular);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ checkedInAt: NOW, classId: CLASS_A_ID, status: "checkedin" })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const first = await checkIn({
      actor,
      input: manualInput(ORDINARY_EVENT_ID, people.regular),
      now: NOW,
    });
    if (first.result.status !== "checked_in") {
      throw new Error("Expected successful initial ordinary-event check-in.");
    }
    const [initialAttendance] = await client
      .select({ id: knightHacks.HackerEventAttendee.id })
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId));
    if (!initialAttendance) {
      throw new Error("Expected the initial attendance occurrence.");
    }

    await correctAttendance(
      {
        attendanceId: initialAttendance.id,
        hackathonId: HACKATHON_ID,
        operator: actor,
        reason: "Scanned the wrong hacker",
      },
      LATER,
    );
    const rescan = await checkIn({
      actor,
      input: manualInput(ORDINARY_EVENT_ID, people.regular),
      now: new Date(LATER.getTime() + 1_000),
    });

    expect(rescan.result).toMatchObject({
      isRepeatOccurrence: true,
      pointsAwarded: 0,
      status: "checked_in",
    });
    const [attendee] = await client
      .select({ points: knightHacks.HackerAttendee.points })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee?.points).toBe(0);
    const occurrences = await client
      .select({
        initial: knightHacks.HackerEventAttendee.isInitialAttendance,
        points: knightHacks.HackerEventAttendee.pointsAwarded,
        voidedAt: knightHacks.HackerEventAttendee.voidedAt,
      })
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId))
      .orderBy(asc(knightHacks.HackerEventAttendee.checkedInAt));
    expect(occurrences).toEqual([
      { initial: true, points: 11, voidedAt: LATER },
      { initial: false, points: 0, voidedAt: null },
    ]);
  });

  it("treats a legacy null occurrence as prior attendance and awards no repeat points", async () => {
    const ids = personIds(people.regular);
    await client
      .update(knightHacks.HackerAttendee)
      .set({
        checkedInAt: NOW,
        classId: CLASS_A_ID,
        points: 11,
        status: "checkedin",
      })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    await client.insert(knightHacks.HackerEventAttendee).values({
      checkedInAt: NOW,
      checkedInBy: OPERATOR_ID,
      eventId: ORDINARY_EVENT_ID,
      hackerAttId: ids.attendeeId,
      hackathonId: HACKATHON_ID,
      isInitialAttendance: null,
      pointsAwarded: null,
    });

    const repeat = await checkIn({
      actor,
      input: scannerInput(ORDINARY_EVENT_ID, people.regular, true),
      now: LATER,
    });

    expect(repeat.result).toMatchObject({
      isRepeatOccurrence: true,
      pointsAwarded: 0,
      status: "checked_in",
    });
    const [attendee] = await client
      .select({ points: knightHacks.HackerAttendee.points })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee?.points).toBe(11);
  });

  it("serializes concurrent first scans and awards ordinary points once", async () => {
    const ids = personIds(people.regular);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ checkedInAt: NOW, classId: CLASS_A_ID, status: "checkedin" })
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));

    const outcomes = await Promise.all([
      checkIn({
        actor,
        input: scannerInput(ORDINARY_EVENT_ID, people.regular, false),
        now: NOW,
      }),
      checkIn({
        actor,
        input: scannerInput(ORDINARY_EVENT_ID, people.regular, false),
        now: NOW,
      }),
    ]);

    expect(outcomes.map(({ result }) => result.status).sort()).toEqual([
      "already_checked_in",
      "checked_in",
    ]);
    const [attendee] = await client
      .select({ points: knightHacks.HackerAttendee.points })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, ids.attendeeId));
    expect(attendee?.points).toBe(11);
    const occurrences = await client
      .select()
      .from(knightHacks.HackerEventAttendee)
      .where(eq(knightHacks.HackerEventAttendee.hackerAttId, ids.attendeeId));
    expect(occurrences).toHaveLength(1);
  });

  it("allocates across arbitrary N classes to the least-populated class", async () => {
    const allocation = personIds(people.allocation);
    await client
      .update(knightHacks.HackerAttendee)
      .set({ classId: CLASS_A_ID, status: "checkedin" })
      .where(
        inArray(knightHacks.HackerAttendee.id, [
          personIds(people.preloadA1).attendeeId,
          personIds(people.preloadA2).attendeeId,
        ]),
      );
    await client
      .update(knightHacks.HackerAttendee)
      .set({ classId: CLASS_B_ID, status: "checkedin" })
      .where(
        eq(
          knightHacks.HackerAttendee.id,
          personIds(people.preloadB).attendeeId,
        ),
      );

    const outcome = await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.allocation),
      now: NOW,
    });

    expect(outcome.result).toMatchObject({
      class: { id: CLASS_C_ID, name: "Gamma" },
      status: "checked_in",
    });
    const [attendee] = await client
      .select({ classId: knightHacks.HackerAttendee.classId })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, allocation.attendeeId));
    expect(attendee?.classId).toBe(CLASS_C_ID);
  });

  it("preserves an explicit per-hack first-time snapshot across profiles", async () => {
    const current = personIds(people.allocation);
    const priorHackathonId = "20000000-0000-4000-8000-0000000001f1";
    const priorHackerId = "60000000-0000-4000-8000-0000000001f1";
    const priorAttendeeId = "50000000-0000-4000-8000-0000000001f1";
    await client
      .update(knightHacks.Hacker)
      .set({ isFirstTime: true })
      .where(eq(knightHacks.Hacker.id, current.hackerId));
    await client
      .update(knightHacks.HackerAttendee)
      .set({ isFirstTime: true })
      .where(eq(knightHacks.HackerAttendee.id, current.attendeeId));
    await client.insert(knightHacks.Hackathon).values({
      applicationDeadline: new Date("2025-07-01T00:00:00.000Z"),
      applicationOpen: new Date("2025-06-01T00:00:00.000Z"),
      confirmationDeadline: new Date("2025-07-15T00:00:00.000Z"),
      displayName: "Prior Check-in Hackathon",
      endDate: new Date("2025-08-10T00:00:00.000Z"),
      id: priorHackathonId,
      name: "prior-check-in-hackathon",
      startDate: new Date("2025-08-05T00:00:00.000Z"),
      theme: "Prior Check-in",
    });
    await client.insert(knightHacks.Hacker).values({
      age: 19,
      discordUser: "returning-hacker-profile",
      dob: "2006-01-01",
      email: "returning-hacker-profile@example.test",
      firstName: "Prior",
      gradDate: "2029-05-01",
      id: priorHackerId,
      isFirstTime: false,
      lastName: "Profile",
      levelOfStudy: "Undergraduate University (3+ year)",
      phoneNumber: "4079990001",
      school: "University of Central Florida",
      shirtSize: "M",
      survey1: "",
      survey2: "",
      userId: current.userId,
    });
    await client.insert(knightHacks.HackerAttendee).values({
      checkedInAt: new Date("2025-08-05T16:00:00.000Z"),
      hackathonId: priorHackathonId,
      hackerId: priorHackerId,
      id: priorAttendeeId,
      isFirstTime: true,
      status: "checkedin",
    });

    const outcome = await checkIn({
      actor,
      input: manualInput(PRIMARY_EVENT_ID, people.allocation),
      now: NOW,
    });

    expect(outcome.result).toMatchObject({
      firstTimeStatus: "first",
      status: "checked_in",
    });
    const [attendee] = await client
      .select({ isFirstTime: knightHacks.HackerAttendee.isFirstTime })
      .from(knightHacks.HackerAttendee)
      .where(eq(knightHacks.HackerAttendee.id, current.attendeeId));
    expect(attendee?.isFirstTime).toBe(true);
    const [profile] = await client
      .select({ isFirstTime: knightHacks.Hacker.isFirstTime })
      .from(knightHacks.Hacker)
      .where(eq(knightHacks.Hacker.id, current.hackerId));
    expect(profile?.isFirstTime).toBe(false);
  });
});

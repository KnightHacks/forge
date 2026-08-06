import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Session } from "@forge/auth/server";
import type { db } from "@forge/db/client";
import type * as AuditSchemaModule from "@forge/db/schemas/audit";
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { count, eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type * as AuditServiceModule from "../../utils/audit/service";
import { permissionBitstring } from "../support/permissions";

const auditControl = vi.hoisted(() => ({ fail: false }));

vi.mock("../../utils/audit/service", async (importOriginal) => {
  const actual = await importOriginal<typeof AuditServiceModule>();
  return {
    ...actual,
    createAdminAuditEvent: (
      ...args: Parameters<typeof actual.createAdminAuditEvent>
    ) =>
      auditControl.fail
        ? Promise.reject(new Error("audit unavailable"))
        : actual.createAdminAuditEvent(...args),
  };
});

type AuthSchemas = typeof AuthSchemaModule;
type AuditSchemas = typeof AuditSchemaModule;
type DatabaseClient = typeof db;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;

const ACTOR_ID = "10000000-0000-4000-8000-000000000711";
const ROLE_ID = "20000000-0000-4000-8000-000000000711";
const HACKATHON_ID = "30000000-0000-4000-8000-000000000711";
const TAG_ID = "40000000-0000-4000-8000-000000000711";
const EVENT_ID = "50000000-0000-4000-8000-000000000711";
const CREATION_KEY = "60000000-0000-4000-8000-000000000711";
const HACKER_ID = "70000000-0000-4000-8000-000000000711";
const ATTENDEE_ID = "80000000-0000-4000-8000-000000000711";
const ATTENDANCE_ID = "90000000-0000-4000-8000-000000000711";
const ATTEMPT_ID = "a0000000-0000-4000-8000-000000000711";

describe.skipIf(!canRunDatabaseTests())(
  "hackathon event write audit atomicity",
  () => {
    let auth: AuthSchemas;
    let audit: AuditSchemas;
    let caller: Awaited<ReturnType<typeof officerCaller>>;
    let client: DatabaseClient;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;

    async function officerCaller() {
      const trpc = await import("../../trpc");
      const { hackathonEventRouter } =
        await import("../../routers/hackathon-event");
      return trpc.createCallerFactory(
        trpc.createTRPCRouter({ hackathonEvent: hackathonEventRouter }),
      )({
        headers: new Headers(),
        session: {
          session: { id: "event-audit", userAgent: "vitest" },
          user: { id: ACTOR_ID, name: "Event Audit Operator" },
        } as unknown as Session,
        source: "hackathon-event-audit-integration",
      });
    }

    function eventValues(
      overrides: Partial<typeof knightHacks.Event.$inferInsert> = {},
    ): typeof knightHacks.Event.$inferInsert {
      return {
        creationKey: CREATION_KEY,
        creationPayloadHash: "a".repeat(64),
        description: "Original description",
        discordSyncState: "disabled",
        end_datetime: new Date("2026-08-08T18:00:00.000Z"),
        googleSyncState: "disabled",
        hackathonId: HACKATHON_ID,
        id: EVENT_ID,
        legacy: false,
        location: "Original room",
        name: "Original event",
        points: 10,
        start_datetime: new Date("2026-08-08T17:00:00.000Z"),
        tag: "Workshop",
        tagColor: "#123456",
        ...overrides,
      };
    }

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase(
        "forge_event_audit_atomic",
      );
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      auth = await import("@forge/db/schemas/auth");
      audit = await import("@forge/db/schemas/audit");
      knightHacks = await import("@forge/db/schemas/knight-hacks");

      await client.insert(auth.User).values({
        discordUserId: "990000000000000711",
        id: ACTOR_ID,
        name: "Event Audit Operator",
      });
      await client.insert(auth.Roles).values({
        discordRoleId: "980000000000000711",
        id: ROLE_ID,
        name: "Event Editors",
        permissions: permissionBitstring("EDIT_HACK_EVENT"),
      });
      await client
        .insert(auth.Permissions)
        .values({ roleId: ROLE_ID, userId: ACTOR_ID });
      await client.insert(knightHacks.Hackathon).values({
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        displayName: "Audit Atomicity Hackathon",
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        id: HACKATHON_ID,
        name: "audit-atomicity-hackathon",
        startDate: new Date("2026-08-08T00:00:00.000Z"),
        theme: "Audit",
      });
      await client.insert(knightHacks.EventTag).values({
        color: "#123456",
        defaultPoints: 10,
        hackathonId: HACKATHON_ID,
        id: TAG_ID,
        name: "Workshop",
        normalizedName: "workshop",
      });
      await client.insert(knightHacks.Hacker).values({
        age: 21,
        discordUser: "event-audit-hacker",
        dob: "2005-01-01",
        email: "event-audit-hacker@example.test",
        firstName: "Event",
        gradDate: "2028-05-01",
        id: HACKER_ID,
        lastName: "Audit",
        levelOfStudy: "Undergraduate University (3+ year)",
        phoneNumber: "4070000711",
        school: "University of Central Florida",
        shirtSize: "M",
        survey1: "",
        survey2: "",
        userId: ACTOR_ID,
      });
      caller = await officerCaller();
    }, 120_000);

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    beforeEach(async () => {
      auditControl.fail = false;
      await client.delete(knightHacks.HackerCheckInAttempt);
      await client.delete(knightHacks.HackerEventAttendee);
      await client.delete(knightHacks.HackerAttendee);
      await client.delete(knightHacks.EventPublicationWork);
      await client.delete(knightHacks.HackathonEventPublication);
      await client.delete(knightHacks.Event);
    });

    it("rolls creation back when its required audit fails", async () => {
      auditControl.fail = true;

      await expect(
        caller.hackathonEvent.createEvent({
          creationKey: CREATION_KEY,
          description: "New description",
          end: "2026-08-08T14:00:00-04:00",
          hackathonId: HACKATHON_ID,
          internalTarget: { internal: false },
          location: "New room",
          name: "New event",
          pointsOverride: 10,
          purpose: "event",
          start: "2026-08-08T13:00:00-04:00",
          tagId: TAG_ID,
        }),
      ).rejects.toThrow("audit unavailable");

      const event = await client.query.Event.findFirst({
        where: eq(knightHacks.Event.creationKey, CREATION_KEY),
      });
      expect(event).toBeUndefined();
    });

    it("does not duplicate the creation audit on an exact idempotent retry", async () => {
      const input = {
        creationKey: CREATION_KEY,
        description: "New description",
        end: "2026-08-08T14:00:00-04:00",
        hackathonId: HACKATHON_ID,
        internalTarget: { internal: false as const },
        location: "New room",
        name: "New event",
        pointsOverride: 10,
        purpose: "event" as const,
        start: "2026-08-08T13:00:00-04:00",
        tagId: TAG_ID,
      };
      const auditCount = async () => {
        const [row] = await client
          .select({ value: count() })
          .from(audit.AdminAuditEvent)
          .where(
            eq(audit.AdminAuditEvent.actionKey, "hackathon_event.created"),
          );
        return row?.value ?? 0;
      };
      const before = await auditCount();

      await caller.hackathonEvent.createEvent(input);
      await caller.hackathonEvent.createEvent(input);

      expect(await auditCount()).toBe(before + 1);
    });

    it("converges concurrent exact creation-key requests to one event and audit", async () => {
      const input = {
        creationKey: CREATION_KEY,
        description: "Concurrent description",
        end: "2026-08-08T14:00:00-04:00",
        hackathonId: HACKATHON_ID,
        internalTarget: { internal: false as const },
        location: "Concurrent room",
        name: "Concurrent event",
        pointsOverride: 10,
        purpose: "event" as const,
        start: "2026-08-08T13:00:00-04:00",
        tagId: TAG_ID,
      };
      const [beforeAudit] = await client
        .select({ value: count() })
        .from(audit.AdminAuditEvent)
        .where(eq(audit.AdminAuditEvent.actionKey, "hackathon_event.created"));

      const results = await Promise.all([
        caller.hackathonEvent.createEvent(input),
        caller.hackathonEvent.createEvent(input),
      ]);

      expect(results[0]).toEqual(results[1]);
      const events = await client
        .select({ id: knightHacks.Event.id })
        .from(knightHacks.Event)
        .where(eq(knightHacks.Event.creationKey, CREATION_KEY));
      expect(events).toHaveLength(1);
      const [afterAudit] = await client
        .select({ value: count() })
        .from(audit.AdminAuditEvent)
        .where(eq(audit.AdminAuditEvent.actionKey, "hackathon_event.created"));
      expect(afterAudit?.value ?? 0).toBe((beforeAudit?.value ?? 0) + 1);
    });

    it("rolls an update and its publication work back when audit fails", async () => {
      await client.insert(knightHacks.Event).values(eventValues());
      auditControl.fail = true;

      await expect(
        caller.hackathonEvent.updateEvent({
          description: "Changed description",
          end: "2026-08-08T15:00:00-04:00",
          eventId: EVENT_ID,
          expectedRevision: 1,
          hackathonId: HACKATHON_ID,
          internalTarget: { internal: false },
          location: "Changed room",
          name: "Changed event",
          pointsOverride: 20,
          purpose: "event",
          start: "2026-08-08T14:00:00-04:00",
          tagId: TAG_ID,
        }),
      ).rejects.toThrow("audit unavailable");

      const event = await client.query.Event.findFirst({
        where: eq(knightHacks.Event.id, EVENT_ID),
      });
      expect(event).toMatchObject({
        description: "Original description",
        name: "Original event",
        syncRevision: 1,
      });
      const work = await client
        .select()
        .from(knightHacks.EventPublicationWork)
        .where(eq(knightHacks.EventPublicationWork.eventId, EVENT_ID));
      expect(work).toHaveLength(0);
    });

    it("rolls immediate deletion back when its required audit fails", async () => {
      await client.insert(knightHacks.Event).values(eventValues());
      auditControl.fail = true;

      await expect(
        caller.hackathonEvent.deleteEvent({
          eventId: EVENT_ID,
          hackathonId: HACKATHON_ID,
        }),
      ).rejects.toThrow("audit unavailable");

      const event = await client.query.Event.findFirst({
        where: eq(knightHacks.Event.id, EVENT_ID),
      });
      expect(event).toMatchObject({ deletionIntentAt: null, id: EVENT_ID });
    });

    it("refuses immediate deletion when attendance and check-in history exist", async () => {
      const attemptedAt = new Date("2026-08-08T17:05:00.000Z");
      await client.insert(knightHacks.Event).values(eventValues());
      await client.insert(knightHacks.HackerAttendee).values({
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ID,
        id: ATTENDEE_ID,
        status: "checkedin",
      });
      await client.insert(knightHacks.HackerEventAttendee).values({
        checkedInAt: attemptedAt,
        checkedInBy: ACTOR_ID,
        eventId: EVENT_ID,
        hackerAttId: ATTENDEE_ID,
        hackathonId: HACKATHON_ID,
        id: ATTENDANCE_ID,
        isInitialAttendance: true,
        pointsAwarded: 10,
      });
      await client.insert(knightHacks.HackerCheckInAttempt).values({
        attendanceId: ATTENDANCE_ID,
        attemptedAt,
        eventId: EVENT_ID,
        eventNameSnapshot: "Original event",
        eventPurpose: "event",
        hackerAttendeeId: ATTENDEE_ID,
        hackerNameSnapshot: "Event Audit",
        hackathonId: HACKATHON_ID,
        id: ATTEMPT_ID,
        mode: "manual",
        operatorId: ACTOR_ID,
        outcome: "checked_in",
        pointsAwarded: 10,
      });

      await expect(
        caller.hackathonEvent.deleteEvent({
          eventId: EVENT_ID,
          hackathonId: HACKATHON_ID,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const [event, attendance, attempt] = await Promise.all([
        client.query.Event.findFirst({
          where: eq(knightHacks.Event.id, EVENT_ID),
        }),
        client.query.HackerEventAttendee.findFirst({
          where: eq(knightHacks.HackerEventAttendee.id, ATTENDANCE_ID),
        }),
        client.query.HackerCheckInAttempt.findFirst({
          where: eq(knightHacks.HackerCheckInAttempt.id, ATTEMPT_ID),
        }),
      ]);
      expect(event).toMatchObject({ deletionIntentAt: null, id: EVENT_ID });
      expect(attendance?.id).toBe(ATTENDANCE_ID);
      expect(attempt?.id).toBe(ATTEMPT_ID);
    });
  },
);

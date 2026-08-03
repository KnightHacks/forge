import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof import("@forge/db/client").db;
type AuthSchemas = typeof import("@forge/db/schemas/auth");
type KnightHacksSchemas = typeof import("@forge/db/schemas/knight-hacks");

const OFFICER_USER = "10000000-0000-4000-8000-0000000000e1";
const OFFICER_ROLE = "30000000-0000-4000-8000-0000000000e1";
/** Fully configured: every sending status has mail. */
const READY_HACKATHON = "50000000-0000-4000-8000-0000000000e1";
/** Deliberately missing one status email. */
const UNREADY_HACKATHON = "50000000-0000-4000-8000-0000000000e2";
const TEMPLATE_ID = "80000000-0000-4000-8000-0000000000e1";
const REVISION_ID = "81000000-0000-4000-8000-0000000000e1";

const PLAIN_ATTENDEE = "60000000-0000-4000-8000-0000000000e1";
const BLACKLISTED_ATTENDEE = "60000000-0000-4000-8000-0000000000e2";
const UNREADY_ATTENDEE = "60000000-0000-4000-8000-0000000000e3";

/**
 * The guards that stand between an officer and an applicant's inbox, exercised
 * against real SQL.
 *
 * Mocking the drizzle chain would assert the mock. These predicates decide
 * whether two hundred people get an email, and the transaction boundary between
 * a status change and its enqueue is only real in a database.
 *
 * Every guard has a positive control. A guard that refuses unconditionally
 * passes every negative case, and asserting it also *allows* the legal one is
 * the only way to tell the difference.
 */
describe.skipIf(!canRunDatabaseTests())("hacker management guards", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let auth: AuthSchemas;
  let knightHacks: KnightHacksSchemas;
  let caller: Awaited<ReturnType<typeof officerCaller>>;

  async function officerCaller() {
    const trpc = await import("../../trpc");
    const { hackerRouter } = await import("../../routers/hacker");

    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ hacker: hackerRouter }),
    )({
      headers: new Headers(),
      session: {
        session: { id: "hacker-guards", userAgent: "vitest" },
        user: { id: OFFICER_USER, name: "Officer" },
      } as unknown as Session,
      source: "hacker-guards-integration",
    });
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");

    // Same assertion as the hackathon guards test, and load-bearing for the
    // same reason: without it a silently-unapplied DATABASE_URL means these
    // tests mutate the shared dev database.
    const { env } = await import("@forge/db/env");
    expect(env.DATABASE_URL).toBe(disposable.url);

    await client
      .insert(auth.User)
      .values({ discordUserId: "discord-officer", id: OFFICER_USER });
    await client.insert(auth.Roles).values({
      discordRoleId: "990000000000000911",
      id: OFFICER_ROLE,
      name: "Officers",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await client
      .insert(auth.Permissions)
      .values({ roleId: OFFICER_ROLE, userId: OFFICER_USER });

    const window = {
      applicationDeadline: new Date("2026-09-01T00:00:00Z"),
      applicationOpen: new Date("2026-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
      endDate: new Date("2026-10-03T00:00:00Z"),
      startDate: new Date("2026-10-01T00:00:00Z"),
      theme: "Guards",
    };
    await client.insert(knightHacks.Hackathon).values([
      { ...window, displayName: "Ready", id: READY_HACKATHON, name: "ready" },
      {
        ...window,
        displayName: "Unready",
        id: UNREADY_HACKATHON,
        name: "unready",
      },
    ]);

    await client.insert(knightHacks.EmailTemplate).values({
      createdBy: OFFICER_USER,
      domain: "hackathon",
      id: TEMPLATE_ID,
      kind: "code",
      name: "Status mail",
      normalizedName: "status mail",
      updatedBy: OFFICER_USER,
    });
    await client.insert(knightHacks.EmailTemplateRevision).values({
      compiledHtml: "<!doctype html><html><body><p>Hello</p></body></html>",
      compiledText: "Hello",
      createdBy: OFFICER_USER,
      id: REVISION_ID,
      personalizationContract: [],
      publishedAt: new Date(),
      source:
        'import { Container, Html, Text } from "@react-email/components";\n\nexport default (\n  <Html>\n    <Container>\n      <Text>Hello</Text>\n    </Container>\n  </Html>\n);\n',
      state: "published",
      templateId: TEMPLATE_ID,
      version: 1,
    });

    // Ready hackathon: all six. Unready: five, so exactly one is missing.
    const sendingStatuses = [
      "withdrawn",
      "pending",
      "accepted",
      "waitlisted",
      "confirmed",
      "denied",
    ] as const;
    await client.insert(knightHacks.HackathonStatusEmail).values(
      sendingStatuses.map((status) => ({
        hackathonId: READY_HACKATHON,
        status,
        subject: `Your ${status} update`,
        templateId: TEMPLATE_ID,
      })),
    );
    await client.insert(knightHacks.HackathonStatusEmail).values(
      sendingStatuses.slice(0, 5).map((status) => ({
        hackathonId: UNREADY_HACKATHON,
        status,
        subject: `Your ${status} update`,
        templateId: TEMPLATE_ID,
      })),
    );

    const hackerFixture = (id: string, suffix: string) => ({
      age: 20,
      discordUser: `hacker-${suffix}`,
      dob: "2006-01-01",
      email: `hacker-${suffix}@example.test`,
      firstName: "Test",
      gradDate: "2030-05-01",
      id,
      lastName: suffix,
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      phoneNumber: "0000000000",
      school: "University of Central Florida" as const,
      shirtSize: "M" as const,
      survey1: "",
      survey2: "",
      userId: OFFICER_USER,
    });

    const PLAIN_HACKER = "70000000-0000-4000-8000-0000000000e1";
    const BLOCKED_HACKER = "70000000-0000-4000-8000-0000000000e2";
    const UNREADY_HACKER = "70000000-0000-4000-8000-0000000000e3";
    await client
      .insert(knightHacks.Hacker)
      .values([
        hackerFixture(PLAIN_HACKER, "plain"),
        hackerFixture(BLOCKED_HACKER, "blocked"),
        hackerFixture(UNREADY_HACKER, "unready"),
      ]);

    await client.insert(knightHacks.HackerAttendee).values([
      {
        hackathonId: READY_HACKATHON,
        hackerId: PLAIN_HACKER,
        id: PLAIN_ATTENDEE,
        status: "pending",
      },
      {
        blacklistReason: "Repeated code of conduct violations.",
        blacklistedAt: new Date(),
        blacklistedBy: OFFICER_USER,
        hackathonId: READY_HACKATHON,
        hackerId: BLOCKED_HACKER,
        id: BLACKLISTED_ATTENDEE,
        status: "pending",
      },
      {
        hackathonId: UNREADY_HACKATHON,
        hackerId: UNREADY_HACKER,
        id: UNREADY_ATTENDEE,
        status: "pending",
      },
    ]);

    caller = await officerCaller();
  }, 120_000);

  afterAll(async () => {
    // Pool first, then drop. Dropping a database with live connections makes
    // Postgres terminate them, and vitest reports the resulting FATAL as an
    // unhandled error that buries the actual results.
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  });

  describe("TC-NEG-005: the readiness gate", () => {
    it("refuses a transition that would send, naming the shortfall", async () => {
      await expect(
        caller.hacker.setStatus({
          attendeeId: UNREADY_ATTENDEE,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const [row] = await client
        .select({ status: knightHacks.HackerAttendee.status })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, UNREADY_ATTENDEE));
      expect(row?.status).toBe("pending");
    });

    it("still allows blacklisting on an unconfigured hackathon", async () => {
      // AC-006: only mail-sending transitions are gated. Triaging a
      // half-configured hackathon is legitimate work.
      await expect(
        caller.hacker.setBlacklist({
          attendeeId: UNREADY_ATTENDEE,
          blacklisted: true,
          reason: "Testing that triage still works.",
        }),
      ).resolves.toMatchObject({ blacklisted: true });

      await caller.hacker.setBlacklist({
        attendeeId: UNREADY_ATTENDEE,
        blacklisted: false,
      });
    });

    it("positive control: a configured hackathon allows the same transition", async () => {
      // Without this the gate could refuse everything and every case above
      // would still pass.
      await expect(
        caller.hacker.setStatus({
          attendeeId: PLAIN_ATTENDEE,
          status: "waitlisted",
        }),
      ).resolves.toMatchObject({ status: "waitlisted" });

      await caller.hacker.setStatus({
        attendeeId: PLAIN_ATTENDEE,
        status: "pending",
      });
    });
  });

  describe("TC-NEG-002: the blacklist guard", () => {
    it("refuses to accept a blacklisted applicant", async () => {
      await expect(
        caller.hacker.setStatus({
          attendeeId: BLACKLISTED_ATTENDEE,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const [row] = await client
        .select({ status: knightHacks.HackerAttendee.status })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, BLACKLISTED_ATTENDEE));
      expect(row?.status).toBe("pending");
    });

    it("AC-013: still allows a capacity reject", async () => {
      // The one transition a blacklisted applicant can make — it is how they
      // leave the funnel.
      await expect(
        caller.hacker.setStatus({
          attendeeId: BLACKLISTED_ATTENDEE,
          status: "denied",
        }),
      ).resolves.toMatchObject({ status: "denied" });

      await client
        .update(knightHacks.HackerAttendee)
        .set({ status: "pending" })
        .where(eq(knightHacks.HackerAttendee.id, BLACKLISTED_ATTENDEE));
    });

    it("AC-014: skips a blacklisted applicant in bulk and names them", async () => {
      const result = await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, BLACKLISTED_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      // Best-effort: the eligible one still moved.
      expect(result.movedCount).toBe(1);
      expect(result.skipped).toEqual([
        expect.objectContaining({
          attendeeId: BLACKLISTED_ATTENDEE,
          reason: "blacklisted",
        }),
      ]);

      await client
        .update(knightHacks.HackerAttendee)
        .set({ lastStatusSendId: null, status: "pending" })
        .where(eq(knightHacks.HackerAttendee.id, PLAIN_ATTENDEE));
    });
  });

  describe("TC-010: blacklisting is orthogonal to status", () => {
    it("does not change status and requires a reason", async () => {
      await caller.hacker.setBlacklist({
        attendeeId: PLAIN_ATTENDEE,
        blacklisted: true,
        reason: "Under review.",
      });

      const [row] = await client
        .select({
          blacklistReason: knightHacks.HackerAttendee.blacklistReason,
          blacklistedAt: knightHacks.HackerAttendee.blacklistedAt,
          blacklistedBy: knightHacks.HackerAttendee.blacklistedBy,
          status: knightHacks.HackerAttendee.status,
        })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, PLAIN_ATTENDEE));

      // The whole point: the applicant sits exactly where they were.
      expect(row?.status).toBe("pending");
      expect(row?.blacklistedAt).not.toBeNull();
      expect(row?.blacklistedBy).toBe(OFFICER_USER);
      expect(row?.blacklistReason).toBe("Under review.");

      await caller.hacker.setBlacklist({
        attendeeId: PLAIN_ATTENDEE,
        blacklisted: false,
      });
    });
  });

  describe("TC-005/TC-007: transitions enqueue exactly one send", () => {
    it("a single transition queues one send carrying that applicant", async () => {
      const result = await caller.hacker.setStatus({
        attendeeId: PLAIN_ATTENDEE,
        status: "accepted",
      });

      const [send] = await client
        .select({
          finalRecipientCount: knightHacks.EmailSend.finalRecipientCount,
          status: knightHacks.EmailSend.status,
          subject: knightHacks.EmailSend.subject,
        })
        .from(knightHacks.EmailSend)
        .where(eq(knightHacks.EmailSend.id, result.sendId));

      expect(send?.status).toBe("queued");
      expect(send?.finalRecipientCount).toBe(1);
      // The subject an officer configured, not a default.
      expect(send?.subject).toBe("Your accepted update");

      const recipients = await client
        .select({ email: knightHacks.EmailSendRecipient.email })
        .from(knightHacks.EmailSendRecipient)
        .where(eq(knightHacks.EmailSendRecipient.sendId, result.sendId));
      expect(recipients).toHaveLength(1);

      // AC-024: the attendee points at the send, so a failure stays
      // attributable without EmailSendRecipient, which retention deletes.
      const [attendee] = await client
        .select({
          lastStatusSendId: knightHacks.HackerAttendee.lastStatusSendId,
        })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, PLAIN_ATTENDEE));
      expect(attendee?.lastStatusSendId).toBe(result.sendId);

      await client
        .update(knightHacks.HackerAttendee)
        .set({ lastStatusSendId: null, status: "pending" })
        .where(eq(knightHacks.HackerAttendee.id, PLAIN_ATTENDEE));
    });
  });
});

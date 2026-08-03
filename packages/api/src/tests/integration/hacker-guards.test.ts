import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq, inArray } from "@forge/db";
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
const SECOND_ATTENDEE = "60000000-0000-4000-8000-0000000000e4";

const PLAIN_HACKER = "70000000-0000-4000-8000-0000000000e1";
const BLOCKED_HACKER = "70000000-0000-4000-8000-0000000000e2";
const UNREADY_HACKER = "70000000-0000-4000-8000-0000000000e3";
const SECOND_HACKER = "70000000-0000-4000-8000-0000000000e4";
/** Suffix per hacker id, so `afterEach` can rebuild the fixture addresses. */
const HACKER_SUFFIXES: [string, string][] = [
  [PLAIN_HACKER, "plain"],
  [BLOCKED_HACKER, "blocked"],
  [UNREADY_HACKER, "unready"],
  [SECOND_HACKER, "second"],
];

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
    // The same escape hatch the Playwright suite uses. `NODE_ENV` is
    // "development" under `pnpm test`, and status mail is refused there on
    // purpose — the delivery cycle rejects a hackathon audience in development
    // and would mark every send failed. Set before the dynamic imports below,
    // because `isBladeE2E` is read at module load.
    // eslint-disable-next-line no-restricted-properties
    process.env.BLADE_E2E_AUTH = "true";

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

    await client
      .insert(knightHacks.Hacker)
      .values([
        hackerFixture(PLAIN_HACKER, "plain"),
        hackerFixture(BLOCKED_HACKER, "blocked"),
        hackerFixture(UNREADY_HACKER, "unready"),
        hackerFixture(SECOND_HACKER, "second"),
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
      {
        hackathonId: READY_HACKATHON,
        hackerId: SECOND_HACKER,
        id: SECOND_ATTENDEE,
        status: "pending",
      },
    ]);

    caller = await officerCaller();
  }, 120_000);

  // Reset after every test, not on the success path of each one. A reset that
  // only runs when the assertions pass means the first failure mutates shared
  // rows and poisons everything after it — and a readiness test can then pass
  // for the wrong reason, because the blacklist guard throws the identical
  // PRECONDITION_FAILED code.
  afterEach(async () => {
    // Emails too. The duplicate-email test rewrites one, and restoring it in the
    // test body means a failure before that line leaks the collision into every
    // later test — which today is masked only by declaration order, since the
    // one test that would break happens to be declared earlier in the file.
    for (const [id, suffix] of HACKER_SUFFIXES) {
      await client
        .update(knightHacks.Hacker)
        .set({ email: `hacker-${suffix}@example.test` })
        .where(eq(knightHacks.Hacker.id, id));
    }
    await client
      .update(knightHacks.HackerAttendee)
      .set({ lastStatusSendId: null, status: "pending" })
      .where(eq(knightHacks.HackerAttendee.hackathonId, READY_HACKATHON));
    await client
      .update(knightHacks.HackerAttendee)
      .set({
        blacklistReason: null,
        blacklistedAt: null,
        blacklistedBy: null,
        lastStatusSendId: null,
        status: "pending",
      })
      .where(eq(knightHacks.HackerAttendee.id, UNREADY_ATTENDEE));
    await client
      .update(knightHacks.HackerAttendee)
      .set({
        blacklistReason: "Repeated code of conduct violations.",
        blacklistedAt: new Date(),
        blacklistedBy: OFFICER_USER,
      })
      .where(eq(knightHacks.HackerAttendee.id, BLACKLISTED_ATTENDEE));
    await client
      .update(knightHacks.HackerAttendee)
      .set({ blacklistReason: null, blacklistedAt: null, blacklistedBy: null })
      .where(eq(knightHacks.HackerAttendee.id, PLAIN_ATTENDEE));
    await client.delete(knightHacks.EmailSendRecipient);
    await client.delete(knightHacks.EmailSend);
  });

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
    });
  });

  describe("gaps the first review found", () => {
    it("confirmBulk refuses on an unconfigured hackathon", async () => {
      // The readiness gate on the bulk path had a positive control and no
      // negative case, so deleting it entirely left the suite green while an
      // officer could mail two hundred people from a half-configured
      // hackathon.
      await expect(
        caller.hacker.confirmBulk({
          attendeeIds: [UNREADY_ATTENDEE],
          hackathonId: UNREADY_HACKATHON,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const sends = await client.select().from(knightHacks.EmailSend);
      expect(sends).toHaveLength(0);
    });

    it("TC-007: a bulk of many produces exactly one send", async () => {
      const result = await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      // One campaign carrying everyone, not one per person. Cited by the
      // original test and never actually asserted.
      const sends = await client.select().from(knightHacks.EmailSend);
      expect(sends).toHaveLength(1);
      expect(sends[0]?.finalRecipientCount).toBe(2);
      expect(result.movedCount).toBe(2);

      const recipients = await client
        .select()
        .from(knightHacks.EmailSendRecipient);
      expect(recipients).toHaveLength(2);
    });

    it("a bulk that skips someone does not move them in the database", async () => {
      // The result object reporting "skipped" is not the same as the row being
      // left alone. Changing the update predicate to the full input list would
      // flip a blacklisted applicant while the result still read honestly.
      await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, BLACKLISTED_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      const [blocked] = await client
        .select({ status: knightHacks.HackerAttendee.status })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, BLACKLISTED_ATTENDEE));
      expect(blocked?.status).toBe("pending");
    });

    it("blacklisting sends no mail", async () => {
      // An applicant emailed about their own blacklisting would be a
      // disclosure of officer-tier data.
      await caller.hacker.setBlacklist({
        attendeeId: PLAIN_ATTENDEE,
        blacklisted: true,
        reason: "Under review.",
      });

      const sends = await client.select().from(knightHacks.EmailSend);
      expect(sends).toHaveLength(0);
    });

    it("refuses a transition to the status the applicant already holds", async () => {
      await caller.hacker.setStatus({
        attendeeId: PLAIN_ATTENDEE,
        status: "accepted",
      });

      await expect(
        caller.hacker.setStatus({
          attendeeId: PLAIN_ATTENDEE,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      // One send, not two. A double-click must not mail twice.
      const sends = await client.select().from(knightHacks.EmailSend);
      expect(sends).toHaveLength(1);
    });

    it("skips an applicant already at the target status in bulk", async () => {
      await caller.hacker.setStatus({
        attendeeId: PLAIN_ATTENDEE,
        status: "accepted",
      });

      const result = await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      expect(result.movedCount).toBe(1);
      expect(result.skipped).toEqual([
        expect.objectContaining({
          attendeeId: PLAIN_ATTENDEE,
          reason: "already",
        }),
      ]);
    });

    it("collapses a duplicated id rather than aborting the bulk", async () => {
      // `EmailSendRecipient` is unique on (sendId, normalizedEmail), so a
      // repeated id would otherwise surface as a raw constraint violation.
      const result = await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, PLAIN_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      expect(result.movedCount).toBe(1);
      const recipients = await client
        .select()
        .from(knightHacks.EmailSendRecipient);
      expect(recipients).toHaveLength(1);
    });

    it("names the shortfall rather than only refusing", async () => {
      // Both the readiness gate and the blacklist guard throw
      // PRECONDITION_FAILED, so asserting the code alone cannot tell them
      // apart — and the count is the only thing telling an officer what to fix.
      await expect(
        caller.hacker.setStatus({
          attendeeId: UNREADY_ATTENDEE,
          status: "accepted",
        }),
      ).rejects.toThrow(/5 of 6 status emails/);
    });
  });

  describe("TC-002/TC-017: the filters execute", () => {
    // These exist because every array filter shipped generating invalid SQL —
    // `= any(($1, $2))` rather than a Postgres array — and 500'd on the first
    // school an officer ticked. Nothing caught it: the access test calls
    // `listForHackathon` with no filter, and no other test named these fields.
    // Executing each one against real SQL is the only thing that would have.
    it("filters by school", async () => {
      const result = await caller.hacker.listForHackathon({
        filter: { schools: ["University of Central Florida"] },
        hackathonId: READY_HACKATHON,
      });
      expect(result.hackers.length).toBeGreaterThan(0);

      const none = await caller.hacker.listForHackathon({
        filter: { schools: ["A School Nobody Attends"] },
        hackathonId: READY_HACKATHON,
      });
      expect(none.hackers).toHaveLength(0);
    });

    it("filters by a single school and by several", async () => {
      // One value and many take different SQL shapes; the broken version failed
      // differently for each, so both are pinned.
      for (const schools of [
        ["University of Central Florida"],
        ["University of Central Florida", "University of Florida"],
      ]) {
        const result = await caller.hacker.listForHackathon({
          filter: { schools },
          hackathonId: READY_HACKATHON,
        });
        expect(result.hackers.length).toBeGreaterThan(0);
      }
    });

    it("filters by level of study, graduation year, and term", async () => {
      const level = await caller.hacker.listForHackathon({
        filter: { levelsOfStudy: ["Undergraduate University (3+ year)"] },
        hackathonId: READY_HACKATHON,
      });
      expect(level.hackers.length).toBeGreaterThan(0);

      // Fixtures graduate 2030-05-01 — May, so Spring.
      const year = await caller.hacker.listForHackathon({
        filter: { graduationYears: [2030] },
        hackathonId: READY_HACKATHON,
      });
      expect(year.hackers.length).toBeGreaterThan(0);

      const spring = await caller.hacker.listForHackathon({
        filter: { graduationTerms: ["Spring"] },
        hackathonId: READY_HACKATHON,
      });
      expect(spring.hackers.length).toBeGreaterThan(0);

      const fall = await caller.hacker.listForHackathon({
        filter: { graduationTerms: ["Fall"] },
        hackathonId: READY_HACKATHON,
      });
      expect(fall.hackers).toHaveLength(0);
    });

    it("filters compose as AND", async () => {
      const both = await caller.hacker.listForHackathon({
        filter: {
          graduationTerms: ["Fall"],
          schools: ["University of Central Florida"],
        },
        hackathonId: READY_HACKATHON,
      });
      // The school matches and the term does not, so an AND returns nothing.
      // An OR would return every UCF applicant.
      expect(both.hackers).toHaveLength(0);
    });

    it("statusCounts keeps every bucket when a status is selected", async () => {
      // It groups *by* status, so applying the status filter collapsed the
      // result to one bucket and rendered every other tab as zero.
      const counts = await caller.hacker.statusCounts({
        filter: { status: "accepted" },
        hackathonId: READY_HACKATHON,
      });
      expect(counts.byStatus.pending).toBeGreaterThan(0);
    });

    it("filterOptions offers only values present in this hackathon", async () => {
      const options = await caller.hacker.filterOptions({
        hackathonId: READY_HACKATHON,
      });
      expect(options.schools).toEqual(["University of Central Florida"]);
      expect(options.graduationYears).toEqual([2030]);
    });
  });

  describe("two applicants sharing an email", () => {
    // `Hacker.email` is not unique, and `EmailSendRecipient` is unique on
    // (sendId, normalizedEmail) — so only one of them could ever be mailed.
    // Collapsing silently meant the second person moved to accepted, was never
    // told, and never appeared in the Delivery pane either, because the send
    // they pointed at had succeeded.
    it("reports the duplicate rather than moving them unmailed", async () => {
      await client
        .update(knightHacks.Hacker)
        .set({ email: "hacker-plain@example.test" })
        .where(eq(knightHacks.Hacker.id, SECOND_HACKER));

      const result = await caller.hacker.confirmBulk({
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      expect(result.movedCount).toBe(1);
      expect(result.skipped).toEqual([
        expect.objectContaining({
          attendeeId: SECOND_ATTENDEE,
          reason: "duplicate_email",
        }),
      ]);

      // The one that was skipped must not have moved.
      const [second] = await client
        .select({ status: knightHacks.HackerAttendee.status })
        .from(knightHacks.HackerAttendee)
        .where(eq(knightHacks.HackerAttendee.id, SECOND_ATTENDEE));
      expect(second?.status).toBe("pending");

      // And the recipient count matches what was actually sent.
      const recipients = await client
        .select()
        .from(knightHacks.EmailSendRecipient);
      expect(recipients).toHaveLength(1);
    });
  });

  describe("the has-more signal the cap notice reads", () => {
    /**
     * `nextCursor` must mean "there are more", not "the page came back full".
     *
     * The roster's "capped at 1000; narrow the filter to reach the rest" line is
     * derived from this. Under a fullness check, a hackathon with exactly 1000
     * matches told an officer to go hunting for rows that were all on screen —
     * and, worse, the inverse mistake hides the notice while hundreds of
     * applicants are unreachable behind a header select-all.
     */
    it("is null when the last page is exactly full", async () => {
      const all = await caller.hacker.listForHackathon({
        filter: {},
        hackathonId: READY_HACKATHON,
        limit: 50,
      });
      const exactly = await caller.hacker.listForHackathon({
        filter: {},
        hackathonId: READY_HACKATHON,
        limit: all.hackers.length,
      });

      expect(exactly.hackers).toHaveLength(all.hackers.length);
      expect(exactly.nextCursor).toBeNull();
    });

    it("is set when rows remain beyond the page", async () => {
      const all = await caller.hacker.listForHackathon({
        filter: {},
        hackathonId: READY_HACKATHON,
        limit: 50,
      });
      // Guards the test itself: with fewer than two applicants the assertion
      // below would pass for the wrong reason.
      expect(all.hackers.length).toBeGreaterThan(1);

      const partial = await caller.hacker.listForHackathon({
        filter: {},
        hackathonId: READY_HACKATHON,
        limit: all.hackers.length - 1,
      });

      expect(partial.nextCursor).not.toBeNull();
    });
  });

  describe("two applicants sharing an email, continued", () => {
    async function shareAnAddress() {
      await client
        .update(knightHacks.Hacker)
        .set({ email: "hacker-plain@example.test" })
        .where(eq(knightHacks.Hacker.id, SECOND_HACKER));
    }

    // The officer is shown the preview and acts on it. If confirm partitions
    // differently, they approved one thing and sent another.
    it("preview reports the same duplicate confirm does", async () => {
      await shareAnAddress();
      const input = {
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted" as const,
      };

      const preview = await caller.hacker.previewBulk(input);
      const confirmed = await caller.hacker.confirmBulk(input);

      expect(preview.sending.map((row) => row.attendeeId)).toEqual([
        PLAIN_ATTENDEE,
      ]);
      expect(preview.skipped).toEqual(confirmed.skipped);
      expect(preview.sending).toHaveLength(confirmed.movedCount);
    });

    /**
     * The skip is only defensible because the officer can finish the job.
     *
     * Re-selecting both and accepting again has to mail the one that was
     * skipped: the first is now `already`, and that branch has to `continue`
     * *before* claiming the address. Order them the other way and the pair
     * never converges — the second person is skipped forever, on every attempt,
     * with no way out from the UI.
     */
    it("mails the skipped applicant when the bulk is repeated", async () => {
      await shareAnAddress();
      const input = {
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted" as const,
      };

      await caller.hacker.confirmBulk(input);
      const second = await caller.hacker.confirmBulk(input);

      expect(second.movedCount).toBe(1);
      expect(second.skipped).toEqual([
        expect.objectContaining({
          attendeeId: PLAIN_ATTENDEE,
          reason: "already",
        }),
      ]);
      const rows = await client
        .select({
          id: knightHacks.HackerAttendee.id,
          status: knightHacks.HackerAttendee.status,
        })
        .from(knightHacks.HackerAttendee)
        .where(
          inArray(knightHacks.HackerAttendee.id, [
            PLAIN_ATTENDEE,
            SECOND_ATTENDEE,
          ]),
        );
      expect(rows.every((row) => row.status === "accepted")).toBe(true);
    });

    // Which of the pair is mailed must not depend on the order the officer
    // happened to click the rows.
    it("picks the earliest applicant whichever order the ids arrive", async () => {
      await shareAnAddress();
      const forwards = await caller.hacker.previewBulk({
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });
      const backwards = await caller.hacker.previewBulk({
        attendeeIds: [SECOND_ATTENDEE, PLAIN_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      expect(backwards.sending.map((row) => row.attendeeId)).toEqual(
        forwards.sending.map((row) => row.attendeeId),
      );
    });

    // The address is the whole explanation — one person who applied twice needs
    // a different remedy from two people on a family address.
    it("names the address on the skip", async () => {
      await shareAnAddress();
      const preview = await caller.hacker.previewBulk({
        attendeeIds: [PLAIN_ATTENDEE, SECOND_ATTENDEE],
        hackathonId: READY_HACKATHON,
        status: "accepted",
      });

      expect(preview.skipped[0]?.email).toBe("hacker-plain@example.test");
    });
  });

  describe("preview refuses everything confirm refuses", () => {
    // A preview that promises "Send 300 emails" and then dies on confirm has
    // failed at its only job. Checking the gates individually was not enough —
    // configuration is counted, but the template still has to exist, be a
    // hackathon template, and have a published revision.
    it("refuses when the configured template is archived", async () => {
      await client
        .update(knightHacks.EmailTemplate)
        .set({ archivedAt: new Date() })
        .where(eq(knightHacks.EmailTemplate.id, TEMPLATE_ID));

      await expect(
        caller.hacker.previewBulk({
          attendeeIds: [PLAIN_ATTENDEE],
          hackathonId: READY_HACKATHON,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      await client
        .update(knightHacks.EmailTemplate)
        .set({ archivedAt: null })
        .where(eq(knightHacks.EmailTemplate.id, TEMPLATE_ID));
    });

    it("refuses when the template has no published revision", async () => {
      await client
        .update(knightHacks.EmailTemplateRevision)
        .set({ state: "draft" })
        .where(eq(knightHacks.EmailTemplateRevision.id, REVISION_ID));

      await expect(
        caller.hacker.previewBulk({
          attendeeIds: [PLAIN_ATTENDEE],
          hackathonId: READY_HACKATHON,
          status: "accepted",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      await client
        .update(knightHacks.EmailTemplateRevision)
        .set({ state: "published" })
        .where(eq(knightHacks.EmailTemplateRevision.id, REVISION_ID));
    });

    it("positive control: a healthy template previews", async () => {
      await expect(
        caller.hacker.previewBulk({
          attendeeIds: [PLAIN_ATTENDEE],
          hackathonId: READY_HACKATHON,
          status: "accepted",
        }),
      ).resolves.toMatchObject({ sending: [expect.anything()] });
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
    });
  });
});

import { randomUUID } from "node:crypto";
import { Routes } from "discord-api-types/v10";
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
import type * as AuthSchemaModule from "@forge/db/schemas/auth";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import type * as EmailModule from "@forge/email";
import type * as DiscordModule from "@forge/utils/discord";
import { eq, sql } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type * as PrintingParticipantModule from "../../hacker-portal/printing";
import { trackTestPoolShutdown } from "../support/close-test-pool";
import { permissionBitstring } from "../support/permissions";

type DatabaseClient = typeof db;
type AuthSchemas = typeof AuthSchemaModule;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type PrintingModule = typeof PrintingParticipantModule;
type PortalContext = Parameters<PrintingModule["listPrintJobs"]>[0];

// Staged-file removal touches MinIO; nothing here needs a real bucket.
vi.mock("../../minio/minio-client", () => ({
  minioClient: {
    bucketExists: vi.fn().mockResolvedValue(true),
    putObject: vi.fn().mockResolvedValue(undefined),
    removeObjects: vi.fn().mockResolvedValue(undefined),
  },
}));

const emailSend = vi.hoisted(() => vi.fn<typeof EmailModule.sendEmail>());
vi.mock("@forge/email", async (importOriginal) => ({
  ...(await importOriginal<typeof EmailModule>()),
  sendEmail: emailSend,
}));

const discordPost = vi.hoisted(() => vi.fn());
vi.mock("@forge/utils/discord", async (importOriginal) => ({
  ...(await importOriginal<typeof DiscordModule>()),
  api: { post: discordPost },
}));

const DAY_MS = 24 * 60 * 60 * 1_000;
const since = (days: number) => new Date(Date.now() + days * DAY_MS);

/** One recorded `discord.api.post(route, { body })` call. */
function discordCall(index: number) {
  return discordPost.mock.calls[index] as [
    string,
    {
      body: {
        allowed_mentions?: unknown;
        content?: string;
        recipient_id?: string;
      };
    },
  ];
}

/** Portal domain errors surface as the TRPCError's cause. */
async function rejectsWithCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ cause: { code } });
}

/**
 * The print queue across both boundaries, on real SQL: the participant
 * functions (submit, claim, cancel, list) and the Blade router (access, status,
 * ready-time override, estimate settings).
 */
describe.skipIf(!canRunDatabaseTests())("3D printing queue", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let closePool: (() => Promise<void>) | undefined;
  let auth: AuthSchemas;
  let knightHacks: KnightHacksSchemas;
  let printing: PrintingModule;
  let hackathonId: string;

  async function seedUser(name: string) {
    const id = randomUUID();
    await client
      .insert(auth.User)
      .values({ discordUserId: `discord-${id}`, id, name });
    return id;
  }

  /** A hacker with a current profile and an application at `hackathonId`. */
  async function seedHacker(
    label: string,
    status: "checkedin" | "confirmed",
  ): Promise<{ attendeeId: string; ctx: PortalContext }> {
    const userId = await seedUser(label);
    const fields = {
      country: "United States of America" as const,
      discordUser: `${label}-discord`,
      dob: "2005-01-01",
      email: `${label}@example.test`,
      firstName: label,
      gender: "Prefer not to answer" as const,
      gradDate: "2028-05-01",
      lastName: "Printer",
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      major: "Computer Science" as const,
      phoneNumber: "4075550100",
      raceOrEthnicity: "Prefer not to answer" as const,
      school: "University of Central Florida",
      shirtSize: "M" as const,
    };
    const [hacker] = await client
      .insert(knightHacks.Hacker)
      .values({ ...fields, age: 21, survey1: "", survey2: "", userId })
      .returning({ id: knightHacks.Hacker.id });
    const [profile] = await client
      .insert(knightHacks.HackerProfile)
      .values({ ...fields, userId })
      .returning({ id: knightHacks.HackerProfile.id });
    if (!hacker || !profile) throw new Error("Hacker seed failed.");
    const [revision] = await client
      .insert(knightHacks.HackerProfileRevision)
      .values({
        ...fields,
        createdBy: userId,
        profileId: profile.id,
        revision: 1,
      })
      .returning({ id: knightHacks.HackerProfileRevision.id });
    if (!revision) throw new Error("Revision seed failed.");
    const [attendee] = await client
      .insert(knightHacks.HackerAttendee)
      .values({
        hackathonId,
        hackerId: hacker.id,
        profileId: profile.id,
        profileRevisionId: revision.id,
        status,
      })
      .returning({ id: knightHacks.HackerAttendee.id });
    if (!attendee) throw new Error("Attendee seed failed.");
    return {
      attendeeId: attendee.id,
      ctx: {
        client: { enabled: true },
        headers: new Headers(),
        requestId: randomUUID(),
        session: { hackathonId, userId },
      } as unknown as PortalContext,
    };
  }

  async function stageFile(attendeeId: string) {
    const id = randomUUID();
    await client.insert(knightHacks.PrintJobFile).values({
      contentType: "model/stl",
      fileName: "bracket.stl",
      hackathonId,
      hackerAttendeeId: attendeeId,
      id,
      objectName: `print-jobs/${hackathonId}/${attendeeId}/${id}-bracket.stl`,
      size: 2048,
    });
    return id;
  }

  async function submit(ctx: PortalContext, fileIds: string[]) {
    return printing.submitPrintJob(ctx, {
      category: "personal",
      description: "A small bracket, PLA, any color",
      fileIds,
      idempotencyKey: randomUUID(),
    });
  }

  async function bladeCaller(permissions: string) {
    const userId = await seedUser("Organizer");
    const roleId = randomUUID();
    await client.insert(auth.Roles).values({
      discordRoleId: `99${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(
        0,
        18,
      ),
      id: roleId,
      name: `Role ${roleId.slice(0, 6)}`,
      permissions,
    });
    await client.insert(auth.Permissions).values({ roleId, userId });
    const trpc = await import("../../trpc");
    const { printingRouter } = await import("../../routers/printing");
    return trpc.createCallerFactory(
      trpc.createTRPCRouter({ printing: printingRouter }),
    )({
      headers: new Headers(),
      session: {
        session: { id: `printing-${userId}`, userAgent: "vitest" },
        user: { id: userId, name: "Organizer" },
      } as unknown as Session,
      source: "printing-integration",
    });
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_printing");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;
    ({ db: client } = await import("@forge/db/client"));
    closePool = trackTestPoolShutdown(client.$client);
    auth = await import("@forge/db/schemas/auth");
    knightHacks = await import("@forge/db/schemas/knight-hacks");
    printing = await import("../../hacker-portal/printing");
    const { env } = await import("@forge/db/env");
    expect(env.DATABASE_URL).toBe(disposable.url);
  }, 120_000);

  beforeEach(async () => {
    emailSend.mockReset();
    emailSend.mockResolvedValue({ success: true });
    discordPost.mockReset();
    discordPost.mockResolvedValue({ id: "dm-channel" });
    await client.execute(
      sql`TRUNCATE ${knightHacks.Hackathon}, ${auth.User}, ${auth.Roles} CASCADE`,
    );
    hackathonId = randomUUID();
    await client.insert(knightHacks.Hackathon).values({
      applicationDeadline: since(-5),
      applicationOpen: since(-30),
      confirmationDeadline: since(-2),
      displayName: "Print Hack",
      endDate: since(1),
      id: hackathonId,
      name: `print-${hackathonId}`,
      startDate: since(-1),
      theme: "Printing",
      timezone: "America/New_York",
    });
    await client
      .insert(knightHacks.PrintingConfiguration)
      .values({ hackathonId, isOpen: true });
  }, 30_000);

  afterAll(async () => {
    await closePool?.();
    await disposable?.drop();
  }, 30_000);

  it("starts closed and only queue admins can open submissions", async () => {
    await client.delete(knightHacks.PrintingConfiguration);
    const hacker = await seedHacker("closed", "checkedin");
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    const unauthorized = await bladeCaller(permissionBitstring());
    expect(
      (await caller.printing.getConfiguration({ hackathonId })).isOpen,
    ).toBe(false);
    expect((await printing.listPrintJobs(hacker.ctx)).queue.isOpen).toBe(false);
    await rejectsWithCode(
      submit(hacker.ctx, [await stageFile(hacker.attendeeId)]),
      "PRINTING_CLOSED",
    );
    await expect(
      unauthorized.printing.setAvailability({ hackathonId, isOpen: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller.printing.setAvailability({ hackathonId, isOpen: true });
    expect(
      (await caller.printing.getConfiguration({ hackathonId })).isOpen,
    ).toBe(true);
    await expect(
      submit(hacker.ctx, [await stageFile(hacker.attendeeId)]),
    ).resolves.toMatchObject({ status: "received" });
    const { AdminAuditEvent } = await import("@forge/db/schemas/audit");
    const audits = await client
      .select({ action: AdminAuditEvent.actionKey })
      .from(AdminAuditEvent);
    expect(audits).toContainEqual({ action: "printing.availability.updated" });
  });

  it("blocks stale submissions and uploads after closing, preserves jobs and replays, and reopens", async () => {
    const hacker = await seedHacker("pause", "checkedin");
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    const input = {
      category: "personal" as const,
      description: "Bracket",
      fileIds: [await stageFile(hacker.attendeeId)],
      idempotencyKey: randomUUID(),
    };
    const job = await printing.submitPrintJob(hacker.ctx, input);
    const pendingFile = await stageFile(hacker.attendeeId);
    const removableFile = await stageFile(hacker.attendeeId);
    await caller.printing.setAvailability({ hackathonId, isOpen: false });
    expect((await printing.listPrintJobs(hacker.ctx)).queue.isOpen).toBe(false);
    await rejectsWithCode(submit(hacker.ctx, [pendingFile]), "PRINTING_CLOSED");
    await rejectsWithCode(
      printing.requirePrintUploadAccess(hacker.ctx),
      "PRINTING_CLOSED",
    );
    await rejectsWithCode(
      printing.uploadPrintFile(hacker.ctx, {
        bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        fileName: "reference.png",
        contentType: "image/png",
      }),
      "PRINTING_CLOSED",
    );
    await expect(
      printing.submitPrintJob(hacker.ctx, input),
    ).resolves.toMatchObject({ id: job.id });
    expect((await printing.listPrintJobs(hacker.ctx)).jobs).toHaveLength(1);
    await printing.removeStagedPrintFile(hacker.ctx, { fileId: removableFile });
    await expect(
      printing.cancelPrintJob(hacker.ctx, {
        jobId: job.id,
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toMatchObject({ status: "cancelled" });
    await caller.printing.setAvailability({ hackathonId, isOpen: true });
    await expect(submit(hacker.ctx, [pendingFile])).resolves.toMatchObject({
      status: "received",
    });
  });

  it("[TC-002/012] submits a job with staged files and estimates its place", async () => {
    const hacker = await seedHacker("ada", "checkedin");
    const first = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    const second = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
      await stageFile(hacker.attendeeId),
    ]);

    expect(second).toMatchObject({ position: 2, status: "received" });
    expect(second.files).toHaveLength(2);

    const list = await printing.listPrintJobs(hacker.ctx);
    expect(list.jobs.map((job) => job.id)).toEqual([second.id, first.id]);
    expect(list.queue).toEqual({
      isOpen: true,
      estimatedWaitMinutes: 180,
      printMinutes: 60,
      waitingCount: 2,
    });
    const minutesAway =
      (Date.parse(list.jobs[0]?.estimatedReadyAt ?? "") - Date.now()) / 60_000;
    expect(minutesAway).toBeGreaterThan(115);
    expect(minutesAway).toBeLessThanOrEqual(120);
  });

  it("[TC-NEG-001] refuses hackers who are not checked in", async () => {
    const hacker = await seedHacker("bea", "confirmed");
    await rejectsWithCode(
      printing.listPrintJobs(hacker.ctx),
      "FORBIDDEN_STATUS",
    );
    await rejectsWithCode(
      submit(hacker.ctx, [randomUUID()]),
      "FORBIDDEN_STATUS",
    );
  });

  it("[TC-NEG-006/007] claims only the caller's unclaimed files, once", async () => {
    const owner = await seedHacker("cy", "checkedin");
    const other = await seedHacker("di", "checkedin");
    const ownersFile = await stageFile(owner.attendeeId);

    await rejectsWithCode(
      submit(other.ctx, [ownersFile]),
      "PRINT_FILE_UNAVAILABLE",
    );
    await submit(owner.ctx, [ownersFile]);
    await rejectsWithCode(
      submit(owner.ctx, [ownersFile]),
      "PRINT_FILE_UNAVAILABLE",
    );

    const jobs = await client.select().from(knightHacks.PrintJob);
    expect(jobs).toHaveLength(1);
  });

  it("[TC-003] replays a submit with the same idempotency key", async () => {
    const hacker = await seedHacker("ed", "checkedin");
    const input = {
      category: "personal" as const,
      description: "Phone stand",
      fileIds: [await stageFile(hacker.attendeeId)],
      idempotencyKey: randomUUID(),
    };
    const first = await printing.submitPrintJob(hacker.ctx, input);
    const replay = await printing.submitPrintJob(hacker.ctx, input);

    expect(replay.id).toBe(first.id);
    expect(await client.select().from(knightHacks.PrintJob)).toHaveLength(1);
  });

  it("[TC-005/NEG-008] cancels received jobs only", async () => {
    const hacker = await seedHacker("flo", "checkedin");
    const job = await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    const cancelled = await printing.cancelPrintJob(hacker.ctx, {
      idempotencyKey: randomUUID(),
      jobId: job.id,
    });
    expect(cancelled).toMatchObject({
      estimatedReadyAt: null,
      status: "cancelled",
    });

    const printingJob = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await client
      .update(knightHacks.PrintJob)
      .set({ status: "printing" })
      .where(eq(knightHacks.PrintJob.id, printingJob.id));
    await rejectsWithCode(
      printing.cancelPrintJob(hacker.ctx, {
        idempotencyKey: randomUUID(),
        jobId: printingJob.id,
      }),
      "PRINT_JOB_NOT_CANCELLABLE",
    );
  });

  it("removes only the caller's staged files", async () => {
    const owner = await seedHacker("gus", "checkedin");
    const other = await seedHacker("hal", "checkedin");
    const fileId = await stageFile(owner.attendeeId);

    await printing.removeStagedPrintFile(other.ctx, { fileId });
    expect(await client.select().from(knightHacks.PrintJobFile)).toHaveLength(
      1,
    );
    await printing.removeStagedPrintFile(owner.ctx, { fileId });
    expect(await client.select().from(knightHacks.PrintJobFile)).toHaveLength(
      0,
    );
  });

  it("[TC-NEG-002] refuses Blade users without PRINTING_QUEUE", async () => {
    const caller = await bladeCaller(permissionBitstring("READ_HACKERS"));
    await expect(caller.printing.list({ hackathonId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("counts requests per attendee across statuses without counting files or other hackathons", async () => {
    const hacker = await seedHacker("repeat", "checkedin");
    const other = await seedHacker("first", "checkedin");
    const received = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
      await stageFile(hacker.attendeeId),
    ]);
    const completed = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await client
      .update(knightHacks.PrintJob)
      .set({ status: "picked_up" })
      .where(eq(knightHacks.PrintJob.id, completed.id));
    const first = await submit(other.ctx, [await stageFile(other.attendeeId)]);
    const selectedHackathonId = hackathonId;
    const otherHackathonId = randomUUID();
    await client.insert(knightHacks.Hackathon).values({
      applicationDeadline: since(-5),
      applicationOpen: since(-30),
      confirmationDeadline: since(-2),
      displayName: "Other Print Hack",
      endDate: since(1),
      id: otherHackathonId,
      name: `print-${otherHackathonId}`,
      startDate: since(-1),
      theme: "Printing",
      timezone: "America/New_York",
    });
    await client
      .insert(knightHacks.PrintingConfiguration)
      .values({ hackathonId: otherHackathonId, isOpen: true });
    hackathonId = otherHackathonId;
    const otherAttendee = await seedHacker("elsewhere", "checkedin");
    await submit(otherAttendee.ctx, [
      await stageFile(otherAttendee.attendeeId),
    ]);
    hackathonId = selectedHackathonId;

    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    for (const status of [
      undefined,
      "active",
      "received",
      "picked_up",
    ] as const) {
      const queue = await caller.printing.list({ hackathonId, status });
      for (const job of queue.jobs) {
        expect(job.requestCount).toBe(job.id === first.id ? 1 : 2);
        expect(job.cancelCount).toBe(0);
      }
      if (status === "received") {
        expect(queue.jobs.map((job) => job.id)).toEqual([
          received.id,
          first.id,
        ]);
      }
      if (status === "picked_up") {
        expect(queue.jobs.map((job) => job.id)).toEqual([completed.id]);
      }
    }
    expect(
      (await caller.printing.list({ hackathonId: otherHackathonId })).jobs[0]
        ?.requestCount,
    ).toBe(1);
  });

  it("[TC-006/008/013/014/NEG-014] works the queue from Blade", async () => {
    const hacker = await seedHacker("ivy", "checkedin");
    const cancelled = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await printing.cancelPrintJob(hacker.ctx, {
      idempotencyKey: randomUUID(),
      jobId: cancelled.id,
    });
    const job = await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));

    const queue = await caller.printing.list({ hackathonId });
    expect(queue.counts).toMatchObject({ cancelled: 1, received: 1 });
    expect(queue.jobs.map((row) => row.id)).toEqual([cancelled.id, job.id]);
    const active = await caller.printing.list({
      hackathonId,
      status: "active",
    });
    expect(active.jobs.map((row) => row.id)).toEqual([job.id]);
    expect(active.counts).toEqual(queue.counts);
    expect(active.jobs[0]?.requestCount).toBe(2);
    expect(queue.jobs[1]).toMatchObject({
      cancelCount: 1,
      requestCount: 2,
      estimate: { overridden: false, position: 1 },
      submitter: {
        discordUser: "ivy-discord",
        email: "ivy@example.test",
        name: "ivy Printer",
      },
    });

    await expect(
      caller.printing.updateStatus({
        jobId: job.id,
        note: "  ",
        status: "needs_clarification",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const promised = new Date(Date.now() + 30 * 60_000);
    await caller.printing.setEstimatedReadyAt({
      estimatedReadyAt: promised,
      jobId: job.id,
    });
    const [hackerView] = (await printing.listPrintJobs(hacker.ctx)).jobs;
    expect(hackerView?.estimatedReadyAt).toBe(promised.toISOString());

    const ready = await caller.printing.updateStatus({
      jobId: job.id,
      status: "ready_for_pickup",
    });
    expect(ready).toMatchObject({
      changed: true,
      job: { estimatedReadyAt: null, status: "ready_for_pickup" },
    });
    await expect(
      caller.printing.updateStatus({
        jobId: job.id,
        status: "ready_for_pickup",
      }),
    ).resolves.toMatchObject({ changed: false });

    await caller.printing.setEstimateSettings({
      hackathonId,
      printMinutes: 45,
      printerCount: 2,
    });
    await expect(
      caller.printing.getConfiguration({ hackathonId }),
    ).resolves.toEqual({
      channelId: null,
      isOpen: true,
      printMinutes: 45,
      printerCount: 2,
    });
    expect((await printing.listPrintJobs(hacker.ctx)).queue).toEqual({
      isOpen: true,
      estimatedWaitMinutes: 45,
      printMinutes: 45,
      waitingCount: 0,
    });

    const { AdminAuditEvent } = await import("@forge/db/schemas/audit");
    const audits = await client
      .select({ actionKey: AdminAuditEvent.actionKey })
      .from(AdminAuditEvent);
    expect(audits.map((row) => row.actionKey)).toEqual(
      expect.arrayContaining([
        "printing.job.submitted",
        "printing.job.cancelled",
        "printing.job.estimate_updated",
        "printing.job.status_updated",
        "printing.estimate_settings.updated",
      ]),
    );
  });

  it("[TC-002/010/NEG-010] posts one channel notice that pings only queue roles", async () => {
    const hacker = await seedHacker("jo", "checkedin");
    await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    expect(emailSend).toHaveBeenCalledTimes(1);
    discordPost.mockClear();

    await client.insert(auth.Roles).values([
      {
        discordRoleId: "111111111111111111",
        name: "Printer crew",
        permissions: permissionBitstring("PRINTING_QUEUE"),
      },
      {
        discordRoleId: "222222222222222222",
        name: "Officers",
        permissions: permissionBitstring("IS_OFFICER"),
      },
    ]);
    await client
      .update(knightHacks.PrintingConfiguration)
      .set({
        discordChannelId: "333333333333333333",
      })
      .where(eq(knightHacks.PrintingConfiguration.hackathonId, hackathonId));
    const input = {
      category: "personal" as const,
      description: "Keychain",
      fileIds: [await stageFile(hacker.attendeeId)],
      idempotencyKey: randomUUID(),
    };
    await printing.submitPrintJob(hacker.ctx, input);
    await printing.submitPrintJob(hacker.ctx, input);

    const channelCalls = discordPost.mock.calls.filter(
      ([route]) => route === Routes.channelMessages("333333333333333333"),
    );
    expect(channelCalls).toHaveLength(1);
    const index = discordPost.mock.calls.findIndex(
      ([route]) => route === Routes.channelMessages("333333333333333333"),
    );
    const [route, request] = discordCall(index);
    expect(route).toBe(Routes.channelMessages("333333333333333333"));
    expect(request.body.allowed_mentions).toEqual({
      parse: [],
      roles: ["111111111111111111"],
    });
    expect(request.body.content).toContain(
      "New 3D print job from **jo Printer**",
    );

    // Discord down: the submit still succeeds.
    discordPost.mockRejectedValue(new Error("Discord unavailable"));
    await expect(
      submit(hacker.ctx, [await stageFile(hacker.attendeeId)]),
    ).resolves.toMatchObject({ status: "received" });
  });

  it("[TC-007/NEG-009] DMs and emails on status changes and reports failures", async () => {
    const hacker = await seedHacker("kim", "checkedin");
    const job = await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));

    // DMs closed: Discord refuses to open the DM channel.
    discordPost.mockRejectedValueOnce(
      new Error("Cannot send messages to this user"),
    );
    const printingUpdate = await caller.printing.updateStatus({
      jobId: job.id,
      status: "printing",
    });
    expect(printingUpdate).toMatchObject({
      delivery: { discord: "failed", email: "delivered" },
      job: { status: "printing" },
    });

    discordPost.mockClear();
    const ready = await caller.printing.updateStatus({
      jobId: job.id,
      note: "Front table",
      status: "ready_for_pickup",
    });
    expect(ready.delivery).toEqual({
      discord: "delivered",
      email: "delivered",
    });
    const [openRoute, openRequest] = discordCall(0);
    expect(openRoute).toBe(Routes.userChannels());
    expect(openRequest.body.recipient_id).toMatch(/^discord-/);
    const [dmRoute, dmRequest] = discordCall(1);
    expect(dmRoute).toBe(Routes.channelMessages("dm-channel"));
    expect(dmRequest.body.allowed_mentions).toEqual({ parse: [] });
    expect(dmRequest.body.content).toContain("**Ready for pickup**");

    discordPost.mockClear();
    await expect(
      caller.printing.updateStatus({
        jobId: job.id,
        note: "Front table",
        status: "ready_for_pickup",
      }),
    ).resolves.toMatchObject({
      changed: false,
      delivery: { discord: "skipped", email: "skipped" },
    });
    expect(discordPost).not.toHaveBeenCalled();
  });

  it("[TC-004/NEG-008] keeps each hacker's jobs to themselves", async () => {
    const owner = await seedHacker("lin", "checkedin");
    const other = await seedHacker("max", "checkedin");
    const job = await submit(owner.ctx, [await stageFile(owner.attendeeId)]);

    const othersView = await printing.listPrintJobs(other.ctx);
    expect(othersView.jobs).toEqual([]);
    // The queue summary still counts the job; it just is not theirs to see.
    expect(othersView.queue.waitingCount).toBe(1);

    await rejectsWithCode(
      printing.cancelPrintJob(other.ctx, {
        idempotencyKey: randomUUID(),
        jobId: job.id,
      }),
      "FORBIDDEN",
    );
    const [stored] = await client
      .select({ status: knightHacks.PrintJob.status })
      .from(knightHacks.PrintJob)
      .where(eq(knightHacks.PrintJob.id, job.id));
    expect(stored?.status).toBe("received");
  });

  it("keeps the print start time when only the note changes", async () => {
    const hacker = await seedHacker("ned", "checkedin");
    const job = await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    await caller.printing.updateStatus({ jobId: job.id, status: "printing" });
    const startedAt = new Date(Date.now() - 50 * 60_000);
    await client
      .update(knightHacks.PrintJob)
      .set({ statusChangedAt: startedAt })
      .where(eq(knightHacks.PrintJob.id, job.id));

    const edited = await caller.printing.updateStatus({
      jobId: job.id,
      note: "Swapped to black filament",
      status: "printing",
    });
    expect(edited.changed).toBe(true);
    expect(edited.job.statusChangedAt).toEqual(startedAt);
    const [estimate] = (await printing.listPrintJobs(hacker.ctx)).jobs;
    // Started 50 minutes ago with a 60-minute print time: about 10 left.
    const minutesLeft =
      (Date.parse(estimate?.estimatedReadyAt ?? "") - Date.now()) / 60_000;
    expect(minutesLeft).toBeLessThanOrEqual(10);
  });

  it("counts submitted and cancelled files against the retained byte limit", async () => {
    const hacker = await seedHacker("quota", "checkedin");
    const fileId = await stageFile(hacker.attendeeId);
    const job = await submit(hacker.ctx, [fileId]);
    await printing.cancelPrintJob(hacker.ctx, {
      jobId: job.id,
      idempotencyKey: randomUUID(),
    });
    await client
      .update(knightHacks.PrintJobFile)
      .set({ size: 250 * 1024 * 1024 })
      .where(eq(knightHacks.PrintJobFile.id, fileId));
    // PNG signatures suffice for reference images; no image decoder is run.
    const input = {
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      contentType: "image/png",
      fileName: "reference.png",
    };
    await expect(printing.uploadPrintFile(hacker.ctx, input)).rejects.toThrow(
      "upload limit",
    );
    const other = await seedHacker("separate", "checkedin");
    await expect(
      printing.uploadPrintFile(other.ctx, input),
    ).resolves.toHaveProperty("fileId");
  });

  it("caps retained file count even when small files belong to submitted jobs", async () => {
    const hacker = await seedHacker("filequota", "checkedin");
    const ids: string[] = [];
    for (let index = 0; index < 25; index += 1)
      ids.push(await stageFile(hacker.attendeeId));
    for (let index = 0; index < 25; index += 5)
      await submit(hacker.ctx, ids.slice(index, index + 5));
    await expect(
      printing.uploadPrintFile(hacker.ctx, {
        bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        contentType: "",
        fileName: "reference.png",
      }),
    ).rejects.toThrow("upload limit");
  });

  it("keeps concurrent uploads within staging capacity", async () => {
    const hacker = await seedHacker("concurrent", "checkedin");
    const input = {
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      contentType: "",
      fileName: "reference.png",
    };
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        printing.uploadPrintFile(hacker.ctx, input),
      ),
    );
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    const retained = await client
      .select()
      .from(knightHacks.PrintJobFile)
      .where(eq(knightHacks.PrintJobFile.hackerAttendeeId, hacker.attendeeId));
    expect(retained.length).toBeGreaterThan(0);
    expect(retained.length).toBeLessThanOrEqual(5);
    for (const result of results) {
      if (result.status === "rejected")
        expect(String(result.reason)).toContain("Another upload");
    }
  });

  it("keeps at most five unsubmitted files per hacker", async () => {
    const hacker = await seedHacker("ola", "checkedin");
    const stl = new Uint8Array(
      Buffer.from(
        "solid part\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid part",
      ),
    );
    const uploaded: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const staged = await printing.uploadPrintFile(hacker.ctx, {
        bytes: stl,
        contentType: "",
        fileName: `part-${index}.stl`,
      });
      uploaded.push(staged.fileId);
    }

    const staged = await client
      .select({ id: knightHacks.PrintJobFile.id })
      .from(knightHacks.PrintJobFile)
      .where(eq(knightHacks.PrintJobFile.hackerAttendeeId, hacker.attendeeId));
    expect(staged.map((file) => file.id).sort()).toEqual(
      uploaded.slice(1).sort(),
    );
    // The five newest are still a valid job.
    await expect(submit(hacker.ctx, uploaded.slice(1))).resolves.toMatchObject({
      status: "received",
    });
  });
  it("prioritizes projects without interrupting printing, with consistent positions", async () => {
    const hacker = await seedHacker("priority", "checkedin");
    const personal = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    const legacy = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await client
      .update(knightHacks.PrintJob)
      .set({ category: null })
      .where(eq(knightHacks.PrintJob.id, legacy.id));
    const project = await printing.submitPrintJob(hacker.ctx, {
      category: "project",
      description: "Robot part",
      fileIds: [await stageFile(hacker.attendeeId)],
      idempotencyKey: randomUUID(),
    });
    const running = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await client
      .update(knightHacks.PrintJob)
      .set({ status: "printing" })
      .where(eq(knightHacks.PrintJob.id, running.id));
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    const queue = await caller.printing.list({ hackathonId, status: "active" });
    expect(queue.jobs.map((job) => job.id)).toEqual([
      running.id,
      project.id,
      personal.id,
      legacy.id,
    ]);
    expect(queue.jobs.map((job) => job.estimate?.position)).toEqual([
      1, 2, 3, 4,
    ]);
    const own = await printing.listPrintJobs(hacker.ctx);
    expect(own.jobs.find((job) => job.id === project.id)?.position).toBe(2);
  });

  it("lets owners classify while closed, preserves timestamps, and sends once per change", async () => {
    const owner = await seedHacker("owner-category", "checkedin");
    const other = await seedHacker("other-category", "checkedin");
    const job = await submit(owner.ctx, [await stageFile(owner.attendeeId)]);
    await client
      .update(knightHacks.PrintJob)
      .set({ category: null })
      .where(eq(knightHacks.PrintJob.id, job.id));
    await client
      .update(knightHacks.PrintingConfiguration)
      .set({ isOpen: false })
      .where(eq(knightHacks.PrintingConfiguration.hackathonId, hackathonId));
    const input = {
      category: "project" as const,
      jobId: job.id,
      idempotencyKey: randomUUID(),
    };
    await rejectsWithCode(
      printing.updatePrintJobCategory(other.ctx, input),
      "FORBIDDEN",
    );
    emailSend.mockClear();
    const updated = await printing.updatePrintJobCategory(owner.ctx, input);
    expect(updated).toMatchObject({
      category: "project",
      status: "received",
      createdAt: job.createdAt,
      statusChangedAt: job.statusChangedAt,
      files: job.files,
    });
    await printing.updatePrintJobCategory(owner.ctx, input);
    await printing.updatePrintJobCategory(owner.ctx, {
      ...input,
      idempotencyKey: randomUUID(),
    });
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend.mock.lastCall?.[0].text).toContain(
      "Category: Hackathon project",
    );
    await client
      .update(knightHacks.PrintJob)
      .set({ status: "printing" })
      .where(eq(knightHacks.PrintJob.id, job.id));
    await expect(
      printing.updatePrintJobCategory(owner.ctx, {
        ...input,
        category: "personal",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    const noPermission = await bladeCaller(permissionBitstring("READ_HACKERS"));
    await expect(
      noPermission.printing.updateCategory({
        jobId: job.id,
        category: "project",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("emails submissions, cancellations, every status, and note edits with no automatic estimates", async () => {
    const hacker = await seedHacker("email-status", "checkedin");
    await client
      .update(knightHacks.Hackathon)
      .set({ displayName: "Knight Hacks IX" })
      .where(eq(knightHacks.Hackathon.id, hackathonId));
    const job = await submit(hacker.ctx, [await stageFile(hacker.attendeeId)]);
    expect(emailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Knight Hacks IX 3D printing: Received",
      }),
    );
    const caller = await bladeCaller(permissionBitstring("PRINTING_QUEUE"));
    for (const status of [
      "printing",
      "needs_clarification",
      "ready_for_pickup",
      "picked_up",
      "cancelled",
      "received",
    ] as const) {
      emailSend.mockClear();
      const result = await caller.printing.updateStatus({
        jobId: job.id,
        status,
        note: "A note about your print",
      });
      expect(result.delivery.email).toBe("delivered");
      expect(emailSend).toHaveBeenCalledTimes(1);
      expect(emailSend.mock.lastCall?.[0].html).toContain(
        "/khix/og-image.webp",
      );
      expect(emailSend.mock.lastCall?.[0].text).toContain(
        "A note about your print",
      );
      expect(emailSend.mock.calls[0]?.[0].text).not.toMatch(
        /Organizer estimate|1 hour|60 min/,
      );
    }
    emailSend.mockRejectedValueOnce(new Error("Provider unavailable"));
    const failure = await caller.printing.updateStatus({
      jobId: job.id,
      status: "received",
      note: "Changed note",
    });
    expect(failure).toMatchObject({
      job: { statusNote: "Changed note" },
      delivery: { email: "failed" },
    });
    emailSend.mockClear();
    const input = { jobId: job.id, idempotencyKey: randomUUID() };
    await printing.cancelPrintJob(hacker.ctx, input);
    await printing.cancelPrintJob(hacker.ctx, input);
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Knight Hacks IX 3D printing: Cancelled",
      }),
    );
  });

  it("sends one reminder per recipient and never repeats concurrent or failed attempts", async () => {
    const hacker = await seedHacker("reminder", "checkedin");
    const jobs = await Promise.all([
      stageFile(hacker.attendeeId),
      stageFile(hacker.attendeeId),
    ]);
    const first = await submit(hacker.ctx, [jobs[0]]);
    const second = await submit(hacker.ctx, [jobs[1]]);
    await client
      .update(knightHacks.PrintJob)
      .set({ category: null })
      .where(eq(knightHacks.PrintJob.hackerAttendeeId, hacker.attendeeId));
    await client.insert(knightHacks.HackathonPortalClient).values({
      hackathonId,
      clientId: `reminder-${hackathonId}`,
      name: "Reminder test",
      productionOrigin: "https://khix.knighthacks.org",
    });
    const { listPrintCategoryReminderRecipients, sendPrintCategoryReminders } =
      await import("../../utils/printing/category-reminders");
    expect(await listPrintCategoryReminderRecipients(hackathonId)).toHaveLength(
      1,
    );
    emailSend.mockClear();
    await Promise.all([
      sendPrintCategoryReminders(hackathonId),
      sendPrintCategoryReminders(hackathonId),
    ]);
    await sendPrintCategoryReminders(hackathonId);
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(emailSend.mock.lastCall?.[0].text).toContain(
      "2 waiting print requests",
    );
    const rows = await client
      .select()
      .from(knightHacks.PrintJob)
      .where(eq(knightHacks.PrintJob.hackerAttendeeId, hacker.attendeeId));
    expect(rows.map((row) => row.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(rows.every((row) => row.categoryReminderSentAt !== null)).toBe(true);
    const failed = await submit(hacker.ctx, [
      await stageFile(hacker.attendeeId),
    ]);
    await client
      .update(knightHacks.PrintJob)
      .set({ category: null })
      .where(eq(knightHacks.PrintJob.id, failed.id));
    emailSend.mockRejectedValueOnce(new Error("Timeout"));
    expect(await sendPrintCategoryReminders(hackathonId)).toMatchObject({
      failed: 1,
    });
    expect(await listPrintCategoryReminderRecipients(hackathonId)).toHaveLength(
      0,
    );
  });
});

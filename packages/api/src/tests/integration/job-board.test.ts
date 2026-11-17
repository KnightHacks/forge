import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Session } from "@forge/auth/server";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

type DatabaseClient = typeof import("@forge/db/client").db;
type JobBoardSchemas = typeof import("@forge/db/schemas/job-board");

const ALEX = {
  memberId: "20000000-0000-4000-8000-0000000000a1",
  userId: "10000000-0000-4000-8000-0000000000a1",
};
const BLAKE = {
  memberId: "20000000-0000-4000-8000-0000000000b1",
  userId: "10000000-0000-4000-8000-0000000000b1",
};
const NO_PROFILE_USER = "10000000-0000-4000-8000-0000000000c1";

/**
 * The rules here are privacy and ownership filters written in SQL, plus a
 * two-table write that must be one transaction. A mocked `db` verifies none of
 * it. Skips without a loopback `DATABASE_URL`, like the other integration files.
 */
describe.runIf(canRunDatabaseTests())("job board router", () => {
  let disposable: DisposableDatabase | undefined;
  let client: DatabaseClient;
  let jobBoard: JobBoardSchemas;
  let alex: Awaited<ReturnType<typeof callerFor>>;
  let blake: Awaited<ReturnType<typeof callerFor>>;
  let openJobId: string;

  async function callerFor(userId: string) {
    const trpc = await import("../../trpc");
    const { jobBoardRouter } = await import("../../routers/job-board");
    const router = trpc.createTRPCRouter({ jobBoard: jobBoardRouter });

    return trpc.createCallerFactory(router)({
      headers: new Headers(),
      session: { user: { id: userId, name: "Member" } } as Session,
      source: "job-board-integration",
    }).jobBoard;
  }

  function memberRow(actor: typeof ALEX, name: string) {
    return {
      age: 21,
      discordUser: name.toLowerCase(),
      dob: "2003-01-01",
      email: `${name}@knighthacks.org`,
      firstName: name,
      gradDate: "2027-05-01",
      id: actor.memberId,
      lastName: "Member",
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      school: "University of Central Florida" as const,
      shirtSize: "M" as const,
      userId: actor.userId,
    };
  }

  async function insertJob(title: string, active: boolean) {
    const [job] = await client
      .insert(jobBoard.Job)
      .values({
        active,
        applyUrl: "https://example.test/apply",
        companyKey: "acme",
        companyLabel: "Acme",
        identityKey: `test:${title}`,
        inactiveAt: active ? null : new Date(),
        title,
        track: "internship",
      })
      .returning({ id: jobBoard.Job.id });
    if (!job) throw new Error("Job fixture was not inserted");
    return job.id;
  }

  // Search params are typed as raw URL values, so every key is required and
  // `unknown`. Tests name only the filters they exercise.
  const NO_FILTERS = {
    category: undefined,
    cityKey: undefined,
    company: undefined,
    includeInactive: undefined,
    limit: undefined,
    page: undefined,
    postedWithin: undefined,
    query: undefined,
    remoteUs: undefined,
    sort: undefined,
    state: undefined,
    track: undefined,
  };

  function search(
    caller: typeof alex,
    filters: Partial<Record<keyof typeof NO_FILTERS, unknown>> = {},
  ) {
    return caller.searchJobs({ ...NO_FILTERS, ...filters });
  }

  beforeAll(async () => {
    disposable = await provisionDisposableDatabase("forge_api");
    // eslint-disable-next-line no-restricted-properties
    process.env.DATABASE_URL = disposable.url;

    ({ db: client } = await import("@forge/db/client"));
    jobBoard = await import("@forge/db/schemas/job-board");
    const auth = await import("@forge/db/schemas/auth");
    const knightHacks = await import("@forge/db/schemas/knight-hacks");

    await client.insert(auth.User).values([
      { discordUserId: "discord-alex", id: ALEX.userId, name: "Alex" },
      { discordUserId: "discord-blake", id: BLAKE.userId, name: "Blake" },
      { discordUserId: "discord-none", id: NO_PROFILE_USER, name: "None" },
    ]);
    await client
      .insert(knightHacks.Member)
      .values([memberRow(ALEX, "Alex"), memberRow(BLAKE, "Blake")]);

    openJobId = await insertJob("SWE Intern", true);
    await insertJob("Data Intern", false);
    alex = await callerFor(ALEX.userId);
    blake = await callerFor(BLAKE.userId);
  }, 120_000);

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await disposable?.drop();
  }, 30_000);

  it("rejects a signed-in user who has no member profile", async () => {
    const outsider = await callerFor(NO_PROFILE_USER);
    await expect(search(outsider)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      outsider.saveApplication({ jobId: openJobId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("hides inactive jobs from search unless asked, and filters by company", async () => {
    const byDefault = await search(alex, { company: "acme" });
    expect(byDefault.jobs.map((job) => job.id)).toEqual([openJobId]);
    expect(byDefault.total).toBe(1);

    const withInactive = await search(alex, { includeInactive: true });
    expect(withInactive.total).toBe(2);
    expect((await search(alex, { company: "globex" })).total).toBe(0);
    expect((await search(alex, { track: "new_grad" })).total).toBe(0);

    await client.insert(jobBoard.JobLocation).values({
      jobId: openJobId,
      kind: "remote_us",
      sourceText: "Remote - United States",
    });
    const remote = await search(alex, { query: "swe", remoteUs: true });
    expect(remote.jobs).toMatchObject([
      { id: openJobId, locations: [{ kind: "remote_us" }] },
    ]);
    expect((await search(alex, { state: "WA" })).total).toBe(0);
  });

  it("writes a dated history entry for each progress change and none for a notes edit", async () => {
    const saved = await alex.saveApplication({
      jobId: openJobId,
      occurredAt: new Date("2026-10-22T12:00:00Z"),
      privateNotes: "Referred by Sam",
      stage: "applied",
    });
    await expect(
      alex.saveApplication({ jobId: openJobId }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await alex.updateApplication({
      applicationId: saved.id,
      interviewLabel: "Behavioral",
      occurredAt: new Date("2026-11-01T12:00:00Z"),
      round: 1,
      stage: "interviewing",
    });
    const noted = await alex.updateApplication({
      applicationId: saved.id,
      privateNotes: "Onsite next",
    });

    expect(
      noted.history.map(({ changedAt, interviewLabel, round, stage }) => ({
        changedAt: changedAt.toISOString(),
        interviewLabel,
        round,
        stage,
      })),
    ).toEqual([
      {
        changedAt: "2026-10-22T12:00:00.000Z",
        interviewLabel: null,
        round: null,
        stage: "applied",
      },
      {
        changedAt: "2026-11-01T12:00:00.000Z",
        interviewLabel: "Behavioral",
        round: 1,
        stage: "interviewing",
      },
    ]);

    // Moving on from interviewing clears the round and label with it.
    const offered = await alex.updateApplication({
      applicationId: saved.id,
      stage: "offer",
    });
    expect(offered).toMatchObject({ interviewLabel: null, round: null });
    expect(offered.history).toHaveLength(3);
    await expect(
      alex.updateApplication({ applicationId: saved.id, round: 2 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("shows community applications without notes and keeps private ones out of every view", async () => {
    const hidden = await blake.saveApplication({
      jobId: openJobId,
      privateNotes: "Do not share",
      stage: "applied",
      visibility: "private",
    });

    const views = [
      (await blake.getJob({ jobId: openJobId })).peopleInProcess,
      (await blake.getCompany({ company: "acme" })).listings.flatMap(
        (listing) => listing.peopleInProcess,
      ),
      (await blake.listPeopleInProcess({})).people,
    ];
    for (const people of views) {
      expect(people.map((person) => person.memberId)).toEqual([ALEX.memberId]);
      expect(people[0]).toMatchObject({
        discordUser: "alex",
        firstName: "Alex",
        stage: "offer",
      });
      expect(JSON.stringify(people)).not.toMatch(/Onsite next|privateNotes/);
    }

    const mine = await blake.listMyApplications();
    expect(mine).toMatchObject([
      { id: hidden.id, privateNotes: "Do not share", visibility: "private" },
    ]);
    expect(
      (await blake.getJob({ jobId: openJobId })).myApplication,
    ).toMatchObject({ id: hidden.id, privateNotes: "Do not share" });
  });

  it("lets only the owner update or remove an application, and audits the removal without naming the job", async () => {
    const [mine] = await alex.listMyApplications();
    if (!mine) throw new Error("Alex's application is missing");

    await expect(
      blake.updateApplication({ applicationId: mine.id, stage: "rejected" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      blake.removeApplication({ applicationId: mine.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await alex.removeApplication({ applicationId: mine.id });
    expect(await alex.listMyApplications()).toEqual([]);
    const history = await client
      .select({ id: jobBoard.JobApplicationHistory.id })
      .from(jobBoard.JobApplicationHistory)
      .where(eq(jobBoard.JobApplicationHistory.applicationId, mine.id));
    expect(history).toEqual([]);

    const audit = await import("@forge/db/schemas/audit");
    const events = await client
      .select({
        actorUserId: audit.AdminAuditEvent.actorUserId,
        metadata: audit.AdminAuditEvent.metadata,
      })
      .from(audit.AdminAuditEvent)
      .where(
        eq(audit.AdminAuditEvent.actionKey, "job_board.application.removed"),
      );
    expect(events).toEqual([{ actorUserId: ALEX.userId, metadata: {} }]);
  });
});

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
import type * as JobBoardSchema from "@forge/db/schemas/job-board";
import type { DisposableDatabase } from "@forge/db/testing";
import type {
  CareerJobListing,
  CareerJobSourceSnapshot,
} from "@forge/validators";
import { eq, sql } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { ingestJobSnapshot as IngestJobSnapshot } from "../../utils/job-board/ingest";

const INTERN_CHANNEL = "123456789012345678";

function listing(overrides: Partial<CareerJobListing> = {}): CareerJobListing {
  return {
    externalId: "row-1",
    companyLabel: "Acme",
    title: "Software Engineer Intern",
    applyUrl: "https://boards.greenhouse.io/acme/jobs/123",
    locationTexts: ["Orlando, FL"],
    sourceUrl: "https://github.com/simplify/internships",
    sourceData: {},
    ...overrides,
  };
}

function snapshot(
  listings: CareerJobListing[],
  overrides: Partial<CareerJobSourceSnapshot> = {},
): CareerJobSourceSnapshot {
  return {
    source: {
      provider: "github",
      boardKey: "simplify/internships",
      label: "Simplify",
    },
    fetchedAt: new Date(),
    complete: true,
    inventory: "rolling",
    listings,
    ...overrides,
  };
}

const greenhouse = { provider: "greenhouse", boardKey: "acme", label: "Acme" };

describe.skipIf(!canRunDatabaseTests())("job board ingestion", () => {
  let client: typeof db;
  let schema: typeof JobBoardSchema;
  let database: DisposableDatabase;
  let ingest: typeof IngestJobSnapshot;

  /** Runs a snapshot at a later instant than the previous one. */
  let clock = Date.UTC(2026, 10, 1);
  const run = (
    value: CareerJobSourceSnapshot,
    destinations: Parameters<typeof IngestJobSnapshot>[1] = {},
  ) =>
    ingest({ ...value, fetchedAt: new Date((clock += 60_000)) }, destinations);

  const jobs = () => client.select().from(schema.Job);

  beforeAll(async () => {
    database = await provisionDisposableDatabase("forge_job_ingest");
    vi.stubEnv("DATABASE_URL", database.url);
    ({ db: client } = await import("@forge/db/client"));
    schema = await import("@forge/db/schemas/job-board");
    ({ ingestJobSnapshot: ingest } =
      await import("../../utils/job-board/ingest"));
  }, 120_000);

  beforeEach(async () => {
    await client.execute(
      sql`TRUNCATE ${schema.JobLocation}, ${schema.JobObservation}, ${schema.Job}, ${schema.JobSource} CASCADE`,
    );
  });

  afterAll(async () => {
    await client.$client.end().catch(() => undefined);
    await database.drop();
  });

  it("TC-011 keeps a new source's first run silent and records the baseline", async () => {
    const result = await run(snapshot([listing()]), {
      internship: INTERN_CHANNEL,
    });
    expect(result).toMatchObject({ created: 1, baselined: true });

    const [job] = await jobs();
    expect(job).toMatchObject({
      deliveryState: "suppressed",
      track: "internship",
      category: "swe",
      companyKey: "acme",
      identityKey: "ats:greenhouse:123",
    });
    const [source] = await client.select().from(schema.JobSource);
    expect(source?.baselineCompletedAt).not.toBeNull();
    const [location] = await client.select().from(schema.JobLocation);
    expect(location).toMatchObject({
      kind: "city",
      cityKey: "12-53000",
      state: "FL",
    });
  });

  it("TC-012/TC-013 queues new jobs after the baseline only when the track has a channel", async () => {
    await run(snapshot([]));
    await run(
      snapshot([
        listing({ externalId: "a" }),
        listing({
          externalId: "b",
          track: "new_grad",
          applyUrl: "https://acme.com/jobs/ng",
          title: "Software Engineer, New Grad",
        }),
      ]),
      { internship: INTERN_CHANNEL, new_grad: null },
    );

    const byTrack = Object.fromEntries(
      (await jobs()).map((job) => [job.track, job]),
    );
    expect(byTrack.internship).toMatchObject({
      deliveryState: "pending",
      deliveryTrack: "internship",
      discordChannelId: INTERN_CHANNEL,
    });
    expect(byTrack.new_grad).toMatchObject({ deliveryState: "suppressed" });
  });

  it("TC-009 merges the same job seen from two sources", async () => {
    await run(snapshot([listing()]));
    await run(
      snapshot(
        [
          listing({
            externalId: "gh-123",
            sourceUrl: "https://boards.greenhouse.io/acme",
          }),
        ],
        {
          source: greenhouse,
          inventory: "full",
        },
      ),
    );

    expect(await jobs()).toHaveLength(1);
    expect(await client.select().from(schema.JobObservation)).toHaveLength(2);
  });

  it("TC-010 is idempotent for an unchanged source", async () => {
    await run(snapshot([listing()]));
    const [before] = await jobs();
    const result = await run(snapshot([listing()]));
    const [after] = await jobs();

    expect(result).toMatchObject({ created: 0, updated: 1, baselined: false });
    expect(after?.lastSeenAt.getTime()).toBeGreaterThan(
      before?.lastSeenAt.getTime() ?? 0,
    );
    expect({ ...after, lastSeenAt: null }).toEqual({
      ...before,
      lastSeenAt: null,
    });
    expect(await client.select().from(schema.JobLocation)).toHaveLength(1);
  });

  it("TC-014/TC-016 closes jobs missing from a full inventory and reopens them silently", async () => {
    const board = (listings: CareerJobListing[]) =>
      snapshot(listings, { source: greenhouse, inventory: "full" });
    await run(board([listing()]));

    const closed = await run(board([]));
    expect(closed.deactivated).toBe(1);
    expect((await jobs())[0]).toMatchObject({ active: false });

    await run(board([listing()]), { internship: INTERN_CHANNEL });
    expect((await jobs())[0]).toMatchObject({
      active: true,
      inactiveAt: null,
      deliveryState: "suppressed",
    });
  });

  it("TC-015 never closes jobs missing from a rolling feed", async () => {
    await run(snapshot([listing()]));
    const result = await run(snapshot([]));
    expect(result.deactivated).toBe(0);
    expect((await jobs())[0]).toMatchObject({ active: true });
  });

  it("keeps a job open while another source still lists it", async () => {
    await run(snapshot([listing()]));
    await run(
      snapshot([listing({ externalId: "gh" })], {
        source: greenhouse,
        inventory: "full",
      }),
    );
    await run(snapshot([], { source: greenhouse, inventory: "full" }));
    expect((await jobs())[0]).toMatchObject({ active: true });
  });

  it("TC-017/TC-018 keeps the first track and prefers the employer link", async () => {
    await run(
      snapshot([
        listing({
          applyUrl: "https://simplify.jobs/p/1",
          externalId: "x",
          title: "Intern",
        }),
      ]),
    );
    const [first] = await jobs();
    expect(first?.applyUrl).toBe("https://simplify.jobs/p/1");

    // Same source row, now pointing at the employer and claiming new grad.
    await run(
      snapshot([
        listing({
          externalId: "x",
          track: "new_grad",
          applyUrl: "https://acme.com/jobs/1",
          title: "Software Engineer Intern",
        }),
      ]),
    );
    const [job] = await jobs();
    expect(job).toMatchObject({
      id: first?.id,
      track: "internship",
      applyUrl: "https://acme.com/jobs/1",
      title: "Software Engineer Intern",
    });
  });

  it("TC-019 links an approved Guild company by alias without creating one", async () => {
    const { Company } = await import("@forge/db/schemas/knight-hacks");
    const [company] = await client
      .insert(Company)
      .values({
        displayName: "Acme Corporation",
        normalizedDisplayName: "acme corporation",
        aliases: ["Acme"],
        reviewState: "approved",
      })
      .returning();

    await run(snapshot([listing()]));
    expect((await jobs())[0]?.companyId).toBe(company?.id);
    expect(await client.select().from(Company)).toHaveLength(1);
    await client.delete(Company).where(eq(Company.id, company?.id ?? ""));
  });

  it("counts rejected listings by reason", async () => {
    const result = await run(
      snapshot([
        listing({ externalId: "senior", title: "Senior Engineer" }),
        listing({ externalId: "uk", locationTexts: ["London, UK"] }),
      ]),
    );
    expect(result.rejected).toEqual({ not_student_role: 1, non_us: 1 });
    expect(await jobs()).toHaveLength(0);
  });

  it("TC-NEG-001 rejects an incomplete snapshot before writing", async () => {
    await expect(
      run(snapshot([listing()], { complete: false })),
    ).rejects.toThrow(/incomplete/);
    expect(await client.select().from(schema.JobSource)).toHaveLength(0);
  });

  it("TC-NEG-002 creates one job when two sources ingest the same identity at once", async () => {
    await Promise.all([
      run(snapshot([listing()])),
      run(
        snapshot([listing({ externalId: "gh" })], {
          source: greenhouse,
          inventory: "full",
        }),
      ),
    ]);
    expect(await jobs()).toHaveLength(1);
    expect(await client.select().from(schema.JobObservation)).toHaveLength(2);
  });
});

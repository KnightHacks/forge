import { z } from "zod";

import type { JOB_BOARD } from "@forge/consts";
import type { CareerJobSourceSnapshot } from "@forge/validators";
import { and, eq, inArray, isNull, lt, notExists, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Job,
  JobLocation,
  JobObservation,
  JobSource,
} from "@forge/db/schemas/job-board";
import { Company } from "@forge/db/schemas/knight-hacks";
import {
  careerJobListingSchema,
  careerJobSourceSnapshotSchema,
} from "@forge/validators";

import type { TransactionDb } from "../db";
import type { ListingRejection, PreparedListing } from "./listing";
import { prepareListing } from "./listing";
import { companyKey, identityHash, preferredApplyUrl } from "./normalize";

/** Discord channel per track, read by cron from the Career config keys (#648). */
export type JobDestinations = Partial<
  Record<JOB_BOARD.JobTrack, string | null>
>;

export interface JobIngestResult {
  created: number;
  updated: number;
  rejected: Partial<Record<ListingRejection, number>>;
  deactivated: number;
  /** True when this run completed the source's silent first-run baseline. */
  baselined: boolean;
}

const DISCORD_ID = /^[0-9]{17,20}$/;

// The snapshot envelope is checked whole; each listing is checked on its own
// so one malformed listing is counted as rejected instead of failing the board.
const snapshotEnvelopeSchema = careerJobSourceSnapshotSchema.extend({
  listings: z.array(z.unknown()),
});

/** A hash collision on a different raw key: never overwrite, always surface. */
class IdentityMismatchError extends Error {}

async function findOrCreateSource(source: CareerJobSourceSnapshot["source"]) {
  const boardKeyHash = identityHash(source.boardKey);
  await db
    .insert(JobSource)
    .values(source)
    .onConflictDoNothing({
      target: [JobSource.provider, JobSource.boardKeyHash],
    });
  const [row] = await db
    .select()
    .from(JobSource)
    .where(
      and(
        eq(JobSource.provider, source.provider),
        eq(JobSource.boardKeyHash, boardKeyHash),
      ),
    );
  if (row?.boardKey !== source.boardKey) {
    throw new IdentityMismatchError(
      `Job source ${source.provider} board key does not match its hash.`,
    );
  }
  return row;
}

/** Approved Guild companies by normalized display name and alias. Never creates one. */
async function loadCompanyIds() {
  const companies = await db
    .select({
      id: Company.id,
      normalizedDisplayName: Company.normalizedDisplayName,
      aliases: Company.aliases,
    })
    .from(Company)
    .where(eq(Company.reviewState, "approved"));
  const ids = new Map<string, string>();
  for (const company of companies) {
    for (const alias of company.aliases) {
      const key = companyKey(alias);
      if (key) ids.set(key, company.id);
    }
  }
  // Display names win over aliases that collide with them.
  for (const company of companies) {
    const key = companyKey(company.normalizedDisplayName);
    if (key) ids.set(key, company.id);
  }
  return ids;
}

/** The existing job for a listing: by its observation first, then by identity. */
async function findJob(
  tx: TransactionDb,
  sourceId: string,
  listing: PreparedListing,
) {
  const [observation] = await tx
    .select({
      jobId: JobObservation.jobId,
      externalId: JobObservation.externalId,
    })
    .from(JobObservation)
    .where(
      and(
        eq(JobObservation.sourceId, sourceId),
        eq(JobObservation.externalIdHash, identityHash(listing.externalId)),
      ),
    );
  if (observation && observation.externalId !== listing.externalId) {
    throw new IdentityMismatchError(
      "Observation external ID does not match its hash.",
    );
  }

  const condition = observation
    ? eq(Job.id, observation.jobId)
    : inArray(Job.identityHash, listing.identityKeys.map(identityHash));
  const jobs = await tx.select().from(Job).where(condition).for("update");
  if (
    !observation &&
    jobs.some((job) => !listing.identityKeys.includes(job.identityKey))
  ) {
    throw new IdentityMismatchError(
      "Job identity key does not match its hash.",
    );
  }
  // Prefer the job matched by the strongest key.
  return (
    listing.identityKeys
      .map((key) => jobs.find((job) => job.identityKey === key))
      .find(Boolean) ?? jobs[0]
  );
}

async function ingestListing(
  sourceId: string,
  listing: PreparedListing,
  context: {
    seenAt: Date;
    baselined: boolean;
    destinations: JobDestinations;
    companyIds: Map<string, string>;
  },
) {
  return db.transaction(async (tx) => {
    const { seenAt } = context;
    const companyId = context.companyIds.get(listing.companyKey) ?? null;
    let job = await findJob(tx, sourceId, listing);
    let created = false;

    if (!job) {
      const channel = context.destinations[listing.track];
      // Before the baseline, or with no channel for the track, jobs stay suppressed.
      const delivery =
        context.baselined && channel
          ? {
              deliveryState: "pending" as const,
              deliveryTrack: listing.track,
              discordChannelId: channel,
            }
          : {};
      const identityKey = listing.identityKeys[0];
      const [inserted] = await tx
        .insert(Job)
        .values({
          identityKey,
          companyId,
          companyLabel: listing.companyLabel,
          companyKey: listing.companyKey,
          title: listing.title,
          track: listing.track,
          category: listing.category,
          applyUrl: listing.applyUrl,
          description: listing.description,
          compensation: listing.compensation,
          workArrangement: listing.workArrangement,
          postedAt: listing.postedAt,
          firstSeenAt: seenAt,
          lastSeenAt: seenAt,
          ...delivery,
        })
        .onConflictDoNothing({ target: Job.identityHash })
        .returning();
      if (inserted) {
        job = inserted;
        created = true;
      } else {
        // A concurrent ingest inserted the same identity first. Its row may
        // already be stale or closed, so it goes through the update below.
        job = await findJob(tx, sourceId, listing);
        if (!job)
          throw new Error(
            `Job ${identityKey} vanished after an insert conflict.`,
          );
      }
    }

    if (!created) {
      // Track and first-seen never change; a reactivated job is not reposted.
      // A snapshot fetched before the job closed is stale and must not reopen
      // it, and one fetched before the job was last seen must not replace its
      // details with older ones.
      const reopen = job.inactiveAt === null || job.inactiveAt < seenAt;
      const fresh = seenAt >= job.lastSeenAt;
      await tx
        .update(Job)
        .set({
          ...(fresh && {
            title: listing.title,
            category: listing.category,
            applyUrl: preferredApplyUrl(job.applyUrl, listing.applyUrl),
            description: listing.description ?? job.description,
            compensation: listing.compensation ?? job.compensation,
            workArrangement: listing.workArrangement ?? job.workArrangement,
            postedAt: listing.postedAt ?? job.postedAt,
          }),
          companyId: job.companyId ?? companyId,
          lastSeenAt: sql`greatest(${Job.lastSeenAt}, ${seenAt})`,
          ...(reopen && { active: true, inactiveAt: null }),
        })
        .where(eq(Job.id, job.id));
    }

    await tx
      .insert(JobObservation)
      .values({
        sourceId,
        jobId: job.id,
        externalId: listing.externalId,
        sourceUrl: listing.sourceUrl,
        sourceData: listing.sourceData,
        postedAt: listing.postedAt,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
      })
      .onConflictDoUpdate({
        target: [JobObservation.sourceId, JobObservation.externalIdHash],
        set: {
          sourceUrl: listing.sourceUrl,
          sourceData: listing.sourceData,
          postedAt: listing.postedAt,
          lastSeenAt: sql`greatest(${JobObservation.lastSeenAt}, ${seenAt})`,
          // Same stale-snapshot rule as the job: reopen only if seen after closing.
          inactiveAt: sql`case when ${JobObservation.inactiveAt} < ${seenAt} then null else ${JobObservation.inactiveAt} end`,
        },
      });

    const known = new Set(
      (
        await tx
          .select({ sourceText: JobLocation.sourceText })
          .from(JobLocation)
          .where(eq(JobLocation.jobId, job.id))
      ).map((row) => row.sourceText),
    );
    const additions = listing.locations.filter((location) => {
      if (known.has(location.sourceText)) return false;
      known.add(location.sourceText);
      return true;
    });
    if (additions.length > 0) {
      await tx
        .insert(JobLocation)
        .values(additions.map((location) => ({ ...location, jobId: job.id })));
    }

    return created;
  });
}

/** Closes this source's observations missing from a full inventory, then their jobs. */
async function closeMissing(sourceId: string, seenAt: Date) {
  const missing = and(
    eq(JobObservation.sourceId, sourceId),
    isNull(JobObservation.inactiveAt),
    lt(JobObservation.lastSeenAt, seenAt),
  );
  return db.transaction(async (tx) => {
    const candidates = await tx
      .selectDistinct({ jobId: JobObservation.jobId })
      .from(JobObservation)
      .where(missing);
    if (candidates.length === 0) return 0;

    // Lock the jobs first, in a statement of their own and in id order, like
    // the listing transactions do. Two sources closing the last two open
    // observations of one job then run one after the other, so the second
    // sees the first's closure and deactivates the job.
    await tx
      .select({ id: Job.id })
      .from(Job)
      .where(
        inArray(
          Job.id,
          candidates.map((row) => row.jobId),
        ),
      )
      .orderBy(Job.id)
      .for("update");

    const closed = await tx
      .update(JobObservation)
      .set({ inactiveAt: seenAt })
      .where(missing)
      .returning({ jobId: JobObservation.jobId });
    const jobIds = [...new Set(closed.map((row) => row.jobId))];
    if (jobIds.length === 0) return 0;

    const openObservation = tx
      .select({ id: JobObservation.id })
      .from(JobObservation)
      .where(
        and(
          eq(JobObservation.jobId, Job.id),
          isNull(JobObservation.inactiveAt),
        ),
      );
    const deactivated = await tx
      .update(Job)
      .set({ active: false, inactiveAt: seenAt })
      .where(
        and(
          inArray(Job.id, jobIds),
          eq(Job.active, true),
          notExists(openObservation),
        ),
      )
      .returning({ id: Job.id });
    return deactivated.length;
  });
}

/**
 * Turns one source's snapshot into deduplicated jobs (#649). Cron-only: see
 * `@forge/api/job-board.server`. Throws on an incomplete snapshot or a DB
 * failure, leaving the baseline unset so the next run is still silent.
 */
export async function ingestJobSnapshot(
  input: CareerJobSourceSnapshot,
  destinations: JobDestinations,
): Promise<JobIngestResult> {
  const snapshot = snapshotEnvelopeSchema.parse(input);
  if (!snapshot.complete) {
    throw new Error(
      `Job source ${snapshot.source.provider}:${snapshot.source.boardKey} sent an incomplete snapshot.`,
    );
  }
  for (const [track, channel] of Object.entries(destinations)) {
    if (channel && !DISCORD_ID.test(channel)) {
      throw new Error(
        `Career ${track} channel "${channel}" is not a Discord ID.`,
      );
    }
  }

  const source = await findOrCreateSource(snapshot.source);
  const context = {
    seenAt: snapshot.fetchedAt,
    baselined: source.baselineCompletedAt !== null,
    destinations,
    companyIds: await loadCompanyIds(),
  };
  const result: JobIngestResult = {
    created: 0,
    updated: 0,
    rejected: {},
    deactivated: 0,
    baselined: false,
  };

  for (const raw of snapshot.listings) {
    const parsed = careerJobListingSchema.safeParse(raw);
    // A rejected listing counts as unseen, so a full inventory closes its job.
    const prepared = parsed.success
      ? prepareListing(parsed.data, source)
      : { ok: false as const, reason: "invalid_listing" as const };
    if (!prepared.ok) {
      result.rejected[prepared.reason] =
        (result.rejected[prepared.reason] ?? 0) + 1;
      continue;
    }
    if (await ingestListing(source.id, prepared.listing, context))
      result.created++;
    else result.updated++;
  }

  if (snapshot.inventory === "full") {
    result.deactivated = await closeMissing(source.id, snapshot.fetchedAt);
  }

  const now = new Date();
  await db
    .update(JobSource)
    .set({
      baselineCompletedAt: source.baselineCompletedAt ?? now,
      lastSuccessAt: now,
    })
    .where(eq(JobSource.id, source.id));
  result.baselined = source.baselineCompletedAt === null;
  return result;
}

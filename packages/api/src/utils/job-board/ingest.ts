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
  careerJobSourceSnapshotSchema,
  normalizeCompanyName,
} from "@forge/validators";

import type { TransactionDb } from "../db";
import type { ListingRejection, PreparedListing } from "./listing";
import { prepareListing } from "./listing";
import { identityHash, preferredApplyUrl } from "./normalize";

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
      ids.set(normalizeCompanyName(alias), company.id);
    }
  }
  // Display names win over aliases that collide with them.
  for (const company of companies) {
    ids.set(company.normalizedDisplayName, company.id);
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
      const identityKey = listing.identityKeys[0] ?? listing.externalId;
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
      // A concurrent ingest inserted the same identity first; use its row.
      job = inserted ?? (await findJob(tx, sourceId, listing));
      if (!job)
        throw new Error(
          `Job ${identityKey} vanished after an insert conflict.`,
        );
      created = Boolean(inserted);
    } else {
      // Track and first-seen never change; a reactivated job is not reposted.
      await tx
        .update(Job)
        .set({
          title: listing.title,
          category: listing.category,
          applyUrl: preferredApplyUrl(job.applyUrl, listing.applyUrl),
          description: listing.description ?? job.description,
          compensation: listing.compensation ?? job.compensation,
          workArrangement: listing.workArrangement ?? job.workArrangement,
          postedAt: listing.postedAt ?? job.postedAt,
          companyId: job.companyId ?? companyId,
          lastSeenAt: sql`greatest(${Job.lastSeenAt}, ${seenAt})`,
          active: true,
          inactiveAt: null,
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
          inactiveAt: null,
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
  return db.transaction(async (tx) => {
    const closed = await tx
      .update(JobObservation)
      .set({ inactiveAt: seenAt })
      .where(
        and(
          eq(JobObservation.sourceId, sourceId),
          isNull(JobObservation.inactiveAt),
          lt(JobObservation.lastSeenAt, seenAt),
        ),
      )
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
  const snapshot = careerJobSourceSnapshotSchema.parse(input);
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
    const prepared = prepareListing(raw, source);
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

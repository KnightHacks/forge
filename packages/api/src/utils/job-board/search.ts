import type { SQL } from "@forge/db";
import type { JobSearchInput } from "@forge/validators";
import { JOB_BOARD } from "@forge/consts";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  Job,
  JobLocation,
  JobObservation,
  JobSource,
} from "@forge/db/schemas/job-board";

import { getUsCity } from "../career/us-cities";

const DAY_MS = 24 * 60 * 60 * 1000;

/** `%` and `_` are typed by members as text, not as wildcards. */
export function containsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

function locationCondition(input: JobSearchInput): SQL | undefined {
  // Location filters widen each other: a member who picks Orlando and U.S.
  // remote wants jobs in either, not jobs that are somehow both.
  const matches: SQL[] = [];
  if (input.cityKey) matches.push(eq(JobLocation.cityKey, input.cityKey));
  if (input.state) matches.push(eq(JobLocation.state, input.state));
  if (input.remoteUs) matches.push(eq(JobLocation.kind, "remote_us"));
  if (matches.length === 0) return undefined;

  return exists(
    db
      .select({ id: JobLocation.id })
      .from(JobLocation)
      .where(and(eq(JobLocation.jobId, Job.id), or(...matches))),
  );
}

export function jobSearchConditions(
  input: JobSearchInput,
  now = new Date(),
): SQL | undefined {
  const conditions: (SQL | undefined)[] = [locationCondition(input)];

  if (!input.includeInactive) conditions.push(eq(Job.active, true));
  if (input.track) conditions.push(eq(Job.track, input.track));
  if (input.category) conditions.push(eq(Job.category, input.category));
  if (input.company) conditions.push(eq(Job.companyKey, input.company));
  if (input.postedWithin) {
    // A job with no source posted date fails this comparison and drops out.
    const days = JOB_BOARD.JOB_POSTED_WITHIN_DAYS[input.postedWithin];
    conditions.push(gte(Job.postedAt, new Date(now.getTime() - days * DAY_MS)));
  }
  if (input.query) {
    const pattern = containsPattern(input.query);
    conditions.push(
      or(ilike(Job.title, pattern), ilike(Job.companyLabel, pattern)),
    );
  }

  return and(...conditions);
}

// Every ordering ends on the primary key so pages never repeat or skip a job
// when two rows tie on the visible sort column.
export function jobSearchOrder(sort: JOB_BOARD.JobSort): SQL[] {
  switch (sort) {
    case "company":
      return [asc(Job.companyKey), asc(Job.title), asc(Job.id)];
    case "recently_posted":
      return [
        sql`${Job.postedAt} DESC NULLS LAST`,
        desc(Job.firstSeenAt),
        asc(Job.id),
      ];
    case "newest":
      return [desc(Job.firstSeenAt), asc(Job.id)];
  }
}

/** What members may see of a listing. Delivery and identity state stay out. */
export const jobSummaryColumns = {
  active: Job.active,
  applyUrl: Job.applyUrl,
  category: Job.category,
  companyId: Job.companyId,
  companyKey: Job.companyKey,
  companyLabel: Job.companyLabel,
  compensation: Job.compensation,
  firstSeenAt: Job.firstSeenAt,
  id: Job.id,
  inactiveAt: Job.inactiveAt,
  postedAt: Job.postedAt,
  title: Job.title,
  track: Job.track,
  workArrangement: Job.workArrangement,
} as const;

export async function listJobLocations(jobIds: readonly string[]) {
  const byJob = new Map<string, JobLocationView[]>();
  if (jobIds.length === 0) return byJob;

  const rows = await db
    .select({
      cityKey: JobLocation.cityKey,
      jobId: JobLocation.jobId,
      kind: JobLocation.kind,
      sourceText: JobLocation.sourceText,
      state: JobLocation.state,
    })
    .from(JobLocation)
    .where(inArray(JobLocation.jobId, [...jobIds]))
    .orderBy(asc(JobLocation.sourceText), asc(JobLocation.id));

  for (const { jobId, ...location } of rows) {
    const locations = byJob.get(jobId) ?? [];
    locations.push({
      ...location,
      cityName: location.cityKey
        ? (getUsCity(location.cityKey)?.name ?? null)
        : null,
    });
    byJob.set(jobId, locations);
  }
  return byJob;
}

export interface JobLocationView {
  cityKey: string | null;
  cityName: string | null;
  kind: JOB_BOARD.JobLocationKind;
  sourceText: string;
  state: string | null;
}

/** Where a listing was found, so members can judge and follow the source. */
export async function listJobSources(jobId: string) {
  return await db
    .select({
      label: JobSource.label,
      provider: JobSource.provider,
      sourceUrl: JobObservation.sourceUrl,
    })
    .from(JobObservation)
    .innerJoin(JobSource, eq(JobSource.id, JobObservation.sourceId))
    .where(eq(JobObservation.jobId, jobId))
    .orderBy(asc(JobSource.label), asc(JobObservation.id));
}

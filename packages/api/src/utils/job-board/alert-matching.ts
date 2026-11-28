import type {
  SelectJob,
  SelectJobAlertPreference,
  SelectJobLocation,
} from "@forge/db/schemas/job-board";
import { eq, inArray } from "@forge/db";
import { User } from "@forge/db/schemas/auth";
import { Job, JobAlertPreference } from "@forge/db/schemas/job-board";
import { Member } from "@forge/db/schemas/knight-hacks";
import {
  discordSnowflakeSchema,
  normalizeCompanyName,
} from "@forge/validators";

import type { WriteDb } from "../db";

type AlertJob = Pick<SelectJob, "companyKey" | "track">;
type AlertLocation = Pick<SelectJobLocation, "kind" | "cityKey" | "sourceText">;
type AlertPreference = Pick<
  SelectJobAlertPreference,
  "memberId" | "track" | "kind" | "targetKey" | "customValue"
>;

/** Each preference can match independently within its track. */
export function matchAlertMemberIds(
  job: AlertJob,
  locations: readonly AlertLocation[],
  preferences: readonly AlertPreference[],
): string[] {
  const locationKeys = new Set<string>();
  for (const { kind, cityKey } of locations) {
    if (kind === "city" && cityKey) locationKeys.add(cityKey);
    if (kind === "remote_us") locationKeys.add(kind);
  }

  // Padding protects both ends of the phrase, including single-word targets.
  const sourceTexts = locations.map(
    ({ sourceText }) => ` ${normalizeCompanyName(sourceText)} `,
  );

  const memberIds = new Set<string>();
  for (const preference of preferences) {
    const { memberId, track, kind, targetKey, customValue } = preference;
    if (track !== job.track || memberIds.has(memberId)) continue;

    if (kind === "company") {
      if (job.companyKey === targetKey) memberIds.add(memberId);
    } else if (customValue === null) {
      if (locationKeys.has(targetKey)) memberIds.add(memberId);
    } else if (
      sourceTexts.some((source) => source.includes(` ${targetKey} `))
    ) {
      memberIds.add(memberId);
    }
  }
  return [...memberIds];
}

/** Resolve notification recipients for one job without sending any messages. */
export async function findAlertRecipientsForJob(db: WriteDb, jobId: string) {
  const job = await db.query.Job.findFirst({
    where: eq(Job.id, jobId),
    columns: { companyKey: true, track: true },
    with: {
      locations: { columns: { kind: true, cityKey: true, sourceText: true } },
    },
  });
  if (!job) return [];

  const preferences = await db
    .select({
      memberId: JobAlertPreference.memberId,
      track: JobAlertPreference.track,
      kind: JobAlertPreference.kind,
      targetKey: JobAlertPreference.targetKey,
      customValue: JobAlertPreference.customValue,
    })
    .from(JobAlertPreference)
    .where(eq(JobAlertPreference.track, job.track));
  const memberIds = matchAlertMemberIds(job, job.locations, preferences);
  if (memberIds.length === 0) return [];

  const users = await db
    .select({ discordUserId: User.discordUserId })
    .from(Member)
    .innerJoin(User, eq(User.id, Member.userId))
    .where(inArray(Member.id, memberIds));

  const discordUserIds = new Set<string>();
  for (const { discordUserId } of users) {
    if (discordSnowflakeSchema.safeParse(discordUserId).success) {
      discordUserIds.add(discordUserId);
    }
  }
  return [...discordUserIds].sort();
}

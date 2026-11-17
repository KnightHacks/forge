import type { SQL } from "@forge/db";
import { and, asc, count, desc, eq, ne } from "@forge/db";
import { db } from "@forge/db/client";
import { Job, JobApplication } from "@forge/db/schemas/job-board";
import { Member } from "@forge/db/schemas/knight-hacks";

import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "../profile-picture/security";
import { profilePictureStorageClient } from "../profile-picture/storage";

/**
 * The only way another member's application leaves the API.
 *
 * The visibility filter is applied here rather than by each caller, and
 * `privateNotes` is not selected at all, so a new community view cannot forget
 * either rule. Notes stay private even on a community-visible application.
 *
 * A `saved` application is a bookmark, not part of anyone's process, so it is
 * never shown to other members whatever its visibility.
 */
const communityColumns = {
  applicationId: JobApplication.id,
  companyKey: Job.companyKey,
  companyLabel: Job.companyLabel,
  discordUser: Member.discordUser,
  firstName: Member.firstName,
  interviewLabel: JobApplication.interviewLabel,
  jobId: JobApplication.jobId,
  jobTitle: Job.title,
  lastName: Member.lastName,
  memberId: Member.id,
  profilePictureReference: Member.profilePictureUrl,
  round: JobApplication.round,
  stage: JobApplication.stage,
  track: Job.track,
  updatedAt: JobApplication.updatedAt,
  userId: Member.userId,
} as const;

function communityWhere(filter: SQL | undefined) {
  return and(
    eq(JobApplication.visibility, "community"),
    ne(JobApplication.stage, "saved"),
    filter,
  );
}

async function profilePictureUrl(reference: string | null, userId: string) {
  if (!reference) return null;
  const objectName = resolveProfilePictureObjectName(reference, userId);
  if (!objectName) return null;

  try {
    return await profilePictureStorageClient.presignedUrl(
      "GET",
      PROFILE_PICTURE_BUCKET_NAME,
      objectName,
      60 * 60,
    );
  } catch {
    return null;
  }
}

export async function listCommunityApplications(
  filter: SQL | undefined,
  page?: { limit: number; offset: number },
) {
  const query = db
    .select(communityColumns)
    .from(JobApplication)
    .innerJoin(Job, eq(Job.id, JobApplication.jobId))
    .innerJoin(Member, eq(Member.id, JobApplication.memberId))
    .where(communityWhere(filter))
    .orderBy(desc(JobApplication.updatedAt), asc(JobApplication.id));
  const rows = await (page
    ? query.limit(page.limit).offset(page.offset)
    : query);

  return await Promise.all(
    rows.map(async ({ profilePictureReference, userId, ...row }) => ({
      ...row,
      profilePictureUrl: await profilePictureUrl(
        profilePictureReference,
        userId,
      ),
    })),
  );
}

export async function countCommunityApplications(filter: SQL | undefined) {
  const [row] = await db
    .select({ total: count() })
    .from(JobApplication)
    .innerJoin(Job, eq(Job.id, JobApplication.jobId))
    .where(communityWhere(filter));
  return row?.total ?? 0;
}

export type CommunityApplication = Awaited<
  ReturnType<typeof listCommunityApplications>
>[number];

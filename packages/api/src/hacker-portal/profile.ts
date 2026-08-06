import type { HackerProfileFields } from "@forge/hacker-sdk/contracts";
import { and, eq, gt, inArray, notInArray } from "@forge/db";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerProfile,
  HackerProfileRevision,
} from "@forge/db/schemas/knight-hacks";

import type { TransactionDb } from "../utils/db";
import { deriveAgeOnDate } from "../utils/hacker-portal/policy";
import { portalFailure } from "./trpc";

export function deriveDiscordProfileIdentity(input: {
  discordUserId: string;
  name: string | null;
}) {
  const displayName = input.name?.trim();
  return displayName === undefined || displayName.length === 0
    ? input.discordUserId
    : displayName;
}

export function revisionValues(
  profileId: string,
  revision: number,
  fields: HackerProfileFields,
  userId: string,
) {
  return { ...fields, createdBy: userId, profileId, revision };
}

export function legacyHackerValues(
  fields: HackerProfileFields,
  input: {
    firstTime: boolean;
    survey1: string;
    survey2: string;
    userId: string;
  },
  at = new Date(),
) {
  return {
    ...fields,
    age: deriveAgeOnDate(fields.dob, at) ?? 0,
    agreesToMLHCodeOfConduct: false,
    agreesToMLHDataSharing: false,
    agreesToReceiveEmailsFromMLH: false,
    isFirstTime: input.firstTime,
    survey1: input.survey1,
    survey2: input.survey2,
    userId: input.userId,
  };
}

export async function lockMutableFutureProfileApplications({
  now,
  profileId,
  tx,
}: {
  now: Date;
  profileId: string;
  tx: TransactionDb;
}) {
  return tx
    .select({
      attendeeId: HackerAttendee.id,
      hackerId: HackerAttendee.hackerId,
    })
    .from(HackerAttendee)
    .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId))
    .where(
      and(
        eq(HackerAttendee.profileId, profileId),
        gt(Hackathon.startDate, now),
        notInArray(HackerAttendee.status, ["denied", "withdrawn"]),
      ),
    )
    .for("update", { of: HackerAttendee });
}

export async function createOrReviseProfile({
  expectedRevision,
  fields,
  now,
  tx,
  userId,
}: {
  expectedRevision?: number;
  fields: HackerProfileFields;
  now: Date;
  tx: TransactionDb;
  userId: string;
}) {
  const [current] = await tx
    .select()
    .from(HackerProfile)
    .where(eq(HackerProfile.userId, userId))
    .for("update")
    .limit(1);
  if (!current) {
    const [profile] = await tx
      .insert(HackerProfile)
      .values({ ...fields, revision: 1, userId })
      .returning();
    if (!profile) throw new Error("Failed to create hacker profile.");
    const [revision] = await tx
      .insert(HackerProfileRevision)
      .values(revisionValues(profile.id, 1, fields, userId))
      .returning();
    if (!revision) throw new Error("Failed to create hacker profile revision.");
    return { changed: true, profile, revision };
  }

  if (expectedRevision !== undefined && current.revision !== expectedRevision) {
    portalFailure(
      "STALE_PROFILE_REVISION",
      "This profile changed since it was loaded. Refresh and try again.",
      { trpcCode: "CONFLICT" },
    );
  }
  const comparable = Object.fromEntries(
    Object.keys(fields).map((key) => [
      key,
      current[key as keyof typeof current],
    ]),
  );
  if (JSON.stringify(comparable) === JSON.stringify(fields)) {
    const [revision] = await tx
      .select()
      .from(HackerProfileRevision)
      .where(
        and(
          eq(HackerProfileRevision.profileId, current.id),
          eq(HackerProfileRevision.revision, current.revision),
        ),
      )
      .limit(1);
    if (!revision)
      throw new Error("Current hacker profile revision is missing.");
    return { changed: false, profile: current, revision };
  }

  const nextRevision = current.revision + 1;
  const [profile] = await tx
    .update(HackerProfile)
    .set({ ...fields, revision: nextRevision, updatedAt: now })
    .where(eq(HackerProfile.id, current.id))
    .returning();
  const [revision] = await tx
    .insert(HackerProfileRevision)
    .values({
      ...revisionValues(current.id, nextRevision, fields, userId),
      resumeUrl: current.resumeUrl,
    })
    .returning();
  if (!profile || !revision)
    throw new Error("Failed to revise hacker profile.");

  const futureApplications = await lockMutableFutureProfileApplications({
    now,
    profileId: current.id,
    tx,
  });
  if (futureApplications.length > 0) {
    await tx
      .update(HackerAttendee)
      .set({ profileRevisionId: revision.id })
      .where(
        inArray(
          HackerAttendee.id,
          futureApplications.map((row) => row.attendeeId),
        ),
      );
    await tx
      .update(Hacker)
      .set({
        ...fields,
        age: deriveAgeOnDate(fields.dob, now) ?? 0,
        resumeUrl: profile.resumeUrl,
      })
      .where(
        inArray(
          Hacker.id,
          futureApplications.map((row) => row.hackerId),
        ),
      );
  }
  return { changed: true, profile, revision };
}

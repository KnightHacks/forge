import type { HackerResumeDto } from "@forge/hacker-sdk/contracts";
import { and, count, eq, inArray, lte, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerParticipantCommand,
  HackerProfile,
  HackerProfileRevision,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { checkUploadContent, RESUME_UPLOAD_POLICY } from "@forge/validators";

import type { HackerPortalContext } from "./trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import {
  createResumeObjectName,
  RESUME_BUCKET_NAME,
} from "../utils/resume/security";
import {
  ensureResumeBucketExists,
  resumeStorageClient,
} from "../utils/resume/storage";
import {
  HACKER_PARTICIPANT_COMMAND_RETENTION_MS,
  runParticipantCommand,
} from "./commands";
import {
  applicationDto,
  loadParticipantApplication,
  loadParticipantProfile,
  loadResumeMetadata,
  profileDto,
} from "./data";
import { lockMutableFutureProfileApplications } from "./profile";
import {
  canEditResumeAt,
  isStaleResumeUploadCommand,
  resumeUploadPayloadHash,
} from "./resume-policy";
import { portalFailure } from "./trpc";

type AuthenticatedPortalContext = HackerPortalContext & {
  client: NonNullable<HackerPortalContext["client"]>;
  session: NonNullable<HackerPortalContext["session"]>;
};

const PROFILE_FIELD_NAMES = [
  "country",
  "discordUser",
  "dob",
  "email",
  "firstName",
  "foodAllergies",
  "gender",
  "githubProfileUrl",
  "gradDate",
  "lastName",
  "levelOfStudy",
  "linkedinProfileUrl",
  "major",
  "phoneNumber",
  "raceOrEthnicity",
  "school",
  "shirtSize",
  "websiteUrl",
] as const;

function revisionProfileFields(profile: typeof HackerProfile.$inferSelect) {
  return Object.fromEntries(
    PROFILE_FIELD_NAMES.map((key) => [key, profile[key]]),
  ) as Pick<typeof profile, (typeof PROFILE_FIELD_NAMES)[number]>;
}

async function mutateResumeReference({
  ctx,
  objectName,
  tx,
}: {
  ctx: AuthenticatedPortalContext;
  objectName: string | null;
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
}) {
  const [hackathon] = await tx
    .select({ databaseNow: sql<Date>`now()`, startDate: Hackathon.startDate })
    .from(Hackathon)
    .where(eq(Hackathon.id, ctx.session.hackathonId))
    .for("update")
    .limit(1);
  const application = await loadParticipantApplication(
    ctx.session.userId,
    ctx.session.hackathonId,
    tx,
  );
  if (!hackathon || !application) {
    portalFailure(
      "APPLICATION_LOCKED",
      "This resume can no longer be changed.",
      { trpcCode: "PRECONDITION_FAILED" },
    );
  }
  const now = new Date(hackathon.databaseNow);
  if (
    !canEditResumeAt({
      now,
      startDate: hackathon.startDate,
      status: application.status,
    })
  ) {
    portalFailure(
      "APPLICATION_LOCKED",
      "This resume can no longer be changed.",
      { trpcCode: "PRECONDITION_FAILED" },
    );
  }
  const [current] = await tx
    .select()
    .from(HackerProfile)
    .where(eq(HackerProfile.userId, ctx.session.userId))
    .for("update")
    .limit(1);
  if (!current) throw new Error("Hacker profile is missing.");
  const nextRevision = current.revision + 1;
  const [profile] = await tx
    .update(HackerProfile)
    .set({ resumeUrl: objectName, revision: nextRevision, updatedAt: now })
    .where(eq(HackerProfile.id, current.id))
    .returning();
  const [revision] = await tx
    .insert(HackerProfileRevision)
    .values({
      ...revisionProfileFields(current),
      createdBy: ctx.session.userId,
      profileId: current.id,
      resumeUrl: objectName,
      revision: nextRevision,
    })
    .returning({ id: HackerProfileRevision.id });
  if (!profile || !revision) throw new Error("Failed to revise hacker resume.");

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
      .set({ resumeUrl: objectName })
      .where(
        inArray(
          Hacker.id,
          futureApplications.map((row) => row.hackerId),
        ),
      );
  }
  return { application, current, profile };
}

export async function getResume(ctx: AuthenticatedPortalContext) {
  const profile = await loadParticipantProfile(ctx.session.userId);
  return loadResumeMetadata(profile?.resumeUrl);
}

async function beginResumeUploadCommand(
  ctx: AuthenticatedPortalContext,
  input: {
    bytes: Uint8Array;
    contentType: string;
    fileName: string;
    idempotencyKey: string;
  },
) {
  const payloadHash = resumeUploadPayloadHash(input);
  return db.transaction(async (tx) => {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + HACKER_PARTICIPANT_COMMAND_RETENTION_MS,
    );
    const [inserted] = await tx
      .insert(HackerParticipantCommand)
      .values({
        expiresAt,
        hackathonId: ctx.session.hackathonId,
        idempotencyKey: input.idempotencyKey,
        operation: "upload_resume",
        payloadHash,
        userId: ctx.session.userId,
      })
      .onConflictDoNothing()
      .returning({ id: HackerParticipantCommand.id });
    if (inserted) return { id: inserted.id, result: null };

    const [existing] = await tx
      .select({
        expiresAt: HackerParticipantCommand.expiresAt,
        id: HackerParticipantCommand.id,
        payloadHash: HackerParticipantCommand.payloadHash,
        result: HackerParticipantCommand.result,
        startedAt: HackerParticipantCommand.startedAt,
        state: HackerParticipantCommand.state,
      })
      .from(HackerParticipantCommand)
      .where(
        and(
          eq(HackerParticipantCommand.userId, ctx.session.userId),
          eq(HackerParticipantCommand.hackathonId, ctx.session.hackathonId),
          eq(HackerParticipantCommand.operation, "upload_resume"),
          eq(HackerParticipantCommand.idempotencyKey, input.idempotencyKey),
        ),
      )
      .for("update")
      .limit(1);
    if (!existing) {
      throw new Error("Resume command conflict row was not found.");
    }
    if (existing.expiresAt <= now) {
      await tx
        .delete(HackerParticipantCommand)
        .where(
          and(
            eq(HackerParticipantCommand.id, existing.id),
            lte(HackerParticipantCommand.expiresAt, now),
          ),
        );
      const [reclaimed] = await tx
        .insert(HackerParticipantCommand)
        .values({
          expiresAt,
          hackathonId: ctx.session.hackathonId,
          idempotencyKey: input.idempotencyKey,
          operation: "upload_resume",
          payloadHash,
          userId: ctx.session.userId,
        })
        .returning({ id: HackerParticipantCommand.id });
      if (!reclaimed) {
        throw new Error("Expired resume command could not be reclaimed.");
      }
      return { id: reclaimed.id, result: null };
    }
    if (existing.payloadHash !== payloadHash) {
      portalFailure(
        "CONFLICT",
        "This idempotency key was already used with a different resume.",
        { trpcCode: "CONFLICT" },
      );
    }
    if (existing.state === "completed" && existing.result) {
      return {
        id: existing.id,
        result: existing.result as HackerResumeDto,
      };
    }
    if (isStaleResumeUploadCommand(existing.startedAt, now)) {
      const [claimed] = await tx
        .update(HackerParticipantCommand)
        .set({
          expiresAt,
          startedAt: now,
        })
        .where(
          and(
            eq(HackerParticipantCommand.id, existing.id),
            eq(HackerParticipantCommand.state, "started"),
            eq(HackerParticipantCommand.startedAt, existing.startedAt),
          ),
        )
        .returning({ id: HackerParticipantCommand.id });
      if (claimed) return { id: claimed.id, result: null };
    }
    portalFailure("CONFLICT", "The matching resume upload is still running.", {
      retryable: true,
      trpcCode: "CONFLICT",
    });
  });
}

export async function uploadResume(
  ctx: AuthenticatedPortalContext,
  input: {
    bytes: Uint8Array;
    contentType: string;
    fileName: string;
    idempotencyKey: string;
  },
) {
  const check = checkUploadContent(RESUME_UPLOAD_POLICY, input);
  if (!check.ok) {
    portalFailure("INVALID_RESUME", check.message, { trpcCode: "BAD_REQUEST" });
  }
  const command = await beginResumeUploadCommand(ctx, input);
  if (command.result) return command.result;

  const objectName = createResumeObjectName(ctx.session.userId);
  await ensureResumeBucketExists();
  await resumeStorageClient.putObject(
    RESUME_BUCKET_NAME,
    objectName,
    Buffer.from(input.bytes),
    input.bytes.length,
    { "Content-Type": "application/pdf" },
  );
  const completedAt = new Date();
  try {
    const completed = await db.transaction(async (tx) => {
      const changed = await mutateResumeReference({ ctx, objectName, tx });
      await createAdminAuditEvent(
        {
          actionKey: changed.current.resumeUrl
            ? "hacker.resume_replaced"
            : "hacker.resume_uploaded",
          actor: { id: ctx.session.userId },
          metadata: {
            byteSize: input.bytes.length,
            hadPrevious: Boolean(changed.current.resumeUrl),
            revision: changed.profile.revision,
          },
          subjects: [
            {
              relation: "primary",
              targetId: changed.profile.id,
              targetLabel: `${changed.profile.firstName} ${changed.profile.lastName}`,
              targetType: "hacker_profile",
            },
          ],
        },
        tx,
      );
      const response: HackerResumeDto = {
        fileName: "Resume.pdf",
        size: input.bytes.length,
        updatedAt: completedAt.toISOString(),
      };
      await tx
        .update(HackerParticipantCommand)
        .set({ completedAt, result: response, state: "completed" })
        .where(eq(HackerParticipantCommand.id, command.id));
      return { previousObjectName: changed.current.resumeUrl, response };
    });
    await removeResumeObjectIfUnreferenced(completed.previousObjectName);
    return completed.response;
  } catch (error) {
    await db
      .delete(HackerParticipantCommand)
      .where(
        and(
          eq(HackerParticipantCommand.id, command.id),
          eq(HackerParticipantCommand.state, "started"),
        ),
      )
      .catch(() => undefined);
    await resumeStorageClient
      .removeObject(RESUME_BUCKET_NAME, objectName)
      .catch(() => undefined);
    throw error;
  }
}

export async function removeResume(
  ctx: AuthenticatedPortalContext,
  input: { idempotencyKey: string },
) {
  const completed = await db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "remove_resume",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const changed = await mutateResumeReference({
          ctx,
          objectName: null,
          tx,
        });
        await createAdminAuditEvent(
          {
            actionKey: "hacker.resume_removed",
            actor: { id: ctx.session.userId },
            metadata: {
              hadPrevious: Boolean(changed.current.resumeUrl),
              revision: changed.profile.revision,
            },
            subjects: [
              {
                relation: "primary",
                targetId: changed.profile.id,
                targetLabel: `${changed.profile.firstName} ${changed.profile.lastName}`,
                targetType: "hacker_profile",
              },
            ],
          },
          tx,
        );
        return {
          previousObjectName: changed.current.resumeUrl,
          response: {
            application: applicationDto(changed.application),
            profile: profileDto(changed.profile),
            requestId: ctx.requestId,
          },
        };
      },
    }),
  );
  await removeResumeObjectIfUnreferenced(completed.previousObjectName);
  return completed.response;
}

async function removeResumeObjectIfUnreferenced(objectName: string | null) {
  if (!objectName) return;
  const references = await Promise.all([
    db
      .select({ value: count() })
      .from(HackerProfile)
      .where(eq(HackerProfile.resumeUrl, objectName)),
    db
      .select({ value: count() })
      .from(HackerProfileRevision)
      .innerJoin(
        HackerAttendee,
        eq(HackerAttendee.profileRevisionId, HackerProfileRevision.id),
      )
      .where(eq(HackerProfileRevision.resumeUrl, objectName)),
    db
      .select({ value: count() })
      .from(Hacker)
      .where(eq(Hacker.resumeUrl, objectName)),
    db
      .select({ value: count() })
      .from(Member)
      .where(eq(Member.resumeUrl, objectName)),
  ]);
  if (references.some(([row]) => (row?.value ?? 0) > 0)) return;
  await resumeStorageClient
    .removeObject(RESUME_BUCKET_NAME, objectName)
    .catch(() => undefined);
}

export async function openResumeDownload(ctx: AuthenticatedPortalContext) {
  const profile = await loadParticipantProfile(ctx.session.userId);
  if (!profile?.resumeUrl?.startsWith(`${ctx.session.userId}/`)) {
    portalFailure("FORBIDDEN", "No resume is available for this participant.", {
      trpcCode: "NOT_FOUND",
    });
  }
  const [stream, stat] = await Promise.all([
    resumeStorageClient.getObject(RESUME_BUCKET_NAME, profile.resumeUrl),
    resumeStorageClient.statObject(RESUME_BUCKET_NAME, profile.resumeUrl),
  ]);
  await createAdminAuditEvent({
    actionKey: "hacker.resume_accessed",
    actor: { id: ctx.session.userId },
    metadata: { hadPrevious: true },
    subjects: [
      {
        relation: "primary",
        targetId: profile.id,
        targetLabel: `${profile.firstName} ${profile.lastName}`,
        targetType: "hacker_profile",
      },
    ],
  });
  return { size: stat.size, stream };
}

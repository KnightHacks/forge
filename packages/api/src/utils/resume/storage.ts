import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";

import type { Session } from "@forge/auth/server";
import { MINIO } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hacker,
  HackerAttendee,
  HackerProfile,
  HackerProfileRevision,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import type { WriteDb } from "../db";
import { env } from "../../env";
import {
  createResumeObjectName,
  decodeAndValidateResumeDataUrl,
  getResumeUserPrefix,
  isResumeObjectOwnedByUser,
  isServerGeneratedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "./security";

export const resumeStorageClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: 443,
  useSSL: true,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function ensureResumeBucketExists() {
  const bucketExists =
    await resumeStorageClient.bucketExists(RESUME_BUCKET_NAME);

  if (!bucketExists) {
    await resumeStorageClient.makeBucket(
      RESUME_BUCKET_NAME,
      MINIO.BUCKET_REGION,
    );
  }
}

export async function uploadResumeForSession({
  fileContent,
  fileName,
  session,
}: {
  fileContent: string;
  fileName?: string;
  session: Session;
}) {
  return await uploadResumeForUser({
    fileContent,
    fileName,
    userId: session.user.id,
  });
}

export async function uploadResumeForUser({
  fileContent,
  fileName,
  userId,
}: {
  fileContent: string;
  fileName?: string;
  userId: string;
}) {
  const fileBuffer = decodeAndValidateResumeDataUrl(fileContent, fileName);
  const filePath = createResumeObjectName(userId);

  await ensureResumeBucketExists();
  await resumeStorageClient.putObject(
    RESUME_BUCKET_NAME,
    filePath,
    fileBuffer,
    fileBuffer.length,
    { "Content-Type": "application/pdf" },
  );

  return filePath;
}

async function getReferencedResumeObjectsForUser(userId: string) {
  const [
    memberResumes,
    hackerResumes,
    currentProfileResumes,
    pinnedProfileResumes,
  ] = await Promise.all([
    db
      .select({ resumeUrl: Member.resumeUrl })
      .from(Member)
      .where(eq(Member.userId, userId)),
    db
      .select({ resumeUrl: Hacker.resumeUrl })
      .from(Hacker)
      .where(eq(Hacker.userId, userId)),
    db
      .select({ resumeUrl: HackerProfile.resumeUrl })
      .from(HackerProfile)
      .where(eq(HackerProfile.userId, userId)),
    db
      .select({ resumeUrl: HackerProfileRevision.resumeUrl })
      .from(HackerProfileRevision)
      .innerJoin(
        HackerAttendee,
        eq(HackerAttendee.profileRevisionId, HackerProfileRevision.id),
      )
      .innerJoin(
        HackerProfile,
        eq(HackerProfile.id, HackerProfileRevision.profileId),
      )
      .where(eq(HackerProfile.userId, userId)),
  ]);

  return new Set(
    [
      ...memberResumes,
      ...hackerResumes,
      ...currentProfileResumes,
      ...pinnedProfileResumes,
    ]
      .map(({ resumeUrl }) => resumeUrl)
      .filter((resumeUrl): resumeUrl is string => Boolean(resumeUrl)),
  );
}

export async function normalizeResumeObjectNameForPersistence(
  objectName: string | null | undefined,
  userId: string,
) {
  if (objectName == null) return null;

  const trimmedObjectName = objectName.trim();
  if (trimmedObjectName === "") return null;

  if (isServerGeneratedResumeObjectName(trimmedObjectName, userId)) {
    return trimmedObjectName;
  }

  if (!isResumeObjectOwnedByUser(trimmedObjectName, userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resume does not belong to the current user.",
    });
  }

  const referencedObjects = await getReferencedResumeObjectsForUser(userId);
  if (referencedObjects.has(trimmedObjectName)) {
    return trimmedObjectName;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Resume does not belong to the current user.",
  });
}

export async function saveMemberResumeForSession({
  database,
  resumeUrl,
  session,
}: {
  database: WriteDb;
  resumeUrl: string | null | undefined;
  session: Session;
}) {
  return await saveMemberResumeForUser({
    database,
    resumeUrl,
    userId: session.user.id,
  });
}

export async function saveMemberResumeForUser({
  database,
  resumeUrl,
  userId,
}: {
  database: WriteDb;
  resumeUrl: string | null | undefined;
  userId: string;
}) {
  const normalizedResumeUrl = await normalizeResumeObjectNameForPersistence(
    resumeUrl,
    userId,
  );

  const [member] = await database
    .update(Member)
    .set({ resumeUrl: normalizedResumeUrl })
    .where(eq(Member.userId, userId))
    .returning();

  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Create a member profile before uploading a resume.",
    });
  }

  return member;
}

export async function getResumeDownloadUrlForSession(session: Session) {
  return await getResumeDownloadUrlForUser(session.user.id);
}

async function getResumeDownloadUrlForObject(
  filename: string | null | undefined,
  userId: string,
) {
  if (!filename) {
    return { url: null };
  }

  if (!isResumeObjectOwnedByUser(filename, userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resume does not belong to the current user.",
    });
  }

  try {
    return {
      url: await resumeStorageClient.presignedGetObject(
        RESUME_BUCKET_NAME,
        filename,
        60 * 60,
        {
          "response-content-disposition": 'inline; filename="Resume.pdf"',
          "response-content-type": "application/pdf",
        },
      ),
    };
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not generate resume download URL.",
    });
  }
}

export async function getMemberResumeDownloadUrlForUser(userId: string) {
  const member = await db.query.Member.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
  });

  return await getResumeDownloadUrlForObject(member?.resumeUrl, userId);
}

export async function getResumeDownloadUrlForUser(userId: string) {
  const member = await db.query.Member.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
  });
  const hacker = await db.query.Hacker.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
  });

  const filename = member?.resumeUrl ?? hacker?.resumeUrl;
  return await getResumeDownloadUrlForObject(filename, userId);
}

export async function removeUnreferencedResumeObjectsForUser(userId: string) {
  try {
    const referencedObjects = await getReferencedResumeObjectsForUser(userId);

    const objectsToRemove: string[] = [];
    const objectStream = resumeStorageClient.listObjects(
      RESUME_BUCKET_NAME,
      getResumeUserPrefix(userId),
      true,
    );

    for await (const obj of objectStream as AsyncIterable<ItemBucketMetadata>) {
      const objectName = typeof obj.name === "string" ? obj.name : null;
      if (!objectName || referencedObjects.has(objectName)) continue;
      if (!isResumeObjectOwnedByUser(objectName, userId)) continue;

      objectsToRemove.push(objectName);
    }

    if (objectsToRemove.length === 0) return "skipped" as const;

    await Promise.all(
      objectsToRemove.map((objectName) =>
        resumeStorageClient.removeObject(RESUME_BUCKET_NAME, objectName),
      ),
    );
    return "succeeded" as const;
  } catch (error) {
    logger.warn(
      "Unable to remove unreferenced resume objects; continuing:",
      error,
    );
    return "failed_external" as const;
  }
}

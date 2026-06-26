import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";

import type { Session } from "@forge/auth/server";
import { MINIO } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker, Member } from "@forge/db/schemas/knight-hacks";
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
  session,
}: {
  fileContent: string;
  session: Session;
}) {
  const fileBuffer = decodeAndValidateResumeDataUrl(fileContent);
  const filePath = createResumeObjectName(session.user.id);

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
  const [memberResumes, hackerResumes] = await Promise.all([
    db
      .select({ resumeUrl: Member.resumeUrl })
      .from(Member)
      .where(eq(Member.userId, userId)),
    db
      .select({ resumeUrl: Hacker.resumeUrl })
      .from(Hacker)
      .where(eq(Hacker.userId, userId)),
  ]);

  return new Set(
    [...memberResumes, ...hackerResumes]
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
  const normalizedResumeUrl = await normalizeResumeObjectNameForPersistence(
    resumeUrl,
    session.user.id,
  );

  const [member] = await database
    .update(Member)
    .set({ resumeUrl: normalizedResumeUrl })
    .where(eq(Member.userId, session.user.id))
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
  const member = await db.query.Member.findFirst({
    where: (t, { eq }) => eq(t.userId, session.user.id),
  });

  const hacker = await db.query.Hacker.findFirst({
    where: (t, { eq }) => eq(t.userId, session.user.id),
  });

  if (!member && !hacker) {
    return { url: null };
  }

  const filename = member?.resumeUrl ?? hacker?.resumeUrl;
  if (!filename) {
    return { url: null };
  }

  if (!isResumeObjectOwnedByUser(filename, session.user.id)) {
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

    if (objectsToRemove.length === 0) return;

    await Promise.all(
      objectsToRemove.map((objectName) =>
        resumeStorageClient.removeObject(RESUME_BUCKET_NAME, objectName),
      ),
    );
  } catch (error) {
    logger.warn(
      "Unable to remove unreferenced resume objects; continuing:",
      error,
    );
  }
}

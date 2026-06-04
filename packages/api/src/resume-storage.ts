import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";

import { MINIO } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Hacker, Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { env } from "./env";
import {
  getResumeUserPrefix,
  isResumeObjectOwnedByUser,
  isServerGeneratedResumeObjectName,
  RESUME_BUCKET_NAME,
} from "./resume-security";

export const resumeStorageClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
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

export async function removeUnreferencedResumeObjectsForUser(userId: string) {
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

  try {
    await Promise.all(
      objectsToRemove.map((objectName) =>
        resumeStorageClient.removeObject(RESUME_BUCKET_NAME, objectName),
      ),
    );
  } catch (error) {
    logger.warn("Unable to remove unreferenced resume objects:", error);
  }
}

import type { ItemBucketMetadata } from "minio";
import { TRPCError } from "@trpc/server";
import { Client } from "minio";

import type { Session } from "@forge/auth/server";
import { MINIO } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import type { WriteDb } from "../db";
import { env } from "../../env";
import {
  createProfilePictureObjectName,
  decodeAndValidateProfilePictureDataUrl,
  getProfilePictureUserPrefix,
  isProfilePictureObjectOwnedByUser,
  isServerGeneratedProfilePictureObjectName,
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "./security";

export const profilePictureStorageClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: 443,
  useSSL: true,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function ensureProfilePictureBucketExists() {
  const bucketExists = await profilePictureStorageClient.bucketExists(
    PROFILE_PICTURE_BUCKET_NAME,
  );

  if (!bucketExists) {
    await profilePictureStorageClient.makeBucket(
      PROFILE_PICTURE_BUCKET_NAME,
      MINIO.BUCKET_REGION,
    );
  }
}

export async function uploadProfilePictureForSession({
  fileContent,
  session,
}: {
  fileContent: string;
  session: Session;
}) {
  const { contentType, fileBuffer } =
    decodeAndValidateProfilePictureDataUrl(fileContent);
  const filePath = createProfilePictureObjectName(session.user.id, contentType);

  await ensureProfilePictureBucketExists();
  await profilePictureStorageClient.putObject(
    PROFILE_PICTURE_BUCKET_NAME,
    filePath,
    fileBuffer,
    fileBuffer.length,
    { "Content-Type": contentType },
  );

  return filePath;
}

export function normalizeProfilePictureObjectNameForPersistence(
  objectName: string | null | undefined,
  userId: string,
) {
  if (objectName == null) return null;

  const trimmedObjectName = objectName.trim();
  if (trimmedObjectName === "") return null;

  if (isServerGeneratedProfilePictureObjectName(trimmedObjectName, userId)) {
    return trimmedObjectName;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Profile picture does not belong to the current user.",
  });
}

export async function saveMemberProfilePictureForSession({
  database,
  profilePictureUrl,
  session,
}: {
  database: WriteDb;
  profilePictureUrl: string | null | undefined;
  session: Session;
}) {
  const normalizedProfilePictureUrl =
    normalizeProfilePictureObjectNameForPersistence(
      profilePictureUrl,
      session.user.id,
    );

  const [member] = await database
    .update(Member)
    .set({ profilePictureUrl: normalizedProfilePictureUrl })
    .where(eq(Member.userId, session.user.id))
    .returning();

  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Create a member profile before uploading a profile picture.",
    });
  }

  return member;
}

export async function getProfilePictureDownloadUrlForSession(session: Session) {
  const member = await db.query.Member.findFirst({
    where: (t, { eq }) => eq(t.userId, session.user.id),
  });

  if (!member?.profilePictureUrl) {
    return { url: null };
  }

  const objectName = resolveProfilePictureObjectName(
    member.profilePictureUrl,
    session.user.id,
  );

  if (!objectName) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Profile picture does not belong to the current user.",
    });
  }

  try {
    return {
      url: await profilePictureStorageClient.presignedUrl(
        "GET",
        PROFILE_PICTURE_BUCKET_NAME,
        objectName,
        60 * 60,
      ),
    };
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not generate profile picture URL.",
    });
  }
}

export async function removeProfilePictureObjectsForUser(userId: string) {
  try {
    const objectsToRemove: string[] = [];
    const objectStream = profilePictureStorageClient.listObjects(
      PROFILE_PICTURE_BUCKET_NAME,
      getProfilePictureUserPrefix(userId),
      true,
    );

    for await (const obj of objectStream as AsyncIterable<ItemBucketMetadata>) {
      const objectName = typeof obj.name === "string" ? obj.name : null;
      if (!objectName) continue;
      if (!isProfilePictureObjectOwnedByUser(objectName, userId)) continue;

      objectsToRemove.push(objectName);
    }

    if (objectsToRemove.length === 0) return;

    await Promise.all(
      objectsToRemove.map((objectName) =>
        profilePictureStorageClient.removeObject(
          PROFILE_PICTURE_BUCKET_NAME,
          objectName,
        ),
      ),
    );
  } catch (error) {
    logger.warn("Unable to remove profile picture objects; continuing:", error);
  }
}

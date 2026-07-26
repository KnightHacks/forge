import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { MINIO } from "@forge/consts";
import { logger } from "@forge/utils";

import { decodeAndValidateImageDataUrl } from "../profile-picture/security";
import {
  ensureProfilePictureBucketExists,
  profilePictureStorageClient,
} from "../profile-picture/storage";

const extensionByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function bulletinImagePrefix(userId: string) {
  return `alumni-bulletin/${userId}/`;
}

function isBulletinImageObjectName(objectName: string) {
  if (!objectName.startsWith("alumni-bulletin/")) return false;
  const segments = objectName.split("/");
  return (
    segments.length === 3 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        !segment.includes("\\") &&
        !segment.includes("..") &&
        !segment.includes("\0"),
    )
  );
}

export async function uploadAlumniBulletinImage({
  fileContent,
  userId,
}: {
  fileContent: string;
  userId: string;
}) {
  const { contentType, fileBuffer } = decodeAndValidateImageDataUrl(
    fileContent,
    "Bulletin image",
  );
  if (!(contentType in extensionByContentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bulletin images must be JPEG, PNG, or WebP.",
    });
  }

  const extension =
    extensionByContentType[contentType as keyof typeof extensionByContentType];
  const objectName = `${bulletinImagePrefix(userId)}bulletin-${randomUUID()}.${extension}`;

  await ensureProfilePictureBucketExists();
  await profilePictureStorageClient.putObject(
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
    objectName,
    fileBuffer,
    fileBuffer.length,
    { "Content-Type": contentType },
  );
  return objectName;
}

export async function getAlumniBulletinImageUrl(
  objectName: string | null | undefined,
) {
  if (!objectName || !isBulletinImageObjectName(objectName)) return null;

  try {
    return await profilePictureStorageClient.presignedUrl(
      "GET",
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      objectName,
      MINIO.PRESIGNED_URL_EXPIRY,
    );
  } catch (error) {
    logger.warn("Unable to create alumni bulletin image URL:", error);
    return null;
  }
}

export async function removeAlumniBulletinImage(
  objectName: string | null | undefined,
) {
  if (!objectName || !isBulletinImageObjectName(objectName)) {
    return "skipped" as const;
  }

  try {
    await profilePictureStorageClient.removeObject(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      objectName,
    );
    return "succeeded" as const;
  } catch (error) {
    logger.warn("Unable to remove alumni bulletin image; continuing:", error);
    return "failed_external" as const;
  }
}

import { randomUUID } from "node:crypto";

import { MINIO } from "@forge/consts";
import { logger } from "@forge/utils";
import { IMAGE_UPLOAD_POLICY, uploadExtension } from "@forge/validators";

import {
  ensureProfilePictureBucketExists,
  profilePictureStorageClient,
} from "../profile-picture/storage";
import { decodeUploadDataUrl } from "../upload/data-url";

export async function uploadPointStoreImage(
  itemId: string,
  fileContent: string,
  fileName?: string,
) {
  const { contentType, fileBuffer, type } = decodeUploadDataUrl(
    IMAGE_UPLOAD_POLICY,
    { dataUrl: fileContent, fileName },
  );
  const key = `point-store/${itemId}/${randomUUID()}.${uploadExtension(type)}`;
  await ensureProfilePictureBucketExists();
  await profilePictureStorageClient.putObject(
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
    key,
    fileBuffer,
    fileBuffer.length,
    { "Content-Type": contentType },
  );
  return key;
}

export async function pointStoreImageUrl(key: string | null) {
  if (!key) return null;
  return profilePictureStorageClient.presignedUrl(
    "GET",
    MINIO.PROFILE_PICTURES_BUCKET_NAME,
    key,
    MINIO.PRESIGNED_URL_EXPIRY,
  );
}

export async function removePointStoreImage(key: string | null) {
  if (!key) return;
  try {
    await profilePictureStorageClient.removeObject(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      key,
    );
  } catch (error) {
    // The DB change already committed; a storage outage must not undo the item edit.
    logger.warn("Unable to remove replaced point store image:", error);
  }
}

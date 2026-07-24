import { randomUUID } from "node:crypto";

import { MINIO } from "@forge/consts";
import { logger } from "@forge/utils";

import { decodeAndValidateImageDataUrl } from "../profile-picture/security";
import {
  ensureProfilePictureBucketExists,
  profilePictureStorageClient,
} from "../profile-picture/storage";

const extensionByContentType = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function companyImagePrefix(companyId: string) {
  return `companies/${companyId}/`;
}

function isCompanyImageObjectName(companyId: string, objectName: string) {
  const prefix = companyImagePrefix(companyId);
  if (!objectName.startsWith(prefix)) return false;
  const fileName = objectName.slice(prefix.length);
  return (
    fileName.length > 0 &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !fileName.includes("..") &&
    !fileName.includes("\0")
  );
}

export async function uploadCompanyImage({
  companyId,
  fileContent,
}: {
  companyId: string;
  fileContent: string;
}) {
  const { contentType, fileBuffer } = decodeAndValidateImageDataUrl(
    fileContent,
    "Company image",
  );
  const objectName = `${companyImagePrefix(companyId)}company-image-${randomUUID()}.${
    extensionByContentType[contentType]
  }`;

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

export async function getCompanyImageUrl(
  companyId: string,
  objectName: string | null | undefined,
) {
  if (!objectName || !isCompanyImageObjectName(companyId, objectName)) {
    return null;
  }

  try {
    return await profilePictureStorageClient.presignedUrl(
      "GET",
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      objectName,
      MINIO.PRESIGNED_URL_EXPIRY,
    );
  } catch (error) {
    logger.warn("Unable to create company image preview URL:", error);
    return null;
  }
}

export async function removeCompanyImage(
  companyId: string,
  objectName: string | null | undefined,
) {
  if (!objectName || !isCompanyImageObjectName(companyId, objectName)) return;

  try {
    await profilePictureStorageClient.removeObject(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      objectName,
    );
  } catch (error) {
    logger.warn("Unable to remove company image; continuing:", error);
  }
}

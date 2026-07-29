import { randomUUID } from "node:crypto";

import { MINIO } from "@forge/consts";
import { logger } from "@forge/utils";
import {
  COMPANY_IMAGE_UPLOAD_POLICY,
  uploadExtension,
} from "@forge/validators";

import {
  ensureProfilePictureBucketExists,
  profilePictureStorageClient,
} from "../profile-picture/storage";
import { decodeUploadDataUrl } from "../upload/data-url";

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
  fileName,
}: {
  companyId: string;
  fileContent: string;
  fileName?: string;
}) {
  const { contentType, fileBuffer, type } = decodeUploadDataUrl(
    COMPANY_IMAGE_UPLOAD_POLICY,
    { dataUrl: fileContent, fileName },
  );
  const objectName = `${companyImagePrefix(companyId)}company-image-${randomUUID()}.${uploadExtension(type)}`;

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
  if (!objectName || !isCompanyImageObjectName(companyId, objectName)) {
    return "skipped" as const;
  }

  try {
    await profilePictureStorageClient.removeObject(
      MINIO.PROFILE_PICTURES_BUCKET_NAME,
      objectName,
    );
    return "succeeded" as const;
  } catch (error) {
    logger.warn("Unable to remove company image; continuing:", error);
    return "failed_external" as const;
  }
}

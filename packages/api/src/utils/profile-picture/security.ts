import { randomUUID } from "node:crypto";

import type { UploadFileType } from "@forge/validators";
import { MINIO } from "@forge/consts";
import {
  IMAGE_UPLOAD_POLICY,
  maxDataUrlLength,
  PROFILE_PICTURE_UPLOAD_POLICY,
  uploadExtension,
  uploadPolicyFor,
} from "@forge/validators";

import { decodeUploadDataUrl } from "../upload/data-url";

export const PROFILE_PICTURE_BUCKET_NAME = MINIO.PROFILE_PICTURES_BUCKET_NAME;
export const MAX_PROFILE_PICTURE_DATA_URL_LENGTH =
  maxDataUrlLength(IMAGE_UPLOAD_POLICY);

const SERVER_GENERATED_PROFILE_PICTURE_FILE_NAME =
  /^profile-picture-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif|webp)$/i;

export function getProfilePictureUserPrefix(userId: string) {
  return `${userId}/`;
}

export function createProfilePictureObjectName(
  userId: string,
  type: UploadFileType,
) {
  return `${getProfilePictureUserPrefix(userId)}profile-picture-${randomUUID()}.${uploadExtension(type)}`;
}

export function isProfilePictureObjectOwnedByUser(
  objectName: string,
  userId: string,
) {
  if (objectName.length === 0 || objectName.length > 255) return false;
  if (objectName.includes("\\") || objectName.includes("\0")) return false;

  const userPrefix = getProfilePictureUserPrefix(userId);
  if (!objectName.startsWith(userPrefix)) return false;

  const fileName = objectName.slice(userPrefix.length);
  if (!fileName || fileName === "." || fileName === "..") return false;
  if (fileName.includes("/") || fileName.includes("..")) return false;

  return true;
}

export function getProfilePictureObjectNameFromLegacyUrl(
  profilePictureUrl: string,
) {
  let url: URL;

  try {
    url = new URL(profilePictureUrl);
  } catch {
    return null;
  }

  const bucketPath = `/${PROFILE_PICTURE_BUCKET_NAME}/`;
  if (!url.pathname.startsWith(bucketPath)) return null;

  const objectName = decodeURIComponent(url.pathname.slice(bucketPath.length));
  return objectName || null;
}

export function resolveProfilePictureObjectName(
  profilePictureReference: string,
  userId: string,
) {
  const trimmedReference = profilePictureReference.trim();
  if (trimmedReference === "") return null;

  if (isProfilePictureObjectOwnedByUser(trimmedReference, userId)) {
    return trimmedReference;
  }

  const legacyObjectName =
    getProfilePictureObjectNameFromLegacyUrl(trimmedReference);
  if (
    legacyObjectName &&
    isProfilePictureObjectOwnedByUser(legacyObjectName, userId)
  ) {
    return legacyObjectName;
  }

  return null;
}

export function isServerGeneratedProfilePictureObjectName(
  objectName: string,
  userId: string,
) {
  if (!isProfilePictureObjectOwnedByUser(objectName, userId)) return false;

  const fileName = objectName.slice(getProfilePictureUserPrefix(userId).length);
  return SERVER_GENERATED_PROFILE_PICTURE_FILE_NAME.test(fileName);
}

export function decodeAndValidateImageDataUrl(
  fileContent: string,
  subject: string,
  fileName?: string,
) {
  return decodeUploadDataUrl(uploadPolicyFor(IMAGE_UPLOAD_POLICY, subject), {
    dataUrl: fileContent,
    fileName,
  });
}

export function decodeAndValidateProfilePictureDataUrl(
  fileContent: string,
  fileName?: string,
) {
  return decodeUploadDataUrl(PROFILE_PICTURE_UPLOAD_POLICY, {
    dataUrl: fileContent,
    fileName,
  });
}

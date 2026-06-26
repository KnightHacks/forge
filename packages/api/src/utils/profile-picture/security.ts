import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { MINIO } from "@forge/consts";

export const PROFILE_PICTURE_BUCKET_NAME = MINIO.PROFILE_PICTURES_BUCKET_NAME;
export const MAX_PROFILE_PICTURE_DATA_URL_LENGTH =
  Math.ceil((MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE * 4) / 3) + 128;

const BASE64_CONTENT = /^[A-Za-z0-9+/]*={0,2}$/;
const PROFILE_PICTURE_DATA_URL_PREFIX =
  /^data:(image\/(?:jpeg|png|gif|webp));base64,/i;
const SERVER_GENERATED_PROFILE_PICTURE_FILE_NAME =
  /^profile-picture-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif|webp)$/i;

const extensionByContentType = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function assertImageMagic(fileBuffer: Buffer, contentType: string) {
  const hasJpegMagic =
    fileBuffer.length >= 3 &&
    fileBuffer[0] === 0xff &&
    fileBuffer[1] === 0xd8 &&
    fileBuffer[2] === 0xff;
  const hasPngMagic =
    fileBuffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const gifHeader = fileBuffer.subarray(0, 6).toString("ascii");
  const hasGifMagic = gifHeader === "GIF87a" || gifHeader === "GIF89a";
  const hasWebpMagic =
    fileBuffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    fileBuffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (
    (contentType === "image/jpeg" && hasJpegMagic) ||
    (contentType === "image/png" && hasPngMagic) ||
    (contentType === "image/gif" && hasGifMagic) ||
    (contentType === "image/webp" && hasWebpMagic)
  ) {
    return;
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Profile picture must be a valid image.",
  });
}

export function getProfilePictureUserPrefix(userId: string) {
  return `${userId}/`;
}

export function createProfilePictureObjectName(
  userId: string,
  contentType: keyof typeof extensionByContentType,
) {
  return `${getProfilePictureUserPrefix(userId)}profile-picture-${randomUUID()}.${
    extensionByContentType[contentType]
  }`;
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

export function decodeAndValidateProfilePictureDataUrl(fileContent: string) {
  if (fileContent.length > MAX_PROFILE_PICTURE_DATA_URL_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile picture must be 2MB or smaller.",
    });
  }

  const match = PROFILE_PICTURE_DATA_URL_PREFIX.exec(fileContent);
  const contentType = match?.[1]?.toLowerCase() as
    | keyof typeof extensionByContentType
    | undefined;

  if (!contentType || !(contentType in extensionByContentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile picture must be a JPEG, PNG, GIF, or WebP image.",
    });
  }

  const base64Data = fileContent.replace(PROFILE_PICTURE_DATA_URL_PREFIX, "");
  if (
    !base64Data ||
    base64Data.length % 4 === 1 ||
    !BASE64_CONTENT.test(base64Data)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile picture data is missing or invalid.",
    });
  }

  const fileBuffer = Buffer.from(base64Data, "base64");
  if (
    fileBuffer.length === 0 ||
    fileBuffer.length > MINIO.KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile picture must be 2MB or smaller.",
    });
  }

  assertImageMagic(fileBuffer, contentType);

  return { contentType, fileBuffer };
}

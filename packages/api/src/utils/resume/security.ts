import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { maxDataUrlLength, RESUME_UPLOAD_POLICY } from "@forge/validators";

import { decodeUploadDataUrl } from "../upload/data-url";

export const RESUME_BUCKET_NAME = "member-resumes";
export const MAX_RESUME_DATA_URL_LENGTH =
  maxDataUrlLength(RESUME_UPLOAD_POLICY);

const SERVER_GENERATED_RESUME_FILE_NAME =
  /^resume-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

export function getResumeUserPrefix(userId: string) {
  return `${userId}/`;
}

export function createResumeObjectName(userId: string) {
  return `${getResumeUserPrefix(userId)}resume-${randomUUID()}.pdf`;
}

export function isResumeObjectOwnedByUser(objectName: string, userId: string) {
  if (objectName.length === 0 || objectName.length > 255) return false;
  if (objectName.includes("\\") || objectName.includes("\0")) return false;

  const userPrefix = getResumeUserPrefix(userId);
  if (!objectName.startsWith(userPrefix)) return false;

  const fileName = objectName.slice(userPrefix.length);
  if (!fileName || fileName === "." || fileName === "..") return false;
  if (fileName.includes("/") || fileName.includes("..")) return false;

  return true;
}

export function isServerGeneratedResumeObjectName(
  objectName: string,
  userId: string,
) {
  if (!isResumeObjectOwnedByUser(objectName, userId)) return false;

  const fileName = objectName.slice(getResumeUserPrefix(userId).length);
  return SERVER_GENERATED_RESUME_FILE_NAME.test(fileName);
}

export function normalizeOwnedResumeObjectName(
  objectName: string | null | undefined,
  userId: string,
) {
  if (objectName == null) return null;

  const trimmedObjectName = objectName.trim();
  if (trimmedObjectName === "") return null;

  if (!isResumeObjectOwnedByUser(trimmedObjectName, userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resume does not belong to the current user.",
    });
  }

  return trimmedObjectName;
}

export function decodeAndValidateResumeDataUrl(
  fileContent: string,
  fileName?: string,
) {
  return decodeUploadDataUrl(RESUME_UPLOAD_POLICY, {
    dataUrl: fileContent,
    fileName,
  }).fileBuffer;
}

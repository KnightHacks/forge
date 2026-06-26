import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { MINIO } from "@forge/consts";

export const RESUME_BUCKET_NAME = "member-resumes";
export const MAX_RESUME_DATA_URL_LENGTH =
  Math.ceil((MINIO.MAX_RESUME_SIZE * 4) / 3) + 128;

const PDF_DATA_URL_PREFIX = /^data:application\/pdf;base64,/i;
const BASE64_CONTENT = /^[A-Za-z0-9+/]*={0,2}$/;
const PDF_MAGIC = "%PDF-";
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

export function decodeAndValidateResumeDataUrl(fileContent: string) {
  if (fileContent.length > MAX_RESUME_DATA_URL_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File too large: maximum 5MB",
    });
  }

  if (!PDF_DATA_URL_PREFIX.test(fileContent)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Resume must be a PDF.",
    });
  }

  const base64Data = fileContent.replace(PDF_DATA_URL_PREFIX, "");
  if (
    !base64Data ||
    base64Data.length % 4 === 1 ||
    !BASE64_CONTENT.test(base64Data)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Resume data is missing or invalid.",
    });
  }

  const fileBuffer = Buffer.from(base64Data, "base64");
  if (fileBuffer.length === 0 || fileBuffer.length > MINIO.MAX_RESUME_SIZE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File too large: maximum 5MB",
    });
  }

  if (
    fileBuffer.subarray(0, PDF_MAGIC.length).toString("ascii") !== PDF_MAGIC
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Resume must be a PDF.",
    });
  }

  return fileBuffer;
}

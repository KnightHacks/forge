import { MINIO } from "@forge/consts";
import { and, isNull, lt } from "@forge/db";
import { db } from "@forge/db/client";
import { PrintJobFile } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { safeFileName } from "../forms/attachments";

const DOWNLOAD_EXPIRY_SECONDS = 10 * 60;
/** Staged files not claimed by a submitted job within this window are abandoned. */
export const STAGED_PRINT_FILE_TTL_MS = 24 * 60 * 60 * 1_000;

async function storage() {
  return (await import("../../minio/minio-client")).minioClient;
}

export async function ensurePrintFilesBucket() {
  const minioClient = await storage();
  if (!(await minioClient.bucketExists(MINIO.PRINT_FILES_BUCKET_NAME))) {
    await minioClient.makeBucket(
      MINIO.PRINT_FILES_BUCKET_NAME,
      MINIO.BUCKET_REGION,
    );
  }
}

export function printFileName(fileName: string) {
  return safeFileName(fileName).slice(0, 255) || "print-file";
}

export function printFileObjectName(input: {
  fileId: string;
  fileName: string;
  hackathonId: string;
  hackerAttendeeId: string;
}) {
  return `print-jobs/${input.hackathonId}/${input.hackerAttendeeId}/${input.fileId}-${printFileName(input.fileName)}`;
}

export async function putPrintFileObject(input: {
  bytes: Uint8Array;
  contentType: string;
  objectName: string;
}) {
  await ensurePrintFilesBucket();
  const minioClient = await storage();
  await minioClient.putObject(
    MINIO.PRINT_FILES_BUCKET_NAME,
    input.objectName,
    Buffer.from(input.bytes),
    input.bytes.length,
    { "Content-Type": input.contentType },
  );
}

/** Best effort: an object left behind costs storage, never correctness. */
export async function removePrintFileObjects(objectNames: readonly string[]) {
  if (objectNames.length === 0) return;
  const minioClient = await storage();
  await minioClient
    .removeObjects(MINIO.PRINT_FILES_BUCKET_NAME, [...objectNames])
    .catch((error: unknown) => {
      logger.warn("Unable to remove print file objects; continuing:", error);
    });
}

export async function getPrintFileDownloadUrl(file: {
  contentType: string;
  fileName: string;
  objectName: string;
}) {
  const minioClient = await storage();
  return minioClient.presignedGetObject(
    MINIO.PRINT_FILES_BUCKET_NAME,
    file.objectName,
    DOWNLOAD_EXPIRY_SECONDS,
    {
      "response-content-disposition": `attachment; filename="${file.fileName.replaceAll('"', "")}"`,
      "response-content-type": file.contentType,
    },
  );
}

/**
 * Deletes staged files that no submitted job claimed within a day: rows first,
 * then objects. Not scheduled yet; a follow-up adds the cron.
 */
export async function cleanupAbandonedPrintFiles(now = new Date()) {
  const removed = await db
    .delete(PrintJobFile)
    .where(
      and(
        isNull(PrintJobFile.printJobId),
        lt(
          PrintJobFile.createdAt,
          new Date(now.getTime() - STAGED_PRINT_FILE_TTL_MS),
        ),
      ),
    )
    .returning({ objectName: PrintJobFile.objectName });
  await removePrintFileObjects(removed.map((file) => file.objectName));
  return { removed: removed.length };
}

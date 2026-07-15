import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { MINIO } from "@forge/consts";
import { eq, inArray, lt } from "@forge/db";
import { db } from "@forge/db/client";
import {
  FormAttachment,
  FormResponse,
  FormsSchemas,
} from "@forge/db/schemas/knight-hacks";
import { formDefinitionSchema, validateFormUpload } from "@forge/validators";

import type { WriteDb } from "../db";
import { selectAbandonedFormAttachments } from "./attachment-cleanup";

const UPLOAD_EXPIRY_SECONDS = 15 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 60 * 60;

async function storage() {
  return (await import("../../minio/minio-client")).minioClient;
}

async function ensureFormAssetsBucket() {
  const minioClient = await storage();
  if (!(await minioClient.bucketExists(MINIO.FORM_ASSETS_BUCKET_NAME))) {
    await minioClient.makeBucket(
      MINIO.FORM_ASSETS_BUCKET_NAME,
      MINIO.BUCKET_REGION,
    );
  }
}

function safeFileName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .slice(0, 180);
}

function beginsWith(buffer: Buffer, bytes: readonly number[]) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

export function uploadSignatureMatches(contentType: string, prefix: Buffer) {
  if (prefix.length === 0) return false;
  const dangerous =
    beginsWith(prefix, [0x4d, 0x5a]) ||
    beginsWith(prefix, [0x7f, 0x45, 0x4c, 0x46]) ||
    beginsWith(prefix, [0xfe, 0xed, 0xfa, 0xce]) ||
    beginsWith(prefix, [0xfe, 0xed, 0xfa, 0xcf]) ||
    beginsWith(prefix, [0xcf, 0xfa, 0xed, 0xfe]) ||
    beginsWith(prefix, [0xca, 0xfe, 0xba, 0xbe]) ||
    beginsWith(prefix, [0x23, 0x21]);
  if (dangerous) return false;

  const normalized = contentType.toLowerCase().split(";", 1)[0]?.trim();
  if (normalized === "application/pdf") {
    return prefix.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (normalized === "image/png") {
    return beginsWith(prefix, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (normalized === "image/jpeg") {
    return beginsWith(prefix, [0xff, 0xd8, 0xff]);
  }
  if (normalized === "image/gif") {
    const signature = prefix.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (normalized === "image/webp") {
    return (
      prefix.subarray(0, 4).toString("ascii") === "RIFF" &&
      prefix.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (
    normalized === "application/zip" ||
    normalized === "application/x-7z-compressed" ||
    normalized?.startsWith("application/vnd.openxmlformats-officedocument")
  ) {
    return (
      beginsWith(prefix, [0x50, 0x4b, 0x03, 0x04]) ||
      beginsWith(prefix, [0x50, 0x4b, 0x05, 0x06]) ||
      beginsWith(prefix, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
    );
  }
  if (
    normalized === "application/msword" ||
    normalized?.startsWith("application/vnd.ms-")
  ) {
    return beginsWith(prefix, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if (normalized === "video/mp4") {
    return prefix.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (normalized === "video/webm") {
    return beginsWith(prefix, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  return true;
}

async function readObjectPrefix(objectName: string, size: number) {
  const minioClient = await storage();
  const stream = await minioClient.getPartialObject(
    MINIO.FORM_ASSETS_BUCKET_NAME,
    objectName,
    0,
    Math.min(size, 4_096),
  );
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array),
    );
  }
  return Buffer.concat(chunks).subarray(0, 4_096);
}

export async function createFormAttachmentUpload(input: {
  contentType: string;
  fileName: string;
  formId: string;
  ownerUserId: string;
  size: number;
}) {
  const validation = validateFormUpload(input);
  if (!validation.allowed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        validation.reason === "too_large"
          ? "Files may not exceed 100 MB."
          : "That file type is not allowed.",
    });
  }
  const id = randomUUID();
  const fileName = safeFileName(input.fileName);
  const objectName = `forms/${input.formId}/${input.ownerUserId}/${id}/${fileName}`;
  await ensureFormAssetsBucket();
  const minioClient = await storage();
  const [attachment] = await db
    .insert(FormAttachment)
    .values({
      contentType: input.contentType,
      fileName,
      formId: input.formId,
      id,
      objectName,
      ownerUserId: input.ownerUserId,
      size: input.size,
    })
    .returning();
  if (!attachment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return {
    attachmentId: attachment.id,
    expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    uploadUrl: await minioClient.presignedPutObject(
      MINIO.FORM_ASSETS_BUCKET_NAME,
      objectName,
      UPLOAD_EXPIRY_SECONDS,
    ),
  };
}

export async function finalizeFormAttachment(input: {
  attachmentId: string;
  ownerUserId: string;
}) {
  const minioClient = await storage();
  const attachment = await db.query.FormAttachment.findFirst({
    where: eq(FormAttachment.id, input.attachmentId),
  });
  if (attachment?.ownerUserId !== input.ownerUserId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  let stat;
  try {
    stat = await minioClient.statObject(
      MINIO.FORM_ASSETS_BUCKET_NAME,
      attachment.objectName,
    );
  } catch {
    throw new TRPCError({
      code: "CONFLICT",
      message: "The upload has not completed.",
    });
  }
  const validation = validateFormUpload({
    contentType: attachment.contentType,
    fileName: attachment.fileName,
    size: stat.size,
  });
  const metadata: unknown = stat.metaData;
  const storedContentType =
    typeof metadata === "object" && metadata !== null
      ? Object.entries(metadata as Record<string, unknown>).find(
          ([key]) => key.toLowerCase() === "content-type",
        )?.[1]
      : undefined;
  const prefix = await readObjectPrefix(attachment.objectName, stat.size);
  if (
    !validation.allowed ||
    stat.size !== attachment.size ||
    (typeof storedContentType === "string" &&
      storedContentType.split(";", 1)[0]?.trim().toLowerCase() !==
        attachment.contentType.split(";", 1)[0]?.trim().toLowerCase()) ||
    !uploadSignatureMatches(attachment.contentType, prefix)
  ) {
    await minioClient.removeObject(
      MINIO.FORM_ASSETS_BUCKET_NAME,
      attachment.objectName,
    );
    await db.delete(FormAttachment).where(eq(FormAttachment.id, attachment.id));
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The uploaded file does not match the approved metadata.",
    });
  }
  const [saved] = await db
    .update(FormAttachment)
    .set({ finalizedAt: new Date() })
    .where(eq(FormAttachment.id, attachment.id))
    .returning();
  return saved;
}

export async function assertAndAttachResponseFiles(input: {
  answers: Record<string, unknown>;
  database: WriteDb;
  definition: unknown;
  formId: string;
  responseId: string;
  userId: string;
}) {
  const fileAnswers: {
    questionId: string;
    value: { attachmentId: string; fileName?: unknown };
  }[] = [];
  for (const [questionId, value] of Object.entries(input.answers)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "attachmentId" in value &&
      typeof value.attachmentId === "string"
    ) {
      fileAnswers.push({
        questionId,
        value: {
          attachmentId: value.attachmentId,
          ...("fileName" in value && typeof value.fileName === "string"
            ? { fileName: value.fileName }
            : {}),
        },
      });
    }
  }
  const attachmentIds = fileAnswers.map(({ value }) => value.attachmentId);
  if (attachmentIds.length === 0) return { removedObjectNames: [] };
  const definition = formDefinitionSchema.safeParse(input.definition);
  if (!definition.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Legacy forms cannot accept platform file uploads.",
    });
  }
  const questions = new Map(
    definition.data.questions.map((question) => [question.id, question]),
  );
  const attachments = await input.database
    .select()
    .from(FormAttachment)
    .where(inArray(FormAttachment.id, attachmentIds));
  if (
    attachments.length !== new Set(attachmentIds).size ||
    attachments.some(
      (attachment) =>
        attachment.formId !== input.formId ||
        attachment.ownerUserId !== input.userId ||
        !attachment.finalizedAt ||
        (attachment.responseId !== null &&
          attachment.responseId !== input.responseId),
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more form uploads are invalid.",
    });
  }
  const attachmentsById = new Map(
    attachments.map((attachment) => [attachment.id, attachment]),
  );
  for (const { questionId, value } of fileAnswers) {
    const question = questions.get(questionId);
    const attachment = attachmentsById.get(value.attachmentId);
    if (
      question?.type !== "file" ||
      question.retired ||
      !attachment ||
      attachment.size > question.maxBytes ||
      !mimeTypeAllowed(attachment.contentType, question.allowedMimeTypes) ||
      ("fileName" in value &&
        typeof value.fileName === "string" &&
        value.fileName !== attachment.fileName)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more form uploads violate their question limits.",
      });
    }
  }
  await input.database
    .update(FormAttachment)
    .set({ responseId: input.responseId })
    .where(inArray(FormAttachment.id, attachmentIds));
  return { removedObjectNames: [] };
}

export function mimeTypeAllowed(
  contentType: string,
  allowedMimeTypes: readonly string[],
) {
  const normalized = contentType.toLowerCase().split(";", 1)[0]?.trim();
  return allowedMimeTypes.some((allowed) => {
    const candidate = allowed.toLowerCase().trim();
    return (
      candidate === normalized ||
      (candidate.endsWith("/*") &&
        normalized?.startsWith(candidate.slice(0, -1)) === true)
    );
  });
}

export async function getFormAttachmentDownloadUrl(attachmentId: string) {
  const minioClient = await storage();
  const attachment = await db.query.FormAttachment.findFirst({
    where: eq(FormAttachment.id, attachmentId),
  });
  if (!attachment?.finalizedAt) throw new TRPCError({ code: "NOT_FOUND" });
  return {
    attachment,
    url: await minioClient.presignedGetObject(
      MINIO.FORM_ASSETS_BUCKET_NAME,
      attachment.objectName,
      DOWNLOAD_EXPIRY_SECONDS,
      {
        "response-content-disposition": `attachment; filename="${attachment.fileName.replaceAll('"', "")}"`,
        "response-content-type": attachment.contentType,
      },
    ),
  };
}

export async function getLegacyFormFileDownloadUrl(objectName: string) {
  const minioClient = await storage();
  return minioClient.presignedGetObject(
    MINIO.FORM_ASSETS_BUCKET_NAME,
    objectName,
    DOWNLOAD_EXPIRY_SECONDS,
  );
}

export async function removeFormAttachmentObjects(objectNames: string[]) {
  if (objectNames.length === 0) return;
  await ensureFormAssetsBucket();
  const minioClient = await storage();
  await minioClient.removeObjects(MINIO.FORM_ASSETS_BUCKET_NAME, objectNames);
}

export async function cleanupAbandonedFormAttachments({
  now = new Date(),
  retentionMs = 24 * 60 * 60 * 1000,
}: {
  now?: Date;
  retentionMs?: number;
} = {}) {
  const cutoff = new Date(now.getTime() - retentionMs);
  const candidates = await db
    .select()
    .from(FormAttachment)
    .where(lt(FormAttachment.createdAt, cutoff))
    .limit(2_000);
  if (candidates.length === 0) return { removed: 0 };

  const forms = await db.query.FormsSchemas.findMany({
    columns: { formData: true, id: true },
    where: inArray(FormsSchemas.id, [
      ...new Set(candidates.map(({ formId }) => formId)),
    ]),
  });
  const retainedAttachmentIds = new Set<string>(
    forms.flatMap(({ formData }) => {
      const definition = formDefinitionSchema.safeParse(formData);
      if (!definition.success) return [];
      return definition.data.instructions.flatMap((instruction) =>
        instruction.type === "text" ? [] : [instruction.attachmentId],
      );
    }),
  );
  const responseIds = candidates.flatMap(({ responseId }) =>
    responseId ? [responseId] : [],
  );
  if (responseIds.length > 0) {
    const responses = await db
      .select({ responseData: FormResponse.responseData })
      .from(FormResponse)
      .where(inArray(FormResponse.id, responseIds));
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== "object" || value === null) return;
      if ("attachmentId" in value && typeof value.attachmentId === "string") {
        retainedAttachmentIds.add(value.attachmentId);
      }
      Object.values(value).forEach(visit);
    };
    responses.forEach(({ responseData }) => visit(responseData));
  }
  const stale = selectAbandonedFormAttachments({
    candidates,
    cutoff,
    retainedAttachmentIds,
  });
  if (stale.length === 0) return { removed: 0 };
  await removeFormAttachmentObjects(stale.map(({ objectName }) => objectName));
  await db.delete(FormAttachment).where(
    inArray(
      FormAttachment.id,
      stale.map(({ id }) => id),
    ),
  );
  return { removed: stale.length };
}

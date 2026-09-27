import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { MINIO } from "@forge/consts";
import { and, eq, inArray, isNull, lt } from "@forge/db";
import { db } from "@forge/db/client";
import {
  IssueAttachment,
  IssueAttachmentReference,
} from "@forge/db/schemas/knight-hacks";
import {
  checkUploadMetadata,
  ISSUE_IMAGE_UPLOAD_POLICY,
  matchesUploadSignature,
} from "@forge/validators";

import type { WriteDb } from "../db";
import {
  issueImageIds,
  issueImageReferences,
  MAX_ISSUE_IMAGES,
} from "./images";

const UPLOAD_EXPIRY_SECONDS = 15 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 60 * 60;

async function storage() {
  return (await import("../../minio/minio-client")).minioClient;
}

async function ensureBucket() {
  const client = await storage();
  if (!(await client.bucketExists(MINIO.ISSUE_ASSETS_BUCKET_NAME))) {
    await client.makeBucket(
      MINIO.ISSUE_ASSETS_BUCKET_NAME,
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

async function readPrefix(objectName: string, size: number) {
  const client = await storage();
  const stream = await client.getPartialObject(
    MINIO.ISSUE_ASSETS_BUCKET_NAME,
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

export async function createIssueImageUpload(input: {
  contentType: string;
  draftKey?: string;
  fileName: string;
  issueId?: string;
  ownerUserId: string;
  size: number;
  teamId: string;
}) {
  const validation = checkUploadMetadata(ISSUE_IMAGE_UPLOAD_POLICY, input);
  if (!validation.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
  }
  const id = randomUUID();
  const fileName = safeFileName(input.fileName);
  const objectName = `issues/${input.teamId}/${input.ownerUserId}/${id}/${fileName}`;
  await ensureBucket();
  const client = await storage();
  const [attachment] = await db
    .insert(IssueAttachment)
    .values({
      contentType: validation.type.mimeType,
      draftKey: input.draftKey,
      fileName,
      id,
      issueId: input.issueId,
      objectName,
      ownerUserId: input.ownerUserId,
      size: input.size,
      teamId: input.teamId,
    })
    .returning();
  if (!attachment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return {
    attachmentId: attachment.id,
    contentType: attachment.contentType,
    expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    uploadUrl: await client.presignedPutObject(
      MINIO.ISSUE_ASSETS_BUCKET_NAME,
      objectName,
      UPLOAD_EXPIRY_SECONDS,
    ),
  };
}

export async function finalizeIssueImageUpload(input: {
  attachmentId: string;
  ownerUserId: string;
}) {
  const client = await storage();
  const attachment = await db.query.IssueAttachment.findFirst({
    where: eq(IssueAttachment.id, input.attachmentId),
  });
  if (attachment?.ownerUserId !== input.ownerUserId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (attachment.finalizedAt) {
    return { attachment, finalizedNow: false };
  }
  let stat;
  try {
    stat = await client.statObject(
      MINIO.ISSUE_ASSETS_BUCKET_NAME,
      attachment.objectName,
    );
  } catch {
    throw new TRPCError({
      code: "CONFLICT",
      message: "The upload has not completed.",
    });
  }
  const validation = checkUploadMetadata(ISSUE_IMAGE_UPLOAD_POLICY, {
    contentType: attachment.contentType,
    fileName: attachment.fileName,
    size: stat.size,
  });
  const prefix = await readPrefix(attachment.objectName, stat.size);
  if (
    !validation.ok ||
    stat.size !== attachment.size ||
    matchesUploadSignature(attachment.contentType, prefix) !== true
  ) {
    await client.removeObject(
      MINIO.ISSUE_ASSETS_BUCKET_NAME,
      attachment.objectName,
    );
    await db
      .delete(IssueAttachment)
      .where(eq(IssueAttachment.id, attachment.id));
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The uploaded image does not match the approved metadata.",
    });
  }
  const [saved] = await db
    .update(IssueAttachment)
    .set({ finalizedAt: new Date() })
    .where(
      and(
        eq(IssueAttachment.id, attachment.id),
        isNull(IssueAttachment.finalizedAt),
      ),
    )
    .returning();
  if (saved) return { attachment: saved, finalizedNow: true };
  const raced = await db.query.IssueAttachment.findFirst({
    where: eq(IssueAttachment.id, attachment.id),
  });
  if (!raced?.finalizedAt) throw new TRPCError({ code: "NOT_FOUND" });
  return { attachment: raced, finalizedNow: false };
}

export async function assertIssueImages(input: {
  database: WriteDb;
  description: string;
  draftKey?: string;
  issueId?: string;
  ownerUserId?: string;
  teamId: string;
}) {
  const references = issueImageReferences(input.description);
  if (
    references.some(({ alt }) => alt.trim().length === 0 || alt.length > 500)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Managed issue images require alt text of 500 characters or less.",
    });
  }
  const attachmentIds = issueImageIds(input.description);
  if (attachmentIds.length > MAX_ISSUE_IMAGES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Issues may contain at most ${MAX_ISSUE_IMAGES} managed images.`,
    });
  }
  if (attachmentIds.length === 0) return attachmentIds;
  const attachments = await input.database
    .select()
    .from(IssueAttachment)
    .where(inArray(IssueAttachment.id, attachmentIds));
  const existingReferences = input.issueId
    ? await input.database
        .select({ attachmentId: IssueAttachmentReference.attachmentId })
        .from(IssueAttachmentReference)
        .where(
          and(
            eq(IssueAttachmentReference.issueId, input.issueId),
            inArray(IssueAttachmentReference.attachmentId, attachmentIds),
          ),
        )
    : [];
  const existingReferenceIds = new Set(
    existingReferences.map(({ attachmentId }) => attachmentId),
  );
  if (
    attachments.length !== attachmentIds.length ||
    attachments.some(
      (attachment) =>
        attachment.teamId !== input.teamId ||
        !attachment.finalizedAt ||
        (input.draftKey
          ? attachment.draftKey !== input.draftKey ||
            attachment.ownerUserId !== input.ownerUserId
          : attachment.issueId === input.issueId
            ? attachment.ownerUserId !== input.ownerUserId
            : !existingReferenceIds.has(attachment.id)),
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more managed issue images are invalid.",
    });
  }
  return attachmentIds;
}

export async function attachDraftIssueImages(input: {
  database: WriteDb;
  draftKey: string;
  ownerUserId: string;
  references: { attachmentIds: string[]; issueId: string }[];
}) {
  const attachmentIds = [
    ...new Set(input.references.flatMap(({ attachmentIds }) => attachmentIds)),
  ];
  const references = input.references.flatMap(({ attachmentIds, issueId }) =>
    attachmentIds.map((attachmentId) => ({ attachmentId, issueId })),
  );
  if (references.length > 0) {
    await input.database
      .insert(IssueAttachmentReference)
      .values(references)
      .onConflictDoNothing();
  }
  if (attachmentIds.length === 0) return;
  await input.database
    .update(IssueAttachment)
    .set({ draftKey: null, issueId: null })
    .where(
      and(
        inArray(IssueAttachment.id, attachmentIds),
        eq(IssueAttachment.draftKey, input.draftKey),
        eq(IssueAttachment.ownerUserId, input.ownerUserId),
      ),
    );
}

export async function syncIssueImageReferences(input: {
  attachmentIds: string[];
  database: WriteDb;
  issueId: string;
  ownerUserId: string;
}) {
  await input.database
    .delete(IssueAttachmentReference)
    .where(eq(IssueAttachmentReference.issueId, input.issueId));
  await input.database
    .update(IssueAttachment)
    .set({ draftKey: null, issueId: null })
    .where(
      and(
        eq(IssueAttachment.issueId, input.issueId),
        eq(IssueAttachment.ownerUserId, input.ownerUserId),
      ),
    );
  if (input.attachmentIds.length === 0) return;
  await input.database
    .insert(IssueAttachmentReference)
    .values(
      input.attachmentIds.map((attachmentId) => ({
        attachmentId,
        issueId: input.issueId,
      })),
    )
    .onConflictDoNothing();
}

export async function getIssueImageDownloadUrl(attachmentId: string) {
  const attachment = await db.query.IssueAttachment.findFirst({
    where: eq(IssueAttachment.id, attachmentId),
  });
  if (!attachment?.finalizedAt) throw new TRPCError({ code: "NOT_FOUND" });
  const client = await storage();
  return {
    attachment,
    url: await client.presignedGetObject(
      MINIO.ISSUE_ASSETS_BUCKET_NAME,
      attachment.objectName,
      DOWNLOAD_EXPIRY_SECONDS,
      { "response-content-type": attachment.contentType },
    ),
  };
}

export async function cleanupAbandonedIssueImages({
  now = new Date(),
  retentionMs = 24 * 60 * 60 * 1000,
}: { now?: Date; retentionMs?: number } = {}) {
  const cutoff = new Date(now.getTime() - retentionMs);
  const candidates = await db
    .select()
    .from(IssueAttachment)
    .where(lt(IssueAttachment.createdAt, cutoff))
    .limit(2_000);
  if (candidates.length === 0) return { removed: 0 };
  const references = await db
    .select({ attachmentId: IssueAttachmentReference.attachmentId })
    .from(IssueAttachmentReference)
    .where(
      inArray(
        IssueAttachmentReference.attachmentId,
        candidates.map(({ id }) => id),
      ),
    );
  const retainedIds = new Set(
    references.map(({ attachmentId }) => attachmentId),
  );
  const stale = candidates.filter(
    (candidate) => !retainedIds.has(candidate.id),
  );
  if (stale.length === 0) return { removed: 0 };
  await ensureBucket();
  const client = await storage();
  await client.removeObjects(
    MINIO.ISSUE_ASSETS_BUCKET_NAME,
    stale.map(({ objectName }) => objectName),
  );
  await db.delete(IssueAttachment).where(
    inArray(
      IssueAttachment.id,
      stale.map(({ id }) => id),
    ),
  );
  return { removed: stale.length };
}

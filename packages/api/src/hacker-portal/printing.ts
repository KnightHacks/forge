import { randomUUID } from "node:crypto";

import type {
  HackerPrintJobDto,
  HackerPrintJobsDto,
  HackerStagedPrintFileDto,
} from "@forge/hacker-sdk/contracts";
import { PRINTING } from "@forge/consts";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  sql,
  sum,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  PrintingConfiguration,
  PrintJob,
  PrintJobFile,
} from "@forge/db/schemas/knight-hacks";
import {
  checkUploadContent,
  PRINT_FILE_UPLOAD_POLICY,
} from "@forge/validators";

import type { WriteDb } from "../utils/db";
import type { PrintJobEstimate } from "../utils/printing/estimate";
import type { AuthenticatedPortalContext } from "./reads";
import { createAdminAuditEvent } from "../utils/audit/service";
import {
  printFileName,
  printFileObjectName,
  putPrintFileObject,
  removePrintFileObjects,
} from "../utils/printing/files";
import {
  notifyNewPrintJob,
  notifyPrintJobStatus,
} from "../utils/printing/notifications";
import { loadQueueEstimates } from "../utils/printing/queue";
import { runParticipantCommand } from "./commands";
import { requireApplicationWithStatuses } from "./reads";
import { portalFailure } from "./trpc";

/** Every printing action requires whole-hack check-in. */
function requirePrintAccess(ctx: AuthenticatedPortalContext) {
  return requireApplicationWithStatuses(ctx, ["checkedin"]);
}

async function requirePrintingOpen(
  hackathonId: string,
  executor: WriteDb = db,
) {
  const [configuration] = await executor
    .select({ isOpen: PrintingConfiguration.isOpen })
    .from(PrintingConfiguration)
    .where(eq(PrintingConfiguration.hackathonId, hackathonId))
    // During submit, hold this through the commit so closing cannot race a new job.
    .for("share");
  if (!configuration?.isOpen) {
    portalFailure(
      "PRINTING_CLOSED",
      "Printing is currently closed. Please check back when the printer is on site.",
      { trpcCode: "PRECONDITION_FAILED" },
    );
  }
}

/** Reject closed queues before the upload route reads file bytes. */
export async function requirePrintUploadAccess(
  ctx: AuthenticatedPortalContext,
) {
  const application = await requirePrintAccess(ctx);
  await requirePrintingOpen(ctx.session.hackathonId);
  return application;
}

type PrintJobRow = Pick<
  typeof PrintJob.$inferSelect,
  | "category"
  | "createdAt"
  | "description"
  | "id"
  | "status"
  | "statusChangedAt"
  | "statusNote"
>;

interface PrintJobFileRow {
  fileName: string;
  id: string;
  printJobId: string | null;
  size: number;
}

function printJobDto(
  job: PrintJobRow,
  files: readonly PrintJobFileRow[],
  estimate: PrintJobEstimate | undefined,
): HackerPrintJobDto {
  return {
    category: job.category,
    createdAt: job.createdAt.toISOString(),
    description: job.description,
    estimatedReadyAt: estimate?.estimatedReadyAt.toISOString() ?? null,
    organizerReadyAt: estimate?.overridden
      ? estimate.estimatedReadyAt.toISOString()
      : null,
    files: files
      .filter((file) => file.printJobId === job.id)
      .map((file) => ({
        fileName: file.fileName,
        id: file.id,
        size: file.size,
      })),
    id: job.id,
    position: estimate?.position ?? null,
    status: job.status,
    statusChangedAt: job.statusChangedAt.toISOString(),
    statusNote: job.statusNote,
  };
}

async function loadJobFiles(jobIds: readonly string[], executor: WriteDb) {
  if (jobIds.length === 0) return [];
  return executor
    .select({
      fileName: PrintJobFile.fileName,
      id: PrintJobFile.id,
      printJobId: PrintJobFile.printJobId,
      size: PrintJobFile.size,
    })
    .from(PrintJobFile)
    .where(inArray(PrintJobFile.printJobId, [...jobIds]))
    .orderBy(asc(PrintJobFile.createdAt));
}

/**
 * Keeps room for one more upload: a hacker holds at most
 * `MAX_PRINT_JOB_FILES` unsubmitted files, and older ones are deleted first.
 * The form never holds more than that, so a hacker filling in one job keeps
 * every file; only abandoned uploads (closed tab, retries, scripts) go.
 */
async function dropOldestStagedFiles(
  hackathonId: string,
  hackerAttendeeId: string,
  executor: WriteDb,
) {
  const stale = await executor
    .select({ id: PrintJobFile.id })
    .from(PrintJobFile)
    .where(
      and(
        eq(PrintJobFile.hackathonId, hackathonId),
        eq(PrintJobFile.hackerAttendeeId, hackerAttendeeId),
        isNull(PrintJobFile.printJobId),
      ),
    )
    .orderBy(desc(PrintJobFile.createdAt), desc(PrintJobFile.id))
    .offset(PRINTING.MAX_PRINT_JOB_FILES - 1);
  if (stale.length === 0) return [];
  const removed = await executor
    .delete(PrintJobFile)
    .where(
      and(
        inArray(
          PrintJobFile.id,
          stale.map((file) => file.id),
        ),
        // A submit may have claimed one of them since the read above.
        isNull(PrintJobFile.printJobId),
      ),
    )
    .returning({ objectName: PrintJobFile.objectName });
  return removed.map((file) => file.objectName);
}

/**
 * Stages one uploaded file. It belongs to no job until `submitPrintJob` claims
 * it; unclaimed files are removed by `cleanupAbandonedPrintFiles`. A retried
 * upload stages a second copy, which that cleanup also removes.
 */
export async function uploadPrintFile(
  ctx: AuthenticatedPortalContext,
  input: { bytes: Uint8Array; contentType: string; fileName: string },
): Promise<HackerStagedPrintFileDto> {
  const application = await requirePrintUploadAccess(ctx);
  const check = checkUploadContent(PRINT_FILE_UPLOAD_POLICY, input);
  if (!check.ok) {
    portalFailure("INVALID_PRINT_FILE", check.message, {
      trpcCode: "BAD_REQUEST",
    });
  }
  const fileId = randomUUID();
  const fileName = printFileName(input.fileName);
  const objectName = printFileObjectName({
    fileId,
    fileName,
    hackathonId: ctx.session.hackathonId,
    hackerAttendeeId: application.attendeeId,
  });
  const storageAttempt = { started: false };
  let pruned: string[] = [];
  try {
    await db.transaction(async (tx) => {
      // A database lock works across server instances; fail fast on overlap.
      const lock = await tx.execute<{ acquired: boolean }>(
        sql`select pg_try_advisory_xact_lock(hashtextextended(${`printing:${ctx.session.hackathonId}:${application.attendeeId}`}, 0)) as acquired`,
      );
      if (!lock.rows[0]?.acquired) {
        portalFailure(
          "PRINT_UPLOAD_BUSY",
          "Another upload is in progress. Please try again.",
          { trpcCode: "TOO_MANY_REQUESTS" },
        );
      }
      pruned = await dropOldestStagedFiles(
        ctx.session.hackathonId,
        application.attendeeId,
        tx,
      );
      const [usage] = await tx
        .select({ files: count(), bytes: sum(PrintJobFile.size) })
        .from(PrintJobFile)
        .where(
          and(
            eq(PrintJobFile.hackathonId, ctx.session.hackathonId),
            eq(PrintJobFile.hackerAttendeeId, application.attendeeId),
          ),
        );
      // Submitted, completed, and cancelled jobs still consume storage.
      if (
        !usage ||
        usage.files >= 25 ||
        Number(usage.bytes ?? 0) + input.bytes.length > 250 * 1024 * 1024
      ) {
        portalFailure(
          "PRINT_STORAGE_LIMIT",
          "You have reached your print upload limit (25 files or 250MB). Please contact the organizers.",
          { trpcCode: "TOO_MANY_REQUESTS" },
        );
      }
      storageAttempt.started = true;
      await putPrintFileObject({
        bytes: input.bytes,
        contentType: check.type.mimeType,
        objectName,
      });
      await tx.insert(PrintJobFile).values({
        contentType: check.type.mimeType,
        fileName,
        hackathonId: ctx.session.hackathonId,
        hackerAttendeeId: application.attendeeId,
        id: fileId,
        objectName,
        size: input.bytes.length,
      });
    });
  } catch (error) {
    if (storageAttempt.started) await removePrintFileObjects([objectName]);
    throw error;
  }
  await removePrintFileObjects(pruned);
  return { fileId, fileName, size: input.bytes.length };
}

/** Removes the caller's own unclaimed file. Repeating it is harmless. */
export async function removeStagedPrintFile(
  ctx: AuthenticatedPortalContext,
  input: { fileId: string },
) {
  const application = await requirePrintAccess(ctx);
  const removed = await db
    .delete(PrintJobFile)
    .where(
      and(
        eq(PrintJobFile.id, input.fileId),
        eq(PrintJobFile.hackathonId, ctx.session.hackathonId),
        eq(PrintJobFile.hackerAttendeeId, application.attendeeId),
        isNull(PrintJobFile.printJobId),
      ),
    )
    .returning({ objectName: PrintJobFile.objectName });
  await removePrintFileObjects(removed.map((file) => file.objectName));
  return { fileId: input.fileId };
}

export async function listPrintJobs(
  ctx: AuthenticatedPortalContext,
): Promise<HackerPrintJobsDto> {
  const application = await requirePrintAccess(ctx);
  const jobs = await db
    .select({
      category: PrintJob.category,
      createdAt: PrintJob.createdAt,
      description: PrintJob.description,
      id: PrintJob.id,
      status: PrintJob.status,
      statusChangedAt: PrintJob.statusChangedAt,
      statusNote: PrintJob.statusNote,
    })
    .from(PrintJob)
    .where(
      and(
        eq(PrintJob.hackathonId, ctx.session.hackathonId),
        eq(PrintJob.hackerAttendeeId, application.attendeeId),
      ),
    )
    .orderBy(desc(PrintJob.createdAt), desc(PrintJob.id));
  const [files, queue] = await Promise.all([
    loadJobFiles(
      jobs.map((job) => job.id),
      db,
    ),
    loadQueueEstimates(ctx.session.hackathonId),
  ]);
  return {
    jobs: jobs.map((job) =>
      printJobDto(job, files, queue.estimates.get(job.id)),
    ),
    queue: {
      isOpen: queue.settings.isOpen,
      estimatedWaitMinutes: queue.waitMinutes,
      printMinutes: queue.settings.printMinutes,
      waitingCount: queue.waitingCount,
    },
  };
}

export async function submitPrintJob(
  ctx: AuthenticatedPortalContext,
  input: {
    category: PRINTING.PrintJobCategory;
    description: string;
    fileIds: string[];
    idempotencyKey: string;
  },
): Promise<HackerPrintJobDto> {
  const application = await requirePrintAccess(ctx);
  // Set only when this request created the job, so a replayed submit does not
  // post a second channel notice.
  const created: { jobId: string | null } = { jobId: null };
  // ponytail: a replayed submit returns the estimate from its first run; the
  // next list call recomputes it.
  const result = await db.transaction((tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "submit_print_job",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        // A successful idempotent replay still returns its original job after closing.
        await requirePrintingOpen(ctx.session.hackathonId, tx);
        const [job] = await tx
          .insert(PrintJob)
          .values({
            category: input.category,
            description: input.description,
            hackathonId: ctx.session.hackathonId,
            hackerAttendeeId: application.attendeeId,
          })
          .returning();
        if (!job) throw new Error("Failed to create print job.");

        // Claims only this hacker's unclaimed files at this hackathon. Anything
        // else (someone else's file, a claimed file, a removed file) leaves the
        // count short, and the transaction rolls back.
        const claimed = await tx
          .update(PrintJobFile)
          .set({ printJobId: job.id })
          .where(
            and(
              inArray(PrintJobFile.id, input.fileIds),
              eq(PrintJobFile.hackathonId, ctx.session.hackathonId),
              eq(PrintJobFile.hackerAttendeeId, application.attendeeId),
              isNull(PrintJobFile.printJobId),
            ),
          )
          .returning({
            fileName: PrintJobFile.fileName,
            id: PrintJobFile.id,
            printJobId: PrintJobFile.printJobId,
            size: PrintJobFile.size,
          });
        if (claimed.length !== input.fileIds.length) {
          portalFailure(
            "PRINT_FILE_UNAVAILABLE",
            "One of these files is no longer available. Upload it again.",
            { trpcCode: "CONFLICT" },
          );
        }

        await createAdminAuditEvent(
          {
            actionKey: "printing.job.submitted",
            actor: { id: ctx.session.userId },
            metadata: { fileCount: claimed.length },
            subjects: [
              {
                relation: "primary",
                targetId: job.id,
                targetLabel: "3D print job",
                targetType: "print_job",
              },
            ],
          },
          tx,
        );
        const queue = await loadQueueEstimates(ctx.session.hackathonId, tx);
        created.jobId = job.id;
        return printJobDto(job, claimed, queue.estimates.get(job.id));
      },
    }),
  );
  // After the commit; never throws. The hacker does not see channel delivery.
  if (created.jobId)
    await Promise.all([
      notifyNewPrintJob(created.jobId),
      notifyPrintJobStatus(created.jobId),
    ]);
  return result;
}

export async function cancelPrintJob(
  ctx: AuthenticatedPortalContext,
  input: { idempotencyKey: string; jobId: string },
): Promise<HackerPrintJobDto> {
  const application = await requirePrintAccess(ctx);
  const changed = { value: false };
  const result = await db.transaction((tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "cancel_print_job",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const [job] = await tx
          .select({ status: PrintJob.status })
          .from(PrintJob)
          .where(
            and(
              eq(PrintJob.id, input.jobId),
              eq(PrintJob.hackathonId, ctx.session.hackathonId),
              eq(PrintJob.hackerAttendeeId, application.attendeeId),
            ),
          )
          .for("update")
          .limit(1);
        if (!job) {
          portalFailure("FORBIDDEN", "This print job was not found.", {
            trpcCode: "NOT_FOUND",
          });
        }
        if (
          !(
            PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES as readonly string[]
          ).includes(job.status)
        ) {
          portalFailure(
            "PRINT_JOB_NOT_CANCELLABLE",
            "This print job can no longer be cancelled. Ask an organizer.",
            { trpcCode: "PRECONDITION_FAILED" },
          );
        }

        const [cancelled] = await tx
          .update(PrintJob)
          .set({
            estimatedReadyAt: null,
            status: "cancelled",
            statusChangedAt: new Date(),
            statusChangedByUserId: null,
            statusNote: null,
          })
          .where(eq(PrintJob.id, input.jobId))
          .returning();
        if (!cancelled) throw new Error("Failed to cancel print job.");

        await createAdminAuditEvent(
          {
            actionKey: "printing.job.cancelled",
            actor: { id: ctx.session.userId },
            changes: [
              { after: "cancelled", before: job.status, field: "status" },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: cancelled.id,
                targetLabel: "3D print job",
                targetType: "print_job",
              },
            ],
          },
          tx,
        );
        changed.value = true;
        const files = await loadJobFiles([cancelled.id], tx);
        return printJobDto(cancelled, files, undefined);
      },
    }),
  );
  if (changed.value) await notifyPrintJobStatus(input.jobId);
  return result;
}

/** Owners may classify waiting requests even while new submissions are closed. */
export async function updatePrintJobCategory(
  ctx: AuthenticatedPortalContext,
  input: {
    category: PRINTING.PrintJobCategory;
    idempotencyKey: string;
    jobId: string;
  },
): Promise<HackerPrintJobDto> {
  const application = await requirePrintAccess(ctx);
  const changed = { value: false };
  const result = await db.transaction((tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "update_print_job_category",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const [job] = await tx
          .select()
          .from(PrintJob)
          .where(
            and(
              eq(PrintJob.id, input.jobId),
              eq(PrintJob.hackathonId, ctx.session.hackathonId),
              eq(PrintJob.hackerAttendeeId, application.attendeeId),
            ),
          )
          .for("update")
          .limit(1);
        if (!job)
          portalFailure("FORBIDDEN", "This print job was not found.", {
            trpcCode: "NOT_FOUND",
          });
        if (
          !(
            PRINTING.HACKER_CANCELLABLE_PRINT_JOB_STATUSES as readonly string[]
          ).includes(job.status)
        ) {
          portalFailure(
            "VALIDATION_ERROR",
            "The category can only change before printing starts. Ask an organizer.",
            { trpcCode: "PRECONDITION_FAILED" },
          );
        }
        if (job.category !== input.category) {
          await tx
            .update(PrintJob)
            .set({ category: input.category })
            .where(eq(PrintJob.id, job.id));
          await createAdminAuditEvent(
            {
              actionKey: "printing.job.category_updated",
              actor: { id: ctx.session.userId },
              changes: [
                {
                  before: job.category,
                  after: input.category,
                  field: "category",
                },
              ],
              subjects: [
                {
                  relation: "primary",
                  targetId: job.id,
                  targetLabel: "3D print job",
                  targetType: "print_job",
                },
              ],
            },
            tx,
          );
          changed.value = true;
        }
        const [files, queue] = await Promise.all([
          loadJobFiles([job.id], tx),
          loadQueueEstimates(ctx.session.hackathonId, tx),
        ]);
        return printJobDto(
          { ...job, category: input.category },
          files,
          queue.estimates.get(job.id),
        );
      },
    }),
  );
  if (changed.value)
    await notifyPrintJobStatus(input.jobId, "Your print category was updated.");
  return result;
}

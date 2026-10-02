import { TRPCError } from "@trpc/server";

import { PRINTING } from "@forge/consts";
import { and, asc, count, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackerAttendee,
  HackerProfile,
  PrintingConfiguration,
  PrintJob,
  PrintJobFile,
} from "@forge/db/schemas/knight-hacks";
import {
  printingFileDownloadInputSchema,
  printingHackathonInputSchema,
  printingListInputSchema,
  printingSetChannelInputSchema,
  printingSetEstimatedReadyAtInputSchema,
  printingSetEstimateSettingsInputSchema,
  printingUpdateStatusInputSchema,
} from "@forge/validators";

import type { WriteDb } from "../utils/db";
import type { PrintNotificationDelivery } from "../utils/printing/notifications";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { validateEventAnnouncementChannel } from "../utils/events/announcement-channel";
import { requirePrintingQueue } from "../utils/printing/access";
import { getPrintFileDownloadUrl } from "../utils/printing/files";
import { notifyPrintJobStatus } from "../utils/printing/notifications";
import {
  isActivePrintJobStatus,
  loadEstimateSettings,
  loadQueueEstimates,
} from "../utils/printing/queue";
import { resolveRoleDiscordGateway } from "../utils/roles/discord-gateway";

async function requireHackathon(hackathonId: string) {
  const [hackathon] = await db
    .select({ id: Hackathon.id })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    .limit(1);
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
}

/** Locks one job for a status or ready-time change. */
async function lockPrintJob(tx: WriteDb, jobId: string) {
  const [job] = await tx
    .select()
    .from(PrintJob)
    .where(eq(PrintJob.id, jobId))
    .for("update")
    .limit(1);
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Print job not found." });
  }
  return job;
}

function jobView(job: typeof PrintJob.$inferSelect) {
  return {
    estimatedReadyAt: job.estimatedReadyAt,
    id: job.id,
    status: job.status,
    statusChangedAt: job.statusChangedAt,
    statusNote: job.statusNote,
  };
}

function printJobSubject(jobId: string) {
  return {
    relation: "primary" as const,
    targetId: jobId,
    targetLabel: "3D print job",
    targetType: "print_job" as const,
  };
}

async function upsertConfiguration(
  tx: WriteDb,
  hackathonId: string,
  values: Partial<
    Pick<
      typeof PrintingConfiguration.$inferInsert,
      "discordChannelId" | "printMinutes" | "printerCount"
    >
  >,
) {
  const [row] = await tx
    .insert(PrintingConfiguration)
    .values({ hackathonId, ...values })
    .onConflictDoUpdate({
      set: { ...values, updatedAt: new Date() },
      target: PrintingConfiguration.hackathonId,
    })
    .returning();
  if (!row) throw new Error("Failed to save printing configuration.");
  return row;
}

async function lockConfiguration(tx: WriteDb, hackathonId: string) {
  const [row] = await tx
    .select()
    .from(PrintingConfiguration)
    .where(eq(PrintingConfiguration.hackathonId, hackathonId))
    .for("update")
    .limit(1);
  return row ?? null;
}

export const printingRouter = createTRPCRouter({
  /**
   * Hackathon picker. Running and upcoming first, nearest start first; then
   * past ones, most recent first. Printing happens during the event, so the
   * one in progress is the default.
   */
  listHackathons: permProcedure.query(async ({ ctx }) => {
    requirePrintingQueue(ctx);
    return db
      .select({
        displayName: Hackathon.displayName,
        endDate: Hackathon.endDate,
        id: Hackathon.id,
        startDate: Hackathon.startDate,
        timezone: Hackathon.timezone,
      })
      .from(Hackathon)
      .orderBy(
        sql`case when ${Hackathon.endDate} >= now() then 0 else 1 end`,
        sql`abs(extract(epoch from (${Hackathon.startDate} - now())))`,
      );
  }),

  /** One hackathon's queue, oldest first, with contact info and per-status counts. */
  list: permProcedure
    .input(printingListInputSchema)
    .query(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      const jobs = await db
        .select({
          createdAt: PrintJob.createdAt,
          description: PrintJob.description,
          discordUser: HackerProfile.discordUser,
          email: HackerProfile.email,
          estimatedReadyAt: PrintJob.estimatedReadyAt,
          firstName: HackerProfile.firstName,
          hackerAttendeeId: PrintJob.hackerAttendeeId,
          id: PrintJob.id,
          lastName: HackerProfile.lastName,
          phoneNumber: HackerProfile.phoneNumber,
          status: PrintJob.status,
          statusChangedAt: PrintJob.statusChangedAt,
          statusNote: PrintJob.statusNote,
        })
        .from(PrintJob)
        .innerJoin(
          HackerAttendee,
          eq(HackerAttendee.id, PrintJob.hackerAttendeeId),
        )
        .leftJoin(HackerProfile, eq(HackerProfile.id, HackerAttendee.profileId))
        .where(
          and(
            eq(PrintJob.hackathonId, input.hackathonId),
            input.status === "active"
              ? inArray(PrintJob.status, [...PRINTING.PRINT_JOB_OPEN_STATUSES])
              : input.status
                ? eq(PrintJob.status, input.status)
                : undefined,
          ),
        )
        .orderBy(asc(PrintJob.createdAt), asc(PrintJob.id));

      const jobIds = jobs.map((job) => job.id);
      const [files, statusCounts, cancelCounts, queue] = await Promise.all([
        jobIds.length === 0
          ? []
          : db
              .select({
                fileName: PrintJobFile.fileName,
                id: PrintJobFile.id,
                printJobId: PrintJobFile.printJobId,
                size: PrintJobFile.size,
              })
              .from(PrintJobFile)
              .where(inArray(PrintJobFile.printJobId, jobIds))
              .orderBy(asc(PrintJobFile.createdAt)),
        db
          .select({ status: PrintJob.status, value: count() })
          .from(PrintJob)
          .where(eq(PrintJob.hackathonId, input.hackathonId))
          .groupBy(PrintJob.status),
        db
          .select({
            hackerAttendeeId: PrintJob.hackerAttendeeId,
            value: count(),
          })
          .from(PrintJob)
          .where(
            and(
              eq(PrintJob.hackathonId, input.hackathonId),
              eq(PrintJob.status, "cancelled"),
            ),
          )
          .groupBy(PrintJob.hackerAttendeeId),
        loadQueueEstimates(input.hackathonId),
      ]);

      const cancelCountByAttendee = new Map(
        cancelCounts.map((row) => [row.hackerAttendeeId, row.value]),
      );
      const counts = Object.fromEntries(
        PRINTING.PRINT_JOB_STATUSES.map((status) => [
          status,
          statusCounts.find((row) => row.status === status)?.value ?? 0,
        ]),
      ) as Record<PRINTING.PrintJobStatus, number>;

      return {
        counts,
        jobs: jobs.map((job) => {
          const estimate = queue.estimates.get(job.id);
          return {
            cancelCount: cancelCountByAttendee.get(job.hackerAttendeeId) ?? 0,
            createdAt: job.createdAt,
            description: job.description,
            estimate: estimate
              ? {
                  estimatedReadyAt: estimate.estimatedReadyAt,
                  overridden: estimate.overridden,
                  position: estimate.position,
                }
              : null,
            files: files
              .filter((file) => file.printJobId === job.id)
              .map((file) => ({
                fileName: file.fileName,
                id: file.id,
                size: file.size,
              })),
            id: job.id,
            status: job.status,
            statusChangedAt: job.statusChangedAt,
            statusNote: job.statusNote,
            submitter: {
              discordUser: job.discordUser,
              email: job.email,
              name:
                job.firstName === null
                  ? null
                  : `${job.firstName} ${job.lastName ?? ""}`.trim(),
              phoneNumber: job.phoneNumber,
            },
          };
        }),
        settings: queue.settings,
        total: statusCounts.reduce((sum, row) => sum + row.value, 0),
      };
    }),

  /** Short-lived download link for one file of a submitted job. */
  getFileDownloadUrl: permProcedure
    .input(printingFileDownloadInputSchema)
    .mutation(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      const [file] = await db
        .select({
          contentType: PrintJobFile.contentType,
          fileName: PrintJobFile.fileName,
          objectName: PrintJobFile.objectName,
          printJobId: PrintJobFile.printJobId,
        })
        .from(PrintJobFile)
        .where(eq(PrintJobFile.id, input.fileId))
        .limit(1);
      // Staged files belong to no submitted job yet, so organizers cannot
      // reach them.
      if (!file?.printJobId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
      }
      const url = await getPrintFileDownloadUrl(file);
      await createAdminAuditEvent({
        actionKey: "printing.file.downloaded",
        actor: await captureAdminAuditActor(ctx.session.user),
        metadata: { fileId: input.fileId, fileName: file.fileName },
        subjects: [printJobSubject(file.printJobId)],
      });
      return { url };
    }),

  /**
   * Organizers may set any status. Leaving the active statuses clears the
   * ready-time override. Saving the same status and note is a no-op.
   */
  updateStatus: permProcedure
    .input(printingUpdateStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      const note = input.note ?? null;
      const result = await db.transaction(async (tx) => {
        const job = await lockPrintJob(tx, input.jobId);
        if (job.status === input.status && job.statusNote === note) {
          return { changed: false as const, job: jobView(job) };
        }
        const [updated] = await tx
          .update(PrintJob)
          .set({
            estimatedReadyAt: isActivePrintJobStatus(input.status)
              ? job.estimatedReadyAt
              : null,
            status: input.status,
            // A note-only edit keeps the original change time: for a printing
            // job that time is when printing started, which drives its ETA.
            ...(job.status === input.status
              ? {}
              : {
                  statusChangedAt: new Date(),
                  statusChangedByUserId: ctx.session.user.id,
                }),
            statusNote: note,
          })
          .where(eq(PrintJob.id, job.id))
          .returning();
        if (!updated) throw new Error("Failed to update print job.");
        await createAdminAuditEvent(
          {
            actionKey: "printing.job.status_updated",
            actor: auditActor,
            changes: [
              { after: updated.status, before: job.status, field: "status" },
              {
                after: updated.statusNote,
                before: job.statusNote,
                field: "statusNote",
              },
            ].filter((change) => change.before !== change.after),
            subjects: [printJobSubject(job.id)],
          },
          tx,
        );
        return { changed: true as const, job: jobView(updated) };
      });
      // After the commit. Delivery failures are reported, never thrown, so the
      // status change stands and the organizer learns which notice failed.
      const delivery: PrintNotificationDelivery = result.changed
        ? await notifyPrintJobStatus(result.job.id)
        : { discord: "skipped", email: "skipped" };
      return { ...result, delivery };
    }),

  /** Sets or clears an exact ready time. Sends no notification. */
  setEstimatedReadyAt: permProcedure
    .input(printingSetEstimatedReadyAtInputSchema)
    .mutation(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const job = await lockPrintJob(tx, input.jobId);
        if (!isActivePrintJobStatus(job.status)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Only received or printing jobs have a ready time.",
          });
        }
        const [updated] = await tx
          .update(PrintJob)
          .set({ estimatedReadyAt: input.estimatedReadyAt })
          .where(eq(PrintJob.id, job.id))
          .returning();
        if (!updated) throw new Error("Failed to update print job.");
        await createAdminAuditEvent(
          {
            actionKey: "printing.job.estimate_updated",
            actor: auditActor,
            changes: [
              {
                after: updated.estimatedReadyAt?.toISOString() ?? null,
                before: job.estimatedReadyAt?.toISOString() ?? null,
                field: "estimatedReadyAt",
              },
            ],
            subjects: [printJobSubject(job.id)],
          },
          tx,
        );
        return jobView(updated);
      });
    }),

  getConfiguration: permProcedure
    .input(printingHackathonInputSchema)
    .query(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      const [row] = await db
        .select({ channelId: PrintingConfiguration.discordChannelId })
        .from(PrintingConfiguration)
        .where(eq(PrintingConfiguration.hackathonId, input.hackathonId))
        .limit(1);
      return {
        channelId: row?.channelId ?? null,
        ...(await loadEstimateSettings(input.hackathonId)),
      };
    }),

  /** Guild text channels the bot can post in. */
  listDiscordChannels: permProcedure.query(async ({ ctx }) => {
    requirePrintingQueue(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    return (
      gateway.getGuildTextChannels?.({ requireSendPermission: true }) ?? []
    );
  }),

  /** Chooses or disconnects the new-job channel. */
  setChannel: permProcedure
    .input(printingSetChannelInputSchema)
    .mutation(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      await requireHackathon(input.hackathonId);
      await validateEventAnnouncementChannel(input.channelId, ctx.session);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const before = await lockConfiguration(tx, input.hackathonId);
        const row = await upsertConfiguration(tx, input.hackathonId, {
          discordChannelId: input.channelId,
        });
        await createAdminAuditEvent(
          {
            actionKey: "printing.channel.updated",
            actor: auditActor,
            changes: [
              {
                after: row.discordChannelId,
                before: before?.discordChannelId ?? null,
                field: "discordChannelId",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetLabel: "3D printing configuration",
                targetType: "printing_configuration",
              },
            ],
          },
          tx,
        );
        return { channelId: row.discordChannelId };
      });
    }),

  /** Print time and printer count used for ready-time estimates. */
  setEstimateSettings: permProcedure
    .input(printingSetEstimateSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      requirePrintingQueue(ctx);
      await requireHackathon(input.hackathonId);
      const auditActor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const before = await lockConfiguration(tx, input.hackathonId);
        const row = await upsertConfiguration(tx, input.hackathonId, {
          printMinutes: input.printMinutes,
          printerCount: input.printerCount,
        });
        await createAdminAuditEvent(
          {
            actionKey: "printing.estimate_settings.updated",
            actor: auditActor,
            changes: [
              {
                after: row.printMinutes,
                before: before?.printMinutes ?? PRINTING.DEFAULT_PRINT_MINUTES,
                field: "printMinutes",
              },
              {
                after: row.printerCount,
                before: before?.printerCount ?? PRINTING.DEFAULT_PRINTER_COUNT,
                field: "printerCount",
              },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetLabel: "3D printing configuration",
                targetType: "printing_configuration",
              },
            ],
          },
          tx,
        );
        return {
          printMinutes: row.printMinutes,
          printerCount: row.printerCount,
        };
      });
    }),
});

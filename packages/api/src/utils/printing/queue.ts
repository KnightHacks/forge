import { PRINTING } from "@forge/consts";
import { and, asc, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import {
  PrintingConfiguration,
  PrintJob,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import type { PrintEstimateSettings } from "./estimate";
import { estimateReadyTimes, estimateWaitMinutes } from "./estimate";

export interface PrintSubmissionWindow {
  closeAt: Date | null;
  enabled: boolean;
  isOpen: boolean;
  openAt: Date | null;
}

export function resolvePrintSubmissionWindow(
  row: Pick<
    typeof PrintingConfiguration.$inferSelect,
    "submissionsCloseAt" | "submissionsEnabled" | "submissionsOpenAt"
  > | null,
  now = new Date(),
): PrintSubmissionWindow {
  const enabled = row?.submissionsEnabled ?? false;
  const openAt = row?.submissionsOpenAt ?? null;
  const closeAt = row?.submissionsCloseAt ?? null;
  return {
    closeAt,
    enabled,
    isOpen:
      enabled &&
      (openAt === null || openAt.getTime() <= now.getTime()) &&
      (closeAt === null || closeAt.getTime() > now.getTime()),
    openAt,
  };
}

/** The hackathon's estimate settings, or the defaults when it has no row. */
export async function loadEstimateSettings(
  hackathonId: string,
  executor: WriteDb = db,
): Promise<PrintEstimateSettings> {
  const [row] = await executor
    .select({
      printMinutes: PrintingConfiguration.printMinutes,
      printerCount: PrintingConfiguration.printerCount,
    })
    .from(PrintingConfiguration)
    .where(eq(PrintingConfiguration.hackathonId, hackathonId))
    .limit(1);
  return (
    row ?? {
      printMinutes: PRINTING.DEFAULT_PRINT_MINUTES,
      printerCount: PRINTING.DEFAULT_PRINTER_COUNT,
    }
  );
}

export async function loadSubmissionWindow(
  hackathonId: string,
  executor: WriteDb = db,
  now = new Date(),
): Promise<PrintSubmissionWindow> {
  const [row] = await executor
    .select({
      submissionsCloseAt: PrintingConfiguration.submissionsCloseAt,
      submissionsEnabled: PrintingConfiguration.submissionsEnabled,
      submissionsOpenAt: PrintingConfiguration.submissionsOpenAt,
    })
    .from(PrintingConfiguration)
    .where(eq(PrintingConfiguration.hackathonId, hackathonId))
    .limit(1);
  return resolvePrintSubmissionWindow(row ?? null, now);
}

/**
 * Estimates for every active job at a hackathon. Reads the whole active queue;
 * a hackathon has tens of jobs. If it ever has thousands, number the rows in
 * SQL with `row_number()` instead.
 */
export async function loadQueueEstimates(
  hackathonId: string,
  executor: WriteDb = db,
  now = new Date(),
) {
  const [settings, activeJobs] = await Promise.all([
    loadEstimateSettings(hackathonId, executor),
    executor
      .select({
        estimatedReadyAt: PrintJob.estimatedReadyAt,
        id: PrintJob.id,
        status: PrintJob.status,
        statusChangedAt: PrintJob.statusChangedAt,
      })
      .from(PrintJob)
      .where(
        and(
          eq(PrintJob.hackathonId, hackathonId),
          inArray(PrintJob.status, [...PRINTING.PRINT_JOB_ACTIVE_STATUSES]),
        ),
      )
      .orderBy(asc(PrintJob.createdAt), asc(PrintJob.id)),
  ]);
  return {
    estimates: estimateReadyTimes(activeJobs, settings, now),
    settings,
    waitingCount: activeJobs.length,
    waitMinutes: estimateWaitMinutes(activeJobs.length, settings),
  };
}

export function isActivePrintJobStatus(status: PRINTING.PrintJobStatus) {
  return (PRINTING.PRINT_JOB_ACTIVE_STATUSES as readonly string[]).includes(
    status,
  );
}

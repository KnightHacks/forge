import type { PRINTING } from "@forge/consts";

export interface PrintEstimateSettings {
  printMinutes: number;
  printerCount: number;
}

export interface ActivePrintJob {
  estimatedReadyAt: Date | null;
  id: string;
  status: PRINTING.PrintJobStatus;
  statusChangedAt: Date;
}

export interface PrintJobEstimate {
  estimatedReadyAt: Date;
  overridden: boolean;
  /** Place in the active queue, counting the job itself. */
  position: number;
}

const MINUTE_MS = 60 * 1_000;

/**
 * Ready-time estimates for one hackathon's active queue. `activeJobs` must be
 * the `received` and `printing` jobs, oldest first.
 *
 * - `printing`: started (`statusChangedAt`) plus one print time.
 * - `received`: now plus one print time per round of printers ahead of it.
 * - An organizer-set `estimatedReadyAt` replaces either.
 *
 * Rough on purpose: every print is assumed to take the same time.
 */
export function estimateReadyTimes(
  activeJobs: readonly ActivePrintJob[],
  settings: PrintEstimateSettings,
  now: Date,
) {
  const estimates = new Map<string, PrintJobEstimate>();
  activeJobs.forEach((job, index) => {
    const position = index + 1;
    const computed =
      job.status === "printing"
        ? job.statusChangedAt.getTime() + settings.printMinutes * MINUTE_MS
        : now.getTime() +
          Math.ceil(position / settings.printerCount) *
            settings.printMinutes *
            MINUTE_MS;
    estimates.set(job.id, {
      estimatedReadyAt: job.estimatedReadyAt ?? new Date(computed),
      overridden: job.estimatedReadyAt !== null,
      position,
    });
  });
  return estimates;
}

/** Minutes until a job submitted now, behind `waitingCount` jobs, is ready. */
export function estimateWaitMinutes(
  waitingCount: number,
  settings: PrintEstimateSettings,
) {
  return (
    Math.ceil((waitingCount + 1) / settings.printerCount) *
    settings.printMinutes
  );
}

import { createHash } from "node:crypto";

export const EMAIL_PREVIEW_TTL_MS = 15 * 60 * 1_000;
export const EMAIL_RECIPIENT_RETENTION_DAYS = 90;

interface PreviewFingerprintInput {
  audienceHash: string;
  contentHash: string;
  recipientCount: number;
  scheduleHash: string;
}

export function buildEmailPreviewVersion(input: PreviewFingerprintInput) {
  return `pv_${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}

interface PreviewState {
  audienceHash: string;
  confirmedAt: Date | null;
  contentHash: string;
  expiresAt: Date;
  recipientCount: number;
  sendId: string;
  status: string;
  version: string;
}

export function assertConfirmableEmailPreview({
  actual,
  expectedRecipientCount,
  expectedVersion,
  now,
}: {
  actual: PreviewState;
  expectedRecipientCount: number;
  expectedVersion: string;
  now: Date;
}) {
  if (actual.status !== "draft" || actual.confirmedAt) {
    throw new Error("Email preview is no longer in a confirmable state.");
  }
  if (actual.expiresAt.getTime() <= now.getTime()) {
    throw new Error("Email preview expired. Generate a fresh preview.");
  }
  if (actual.version !== expectedVersion) {
    throw new Error("Email preview version changed. Generate a fresh preview.");
  }
  if (actual.recipientCount !== expectedRecipientCount) {
    throw new Error("Displayed recipient count does not match the preview.");
  }
}

export function reconcileFrozenRecipients({
  frozen,
  latestCandidates,
}: {
  frozen: { email: string; suppressed: boolean }[];
  latestCandidates: { email: string; suppressed: boolean }[];
}) {
  const latest = new Map(
    latestCandidates.map((recipient) => [recipient.email, recipient]),
  );
  const eligible = frozen.filter(
    (recipient) => latest.get(recipient.email)?.suppressed !== true,
  );
  return {
    eligible,
    removedSuppressed: frozen.length - eligible.length,
  };
}

type RetryableStatus =
  | "cancelled"
  | "completed"
  | "failed"
  | "running"
  | "scheduled";

export function canRetryEmailSend({
  providerMayHaveStarted,
  status,
}: {
  providerMayHaveStarted: boolean;
  status: RetryableStatus;
}): { allowed: true } | { allowed: false; reason: string } {
  if (status === "failed" && !providerMayHaveStarted) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: providerMayHaveStarted
      ? "Provider delivery may have started; reconcile before retrying."
      : `A ${status} send cannot be retried.`,
  };
}

type CleanupStatus =
  | "cancelled"
  | "completed"
  | "failed"
  | "running"
  | "scheduled";

export function planRecipientRetentionCleanup({
  now,
  sends,
}: {
  now: Date;
  sends: {
    id: string;
    status: CleanupStatus;
    terminalAt: Date | null;
  }[];
}) {
  const cutoff =
    now.getTime() - EMAIL_RECIPIENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  const terminalStatuses = new Set<CleanupStatus>([
    "cancelled",
    "completed",
    "failed",
  ]);
  return {
    retentionDays: EMAIL_RECIPIENT_RETENTION_DAYS,
    sendIds: sends
      .filter(
        (send) =>
          terminalStatuses.has(send.status) &&
          send.terminalAt !== null &&
          send.terminalAt.getTime() <= cutoff,
      )
      .map(({ id }) => id),
  };
}

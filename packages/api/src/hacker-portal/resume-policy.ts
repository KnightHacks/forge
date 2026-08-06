import { createHash } from "node:crypto";

import { participantPayloadHash } from "./commands";

const RESUME_EDITABLE_STATUSES = new Set([
  "pending",
  "waitlisted",
  "accepted",
  "confirmed",
  "checkedin",
]);

export const RESUME_UPLOAD_COMMAND_LEASE_MS = 10 * 60 * 1_000;

export function isStaleResumeUploadCommand(startedAt: Date, now: Date) {
  return now.getTime() - startedAt.getTime() >= RESUME_UPLOAD_COMMAND_LEASE_MS;
}

export function canEditResumeAt(input: {
  now: Date;
  startDate: Date;
  status: string | null;
}) {
  return (
    input.now < input.startDate &&
    input.status !== null &&
    RESUME_EDITABLE_STATUSES.has(input.status)
  );
}

export function resumeUploadPayloadHash(input: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}) {
  return participantPayloadHash({
    contentHash: createHash("sha256").update(input.bytes).digest("hex"),
    contentType: input.contentType,
    fileName: input.fileName,
  });
}

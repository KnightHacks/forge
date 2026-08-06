export type PublicationProvider = "discord" | "google";
export type PublicationWorkState =
  | "blocked"
  | "failed"
  | "pending"
  | "processing"
  | "succeeded";

const RETRY_BASE_MS = 30_000;
const RETRY_CAP_MS = 30 * 60_000;

export function nextPublicationRetryAt({
  attemptCount,
  now,
  random = Math.random,
}: {
  attemptCount: number;
  now: Date;
  random?: () => number;
}) {
  const exponential = Math.min(
    RETRY_CAP_MS,
    RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1),
  );
  const jitter = Math.floor(exponential * 0.2 * random());
  return new Date(now.getTime() + exponential + jitter);
}

export function publicationHealth({
  desiredEnabled,
  remoteCount,
  states,
}: {
  desiredEnabled: boolean;
  remoteCount: number;
  states: readonly PublicationWorkState[];
}) {
  const counts = {
    blocked: states.filter((state) => state === "blocked").length,
    converged: states.filter((state) => state === "succeeded").length,
    error: states.filter((state) => state === "failed").length,
    pending: states.filter(
      (state) => state === "pending" || state === "processing",
    ).length,
    total: states.length,
    remote: remoteCount,
  };
  const status = counts.blocked
    ? ("blocked" as const)
    : counts.error
      ? ("degraded" as const)
      : counts.pending || counts.converged !== counts.total
        ? desiredEnabled
          ? ("publishing" as const)
          : ("removing" as const)
        : desiredEnabled
          ? ("on" as const)
          : ("off" as const);
  return { counts, status };
}

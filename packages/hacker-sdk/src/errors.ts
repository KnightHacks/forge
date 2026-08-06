export const HACKER_SDK_ERROR_CODES = [
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "REFRESH_RETRY",
  "FORBIDDEN",
  "FORBIDDEN_STATUS",
  "APPLICATION_CLOSED",
  "APPLICATION_LOCKED",
  "DUPLICATE_APPLICATION",
  "STALE_PROFILE_REVISION",
  "CONFIRMATION_CLOSED",
  "CAPACITY_REACHED",
  "INVALID_AGREEMENT",
  "INVALID_RESUME",
  "CONFLICT",
  "VALIDATION_ERROR",
  "NETWORK_ERROR",
  "BAD_RESPONSE",
  "UNKNOWN",
] as const;

export type HackerSdkErrorCode = (typeof HACKER_SDK_ERROR_CODES)[number];

export interface HackerSdkFieldIssue {
  code?: string;
  message?: string;
  path: readonly (number | string)[];
}

export interface HackerSdkErrorDetails {
  code: HackerSdkErrorCode | (string & {});
  fieldIssues?: readonly HackerSdkFieldIssue[];
  message?: string;
  requestId?: string;
  retryable: boolean;
}

export class HackerSdkError extends Error {
  readonly code: HackerSdkErrorDetails["code"];
  readonly fieldIssues?: readonly HackerSdkFieldIssue[];
  readonly requestId?: string;
  readonly retryable: boolean;

  constructor(details: HackerSdkErrorDetails, options?: ErrorOptions) {
    super(
      details.message ?? "The participant request could not be completed.",
      options,
    );
    this.name = "HackerSdkError";
    this.code = details.code;
    this.fieldIssues = details.fieldIssues;
    this.requestId = details.requestId;
    this.retryable = details.retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function findDomainDetails(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;

  if (isRecord(value.domain)) return value.domain;
  if (isRecord(value.error)) {
    const direct = findDomainDetails(value.error);
    if (direct) return direct;
  }
  if (isRecord(value.data)) {
    const direct = findDomainDetails(value.data);
    if (direct) return direct;
  }
  if (isRecord(value.json)) {
    const direct = findDomainDetails(value.json);
    if (direct) return direct;
  }

  if (typeof value.code === "string" && typeof value.retryable === "boolean") {
    return value;
  }
  return undefined;
}

function parseFieldIssues(
  value: unknown,
): readonly HackerSdkFieldIssue[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const issues = value.flatMap((issue): HackerSdkFieldIssue[] => {
    if (!isRecord(issue) || !Array.isArray(issue.path)) return [];
    const path = issue.path.filter(
      (part): part is number | string =>
        typeof part === "number" || typeof part === "string",
    );
    return [
      {
        code: readString(issue.code),
        message: readString(issue.message),
        path,
      },
    ];
  });

  return issues.length > 0 ? issues : undefined;
}

export function parseHackerSdkError(
  cause: unknown,
  fallback?: { requestId?: string; status?: number },
): HackerSdkError {
  if (cause instanceof HackerSdkError) return cause;

  const details = findDomainDetails(cause);
  if (details) {
    return new HackerSdkError(
      {
        code: readString(details.code) ?? "UNKNOWN",
        fieldIssues: parseFieldIssues(details.fieldIssues),
        message: readString(details.message),
        requestId: readString(details.requestId) ?? fallback?.requestId,
        retryable: details.retryable === true,
      },
      cause instanceof Error ? { cause } : undefined,
    );
  }

  const code =
    fallback?.status === 401
      ? "SESSION_EXPIRED"
      : fallback?.status != null && fallback.status >= 500
        ? "NETWORK_ERROR"
        : "UNKNOWN";

  return new HackerSdkError(
    {
      code,
      message: cause instanceof Error ? cause.message : undefined,
      requestId: fallback?.requestId,
      retryable: code === "NETWORK_ERROR",
    },
    cause instanceof Error ? { cause } : undefined,
  );
}

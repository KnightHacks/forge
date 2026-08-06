import { randomUUID } from "node:crypto";

import {
  createPortalSessionService,
  databasePortalSessionStore,
  PortalAuthError,
  readBoundedJson,
} from "@forge/auth/server";

import { env } from "~/env";

const environment =
  env.NODE_ENV === "development" ? "development" : "production";

export const portalSessionService = createPortalSessionService({
  environment,
  store: databasePortalSessionStore,
});

export function portalAuthErrorResponse(error: unknown) {
  const requestId = randomUUID();
  const domainError =
    error instanceof PortalAuthError
      ? error
      : new PortalAuthError("INVALID_GRANT");
  const status =
    domainError.code === "SESSION_EXPIRED"
      ? 401
      : domainError.code === "REFRESH_RETRY"
        ? 409
        : domainError.code === "INVALID_CLIENT"
          ? 403
          : 400;

  return Response.json(
    {
      error: {
        code: domainError.code,
        message:
          domainError.code === "SESSION_EXPIRED"
            ? "The participant session has expired."
            : domainError.code === "REFRESH_RETRY"
              ? "Another participant request refreshed this session. Retry the request."
              : "The participant authorization request is invalid.",
        requestId,
        retryable: domainError.code === "REFRESH_RETRY",
      },
    },
    {
      status,
      headers: {
        "cache-control": "private, no-store",
        "x-request-id": requestId,
      },
    },
  );
}

export async function readJson(request: Request) {
  return readBoundedJson(request, 16_384).catch(() => {
    throw new PortalAuthError("INVALID_GRANT");
  });
}

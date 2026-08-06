import { randomUUID } from "node:crypto";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";

import type {
  PortalClientRecord,
  PortalSessionRecord,
} from "@forge/auth/server";
import {
  createPortalSessionService,
  databasePortalSessionStore,
  PortalAuthError,
} from "@forge/auth/server";

import { nodeEnv } from "../env";

export interface HackerPortalContext {
  client: PortalClientRecord | null;
  headers: Headers;
  requestId: string;
  session: PortalSessionRecord | null;
}

const portalSessions = createPortalSessionService({
  environment: nodeEnv === "development" ? "development" : "production",
  store: databasePortalSessionStore,
});

function bearerToken(headers: Headers) {
  const header = headers.get("authorization");
  const match = /^Bearer\s+([^\s]+)$/i.exec(header ?? "");
  return match?.[1];
}

export async function createHackerPortalContext(input: { headers: Headers }) {
  const requestId = input.headers.get("x-request-id") ?? randomUUID();
  const clientId = input.headers.get("x-forge-portal-client") ?? "";
  const client = clientId
    ? await databasePortalSessionStore.findClient(clientId)
    : null;
  const token = bearerToken(input.headers);
  let session: PortalSessionRecord | null = null;
  if (client?.enabled && token) {
    try {
      session = await portalSessions.authenticate(token, clientId);
    } catch (error) {
      if (!(error instanceof PortalAuthError)) throw error;
    }
  }
  return { client, headers: input.headers, requestId, session };
}

export class HackerPortalDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly options: {
      fieldIssues?: readonly {
        code?: string;
        message?: string;
        path: readonly (number | string)[];
      }[];
      retryable?: boolean;
      trpcCode?: ConstructorParameters<typeof TRPCError>[0]["code"];
    } = {},
  ) {
    super(message);
    this.name = "HackerPortalDomainError";
  }
}

export function portalFailure(
  code: string,
  message: string,
  options?: HackerPortalDomainError["options"],
): never {
  const cause = new HackerPortalDomainError(code, message, options);
  throw new TRPCError({
    cause,
    code: options?.trpcCode ?? "BAD_REQUEST",
    message,
  });
}

const t = initTRPC.context<HackerPortalContext>().create({
  errorFormatter: ({ ctx, error, shape }) => {
    const validationIssues =
      error.cause instanceof ZodError
        ? error.cause.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path.filter(
              (part): part is number | string =>
                typeof part === "number" || typeof part === "string",
            ),
          }))
        : undefined;
    const domain =
      error.cause instanceof HackerPortalDomainError
        ? {
            code: error.cause.code,
            fieldIssues: error.cause.options.fieldIssues,
            message: error.cause.message,
            requestId: ctx?.requestId,
            retryable: error.cause.options.retryable ?? false,
          }
        : {
            code:
              error.code === "UNAUTHORIZED"
                ? "SESSION_EXPIRED"
                : validationIssues
                  ? "VALIDATION_ERROR"
                  : "UNKNOWN",
            fieldIssues: validationIssues,
            message:
              error.code === "UNAUTHORIZED"
                ? "The participant session has expired."
                : validationIssues
                  ? "The participant request is invalid."
                  : "The participant request could not be completed.",
            requestId: ctx?.requestId,
            retryable:
              !validationIssues && error.code === "INTERNAL_SERVER_ERROR",
          };
    return { ...shape, data: { ...shape.data, domain } };
  },
});

export const createHackerPortalRouter = t.router;

export const portalProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.client?.enabled) {
    portalFailure("FORBIDDEN", "This hacker portal is not enabled.", {
      trpcCode: "FORBIDDEN",
    });
  }
  return next({ ctx: { ...ctx, client: ctx.client } });
});

export const participantProcedure = portalProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    portalFailure("SESSION_EXPIRED", "The participant session has expired.", {
      trpcCode: "UNAUTHORIZED",
    });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

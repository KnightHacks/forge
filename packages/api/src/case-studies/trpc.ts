import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import {
  createPortalSessionService,
  databasePortalSessionStore,
  PortalAuthError,
} from "@forge/auth/server";

import { nodeEnv } from "../env";

export interface ProjectsContext {
  headers: Headers;
  userId: string | null;
}

const portalSessions = createPortalSessionService({
  environment: nodeEnv === "development" ? "development" : "production",
  store: databasePortalSessionStore,
});

export async function createProjectsContext(input: {
  headers: Headers;
}): Promise<ProjectsContext> {
  const clientId = input.headers.get("x-forge-portal-client") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(
    input.headers.get("authorization") ?? "",
  );
  const token = match?.[1];
  if (!clientId || !token) return { headers: input.headers, userId: null };
  try {
    const session = await portalSessions.authenticate(token, clientId);
    return {
      headers: input.headers,
      userId: session.clientKind === "projects" ? session.userId : null,
    };
  } catch (error) {
    if (!(error instanceof PortalAuthError)) throw error;
    return { headers: input.headers, userId: null };
  }
}

const t = initTRPC.context<ProjectsContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const createProjectsRouter = t.router;
export const projectsProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

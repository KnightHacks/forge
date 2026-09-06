import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Session } from "@forge/auth/server";

import type { ForgeTRPCMeta } from "./utils/forms/callbacks";
import { resolveJudgeAccess } from "./utils/judging/principal";
import { loadPermissionsForUser } from "./utils/permissions-db";

export interface FormCallbackContext {
  executionId: string;
}

export interface TRPCContext {
  formCallback?: FormCallbackContext | null;
  headers: Headers;
  session: Session | null;
  source: string;
}

export const createTRPCContext = (opts: {
  headers: Headers;
  session?: Session | null;
}): TRPCContext => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";

  return {
    headers: opts.headers,
    session: opts.session ?? null,
    source,
  };
};

const t = initTRPC
  .context<typeof createTRPCContext>()
  .meta<ForgeTRPCMeta>()
  .create({
    transformer: superjson,
    errorFormatter: ({ shape, error }) => ({
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }),
  });

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const formCallbackProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.formCallback) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, formCallback: ctx.formCallback } });
});

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const permProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const permissions = await loadPermissionsForUser(ctx.session.user.id);

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        permissions,
      },
    },
  });
});

export const judgeProcedure = t.procedure.use(async ({ ctx, next }) => {
  const judgePrincipal = await resolveJudgeAccess(ctx);
  if (judgePrincipal.kind !== "member" && judgePrincipal.kind !== "guest") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, judgePrincipal } });
});

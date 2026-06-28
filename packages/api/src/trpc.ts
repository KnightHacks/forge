import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Session } from "@forge/auth/server";

import { loadPermissionsForUser } from "./utils/permissions-db";

export const createTRPCContext = (opts: {
  headers: Headers;
  session?: Session | null;
}) => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";

  return {
    headers: opts.headers,
    session: opts.session ?? null,
    source,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

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
export const judgeProcedure = protectedProcedure;

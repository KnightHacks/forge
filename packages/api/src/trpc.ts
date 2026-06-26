import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export const createTRPCContext = async (opts: {
  headers: Headers;
  session?: unknown;
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
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx });
});

export const permProcedure = protectedProcedure;
export const judgeProcedure = protectedProcedure;

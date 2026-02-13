/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Session } from "@forge/auth/server";
import { validateToken } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";
import { eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";

import {
  getJudgeSessionFromCookie,
  isDiscordAdmin,
  isJudgeAdmin,
} from "./utils";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  session: Session | null;
}) => {
  const authToken = opts.headers.get("Authorization") ?? null;
  const session = await validateToken();
  const source = opts.headers.get("x-trpc-source") ?? "unknown";
  console.log(">>> tRPC Request from", source, "by", session?.user);

  return {
    session,
    opts,
    token: authToken,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
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

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    // Type guard to check if session exists and has a user property
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
      ctx: {
        session: ctx.session,
      },
    });
  });

export const permProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const permRows = await db
    .select({
      permissions: Roles.permissions,
    })
    .from(Roles)
    .innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
    .where(sql`cast(${Permissions.userId} as text) = ${ctx.session.user.id}`);

  const permissionsBits = new Array(
    Object.keys(PERMISSIONS.PERMISSIONS).length,
  ).fill(false) as boolean[];

  permRows.forEach((v) => {
    for (let i = 0; i < v.permissions.length; i++) {
      if (v.permissions.at(i) == "1") permissionsBits[i] = true;
    }
  });

  const permissionsMap = Object.keys(PERMISSIONS.PERMISSIONS).reduce(
    (accumulator, key) => {
      const index = PERMISSIONS.PERMISSIONS[key];
      if (index === undefined) return accumulator;
      accumulator[key] = permissionsBits[index] ?? false;

      return accumulator;
    },
    {} as Record<PERMISSIONS.PermissionKey, boolean>,
  );

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, permissions: permissionsMap },
    },
  });
});

export const judgeProcedure = publicProcedure.use(async ({ ctx, next }) => {
  let isAdmin;
  if (ctx.session) {
    isAdmin = await isDiscordAdmin(ctx.session.user);
  }
  const isJudge = await isJudgeAdmin();

  if (!isAdmin && !isJudge) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const judgeSession = await getJudgeSessionFromCookie();

  return next({
    ctx: {
      ...ctx,
      judgeSession, // { sessionToken, roomName, expires } | null
    },
  });
});

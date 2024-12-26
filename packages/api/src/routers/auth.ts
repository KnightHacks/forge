import type { TRPCRouterRecord } from "@trpc/server";

import { invalidateSessionToken } from "@forge/auth";

import { protectedProcedure, publicProcedure } from "../trpc";
import { isDiscordAdmin } from "../utils";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
  getAdminStatus: publicProcedure.query(({ ctx }) => {
    if (!ctx.session) {
      return false;
    }

    return isDiscordAdmin(ctx.session.user);
  }),
  signOut: protectedProcedure.mutation(async (opts) => {
    if (!opts.ctx.token) {
      return { success: false };
    }
    await invalidateSessionToken(opts.ctx.token);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;

import type { TRPCRouterRecord } from "@trpc/server";

import { invalidateSessionToken } from "@forge/auth/server";
import { discord, permissions } from "@forge/utils";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  liveness: publicProcedure.query(() => {
    return {
      ok: true,
      ts: Date.now(),
      uptimeSec: Math.floor(process.uptime()),
    };
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
  getAdminStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false); // consistent return type
    }

    return discord.isDiscordAdmin(ctx.session.user);
  }),
  getDiscordMemberStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return discord.isDiscordMember(ctx.session.user);
  }),
  getJudgeStatus: publicProcedure.query(async () => {
    const isJudge = await permissions.isJudgeAdmin();
    return isJudge;
  }),

  signOut: protectedProcedure.mutation(async (opts) => {
    if (!opts.ctx.token) {
      return { success: false };
    }
    await invalidateSessionToken(opts.ctx.token);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;

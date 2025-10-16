import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import type { PermissionIndex } from "@forge/consts/knight-hacks";
import { invalidateSessionToken } from "@forge/auth";

import { protectedProcedure, publicProcedure } from "../trpc";
import {
  getUserPermissions,
  isDiscordAdmin,
  isDiscordMember,
  isJudgeAdmin,
  userHasCheckIn,
  userHasFullAdmin,
  userHasPermission,
} from "../utils";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
  getAdminStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false); // consistent return type
    }

    return isDiscordAdmin(ctx.session.user);
  }),
  getDiscordMemberStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return isDiscordMember(ctx.session.user);
  }),

  getUserPermissions: publicProcedure.query(({ ctx }): Promise<string> => {
    if (!ctx.session) {
      return Promise.resolve("00");
    }
    return getUserPermissions(ctx.session.user);
  }),

  hasPermission: publicProcedure
    .input(z.object({ permission: z.number() }))
    .query(({ ctx, input }): Promise<boolean> => {
      if (!ctx.session) {
        return Promise.resolve(false);
      }
      return userHasPermission(
        ctx.session.user,
        input.permission as PermissionIndex,
      );
    }),

  hasFullAdmin: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return userHasFullAdmin(ctx.session.user);
  }),

  getJudgeStatus: publicProcedure.query(async ({ ctx }) => {
    const isJudge = await isJudgeAdmin(ctx.session?.user);
    return isJudge;
  }),

  hasCheckIn: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return userHasCheckIn(ctx.session.user);
  }),

  signOut: protectedProcedure.mutation(async (opts) => {
    if (!opts.ctx.token) {
      return { success: false };
    }
    await invalidateSessionToken(opts.ctx.token);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;

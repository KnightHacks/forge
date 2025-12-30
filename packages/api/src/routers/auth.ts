import type { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { env } from "../env";
import { DEV_KNIGHTHACKS_GUILD_ID, PROD_KNIGHTHACKS_GUILD_ID, type PermissionIndex } from "@forge/consts/knight-hacks";
import { invalidateSessionToken } from "@forge/auth/server";
import { Routes } from "discord-api-types/v10";
import type { APIRole } from "discord-api-types/v10";
import { protectedProcedure, publicProcedure } from "../trpc";
import {
  getUserPermissions,
  isDiscordAdmin,
  isDiscordMember,
  isJudgeAdmin,
  userHasCheckIn,
  userHasFullAdmin,
  userHasPermission,
  userIsOfficer,
  discord
} from "../utils";

const KNIGHTHACKS_GUILD_ID =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_GUILD_ID as string)
    : (DEV_KNIGHTHACKS_GUILD_ID as string);

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

    return isDiscordAdmin(ctx.session.user);
  }),
  getDiscordMemberStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return isDiscordMember(ctx.session.user);
  }),
  getOfficerStatus: publicProcedure.query(({ ctx }): Promise<boolean> => {
    if (!ctx.session) {
      return Promise.resolve(false);
    }
    return userIsOfficer(ctx.session.user);
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

  getJudgeStatus: publicProcedure.query(async () => {
    const isJudge = await isJudgeAdmin();
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

  getDiscordRole: publicProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ctx, input}): Promise<APIRole|null> =>{
      if (!ctx.session) {
        return Promise.resolve(null);
      }
      
      try {
        return (await discord.get(Routes.guildRole(KNIGHTHACKS_GUILD_ID, input.roleId)) as APIRole | null)
      } catch {
        return null
      }
  }),

  getDiscordRoleCounts: publicProcedure
    .query(async ({ctx}): Promise<Record<string, number>|null> =>{
      if (!ctx.session) {
        return Promise.resolve(null);
      }

      return (await discord.get(`/guilds/${KNIGHTHACKS_GUILD_ID}/roles/member-counts`) as Record<string, number>)
  })
} satisfies TRPCRouterRecord;

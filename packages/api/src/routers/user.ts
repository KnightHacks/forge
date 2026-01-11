import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure } from "../trpc";
import z from "zod";
import { controlPerms, discord, KNIGHTHACKS_GUILD_ID, parsePermissions } from "../utils";
import type { APIGuildMember} from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";
import type { PermissionIndex, PermissionKey} from "@forge/consts/knight-hacks";
import { PERMISSIONS } from "@forge/consts/knight-hacks";
import { Roles } from "@forge/db/schemas/knight-hacks";
import { inArray } from "@forge/db";
import { db } from "@forge/db/client";

// helper schema to check if a value is either of type PermissionKey or PermissionIndex
// z.custom doesn't perform any validation by itself, so it will let any type at runtime
const PermissionInputSchema = z.custom<PermissionKey | PermissionIndex>((value) => {
  // check if it's a valid number index
  if (typeof value === "number") {
    // check if the number exists as a value in PERMISSIONS object
    return (Object.values(PERMISSIONS) as number[]).includes(value);
  }
  
  // check if it's a valid string key
  if (typeof value === "string") {
    return value in PERMISSIONS;
  }

  return false;
});

export const userRouter = {
  getUserAvatar: protectedProcedure.query(({ ctx }) => {
    const discordId = ctx.session.user.discordUserId;
    const avatarHash = ctx.session.user.image;
    let avatarUrl = "";
    if (avatarHash) {
      // User has a custom avatar
      const isAnimated = avatarHash.startsWith("a_");
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${isAnimated ? "gif" : "png"}`;
    }
    return { avatar: avatarUrl, name: ctx.session.user.name };
  }),
  // returns a map of of permissions to their boolean values
  // Example:
  // {
  //   "FULL_ADMIN": true,
  //   "CHECK_IN": false,
  //   "MODIFY_MEMBERS": true
  // }
  getPermissions: protectedProcedure.query(async ({ ctx }) => {
    return parsePermissions(ctx.session.user.discordUserId || "");
  }),

  // takes string values of permissions
  controlPerms: protectedProcedure
    .input(z.array(z.string()))
    .query(async ({ input, ctx }) => {
      try {
        return await controlPerms((input as PermissionKey[]), ctx.session.user.discordUserId)
      } catch {
        return false
      }
    }),
} satisfies TRPCRouterRecord;
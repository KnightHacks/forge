import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure } from "../trpc";
import z from "zod";
import { discord, KNIGHTHACKS_GUILD_ID, parsePermissions } from "../utils";
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
    return parsePermissions(ctx.session?.user.discordUserId || "");
  }),
  // accepts both the string with the name of the permission (the key), or the index of the permission (the value)
  hasPermission: protectedProcedure
    .input(PermissionInputSchema)
    .query(async ({ input, ctx }) => {
      const guildMember = (await discord.get(
        Routes.guildMember(KNIGHTHACKS_GUILD_ID, ctx.session.user.discordUserId),
      )) as APIGuildMember;

      if (guildMember.roles.length === 0) {
        return false;
      }

      // get only roles the user has
      const userDbRoles = await db
        .select()
        .from(Roles)
        .where(inArray(Roles.discordRoleId, guildMember.roles));

      const permissionIndex = (() => {
        if (typeof input === 'string') {
          return PERMISSIONS[input];
        }

        return input;
      })();

      return userDbRoles.some(role => role.permissions?.[permissionIndex] === "1");
    }),
} satisfies TRPCRouterRecord;
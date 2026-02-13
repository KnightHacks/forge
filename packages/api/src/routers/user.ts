import type { TRPCRouterRecord } from "@trpc/server";

import { db } from "@forge/db/client";

import { permProcedure, protectedProcedure } from "../trpc";
import { controlPerms } from "../utils";

// // helper schema to check if a value is either of type PermissionKey or PermissionIndex
// // z.custom doesn't perform any validation by itself, so it will let any type at runtime
// const PermissionInputSchema = z.custom<PermissionKey | PermissionIndex>(
//   (value) => {
//     // check if it's a valid number index
//     if (typeof value === "number") {
//       // check if the number exists as a value in PERMISSIONS object
//       return (Object.values(PERMISSIONS.PERMISSIONS) as number[]).includes(value);
//     }

//     // check if it's a valid string key
//     if (typeof value === "string") {
//       return value in PERMISSIONS;
//     }

//     return false;
//   },
// );

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

  // Also appends roles to returned users
  getUsers: permProcedure.query(async ({ ctx }) => {
    controlPerms.or(["CONFIGURE_ROLES"], ctx);
    const users = await db.query.User.findMany({
      with: {
        permissions: true,
      },
    });

    return users;
  }),
} satisfies TRPCRouterRecord;

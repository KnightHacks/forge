import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure } from "../trpc";

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
} satisfies TRPCRouterRecord;

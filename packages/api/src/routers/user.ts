import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure } from "../trpc";

export const userRouter = {
  getUserAvatar: protectedProcedure.query(({ ctx }) => {
    const avatarUrl = ctx.session.user.image;
    return { avatar: avatarUrl, name: ctx.session.user.name };
  }),
} satisfies TRPCRouterRecord;

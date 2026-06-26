import type { TRPCRouterRecord } from "@trpc/server";

import { publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    if (!ctx.session) return null;

    return {
      user: {
        id: ctx.session.user.id,
        discordUserId: ctx.session.user.discordUserId,
        email: ctx.session.user.email,
        image: ctx.session.user.image,
        name: ctx.session.user.name,
      },
    };
  }),

  liveness: publicProcedure.query(() => ({
    ok: true,
    service: "forge-auth",
  })),
} satisfies TRPCRouterRecord;

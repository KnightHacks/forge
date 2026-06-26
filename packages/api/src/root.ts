import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    ok: true,
    service: "forge-api-reforge-scaffold",
  })),
});

export type AppRouter = typeof appRouter;

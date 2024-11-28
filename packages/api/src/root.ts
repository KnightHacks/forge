import { authRouter } from "./router/auth";
import { paymentRouter } from "./router/payment";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  payment: paymentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

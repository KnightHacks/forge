import { authRouter } from "./router/auth";
import { memberRouter } from "./router/member";
import { paymentRouter } from "./router/payment";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  payment: paymentRouter,
  member: memberRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

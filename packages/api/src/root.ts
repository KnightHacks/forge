import { authRouter } from "./routers/auth";
import { duesPaymentRouter } from "./routers/dues-payment";
import { eventRouter } from "./routers/event";
import { memberRouter } from "./routers/member";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  duesPayment: duesPaymentRouter,
  member: memberRouter,
  event: eventRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

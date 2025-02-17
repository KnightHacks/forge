import { authRouter } from "./routers/auth";
import { duesPaymentRouter } from "./routers/dues-payment";
import { eventRouter } from "./routers/event";
import { eventFeedbackRouter } from "./routers/event-feedback";
import { memberRouter } from "./routers/member";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter<{
  auth: typeof authRouter;
  duesPayment: typeof duesPaymentRouter;
  member: typeof memberRouter;
  event: typeof eventRouter;
  eventFeedback: typeof eventFeedbackRouter;
  user: typeof userRouter;
  resume: typeof resumeRouter;
  qr: typeof qrRouter;
}>({
  auth: authRouter,
  duesPayment: duesPaymentRouter,
  member: memberRouter,
  event: eventRouter,
  eventFeedback: eventFeedbackRouter,
  user: userRouter,
  resume: resumeRouter,
  qr: qrRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

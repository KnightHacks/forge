import { authRouter } from "./routers/auth";
import { duesPaymentRouter } from "./routers/dues-payment";
import { emailRouter } from "./routers/email";
import { eventRouter } from "./routers/event";
import { eventFeedbackRouter } from "./routers/event-feedback";
import { guildRouter } from "./routers/guild";
import { hackathonRouter } from "./routers/hackathon";
import { hackerRouter } from "./routers/hacker";
import { judgeSubmissionsRouter } from "./routers/judge-submissions";
import { judgeRouter } from "./routers/judge";
import { memberRouter } from "./routers/member";
import { passkitRouter } from "./routers/passkit";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter<{
  auth: typeof authRouter;
  duesPayment: typeof duesPaymentRouter;
  member: typeof memberRouter;
  hackathon: typeof hackathonRouter;
  hacker: typeof hackerRouter;
  judgeSubmissions: typeof judgeSubmissionsRouter;
  event: typeof eventRouter;
  eventFeedback: typeof eventFeedbackRouter;
  user: typeof userRouter;
  resume: typeof resumeRouter;
  qr: typeof qrRouter;
  passkit: typeof passkitRouter;
  email: typeof emailRouter;
  guild: typeof guildRouter;
  judge: typeof judgeRouter;
}>({
  auth: authRouter,
  duesPayment: duesPaymentRouter,
  member: memberRouter,
  hackathon: hackathonRouter,
  hacker: hackerRouter,
  event: eventRouter,
  eventFeedback: eventFeedbackRouter,
  judgeSubmissions: judgeSubmissionsRouter,
  user: userRouter,
  resume: resumeRouter,
  qr: qrRouter,
  passkit: passkitRouter,
  email: emailRouter,
  guild: guildRouter,
  judge: judgeRouter,
});


export type AppRouter = typeof appRouter;

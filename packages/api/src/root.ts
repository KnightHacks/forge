import { authRouter } from "./routers/auth";
import { challengeRouter } from "./routers/challenges";
import { csvImporterRouter } from "./routers/csv-importer";
import { duesPaymentRouter } from "./routers/dues-payment";
import { emailRouter } from "./routers/email";
import { emailQueueRouter } from "./routers/email-queue";
import { eventRouter } from "./routers/event";
import { eventFeedbackRouter } from "./routers/event-feedback";
import { guildRouter } from "./routers/guild";
import { hackathonRouter } from "./routers/hackathon";
import { hackerRouter } from "./routers/hacker";
import { judgeRouter } from "./routers/judge";
import { judgeSubmissionsRouter } from "./routers/judge-submissions";
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
  event: typeof eventRouter;
  eventFeedback: typeof eventFeedbackRouter;
  user: typeof userRouter;
  resume: typeof resumeRouter;
  qr: typeof qrRouter;
  passkit: typeof passkitRouter;
  email: typeof emailRouter;
  emailQueue: typeof emailQueueRouter;
  guild: typeof guildRouter;
  judge: typeof judgeRouter;
  challenge: typeof challengeRouter;
  csvImporter: typeof csvImporterRouter;
  judgeSubmissions: typeof judgeSubmissionsRouter;
}>({
  auth: authRouter,
  duesPayment: duesPaymentRouter,
  member: memberRouter,
  hackathon: hackathonRouter,
  hacker: hackerRouter,
  event: eventRouter,
  eventFeedback: eventFeedbackRouter,
  user: userRouter,
  resume: resumeRouter,
  qr: qrRouter,
  passkit: passkitRouter,
  email: emailRouter,
  emailQueue: emailQueueRouter,
  guild: guildRouter,
  judge: judgeRouter,
  challenge: challengeRouter,
  csvImporter: csvImporterRouter,
  judgeSubmissions: judgeSubmissionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

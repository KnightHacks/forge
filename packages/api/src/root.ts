import { authRouter } from "./routers/auth";
import { challengeRouter } from "./routers/challenges";
import { companiesRouter } from "./routers/companies";
import { csvImporterRouter } from "./routers/csv-importer";
import { duesPaymentRouter } from "./routers/dues-payment";
import { emailRouter } from "./routers/email";
import { eventRouter } from "./routers/event";
import { eventFeedbackRouter } from "./routers/event-feedback";
import { formsRouter } from "./routers/forms";
import { guildRouter } from "./routers/guild";
import { hackathonRouter } from "./routers/hackathon";
import { hackerMutationRouter } from "./routers/hackers/mutations";
import { hackerPaginationRouter } from "./routers/hackers/pagination";
import { hackerQueryRouter } from "./routers/hackers/queries";
import { issuesRouter } from "./routers/issues";
import { judgeRouter } from "./routers/judge";
import { memberRouter } from "./routers/member";
import { miscRouter } from "./routers/misc";
import { passkitRouter } from "./routers/passkit";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { rolesRouter } from "./routers/roles";
import { templatesRouter } from "./routers/templates";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter<{
  misc: typeof miscRouter;
  auth: typeof authRouter;
  duesPayment: typeof duesPaymentRouter;
  member: typeof memberRouter;
  hackathon: typeof hackathonRouter;
  hackerPagination: typeof hackerPaginationRouter;
  hackerQuery: typeof hackerQueryRouter;
  hackerMutation: typeof hackerMutationRouter;
  event: typeof eventRouter;
  eventFeedback: typeof eventFeedbackRouter;
  user: typeof userRouter;
  resume: typeof resumeRouter;
  qr: typeof qrRouter;
  passkit: typeof passkitRouter;
  email: typeof emailRouter;
  guild: typeof guildRouter;
  judge: typeof judgeRouter;
  challenge: typeof challengeRouter;
  csvImporter: typeof csvImporterRouter;
  companies: typeof companiesRouter;
  forms: typeof formsRouter;
  roles: typeof rolesRouter;
  issues: typeof issuesRouter;
  templates: typeof templatesRouter;
}>({
  misc: miscRouter,
  auth: authRouter,
  duesPayment: duesPaymentRouter,
  member: memberRouter,
  hackathon: hackathonRouter,
  hackerPagination: hackerPaginationRouter,
  hackerMutation: hackerMutationRouter,
  hackerQuery: hackerQueryRouter,
  event: eventRouter,
  eventFeedback: eventFeedbackRouter,
  user: userRouter,
  resume: resumeRouter,
  qr: qrRouter,
  passkit: passkitRouter,
  email: emailRouter,
  guild: guildRouter,
  judge: judgeRouter,
  challenge: challengeRouter,
  csvImporter: csvImporterRouter,
  companies: companiesRouter,
  forms: formsRouter,
  roles: rolesRouter,
  issues: issuesRouter,
  templates: templatesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

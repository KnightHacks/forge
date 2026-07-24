import { analyticsRouter } from "./routers/analytics";
import { authRouter } from "./routers/auth";
import { careerRouter } from "./routers/career";
import { duesRouter } from "./routers/dues";
import { eventRouter } from "./routers/event";
import { formsRouter } from "./routers/forms";
import { guildRouter } from "./routers/guild";
import { issuesRouter } from "./routers/issues";
import { memberRouter } from "./routers/member";
import { profilePictureRouter } from "./routers/profile-picture";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { rolesRouter } from "./routers/roles";
import { createTRPCRouter, publicProcedure } from "./trpc";

const healthProcedure = publicProcedure.query(() => ({
  ok: true,
  service: "forge-api-reforge-scaffold",
}));

export interface AppRouterShape {
  analytics: typeof analyticsRouter;
  auth: typeof authRouter;
  career: typeof careerRouter;
  dues: typeof duesRouter;
  event: typeof eventRouter;
  forms: typeof formsRouter;
  guild: typeof guildRouter;
  health: typeof healthProcedure;
  issues: typeof issuesRouter;
  member: typeof memberRouter;
  profilePicture: typeof profilePictureRouter;
  qr: typeof qrRouter;
  resume: typeof resumeRouter;
  roles: typeof rolesRouter;
}

export type AppRouterRecord = {
  [Key in keyof AppRouterShape]: AppRouterShape[Key];
};

const appRouterRecord: AppRouterRecord = {
  analytics: analyticsRouter,
  auth: authRouter,
  career: careerRouter,
  dues: duesRouter,
  event: eventRouter,
  forms: formsRouter,
  guild: guildRouter,
  health: healthProcedure,
  issues: issuesRouter,
  member: memberRouter,
  profilePicture: profilePictureRouter,
  qr: qrRouter,
  resume: resumeRouter,
  roles: rolesRouter,
};

export type AppRouter = ReturnType<typeof createTRPCRouter<AppRouterRecord>>;

export const appRouter: AppRouter = createTRPCRouter(appRouterRecord);

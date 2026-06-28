import { authRouter } from "./routers/auth";
import { duesRouter } from "./routers/dues";
import { formsRouter } from "./routers/forms";
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
  auth: typeof authRouter;
  dues: typeof duesRouter;
  forms: typeof formsRouter;
  health: typeof healthProcedure;
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
  auth: authRouter,
  dues: duesRouter,
  forms: formsRouter,
  health: healthProcedure,
  member: memberRouter,
  profilePicture: profilePictureRouter,
  qr: qrRouter,
  resume: resumeRouter,
  roles: rolesRouter,
};

export type AppRouter = ReturnType<typeof createTRPCRouter<AppRouterRecord>>;

export const appRouter: AppRouter = createTRPCRouter(appRouterRecord);

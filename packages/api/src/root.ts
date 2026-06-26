import { authRouter } from "./routers/auth";
import { formsRouter } from "./routers/forms";
import { memberRouter } from "./routers/member";
import { profilePictureRouter } from "./routers/profile-picture";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  forms: formsRouter,
  health: publicProcedure.query(() => ({
    ok: true,
    service: "forge-api-reforge-scaffold",
  })),
  member: memberRouter,
  profilePicture: profilePictureRouter,
  qr: qrRouter,
  resume: resumeRouter,
});

export type AppRouter = typeof appRouter;

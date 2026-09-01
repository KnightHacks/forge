import { alumniRouter } from "./routers/alumni";
import { analyticsRouter } from "./routers/analytics";
import { auditRouter } from "./routers/audit";
import { authRouter } from "./routers/auth";
import { careerRouter } from "./routers/career";
import { clubTeamsRouter } from "./routers/club-teams";
import { discordArchiveRouter } from "./routers/discord-archive";
import { discordConfigRouter } from "./routers/discord-config";
import { duesRouter } from "./routers/dues";
import { emailRouter } from "./routers/email";
import { eventRouter } from "./routers/event";
import { formsRouter } from "./routers/forms";
import { guildRouter } from "./routers/guild";
import { hackathonRouter } from "./routers/hackathon";
import { hackathonEventRouter } from "./routers/hackathon-event";
import { hackerRouter } from "./routers/hacker";
import { issuesRouter } from "./routers/issues";
import { memberRouter } from "./routers/member";
import { memberAdminRouter } from "./routers/member-admin";
import { profilePictureRouter } from "./routers/profile-picture";
import { projectsRouter } from "./routers/projects";
import { qrRouter } from "./routers/qr";
import { resumeRouter } from "./routers/resume";
import { rolesRouter } from "./routers/roles";
import { createTRPCRouter, publicProcedure } from "./trpc";

const healthProcedure = publicProcedure.query(() => ({
  ok: true,
  service: "forge-api",
}));

export interface AppRouterShape {
  alumni: typeof alumniRouter;
  analytics: typeof analyticsRouter;
  audit: typeof auditRouter;
  auth: typeof authRouter;
  career: typeof careerRouter;
  clubTeams: typeof clubTeamsRouter;
  dues: typeof duesRouter;
  discordArchive: typeof discordArchiveRouter;
  discordConfig: typeof discordConfigRouter;
  email: typeof emailRouter;
  event: typeof eventRouter;
  forms: typeof formsRouter;
  guild: typeof guildRouter;
  hackathon: typeof hackathonRouter;
  hackathonEvent: typeof hackathonEventRouter;
  hacker: typeof hackerRouter;
  health: typeof healthProcedure;
  issues: typeof issuesRouter;
  member: typeof memberRouter;
  memberAdmin: typeof memberAdminRouter;
  profilePicture: typeof profilePictureRouter;
  projects: typeof projectsRouter;
  qr: typeof qrRouter;
  resume: typeof resumeRouter;
  roles: typeof rolesRouter;
}

export type AppRouterRecord = {
  [Key in keyof AppRouterShape]: AppRouterShape[Key];
};

const appRouterRecord: AppRouterRecord = {
  alumni: alumniRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  auth: authRouter,
  career: careerRouter,
  clubTeams: clubTeamsRouter,
  dues: duesRouter,
  discordArchive: discordArchiveRouter,
  discordConfig: discordConfigRouter,
  email: emailRouter,
  event: eventRouter,
  forms: formsRouter,
  guild: guildRouter,
  hackathon: hackathonRouter,
  hackathonEvent: hackathonEventRouter,
  hacker: hackerRouter,
  health: healthProcedure,
  issues: issuesRouter,
  member: memberRouter,
  memberAdmin: memberAdminRouter,
  profilePicture: profilePictureRouter,
  projects: projectsRouter,
  qr: qrRouter,
  resume: resumeRouter,
  roles: rolesRouter,
};

export type AppRouter = ReturnType<typeof createTRPCRouter<AppRouterRecord>>;

export const appRouter: AppRouter = createTRPCRouter(appRouterRecord);

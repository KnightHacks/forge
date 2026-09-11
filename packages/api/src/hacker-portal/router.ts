import { TRPCError } from "@trpc/server";

import { HACKER_PARTICIPANT_V1_SCHEMAS } from "@forge/hacker-sdk/contracts";

import {
  inviteProjectMember,
  previewProjectClaim,
  selectProjectMember,
} from "../utils/project-claims/claims";
import {
  hackerJudging,
  searchJudgingProjects,
} from "../utils/project-claims/itinerary";
import {
  confirmAttendance,
  getCheckInPass,
  submitApplication,
  updateApplication,
  updateParticipant,
  updateProfile,
  withdrawApplication,
} from "./mutations";
import {
  getApplicationContext,
  getDashboard,
  getLeaderboard,
  getMyAttendance,
  getMyPoints,
  getPortalSession,
  getPublicHackathon,
  getSchedule,
} from "./reads";
import { getResume, removeResume } from "./resume";
import {
  createHackerPortalRouter,
  participantProcedure,
  portalFailure,
  portalProcedure,
} from "./trpc";

async function judgingRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (
      error instanceof TRPCError &&
      [
        "BAD_REQUEST",
        "FORBIDDEN",
        "CONFLICT",
        "NOT_FOUND",
        "PRECONDITION_FAILED",
      ].includes(error.code)
    ) {
      portalFailure(error.code, error.message, { trpcCode: error.code });
    }
    throw error;
  }
}

export const hackerParticipantV1Router: ReturnType<
  typeof createHackerPortalRouter
> = createHackerPortalRouter({
  searchJudgingProjects: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.searchJudgingProjects)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.searchJudgingProjects)
    .query(({ ctx, input }) =>
      judgingRequest(() =>
        searchJudgingProjects(
          ctx.session.userId,
          ctx.client.hackathonId,
          input.query,
        ),
      ),
    ),
  inviteProjectMember: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.inviteProjectMember)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.inviteProjectMember)
    .mutation(({ ctx, input }) =>
      judgingRequest(() =>
        inviteProjectMember(
          ctx.session.userId,
          ctx.client.hackathonId,
          input.email,
        ),
      ),
    ),
  claimProject: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.claimProject)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.claimProject)
    .mutation(({ ctx, input }) =>
      judgingRequest(() =>
        selectProjectMember(ctx.session.userId, ctx.client.hackathonId, input),
      ),
    ),
  getProjectClaim: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getProjectClaim)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getProjectClaim)
    .query(({ ctx, input }) =>
      judgingRequest(() =>
        previewProjectClaim(
          ctx.session.userId,
          ctx.client.hackathonId,
          input.token,
        ),
      ),
    ),
  getJudging: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getJudging)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getJudging)
    .query(({ ctx, input }) =>
      judgingRequest(() =>
        hackerJudging(
          ctx.session.userId,
          ctx.client.hackathonId,
          input.projectId,
        ),
      ),
    ),
  confirmAttendance: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.confirmAttendance)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.confirmAttendance)
    .mutation(({ ctx, input }) => confirmAttendance(ctx, input)),
  getApplicationContext: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getApplicationContext)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getApplicationContext)
    .query(({ ctx }) => getApplicationContext(ctx)),
  getCheckInPass: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getCheckInPass)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getCheckInPass)
    .mutation(({ ctx, input }) => getCheckInPass(ctx, input)),
  getDashboard: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getDashboard)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getDashboard)
    .query(({ ctx }) => getDashboard(ctx)),
  getLeaderboard: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getLeaderboard)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getLeaderboard)
    .query(({ ctx, input }) => getLeaderboard(ctx, input)),
  getMyAttendance: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getMyAttendance)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getMyAttendance)
    .query(({ ctx }) => getMyAttendance(ctx)),
  getMyPoints: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getMyPoints)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getMyPoints)
    .query(({ ctx }) => getMyPoints(ctx)),
  getPublicHackathon: portalProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getPublicHackathon)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getPublicHackathon)
    .query(({ ctx }) => getPublicHackathon(ctx)),
  getResume: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getResume)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getResume)
    .query(({ ctx }) => getResume(ctx)),
  getSchedule: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getSchedule)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getSchedule)
    .query(({ ctx }) => getSchedule(ctx)),
  getSession: portalProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.getSession)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.getSession)
    .query(({ ctx }) => getPortalSession(ctx)),
  removeResume: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.removeResume)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.removeResume)
    .mutation(({ ctx, input }) => removeResume(ctx, input)),
  submitApplication: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.submitApplication)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.submitApplication)
    .mutation(({ ctx, input }) => submitApplication(ctx, input)),
  updateApplication: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.updateApplication)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.updateApplication)
    .mutation(({ ctx, input }) => updateApplication(ctx, input)),
  updateParticipant: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.updateParticipant)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.updateParticipant)
    .mutation(({ ctx, input }) => updateParticipant(ctx, input)),
  updateProfile: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.updateProfile)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.updateProfile)
    .mutation(({ ctx, input }) => updateProfile(ctx, input)),
  withdrawApplication: participantProcedure
    .input(HACKER_PARTICIPANT_V1_SCHEMAS.input.withdrawApplication)
    .output(HACKER_PARTICIPANT_V1_SCHEMAS.output.withdrawApplication)
    .mutation(({ ctx, input }) => withdrawApplication(ctx, input)),
});

export type HackerParticipantV1Router = typeof hackerParticipantV1Router;

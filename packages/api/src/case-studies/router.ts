import {
  caseStudyConsentInputSchema,
  caseStudyContributorEditSchema,
  caseStudyContributorInputSchema,
  caseStudyCreateInputSchema,
  caseStudyDraftInputSchema,
  caseStudyIdInputSchema,
  caseStudyInvitationConfirmationSchema,
  caseStudyInvitationIdSchema,
  caseStudyInvitationSchema,
  caseStudyInvitationTokenSchema,
  caseStudySubmissionSchema,
  caseStudyTransferOfferSchema,
} from "@forge/validators";

import {
  acceptTransfer,
  confirmContributor,
  createStudy,
  decideConsent,
  getMyAttribution,
  getMyStudy,
  inviteContributor,
  listContributors,
  listInvitations,
  listMyStudies,
  offerTransfer,
  redeemInvitation,
  removeContributor,
  revokeInvitation,
  saveDraft,
  setContributorEdit,
  submitStudy,
  withdrawStudy,
} from "./service";
import { createProjectsRouter, projectsProcedure } from "./trpc";

export const caseStudiesRouter = createProjectsRouter({
  create: projectsProcedure
    .input(caseStudyCreateInputSchema)
    .mutation(({ ctx, input }) => createStudy(ctx.userId, input.slug)),
  listMine: projectsProcedure.query(({ ctx }) => listMyStudies(ctx.userId)),
  getMine: projectsProcedure
    .input(caseStudyIdInputSchema)
    .query(({ ctx, input }) => getMyStudy(ctx.userId, input.caseStudyId)),
  getMyAttribution: projectsProcedure
    .input(caseStudyIdInputSchema)
    .query(({ ctx, input }) => getMyAttribution(ctx.userId, input.caseStudyId)),
  listContributors: projectsProcedure
    .input(caseStudyIdInputSchema)
    .query(({ ctx, input }) => listContributors(ctx.userId, input.caseStudyId)),
  saveDraft: projectsProcedure
    .input(caseStudyDraftInputSchema)
    .mutation(({ ctx, input }) => saveDraft(ctx.userId, input)),
  submit: projectsProcedure
    .input(caseStudySubmissionSchema)
    .mutation(({ ctx, input }) => submitStudy(ctx.userId, input)),
  inviteContributor: projectsProcedure
    .input(caseStudyInvitationSchema)
    .mutation(({ ctx, input }) => inviteContributor(ctx.userId, input)),
  listInvitations: projectsProcedure
    .input(caseStudyIdInputSchema)
    .query(({ ctx, input }) => listInvitations(ctx.userId, input.caseStudyId)),
  revokeInvitation: projectsProcedure
    .input(caseStudyInvitationIdSchema)
    .mutation(({ ctx, input }) =>
      revokeInvitation(ctx.userId, input.invitationId),
    ),
  redeemInvitation: projectsProcedure
    .input(caseStudyInvitationTokenSchema)
    .mutation(({ ctx, input }) => redeemInvitation(ctx.userId, input.token)),
  confirmContributor: projectsProcedure
    .input(caseStudyInvitationConfirmationSchema)
    .mutation(({ ctx, input }) =>
      confirmContributor(ctx.userId, input.invitationId, input.attribution),
    ),
  decideConsent: projectsProcedure
    .input(caseStudyConsentInputSchema)
    .mutation(({ ctx, input }) => decideConsent(ctx.userId, input)),
  setContributorEdit: projectsProcedure
    .input(caseStudyContributorEditSchema)
    .mutation(({ ctx, input }) => setContributorEdit(ctx.userId, input)),
  removeContributor: projectsProcedure
    .input(caseStudyContributorInputSchema)
    .mutation(({ ctx, input }) =>
      removeContributor(ctx.userId, input.caseStudyId, input.contributorUserId),
    ),
  offerTransfer: projectsProcedure
    .input(caseStudyTransferOfferSchema)
    .mutation(({ ctx, input }) =>
      offerTransfer(ctx.userId, input.caseStudyId, input.targetUserId),
    ),
  acceptTransfer: projectsProcedure
    .input(caseStudyInvitationTokenSchema)
    .mutation(({ ctx, input }) => acceptTransfer(ctx.userId, input.token)),
  withdraw: projectsProcedure
    .input(caseStudyIdInputSchema)
    .mutation(({ ctx, input }) => withdrawStudy(ctx.userId, input.caseStudyId)),
});

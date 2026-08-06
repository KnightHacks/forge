import type { z } from "zod";

import type {
  applicationContextDtoSchema,
  attendanceDtoSchema,
  checkInPassDtoSchema,
  dashboardDtoSchema,
  hackerAgreementAcceptanceDtoSchema,
  hackerAgreementAcceptanceInputSchema,
  hackerAgreementDefinitionDtoSchema,
  hackerApplicationDtoSchema,
  hackerApplicationSubmitSchema,
  hackerApplicationUpdateSchema,
  hackerConfirmAttendanceSchema,
  hackerIssueCheckInPassSchema,
  hackerLeaderboardInputSchema,
  hackerProfileDtoSchema,
  hackerProfileFieldsSchema,
  hackerProfileUpdateSchema,
  hackerRemoveResumeSchema,
  hackerWithdrawApplicationSchema,
  leaderboardDtoSchema,
  participantMutationResultDtoSchema,
  pointsDtoSchema,
  portalSessionDtoSchema,
  publicHackathonDtoSchema,
  resumeDtoSchema,
  scheduleDtoSchema,
} from "@forge/validators";
import {
  hackerPortalV1InputSchemas,
  hackerPortalV1OutputSchemas,
} from "@forge/validators";

export const HACKER_PARTICIPANT_API_VERSION = "v1" as const;

export type HackerAgreementAcceptanceInput = z.input<
  typeof hackerAgreementAcceptanceInputSchema
>;
export type HackerAgreementAcceptanceDto = z.output<
  typeof hackerAgreementAcceptanceDtoSchema
>;
export type HackerAgreementDefinitionDto = z.output<
  typeof hackerAgreementDefinitionDtoSchema
>;
export type PublicHackathonDto = z.output<typeof publicHackathonDtoSchema>;
export type PortalSessionDto = z.output<typeof portalSessionDtoSchema>;
export type HackerProfileFields = z.input<typeof hackerProfileFieldsSchema>;
export type HackerProfileDto = z.output<typeof hackerProfileDtoSchema>;
export type HackerApplicationDto = z.output<typeof hackerApplicationDtoSchema>;
export type ApplicationContextDto = z.output<
  typeof applicationContextDtoSchema
>;
export type SubmitApplicationInput = z.input<
  typeof hackerApplicationSubmitSchema
>;
export type UpdateHackerProfileInput = z.input<
  typeof hackerProfileUpdateSchema
>;
export type UpdateHackerApplicationInput = z.input<
  typeof hackerApplicationUpdateSchema
>;
export type ParticipantMutationResultDto = z.output<
  typeof participantMutationResultDtoSchema
>;
export type HackerDashboardDto = z.output<typeof dashboardDtoSchema>;
export type ConfirmAttendanceInput = z.input<
  typeof hackerConfirmAttendanceSchema
>;
export type WithdrawApplicationInput = z.input<
  typeof hackerWithdrawApplicationSchema
>;
export type CheckInPassDto = z.output<typeof checkInPassDtoSchema>;
export type HackerScheduleDto = z.output<typeof scheduleDtoSchema>;
export type HackerAttendanceDto = z.output<typeof attendanceDtoSchema>;
export type HackerPointsDto = z.output<typeof pointsDtoSchema>;
export type HackerLeaderboardScopeInput = z.input<
  typeof hackerLeaderboardInputSchema
>;
export type IssueHackerCheckInPassInput = z.input<
  typeof hackerIssueCheckInPassSchema
>;
export type HackerLeaderboardDto = z.output<typeof leaderboardDtoSchema>;
export type HackerResumeDto = z.output<typeof resumeDtoSchema>;
export type RemoveHackerResumeInput = z.input<typeof hackerRemoveResumeSchema>;

type InputSchemaMap = typeof hackerPortalV1InputSchemas;
type OutputSchemaMap = typeof hackerPortalV1OutputSchemas;

export type HackerParticipantProcedure = keyof InputSchemaMap &
  keyof OutputSchemaMap;

export type HackerParticipantInput<
  TProcedure extends HackerParticipantProcedure,
> = z.input<InputSchemaMap[TProcedure]>;

export type HackerParticipantOutput<
  TProcedure extends HackerParticipantProcedure,
> = z.output<OutputSchemaMap[TProcedure]>;

export type HackerParticipantV1Contract = {
  readonly [TProcedure in HackerParticipantProcedure]: {
    readonly input: HackerParticipantInput<TProcedure>;
    readonly kind: (typeof HACKER_PARTICIPANT_V1_PROCEDURES)[TProcedure];
    readonly output: HackerParticipantOutput<TProcedure>;
  };
};

export const HACKER_PARTICIPANT_V1_PROCEDURES = {
  confirmAttendance: "mutation",
  getApplicationContext: "query",
  getCheckInPass: "mutation",
  getDashboard: "query",
  getLeaderboard: "query",
  getMyAttendance: "query",
  getMyPoints: "query",
  getPublicHackathon: "query",
  getResume: "query",
  getSchedule: "query",
  getSession: "query",
  removeResume: "mutation",
  submitApplication: "mutation",
  updateApplication: "mutation",
  updateProfile: "mutation",
  withdrawApplication: "mutation",
} as const satisfies Record<HackerParticipantProcedure, "mutation" | "query">;

/** Strict contract validators used by the SDK client and API implementation. */
export const HACKER_PARTICIPANT_V1_SCHEMAS = {
  input: hackerPortalV1InputSchemas,
  output: hackerPortalV1OutputSchemas,
} as const;

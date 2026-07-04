import type {
  inferRouterInputs,
  inferRouterOutputs,
  TRPCBuiltRouter,
  TRPCRouterBuilder,
  TRPCRouterRecord,
} from "@trpc/server";

import type { ParticipantPortalRouterRecord } from "./participant-contract";
import { participantPortalRouter } from "./routers/participant-portal";
import { createTRPCRouter } from "./trpc";

type ParticipantRootTypes =
  typeof createTRPCRouter extends TRPCRouterBuilder<infer TRoot>
    ? TRoot
    : never;
export type ParticipantRouter = TRPCBuiltRouter<
  ParticipantRootTypes,
  { portal: ParticipantPortalRouterRecord } & TRPCRouterRecord
>;

export const participantRouter: ParticipantRouter = createTRPCRouter({
  portal: participantPortalRouter,
}) as unknown as ParticipantRouter;

export type ParticipantRouterInputs = inferRouterInputs<ParticipantRouter>;
export type ParticipantRouterOutputs = inferRouterOutputs<ParticipantRouter>;

export function createParticipantCaller(
  ...args: Parameters<ParticipantRouter["createCaller"]>
): ReturnType<ParticipantRouter["createCaller"]> {
  return participantRouter.createCaller(...args);
}

export type {
  Participant,
  ParticipantApplicationContext,
  ParticipantDashboard,
  ParticipantScheduleEvent,
} from "./participant-contract";
export { createTRPCContext } from "./trpc";

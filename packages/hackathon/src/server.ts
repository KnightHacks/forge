import type { Session } from "@forge/auth/server";
import {
  createParticipantCaller,
  createTRPCContext,
} from "@forge/api/participant";

export function createHackathonPortalServerCaller({
  headers,
  session,
}: {
  headers: Headers;
  session: Session | null;
}): ReturnType<typeof createParticipantCaller> {
  return createParticipantCaller(() => createTRPCContext({ headers, session }));
}

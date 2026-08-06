import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Hackathon } from "@forge/db/schemas/knight-hacks";

import { createDbEventWorkflowState } from "../events/database-state";
import { resolveEventGateways } from "../events/gateway-resolver";
import {
  createEventSyncOrchestrator,
  formatEventProjectionDescription,
  formatHackathonDiscordEventDescription,
} from "../events/orchestration";
import { eventGoogleCalendars } from "../events/provider-gateways";
import { assertHackathonEvent } from "./access";

export async function createHackEventOrchestrator(
  session: Parameters<typeof resolveEventGateways>[0],
  hackathonId: string,
  channelTypes: ReadonlyMap<string, "stage" | "voice"> = new Map(),
) {
  const [gateways, hackathon] = await Promise.all([
    resolveEventGateways(session),
    db.query.Hackathon.findFirst({
      columns: { displayName: true },
      where: eq(Hackathon.id, hackathonId),
    }),
  ]);
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
  const googleCalendars = eventGoogleCalendars();
  return createEventSyncOrchestrator({
    assertEventScope: (event) => assertHackathonEvent(event, hackathonId),
    audit: gateways.audit.event,
    clock: () => new Date(),
    config: { googleCalendars, leaseDurationMs: 45_000 },
    discord: gateways.discord,
    formatProjectionDescription: (event, provider) =>
      provider === "discord"
        ? formatHackathonDiscordEventDescription({
            description: event.description,
            hackathonName: hackathon.displayName,
            points: event.points,
          })
        : formatEventProjectionDescription(event),
    google: gateways.google,
    state: createDbEventWorkflowState({
      channelTypes,
      googleCalendars,
      hackathonId,
    }),
    tokenFactory: randomUUID,
  });
}

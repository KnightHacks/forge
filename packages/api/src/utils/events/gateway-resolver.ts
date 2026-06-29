import type { Session } from "@forge/auth/server";

import type { EventProviderGateway } from "./orchestration";
import { nodeEnv } from "../../env";
import {
  auditEventAttendanceMutation,
  auditEventMutation,
  auditEventTagMutation,
  createDiscordEventGateway,
  createGoogleEventGateway,
  listDiscordEventChannels,
  resolveDiscordEventChannelType,
} from "./provider-gateways";

export interface EventGatewayBundle {
  audit: {
    attendance: typeof auditEventAttendanceMutation;
    event: typeof auditEventMutation;
    tag: typeof auditEventTagMutation;
  };
  discord: EventProviderGateway;
  google: EventProviderGateway;
  listDiscordChannels: typeof listDiscordEventChannels;
  resolveDiscordChannelType: typeof resolveDiscordEventChannelType;
}

const liveEventGateways: EventGatewayBundle = {
  audit: {
    attendance: auditEventAttendanceMutation,
    event: auditEventMutation,
    tag: auditEventTagMutation,
  },
  discord: createDiscordEventGateway(),
  google: createGoogleEventGateway(),
  listDiscordChannels: listDiscordEventChannels,
  resolveDiscordChannelType: resolveDiscordEventChannelType,
};

export async function resolveEventGateways(
  session: Session,
): Promise<EventGatewayBundle> {
  if (nodeEnv !== "production") {
    const { resolveEventGatewayOverride } =
      await import("../../tests/support/events/event-gateway-override");
    const override = resolveEventGatewayOverride(session);
    if (override) return override;
  }
  return liveEventGateways;
}

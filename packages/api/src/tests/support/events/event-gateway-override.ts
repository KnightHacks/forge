import { randomUUID } from "node:crypto";

import type { Session } from "@forge/auth/server";

import type { EventGatewayBundle } from "../../../utils/events/gateway-resolver";
import type { EventProjectionRequest } from "../../../utils/events/orchestration";

function gateway(prefix: "discord" | "google") {
  const projections = new Map<
    string,
    { id: string; request: EventProjectionRequest }
  >();
  return {
    create(request: EventProjectionRequest) {
      const id = `${prefix}-${randomUUID()}`;
      projections.set(id, { id, request });
      return Promise.resolve({ id, kind: "success" as const });
    },
    delete(id: string) {
      projections.delete(id);
      return Promise.resolve({ id, kind: "success" as const });
    },
    findByPrivateIdentity() {
      return Promise.resolve([]);
    },
    get(id: string, _appliedDestination?: string | null) {
      const projection = projections.get(id);
      return Promise.resolve(
        projection
          ? { id, kind: "success" as const, request: projection.request }
          : { kind: "not_found" as const },
      );
    },
    list() {
      return Promise.resolve([...projections.values()]);
    },
    update(id: string, request: EventProjectionRequest) {
      projections.set(id, { id, request });
      return Promise.resolve({ id, kind: "success" as const });
    },
  };
}

const eventGatewayOverride: EventGatewayBundle = {
  audit: {
    attendance: () => Promise.resolve(),
    event: () => Promise.resolve(),
    tag: () => Promise.resolve(),
  },
  discord: gateway("discord"),
  google: gateway("google"),
  listDiscordChannels() {
    return Promise.resolve([
      {
        id: "990000000000000101",
        name: "Event Operations E2E",
        type: "voice" as const,
      },
    ]);
  },
  resolveDiscordChannelType(channelId) {
    return Promise.resolve(channelId === "990000000000000101" ? "voice" : null);
  },
};

export function resolveEventGatewayOverride(session: Session) {
  return session.session.id.startsWith("e2e-session-") &&
    session.session.userAgent === "blade-playwright"
    ? eventGatewayOverride
    : null;
}

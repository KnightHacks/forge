import type { EventWorkflowRecord } from "./orchestration";

export type AdminEventIntegrationHealth =
  | "error"
  | "pending"
  | "synced"
  | "unknown";

export interface AdminEventDto {
  attendanceCount: number;
  audience: "dues" | "public" | "roles";
  deletionPending: boolean;
  description: string;
  discord: {
    health: AdminEventIntegrationHealth;
    id: string | null;
  };
  discordChannel: { id: string } | null;
  endAt: Date;
  google: {
    health: AdminEventIntegrationHealth;
    id: string | null;
  };
  id: string;
  internal: boolean;
  legacy: boolean;
  location: string;
  name: string;
  points: number;
  published: boolean;
  revision: number;
  roleIds: string[];
  startAt: Date;
  tag: string;
  tagColor: string;
}

function integrationHealth(
  projection: EventWorkflowRecord["discord"],
  revision: number,
): AdminEventIntegrationHealth {
  if (
    projection.state === "synced" &&
    projection.id !== null &&
    projection.appliedRevision === revision
  ) {
    return "synced";
  }
  if (projection.state === "synced") return "pending";
  return projection.state ?? "unknown";
}

/**
 * Projects the internal workflow record into the complete admin-safe contract.
 * Lease, attempt, provider-destination, creation, and acknowledgement metadata
 * intentionally remain server-only.
 */
export function toAdminEventDto(event: EventWorkflowRecord): AdminEventDto {
  return {
    attendanceCount: event.attendanceCount,
    audience: event.audience,
    deletionPending: event.deletionIntentAt !== null,
    description: event.description,
    discord: {
      health: integrationHealth(event.discord, event.revision),
      id: event.discord.id,
    },
    discordChannel: event.discordChannel
      ? { id: event.discordChannel.id }
      : null,
    endAt: event.endAt,
    google: {
      health: integrationHealth(event.google, event.revision),
      id: event.google.id,
    },
    id: event.id,
    internal: event.internal,
    legacy: event.legacy,
    location: event.location,
    name: event.name,
    points: event.points,
    published: event.publishedAt !== null,
    revision: event.revision,
    roleIds: [...event.roleIds],
    startAt: event.startAt,
    tag: event.tag,
    tagColor: event.tagColor,
  };
}

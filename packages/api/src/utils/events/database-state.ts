import { TRPCError } from "@trpc/server";

import type { SelectEvent } from "@forge/db/schemas/knight-hacks";
import { and, count, eq, gt, inArray, isNull, lte, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import { Event, EventAttendee, EventTag } from "@forge/db/schemas/knight-hacks";

import type { EventProjection, EventWorkflowRecord } from "./orchestration";
import { createDbEventFeedbackService } from "./database-feedback";

function audienceOf(event: SelectEvent) {
  if (event.dues_paying) return "dues" as const;
  if (event.roles.length > 0) return "roles" as const;
  return "public" as const;
}

function discordDestination(event: SelectEvent) {
  if (!event.discordAppliedEntityType) return null;
  if (event.discordAppliedEntityType === "external") return "external";
  return event.discordAppliedChannelId
    ? `${event.discordAppliedEntityType}:${event.discordAppliedChannelId}`
    : null;
}

export function eventRowToWorkflowRecord(
  event: SelectEvent,
  channelType?: "stage" | "voice" | null,
): EventWorkflowRecord {
  const audience = audienceOf(event);
  const roleIds = [...event.roles];
  const resolvedChannelType =
    channelType ??
    (event.discordAppliedEntityType === "stage" ||
    event.discordAppliedEntityType === "voice"
      ? event.discordAppliedEntityType
      : null);
  return {
    attendanceCount: 0,
    audience,
    creationKey: event.creationKey,
    deletionIntentAt: event.deletionIntentAt,
    description: event.description,
    discord: {
      appliedDestination: discordDestination(event),
      appliedRevision: event.discordAppliedRevision,
      attemptRevision: event.discordOutboundAttemptRevision,
      attemptToken: event.discordOutboundAttemptToken,
      id: event.discordId,
      state: event.discordSyncState,
    },
    discordChannel: event.discordChannelId
      ? { id: event.discordChannelId, type: resolvedChannelType ?? "voice" }
      : null,
    discordNoProjectionAcknowledgedAt: event.discordNoProjectionAcknowledgedAt,
    discordNoProjectionAcknowledgedBy: event.discordNoProjectionAcknowledgedBy,
    endAt: event.end_datetime,
    google: {
      appliedDestination: event.googleAppliedCalendarId,
      appliedRevision: event.googleAppliedRevision,
      attemptRevision: event.googleOutboundAttemptRevision,
      attemptToken: event.googleOutboundAttemptToken,
      id: event.googleId,
      state: event.googleSyncState,
    },
    hackathonId: event.hackathonId,
    id: event.id,
    internal: event.isOperationsCalendar,
    legacy: event.legacy,
    legacyDuesRequired:
      event.legacy && event.dues_paying && event.roles.length > 0,
    location: event.location,
    name: event.name,
    points: event.points ?? 0,
    publishedAt: event.publishedAt,
    revision: event.syncRevision,
    roleIds,
    startAt: event.start_datetime,
    synchronizedVisibility:
      event.visibilityRevision === null ||
      event.visibilityDuesPaying === null ||
      event.visibilityRoles === null ||
      event.visibilityInternal === null
        ? null
        : {
            audience: event.visibilityDuesPaying
              ? "dues"
              : event.visibilityRoles.length > 0
                ? "roles"
                : "public",
            internal: event.visibilityInternal,
            roleIds: [...event.visibilityRoles],
          },
    tag: event.tag,
    tagColor: event.tagColor,
  };
}

function audienceColumns(event: EventWorkflowRecord) {
  return {
    dues_paying: event.audience === "dues",
    roles: event.audience === "roles" ? event.roleIds : [],
  };
}

function discordApplied(projection: EventProjection) {
  const [entityType, channelId] =
    projection.appliedDestination?.split(":") ?? [];
  return {
    discordAppliedChannelId:
      entityType === "voice" || entityType === "stage"
        ? (channelId ?? null)
        : null,
    discordAppliedEntityType:
      entityType === "external" ||
      entityType === "voice" ||
      entityType === "stage"
        ? entityType
        : null,
  } as const;
}

export function createDbEventWorkflowState({
  channelTypes = new Map<string, "stage" | "voice">(),
  creationReferences,
  googleCalendars,
}: {
  channelTypes?: ReadonlyMap<string, "stage" | "voice">;
  creationReferences?: {
    pointsOverride: number | null;
    roleIds: readonly string[];
    tagId: string;
  };
  googleCalendars: { internal: string; public: string };
}) {
  const getEvent = async (eventId: string) => {
    const row = await db.query.Event.findFirst({
      where: eq(Event.id, eventId),
    });
    return row
      ? eventRowToWorkflowRecord(
          row,
          row.discordChannelId
            ? (channelTypes.get(row.discordChannelId) ?? null)
            : null,
        )
      : null;
  };

  return {
    async acquireSyncLease({
      eventId,
      expiresAt,
      now,
      revision,
      token,
    }: {
      eventId: string;
      expiresAt: Date;
      now: Date;
      revision: number;
      token: string;
    }) {
      const rows = await db
        .update(Event)
        .set({
          syncLeaseExpiresAt: expiresAt,
          syncLeaseRevision: revision,
          syncLeaseToken: token,
        })
        .where(
          and(
            eq(Event.id, eventId),
            eq(Event.syncRevision, revision),
            or(
              isNull(Event.syncLeaseExpiresAt),
              lte(Event.syncLeaseExpiresAt, now),
            ),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    async countAttendance(eventId: string) {
      const [row] = await db
        .select({ value: count(EventAttendee.id) })
        .from(EventAttendee)
        .where(eq(EventAttendee.eventId, eventId));
      return row?.value ?? 0;
    },

    async createOrReuseEvent(event: EventWorkflowRecord, payloadHash: string) {
      if (!event.creationKey) {
        throw new Error("Event creation requires a creation key.");
      }
      const creationKey = event.creationKey;
      const result = await db.transaction(async (tx) => {
        const existing = await tx.query.Event.findFirst({
          where: eq(Event.creationKey, creationKey),
        });
        if (existing) {
          await (
            await createDbEventFeedbackService(tx)
          ).provisionForEvent({ eventId: existing.id });
          return { created: false, row: existing };
        }

        if (creationReferences) {
          const [tag] = await tx
            .select()
            .from(EventTag)
            .where(eq(EventTag.id, creationReferences.tagId))
            .for("share");
          if (!tag) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tag not found.",
            });
          }
          if (!tag.active) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "That event tag is archived.",
            });
          }
          const points = creationReferences.pointsOverride ?? tag.defaultPoints;
          if (
            event.tag !== tag.name ||
            event.tagColor !== tag.color ||
            event.points !== points
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "The event tag changed. Review the event and try again.",
            });
          }

          const uniqueRoleIds = [...new Set(creationReferences.roleIds)];
          if (uniqueRoleIds.length > 0) {
            const roles = await tx
              .select({ id: Roles.id })
              .from(Roles)
              .where(inArray(Roles.id, uniqueRoleIds))
              .for("share");
            if (roles.length !== uniqueRoleIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more selected roles no longer exist.",
              });
            }
          }
        }

        const [created] = await tx
          .insert(Event)
          .values({
            ...audienceColumns(event),
            creationKey,
            creationPayloadHash: payloadHash,
            description: event.description,
            discordChannelId: event.discordChannel?.id ?? null,
            discordSyncState: "pending",
            end_datetime: event.endAt,
            googleSyncState: "pending",
            hackathonId: null,
            id: event.id,
            isOperationsCalendar: event.internal,
            legacy: false,
            location: event.location,
            name: event.name,
            points: event.points,
            start_datetime: event.startAt,
            syncRevision: event.revision,
            tag: event.tag,
            tagColor: event.tagColor,
          })
          .onConflictDoNothing({ target: Event.creationKey })
          .returning();
        if (created) {
          await (
            await createDbEventFeedbackService(tx)
          ).provisionForEvent({ eventId: created.id });
          return { created: true, row: created };
        }
        const raced = await tx.query.Event.findFirst({
          where: eq(Event.creationKey, creationKey),
        });
        if (!raced) throw new Error("Event creation reservation was lost.");
        await (
          await createDbEventFeedbackService(tx)
        ).provisionForEvent({ eventId: raced.id });
        return { created: false, row: raced };
      });
      return {
        created: result.created,
        event: eventRowToWorkflowRecord(
          result.row,
          event.discordChannel?.type ?? null,
        ),
        payloadMatches: result.row.creationPayloadHash === payloadHash,
      };
    },

    async deleteEvent(
      eventId: string,
      fence?: { revision: number; token: string },
    ) {
      const rows = await db
        .delete(Event)
        .where(
          and(
            eq(Event.id, eventId),
            ...(fence
              ? [
                  eq(Event.syncRevision, fence.revision),
                  eq(Event.syncLeaseRevision, fence.revision),
                  eq(Event.syncLeaseToken, fence.token),
                  gt(Event.syncLeaseExpiresAt, new Date()),
                ]
              : []),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    getEvent,

    async ownsSyncLease(eventId: string, revision: number, token: string) {
      const row = await db.query.Event.findFirst({
        columns: { id: true },
        where: and(
          eq(Event.id, eventId),
          eq(Event.syncLeaseRevision, revision),
          eq(Event.syncLeaseToken, token),
          gt(Event.syncLeaseExpiresAt, new Date()),
        ),
      });
      return Boolean(row);
    },

    async prepareDeletion({
      at,
      eventId,
      revision,
      token,
    }: {
      at: Date;
      eventId: string;
      revision: number;
      token: string;
    }) {
      return db.transaction(async (tx) => {
        const [event] = await tx
          .select()
          .from(Event)
          .where(and(eq(Event.id, eventId), isNull(Event.hackathonId)))
          .for("update");
        if (!event) return "not_found" as const;
        if (
          event.syncRevision !== revision ||
          event.syncLeaseRevision !== revision ||
          event.syncLeaseToken !== token ||
          !event.syncLeaseExpiresAt ||
          event.syncLeaseExpiresAt <= at
        ) {
          return "fence_lost" as const;
        }

        const [attendance] = await tx
          .select({ value: count(EventAttendee.id) })
          .from(EventAttendee)
          .where(eq(EventAttendee.eventId, event.id));
        if ((attendance?.value ?? 0) > 0) {
          return "attendance_exists" as const;
        }
        if (
          event.discordSyncState === "unknown" &&
          !event.discordId &&
          !event.discordNoProjectionAcknowledgedAt
        ) {
          return "discord_ambiguous" as const;
        }
        if (
          !event.deletionIntentAt &&
          ((event.discordOutboundAttemptToken && event.discordId) ||
            (event.googleOutboundAttemptToken && event.googleId))
        ) {
          return "in_flight_attempt" as const;
        }
        if (!event.deletionIntentAt) {
          await tx
            .update(Event)
            .set({ deletionIntentAt: at })
            .where(eq(Event.id, event.id));
        }
        return "ready" as const;
      });
    },

    async recordProviderAttempt({
      at,
      eventId,
      provider,
      token,
    }: {
      at: Date;
      eventId: string;
      provider: "discord" | "google";
      token: string;
    }) {
      const event = await getEvent(eventId);
      if (!event) return false;
      const rows = await db
        .update(Event)
        .set(
          provider === "discord"
            ? {
                discordOutboundAttemptRevision: event.revision,
                discordOutboundAttemptToken: token,
                discordOutboundAttemptedAt: at,
              }
            : {
                googleOutboundAttemptRevision: event.revision,
                googleOutboundAttemptToken: token,
                googleOutboundAttemptedAt: at,
              },
        )
        .where(
          and(
            eq(Event.id, eventId),
            eq(Event.syncLeaseToken, token),
            eq(Event.syncLeaseRevision, event.revision),
            gt(Event.syncLeaseExpiresAt, at),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    async renewSyncLease({
      eventId,
      expiresAt,
      now,
      revision,
      token,
    }: {
      eventId: string;
      expiresAt: Date;
      now: Date;
      revision: number;
      token: string;
    }) {
      const rows = await db
        .update(Event)
        .set({ syncLeaseExpiresAt: expiresAt })
        .where(
          and(
            eq(Event.id, eventId),
            eq(Event.syncRevision, revision),
            eq(Event.syncLeaseRevision, revision),
            eq(Event.syncLeaseToken, token),
            gt(Event.syncLeaseExpiresAt, now),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    async releaseSyncLease(eventId: string, token: string) {
      const rows = await db
        .update(Event)
        .set({
          syncLeaseExpiresAt: null,
          syncLeaseRevision: null,
          syncLeaseToken: null,
        })
        .where(and(eq(Event.id, eventId), eq(Event.syncLeaseToken, token)))
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    async saveEvent(event: EventWorkflowRecord, fence?: { token: string }) {
      const visibility = event.synchronizedVisibility
        ? {
            visibilityDuesPaying:
              event.synchronizedVisibility.audience === "dues",
            visibilityInternal: event.synchronizedVisibility.internal,
            visibilityRevision: event.revision,
            visibilityRoles: event.synchronizedVisibility.roleIds,
          }
        : {
            visibilityDuesPaying: null,
            visibilityInternal: null,
            visibilityRevision: null,
            visibilityRoles: null,
          };
      const rows = await db
        .update(Event)
        .set({
          ...audienceColumns(event),
          ...visibility,
          deletionIntentAt: event.deletionIntentAt,
          description: event.description,
          discordChannelId: event.discordChannel?.id ?? null,
          discordNoProjectionAcknowledgedAt:
            event.discordNoProjectionAcknowledgedAt ?? null,
          discordNoProjectionAcknowledgedBy:
            event.discordNoProjectionAcknowledgedBy ?? null,
          end_datetime: event.endAt,
          isOperationsCalendar: event.internal,
          location: event.location,
          name: event.name,
          points: event.points,
          publishedAt: event.publishedAt,
          start_datetime: event.startAt,
          tag: event.tag,
          tagColor: event.tagColor,
        })
        .where(
          and(
            eq(Event.id, event.id),
            eq(Event.syncRevision, event.revision),
            event.deletionIntentAt
              ? eq(Event.deletionIntentAt, event.deletionIntentAt)
              : isNull(Event.deletionIntentAt),
            ...(fence
              ? [
                  eq(Event.syncLeaseToken, fence.token),
                  eq(Event.syncLeaseRevision, event.revision),
                  gt(Event.syncLeaseExpiresAt, new Date()),
                ]
              : []),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },

    async saveProviderProjection({
      eventId,
      projection,
      provider,
      revision,
      token,
    }: {
      eventId: string;
      projection: EventProjection;
      provider: "discord" | "google";
      revision: number;
      token: string;
    }) {
      const values =
        provider === "discord"
          ? {
              ...discordApplied(projection),
              discordAppliedRevision: projection.appliedRevision,
              discordId: projection.id,
              discordLastError: null,
              ...(projection.state === "unknown"
                ? {}
                : {
                    discordOutboundAttemptRevision: null,
                    discordOutboundAttemptToken: null,
                    discordOutboundAttemptedAt: null,
                  }),
              discordSyncState: projection.state,
            }
          : {
              googleAppliedCalendarId: projection.appliedDestination,
              googleAppliedDestination:
                projection.appliedDestination === googleCalendars.internal
                  ? ("internal" as const)
                  : projection.appliedDestination
                    ? ("public" as const)
                    : null,
              googleAppliedRevision: projection.appliedRevision,
              googleId: projection.id,
              googleLastError: null,
              ...(projection.state === "unknown"
                ? {}
                : {
                    googleOutboundAttemptRevision: null,
                    googleOutboundAttemptToken: null,
                    googleOutboundAttemptedAt: null,
                  }),
              googleSyncState: projection.state,
            };
      const rows = await db
        .update(Event)
        .set(values)
        .where(
          and(
            eq(Event.id, eventId),
            eq(Event.syncRevision, revision),
            eq(Event.syncLeaseToken, token),
            eq(Event.syncLeaseRevision, revision),
            gt(Event.syncLeaseExpiresAt, new Date()),
          ),
        )
        .returning({ id: Event.id });
      return rows.length === 1;
    },
  };
}

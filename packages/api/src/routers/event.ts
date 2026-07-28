import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AuditActionKey, AuditResultOutcome } from "@forge/validators";
import { and, eq, inArray, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import {
  Event,
  EventAttendee,
  EventTag,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";
import {
  EVENT_CREATION_START_MESSAGE,
  eventAdminQuerySchema,
  eventAttendanceRemovalSchema,
  eventCheckInMemberSchema,
  eventCheckInQrSchema,
  eventCheckInSearchSchema,
  eventCreateSchema,
  eventCreationHasMinimumLead,
  eventDiscordResolutionSchema,
  eventIdSchema,
  eventTagArchiveSchema,
  eventTagCreateSchema,
  eventTagUpdateSchema,
  eventUpdateSchema,
} from "@forge/validators";

import type { EventGatewayBundle } from "../utils/events/gateway-resolver";
import type { EventWorkflowRecord } from "../utils/events/orchestration";
import type { EventAuditSnapshot } from "../utils/events/queries";
import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import {
  requireEventCheckIn,
  requireEventEdit,
  requireEventRead,
} from "../utils/events/access";
import {
  createAttendanceService,
  serializeAttendanceCsv,
} from "../utils/events/attendance";
import { createDbAttendanceState } from "../utils/events/database-attendance";
import {
  createDbEventFeedbackService,
  loadEventFeedbackListMetrics,
} from "../utils/events/database-feedback";
import { createDbEventWorkflowState } from "../utils/events/database-state";
import {
  listMemberAttendance,
  listMemberEvents,
  listPublicClubEvents,
} from "../utils/events/discovery";
import { resolveEventGateways } from "../utils/events/gateway-resolver";
import {
  assertEventProviderPayloadLimits,
  createEventSyncOrchestrator,
} from "../utils/events/orchestration";
import { eventGoogleCalendars } from "../utils/events/provider-gateways";
import {
  assertClubEventId,
  loadClubEventDiscoveryRecord,
  loadEventAuditSnapshot,
  loadEventDiscoveryRecordsByIds,
  loadEventTags,
  loadMemberAttendanceRows,
  loadMemberClubEventRecords,
  loadMemberDiscoveryRecord,
  loadMinimalAttendees,
  loadPublicClubEventRecords,
  queryAdminEventRecords,
  queryCheckInEventChoices,
  searchCheckInMemberCandidates,
} from "../utils/events/queries";
import { createEventTagService } from "../utils/events/tags";
import { isSelectableProductRole } from "../utils/roles/selectable";
import { eventFeedbackProcedures } from "./event-feedback";

const publicEventInput = z
  .object({ limit: z.number().int().min(1).max(60).default(24) })
  .optional();
const checkInEventInput = z
  .object({ olderSearch: z.string().trim().max(100).default("") })
  .default({ olderSearch: "" });
const checkInInput = z.union([eventCheckInMemberSchema, eventCheckInQrSchema]);
const eventRepairInput = eventIdSchema.extend({
  provider: z.enum(["all", "discord", "failed", "google"]).default("failed"),
});

async function claimDiscordCandidate(eventId: string, candidateId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`blade:event-discord:${candidateId}`}, 0))`,
    );
    const [event] = await tx
      .select()
      .from(Event)
      .where(and(eq(Event.id, eventId), isNull(Event.hackathonId)))
      .for("update");
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }
    if (event.deletionIntentAt) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is being deleted.",
      });
    }
    if (
      event.syncLeaseExpiresAt &&
      event.syncLeaseExpiresAt.getTime() > Date.now()
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is already synchronizing.",
      });
    }
    if (event.discordId && event.discordId !== candidateId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Blade event is already linked to another Discord event.",
      });
    }
    if (
      event.discordId === candidateId &&
      (event.discordSyncState === "unknown" ||
        event.discordOutboundAttemptToken)
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "The prior Discord update is ambiguous and cannot be retried yet.",
      });
    }
    const alreadyLinked = await tx.query.Event.findFirst({
      columns: { id: true },
      where: and(eq(Event.discordId, candidateId), ne(Event.id, eventId)),
    });
    if (alreadyLinked) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That Discord event is already linked in Blade.",
      });
    }
    await tx
      .update(Event)
      .set({
        discordAppliedChannelId: null,
        discordAppliedEntityType: null,
        discordAppliedRevision: null,
        discordId: candidateId,
        discordLastError: null,
        discordNoProjectionAcknowledgedAt: null,
        discordNoProjectionAcknowledgedBy: null,
        discordOutboundAttemptRevision: null,
        discordOutboundAttemptToken: null,
        discordOutboundAttemptedAt: null,
        discordSyncState: "pending",
      })
      .where(eq(Event.id, event.id));
  });
}

async function confirmNewDiscordProjection(eventId: string) {
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(Event)
      .where(and(eq(Event.id, eventId), isNull(Event.hackathonId)))
      .for("update");
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }
    if (event.deletionIntentAt) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is being deleted.",
      });
    }
    if (
      event.syncLeaseExpiresAt &&
      event.syncLeaseExpiresAt.getTime() > Date.now()
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This event is already synchronizing.",
      });
    }
    if (event.discordSyncState !== "unknown" || event.discordId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Discord projection is not eligible for recreation.",
      });
    }
    await tx
      .update(Event)
      .set({
        discordOutboundAttemptRevision: null,
        discordOutboundAttemptToken: null,
        discordOutboundAttemptedAt: null,
        discordSyncState: "pending",
      })
      .where(eq(Event.id, event.id));
  });
}

function dbTagService(
  audit: Parameters<typeof createEventTagService>[0]["audit"] = () =>
    Promise.resolve(),
) {
  type DbExecutor =
    | typeof db
    | Parameters<Parameters<typeof db.transaction>[0]>[0];
  const context = new AsyncLocalStorage<DbExecutor>();
  const executor = () => context.getStore() ?? db;

  return createEventTagService({
    audit,
    clock: () => new Date(),
    idFactory: randomUUID,
    state: {
      async getTag(tagId) {
        return (
          (await executor().query.EventTag.findFirst({
            where: eq(EventTag.id, tagId),
          })) ?? null
        );
      },
      async listTags() {
        return executor().select().from(EventTag);
      },
      async saveTag(tag) {
        let saved: typeof EventTag.$inferSelect | undefined;
        try {
          [saved] = await executor()
            .insert(EventTag)
            .values(tag)
            .onConflictDoUpdate({
              set: tag,
              target: EventTag.id,
            })
            .returning();
        } catch (error) {
          if ((error as { code?: string }).code === "23505") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "An event tag already uses that name.",
            });
          }
          throw error;
        }
        if (!saved) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The event tag could not be saved.",
          });
        }
        return saved;
      },
      async withTagLock(tagId, operation) {
        return db.transaction(async (tx) => {
          await tx
            .select({ id: EventTag.id })
            .from(EventTag)
            .where(eq(EventTag.id, tagId))
            .for("update");
          return context.run(tx, operation);
        });
      },
    },
  });
}

async function channelTypeFor(
  target:
    | { internal: false }
    | { channelId: string; channelType: "stage" | "voice"; internal: true },
  gateways: EventGatewayBundle,
) {
  if (!target.internal) return null;
  const liveType = await gateways.resolveDiscordChannelType(target.channelId);
  if (!liveType || liveType !== target.channelType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose an available Knight Hacks voice or stage channel.",
    });
  }
  return liveType;
}

async function createOrchestrator(
  session: Parameters<typeof resolveEventGateways>[0],
  channelTypes: ReadonlyMap<string, "stage" | "voice"> = new Map(),
  creationReferences?: {
    pointsOverride: number | null;
    roleIds: readonly string[];
    tagId: string;
  },
) {
  const calendars = eventGoogleCalendars();
  const gateways = await resolveEventGateways(session);
  return createEventSyncOrchestrator({
    audit: gateways.audit.event,
    clock: () => new Date(),
    config: { googleCalendars: calendars, leaseDurationMs: 45_000 },
    discord: gateways.discord,
    google: gateways.google,
    state: createDbEventWorkflowState({
      channelTypes,
      creationReferences,
      googleCalendars: calendars,
    }),
    tokenFactory: randomUUID,
  });
}

async function channelTypesForEvent(
  eventId: string,
  gateways: EventGatewayBundle,
): Promise<ReadonlyMap<string, "stage" | "voice">> {
  const row = await db.query.Event.findFirst({
    columns: { discordChannelId: true, isOperationsCalendar: true },
    where: and(eq(Event.id, eventId), isNull(Event.hackathonId)),
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
  if (!row.isOperationsCalendar) return new Map();
  if (!row.discordChannelId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This internal event has no Discord channel configured.",
    });
  }
  const type = await gateways.resolveDiscordChannelType(row.discordChannelId);
  if (!type) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "The configured Discord channel is unavailable.",
    });
  }
  return new Map([[row.discordChannelId, type]]);
}

function blankProjection() {
  return {
    appliedDestination: null,
    appliedRevision: null,
    attemptRevision: null,
    attemptToken: null,
    id: null,
    state: "pending" as const,
  };
}

function projectionResult(
  state: EventAuditSnapshot["discordSyncState"],
): AuditResultOutcome {
  if (state === "synced") return "succeeded";
  if (state === "error" || state === "unknown") return "failed_external";
  return "skipped";
}

function projectionChanged(
  before: EventAuditSnapshot,
  after: EventAuditSnapshot | null,
) {
  if (!after) return true;
  return (
    before.discordId !== after.discordId ||
    before.discordSyncState !== after.discordSyncState ||
    before.discordAppliedRevision !== after.discordAppliedRevision ||
    before.googleId !== after.googleId ||
    before.googleSyncState !== after.googleSyncState ||
    before.googleAppliedRevision !== after.googleAppliedRevision ||
    before.deletionIntentAt?.getTime() !== after.deletionIntentAt?.getTime()
  );
}

function eventUpdateAuditChanges(
  before: EventAuditSnapshot,
  after: EventAuditSnapshot,
) {
  const values = [
    ["name", before.name, after.name],
    [
      "startAt",
      before.start_datetime.toISOString(),
      after.start_datetime.toISOString(),
    ],
    [
      "endAt",
      before.end_datetime.toISOString(),
      after.end_datetime.toISOString(),
    ],
    ["location", before.location, after.location],
    ["points", before.points, after.points],
    ["roles", [...before.roles].sort(), [...after.roles].sort()],
  ] as const;
  return values.flatMap(([field, beforeValue, afterValue]) =>
    JSON.stringify(beforeValue) === JSON.stringify(afterValue)
      ? []
      : [{ after: afterValue, before: beforeValue, field }],
  );
}

async function auditEventProviderOperation(input: {
  actionKey: Extract<
    AuditActionKey,
    | "event.created"
    | "event.deleted"
    | "event.integration.repaired"
    | "event.updated"
  >;
  actor: Parameters<typeof createAdminAuditEvent>[0]["actor"];
  changes?: Parameters<typeof createAdminAuditEvent>[0]["changes"];
  deleted?: boolean;
  event: EventAuditSnapshot;
  metadata?: Parameters<typeof createAdminAuditEvent>[0]["metadata"];
  providers: readonly ("discord" | "google")[];
  resultSnapshot?: EventAuditSnapshot | null;
}) {
  const snapshot = input.resultSnapshot ?? input.event;
  const providerResults = input.providers.map((provider) => {
    const absentAfterDelete =
      input.actionKey === "event.deleted" &&
      (input.deleted === true ||
        (snapshot[`${provider}Id`] === null &&
          snapshot[`${provider}SyncState`] !== "unknown"));
    return {
      relation: "result" as const,
      resultOutcome: absentAfterDelete
        ? ("succeeded" as const)
        : projectionResult(snapshot[`${provider}SyncState`]),
      targetId: provider,
      targetLabel: `${provider === "discord" ? "Discord" : "Google Calendar"} projection`,
      targetType: "provider" as const,
    };
  });
  const partial = providerResults.some(
    ({ resultOutcome }) => resultOutcome !== "succeeded",
  );
  await createAdminAuditEvent({
    actionKey: input.actionKey,
    actor: input.actor,
    changes: input.changes,
    metadata: input.metadata,
    operationId: randomUUID(),
    outcome: partial ? "partial_external" : "committed",
    subjects: [
      {
        relation: "primary",
        targetId: input.event.id,
        targetLabel: input.event.name,
        targetType: "event",
      },
      ...providerResults,
    ],
  });
}

async function auditDiscordResolution(input: {
  actor: Parameters<typeof createAdminAuditEvent>[0]["actor"];
  event: EventAuditSnapshot;
  mode: "confirm_create_new" | "confirm_no_projection" | "link_existing";
  projectionId?: string | null;
  projectionType?: string | null;
  result: string;
  resultOutcome: AuditResultOutcome;
}) {
  await createAdminAuditEvent({
    actionKey: "event.discord_projection.resolved",
    actor: input.actor,
    metadata: {
      mode: input.mode,
      projectionId: input.projectionId ?? null,
      projectionType: input.projectionType ?? null,
      result: input.result,
    },
    operationId: randomUUID(),
    outcome:
      input.resultOutcome === "succeeded" ? "committed" : "partial_external",
    subjects: [
      {
        relation: "primary",
        targetId: input.event.id,
        targetLabel: input.event.name,
        targetType: "event",
      },
      {
        relation: "result",
        resultOutcome: input.resultOutcome,
        targetId: "discord",
        targetLabel: "Discord projection",
        targetType: "provider",
      },
    ],
  });
}

function submittedCreationHash(input: z.infer<typeof eventCreateSchema>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        audience:
          input.audience.type === "roles"
            ? {
                roleIds: [...input.audience.roleIds].sort(),
                type: input.audience.type,
              }
            : input.audience,
        creationKey: input.creationKey,
        description: input.description,
        end: new Date(input.end).toISOString(),
        internalTarget: input.internalTarget,
        location: input.location,
        name: input.name,
        pointsOverride: input.pointsOverride ?? null,
        start: new Date(input.start).toISOString(),
        tagId: input.tagId,
      }),
    )
    .digest("hex");
}

export const eventRouter = {
  ...eventFeedbackProcedures,

  /** Returns the bounded, public-safe Club event feed. */
  getPublicClubEvents: publicProcedure
    .input(publicEventInput)
    .query(async ({ input }) => {
      const now = new Date();
      const limit = input?.limit ?? 24;
      const events = listPublicClubEvents(
        await loadPublicClubEventRecords({ limit, now }),
        { limit, now },
      );
      return events.map(({ endAt, startAt, ...event }) => ({
        ...event,
        endDateTime: endAt,
        startDateTime: startAt,
      }));
    }),

  /** Returns upcoming events visible to the signed-in member. */
  listMemberEvents: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const member = await loadMemberDiscoveryRecord(ctx.session.user.id, now);
    return member
      ? listMemberEvents(
          await loadMemberClubEventRecords({
            memberRoleIds: member.roleIds,
            now,
          }),
          { guildId: await getKnightHacksGuildId(), member, now },
        )
      : [];
  }),

  /** Returns only the signed-in member's Club attendance history. */
  listMemberAttendance: protectedProcedure.query(async ({ ctx }) => {
    const member = await loadMemberDiscoveryRecord(ctx.session.user.id);
    if (!member) return [];
    const attendance = await loadMemberAttendanceRows(member.id);
    return listMemberAttendance(
      attendance,
      await loadEventDiscoveryRecordsByIds(
        attendance.map(({ eventId }) => eventId),
      ),
      { memberId: member.id },
    );
  }),

  /** Lists or calendars Club events using the validated admin query state. */
  listAdminEvents: permProcedure
    .input(eventAdminQuerySchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      const now = new Date();
      const result = await queryAdminEventRecords(input, now);
      const metrics = await loadEventFeedbackListMetrics(
        result.rows.map(({ id }) => id),
      );
      return {
        ...result,
        rows: result.rows.map((row) => ({
          ...row,
          feedback: metrics.get(row.id) ?? {
            averageOverall: null,
            responseCount: 0,
          },
        })),
      };
    }),

  /** Returns one admin-safe Club event detail record. */
  getAdminEvent: permProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      const event = await loadClubEventDiscoveryRecord(input.eventId);
      if (!event)
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      return event;
    }),

  /** Lists live Discord candidates for an editor-reviewed ambiguity repair. */
  listDiscordRepairCandidates: permProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const orchestrator = await createOrchestrator(
        ctx.session,
        await channelTypesForEvent(input.eventId, gateways),
      );
      const candidates = await orchestrator.listDiscordRepairCandidates(
        input.eventId,
      );
      return {
        candidates: candidates.map(({ id, request }) => ({
          entityType: request.entityType,
          id,
          name: request.title,
          startAt: request.startAt,
        })),
        snapshotToken: Buffer.from(
          JSON.stringify(candidates.map(({ id }) => id).sort()),
        ).toString("base64url"),
      };
    }),

  /** Lists configurable Club event tags for authorized administrators. */
  listEventTags: permProcedure.query(async ({ ctx }) => {
    requireEventRead(ctx);
    return loadEventTags(true);
  }),

  /** Lists Blade roles that may be selected for an event audience. */
  listAudienceRoles: permProcedure.query(async ({ ctx }) => {
    requireEventRead(ctx);
    const roles = await db
      .select({
        color: Roles.teamHexcodeColor,
        discordRoleId: Roles.discordRoleId,
        id: Roles.id,
        name: Roles.name,
      })
      .from(Roles);
    return roles
      .filter(isSelectableProductRole)
      .map(({ color, id, name }) => ({ color, id, name }));
  }),

  /** Lists live voice and stage destinations available to event editors. */
  listDiscordChannels: permProcedure.query(async ({ ctx }) => {
    requireEventEdit(ctx);
    return (await resolveEventGateways(ctx.session)).listDiscordChannels();
  }),

  /** Returns the approved minimal attendee identity for one Club event. */
  listAttendees: permProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      await assertClubEventId(input.eventId);
      return loadMinimalAttendees(input.eventId);
    }),

  /** Exports spreadsheet-safe attendance CSV for one Club event. */
  exportAttendance: permProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      await assertClubEventId(input.eventId);
      const [rows, event] = await Promise.all([
        loadMinimalAttendees(input.eventId),
        loadEventAuditSnapshot(input.eventId),
      ]);
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const content = serializeAttendanceCsv(
        rows.map((row) => ({
          checkedInAt: row.checkedInAt,
          discordUsername: row.discordUsername,
          memberId: row.memberId,
          name: row.name,
          operatorId: row.operatorId,
          operatorName: row.operatorName,
          pointsAwarded: row.pointsAwarded,
          pointsAwardedEstimated: row.pointsAwardedEstimated,
        })),
      );
      await createAdminAuditEvent({
        actionKey: "event.attendance.exported",
        actor: ctx.session.user,
        metadata: { rowCount: rows.length },
        subjects: [
          {
            relation: "primary",
            targetId: event.id,
            targetLabel: event.name,
            targetType: "event",
          },
        ],
      });
      return content;
    }),

  /** Creates an idempotently reserved Club event and starts provider sync. */
  createEvent: permProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const payloadHash = submittedCreationHash(input);
      const existing = await db.query.Event.findFirst({
        where: eq(Event.creationKey, input.creationKey),
      });
      if (existing) {
        if (
          existing.hackathonId ||
          existing.creationPayloadHash !== payloadHash
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That creation key belongs to different event details.",
          });
        }
        const channelTypes = new Map<string, "stage" | "voice">();
        if (input.internalTarget.internal) {
          channelTypes.set(
            input.internalTarget.channelId,
            input.internalTarget.channelType,
          );
        }
        await (
          await createDbEventFeedbackService()
        ).provisionForEvent({ eventId: existing.id });
        return (await createOrchestrator(ctx.session, channelTypes)).sync(
          existing.id,
          {
            actorId: ctx.session.user.id,
            auditAction: "create",
          },
        );
      }
      if (!eventCreationHasMinimumLead(input.start)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: EVENT_CREATION_START_MESSAGE,
        });
      }
      const gateways = await resolveEventGateways(ctx.session);
      const channelType = await channelTypeFor(input.internalTarget, gateways);
      const roleIds =
        input.audience.type === "roles" ? input.audience.roleIds : [];
      const tagSnapshot = await dbTagService().resolveActiveSnapshot({
        pointsOverride: input.pointsOverride ?? null,
        tagId: input.tagId,
      });
      assertEventProviderPayloadLimits({
        description: input.description,
        location: input.location,
        name: input.name,
        points: tagSnapshot.points,
        tag: tagSnapshot.tag,
      });
      const eventId = randomUUID();
      const event: EventWorkflowRecord = {
        attendanceCount: 0,
        audience: input.audience.type,
        creationKey: input.creationKey,
        deletionIntentAt: null,
        description: input.description,
        discord: blankProjection(),
        discordChannel:
          input.internalTarget.internal && channelType
            ? { id: input.internalTarget.channelId, type: channelType }
            : null,
        endAt: new Date(input.end),
        google: blankProjection(),
        hackathonId: null,
        id: eventId,
        internal: input.internalTarget.internal,
        legacy: false,
        legacyDuesRequired: false,
        location: input.location,
        name: input.name,
        points: tagSnapshot.points,
        publishedAt: null,
        revision: 1,
        roleIds,
        startAt: new Date(input.start),
        synchronizedVisibility: null,
        tag: tagSnapshot.tag,
        tagColor: tagSnapshot.color,
      };
      const channelTypes = new Map<string, "stage" | "voice">();
      if (event.discordChannel) {
        channelTypes.set(event.discordChannel.id, event.discordChannel.type);
      }
      const result = await (
        await createOrchestrator(ctx.session, channelTypes, {
          pointsOverride: input.pointsOverride ?? null,
          roleIds,
          tagId: input.tagId,
        })
      ).create(event, {
        actorId: ctx.session.user.id,
        payloadHash,
      });
      const eventAudit = await loadEventAuditSnapshot(result.eventId);
      if (!eventAudit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      await auditEventProviderOperation({
        actionKey: "event.created",
        actor: ctx.session.user,
        event: eventAudit,
        metadata: {
          creationSource: "new",
          discordStatus: eventAudit.discordSyncState,
          endAt: eventAudit.end_datetime.toISOString(),
          googleStatus: eventAudit.googleSyncState,
          startAt: eventAudit.start_datetime.toISOString(),
          tagId: input.tagId,
        },
        providers: ["discord", "google"],
        resultSnapshot: eventAudit,
      });
      return result;
    }),

  /** Commits a Club event edit before reconciling provider projections. */
  updateEvent: permProcedure
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const existingKind = await db.query.Event.findFirst({
        columns: { legacy: true },
        where: and(eq(Event.id, input.eventId), isNull(Event.hackathonId)),
      });
      if (!existingKind) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const channelType = existingKind.legacy
        ? input.internalTarget.internal
          ? input.internalTarget.channelType
          : null
        : await channelTypeFor(input.internalTarget, gateways);
      const requestedRoleIds =
        input.audience.type === "roles" ? input.audience.roleIds : [];
      const updated = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(Event)
          .where(and(eq(Event.id, input.eventId), isNull(Event.hackathonId)))
          .for("update");
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        if (existing.deletionIntentAt) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This event is being deleted and can no longer be edited.",
          });
        }
        if (existing.syncRevision !== input.expectedRevision) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This event changed after you opened it. Close the editor and review the latest version.",
          });
        }

        const [tag] = await tx
          .select()
          .from(EventTag)
          .where(eq(EventTag.id, input.tagId))
          .for("share");
        if (!tag) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
        }
        if (!tag.active) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That event tag is archived.",
          });
        }

        const points = input.pointsOverride ?? tag.defaultPoints;
        if (!existing.legacy) {
          assertEventProviderPayloadLimits({
            description: input.description,
            location: input.location,
            name: input.name,
            points,
            tag: tag.name,
          });
        }

        const roleIds =
          existing.legacy &&
          existing.dues_paying &&
          existing.roles.length > 0 &&
          input.audience.type === "dues"
            ? existing.roles
            : requestedRoleIds;
        const uniqueRoleIds = [...new Set(roleIds)];
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

        const sameRoles =
          [...existing.roles].sort().join("\u0000") ===
          [...uniqueRoleIds].sort().join("\u0000");
        const changed = !(
          existing.description === input.description &&
          existing.discordChannelId ===
            (input.internalTarget.internal
              ? input.internalTarget.channelId
              : null) &&
          existing.dues_paying === (input.audience.type === "dues") &&
          existing.end_datetime.getTime() === new Date(input.end).getTime() &&
          existing.isOperationsCalendar === input.internalTarget.internal &&
          existing.location === input.location &&
          existing.name === input.name &&
          existing.points === points &&
          sameRoles &&
          existing.start_datetime.getTime() ===
            new Date(input.start).getTime() &&
          existing.tag === tag.name &&
          existing.tagColor === tag.color
        );
        if (!changed) {
          const feedback = await createDbEventFeedbackService(tx);
          await feedback.provisionForEvent({ eventId: existing.id });
          await feedback.recomputeWindowForEvent({ eventId: existing.id });
          return { before: existing, changed: false, row: existing };
        }

        const [saved] = await tx
          .update(Event)
          .set({
            description: input.description,
            discordChannelId: input.internalTarget.internal
              ? input.internalTarget.channelId
              : null,
            discordSyncState: existing.legacy
              ? existing.discordSyncState
              : "pending",
            dues_paying: input.audience.type === "dues",
            end_datetime: new Date(input.end),
            googleSyncState: existing.legacy
              ? existing.googleSyncState
              : "pending",
            isOperationsCalendar: input.internalTarget.internal,
            location: input.location,
            name: input.name,
            points,
            roles: uniqueRoleIds,
            start_datetime: new Date(input.start),
            syncRevision: existing.syncRevision + 1,
            tag: tag.name,
            tagColor: tag.color,
          })
          .where(eq(Event.id, existing.id))
          .returning();
        if (saved) {
          const feedback = await createDbEventFeedbackService(tx);
          await feedback.provisionForEvent({ eventId: saved.id });
          await feedback.recomputeWindowForEvent({ eventId: saved.id });
        }
        return { before: existing, changed: true, row: saved };
      });
      if (!updated.row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const channelTypes = new Map<string, "stage" | "voice">();
      if (input.internalTarget.internal && channelType) {
        channelTypes.set(input.internalTarget.channelId, channelType);
      }
      const orchestrator = await createOrchestrator(ctx.session, channelTypes);
      if (updated.row.legacy) {
        if (!updated.changed) {
          return { eventId: updated.row.id, status: "unchanged" as const };
        }
        try {
          await gateways.audit.event({
            action: "update_legacy",
            actorId: ctx.session.user.id,
            eventId: updated.row.id,
          });
        } catch {
          logger.warn("Legacy event audit transport failed.");
        }
        const snapshot = await loadEventAuditSnapshot(updated.row.id);
        if (!snapshot) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        await createAdminAuditEvent({
          actionKey: "event.updated",
          actor: ctx.session.user,
          changes: eventUpdateAuditChanges(updated.before, snapshot),
          subjects: [
            {
              relation: "primary",
              targetId: snapshot.id,
              targetLabel: snapshot.name,
              targetType: "event",
            },
          ],
        });
        return { eventId: updated.row.id, status: "legacy_updated" as const };
      }
      const result = await orchestrator.sync(updated.row.id, {
        actorId: ctx.session.user.id,
        auditAction: "update",
      });
      const snapshot = await loadEventAuditSnapshot(updated.row.id);
      if (!snapshot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      if (updated.changed) {
        await auditEventProviderOperation({
          actionKey: "event.updated",
          actor: ctx.session.user,
          changes: eventUpdateAuditChanges(updated.before, snapshot),
          event: snapshot,
          metadata: {
            discordStatus: snapshot.discordSyncState,
            googleStatus: snapshot.googleSyncState,
          },
          providers: ["discord", "google"],
          resultSnapshot: snapshot,
        });
      } else if (projectionChanged(updated.before, snapshot)) {
        await auditEventProviderOperation({
          actionKey: "event.integration.repaired",
          actor: ctx.session.user,
          event: snapshot,
          metadata: {
            discordStatus: snapshot.discordSyncState,
            googleStatus: snapshot.googleSyncState,
            providerScope: "failed",
          },
          providers: ["discord", "google"],
          resultSnapshot: snapshot,
        });
      }
      return result;
    }),

  /** Resumes synchronization for a recoverable Club event. */
  retrySync: permProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const before = await loadEventAuditSnapshot(input.eventId);
      if (!before) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const result = await (
        await createOrchestrator(
          ctx.session,
          await channelTypesForEvent(input.eventId, gateways),
        )
      ).sync(input.eventId, {
        actorId: ctx.session.user.id,
        auditAction: "repair",
      });
      const after = await loadEventAuditSnapshot(input.eventId);
      if (!after) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      if (result.status !== "syncing" || projectionChanged(before, after)) {
        await auditEventProviderOperation({
          actionKey: "event.integration.repaired",
          actor: ctx.session.user,
          event: before,
          metadata: {
            discordStatus: after.discordSyncState,
            googleStatus: after.googleSyncState,
            providerScope: "failed",
          },
          providers: ["discord", "google"],
          resultSnapshot: after,
        });
      }
      return result;
    }),

  /** Reapplies current Blade state to selected provider projections. */
  repairIntegration: permProcedure
    .input(eventRepairInput)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const before = await loadEventAuditSnapshot(input.eventId);
      if (!before) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const result = await (
        await createOrchestrator(
          ctx.session,
          await channelTypesForEvent(input.eventId, gateways),
        )
      ).sync(input.eventId, {
        actorId: ctx.session.user.id,
        auditAction: "repair",
        forceProviders:
          input.provider === "failed"
            ? []
            : input.provider === "all"
              ? ["discord", "google"]
              : [input.provider],
      });
      const after = await loadEventAuditSnapshot(input.eventId);
      if (!after) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      if (result.status !== "syncing" || projectionChanged(before, after)) {
        await auditEventProviderOperation({
          actionKey: "event.integration.repaired",
          actor: ctx.session.user,
          event: before,
          metadata: {
            discordStatus: after.discordSyncState,
            googleStatus: after.googleSyncState,
            providerScope: input.provider,
          },
          providers:
            input.provider === "discord" || input.provider === "google"
              ? [input.provider]
              : ["discord", "google"],
          resultSnapshot: after,
        });
      }
      return result;
    }),

  /** Applies an editor-reviewed resolution to ambiguous Discord state. */
  resolveDiscordProjection: permProcedure
    .input(eventDiscordResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const channelTypes = await channelTypesForEvent(input.eventId, gateways);
      const orchestrator = await createOrchestrator(ctx.session, channelTypes);
      if (input.mode === "link-existing") {
        const candidates = await orchestrator.listDiscordRepairCandidates(
          input.eventId,
        );
        const candidate = candidates.find(({ id }) => id === input.candidateId);
        if (!candidate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That Discord event is no longer available.",
          });
        }
        const expectedEntityType =
          Array.from(channelTypes.values()).at(0) ?? "external";
        if (candidate.request.entityType !== expectedEntityType) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That Discord event type does not match this Blade event.",
          });
        }
        await claimDiscordCandidate(input.eventId, input.candidateId);
        const result = await orchestrator.resolveDiscordProjection(
          input.eventId,
          {
            actorId: ctx.session.user.id,
            candidateId: input.candidateId,
            mode: "link_existing",
          },
        );
        const event = await loadEventAuditSnapshot(input.eventId);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        await auditDiscordResolution({
          actor: ctx.session.user,
          event,
          mode: "link_existing",
          projectionId: input.candidateId,
          projectionType: candidate.request.entityType,
          result: "linked",
          resultOutcome: projectionResult(event.discordSyncState),
        });
        return result;
      }
      if (input.mode === "confirm-create-new") {
        await confirmNewDiscordProjection(input.eventId);
        const result = await orchestrator.sync(input.eventId, {
          actorId: ctx.session.user.id,
          auditAction: "resolve_discord",
        });
        const event = await loadEventAuditSnapshot(input.eventId);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        await auditDiscordResolution({
          actor: ctx.session.user,
          event,
          mode: "confirm_create_new",
          projectionId: event.discordId,
          result: result.status,
          resultOutcome: projectionResult(event.discordSyncState),
        });
        return result;
      }
      const candidates = await orchestrator.listDiscordRepairCandidates(
        input.eventId,
      );
      const snapshotToken = Buffer.from(
        JSON.stringify(candidates.map(({ id }) => id).sort()),
      ).toString("base64url");
      if (snapshotToken !== input.candidateSnapshotToken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Discord candidates changed. Review them again.",
        });
      }
      const result = await orchestrator.resolveDiscordProjection(
        input.eventId,
        {
          actorId: ctx.session.user.id,
          candidateSnapshot: candidates,
          mode: "confirm_no_projection",
          phrase: input.confirmation,
        },
      );
      const event = await loadEventAuditSnapshot(input.eventId);
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      await auditDiscordResolution({
        actor: ctx.session.user,
        event,
        mode: "confirm_no_projection",
        result: "acknowledged_absent",
        resultOutcome: "succeeded",
      });
      return result;
    }),

  /** Starts recoverable provider cleanup for an attendance-free Club event. */
  deleteEvent: permProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const before = await loadEventAuditSnapshot(input.eventId);
      if (!before) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const result = await (
        await createOrchestrator(ctx.session)
      ).delete(input.eventId, {
        actorId: ctx.session.user.id,
      });
      const after = await loadEventAuditSnapshot(input.eventId);
      if (result.status !== "syncing" || projectionChanged(before, after)) {
        await auditEventProviderOperation({
          actionKey: "event.deleted",
          actor: ctx.session.user,
          deleted: result.status === "deleted",
          event: before,
          metadata: {
            discordStatus:
              result.status === "deleted"
                ? "deleted"
                : (after?.discordSyncState ?? before.discordSyncState),
            googleStatus:
              result.status === "deleted"
                ? "deleted"
                : (after?.googleSyncState ?? before.googleSyncState),
            stage: before.deletionIntentAt ? "retry" : "initial",
          },
          providers: before.legacy ? [] : ["discord", "google"],
          resultSnapshot: after,
        });
      }
      return result;
    }),

  /** Creates a configurable Club event tag template. */
  createTag: permProcedure
    .input(eventTagCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const result = await dbTagService(gateways.audit.tag).create({
        ...input,
        actorId: ctx.session.user.id,
      });
      await createAdminAuditEvent({
        actionKey: "event.tag.created",
        actor: ctx.session.user,
        metadata: {
          color: result.color,
          defaultPoints: result.defaultPoints,
          name: result.name,
        },
        subjects: [
          {
            relation: "primary",
            targetId: result.id,
            targetLabel: result.name,
            targetType: "event_tag",
          },
        ],
      });
      return result;
    }),

  /** Updates a Club event tag template without rewriting event snapshots. */
  updateTag: permProcedure
    .input(eventTagUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const before = await db.query.EventTag.findFirst({
        where: eq(EventTag.id, input.tagId),
      });
      const result = await dbTagService(gateways.audit.tag).update({
        ...input,
        actorId: ctx.session.user.id,
      });
      if (!before) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
      }
      await createAdminAuditEvent({
        actionKey: "event.tag.updated",
        actor: ctx.session.user,
        changes: (
          [
            ["name", before.name, result.name],
            ["color", before.color, result.color],
            ["defaultPoints", before.defaultPoints, result.defaultPoints],
          ] as const
        ).flatMap(([field, beforeValue, afterValue]) =>
          beforeValue === afterValue
            ? []
            : [{ after: afterValue, before: beforeValue, field }],
        ),
        subjects: [
          {
            relation: "primary",
            targetId: result.id,
            targetLabel: result.name,
            targetType: "event_tag",
          },
        ],
      });
      return result;
    }),

  /** Archives a tag after its locked active-state recheck. */
  archiveTag: permProcedure
    .input(eventTagArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const result = await dbTagService(gateways.audit.tag).archive({
        actorId: ctx.session.user.id,
        tagId: input.tagId,
      });
      await createAdminAuditEvent({
        actionKey: "event.tag.archived",
        actor: ctx.session.user,
        changes: [{ after: result.active, before: true, field: "active" }],
        subjects: [
          {
            relation: "primary",
            targetId: result.id,
            targetLabel: result.name,
            targetType: "event_tag",
          },
        ],
      });
      return result;
    }),

  /** Removes one attendance record and reverses its captured point award. */
  removeAttendance: permProcedure
    .input(eventAttendanceRemovalSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const [attendance] = await db
        .select({
          checkedInAt: EventAttendee.checkedInAt,
          eventId: EventAttendee.eventId,
          eventName: Event.name,
          memberFirstName: Member.firstName,
          memberId: EventAttendee.memberId,
          memberLastName: Member.lastName,
        })
        .from(EventAttendee)
        .innerJoin(Event, eq(Event.id, EventAttendee.eventId))
        .innerJoin(Member, eq(Member.id, EventAttendee.memberId))
        .where(eq(EventAttendee.id, input.attendanceId));
      if (!attendance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance not found.",
        });
      }
      await assertClubEventId(attendance.eventId);
      const gateways = await resolveEventGateways(ctx.session);
      const result = await createAttendanceService({
        audit: gateways.audit.attendance,
        clock: () => new Date(),
        state: createDbAttendanceState(),
      }).removeAttendance({ ...input, actorId: ctx.session.user.id });
      await createAdminAuditEvent({
        actionKey: "attendance.removed",
        actor: ctx.session.user,
        metadata: {
          originalCheckInAt: attendance.checkedInAt?.toISOString() ?? null,
          pointsReversed: result.pointsRemoved,
        },
        subjects: [
          {
            memberId: attendance.memberId,
            relation: "primary",
            targetId: attendance.memberId,
            targetLabel:
              `${attendance.memberFirstName} ${attendance.memberLastName}`.trim(),
            targetType: "member",
          },
          {
            relation: "secondary",
            targetId: attendance.eventId,
            targetLabel: attendance.eventName,
            targetType: "event",
          },
          {
            relation: "secondary",
            targetId: input.attendanceId,
            targetLabel: "Attendance record",
            targetType: "attendance",
          },
        ],
      });
      return result;
    }),

  /** Returns UUID/title-only event groups for the isolated check-in surface. */
  listCheckInEvents: permProcedure
    .input(checkInEventInput)
    .query(async ({ ctx, input }) => {
      requireEventCheckIn(ctx);
      return queryCheckInEventChoices({
        now: new Date(),
        olderSearch: input.olderSearch,
      });
    }),

  /** Searches bounded minimal member identity for check-in. */
  searchCheckInMembers: permProcedure
    .input(eventCheckInSearchSchema)
    .query(async ({ ctx, input }) => {
      requireEventCheckIn(ctx);
      return searchCheckInMemberCandidates(input);
    }),

  /** Performs idempotent Manual or optionally repeat-enabled QR check-in. */
  checkInMember: permProcedure
    .input(checkInInput)
    .mutation(async ({ ctx, input }) => {
      requireEventCheckIn(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      const service = createAttendanceService({
        audit: gateways.audit.attendance,
        clock: () => new Date(),
        state: createDbAttendanceState(),
      });
      const result =
        "memberId" in input
          ? service.checkIn({
              actorId: ctx.session.user.id,
              eventId: input.eventId,
              memberId: input.memberId,
            })
          : service.checkIn({
              actorId: ctx.session.user.id,
              allowRepeat: input.allowRepeat,
              eventId: input.eventId,
              qrPayload: input.qrPayload.userId,
            });
      const resolved = await result;
      if (resolved.status === "checked_in") {
        const event = await loadEventAuditSnapshot(input.eventId);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        await createAdminAuditEvent({
          actionKey: "attendance.checked_in",
          actor: ctx.session.user,
          metadata: {
            additionalAttendance: resolved.additionalAttendance,
            method: "memberId" in input ? "manual" : "qr",
            pointsAwarded: resolved.pointsAwarded,
            repeatAllowed:
              "memberId" in input ? false : Boolean(input.allowRepeat),
          },
          subjects: [
            {
              memberId: resolved.member.id,
              relation: "primary",
              targetId: resolved.member.id,
              targetLabel: resolved.member.name,
              targetType: "member",
            },
            {
              relation: "secondary",
              targetId: event.id,
              targetLabel: event.name,
              targetType: "event",
            },
            {
              relation: "secondary",
              targetId: resolved.attendanceId,
              targetLabel: "Attendance record",
              targetType: "attendance",
            },
          ],
        });
      }
      return resolved;
    }),
} satisfies TRPCRouterRecord;

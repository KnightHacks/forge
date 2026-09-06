import { createHash, randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Event,
  EventFeedbackConfig,
  EventTag,
  FormsSchemas,
  Hackathon,
  HackathonClass,
  Hacker,
  HackerAttendee,
  HackerCheckInAttempt,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";
import {
  hackathonAttendanceCorrectionSchema,
  hackathonCheckInAttemptSchema,
  hackathonCheckInHistorySchema,
  hackathonEventAdminQuerySchema,
  hackathonEventCheckInSchema,
  hackathonEventCheckInSearchSchema,
  hackathonEventCreateSchema,
  hackathonEventDiscordConfigSchema,
  hackathonEventDiscordResolutionSchema,
  hackathonEventIdSchema,
  hackathonEventPublicationHealthDtoSchema,
  hackathonEventPublicationHealthInputSchema,
  hackathonEventPublicationRetrySchema,
  hackathonEventPublicationSetDesiredStateSchema,
  hackathonEventScopeSchema,
  hackathonEventTagArchiveSchema,
  hackathonEventTagCreateSchema,
  hackathonEventTagImportSchema,
  hackathonEventTagUpdateSchema,
  hackathonEventUpdateSchema,
  hackathonRoleRepairSchema,
} from "@forge/validators";

import type { WriteDb } from "../utils/db";
import { permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { validateEventAnnouncementChannel } from "../utils/events/announcement-channel";
import {
  createDbEventFeedbackService,
  loadEventFeedbackListMetrics,
} from "../utils/events/database-feedback";
import { resolveEventGateways } from "../utils/events/gateway-resolver";
import { assertHackathonEventProviderPayloadLimits } from "../utils/events/orchestration";
import {
  requireAnyHackathonEventCapability,
  requireHackathonEventCheckIn,
  requireHackathonEventEdit,
  requireHackathonEventRead,
} from "../utils/hackathon-events/access";
import { performHackathonEventCheckIn } from "../utils/hackathon-events/check-in";
import { correctHackathonEventAttendance } from "../utils/hackathon-events/correction";
import { hasHackathonEventHistory } from "../utils/hackathon-events/deletion";
import { createHackEventOrchestrator } from "../utils/hackathon-events/orchestrator";
import {
  ensureEventPublicationWork,
  loadEventPublicationHealth,
  lockHackathonEventPublicationScope,
  retryEventPublication,
  setEventPublicationDesiredState,
} from "../utils/hackathon-events/publication";
import {
  deliverHackathonRoleGrants,
  loadHackathonRoleGrantHealth,
} from "../utils/hackathon-events/roles";
import { requireHackerRead } from "../utils/hacker/access";
import { assertCanManagePlatformConfig } from "../utils/platform-config/access";
import { resolveRoleDiscordGateway } from "../utils/roles/discord-gateway";

const hackerAttendanceInput = hackathonEventScopeSchema
  .extend({
    attendeeId: z.string().uuid(),
    cursor: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

function firstTimeStatus(value: boolean | null) {
  return value === true
    ? ("first" as const)
    : value === false
      ? ("returning" as const)
      : ("unknown" as const);
}

export function hackathonDiscordResolutionAuditResult({
  discordSyncState,
  mode,
  resultStatus,
}: {
  discordSyncState: string | null;
  mode: "confirm-create-new" | "confirm-no-projection" | "link-existing";
  resultStatus: string | null;
}) {
  if (mode === "confirm-no-projection") {
    return {
      providerOutcome: "succeeded" as const,
      result: "acknowledged_absent",
    };
  }
  return {
    providerOutcome:
      discordSyncState === "synced"
        ? ("succeeded" as const)
        : discordSyncState === "unknown" || discordSyncState === "error"
          ? ("failed_external" as const)
          : ("skipped" as const),
    result: resultStatus,
  };
}

function normalizeTagName(name: string) {
  const display = name.trim().replace(/\s+/g, " ");
  return { display, key: display.toLocaleLowerCase("en-US") };
}

async function hackathonAuditSubject(database: WriteDb, hackathonId: string) {
  const hackathon = await database.query.Hackathon.findFirst({
    columns: { displayName: true, id: true },
    where: eq(Hackathon.id, hackathonId),
  });
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
  return {
    relation: "secondary" as const,
    targetId: hackathon.id,
    targetLabel: hackathon.displayName,
    targetType: "hackathon" as const,
  };
}

function asHackEventWriteConflict(error: unknown): never {
  const dbError = error as { code?: string; constraint?: string };
  if (
    dbError.code === "23505" &&
    dbError.constraint === "knight_hacks_event_one_primary_per_hackathon"
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This hackathon already has a primary check-in event.",
    });
  }
  throw error;
}

function asHackTagWriteConflict(error: unknown): never {
  if ((error as { code?: string }).code === "23505") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An event tag already uses that name in this hackathon.",
    });
  }
  throw error;
}

async function buildTagImportPreview(database: WriteDb, hackathonId: string) {
  const targetHackathon = await database.query.Hackathon.findFirst({
    columns: { displayName: true, id: true, startDate: true },
    where: eq(Hackathon.id, hackathonId),
  });
  if (!targetHackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }

  const [sourceRows, targetRows] = await Promise.all([
    database
      .select({
        active: EventTag.active,
        color: EventTag.color,
        defaultPoints: EventTag.defaultPoints,
        displayName: Hackathon.displayName,
        hackathonId: Hackathon.id,
        name: EventTag.name,
        normalizedName: EventTag.normalizedName,
        sourceStartDate: Hackathon.startDate,
        sourceTagId: EventTag.id,
      })
      .from(EventTag)
      .innerJoin(Hackathon, eq(Hackathon.id, EventTag.hackathonId))
      .where(
        and(
          isNotNull(EventTag.hackathonId),
          lt(Hackathon.startDate, targetHackathon.startDate),
        ),
      )
      .orderBy(
        desc(Hackathon.startDate),
        desc(Hackathon.id),
        desc(EventTag.updatedAt),
        desc(EventTag.id),
      ),
    database
      .select({
        active: EventTag.active,
        id: EventTag.id,
        normalizedName: EventTag.normalizedName,
      })
      .from(EventTag)
      .where(eq(EventTag.hackathonId, hackathonId)),
  ]);

  const targets = new Map(targetRows.map((tag) => [tag.normalizedName, tag]));
  const grouped = new Map<string, (typeof sourceRows)[number][]>();
  for (const row of sourceRows) {
    const group = grouped.get(row.normalizedName) ?? [];
    group.push(row);
    grouped.set(row.normalizedName, group);
  }
  const tags = [...grouped.values()]
    .map((occurrences) => {
      const winner =
        occurrences.find((occurrence) => occurrence.active) ?? occurrences[0];
      if (!winner) throw new Error("Tag import group is empty.");
      const target = targets.get(winner.normalizedName);
      return {
        alsoSeenIn: occurrences.map((row) => ({
          displayName: row.displayName,
          hackathonId: row.hackathonId,
          active: row.active,
          sourceTagId: row.sourceTagId,
          startDate: row.sourceStartDate,
        })),
        color: winner.color,
        defaultPoints: winner.defaultPoints,
        name: winner.name,
        normalizedName: winner.normalizedName,
        sourceHackathon: {
          displayName: winner.displayName,
          id: winner.hackathonId,
          startDate: winner.sourceStartDate,
        },
        sourceTagId: winner.sourceTagId,
        status: target
          ? target.active
            ? ("already_exists_active" as const)
            : ("already_exists_archived" as const)
          : occurrences.some((occurrence) => occurrence.active)
            ? ("will_import" as const)
            : ("archived_source" as const),
        targetTagId: target?.id ?? null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const sourceHackathons = [
    ...new Map(
      sourceRows.map((row) => [
        row.hackathonId,
        {
          displayName: row.displayName,
          id: row.hackathonId,
          startDate: row.sourceStartDate,
        },
      ]),
    ).values(),
  ];
  return {
    counts: {
      alreadyExists: tags.filter((tag) => tag.status !== "will_import").length,
      archivedSource: tags.filter((tag) => tag.status === "archived_source")
        .length,
      sourceHackathons: sourceHackathons.length,
      sourceTagRows: sourceRows.length,
      uniqueTags: tags.length,
      willImport: tags.filter((tag) => tag.status === "will_import").length,
    },
    sourceHackathons,
    tags,
    targetHackathon,
  };
}

async function claimHackathonDiscordCandidate({
  candidateId,
  eventId,
  hackathonId,
}: {
  candidateId: string;
  eventId: string;
  hackathonId: string;
}) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`blade:event-discord:${candidateId}`}, 0))`,
    );
    const [event] = await tx
      .select()
      .from(Event)
      .where(and(eq(Event.id, eventId), eq(Event.hackathonId, hackathonId)))
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
        message: "This event is already linked to another Discord event.",
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

async function confirmNewHackathonDiscordProjection({
  eventId,
  hackathonId,
}: {
  eventId: string;
  hackathonId: string;
}) {
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(Event)
      .where(and(eq(Event.id, eventId), eq(Event.hackathonId, hackathonId)))
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

export const hackathonEventRouter = {
  /** Minimal hackathon picker for event readers, editors, and check-in operators. */
  listCheckInHackathons: permProcedure.query(async ({ ctx }) => {
    requireAnyHackathonEventCapability(ctx);
    return db
      .select({
        displayName: Hackathon.displayName,
        endDate: Hackathon.endDate,
        id: Hackathon.id,
        startDate: Hackathon.startDate,
      })
      .from(Hackathon)
      .orderBy(desc(Hackathon.startDate));
  }),

  getPublicationHealth: permProcedure
    .input(hackathonEventPublicationHealthInputSchema)
    .output(hackathonEventPublicationHealthDtoSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      return loadEventPublicationHealth(input.hackathonId);
    }),

  setPublicationDesiredState: permProcedure
    .input(hackathonEventPublicationSetDesiredStateSchema)
    .output(hackathonEventPublicationHealthDtoSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const health = await setEventPublicationDesiredState({
        actorId: ctx.session.user.id,
        audit: async (result, tx) => {
          const hackathon = await hackathonAuditSubject(tx, input.hackathonId);
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.publication_desired_state.updated",
              actor,
              metadata: {
                desiredEnabled: input.desiredEnabled,
                provider: input.provider,
                revision: result.revision,
                workItemCount: result.workItemCount,
              },
              subjects: [{ ...hackathon, relation: "primary" }],
            },
            tx,
          );
        },
        desiredEnabled: input.desiredEnabled,
        expectedRemoteCount: input.expectedRemoteCount,
        expectedRevision: input.expectedRevision,
        hackathonId: input.hackathonId,
        provider: input.provider,
      });
      return health;
    }),

  retryPublication: permProcedure
    .input(hackathonEventPublicationRetrySchema)
    .output(hackathonEventPublicationHealthDtoSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const result = await retryEventPublication({
        ...input,
        audit: async (summary, tx) => {
          const hackathon = await hackathonAuditSubject(tx, input.hackathonId);
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.publication_retried",
              actor,
              metadata: {
                blockedCount: summary.blockedCount,
                provider: input.provider,
                requeuedCount: summary.requeuedCount,
                revision: summary.revision,
              },
              outcome:
                summary.blockedCount > 0 ? "partial_external" : "committed",
              subjects: [{ ...hackathon, relation: "primary" }],
            },
            tx,
          );
        },
      });
      return result.health;
    }),

  createEvent: permProcedure
    .input(hackathonEventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const payloadHash = createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex");
      await db
        .transaction(async (tx) => {
          const existing = await tx.query.Event.findFirst({
            columns: { creationPayloadHash: true, hackathonId: true, id: true },
            where: eq(Event.creationKey, input.creationKey),
          });
          if (existing) {
            if (
              existing.hackathonId !== input.hackathonId ||
              existing.creationPayloadHash !== payloadHash
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "That creation key belongs to different event details.",
              });
            }
            await ensureEventPublicationWork({
              database: tx,
              eventIds: [existing.id],
              hackathonId: input.hackathonId,
            });
            return existing.id;
          }
          const [hackathon, tag] = await Promise.all([
            tx.query.Hackathon.findFirst({
              columns: { displayName: true, id: true },
              where: eq(Hackathon.id, input.hackathonId),
            }),
            tx.query.EventTag.findFirst({
              where: and(
                eq(EventTag.id, input.tagId),
                eq(EventTag.hackathonId, input.hackathonId),
                eq(EventTag.active, true),
              ),
            }),
          ]);
          if (!hackathon)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Hackathon not found.",
            });
          if (!tag)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Active tag not found.",
            });
          assertHackathonEventProviderPayloadLimits({
            description: input.description,
            hackathonName: hackathon.displayName,
            location: input.location,
            name: input.name,
            points: input.pointsOverride ?? tag.defaultPoints,
            tag: tag.name,
          });
          const [created] = await tx
            .insert(Event)
            .values({
              creationKey: input.creationKey,
              creationPayloadHash: payloadHash,
              description: input.description,
              discordChannelId: null,
              discordSyncState: "pending",
              dues_paying: false,
              end_datetime: new Date(input.end),
              googleSyncState: "pending",
              hackathonId: input.hackathonId,
              isOperationsCalendar: false,
              legacy: false,
              location: input.location,
              name: input.name,
              points: input.pointsOverride ?? tag.defaultPoints,
              purpose: input.purpose,
              roles: [],
              start_datetime: new Date(input.start),
              tag: tag.name,
              tagId: tag.id,
              tagColor: tag.color,
            })
            .onConflictDoNothing({ target: Event.creationKey })
            .returning({ id: Event.id });
          if (!created) {
            const concurrent = await tx.query.Event.findFirst({
              columns: {
                creationPayloadHash: true,
                hackathonId: true,
                id: true,
              },
              where: eq(Event.creationKey, input.creationKey),
            });
            if (!concurrent) {
              throw new Error("Concurrent event creation row was not found.");
            }
            if (
              concurrent.hackathonId !== input.hackathonId ||
              concurrent.creationPayloadHash !== payloadHash
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "That creation key belongs to different event details.",
              });
            }
            await ensureEventPublicationWork({
              database: tx,
              eventIds: [concurrent.id],
              hackathonId: input.hackathonId,
            });
            return concurrent.id;
          }
          await (
            await createDbEventFeedbackService(tx, {
              includeHackathonEvents: true,
            })
          ).provisionForEvent({ eventId: created.id });
          await ensureEventPublicationWork({
            database: tx,
            eventIds: [created.id],
            hackathonId: input.hackathonId,
          });
          const current = await tx.query.Event.findFirst({
            where: and(
              eq(Event.id, created.id),
              eq(Event.hackathonId, input.hackathonId),
            ),
          });
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.created",
              actor,
              metadata: {
                creationSource: "new",
                discordStatus: current?.discordSyncState ?? null,
                endAt: input.end,
                googleStatus: current?.googleSyncState ?? null,
                startAt: input.start,
                tagId: input.tagId,
              },
              subjects: [
                {
                  relation: "primary",
                  targetId: created.id,
                  targetLabel: input.name,
                  targetType: "event",
                },
                await hackathonAuditSubject(tx, input.hackathonId),
              ],
            },
            tx,
          );
          return created.id;
        })
        .catch(asHackEventWriteConflict);
      const health = await loadEventPublicationHealth(input.hackathonId);
      return {
        status: health.providers.some(
          (provider) => provider.status !== "off" && provider.status !== "on",
        )
          ? "syncing"
          : "published",
      };
    }),

  updateEvent: permProcedure
    .input(hackathonEventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      await db
        .transaction(async (tx) => {
          const [event] = await tx
            .select()
            .from(Event)
            .where(
              and(
                eq(Event.id, input.eventId),
                eq(Event.hackathonId, input.hackathonId),
              ),
            )
            .for("update")
            .limit(1);
          if (!event)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Event not found.",
            });
          if (event.deletionIntentAt)
            throw new TRPCError({
              code: "CONFLICT",
              message: "This event is being deleted.",
            });
          if (event.syncRevision !== input.expectedRevision)
            throw new TRPCError({
              code: "CONFLICT",
              message: "This event changed. Reload and try again.",
            });
          if (event.purpose !== input.purpose) {
            const activeAttendance =
              await tx.query.HackerEventAttendee.findFirst({
                columns: { id: true },
                where: and(
                  eq(HackerEventAttendee.eventId, event.id),
                  eq(HackerEventAttendee.hackathonId, input.hackathonId),
                  isNull(HackerEventAttendee.voidedAt),
                ),
              });
            if (activeAttendance) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Event purpose cannot change after attendance exists.",
              });
            }
          }
          const [hackathon, tag] = await Promise.all([
            tx.query.Hackathon.findFirst({
              columns: { displayName: true },
              where: eq(Hackathon.id, input.hackathonId),
            }),
            tx.query.EventTag.findFirst({
              where: and(
                eq(EventTag.id, input.tagId),
                eq(EventTag.hackathonId, input.hackathonId),
                eq(EventTag.active, true),
              ),
            }),
          ]);
          if (!hackathon)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Hackathon not found.",
            });
          if (!tag)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Active tag not found.",
            });
          const points = input.pointsOverride ?? tag.defaultPoints;
          assertHackathonEventProviderPayloadLimits({
            description: input.description,
            hackathonName: hackathon.displayName,
            location: input.location,
            name: input.name,
            points,
            tag: tag.name,
          });
          const [row] = await tx
            .update(Event)
            .set({
              description: input.description,
              discordChannelId: null,
              discordSyncState: "pending",
              end_datetime: new Date(input.end),
              googleSyncState: "pending",
              isOperationsCalendar: false,
              location: input.location,
              name: input.name,
              points,
              purpose: input.purpose,
              start_datetime: new Date(input.start),
              syncRevision: event.syncRevision + 1,
              tag: tag.name,
              tagId: tag.id,
              tagColor: tag.color,
            })
            .where(
              and(
                eq(Event.id, input.eventId),
                eq(Event.hackathonId, input.hackathonId),
              ),
            )
            .returning();
          if (!row) throw new Error("Event update did not return a row.");
          const feedback = await createDbEventFeedbackService(tx, {
            includeHackathonEvents: true,
          });
          await feedback.provisionForEvent({ eventId: row.id });
          await feedback.recomputeWindowForEvent({ eventId: row.id });
          await ensureEventPublicationWork({
            database: tx,
            eventIds: [row.id],
            hackathonId: input.hackathonId,
          });
          const current = await tx.query.Event.findFirst({
            where: and(
              eq(Event.id, input.eventId),
              eq(Event.hackathonId, input.hackathonId),
            ),
          });
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.updated",
              actor,
              changes: [
                {
                  field: "name",
                  before: event.name,
                  after: row.name,
                },
                {
                  field: "startAt",
                  before: event.start_datetime.toISOString(),
                  after: row.start_datetime.toISOString(),
                },
                {
                  field: "endAt",
                  before: event.end_datetime.toISOString(),
                  after: row.end_datetime.toISOString(),
                },
                {
                  field: "location",
                  before: event.location,
                  after: row.location,
                },
                {
                  field: "points",
                  before: event.points,
                  after: row.points,
                },
              ].filter(({ before, after }) => String(before) !== String(after)),
              metadata: {
                discordStatus: current?.discordSyncState ?? null,
                googleStatus: current?.googleSyncState ?? null,
              },
              subjects: [
                {
                  relation: "primary",
                  targetId: row.id,
                  targetLabel: row.name,
                  targetType: "event",
                },
                await hackathonAuditSubject(tx, input.hackathonId),
              ],
            },
            tx,
          );
          return row;
        })
        .catch(asHackEventWriteConflict);
      const health = await loadEventPublicationHealth(input.hackathonId);
      return {
        status: health.providers.some(
          (provider) => provider.status !== "off" && provider.status !== "on",
        )
          ? "syncing"
          : "published",
      };
    }),

  deleteEvent: permProcedure
    .input(hackathonEventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const deletion = await db.transaction(async (tx) => {
        await lockHackathonEventPublicationScope(tx, input.hackathonId);
        const [before] = await tx
          .select()
          .from(Event)
          .where(
            and(
              eq(Event.id, input.eventId),
              eq(Event.hackathonId, input.hackathonId),
            ),
          )
          .for("update")
          .limit(1);
        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found.",
          });
        }
        if (
          await hasHackathonEventHistory(tx, {
            eventId: before.id,
            hackathonId: input.hackathonId,
          })
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Events with attendance or check-in history cannot be deleted.",
          });
        }
        const [event] = before.deletionIntentAt
          ? [before]
          : await tx
              .update(Event)
              .set({
                deletionIntentAt: new Date(),
                discordSyncState:
                  before.discordSyncState === "unknown"
                    ? "unknown"
                    : before.discordId
                      ? "pending"
                      : "disabled",
                googleSyncState:
                  before.googleSyncState === "unknown"
                    ? "unknown"
                    : before.googleId
                      ? "pending"
                      : "disabled",
                syncRevision: before.syncRevision + 1,
              })
              .where(eq(Event.id, before.id))
              .returning();
        if (!event) throw new Error("Event deletion intent was not saved.");
        const canDeleteImmediately =
          event.discordId === null &&
          event.googleId === null &&
          event.discordSyncState !== "unknown" &&
          event.googleSyncState !== "unknown";
        if (canDeleteImmediately) {
          await tx.delete(Event).where(eq(Event.id, event.id));
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.deleted",
              actor,
              metadata: {
                discordStatus: "deleted",
                googleStatus: "deleted",
                stage: "completed",
              },
              subjects: [
                {
                  relation: "primary",
                  targetId: before.id,
                  targetLabel: before.name,
                  targetType: "event",
                },
                await hackathonAuditSubject(tx, input.hackathonId),
              ],
            },
            tx,
          );
          return { deleted: true };
        }
        await ensureEventPublicationWork({
          database: tx,
          eventIds: [event.id],
          hackathonId: input.hackathonId,
        });
        const after = await tx.query.Event.findFirst({
          where: and(
            eq(Event.id, input.eventId),
            eq(Event.hackathonId, input.hackathonId),
          ),
        });
        await createAdminAuditEvent(
          {
            actionKey: "hackathon_event.deleted",
            actor,
            metadata: {
              discordStatus: after?.discordSyncState ?? "deleted",
              googleStatus: after?.googleSyncState ?? "deleted",
              stage: "syncing",
            },
            subjects: [
              {
                relation: "primary",
                targetId: before.id,
                targetLabel: before.name,
                targetType: "event",
              },
              await hackathonAuditSubject(tx, input.hackathonId),
            ],
          },
          tx,
        );
        return { deleted: false };
      });
      return { status: deletion.deleted ? "deleted" : "syncing" };
    }),

  retrySync: permProcedure
    .input(hackathonEventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const event = await db.query.Event.findFirst({
        where: and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      await ensureEventPublicationWork({
        eventIds: [event.id],
        hackathonId: input.hackathonId,
      });
      const health = await Promise.all([
        retryEventPublication({
          eventIds: [event.id],
          hackathonId: input.hackathonId,
          provider: "discord",
        }),
        retryEventPublication({
          eventIds: [event.id],
          hackathonId: input.hackathonId,
          provider: "google",
        }),
      ]).then(([value]) => value.health);
      const current = await db.query.Event.findFirst({
        where: and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      });
      await createAdminAuditEvent({
        actionKey: "hackathon_event.integration_repaired",
        actor,
        metadata: {
          discordStatus: current?.discordSyncState ?? null,
          googleStatus: current?.googleSyncState ?? null,
          providerScope: "all",
        },
        subjects: [
          {
            relation: "primary",
            targetId: event.id,
            targetLabel: event.name,
            targetType: "event",
          },
          await hackathonAuditSubject(db, input.hackathonId),
        ],
      });
      return {
        status: health.providers.some(
          (provider) => provider.status !== "off" && provider.status !== "on",
        )
          ? "syncing"
          : "published",
      };
    }),

  /** Hackathon-scoped event administration rows; never Club rows. */
  listEvents: permProcedure
    .input(hackathonEventAdminQuerySchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      const now = new Date();
      const attendanceCount = sql<number>`(
        select count(*)::int
        from ${HackerEventAttendee}
        where ${HackerEventAttendee.eventId} = ${Event.id}
          and ${HackerEventAttendee.hackathonId} = ${input.hackathonId}
          and ${HackerEventAttendee.voidedAt} is null
      )`;
      const integrationFilter =
        input.integrationState === "healthy"
          ? and(
              eq(Event.discordSyncState, "synced"),
              eq(Event.googleSyncState, "synced"),
              isNull(Event.deletionIntentAt),
            )
          : input.integrationState === "needs_attention"
            ? or(
                isNotNull(Event.deletionIntentAt),
                sql`${Event.discordSyncState} IS DISTINCT FROM 'synced'`,
                sql`${Event.googleSyncState} IS DISTINCT FROM 'synced'`,
              )
            : input.integrationState === "unknown"
              ? or(
                  isNull(Event.discordSyncState),
                  isNull(Event.googleSyncState),
                  eq(Event.discordSyncState, "unknown"),
                  eq(Event.googleSyncState, "unknown"),
                )
              : input.integrationState
                ? or(
                    eq(Event.discordSyncState, input.integrationState),
                    eq(Event.googleSyncState, input.integrationState),
                  )
                : undefined;
      const where = and(
        eq(Event.hackathonId, input.hackathonId),
        input.search
          ? or(
              ilike(Event.name, `%${input.search}%`),
              ilike(Event.description, `%${input.search}%`),
              ilike(Event.location, `%${input.search}%`),
              ilike(Event.tag, `%${input.search}%`),
            )
          : undefined,
        input.purpose ? eq(Event.purpose, input.purpose) : undefined,
        input.tags.length ? inArray(Event.tag, input.tags) : undefined,
        input.timing === "upcoming"
          ? gt(Event.end_datetime, now)
          : input.timing === "past"
            ? sql`${Event.end_datetime} <= ${now}`
            : undefined,
        input.calendarStart && input.calendarEnd
          ? and(
              lt(Event.start_datetime, new Date(input.calendarEnd)),
              gt(Event.end_datetime, new Date(input.calendarStart)),
            )
          : undefined,
        integrationFilter,
      );
      const [total] = await db
        .select({ value: count(Event.id) })
        .from(Event)
        .where(where);
      const totalCount = total?.value ?? 0;
      const pageCount = Math.max(1, Math.ceil(totalCount / input.pageSize));
      const page = Math.min(input.page, pageCount);
      const sortExpression =
        input.sortField === "name"
          ? sql`lower(${Event.name})`
          : input.sortField === "tag"
            ? sql`lower(${Event.tag})`
            : input.sortField === "attendance"
              ? attendanceCount
              : Event.start_datetime;
      const sort = input.sortDirection === "desc" ? desc : asc;
      const rows = await db
        .select()
        .from(Event)
        .where(where)
        .orderBy(sort(sortExpression), sort(Event.id))
        .limit(input.view === "calendar" ? 1_000 : input.pageSize)
        .offset(input.view === "calendar" ? 0 : (page - 1) * input.pageSize);
      const eventIds = rows.map((row) => row.id);
      const [metrics, feedbackForms, attendanceRows] = await Promise.all([
        loadEventFeedbackListMetrics(eventIds),
        eventIds.length
          ? db
              .select({
                eventId: EventFeedbackConfig.eventId,
                formId: EventFeedbackConfig.formId,
                formSlug: FormsSchemas.slugName,
              })
              .from(EventFeedbackConfig)
              .innerJoin(
                FormsSchemas,
                eq(FormsSchemas.id, EventFeedbackConfig.formId),
              )
              .where(inArray(EventFeedbackConfig.eventId, eventIds))
          : Promise.resolve([]),
        eventIds.length
          ? db
              .select({
                eventId: HackerEventAttendee.eventId,
                value: count(HackerEventAttendee.id),
              })
              .from(HackerEventAttendee)
              .where(
                and(
                  eq(HackerEventAttendee.hackathonId, input.hackathonId),
                  inArray(HackerEventAttendee.eventId, eventIds),
                  isNull(HackerEventAttendee.voidedAt),
                ),
              )
              .groupBy(HackerEventAttendee.eventId)
          : Promise.resolve([]),
      ]);
      const formsByEvent = new Map(
        feedbackForms.map((form) => [form.eventId, form]),
      );
      const attendanceByEvent = new Map(
        attendanceRows.map((row) => [row.eventId, row.value]),
      );
      return {
        filterOptions: {
          purposes: ["event", "primary_check_in"] as const,
          tags: await db
            .select({ color: EventTag.color, name: EventTag.name })
            .from(EventTag)
            .where(eq(EventTag.hackathonId, input.hackathonId))
            .orderBy(asc(EventTag.name)),
        },
        pagination: {
          page,
          pageCount,
          pageSize: input.pageSize,
          totalCount,
        },
        rows: rows.map((row) => ({
          attendanceCount: attendanceByEvent.get(row.id) ?? 0,
          deletionIntentAt: row.deletionIntentAt,
          description: row.description,
          discord: {
            appliedRevision: row.discordAppliedRevision,
            id: row.discordId,
            lastError: row.discordLastError,
            state: row.discordSyncState,
          },
          endAt: row.end_datetime,
          google: {
            appliedRevision: row.googleAppliedRevision,
            id: row.googleId,
            lastError: row.googleLastError,
            state: row.googleSyncState,
          },
          id: row.id,
          legacy: row.legacy,
          location: row.location,
          name: row.name,
          points: row.points,
          publishedAt: row.publishedAt,
          purpose: row.purpose,
          revision: row.syncRevision,
          startAt: row.start_datetime,
          tag: row.tag,
          tagId: row.tagId,
          tagColor: row.tagColor,
          feedback: metrics.get(row.id) ?? {
            averageOverall: null,
            responseCount: 0,
          },
          feedbackForm: formsByEvent.get(row.id) ?? null,
        })),
      };
    }),

  getEvent: permProcedure
    .input(hackathonEventIdSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      const event = await db.query.Event.findFirst({
        where: and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      return event;
    }),

  listDiscordRepairCandidates: permProcedure
    .input(hackathonEventIdSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const orchestrator = await createHackEventOrchestrator(
        ctx.session,
        input.hackathonId,
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

  resolveDiscordProjection: permProcedure
    .input(hackathonEventDiscordResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const orchestrator = await createHackEventOrchestrator(
        ctx.session,
        input.hackathonId,
      );
      let result;
      const resolutionMode =
        input.mode === "link-existing"
          ? ("link_existing" as const)
          : input.mode === "confirm-create-new"
            ? ("confirm_create_new" as const)
            : ("confirm_no_projection" as const);
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
        if (candidate.request.entityType !== "external") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Hackathon events must link to an external Discord event.",
          });
        }
        await claimHackathonDiscordCandidate(input);
        result = await orchestrator.resolveDiscordProjection(input.eventId, {
          actorId: ctx.session.user.id,
          candidateId: input.candidateId,
          mode: "link_existing",
        });
      } else if (input.mode === "confirm-create-new") {
        await confirmNewHackathonDiscordProjection(input);
        result = await orchestrator.sync(input.eventId, {
          actorId: ctx.session.user.id,
          auditAction: "resolve_discord",
        });
      } else {
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
        result = await orchestrator.resolveDiscordProjection(input.eventId, {
          actorId: ctx.session.user.id,
          candidateSnapshot: candidates,
          mode: "confirm_no_projection",
          phrase: input.confirmation,
        });
      }

      const current = await db.query.Event.findFirst({
        columns: {
          discordId: true,
          discordSyncState: true,
          googleSyncState: true,
          id: true,
          name: true,
        },
        where: and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      });
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const projectionId = current.discordId;
      const projectionType = projectionId ? ("external" as const) : null;
      const auditResult = hackathonDiscordResolutionAuditResult({
        discordSyncState: current.discordSyncState,
        mode: input.mode,
        resultStatus: "status" in result ? result.status : "resolved",
      });
      const providerOutcome = auditResult.providerOutcome;
      await createAdminAuditEvent({
        actionKey: "hackathon_event.discord_projection.resolved",
        actor,
        metadata: {
          mode: resolutionMode,
          projectionId,
          projectionType,
          result: auditResult.result,
        },
        operationId: randomUUID(),
        outcome:
          providerOutcome === "succeeded" ? "committed" : "partial_external",
        subjects: [
          {
            relation: "primary",
            targetId: current.id,
            targetLabel: current.name,
            targetType: "event",
          },
          await hackathonAuditSubject(db, input.hackathonId),
          {
            relation: "result",
            resultOutcome: providerOutcome,
            targetId: "discord",
            targetLabel: "Discord projection",
            targetType: "provider",
          },
        ],
      });
      return result;
    }),

  provisionFeedback: permProcedure
    .input(hackathonEventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const event = await db.query.Event.findFirst({
        columns: { id: true, name: true },
        where: and(
          eq(Event.id, input.eventId),
          eq(Event.hackathonId, input.hackathonId),
        ),
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const result = await (
        await createDbEventFeedbackService(db, {
          includeHackathonEvents: true,
        })
      ).provisionForEvent({ eventId: event.id });
      await createAdminAuditEvent({
        actionKey: "hackathon_event.feedback_form_provisioned",
        actor,
        metadata: {
          formId: "formId" in result ? result.formId : null,
          result: result.status,
        },
        subjects: [
          {
            relation: "primary",
            targetId: event.id,
            targetLabel: event.name,
            targetType: "event",
          },
          await hackathonAuditSubject(db, input.hackathonId),
        ],
      });
      return result;
    }),

  listTags: permProcedure
    .input(hackathonEventScopeSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      return db
        .select({
          active: EventTag.active,
          color: EventTag.color,
          defaultPoints: EventTag.defaultPoints,
          emoji: EventTag.emoji,
          announcementChannelId: EventTag.announcementChannelId,
          id: EventTag.id,
          name: EventTag.name,
        })
        .from(EventTag)
        .where(eq(EventTag.hackathonId, input.hackathonId))
        .orderBy(asc(EventTag.name));
    }),

  previewTagImport: permProcedure
    .input(hackathonEventTagImportSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      return buildTagImportPreview(db, input.hackathonId);
    }),

  importTags: permProcedure
    .input(hackathonEventTagImportSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const operationId = randomUUID();
      return db.transaction(async (tx) => {
        const [lockedTarget] = await tx
          .select({ id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!lockedTarget) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }
        const preview = await buildTagImportPreview(tx, input.hackathonId);
        const imported = [];
        const skipped = preview.tags
          .filter((tag) => tag.status !== "will_import")
          .map((tag) => ({
            normalizedName: tag.normalizedName,
            reason: tag.status,
            targetTagId: tag.targetTagId,
          }));
        for (const candidate of preview.tags) {
          if (candidate.status !== "will_import") continue;
          const [tag] = await tx
            .insert(EventTag)
            .values({
              active: true,
              color: candidate.color.toLocaleLowerCase("en-US"),
              defaultPoints: candidate.defaultPoints,
              hackathonId: input.hackathonId,
              name: candidate.name,
              normalizedName: candidate.normalizedName,
            })
            .onConflictDoNothing()
            .returning();
          if (!tag) {
            skipped.push({
              normalizedName: candidate.normalizedName,
              reason: "already_exists_active",
              targetTagId: null,
            });
            continue;
          }
          imported.push({
            ...tag,
            sourceHackathonId: candidate.sourceHackathon.id,
            sourceTagId: candidate.sourceTagId,
          });
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.tag.created",
              actor,
              metadata: {
                color: tag.color,
                creationSource: "hackathon_import",
                defaultPoints: tag.defaultPoints,
                emoji: tag.emoji,
                announcementChannelId: tag.announcementChannelId,
                name: tag.name,
                operationId,
                sourceHackathonId: candidate.sourceHackathon.id,
                sourceTagId: candidate.sourceTagId,
                targetHackathonId: input.hackathonId,
              },
              subjects: [
                {
                  relation: "primary",
                  targetId: tag.id,
                  targetLabel: tag.name,
                  targetType: "event_tag",
                },
                await hackathonAuditSubject(tx, input.hackathonId),
                {
                  relation: "secondary",
                  targetId: candidate.sourceTagId,
                  targetLabel: candidate.name,
                  targetType: "event_tag",
                },
              ],
            },
            tx,
          );
        }
        return { imported, operationId, skipped };
      });
    }),

  listDiscordEventChannels: permProcedure
    .input(hackathonEventScopeSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventRead(ctx);
      const hackathon = await db.query.Hackathon.findFirst({
        columns: { id: true },
        where: eq(Hackathon.id, input.hackathonId),
      });
      if (!hackathon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hackathon not found.",
        });
      }
      return (await resolveEventGateways(ctx.session)).listDiscordChannels();
    }),

  listAnnouncementChannels: permProcedure.query(async ({ ctx }) => {
    requireHackathonEventEdit(ctx);
    const gateway = await resolveRoleDiscordGateway(ctx.session);
    return (
      gateway.getGuildTextChannels?.({ requireSendPermission: true }) ?? []
    );
  }),

  createTag: permProcedure
    .input(hackathonEventTagCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      await validateEventAnnouncementChannel(
        input.announcementChannelId,
        ctx.session,
      );
      const actor = await captureAdminAuditActor(ctx.session.user);
      const normalized = normalizeTagName(input.name);
      return db
        .transaction(async (tx) => {
          const [tag] = await tx
            .insert(EventTag)
            .values({
              ...input,
              color: input.color.toLocaleLowerCase("en-US"),
              name: normalized.display,
              normalizedName: normalized.key,
            })
            .returning();
          if (!tag) throw new Error("Tag insert did not return a row.");
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.tag.created",
              actor,
              metadata: {
                color: tag.color,
                creationSource: "manual",
                defaultPoints: tag.defaultPoints,
                emoji: tag.emoji,
                announcementChannelId: tag.announcementChannelId,
                name: tag.name,
                targetHackathonId: input.hackathonId,
              },
              subjects: [
                {
                  relation: "primary",
                  targetId: tag.id,
                  targetLabel: tag.name,
                  targetType: "event_tag",
                },
                await hackathonAuditSubject(tx, input.hackathonId),
              ],
            },
            tx,
          );
          return tag;
        })
        .catch(asHackTagWriteConflict);
    }),

  updateTag: permProcedure
    .input(hackathonEventTagUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      await validateEventAnnouncementChannel(
        input.announcementChannelId,
        ctx.session,
      );
      const actor = await captureAdminAuditActor(ctx.session.user);
      const { hackathonId, tagId, ...fields } = input;
      const normalized = fields.name ? normalizeTagName(fields.name) : null;
      const updateFields = {
        ...fields,
        ...(fields.color
          ? { color: fields.color.toLocaleLowerCase("en-US") }
          : {}),
        ...(normalized
          ? { name: normalized.display, normalizedName: normalized.key }
          : {}),
      };
      return db
        .transaction(async (tx) => {
          const [before] = await tx
            .select()
            .from(EventTag)
            .where(
              and(
                eq(EventTag.id, tagId),
                eq(EventTag.hackathonId, hackathonId),
              ),
            )
            .for("update")
            .limit(1);
          if (!before)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tag not found.",
            });
          const [tag] = await tx
            .update(EventTag)
            .set(updateFields)
            .where(
              and(
                eq(EventTag.id, tagId),
                eq(EventTag.hackathonId, hackathonId),
              ),
            )
            .returning();
          if (!tag)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tag not found.",
            });
          await createAdminAuditEvent(
            {
              actionKey: "hackathon_event.tag.updated",
              actor,
              changes: (
                [
                  "name",
                  "color",
                  "defaultPoints",
                  "emoji",
                  "announcementChannelId",
                ] as const
              ).flatMap((field) =>
                before[field] === tag[field]
                  ? []
                  : [{ field, before: before[field], after: tag[field] }],
              ),
              subjects: [
                {
                  relation: "primary",
                  targetId: tag.id,
                  targetLabel: tag.name,
                  targetType: "event_tag",
                },
                await hackathonAuditSubject(tx, hackathonId),
              ],
            },
            tx,
          );
          return tag;
        })
        .catch(asHackTagWriteConflict);
    }),

  archiveTag: permProcedure
    .input(hackathonEventTagArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return db.transaction(async (tx) => {
        const [tag] = await tx
          .update(EventTag)
          .set({ active: false })
          .where(
            and(
              eq(EventTag.id, input.tagId),
              eq(EventTag.hackathonId, input.hackathonId),
              eq(EventTag.active, true),
            ),
          )
          .returning();
        if (!tag)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active tag not found.",
          });
        await createAdminAuditEvent(
          {
            actionKey: "hackathon_event.tag.archived",
            actor,
            changes: [{ field: "active", before: true, after: false }],
            subjects: [
              {
                relation: "primary",
                targetId: tag.id,
                targetLabel: tag.name,
                targetType: "event_tag",
              },
              await hackathonAuditSubject(tx, input.hackathonId),
            ],
          },
          tx,
        );
        return tag;
      });
    }),

  getDiscordConfig: permProcedure
    .input(hackathonEventScopeSchema)
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const config = await db.query.Hackathon.findFirst({
        columns: {
          eventAnnouncementChannelId: true,
          generalHackerDiscordRoleId: true,
          id: true,
        },
        where: eq(Hackathon.id, input.hackathonId),
      });
      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Hackathon not found.",
        });
      }
      return config;
    }),

  updateDiscordConfig: permProcedure
    .input(hackathonEventDiscordConfigSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const discord = await resolveRoleDiscordGateway(ctx.session);
      if (
        input.eventAnnouncementChannelId &&
        (!discord.validateTextChannel ||
          !(await discord.validateTextChannel(
            input.eventAnnouncementChannelId,
          )))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Choose a text or announcement channel in this Discord server.",
        });
      }
      if (input.generalHackerDiscordRoleId) {
        const roles = await discord.getGuildRoles();
        if (!roles.available) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Discord roles are temporarily unavailable. Try again.",
          });
        }
        if (
          !roles.roles.some(({ id }) => id === input.generalHackerDiscordRoleId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a role in this Discord server.",
          });
        }
      }
      const actor = await captureAdminAuditActor(ctx.session.user);
      const updated = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`blade:hackathon-allocation:${input.hackathonId}`}, 0))`,
        );
        const [before] = await tx
          .select({
            eventAnnouncementChannelId: Hackathon.eventAnnouncementChannelId,
            generalHackerDiscordRoleId: Hackathon.generalHackerDiscordRoleId,
          })
          .from(Hackathon)
          .where(eq(Hackathon.id, input.hackathonId))
          .for("update")
          .limit(1);
        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }
        const [row] = await tx
          .update(Hackathon)
          .set({
            eventAnnouncementChannelId: input.eventAnnouncementChannelId,
            generalHackerDiscordRoleId: input.generalHackerDiscordRoleId,
          })
          .where(eq(Hackathon.id, input.hackathonId))
          .returning({
            eventAnnouncementChannelId: Hackathon.eventAnnouncementChannelId,
            generalHackerDiscordRoleId: Hackathon.generalHackerDiscordRoleId,
            id: Hackathon.id,
          });
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "hackathon.updated",
            actor,
            changes: [
              {
                after: row.eventAnnouncementChannelId,
                before: before.eventAnnouncementChannelId,
                field: "eventAnnouncementChannelId",
              },
              {
                after: row.generalHackerDiscordRoleId,
                before: before.generalHackerDiscordRoleId,
                field: "generalHackerDiscordRoleId",
              },
            ].filter(({ after, before }) => after !== before),
            subjects: [
              {
                relation: "primary",
                targetId: row.id,
                targetLabel: "Hackathon Discord configuration",
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
        return row;
      });
      return updated;
    }),

  /** UUID/title-only choices for the isolated operator surface. */
  listCheckInEvents: permProcedure
    .input(hackathonEventScopeSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const [eventRows, classes, config] = await Promise.all([
        db
          .select({
            id: Event.id,
            purpose: Event.purpose,
            deletionIntentAt: Event.deletionIntentAt,
            endDateTime: Event.end_datetime,
            name: Event.name,
            points: Event.points,
            startDateTime: Event.start_datetime,
          })
          .from(Event)
          .where(
            and(
              eq(Event.hackathonId, input.hackathonId),
              isNull(Event.deletionIntentAt),
            ),
          )
          .orderBy(desc(Event.start_datetime), asc(Event.id)),
        db
          .select({
            color: HackathonClass.color,
            id: HackathonClass.id,
            kind: HackathonClass.kind,
            name: HackathonClass.name,
          })
          .from(HackathonClass)
          .where(
            and(
              eq(HackathonClass.hackathonId, input.hackathonId),
              eq(HackathonClass.kind, "class"),
            ),
          )
          .orderBy(asc(HackathonClass.name), asc(HackathonClass.id)),
        db.query.Hackathon.findFirst({
          columns: { generalHackerDiscordRoleId: true },
          where: eq(Hackathon.id, input.hackathonId),
        }),
      ]);
      const configReady =
        Boolean(config?.generalHackerDiscordRoleId) && classes.length > 0;
      return {
        classes,
        configReady,
        events: eventRows.map(({ deletionIntentAt, ...event }) => ({
          ...event,
          ready: !deletionIntentAt,
        })),
      };
    }),

  searchCheckInHackers: permProcedure
    .input(hackathonEventCheckInSearchSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const term = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
      return db
        .select({
          attendeeId: HackerAttendee.id,
          classId: HackerAttendee.classId,
          email: User.email,
          firstName: Hacker.firstName,
          isVip: HackerAttendee.isVip,
          lastName: Hacker.lastName,
          status: HackerAttendee.status,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .innerJoin(User, eq(User.id, Hacker.userId))
        .where(
          and(
            eq(HackerAttendee.hackathonId, input.hackathonId),
            or(
              ilike(Hacker.firstName, term),
              ilike(Hacker.lastName, term),
              ilike(User.email, term),
              ilike(
                sql<string>`concat(${Hacker.firstName}, ' ', ${Hacker.lastName})`,
                term,
              ),
            ),
          ),
        )
        .orderBy(
          asc(Hacker.firstName),
          asc(Hacker.lastName),
          asc(HackerAttendee.id),
        )
        .limit(input.limit)
        .then((rows) =>
          rows.map(({ firstName, lastName, ...row }) => ({
            ...row,
            name: `${firstName} ${lastName}`.trim(),
          })),
        );
    }),

  checkInHacker: permProcedure
    .input(hackathonEventCheckInSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const committed = await performHackathonEventCheckIn({ actor, input });
      let roleHealth:
        | Awaited<ReturnType<typeof loadHackathonRoleGrantHealth>>
        | { grants: []; state: "error" | "not_applicable" } = {
        grants: [],
        state: committed.hackerAttendeeId ? "error" : "not_applicable",
      };
      if (committed.hackerAttendeeId) {
        roleHealth = await loadHackathonRoleGrantHealth(
          committed.hackerAttendeeId,
          input.hackathonId,
        ).catch(() => ({ grants: [], state: "error" as const }));
      }
      if (
        committed.result.status === "checked_in" &&
        committed.discordUserId &&
        committed.hackerAttendeeId
      ) {
        try {
          await deliverHackathonRoleGrants({
            actorId: ctx.session.user.id,
            attemptId: committed.attemptId,
            gateway: await resolveRoleDiscordGateway(ctx.session),
            hackathonId: input.hackathonId,
          });
          roleHealth = await loadHackathonRoleGrantHealth(
            committed.hackerAttendeeId,
            input.hackathonId,
          );
        } catch {
          roleHealth = { grants: [], state: "error" };
        }
      }
      const presentation = await db.query.HackerCheckInAttempt.findFirst({
        columns: {
          attemptedAt: true,
          eventNameSnapshot: true,
          eventPurpose: true,
          operatorDisplayNameSnapshot: true,
        },
        where: and(
          eq(HackerCheckInAttempt.id, committed.attemptId),
          eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
        ),
      }).catch(() => null);
      return {
        attemptId: committed.attemptId,
        ...committed.result,
        checkedInAt:
          "checkedInAt" in committed.result
            ? committed.result.checkedInAt
            : presentation?.attemptedAt,
        eventName: presentation?.eventNameSnapshot,
        eventPurpose: presentation?.eventPurpose,
        operatorName: presentation?.operatorDisplayNameSnapshot,
        roleDelivery: {
          ...roleHealth,
          needsAttention:
            roleHealth.state === "error" || roleHealth.state === "pending",
        },
      };
    }),

  listCheckInHistory: permProcedure
    .input(hackathonCheckInHistorySchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const cursor = input.cursor
        ? await db.query.HackerCheckInAttempt.findFirst({
            columns: { attemptedAt: true, id: true },
            where: and(
              eq(HackerCheckInAttempt.id, input.cursor),
              eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
            ),
          })
        : null;
      const rows = await db
        .select({
          attemptedAt: HackerCheckInAttempt.attemptedAt,
          classColor: HackerCheckInAttempt.classColorSnapshot,
          className: HackerCheckInAttempt.classNameSnapshot,
          eventId: HackerCheckInAttempt.eventId,
          eventName: HackerCheckInAttempt.eventNameSnapshot,
          eventPurpose: HackerCheckInAttempt.eventPurpose,
          hackerName: HackerCheckInAttempt.hackerNameSnapshot,
          attemptId: HackerCheckInAttempt.id,
          isRepeatOccurrence: HackerCheckInAttempt.isRepeatOccurrence,
          isVip: HackerCheckInAttempt.isVipSnapshot,
          operatorName: HackerCheckInAttempt.operatorDisplayNameSnapshot,
          outcome: HackerCheckInAttempt.outcome,
          pointsAwarded: HackerCheckInAttempt.pointsAwarded,
          wasMinorAtAttempt: HackerCheckInAttempt.wasMinorAtAttempt,
          checkedInAt: HackerCheckInAttempt.attemptedAt,
        })
        .from(HackerCheckInAttempt)
        .where(
          and(
            eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
            input.eventId
              ? eq(HackerCheckInAttempt.eventId, input.eventId)
              : undefined,
            cursor
              ? or(
                  lt(HackerCheckInAttempt.attemptedAt, cursor.attemptedAt),
                  and(
                    eq(HackerCheckInAttempt.attemptedAt, cursor.attemptedAt),
                    lt(HackerCheckInAttempt.id, cursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          desc(HackerCheckInAttempt.attemptedAt),
          desc(HackerCheckInAttempt.id),
        )
        .limit(input.limit);
      return {
        nextCursor:
          rows.length === input.limit ? rows.at(-1)?.attemptId : undefined,
        rows,
      };
    }),

  getCheckInAttempt: permProcedure
    .input(hackathonCheckInAttemptSchema)
    .query(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const [attempt] = await db
        .select({
          attemptedAt: HackerCheckInAttempt.attemptedAt,
          classColor: HackerCheckInAttempt.classColorSnapshot,
          className: HackerCheckInAttempt.classNameSnapshot,
          dob: Hacker.dob,
          eventId: HackerCheckInAttempt.eventId,
          eventName: HackerCheckInAttempt.eventNameSnapshot,
          eventPurpose: HackerCheckInAttempt.eventPurpose,
          hackerAttendeeId: HackerCheckInAttempt.hackerAttendeeId,
          hackerName: HackerCheckInAttempt.hackerNameSnapshot,
          id: HackerCheckInAttempt.id,
          isFirstTime: sql<
            boolean | null
          >`coalesce(${HackerAttendee.isFirstTime}, ${Hacker.isFirstTime})`,
          isRepeatOccurrence: HackerCheckInAttempt.isRepeatOccurrence,
          isVip: HackerCheckInAttempt.isVipSnapshot,
          operatorName: HackerCheckInAttempt.operatorDisplayNameSnapshot,
          outcome: HackerCheckInAttempt.outcome,
          pointsAwarded: HackerCheckInAttempt.pointsAwarded,
          wasMinor: HackerCheckInAttempt.wasMinorAtAttempt,
        })
        .from(HackerCheckInAttempt)
        .leftJoin(
          HackerAttendee,
          and(
            eq(HackerAttendee.id, HackerCheckInAttempt.hackerAttendeeId),
            eq(HackerAttendee.hackathonId, HackerCheckInAttempt.hackathonId),
          ),
        )
        .leftJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(HackerCheckInAttempt.id, input.attemptId),
            eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
          ),
        )
        .limit(1);
      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attempt not found.",
        });
      }
      const roleHealth = attempt.hackerAttendeeId
        ? await loadHackathonRoleGrantHealth(
            attempt.hackerAttendeeId,
            input.hackathonId,
          )
        : { grants: [], state: "not_applicable" as const };
      return {
        ...attempt,
        checkedInAt: attempt.attemptedAt,
        class:
          attempt.className && attempt.classColor
            ? { color: attempt.classColor, name: attempt.className }
            : null,
        dateOfBirth: attempt.dob,
        firstTimeStatus: firstTimeStatus(attempt.isFirstTime),
        roleDelivery: {
          ...roleHealth,
          needsAttention:
            roleHealth.state === "error" || roleHealth.state === "pending",
        },
        wasMinorAtAttempt: attempt.wasMinor,
      };
    }),

  retryDiscordRoles: permProcedure
    .input(hackathonRoleRepairSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventCheckIn(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      const result = await deliverHackathonRoleGrants({
        actorId: ctx.session.user.id,
        attemptId: input.attemptId,
        gateway: await resolveRoleDiscordGateway(ctx.session),
        hackathonId: input.hackathonId,
      });
      if (result.grants.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No role delivery was found for that check-in.",
        });
      }
      const [auditTarget] = await db
        .select({
          attendeeId: HackerAttendee.id,
          eventId: HackerCheckInAttempt.eventId,
          eventName: HackerCheckInAttempt.eventNameSnapshot,
          firstName: Hacker.firstName,
          hackathonName: Hackathon.displayName,
          lastName: Hacker.lastName,
        })
        .from(HackerCheckInAttempt)
        .innerJoin(
          HackerAttendee,
          and(
            eq(HackerAttendee.id, HackerCheckInAttempt.hackerAttendeeId),
            eq(HackerAttendee.hackathonId, HackerCheckInAttempt.hackathonId),
          ),
        )
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .innerJoin(
          Hackathon,
          eq(Hackathon.id, HackerCheckInAttempt.hackathonId),
        )
        .where(
          and(
            eq(HackerCheckInAttempt.id, input.attemptId),
            eq(HackerCheckInAttempt.hackathonId, input.hackathonId),
          ),
        )
        .limit(1);
      if (!auditTarget) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Check-in attempt not found.",
        });
      }
      const hackerName =
        `${auditTarget.firstName} ${auditTarget.lastName}`.trim();
      await createAdminAuditEvent({
        actionKey: "hackathon_event.roles_retried",
        actor,
        metadata: {
          failedCount: result.failedCount,
          grantCount: result.grants.length,
          succeededCount: result.succeededCount,
        },
        outcome: result.failedCount > 0 ? "partial_external" : "committed",
        subjects: [
          {
            relation: "primary",
            targetId: auditTarget.attendeeId,
            targetLabel: hackerName,
            targetType: "hacker_attendee",
          },
          {
            relation: "secondary",
            targetId: input.attemptId,
            targetLabel: `Check-in attempt for ${hackerName}`,
            targetType: "check_in_attempt",
          },
          {
            relation: "secondary",
            targetId: auditTarget.eventId,
            targetLabel: auditTarget.eventName,
            targetType: "event",
          },
          {
            relation: "secondary",
            targetId: input.hackathonId,
            targetLabel: auditTarget.hackathonName,
            targetType: "hackathon",
          },
        ],
      });
      return {
        attemptId: input.attemptId,
        roleDelivery: {
          grants: result.grants,
          needsAttention: result.failedCount > 0,
        },
      };
    }),

  /** Attendance read embedded in the permission-gated hacker detail panel. */
  listHackerEventAttendance: permProcedure
    .input(hackerAttendanceInput)
    .query(async ({ ctx, input }) => {
      requireHackerRead(ctx);
      const attendee = await db.query.HackerAttendee.findFirst({
        columns: { id: true },
        where: and(
          eq(HackerAttendee.id, input.attendeeId),
          eq(HackerAttendee.hackathonId, input.hackathonId),
        ),
      });
      if (!attendee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Applicant not found.",
        });
      }
      const rows = await db
        .select({
          attendanceId: HackerEventAttendee.id,
          checkedInAt: HackerEventAttendee.checkedInAt,
          eventId: Event.id,
          eventName: Event.name,
          isInitialAttendance: HackerEventAttendee.isInitialAttendance,
          isLegacy: Event.legacy,
          operatorName: User.name,
          pointsAwarded: HackerEventAttendee.pointsAwarded,
          purpose: Event.purpose,
          voidedAt: HackerEventAttendee.voidedAt,
        })
        .from(HackerEventAttendee)
        .innerJoin(
          Event,
          and(
            eq(Event.id, HackerEventAttendee.eventId),
            eq(Event.hackathonId, HackerEventAttendee.hackathonId),
          ),
        )
        .leftJoin(User, eq(User.id, HackerEventAttendee.checkedInBy))
        .where(
          and(
            eq(HackerEventAttendee.hackerAttId, input.attendeeId),
            eq(HackerEventAttendee.hackathonId, input.hackathonId),
            input.cursor ? lt(HackerEventAttendee.id, input.cursor) : undefined,
          ),
        )
        .orderBy(
          desc(HackerEventAttendee.checkedInAt),
          desc(HackerEventAttendee.id),
        )
        .limit(input.limit);
      return {
        nextCursor:
          rows.length === input.limit ? rows.at(-1)?.attendanceId : undefined,
        rows,
      };
    }),

  voidAttendance: permProcedure
    .input(hackathonAttendanceCorrectionSchema)
    .mutation(async ({ ctx, input }) => {
      requireHackathonEventEdit(ctx);
      const actor = await captureAdminAuditActor(ctx.session.user);
      return correctHackathonEventAttendance({
        attendanceId: input.attendanceId,
        hackathonId: input.hackathonId,
        operator: actor,
        reason: input.reason,
      });
    }),
} satisfies TRPCRouterRecord;

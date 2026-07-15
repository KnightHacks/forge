import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, inArray, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import {
  Event,
  EventAttendee,
  EventFeedbackConfig,
  EventTag,
  FormResponse,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";
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
  formDefinitionSchema,
  validateFormAnswers,
} from "@forge/validators";

import type { EventGatewayBundle } from "../utils/events/gateway-resolver";
import type { EventWorkflowRecord } from "../utils/events/orchestration";
import { permProcedure, protectedProcedure, publicProcedure } from "../trpc";
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
  feedbackDefinition,
  getGlobalFeedbackTemplate,
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
  loadClubEventDiscoveryRecord,
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
const eventFeedbackAnswersSchema = z
  .object({
    customAnswers: z.record(z.string().uuid(), z.unknown()).default({}),
    discovery: z.string().trim().min(1).max(100),
    discoveryOther: z
      .string()
      .max(500)
      .refine((value) => value.trim().length > 0, {
        message: "Other discovery details are required.",
      })
      .optional(),
    fun: z.number().int().min(1).max(5),
    improve: z.string().trim().max(2_000).optional(),
    learning: z.number().int().min(1).max(5),
    overall: z.number().int().min(1).max(5),
    worked: z.string().trim().max(2_000).optional(),
  })
  .strict();
const eventFeedbackSubmitSchema = z
  .object({
    answers: eventFeedbackAnswersSchema,
    formId: z.string().uuid(),
  })
  .strict();
const eventFeedbackAnalyticsSchema = eventIdSchema.extend({
  excludedResponseIds: z.array(z.string().uuid()).max(100).default([]),
});
const eventSpecificFeedbackQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().uuid(),
    maxLength: z.number().int().positive().max(10_000),
    prompt: z.string().trim().min(1).max(500),
    required: z.boolean(),
    retired: z.literal(false),
    type: z.literal("paragraph"),
  }),
  z.object({
    id: z.string().uuid(),
    max: z.number().int().max(10),
    min: z.number().int().min(0),
    prompt: z.string().trim().min(1).max(500),
    required: z.boolean(),
    retired: z.literal(false),
    type: z.literal("linear_scale"),
  }),
]);

async function assertClubEventId(eventId: string) {
  const event = await db.query.Event.findFirst({
    columns: { id: true },
    where: and(eq(Event.id, eventId), isNull(Event.hackathonId)),
  });
  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }
}

function eventFeedbackDefinitionLockKey(eventId: string) {
  return `blade:event-feedback-definition:${eventId}`;
}

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
          { member, now },
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

  /** Returns feedback opportunities only for the signed-in checked-in member. */
  listMyFeedback: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      columns: { id: true },
      where: eq(Member.userId, ctx.session.user.id),
    });
    if (!member) return [];
    return (await createDbEventFeedbackService()).listMemberOpportunities({
      memberId: member.id,
    });
  }),

  /** Awards the event-feedback reward atomically with the first response. */
  submitFeedback: protectedProcedure
    .input(eventFeedbackSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await db.query.Member.findFirst({
        columns: { id: true },
        where: eq(Member.userId, ctx.session.user.id),
      });
      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found.",
        });
      }
      return db.transaction(async (tx) => {
        const config = await tx.query.EventFeedbackConfig.findFirst({
          columns: { eventId: true },
          where: eq(EventFeedbackConfig.formId, input.formId),
        });
        if (!config) throw new TRPCError({ code: "NOT_FOUND" });
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${eventFeedbackDefinitionLockKey(config.eventId)}, 0))`,
        );
        const form = await tx.query.FormsSchemas.findFirst({
          where: eq(FormsSchemas.id, input.formId),
        });
        if (form?.kind !== "event_feedback") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const definition = formDefinitionSchema.parse(form.formData);
        const customQuestions = definition.questions.filter(
          ({ id }) =>
            !feedbackDefinition.questions.some((core) => core.id === id),
        );
        const customAnswers = validateFormAnswers(
          {
            description: "",
            instructions: [],
            questions: customQuestions,
            title: "Event-specific feedback",
          },
          Object.entries(input.answers.customAnswers).map(
            ([questionId, value]) => ({ questionId, value }),
          ),
        );
        return (await createDbEventFeedbackService(tx)).submit({
          answers: { ...input.answers, customAnswers },
          formId: input.formId,
          memberId: member.id,
        });
      });
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
      const rows = await loadMinimalAttendees(input.eventId);
      return serializeAttendanceCsv(
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
    }),

  /** Returns deterministic event feedback metrics with a strict raw-data split. */
  getEventFeedback: permProcedure
    .input(eventFeedbackAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      await assertClubEventId(input.eventId);
      const canReadResponses =
        ctx.session.permissions.IS_OFFICER === true ||
        ctx.session.permissions.READ_FORM_RESPONSES === true;
      const service = await createDbEventFeedbackService();
      if (!canReadResponses) {
        return service.getAnalytics({
          access: "aggregate",
          eventId: input.eventId,
        });
      }
      const analytics = await service.getAnalytics({
        access: "responses",
        eventId: input.eventId,
        excludedResponseIds: input.excludedResponseIds,
      });
      const memberIds = analytics.responses.map(({ memberId }) => memberId);
      const members =
        memberIds.length === 0
          ? []
          : await db
              .select({
                firstName: Member.firstName,
                id: Member.id,
                lastName: Member.lastName,
              })
              .from(Member)
              .where(inArray(Member.id, memberIds));
      const names = new Map(
        members.map((member) => [
          member.id,
          `${member.firstName} ${member.lastName}`,
        ]),
      );
      return {
        ...analytics,
        responses: analytics.responses.map((response) => ({
          ...response,
          memberName: names.get(response.memberId) ?? response.memberId,
        })),
      };
    }),

  getFeedbackTemplate: permProcedure.query(async ({ ctx }) => {
    if (!ctx.session.permissions.IS_OFFICER) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const template = await getGlobalFeedbackTemplate();
    return {
      definition: formDefinitionSchema.parse(template.formData),
      revision: template.revision,
    };
  }),

  updateFeedbackTemplate: permProcedure
    .input(
      z.object({
        definition: formDefinitionSchema,
        expectedRevision: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.permissions.IS_OFFICER) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const template = await getGlobalFeedbackTemplate();
      const core = input.definition.questions.slice(
        0,
        feedbackDefinition.questions.length,
      );
      if (
        JSON.stringify(core) !== JSON.stringify(feedbackDefinition.questions)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Core comparable feedback questions are locked.",
        });
      }
      const [saved] = await db
        .update(FormsSchemas)
        .set({
          formData: input.definition,
          revision: sql`${FormsSchemas.revision} + 1`,
        })
        .where(
          and(
            eq(FormsSchemas.id, template.id),
            eq(FormsSchemas.revision, input.expectedRevision),
          ),
        )
        .returning({ revision: FormsSchemas.revision });
      if (!saved) throw new TRPCError({ code: "CONFLICT" });
      return saved;
    }),

  addEventFeedbackQuestion: permProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        question: eventSpecificFeedbackQuestionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      await assertClubEventId(input.eventId);
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${eventFeedbackDefinitionLockKey(input.eventId)}, 0))`,
        );
        const [config] = await tx
          .select()
          .from(EventFeedbackConfig)
          .where(eq(EventFeedbackConfig.eventId, input.eventId))
          .for("update");
        if (!config) throw new TRPCError({ code: "NOT_FOUND" });
        const response = await tx.query.FormResponse.findFirst({
          columns: { id: true },
          where: eq(FormResponse.form, config.formId),
        });
        if (response) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Event questions lock after the first feedback response.",
          });
        }
        const [form] = await tx
          .select()
          .from(FormsSchemas)
          .where(eq(FormsSchemas.id, config.formId))
          .for("update");
        if (!form) throw new TRPCError({ code: "NOT_FOUND" });
        const definition = formDefinitionSchema.parse(form.formData);
        if (definition.questions.some(({ id }) => id === input.question.id)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Question ID already exists.",
          });
        }
        const nextDefinition = formDefinitionSchema.parse({
          ...definition,
          questions: [...definition.questions, input.question],
        });
        const currentCustomQuestions = z
          .array(eventSpecificFeedbackQuestionSchema)
          .catch([])
          .parse(config.customQuestions);
        const [savedConfig] = await tx
          .update(EventFeedbackConfig)
          .set({
            customQuestions: [...currentCustomQuestions, input.question],
          })
          .where(eq(EventFeedbackConfig.id, config.id))
          .returning({ id: EventFeedbackConfig.id });
        const [savedForm] = await tx
          .update(FormsSchemas)
          .set({
            formData: nextDefinition,
            revision: sql`${FormsSchemas.revision} + 1`,
          })
          .where(
            and(
              eq(FormsSchemas.id, form.id),
              eq(FormsSchemas.revision, form.revision),
            ),
          )
          .returning({ id: FormsSchemas.id });
        if (!savedConfig || !savedForm) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Event feedback changed while saving the question.",
          });
        }
      });
      return { status: "saved" as const };
    }),

  /** Exports all feedback rows; local analytics exclusions never affect CSV. */
  exportEventFeedback: permProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      requireEventRead(ctx);
      if (
        !ctx.session.permissions.IS_OFFICER &&
        !ctx.session.permissions.READ_FORM_RESPONSES
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await assertClubEventId(input.eventId);
      return (await createDbEventFeedbackService()).exportCsv({
        access: "responses",
        eventId: input.eventId,
      });
    }),

  /** Deletes feedback answers while deliberately preserving reward history. */
  deleteEventFeedbackResponse: permProcedure
    .input(z.object({ responseId: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      if (
        !ctx.session.permissions.IS_OFFICER &&
        !ctx.session.permissions.READ_FORM_RESPONSES
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return (await createDbEventFeedbackService()).deleteResponse(input);
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
      const snapshot = await dbTagService().resolveActiveSnapshot({
        pointsOverride: input.pointsOverride ?? null,
        tagId: input.tagId,
      });
      assertEventProviderPayloadLimits({
        description: input.description,
        location: input.location,
        name: input.name,
        points: snapshot.points,
        tag: snapshot.tag,
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
        points: snapshot.points,
        publishedAt: null,
        revision: 1,
        roleIds,
        startAt: new Date(input.start),
        synchronizedVisibility: null,
        tag: snapshot.tag,
        tagColor: snapshot.color,
      };
      const channelTypes = new Map<string, "stage" | "voice">();
      if (event.discordChannel) {
        channelTypes.set(event.discordChannel.id, event.discordChannel.type);
      }
      return (
        await createOrchestrator(ctx.session, channelTypes, {
          pointsOverride: input.pointsOverride ?? null,
          roleIds,
          tagId: input.tagId,
        })
      ).create(event, {
        actorId: ctx.session.user.id,
        payloadHash,
      });
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
          return { changed: false, row: existing };
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
        return { changed: true, row: saved };
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
        return { eventId: updated.row.id, status: "legacy_updated" as const };
      }
      return orchestrator.sync(updated.row.id, {
        actorId: ctx.session.user.id,
        auditAction: "update",
      });
    }),

  /** Resumes synchronization for a recoverable Club event. */
  retrySync: permProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      return (
        await createOrchestrator(
          ctx.session,
          await channelTypesForEvent(input.eventId, gateways),
        )
      ).sync(input.eventId, {
        actorId: ctx.session.user.id,
        auditAction: "repair",
      });
    }),

  /** Reapplies current Blade state to selected provider projections. */
  repairIntegration: permProcedure
    .input(eventRepairInput)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      return (
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
        return orchestrator.resolveDiscordProjection(input.eventId, {
          actorId: ctx.session.user.id,
          candidateId: input.candidateId,
          mode: "link_existing",
        });
      }
      if (input.mode === "confirm-create-new") {
        await confirmNewDiscordProjection(input.eventId);
        return orchestrator.sync(input.eventId, {
          actorId: ctx.session.user.id,
          auditAction: "resolve_discord",
        });
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
      return orchestrator.resolveDiscordProjection(input.eventId, {
        actorId: ctx.session.user.id,
        candidateSnapshot: candidates,
        mode: "confirm_no_projection",
        phrase: input.confirmation,
      });
    }),

  /** Starts recoverable provider cleanup for an attendance-free Club event. */
  deleteEvent: permProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      return (await createOrchestrator(ctx.session)).delete(input.eventId, {
        actorId: ctx.session.user.id,
      });
    }),

  /** Creates a configurable Club event tag template. */
  createTag: permProcedure
    .input(eventTagCreateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      return dbTagService(gateways.audit.tag).create({
        ...input,
        actorId: ctx.session.user.id,
      });
    }),

  /** Updates a Club event tag template without rewriting event snapshots. */
  updateTag: permProcedure
    .input(eventTagUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      return dbTagService(gateways.audit.tag).update({
        ...input,
        actorId: ctx.session.user.id,
      });
    }),

  /** Archives a tag after its locked active-state recheck. */
  archiveTag: permProcedure
    .input(eventTagArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const gateways = await resolveEventGateways(ctx.session);
      return dbTagService(gateways.audit.tag).archive({
        actorId: ctx.session.user.id,
        tagId: input.tagId,
      });
    }),

  /** Removes one attendance record and reverses its captured point award. */
  removeAttendance: permProcedure
    .input(eventAttendanceRemovalSchema)
    .mutation(async ({ ctx, input }) => {
      requireEventEdit(ctx);
      const attendance = await db.query.EventAttendee.findFirst({
        where: eq(EventAttendee.id, input.attendanceId),
      });
      if (!attendance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance not found.",
        });
      }
      await assertClubEventId(attendance.eventId);
      const gateways = await resolveEventGateways(ctx.session);
      return createAttendanceService({
        audit: gateways.audit.attendance,
        clock: () => new Date(),
        state: createDbAttendanceState(),
      }).removeAttendance({ ...input, actorId: ctx.session.user.id });
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
      return "memberId" in input
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
    }),
} satisfies TRPCRouterRecord;

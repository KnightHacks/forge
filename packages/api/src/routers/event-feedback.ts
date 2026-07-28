import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventFeedbackConfig,
  FormResponse,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  eventIdSchema,
  formDefinitionSchema,
  validateFormAnswers,
} from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { requireEventEdit, requireEventRead } from "../utils/events/access";
import {
  createDbEventFeedbackService,
  feedbackDefinition,
  getGlobalFeedbackTemplate,
} from "../utils/events/database-feedback";
import {
  assertClubEventId,
  loadEventAuditSnapshot,
} from "../utils/events/queries";

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

function eventFeedbackDefinitionLockKey(eventId: string) {
  return `blade:event-feedback-definition:${eventId}`;
}

/**
 * Event feedback procedures, spread into `eventRouter` rather than mounted as
 * their own namespace: every client path stays `api.event.*`, so splitting the
 * file changes no contract and no call site.
 */
export const eventFeedbackProcedures = {
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
      return db.transaction(async (tx) => {
        const template = await getGlobalFeedbackTemplate(tx);
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
        const [saved] = await tx
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
        await createAdminAuditEvent(
          {
            actionKey: "event.feedback_template.updated",
            actor: ctx.session.user,
            metadata: {
              questionIds: input.definition.questions.map(({ id }) => id),
              questionTypes: input.definition.questions.map(({ type }) => type),
              revisionAfter: saved.revision,
              revisionBefore: input.expectedRevision,
            },
            subjects: [
              {
                relation: "primary",
                targetId: template.id,
                targetLabel: "Global event feedback template",
                targetType: "feedback_template",
              },
            ],
          },
          tx,
        );
        return saved;
      });
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
        const event = await tx.query.Event.findFirst({
          columns: { id: true, name: true },
          where: eq(Event.id, input.eventId),
        });
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });
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
          .returning({
            id: FormsSchemas.id,
            revision: FormsSchemas.revision,
          });
        if (!savedConfig || !savedForm) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Event feedback changed while saving the question.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "event.feedback_question.added",
            actor: ctx.session.user,
            metadata: {
              questionId: input.question.id,
              questionType: input.question.type,
              revisionAfter: savedForm.revision,
              revisionBefore: form.revision,
            },
            subjects: [
              {
                relation: "primary",
                targetId: event.id,
                targetLabel: event.name,
                targetType: "event",
              },
              {
                relation: "secondary",
                targetId: input.question.id,
                targetLabel: `${input.question.type} feedback question`,
                targetType: "feedback_question",
              },
            ],
          },
          tx,
        );
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
      const [content, event] = await Promise.all([
        (await createDbEventFeedbackService()).exportCsv({
          access: "responses",
          eventId: input.eventId,
        }),
        loadEventAuditSnapshot(input.eventId),
      ]);
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      const lines = content.length === 0 ? [] : content.split("\n");
      await createAdminAuditEvent({
        actionKey: "event.feedback.exported",
        actor: ctx.session.user,
        metadata: {
          rowCount: Math.max(0, lines.length - 1),
        },
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
      const [response] = await db
        .select({
          eventId: EventFeedbackConfig.eventId,
          eventName: Event.name,
          memberFirstName: Member.firstName,
          memberId: Member.id,
          memberLastName: Member.lastName,
          responseId: FormResponse.id,
        })
        .from(FormResponse)
        .innerJoin(
          EventFeedbackConfig,
          eq(FormResponse.form, EventFeedbackConfig.formId),
        )
        .innerJoin(Event, eq(Event.id, EventFeedbackConfig.eventId))
        .innerJoin(Member, eq(Member.userId, FormResponse.userId))
        .where(eq(FormResponse.id, input.responseId));
      const result = await (
        await createDbEventFeedbackService()
      ).deleteResponse(input);
      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback response not found.",
        });
      }
      await createAdminAuditEvent({
        actionKey: "event.feedback_response.deleted",
        actor: ctx.session.user,
        metadata: { rewardHistoryPreserved: true },
        subjects: [
          {
            memberId: response.memberId,
            relation: "primary",
            targetId: response.responseId,
            targetLabel: `Feedback response for ${response.eventName}`,
            targetType: "form_response",
          },
          {
            relation: "secondary",
            targetId: response.eventId,
            targetLabel: response.eventName,
            targetType: "event",
          },
          {
            memberId: response.memberId,
            relation: "secondary",
            targetId: response.memberId,
            targetLabel:
              `${response.memberFirstName} ${response.memberLastName}`.trim(),
            targetType: "member",
          },
        ],
      });
      return result;
    }),
} satisfies TRPCRouterRecord;

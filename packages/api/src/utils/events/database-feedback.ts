import { AsyncLocalStorage } from "node:async_hooks";

import { and, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import {
  Event,
  EventAttendee,
  EventFeedbackConfig,
  EventFeedbackReward,
  FormResponse,
  FormSections,
  FormSingleResponseClaim,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import { createEventFeedbackService } from "./feedback";

const FEEDBACK_SECTION_ID = "15fd674e-16e4-4f41-a2c9-b0d337f39ea1";
export const GLOBAL_FEEDBACK_TEMPLATE_FORM_ID =
  "e6fca1f7-47c1-4ff4-a862-beb8d1f68e9e";

interface StoredFeedbackAnswers {
  customAnswers?: Record<string, unknown>;
  discovery: string;
  discoveryOther?: string;
  fun: number;
  improve?: string;
  learning: number;
  overall: number;
  worked?: string;
}

export const feedbackDefinition = {
  description: "Tell us what worked and how we can improve future events.",
  instructions: [],
  questions: [
    {
      id: "f0a00000-0000-4000-8000-000000000001",
      prompt: "Overall",
      required: true,
      retired: false,
      type: "linear_scale",
      min: 1,
      max: 5,
    },
    {
      id: "f0a00000-0000-4000-8000-000000000002",
      prompt: "Fun",
      required: true,
      retired: false,
      type: "linear_scale",
      min: 1,
      max: 5,
    },
    {
      id: "f0a00000-0000-4000-8000-000000000003",
      prompt: "Learning",
      required: true,
      retired: false,
      type: "linear_scale",
      min: 1,
      max: 5,
    },
    {
      id: "f0a00000-0000-4000-8000-000000000004",
      prompt: "What worked?",
      required: false,
      retired: false,
      type: "paragraph",
      maxLength: 2_000,
    },
    {
      id: "f0a00000-0000-4000-8000-000000000005",
      prompt: "What should improve?",
      required: false,
      retired: false,
      type: "paragraph",
      maxLength: 2_000,
    },
    {
      id: "f0a00000-0000-4000-8000-000000000006",
      prompt: "How did you hear about this event?",
      required: true,
      retired: false,
      type: "multiple_choice",
      optionSource: "preset",
      presetCatalogId: "EVENT_FEEDBACK_HEARD",
      manualOptions: [],
      allowOther: true,
    },
  ],
  title: "Event feedback",
} as const;

export const CORE_FEEDBACK_QUESTION_IDS = feedbackDefinition.questions.map(
  ({ id }) => id,
);

async function ensureGlobalFeedbackTemplate(database: WriteDb) {
  await database
    .insert(FormSections)
    .values({ id: FEEDBACK_SECTION_ID, name: "Event Feedback" })
    .onConflictDoNothing();
  const section = await database.query.FormSections.findFirst({
    where: eq(FormSections.name, "Event Feedback"),
  });
  if (!section) throw new Error("Event feedback section was not prepared.");
  await database
    .insert(FormsSchemas)
    .values({
      duesOnly: false,
      formData: feedbackDefinition,
      formValidatorJson: {},
      id: GLOBAL_FEEDBACK_TEMPLATE_FORM_ID,
      isClosed: true,
      kind: "event_feedback",
      manuallyClosed: true,
      name: "Global Event Feedback Template",
      responseMode: "single_locked",
      section: "Event Feedback",
      sectionId: section.id,
      slugName: "global-event-feedback-template",
      state: "archived",
    })
    .onConflictDoNothing();
  const template = await database.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, GLOBAL_FEEDBACK_TEMPLATE_FORM_ID),
  });
  if (!template) throw new Error("Global feedback template was not prepared.");
  return template;
}

export async function getGlobalFeedbackTemplate(database: WriteDb = db) {
  return ensureGlobalFeedbackTemplate(database);
}

function asAnswers(value: unknown): StoredFeedbackAnswers {
  return value as StoredFeedbackAnswers;
}

export function createDbEventFeedbackState(database: WriteDb = db) {
  const context = new AsyncLocalStorage<WriteDb>();
  const executor = () => context.getStore() ?? database;

  const configDto = (row: typeof EventFeedbackConfig.$inferSelect) => ({
    closesAt: row.closesAt,
    coreTemplateRevision: row.templateRevision,
    eventId: row.eventId,
    formId: row.formId,
    rewardPoints: row.rewardPoints,
    customQuestions: Array.isArray(row.customQuestions)
      ? row.customQuestions
      : [],
  });

  const responseRows = async (eventId: string) =>
    executor()
      .select({
        answers: FormResponse.responseData,
        eventId: EventFeedbackConfig.eventId,
        formId: FormResponse.form,
        id: FormResponse.id,
        memberId: Member.id,
        submittedAt: FormResponse.createdAt,
      })
      .from(FormResponse)
      .innerJoin(
        EventFeedbackConfig,
        eq(FormResponse.form, EventFeedbackConfig.formId),
      )
      .innerJoin(Member, eq(FormResponse.userId, Member.userId))
      .where(eq(EventFeedbackConfig.eventId, eventId));

  const state = {
    async countDistinctAttendees(eventId: string) {
      const rows = await executor()
        .select({ memberId: EventAttendee.memberId })
        .from(EventAttendee)
        .where(eq(EventAttendee.eventId, eventId));
      return new Set(rows.map(({ memberId }) => memberId)).size;
    },

    async deleteResponseAndDetachReward(responseId: string) {
      const [deleted] = await executor().transaction(async (tx) => {
        await tx
          .update(EventFeedbackReward)
          .set({ responseId: null })
          .where(eq(EventFeedbackReward.responseId, responseId));
        return tx
          .delete(FormResponse)
          .where(eq(FormResponse.id, responseId))
          .returning({ id: FormResponse.id });
      });
      return deleted !== undefined;
    },

    async findFeedbackResponse(eventId: string, memberId: string) {
      const row = (await responseRows(eventId)).find(
        (candidate) => candidate.memberId === memberId,
      );
      return row ? { ...row, answers: asAnswers(row.answers) } : null;
    },

    async findFeedbackReward(eventId: string, memberId: string) {
      const row = await executor().query.EventFeedbackReward.findFirst({
        where: and(
          eq(EventFeedbackReward.eventId, eventId),
          eq(EventFeedbackReward.memberId, memberId),
        ),
      });
      return row
        ? {
            amount: row.pointsAwarded,
            awardedAt: row.awardedAt,
            eventId: row.eventId,
            id: row.id,
            memberId: row.memberId,
            responseId: row.responseId,
          }
        : null;
    },

    async getEvent(eventId: string) {
      const row = await executor().query.Event.findFirst({
        where: eq(Event.id, eventId),
      });
      return row
        ? {
            endAt: row.end_datetime,
            hackathonId: row.hackathonId,
            id: row.id,
            name: row.name,
            roleIds: row.roles,
          }
        : null;
    },

    async getFeedbackConfigByEventId(eventId: string) {
      const row = await executor().query.EventFeedbackConfig.findFirst({
        where: eq(EventFeedbackConfig.eventId, eventId),
      });
      return row ? configDto(row) : null;
    },

    async getFeedbackConfigByFormId(formId: string) {
      const row = await executor().query.EventFeedbackConfig.findFirst({
        where: eq(EventFeedbackConfig.formId, formId),
      });
      return row ? configDto(row) : null;
    },

    async getFeedbackResponse(responseId: string) {
      const row = await executor()
        .select({
          answers: FormResponse.responseData,
          eventId: EventFeedbackConfig.eventId,
          formId: FormResponse.form,
          id: FormResponse.id,
          memberId: Member.id,
          submittedAt: FormResponse.createdAt,
        })
        .from(FormResponse)
        .innerJoin(
          EventFeedbackConfig,
          eq(FormResponse.form, EventFeedbackConfig.formId),
        )
        .innerJoin(Member, eq(FormResponse.userId, Member.userId))
        .where(eq(FormResponse.id, responseId))
        .then((rows) => rows[0]);
      return row ? { ...row, answers: asAnswers(row.answers) } : null;
    },

    async getMember(memberId: string) {
      const row = await executor().query.Member.findFirst({
        columns: { id: true },
        where: eq(Member.id, memberId),
      });
      return row ?? null;
    },

    async hasAttendance(eventId: string, memberId: string) {
      const row = await executor().query.EventAttendee.findFirst({
        columns: { id: true },
        where: and(
          eq(EventAttendee.eventId, eventId),
          eq(EventAttendee.memberId, memberId),
        ),
      });
      return row !== undefined;
    },

    async insertFeedbackFormAndConfig(
      form: {
        id: string;
        slug: string;
        title: string;
      },
      config: {
        closesAt: Date;
        coreTemplateRevision: number;
        eventId: string;
        formId: string;
        rewardPoints: number;
      },
    ) {
      const run = async (tx: WriteDb) => {
        const template = await ensureGlobalFeedbackTemplate(tx);
        const templateDefinition =
          template.formData as typeof feedbackDefinition;
        const customQuestions = Array.isArray(templateDefinition.questions)
          ? templateDefinition.questions.slice(
              CORE_FEEDBACK_QUESTION_IDS.length,
            )
          : [];
        const [section] = await tx
          .insert(FormSections)
          .values({ id: FEEDBACK_SECTION_ID, name: "Event Feedback" })
          .onConflictDoUpdate({
            set: { name: "Event Feedback" },
            target: FormSections.name,
          })
          .returning({ id: FormSections.id });
        if (!section) throw new Error("Event feedback section was not saved.");

        await tx
          .insert(FormsSchemas)
          .values({
            archivedAt: null,
            closesAt: config.closesAt,
            duesOnly: false,
            formData: { ...templateDefinition, title: form.title },
            formValidatorJson: {},
            id: form.id,
            isClosed: false,
            kind: "event_feedback",
            manuallyClosed: false,
            name: form.title,
            opensAt: null,
            publishedAt: new Date(),
            responseMode: "single_locked",
            section: "Event Feedback",
            sectionId: section.id,
            slugName: form.slug,
            state: "published",
          })
          .onConflictDoNothing({ target: FormsSchemas.id });

        const [saved] = await tx
          .insert(EventFeedbackConfig)
          .values({
            closesAt: config.closesAt,
            eventId: config.eventId,
            formId: config.formId,
            rewardPoints: config.rewardPoints,
            templateRevision: template.revision,
            customQuestions,
          })
          .onConflictDoNothing({ target: EventFeedbackConfig.eventId })
          .returning();
        if (saved) return configDto(saved);
        const existing = await tx.query.EventFeedbackConfig.findFirst({
          where: eq(EventFeedbackConfig.eventId, config.eventId),
        });
        if (!existing) throw new Error("Event feedback was not saved.");
        return configDto(existing);
      };

      const current = executor();
      if ("transaction" in current) {
        return current.transaction((tx) => context.run(tx, () => run(tx)));
      }
      return run(current);
    },

    async insertResponseRewardAndIncrementPoints(
      response: {
        answers: StoredFeedbackAnswers;
        formId: string;
        id: string;
        memberId: string;
        submittedAt: Date;
      },
      reward: {
        amount: number;
        awardedAt: Date;
        eventId: string;
        id: string;
        memberId: string;
        responseId: string | null;
      },
    ) {
      const member = await executor().query.Member.findFirst({
        columns: { userId: true },
        where: eq(Member.id, response.memberId),
      });
      if (!member) throw new Error("Member not found.");
      await executor().insert(FormResponse).values({
        createdAt: response.submittedAt,
        editedAt: response.submittedAt,
        form: response.formId,
        formRevision: 1,
        id: response.id,
        responseData: response.answers,
        responseSnapshot: feedbackDefinition,
        userId: member.userId,
      });
      await executor().insert(FormSingleResponseClaim).values({
        formId: response.formId,
        responseId: response.id,
        userId: member.userId,
      });
      await executor().insert(EventFeedbackReward).values({
        awardedAt: reward.awardedAt,
        eventId: reward.eventId,
        id: reward.id,
        memberId: reward.memberId,
        pointsAwarded: reward.amount,
        responseId: reward.responseId,
      });
      await executor()
        .update(Member)
        .set({ points: sql`${Member.points} + ${reward.amount}` })
        .where(eq(Member.id, reward.memberId));
    },

    async listAttendanceForMember(memberId: string) {
      return executor()
        .select({
          eventId: EventAttendee.eventId,
          memberId: EventAttendee.memberId,
        })
        .from(EventAttendee)
        .where(eq(EventAttendee.memberId, memberId));
    },

    async listFeedbackResponses(eventId: string) {
      return (await responseRows(eventId)).map((row) => ({
        ...row,
        answers: asAnswers(row.answers),
      }));
    },

    async updateFeedbackDeadline(eventId: string, closesAt: Date) {
      const [row] = await executor()
        .update(EventFeedbackConfig)
        .set({ closesAt })
        .where(eq(EventFeedbackConfig.eventId, eventId))
        .returning();
      if (!row) return null;
      await executor()
        .update(FormsSchemas)
        .set({ closesAt })
        .where(eq(FormsSchemas.id, row.formId));
      return configDto(row);
    },

    async withFeedbackLock<T>(
      eventId: string,
      memberId: string,
      operation: () => Promise<T>,
    ) {
      const run = async (tx: WriteDb) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`blade:event-feedback:${eventId}:${memberId}`}, 0))`,
        );
        return context.run(tx, operation);
      };
      const current = executor();
      if ("transaction" in current) return current.transaction(run);
      return run(current);
    },
  };

  return state;
}

export async function createDbEventFeedbackService(database: WriteDb = db) {
  const protectedRows = await database
    .select({ id: Roles.id })
    .from(Roles)
    .where(eq(Roles.eventFeedbackExcluded, true));
  return createEventFeedbackService({
    audit: () => Promise.resolve(),
    clock: () => new Date(),
    protectedRoleIds: new Set(protectedRows.map(({ id }) => id)),
    state: createDbEventFeedbackState(database),
  });
}

export async function loadEventFeedbackListMetrics(eventIds: string[]) {
  if (eventIds.length === 0)
    return new Map<
      string,
      { averageOverall: number | null; responseCount: number }
    >();
  const rows = await db
    .select({
      averageOverall: sql<
        string | null
      >`avg((${FormResponse.responseData}->>'overall')::numeric)`,
      eventId: EventFeedbackConfig.eventId,
      responseCount: sql<number>`count(${FormResponse.id})::int`,
    })
    .from(EventFeedbackConfig)
    .leftJoin(FormResponse, eq(FormResponse.form, EventFeedbackConfig.formId))
    .where(inArray(EventFeedbackConfig.eventId, eventIds))
    .groupBy(EventFeedbackConfig.eventId);
  return new Map(
    rows.map((row) => [
      row.eventId,
      {
        averageOverall:
          row.averageOverall === null ? null : Number(row.averageOverall),
        responseCount: row.responseCount,
      },
    ]),
  );
}

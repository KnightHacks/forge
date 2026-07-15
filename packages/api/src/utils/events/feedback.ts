import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { FORMS } from "@forge/consts";

const DAY = 24 * 60 * 60 * 1000;
const FEEDBACK_POINTS = 5;
const MAX_LOCAL_EXCLUSIONS = 100;
const EVENT_FEEDBACK_DISCOVERY_SOURCES = new Set(
  FORMS.getDropdownOptionsFromConst("EVENT_FEEDBACK_HEARD"),
);

interface FeedbackEvent {
  endAt: Date;
  hackathonId: string | null;
  id: string;
  name: string;
  roleIds: string[];
}

interface FeedbackMember {
  id: string;
}

interface FeedbackAttendance {
  eventId: string;
  memberId: string;
}

export interface FeedbackAnswers {
  customAnswers?: Record<string, unknown>;
  discovery: string;
  discoveryOther?: string;
  fun: number;
  improve?: string;
  learning: number;
  overall: number;
  worked?: string;
}

export interface FeedbackConfig {
  closesAt: Date;
  coreTemplateRevision: number;
  eventId: string;
  formId: string;
  rewardPoints: number;
  customQuestions?: unknown[];
}

interface FeedbackForm {
  id: string;
  kind: "event_feedback";
  locked: boolean;
  slug: string;
  title: string;
}

interface FeedbackResponse {
  answers: FeedbackAnswers;
  eventId: string;
  formId: string;
  id: string;
  memberId: string;
  submittedAt: Date;
}

interface FeedbackReward {
  amount: number;
  awardedAt: Date;
  eventId: string;
  id: string;
  memberId: string;
  responseId: string | null;
}

interface FeedbackState {
  countDistinctAttendees(eventId: string): Promise<number>;
  deleteResponseAndDetachReward(responseId: string): Promise<boolean>;
  findFeedbackResponse(
    eventId: string,
    memberId: string,
  ): Promise<FeedbackResponse | null>;
  findFeedbackReward(
    eventId: string,
    memberId: string,
  ): Promise<FeedbackReward | null>;
  getEvent(eventId: string): Promise<FeedbackEvent | null>;
  getFeedbackConfigByEventId(eventId: string): Promise<FeedbackConfig | null>;
  getFeedbackConfigByFormId(formId: string): Promise<FeedbackConfig | null>;
  getFeedbackResponse(responseId: string): Promise<FeedbackResponse | null>;
  getMember(memberId: string): Promise<FeedbackMember | null>;
  hasAttendance(eventId: string, memberId: string): Promise<boolean>;
  insertFeedbackFormAndConfig(
    form: FeedbackForm,
    config: FeedbackConfig,
  ): Promise<FeedbackConfig>;
  insertResponseRewardAndIncrementPoints(
    response: FeedbackResponse,
    reward: FeedbackReward,
  ): Promise<void>;
  listAttendanceForMember(memberId: string): Promise<FeedbackAttendance[]>;
  listFeedbackResponses(eventId: string): Promise<FeedbackResponse[]>;
  updateFeedbackDeadline(
    eventId: string,
    closesAt: Date,
  ): Promise<FeedbackConfig | null>;
  withFeedbackLock<T>(
    eventId: string,
    memberId: string,
    operation: () => Promise<T>,
  ): Promise<T>;
}

type FeedbackAudit = (entry: {
  action: "delete_feedback" | "submit_feedback";
  eventId: string;
  memberId: string;
}) => Promise<unknown>;

type RatingKey = "fun" | "learning" | "overall";

export interface RatingMetric {
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface FeedbackAggregate {
  attendeeCount: number;
  customQuestionSummaries: {
    average?: number | null;
    distribution?: Record<string, number>;
    nonEmptyCount?: number;
    prompt: string;
    questionId: string;
    type: "linear_scale" | "paragraph";
  }[];
  discovery: Record<string, number>;
  excludedCount: number;
  includedCount: number;
  ratings: Record<RatingKey, RatingMetric>;
  responseCount: number;
  responseRate: number;
}

function customQuestionSummaries(
  questions: unknown,
  responses: readonly FeedbackResponse[],
): FeedbackAggregate["customQuestionSummaries"] {
  if (!Array.isArray(questions)) return [];
  return (questions as readonly unknown[]).flatMap<
    FeedbackAggregate["customQuestionSummaries"][number]
  >((question) => {
    if (
      typeof question !== "object" ||
      question === null ||
      !("id" in question) ||
      typeof question.id !== "string" ||
      !("prompt" in question) ||
      typeof question.prompt !== "string" ||
      !("type" in question) ||
      (question.type !== "paragraph" && question.type !== "linear_scale")
    ) {
      return [];
    }
    const questionId = question.id;
    const values = responses.flatMap((response) => {
      const value: unknown = response.answers.customAnswers?.[questionId];
      return value === undefined || value === null || value === ""
        ? []
        : [value];
    });
    if (question.type === "paragraph") {
      return [
        {
          nonEmptyCount: values.filter(
            (value) => typeof value === "string" && value.trim().length > 0,
          ).length,
          prompt: question.prompt,
          questionId,
          type: question.type,
        },
      ];
    }
    const numbers = values.filter(
      (value): value is number => typeof value === "number",
    );
    const distribution: Record<string, number> = {};
    numbers.forEach((value) => {
      distribution[String(value)] = (distribution[String(value)] ?? 0) + 1;
    });
    return [
      {
        average:
          numbers.length === 0
            ? null
            : numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
        distribution,
        prompt: question.prompt,
        questionId,
        type: question.type,
      },
    ];
  });
}

export interface IdentifiedFeedbackResponse {
  answers: FeedbackAnswers;
  memberId: string;
  responseId: string;
  submittedAt: Date;
}

export interface QualitativeAnswer {
  field: "improve" | "worked";
  memberId: string;
  responseId: string;
  value: string;
}

export type AggregateAnalytics = FeedbackAggregate;
export type ResponseAnalytics = FeedbackAggregate & {
  qualitativeAnswers: QualitativeAnswer[];
  responses: IdentifiedFeedbackResponse[];
};

function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

function isQualifyingEvent(
  event: FeedbackEvent,
  protectedRoleIds: ReadonlySet<string>,
) {
  return (
    event.hackathonId === null &&
    !event.roleIds.some((roleId) => protectedRoleIds.has(roleId))
  );
}

function feedbackDeadline(endAt: Date) {
  return {
    closesAt: new Date(endAt.getTime() + 7 * DAY),
  };
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "event";
}

function requireValidAnswers(answers: FeedbackAnswers) {
  for (const key of ["overall", "fun", "learning"] as const) {
    const value = answers[key];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${key} must be an integer from 1 through 5.`,
      });
    }
  }
  if (!EVENT_FEEDBACK_DISCOVERY_SOURCES.has(answers.discovery)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an approved discovery source.",
    });
  }
  if (answers.discovery === "Other" && !answers.discoveryOther?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Other discovery sources require details.",
    });
  }
  if (answers.discovery !== "Other" && answers.discoveryOther?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Discovery details are allowed only for Other.",
    });
  }
}

function emptyDistribution(): RatingMetric["distribution"] {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function ratingMetric(
  responses: readonly FeedbackResponse[],
  key: RatingKey,
): RatingMetric {
  const distribution = emptyDistribution();
  let total = 0;
  for (const response of responses) {
    const value = response.answers[key];
    distribution[value as 1 | 2 | 3 | 4 | 5] += 1;
    total += value;
  }
  return {
    average: responses.length === 0 ? null : total / responses.length,
    distribution,
  };
}

function aggregateFeedback({
  attendeeCount,
  excludedCount,
  included,
  responseCount,
}: {
  attendeeCount: number;
  excludedCount: number;
  included: readonly FeedbackResponse[];
  responseCount: number;
}): FeedbackAggregate {
  const discovery: Record<string, number> = {};
  for (const response of included) {
    const source = response.answers.discovery;
    discovery[source] = (discovery[source] ?? 0) + 1;
  }
  return {
    attendeeCount,
    customQuestionSummaries: [],
    discovery,
    excludedCount,
    includedCount: included.length,
    ratings: {
      fun: ratingMetric(included, "fun"),
      learning: ratingMetric(included, "learning"),
      overall: ratingMetric(included, "overall"),
    },
    responseCount,
    responseRate: attendeeCount === 0 ? 0 : included.length / attendeeCount,
  };
}

function escapeCsv(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" ||
            typeof value === "bigint" ||
            typeof value === "boolean"
          ? String(value)
          : typeof value === "object"
            ? JSON.stringify(value)
            : "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function customCsvColumns(
  questions: unknown,
): { id: string; prompt: string }[] {
  if (!Array.isArray(questions)) return [];
  const columns: { id: string; prompt: string }[] = [];
  for (const question of questions as readonly unknown[]) {
    if (
      typeof question !== "object" ||
      question === null ||
      !("id" in question) ||
      typeof question.id !== "string" ||
      !("prompt" in question) ||
      typeof question.prompt !== "string" ||
      !("type" in question) ||
      (question.type !== "paragraph" && question.type !== "linear_scale")
    ) {
      continue;
    }
    columns.push({ id: question.id, prompt: question.prompt });
  }
  return columns;
}

export function createEventFeedbackService({
  audit,
  clock,
  idFactory = randomUUID,
  protectedRoleIds,
  state,
}: {
  audit: FeedbackAudit;
  clock: () => Date;
  idFactory?: () => string;
  protectedRoleIds: ReadonlySet<string>;
  state: FeedbackState;
}) {
  const attemptAudit = async (entry: Parameters<FeedbackAudit>[0]) => {
    try {
      await audit(entry);
    } catch {
      // Audit delivery cannot undo committed product state.
    }
  };

  const requireQualifyingEvent = async (eventId: string) => {
    const event = await state.getEvent(eventId);
    if (!event || !isQualifyingEvent(event, protectedRoleIds)) {
      return notFound("Event feedback is not available.");
    }
    return event;
  };

  const opportunity = async (eventId: string, memberId: string) => {
    const [config, event, attended, reward, response] = await Promise.all([
      state.getFeedbackConfigByEventId(eventId),
      state.getEvent(eventId),
      state.hasAttendance(eventId, memberId),
      state.findFeedbackReward(eventId, memberId),
      state.findFeedbackResponse(eventId, memberId),
    ]);
    if (
      !config ||
      !event ||
      !attended ||
      !isQualifyingEvent(event, protectedRoleIds)
    ) {
      return {
        eventId,
        status: "not_applicable" as const,
        urgent: false,
      };
    }

    const base = {
      dueAt: config.closesAt,
      eventId,
      eventName: event.name,
      formId: config.formId,
      rewardPoints: config.rewardPoints,
      ...(config.customQuestions
        ? { customQuestions: structuredClone(config.customQuestions) }
        : {}),
    };
    if (reward) {
      return {
        ...base,
        pointsAwarded: reward.amount,
        responseId: reward.responseId,
        answers: response ? structuredClone(response.answers) : null,
        submittedAt: response?.submittedAt ?? reward.awardedAt,
        status: "completed" as const,
        urgent: false,
      };
    }

    const now = clock();
    if (now >= config.closesAt) {
      return { ...base, status: "not_applicable" as const, urgent: false };
    }
    if (config.closesAt.getTime() - now.getTime() < DAY) {
      return { ...base, status: "due_soon" as const, urgent: true };
    }
    return { ...base, status: "available" as const, urgent: false };
  };

  async function getAnalytics(input: {
    access: "aggregate";
    eventId: string;
    excludedResponseIds?: readonly string[];
  }): Promise<AggregateAnalytics>;
  async function getAnalytics(input: {
    access: "responses";
    eventId: string;
    excludedResponseIds?: readonly string[];
  }): Promise<ResponseAnalytics>;
  async function getAnalytics(input: {
    access: "aggregate" | "responses";
    eventId: string;
    excludedResponseIds?: readonly string[];
  }): Promise<AggregateAnalytics | ResponseAnalytics> {
    await requireQualifyingEvent(input.eventId);
    if (
      input.access !== "responses" &&
      (input.excludedResponseIds?.length ?? 0) > 0
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Response access is required to exclude feedback.",
      });
    }
    if ((input.excludedResponseIds?.length ?? 0) > MAX_LOCAL_EXCLUSIONS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Too many feedback responses were excluded.",
      });
    }

    const [responses, attendeeCount, config] = await Promise.all([
      state.listFeedbackResponses(input.eventId),
      state.countDistinctAttendees(input.eventId),
      state.getFeedbackConfigByEventId(input.eventId),
    ]);
    const excludedIds = new Set(input.excludedResponseIds ?? []);
    const included = responses.filter(
      (response) => !excludedIds.has(response.id),
    );
    const excludedCount = responses.length - included.length;
    const aggregate = aggregateFeedback({
      attendeeCount,
      excludedCount,
      included,
      responseCount: responses.length,
    });
    aggregate.customQuestionSummaries = customQuestionSummaries(
      config?.customQuestions,
      included,
    );
    if (input.access === "aggregate") return aggregate;

    const qualitativeAnswers: QualitativeAnswer[] = [];
    for (const response of included) {
      for (const field of ["worked", "improve"] as const) {
        const value = response.answers[field]?.trim();
        if (value) {
          qualitativeAnswers.push({
            field,
            memberId: response.memberId,
            responseId: response.id,
            value,
          });
        }
      }
    }
    return {
      ...aggregate,
      qualitativeAnswers,
      responses: included.map((response) => ({
        answers: structuredClone(response.answers),
        memberId: response.memberId,
        responseId: response.id,
        submittedAt: response.submittedAt,
      })),
    };
  }

  return {
    async deleteResponse(input: { responseId: string }) {
      const response = await state.getFeedbackResponse(input.responseId);
      if (!response) return notFound("Feedback response not found.");
      const deleted = await state.deleteResponseAndDetachReward(
        input.responseId,
      );
      if (!deleted) return notFound("Feedback response not found.");
      await attemptAudit({
        action: "delete_feedback",
        eventId: response.eventId,
        memberId: response.memberId,
      });
      return { status: "deleted" as const };
    },

    async exportCsv(input: {
      access: "aggregate" | "responses";
      eventId: string;
    }) {
      await requireQualifyingEvent(input.eventId);
      if (input.access !== "responses") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Response access is required to export feedback.",
        });
      }
      const [responses, config] = await Promise.all([
        state.listFeedbackResponses(input.eventId),
        state.getFeedbackConfigByEventId(input.eventId),
      ]);
      const customColumns = customCsvColumns(config?.customQuestions);
      const header = [
        "Response UUID",
        "Member UUID",
        "Submitted At",
        "Overall",
        "Fun",
        "Learning",
        "Discovery",
        "Discovery Other",
        "Worked",
        "Improve",
        ...customColumns.map(({ prompt }) => prompt),
      ];
      return [
        header.map(escapeCsv).join(","),
        ...responses.map((response) =>
          [
            response.id,
            response.memberId,
            response.submittedAt.toISOString(),
            response.answers.overall,
            response.answers.fun,
            response.answers.learning,
            response.answers.discovery,
            response.answers.discoveryOther,
            response.answers.worked,
            response.answers.improve,
            ...customColumns.map(
              ({ id }) => response.answers.customAnswers?.[id],
            ),
          ]
            .map(escapeCsv)
            .join(","),
        ),
      ].join("\n");
    },

    getAnalytics,

    async getEventListMetric(input: { eventId: string }) {
      await requireQualifyingEvent(input.eventId);
      const responses = await state.listFeedbackResponses(input.eventId);
      return {
        averageOverall: ratingMetric(responses, "overall").average,
        responseCount: responses.length,
      };
    },

    getMemberOpportunity(input: { eventId: string; memberId: string }) {
      return opportunity(input.eventId, input.memberId);
    },

    async listMemberOpportunities(input: { memberId: string }) {
      const attendance = await state.listAttendanceForMember(input.memberId);
      const eventIds = [...new Set(attendance.map((row) => row.eventId))];
      const opportunities = await Promise.all(
        eventIds.map((eventId) => opportunity(eventId, input.memberId)),
      );
      return opportunities.filter(({ status }) => status !== "not_applicable");
    },

    async provisionForEvent(input: { eventId: string }) {
      const event = await state.getEvent(input.eventId);
      if (!event) return notFound("Event not found.");
      if (!isQualifyingEvent(event, protectedRoleIds)) {
        return { status: "not_applicable" as const };
      }
      const existing = await state.getFeedbackConfigByEventId(event.id);
      if (existing) return { ...existing, status: "existing" as const };

      const formId = idFactory();
      const suffix = event.id.replaceAll("-", "").slice(-12);
      const form: FeedbackForm = {
        id: formId,
        kind: "event_feedback",
        locked: true,
        slug: `event-feedback-${slugify(event.name)}-${suffix}`,
        title: `${event.name} Feedback`,
      };
      const deadline = feedbackDeadline(event.endAt);
      const config: FeedbackConfig = {
        ...deadline,
        coreTemplateRevision: 1,
        eventId: event.id,
        formId,
        rewardPoints: FEEDBACK_POINTS,
      };
      const inserted = await state.insertFeedbackFormAndConfig(form, config);
      return { ...inserted, status: "created" as const };
    },

    async recomputeWindowForEvent(input: { eventId: string }) {
      const event = await state.getEvent(input.eventId);
      if (!event) return notFound("Event not found.");
      const config = await state.getFeedbackConfigByEventId(event.id);
      if (!config) return { status: "not_applicable" as const };
      const deadline = feedbackDeadline(event.endAt);
      const updated = await state.updateFeedbackDeadline(
        event.id,
        deadline.closesAt,
      );
      if (!updated) return notFound("Event feedback configuration not found.");
      return updated;
    },

    async submit(input: {
      answers: FeedbackAnswers;
      formId: string;
      memberId: string;
    }) {
      requireValidAnswers(input.answers);
      const initialConfig = await state.getFeedbackConfigByFormId(input.formId);
      if (!initialConfig) return notFound("Event feedback is not available.");
      await requireQualifyingEvent(initialConfig.eventId);

      const result = await state.withFeedbackLock(
        initialConfig.eventId,
        input.memberId,
        async () => {
          const config = await state.getFeedbackConfigByFormId(input.formId);
          if (!config) return notFound("Event feedback is not available.");
          await requireQualifyingEvent(config.eventId);
          const now = clock();
          if (now >= config.closesAt) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Event feedback is outside its response window.",
            });
          }
          const [member, attended, reward, response] = await Promise.all([
            state.getMember(input.memberId),
            state.hasAttendance(config.eventId, input.memberId),
            state.findFeedbackReward(config.eventId, input.memberId),
            state.findFeedbackResponse(config.eventId, input.memberId),
          ]);
          if (!member) return notFound("Member not found.");
          if (!attended) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only checked-in attendees may submit feedback.",
            });
          }
          if (reward) {
            return {
              pointsAwarded: reward.amount,
              responseId: reward.responseId,
              status: "completed" as const,
            };
          }
          if (response) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Feedback exists without its reward record.",
            });
          }

          const responseId = idFactory();
          const responseRow: FeedbackResponse = {
            answers: structuredClone(input.answers),
            eventId: config.eventId,
            formId: config.formId,
            id: responseId,
            memberId: member.id,
            submittedAt: now,
          };
          const rewardRow: FeedbackReward = {
            amount: config.rewardPoints,
            awardedAt: now,
            eventId: config.eventId,
            id: idFactory(),
            memberId: member.id,
            responseId,
          };
          await state.insertResponseRewardAndIncrementPoints(
            responseRow,
            rewardRow,
          );
          return {
            pointsAwarded: rewardRow.amount,
            responseId,
            status: "submitted" as const,
          };
        },
      );
      if (result.status === "submitted") {
        await attemptAudit({
          action: "submit_feedback",
          eventId: initialConfig.eventId,
          memberId: input.memberId,
        });
      }
      return result;
    },
  };
}

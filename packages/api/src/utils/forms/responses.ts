import { TRPCError } from "@trpc/server";

export type FormResponseMode =
  | "multiple_locked"
  | "single_editable"
  | "single_locked";
export type FormKind = "event_feedback" | "general" | "system";
export type RespondentState =
  | "archived"
  | "closed"
  | "draft"
  | "ineligible"
  | "manually_closed"
  | "open"
  | "scheduled";

export interface FormRespondentContext {
  actor: {
    duesPaid: boolean;
    memberId: string;
    roleIds: readonly string[];
    userId: string;
  };
  form: {
    closesAt: Date | null;
    id: string;
    kind: FormKind;
    manuallyClosed: boolean;
    opensAt: Date | null;
    respondentDuesRequired: boolean;
    respondentRoleIds: readonly string[];
    responseMode: FormResponseMode;
    state: "archived" | "draft" | "published";
  };
}

export function evaluateFormRespondentState(
  context: FormRespondentContext,
  now: Date,
): RespondentState {
  const { actor, form } = context;
  if (form.state === "draft") return "draft";
  if (form.state === "archived") return "archived";
  if (form.manuallyClosed) return "manually_closed";
  if (form.opensAt && now < form.opensAt) return "scheduled";
  if (form.closesAt && now >= form.closesAt) return "closed";
  if (form.respondentDuesRequired && !actor.duesPaid) return "ineligible";
  if (
    form.respondentRoleIds.length > 0 &&
    !form.respondentRoleIds.some((roleId) => actor.roleIds.includes(roleId))
  ) {
    return "ineligible";
  }
  return "open";
}

interface FormResponseRepository {
  createMultipleResponse(input: {
    answers: Record<string, unknown>;
    formId: string;
    submittedAt: Date;
    userId: string;
  }): Promise<unknown>;
  createSingleResponse(input: {
    answers: Record<string, unknown>;
    formId: string;
    submittedAt: Date;
    userId: string;
  }): Promise<{ created: false } | { created: true; response: unknown }>;
  updateSingleResponse?(input: {
    answers: Record<string, unknown>;
    formId: string;
    responseId: string;
    submittedAt: Date;
    userId: string;
  }): Promise<unknown>;
}

function assertOpen(context: FormRespondentContext, now: Date) {
  const state = evaluateFormRespondentState(context, now);
  if (state !== "open") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This form is not accepting responses (${state}).`,
    });
  }
}

export function createFormResponseSubmissionService({
  clock,
  repository,
}: {
  clock: () => Date;
  repository: FormResponseRepository;
}) {
  return {
    async submit(input: {
      answers: Record<string, unknown>;
      context: FormRespondentContext;
      formId: string;
      userId: string;
    }) {
      const now = clock();
      assertOpen(input.context, now);
      if (
        input.context.actor.userId !== input.userId ||
        input.context.form.id !== input.formId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const persistenceInput = {
        answers: input.answers,
        formId: input.formId,
        submittedAt: now,
        userId: input.userId,
      };
      if (input.context.form.responseMode === "multiple_locked") {
        return repository.createMultipleResponse(persistenceInput);
      }

      const result = await repository.createSingleResponse(persistenceInput);
      if (!result.created) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already submitted a response to this form.",
        });
      }
      return result.response;
    },

    async update(input: {
      answers: Record<string, unknown>;
      context: FormRespondentContext;
      formId: string;
      responseId: string;
      userId: string;
    }) {
      const now = clock();
      assertOpen(input.context, now);
      if (input.context.form.responseMode !== "single_editable") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This response is locked.",
        });
      }
      if (
        input.context.actor.userId !== input.userId ||
        input.context.form.id !== input.formId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!repository.updateSingleResponse) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return repository.updateSingleResponse({
        answers: input.answers,
        formId: input.formId,
        responseId: input.responseId,
        submittedAt: now,
        userId: input.userId,
      });
    },
  };
}

interface MemberHistoryRecord {
  form: { kind: FormKind };
  submittedAt: Date;
  userId: string;
}

export function buildMemberFormHistory<T extends MemberHistoryRecord>({
  responses,
  userId,
}: {
  responses: readonly T[];
  userId: string;
}): T[] {
  return responses
    .filter(
      (response) =>
        response.userId === userId && response.form.kind === "general",
    )
    .sort(
      (left, right) => right.submittedAt.getTime() - left.submittedAt.getTime(),
    );
}

export function toMemberFormResponseDto(input: {
  answers: Record<string, unknown>;
  form: { id: string; kind: FormKind; title: string } & Record<string, unknown>;
  id: string;
  respondentSnapshot: unknown;
  submittedAt: Date;
  [key: string]: unknown;
}) {
  return {
    answers: input.answers,
    form: {
      id: input.form.id,
      kind: input.form.kind,
      title: input.form.title,
    },
    id: input.id,
    respondentSnapshot: input.respondentSnapshot,
    submittedAt: input.submittedAt,
  };
}

type CallbackExecutionStatus =
  | "cancelled"
  | "failed"
  | "pending"
  | "running"
  | "succeeded";

export function planFormResponseDeletion(input: {
  attachmentIds: readonly string[];
  callbackExecutions: readonly {
    callbackSlug: string;
    id: string;
    status: CallbackExecutionStatus;
  }[];
  responseId: string;
}) {
  return {
    automaticCompensations: [] as never[],
    cancelExecutionIds: input.callbackExecutions
      .filter(({ status }) => status === "pending" || status === "running")
      .map(({ id }) => id),
    deleteAttachmentIds: [...input.attachmentIds],
    retainedExecutionAudit: input.callbackExecutions
      .filter(({ status }) => status === "failed" || status === "succeeded")
      .map(({ callbackSlug, id, status }) => ({
        callbackSlug,
        id,
        responseId: null,
        status,
      })),
    responseId: input.responseId,
  };
}

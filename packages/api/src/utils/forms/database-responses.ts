import { TRPCError } from "@trpc/server";

import { and, desc, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  FormAttachment,
  FormCallbackExecution,
  FormResponse,
  FormResponseRoles,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";

import type { PlatformFormActor } from "./actor";
import { createAdminAuditEvent } from "../audit/service";
import { buildDuesStatus } from "../dues/status";
import { requireFormCapability } from "./access";
import { auditActor } from "./actor";
import { summarizeFormResponses } from "./analytics";
import { removeFormAttachmentObjects } from "./attachments";
import { serializeFormResponsesCsv } from "./export";
import {
  normalizeStoredFormDefinition,
  normalizeStoredFormResponse,
} from "./legacy";
import {
  buildRespondentFormView,
  evaluateFormRespondentState,
  isFormRespondentEligible,
} from "./responses";
import { requirePlatformFormCapability, requireSection } from "./sections";

export async function listPlatformResponses(
  actor: PlatformFormActor,
  formId: string,
) {
  const { form } = await requirePlatformFormCapability(
    actor,
    formId,
    "read_responses",
  );
  const rows = await db
    .select({
      answers: FormResponse.responseData,
      email: Member.email,
      firstName: Member.firstName,
      lastName: Member.lastName,
      memberId: Member.id,
      responseId: FormResponse.id,
      snapshot: FormResponse.responseSnapshot,
      submittedAt: FormResponse.createdAt,
    })
    .from(FormResponse)
    .innerJoin(Member, eq(FormResponse.userId, Member.userId))
    .where(eq(FormResponse.form, form.id));
  const definition = normalizeStoredFormDefinition(form.id, form.formData);
  const responses = rows.map((row) => {
    const normalized = normalizeStoredFormResponse({
      currentDefinition: form.formData,
      formId: form.id,
      rawAnswers: row.answers,
      rawSnapshot: row.snapshot,
    });
    return {
      answers: normalized.answers,
      member: {
        email: row.email,
        id: row.memberId,
        name: `${row.firstName} ${row.lastName}`,
      },
      responseId: row.responseId,
      snapshot: normalized.snapshot,
      submittedAt: row.submittedAt,
    };
  });
  return {
    analytics: summarizeFormResponses({
      definition,
      responses: responses.map((response) => ({
        answers: response.answers,
        id: response.responseId,
        snapshot: response.snapshot,
      })),
    }),
    form: { id: form.id, name: form.name, state: form.state },
    responses,
  };
}

export async function deletePlatformResponse(input: {
  actor: PlatformFormActor;
  formId: string;
  responseId: string;
}) {
  const { form } = await requirePlatformFormCapability(
    input.actor,
    input.formId,
    "delete_response",
  );
  if (form.kind !== "general") throw new TRPCError({ code: "BAD_REQUEST" });
  const result = await db.transaction(async (tx) => {
    const response = await tx.query.FormResponse.findFirst({
      columns: { createdAt: true, id: true, userId: true },
      where: and(
        eq(FormResponse.id, input.responseId),
        eq(FormResponse.form, input.formId),
      ),
    });
    if (!response) throw new TRPCError({ code: "NOT_FOUND" });
    const member = await tx.query.Member.findFirst({
      columns: { firstName: true, id: true, lastName: true },
      where: eq(Member.userId, response.userId),
    });
    await tx
      .update(FormCallbackExecution)
      .set({ responseId: null, status: "cancelled" })
      .where(
        and(
          eq(FormCallbackExecution.responseId, response.id),
          inArray(FormCallbackExecution.status, ["pending", "running"]),
        ),
      );
    await tx
      .update(FormCallbackExecution)
      .set({ input: {}, responseId: null })
      .where(eq(FormCallbackExecution.responseId, response.id));
    const attachments = await tx
      .select({ objectName: FormAttachment.objectName })
      .from(FormAttachment)
      .where(eq(FormAttachment.responseId, response.id));
    await tx
      .delete(FormAttachment)
      .where(eq(FormAttachment.responseId, response.id));
    await tx.delete(FormResponse).where(eq(FormResponse.id, response.id));
    await createAdminAuditEvent(
      {
        actionKey: "form.response.deleted",
        actor: auditActor(input.actor),
        metadata: {
          attachmentCount: attachments.length,
          callbackEffectsPreserved: true,
          submittedAt: response.createdAt.toISOString(),
        },
        subjects: [
          {
            relation: "primary",
            targetId: response.id,
            targetLabel: `Response ${response.id}`,
            targetType: "form_response",
          },
          {
            relation: "secondary",
            targetId: form.id,
            targetLabel: form.name,
            targetType: "form",
          },
          ...(member
            ? [
                {
                  memberId: member.id,
                  relation: "secondary" as const,
                  targetId: member.id,
                  targetLabel: `${member.firstName} ${member.lastName}`,
                  targetType: "member" as const,
                },
              ]
            : []),
        ],
      },
      tx,
    );
    return {
      id: response.id,
      objectNames: attachments.map(({ objectName }) => objectName),
      status: "deleted" as const,
    };
  });
  await removeFormAttachmentObjects(result.objectNames);
  return { id: result.id, status: result.status };
}

export async function memberFormHistory(userId: string) {
  const rows = await db
    .select({
      formKind: FormsSchemas.kind,
      formName: FormsSchemas.name,
      slugName: FormsSchemas.slugName,
      responseId: FormResponse.id,
      responseMode: FormsSchemas.responseMode,
      submittedAt: FormResponse.createdAt,
    })
    .from(FormResponse)
    .innerJoin(FormsSchemas, eq(FormResponse.form, FormsSchemas.id))
    .where(
      and(eq(FormResponse.userId, userId), eq(FormsSchemas.kind, "general")),
    )
    .orderBy(desc(FormResponse.createdAt), desc(FormResponse.id));
  return rows.map((row) => ({
    formKind: row.formKind,
    formName: row.formName,
    locked: row.responseMode !== "single_editable",
    responseId: row.responseId,
    slugName: row.slugName,
    submittedAt: row.submittedAt,
  }));
}

export async function respondentForm(
  slugName: string,
  userId: string,
  requestedResponseId?: string,
) {
  const form = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.slugName, slugName),
  });
  if (form?.kind !== "general") throw new TRPCError({ code: "NOT_FOUND" });
  if (form.state === "draft") throw new TRPCError({ code: "NOT_FOUND" });
  const [member, response, roleRows] = await Promise.all([
    db.query.Member.findFirst({ where: eq(Member.userId, userId) }),
    requestedResponseId || form.responseMode !== "multiple_locked"
      ? db.query.FormResponse.findFirst({
          where: and(
            eq(FormResponse.form, form.id),
            eq(FormResponse.userId, userId),
            ...(requestedResponseId
              ? [eq(FormResponse.id, requestedResponseId)]
              : []),
          ),
        })
      : null,
    db
      .select({ roleId: FormResponseRoles.roleId })
      .from(FormResponseRoles)
      .where(eq(FormResponseRoles.formId, form.id)),
  ]);
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Create a member profile before responding to this form.",
    });
  }
  if (requestedResponseId && !response) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  const assignedRoles = await db
    .select({ roleId: Permissions.roleId })
    .from(Permissions)
    .where(eq(Permissions.userId, userId));
  const duesRows = await db
    .select()
    .from(DuesPayment)
    .where(eq(DuesPayment.memberId, member.id));
  const respondentContext = {
    actor: {
      duesPaid: buildDuesStatus({ duesRows }).paid,
      memberId: member.id,
      roleIds: assignedRoles.map(({ roleId }) => roleId),
      userId,
    },
    form: {
      closesAt: form.closesAt,
      id: form.id,
      kind: form.kind,
      manuallyClosed: form.manuallyClosed,
      opensAt: form.opensAt,
      respondentDuesRequired: form.duesOnly,
      respondentRoleIds: roleRows.map(({ roleId }) => roleId),
      responseMode: form.responseMode,
      state: form.state,
    },
  };
  const state = evaluateFormRespondentState(respondentContext, new Date());
  // Draft forms already 404 above; repeating it here keeps the view builder's
  // state union free of a case the respondent must never see.
  if (state === "draft") throw new TRPCError({ code: "NOT_FOUND" });
  // Authorization, asked separately from the display state. `state` collapses
  // to the first condition that matches, so a restricted form that has closed
  // reports `"closed"` and never evaluates eligibility — which let anyone read
  // a Dev-Team-only form, and download its instruction attachments, the moment
  // it stopped accepting responses. Someone who already responded keeps access
  // to their own submission, which is what the pre-refactor gate did.
  if (!isFormRespondentEligible(respondentContext) && !response) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const normalizedResponse = response
    ? normalizeStoredFormResponse({
        currentDefinition: form.formData,
        formId: form.id,
        rawAnswers: response.responseData,
        rawSnapshot: response.responseSnapshot,
      })
    : null;
  const view = buildRespondentFormView({
    definition: normalizeStoredFormDefinition(form.id, form.formData),
    form: {
      closesAt: form.closesAt,
      opensAt: form.opensAt,
      responseMode: form.responseMode,
    },
    response: response
      ? {
          answers: normalizedResponse?.answers ?? {},
          id: response.id,
          submittedAt: response.createdAt,
        }
      : null,
    state,
  });
  return {
    definition: view.definition,
    form: {
      closesAt: form.closesAt,
      id: form.id,
      name: form.name,
      opensAt: form.opensAt,
      responseMode: form.responseMode,
      slugName: form.slugName,
    },
    respondentState: view.respondentState,
  };
}

export async function exportPlatformResponses(
  actor: PlatformFormActor,
  formId: string,
) {
  const form = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, formId),
  });
  if (!form) throw new TRPCError({ code: "NOT_FOUND" });
  const { access } = await requireSection(actor, form.sectionId);
  requireFormCapability(access, "read_responses");
  const rows = await db
    .select({
      answers: FormResponse.responseData,
      email: Member.email,
      firstName: Member.firstName,
      id: FormResponse.id,
      lastName: Member.lastName,
      memberId: Member.id,
      snapshot: FormResponse.responseSnapshot,
      submittedAt: FormResponse.createdAt,
    })
    .from(FormResponse)
    .innerJoin(Member, eq(FormResponse.userId, Member.userId))
    .where(eq(FormResponse.form, form.id));
  const definition = normalizeStoredFormDefinition(form.id, form.formData);
  const csv = serializeFormResponsesCsv({
    definition,
    responses: rows.map((row) => {
      const normalized = normalizeStoredFormResponse({
        currentDefinition: form.formData,
        formId: form.id,
        rawAnswers: row.answers,
        rawSnapshot: row.snapshot,
      });
      return {
        answers: normalized.answers,
        id: row.id,
        member: {
          email: row.email,
          id: row.memberId,
          name: `${row.firstName} ${row.lastName}`,
        },
        snapshot: normalized.snapshot,
        status: "submitted",
        submittedAt: row.submittedAt,
      };
    }),
  });
  await createAdminAuditEvent({
    actionKey: "form.responses.exported",
    actor: auditActor(actor),
    metadata: {
      formState: form.state,
      questionCount: definition.questions.length,
      responseCount: rows.length,
    },
    subjects: [
      {
        relation: "primary",
        targetId: form.id,
        targetLabel: form.name,
        targetType: "form",
      },
    ],
  });
  return csv;
}

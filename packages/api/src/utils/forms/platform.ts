import { TRPCError } from "@trpc/server";

import type { Session } from "@forge/auth/server";
import { and, desc, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  FormAttachment,
  FormCallbackConfiguration,
  FormCallbackExecution,
  FormResponse,
  FormResponseRoles,
  FormSectionEditRole,
  FormSections,
  FormSectionViewRole,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  callbackConfigurationSchema,
  formDefinitionSchema,
} from "@forge/validators";

import type { PermissionMap } from "../permissions";
import { createAdminAuditEvent } from "../audit/service";
import { buildDuesStatus } from "../dues/status";
import { evaluateFormSectionAccess, requireFormCapability } from "./access";
import { summarizeFormResponses } from "./analytics";
import { removeFormAttachmentObjects } from "./attachments";
import {
  applyFormDefinitionMutation,
  transitionFormState,
} from "./definitions";
import { serializeFormResponsesCsv } from "./export";
import {
  normalizeStoredFormDefinition,
  normalizeStoredFormResponse,
} from "./legacy";

export interface PlatformFormActor {
  discordUserId?: string | null;
  name?: string | null;
  permissions: PermissionMap;
  roleIds: string[];
  userId: string;
}

export async function loadPlatformFormActor(
  session: Session & { permissions: PermissionMap },
): Promise<PlatformFormActor> {
  const rows = await db
    .select({ roleId: Permissions.roleId })
    .from(Permissions)
    .where(eq(Permissions.userId, session.user.id));
  return {
    discordUserId: session.user.discordUserId,
    name: session.user.name,
    permissions: session.permissions,
    roleIds: [...new Set(rows.map(({ roleId }) => roleId))],
    userId: session.user.id,
  };
}

function auditActor(actor: PlatformFormActor) {
  return {
    discordUserId: actor.discordUserId,
    id: actor.userId,
    name: actor.name,
  };
}

function safeDefinitionSummary(value: unknown) {
  const parsed = formDefinitionSchema.parse(value);
  return {
    questionCount: parsed.questions.length,
    questionIds: parsed.questions.map(({ id }) => id),
    questionTypes: parsed.questions.map(({ type }) => type),
  };
}

async function sectionPolicies() {
  const [sections, viewers, editors] = await Promise.all([
    db.select().from(FormSections),
    db.select().from(FormSectionViewRole),
    db.select().from(FormSectionEditRole),
  ]);
  return sections.map((section) => ({
    editorRoleIds: editors
      .filter(({ sectionId }) => sectionId === section.id)
      .map(({ roleId }) => roleId),
    id: section.id,
    name: section.name,
    viewerRoleIds: viewers
      .filter(({ sectionId }) => sectionId === section.id)
      .map(({ roleId }) => roleId),
  }));
}

async function requireSection(actor: PlatformFormActor, sectionId: string) {
  const section = (await sectionPolicies()).find(({ id }) => id === sectionId);
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  return { section, access: evaluateFormSectionAccess(actor, section) };
}

export async function requirePlatformFormCapability(
  actor: PlatformFormActor,
  formId: string,
  capability:
    | "delete_response"
    | "edit_definition"
    | "read_definition"
    | "read_responses",
) {
  const form = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, formId),
  });
  if (!form) throw new TRPCError({ code: "NOT_FOUND" });
  const { access, section } = await requireSection(actor, form.sectionId);
  requireFormCapability(access, capability);
  return { access, form, section };
}

export async function listAdminForms(actor: PlatformFormActor) {
  const [forms, sections, responses] = await Promise.all([
    db.select().from(FormsSchemas),
    sectionPolicies(),
    db
      .select({
        count: sql<number>`count(*)::int`,
        formId: FormResponse.form,
      })
      .from(FormResponse)
      .groupBy(FormResponse.form),
  ]);
  const responseCounts = new Map(
    responses.map(({ count, formId }) => [formId, count]),
  );
  return forms.flatMap((form) => {
    if (form.kind === "event_feedback") return [];
    const section = sections.find(({ id }) => id === form.sectionId);
    if (!section) return [];
    const access = evaluateFormSectionAccess(actor, section);
    if (!access.canRead && !access.canEdit && !access.canReadResponses)
      return [];
    return [
      {
        access,
        closesAt: form.closesAt,
        id: form.id,
        kind: form.kind,
        manualClosed: form.manuallyClosed,
        name: form.name,
        opensAt: form.opensAt,
        responseCount: responseCounts.get(form.id) ?? 0,
        responseMode: form.responseMode,
        revision: form.revision,
        section: { id: section.id, name: section.name },
        slugName: form.slugName,
        state: form.state,
      },
    ];
  });
}

export async function getAdminPlatformForm(
  actor: PlatformFormActor,
  formId: string,
) {
  const { access, form, section } = await requirePlatformFormCapability(
    actor,
    formId,
    "read_definition",
  );
  const [respondentRoles, callbacks] = await Promise.all([
    db
      .select({ roleId: FormResponseRoles.roleId })
      .from(FormResponseRoles)
      .where(eq(FormResponseRoles.formId, form.id)),
    db
      .select({
        active: FormCallbackConfiguration.active,
        callbackSlug: FormCallbackConfiguration.callbackSlug,
        id: FormCallbackConfiguration.id,
        mappings: FormCallbackConfiguration.mappings,
      })
      .from(FormCallbackConfiguration)
      .where(eq(FormCallbackConfiguration.formId, form.id)),
  ]);
  return {
    access,
    callbacks,
    form: {
      ...form,
      formData: normalizeStoredFormDefinition(form.id, form.formData),
    },
    respondentRoleIds: respondentRoles.map(({ roleId }) => roleId),
    section,
  };
}

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

export async function deletePlatformForm(input: {
  actor: PlatformFormActor;
  formId: string;
}) {
  const { form } = await requirePlatformFormCapability(
    input.actor,
    input.formId,
    "edit_definition",
  );
  if (form.kind !== "general") throw new TRPCError({ code: "BAD_REQUEST" });
  const responseCountRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(FormResponse)
    .where(eq(FormResponse.form, form.id))
    .then((rows) => rows[0]);
  if ((responseCountRow?.count ?? 0) > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Forms with responses must be archived.",
    });
  }
  const objects = await db
    .select({ objectName: FormAttachment.objectName })
    .from(FormAttachment)
    .where(eq(FormAttachment.formId, form.id));
  await db.transaction(async (tx) => {
    await tx.delete(FormsSchemas).where(eq(FormsSchemas.id, form.id));
    await createAdminAuditEvent(
      {
        actionKey: "form.deleted",
        actor: auditActor(input.actor),
        metadata: {
          attachmentCount: objects.length,
          priorState: form.state,
        },
        subjects: [
          {
            relation: "primary",
            targetId: form.id,
            targetLabel: form.name,
            targetType: "form",
          },
        ],
      },
      tx,
    );
  });
  await removeFormAttachmentObjects(
    objects.map(({ objectName }) => objectName),
  );
  return { id: form.id, status: "deleted" as const };
}

export async function createPlatformForm(input: {
  actor: PlatformFormActor;
  closesAt: Date | null;
  definition: unknown;
  duesOnly: boolean;
  name: string;
  opensAt: Date | null;
  respondentRoleIds: string[];
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  sectionId: string;
  slugName: string;
}) {
  const { access, section } = await requireSection(
    input.actor,
    input.sectionId,
  );
  requireFormCapability(access, "edit_definition");
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(FormsSchemas)
      .values({
        allowEdit: input.responseMode === "single_editable",
        allowResubmission: input.responseMode === "multiple_locked",
        closesAt: input.closesAt,
        duesOnly: input.duesOnly,
        formData: input.definition,
        formValidatorJson: {},
        kind: "general",
        name: input.name,
        opensAt: input.opensAt,
        responseMode: input.responseMode,
        section: section.name,
        sectionId: section.id,
        slugName: input.slugName,
        state: "draft",
      })
      .returning();
    if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (input.respondentRoleIds.length > 0) {
      await tx.insert(FormResponseRoles).values(
        input.respondentRoleIds.map((roleId) => ({
          formId: created.id,
          roleId,
        })),
      );
    }
    const definition = safeDefinitionSummary(input.definition);
    await createAdminAuditEvent(
      {
        actionKey: "form.created",
        actor: auditActor(input.actor),
        metadata: {
          name: created.name,
          questionCount: definition.questionCount,
          responseMode: created.responseMode,
          sectionId: created.sectionId,
          slug: created.slugName,
          state: created.state,
        },
        subjects: [
          {
            relation: "primary",
            targetId: created.id,
            targetLabel: created.name,
            targetType: "form",
          },
        ],
      },
      tx,
    );
    return created;
  });
}

export async function updatePlatformForm(input: {
  actor: PlatformFormActor;
  definition: unknown;
  expectedRevision: number;
  formId: string;
  name: string;
  slugName?: string;
}) {
  const current = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, input.formId),
  });
  if (current?.kind !== "general") {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  const { access } = await requireSection(input.actor, current.sectionId);
  requireFormCapability(access, "edit_definition");
  const [responseRows, callbackRows] = await Promise.all([
    db
      .select({
        data: FormResponse.responseData,
        snapshot: FormResponse.responseSnapshot,
      })
      .from(FormResponse)
      .where(eq(FormResponse.form, current.id)),
    db
      .select({ mappings: FormCallbackConfiguration.mappings })
      .from(FormCallbackConfiguration)
      .where(
        and(
          eq(FormCallbackConfiguration.formId, current.id),
          eq(FormCallbackConfiguration.active, true),
        ),
      ),
  ]);
  const callbackMappedQuestionIds = callbackRows.flatMap(({ mappings }) => {
    const parsed =
      callbackConfigurationSchema.shape.mappings.safeParse(mappings);
    return parsed.success
      ? parsed.data.flatMap(({ source }) =>
          source.kind === "question" ? [source.questionId] : [],
        )
      : [];
  });
  const next = applyFormDefinitionMutation({
    answeredQuestionIds: [
      ...new Set(
        responseRows.flatMap(({ data, snapshot }) =>
          Object.keys(
            normalizeStoredFormResponse({
              currentDefinition: current.formData,
              formId: current.id,
              rawAnswers: data,
              rawSnapshot: snapshot,
            }).answers,
          ),
        ),
      ),
    ],
    callbackMappedQuestionIds,
    current: {
      archivedAt: current.archivedAt,
      definition: normalizeStoredFormDefinition(current.id, current.formData),
      publishedAt: current.publishedAt,
      revision: current.revision,
      slug: current.slugName,
      state: current.state,
    },
    expectedRevision: input.expectedRevision,
    now: new Date(),
    patch: {
      definition: input.definition as { questions: Record<string, unknown>[] },
      slug: input.slugName,
    },
  });
  return db.transaction(async (tx) => {
    const previousInstructionIds = new Set(
      normalizeStoredFormDefinition(current.id, current.formData)
        .instructions.filter((instruction) => instruction.type !== "text")
        .map((instruction) => instruction.attachmentId),
    );
    const addedInstructionIds = formDefinitionSchema
      .parse(next.definition)
      .instructions.filter((instruction) => instruction.type !== "text")
      .map((instruction) => instruction.attachmentId)
      .filter((attachmentId) => !previousInstructionIds.has(attachmentId));
    if (addedInstructionIds.length > 0) {
      const instructionAttachments = await tx
        .select({
          finalizedAt: FormAttachment.finalizedAt,
          formId: FormAttachment.formId,
          id: FormAttachment.id,
          purpose: FormAttachment.purpose,
        })
        .from(FormAttachment)
        .where(inArray(FormAttachment.id, addedInstructionIds));
      if (
        instructionAttachments.length !== new Set(addedInstructionIds).size ||
        instructionAttachments.some(
          (attachment) =>
            attachment.formId !== current.id ||
            attachment.purpose !== "instruction" ||
            !attachment.finalizedAt,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more instruction uploads are invalid.",
        });
      }
    }
    const [saved] = await tx
      .update(FormsSchemas)
      .set({
        formData: next.definition,
        name: input.name,
        revision: next.revision,
        slugName: next.slug,
      })
      .where(
        and(
          eq(FormsSchemas.id, current.id),
          eq(FormsSchemas.revision, input.expectedRevision),
        ),
      )
      .returning();
    if (!saved) throw new TRPCError({ code: "CONFLICT" });
    const definition = safeDefinitionSummary(next.definition);
    await createAdminAuditEvent(
      {
        actionKey: "form.definition.updated",
        actor: auditActor(input.actor),
        changes: [
          ...(current.name === saved.name
            ? []
            : [{ after: saved.name, before: current.name, field: "name" }]),
          ...(current.slugName === saved.slugName
            ? []
            : [
                {
                  after: saved.slugName,
                  before: current.slugName,
                  field: "slug",
                },
              ]),
          ...(JSON.stringify(current.formData) ===
          JSON.stringify(saved.formData)
            ? []
            : [{ field: "definition" }]),
        ],
        metadata: {
          questionCount: definition.questionCount,
          questionIds: definition.questionIds,
          questionTypes: definition.questionTypes,
          revision: saved.revision,
        },
        subjects: [
          {
            relation: "primary",
            targetId: saved.id,
            targetLabel: saved.name,
            targetType: "form",
          },
        ],
      },
      tx,
    );
    return saved;
  });
}

export async function updatePlatformFormSettings(input: {
  actor: PlatformFormActor;
  closesAt: Date | null;
  duesOnly: boolean;
  formId: string;
  manuallyClosed: boolean;
  opensAt: Date | null;
  respondentRoleIds: string[];
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  sectionId: string;
}) {
  const { form } = await requirePlatformFormCapability(
    input.actor,
    input.formId,
    "edit_definition",
  );
  if (form.kind !== "general") throw new TRPCError({ code: "BAD_REQUEST" });
  const { access, section } = await requireSection(
    input.actor,
    input.sectionId,
  );
  requireFormCapability(access, "edit_definition");
  if (input.opensAt && input.closesAt && input.closesAt <= input.opensAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Close time must be after open time.",
    });
  }
  const callback = await db.query.FormCallbackConfiguration.findFirst({
    columns: { id: true },
    where: eq(FormCallbackConfiguration.formId, form.id),
  });
  if (callback && input.responseMode === "single_editable") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Forms with callbacks require locked responses.",
    });
  }
  return db.transaction(async (tx) => {
    const previousRespondentRoles = await tx
      .select({ roleId: FormResponseRoles.roleId })
      .from(FormResponseRoles)
      .where(eq(FormResponseRoles.formId, form.id));
    const [saved] = await tx
      .update(FormsSchemas)
      .set({
        allowEdit: input.responseMode === "single_editable",
        allowResubmission: input.responseMode === "multiple_locked",
        closesAt: input.closesAt,
        duesOnly: input.duesOnly,
        isClosed: input.manuallyClosed,
        manuallyClosed: input.manuallyClosed,
        opensAt: input.opensAt,
        responseMode: input.responseMode,
        section: section.name,
        sectionId: section.id,
      })
      .where(eq(FormsSchemas.id, form.id))
      .returning();
    await tx
      .delete(FormResponseRoles)
      .where(eq(FormResponseRoles.formId, form.id));
    if (input.respondentRoleIds.length > 0) {
      await tx.insert(FormResponseRoles).values(
        input.respondentRoleIds.map((roleId) => ({
          formId: form.id,
          roleId,
        })),
      );
    }
    if (!saved) throw new TRPCError({ code: "NOT_FOUND" });
    const previousRoleIds = previousRespondentRoles
      .map(({ roleId }) => roleId)
      .sort();
    const nextRoleIds = [...input.respondentRoleIds].sort();
    const changes = [
      ...(form.responseMode === saved.responseMode
        ? []
        : [
            {
              after: saved.responseMode,
              before: form.responseMode,
              field: "responseMode",
            },
          ]),
      ...(form.opensAt?.toISOString() === saved.opensAt?.toISOString()
        ? []
        : [
            {
              after: saved.opensAt?.toISOString() ?? null,
              before: form.opensAt?.toISOString() ?? null,
              field: "opensAt",
            },
          ]),
      ...(form.closesAt?.toISOString() === saved.closesAt?.toISOString()
        ? []
        : [
            {
              after: saved.closesAt?.toISOString() ?? null,
              before: form.closesAt?.toISOString() ?? null,
              field: "closesAt",
            },
          ]),
      ...(form.manuallyClosed === saved.manuallyClosed
        ? []
        : [
            {
              after: saved.manuallyClosed,
              before: form.manuallyClosed,
              field: "manualClosure",
            },
          ]),
      ...(form.sectionId === saved.sectionId
        ? []
        : [
            {
              after: saved.sectionId,
              before: form.sectionId,
              field: "sectionId",
            },
          ]),
      ...(JSON.stringify(previousRoleIds) === JSON.stringify(nextRoleIds)
        ? []
        : [
            {
              after: nextRoleIds,
              before: previousRoleIds,
              field: "respondentRoleIds",
            },
          ]),
    ];
    await createAdminAuditEvent(
      {
        actionKey: "form.settings.updated",
        actor: auditActor(input.actor),
        changes,
        subjects: [
          {
            relation: "primary",
            targetId: saved.id,
            targetLabel: saved.name,
            targetType: "form",
          },
        ],
      },
      tx,
    );
    return saved;
  });
}

export async function changePlatformFormState(input: {
  actor: PlatformFormActor;
  expectedRevision: number;
  formId: string;
  targetState: "archived" | "published";
}) {
  const current = await db.query.FormsSchemas.findFirst({
    where: eq(FormsSchemas.id, input.formId),
  });
  if (current?.kind !== "general") throw new TRPCError({ code: "NOT_FOUND" });
  const { access } = await requireSection(input.actor, current.sectionId);
  requireFormCapability(access, "edit_definition");
  const definition = normalizeStoredFormDefinition(
    current.id,
    current.formData,
  );
  const next = transitionFormState({
    current: {
      archivedAt: current.archivedAt,
      definition,
      publishedAt: current.publishedAt,
      revision: current.revision,
      slug: current.slugName,
      state: current.state,
    },
    expectedRevision: input.expectedRevision,
    now: new Date(),
    targetState: input.targetState,
  });
  return db.transaction(async (tx) => {
    const [saved] = await tx
      .update(FormsSchemas)
      .set({
        archivedAt: next.archivedAt,
        formData: definition,
        isClosed: next.state === "archived",
        publishedAt: next.publishedAt,
        revision: next.revision,
        state: next.state,
      })
      .where(
        and(
          eq(FormsSchemas.id, current.id),
          eq(FormsSchemas.revision, input.expectedRevision),
        ),
      )
      .returning();
    if (!saved) throw new TRPCError({ code: "CONFLICT" });
    await createAdminAuditEvent(
      {
        actionKey:
          input.targetState === "published"
            ? "form.published"
            : "form.archived",
        actor: auditActor(input.actor),
        changes: [
          {
            after: saved.state,
            before: current.state,
            field: "state",
          },
        ],
        metadata: { revision: saved.revision },
        subjects: [
          {
            relation: "primary",
            targetId: saved.id,
            targetLabel: saved.name,
            targetType: "form",
          },
        ],
      },
      tx,
    );
    return saved;
  });
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
  const now = new Date();
  let status: "closed" | "open" | "scheduled" = "open";
  if (form.opensAt && now < form.opensAt) status = "scheduled";
  else if (
    form.state !== "published" ||
    form.manuallyClosed ||
    (form.closesAt && now >= form.closesAt)
  )
    status = "closed";
  const eligible =
    (!form.duesOnly || buildDuesStatus({ duesRows }).paid) &&
    (roleRows.length === 0 ||
      roleRows.some(({ roleId }) =>
        assignedRoles.some((row) => row.roleId === roleId),
      ));
  if (!eligible && !response) throw new TRPCError({ code: "FORBIDDEN" });
  const definition = normalizeStoredFormDefinition(form.id, form.formData);
  const normalizedResponse = response
    ? normalizeStoredFormResponse({
        currentDefinition: form.formData,
        formId: form.id,
        rawAnswers: response.responseData,
        rawSnapshot: response.responseSnapshot,
      })
    : null;
  return {
    definition,
    form: {
      closesAt: form.closesAt,
      id: form.id,
      name: form.name,
      opensAt: form.opensAt,
      responseMode: form.responseMode,
      slugName: form.slugName,
    },
    respondentState: response
      ? {
          answers: normalizedResponse?.answers ?? {},
          editable:
            form.responseMode === "single_editable" && status === "open",
          responseId: response.id,
          status: "submitted" as const,
          submittedAt: response.createdAt,
        }
      : status === "scheduled"
        ? { opensAt: form.opensAt, status: "scheduled" as const }
        : status === "closed"
          ? {
              closedAt: form.closesAt,
              reason: form.manuallyClosed
                ? ("manual" as const)
                : ("schedule" as const),
              status: "closed" as const,
            }
          : { status: "open" as const },
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

export async function provisionFormSection(input: {
  actor: PlatformFormActor;
  editorRoleIds: string[];
  name: string;
  viewerRoleIds: string[];
}) {
  if (!input.actor.permissions.IS_OFFICER)
    throw new TRPCError({ code: "FORBIDDEN" });
  return db.transaction(async (tx) => {
    const [section] = await tx
      .insert(FormSections)
      .values({ name: input.name })
      .returning();
    if (!section) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (input.viewerRoleIds.length > 0)
      await tx.insert(FormSectionViewRole).values(
        input.viewerRoleIds.map((roleId) => ({
          roleId,
          sectionId: section.id,
        })),
      );
    if (input.editorRoleIds.length > 0)
      await tx.insert(FormSectionEditRole).values(
        input.editorRoleIds.map((roleId) => ({
          roleId,
          sectionId: section.id,
        })),
      );
    await createAdminAuditEvent(
      {
        actionKey: "form.section.created",
        actor: auditActor(input.actor),
        metadata: {
          editorRoleIds: input.editorRoleIds,
          name: section.name,
          viewerRoleIds: input.viewerRoleIds,
        },
        subjects: [
          {
            relation: "primary",
            targetId: section.id,
            targetLabel: section.name,
            targetType: "form_section",
          },
        ],
      },
      tx,
    );
    return section;
  });
}

export async function visibleSections(actor: PlatformFormActor) {
  const policies = await sectionPolicies();
  return policies.filter((section) => {
    const access = evaluateFormSectionAccess(actor, section);
    return access.canRead || access.canEdit || access.canReadResponses;
  });
}

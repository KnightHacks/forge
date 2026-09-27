import { TRPCError } from "@trpc/server";

import { and, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  FormAttachment,
  FormCallbackConfiguration,
  FormResponse,
  FormResponseRoles,
  FormsSchemas,
} from "@forge/db/schemas/knight-hacks";
import {
  callbackConfigurationSchema,
  formDefinitionSchema,
} from "@forge/validators";

import type { PlatformFormActor } from "./actor";
import { createAdminAuditEvent } from "../audit/service";
import { evaluateFormSectionAccess, requireFormCapability } from "./access";
import { auditActor } from "./actor";
import { removeFormAttachmentObjects } from "./attachments";
import {
  applyFormDefinitionMutation,
  transitionFormState,
} from "./definitions";
import {
  normalizeStoredFormDefinition,
  normalizeStoredFormResponse,
} from "./legacy";
import {
  requirePlatformFormCapability,
  requireSection,
  sectionPolicies,
} from "./sections";

function safeDefinitionSummary(value: unknown) {
  const parsed = formDefinitionSchema.parse(value);
  return {
    questionCount: parsed.questions.length,
    questionIds: parsed.questions.map(({ id }) => id),
    questionTypes: parsed.questions.map(({ type }) => type),
  };
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
    const previousDefinition = normalizeStoredFormDefinition(
      current.id,
      current.formData,
    );
    const nextDefinition = formDefinitionSchema.parse(next.definition);
    const expectedPurposes = new Map<string, "banner" | "instruction">();
    const previousInstructionIds = new Set(
      previousDefinition.instructions
        .filter((instruction) => instruction.type !== "text")
        .map((instruction) => instruction.attachmentId),
    );
    nextDefinition.instructions
      .filter((instruction) => instruction.type !== "text")
      .map((instruction) => instruction.attachmentId)
      .filter((attachmentId) => !previousInstructionIds.has(attachmentId))
      .forEach((attachmentId) =>
        expectedPurposes.set(attachmentId, "instruction"),
      );
    if (
      nextDefinition.banner &&
      nextDefinition.banner.attachmentId !==
        previousDefinition.banner?.attachmentId
    ) {
      expectedPurposes.set(nextDefinition.banner.attachmentId, "banner");
    }
    const addedAttachmentIds = [...expectedPurposes.keys()];
    if (addedAttachmentIds.length > 0) {
      const attachments = await tx
        .select({
          finalizedAt: FormAttachment.finalizedAt,
          formId: FormAttachment.formId,
          id: FormAttachment.id,
          purpose: FormAttachment.purpose,
        })
        .from(FormAttachment)
        .where(inArray(FormAttachment.id, addedAttachmentIds));
      if (
        attachments.length !== addedAttachmentIds.length ||
        attachments.some(
          (attachment) =>
            attachment.formId !== current.id ||
            attachment.purpose !== expectedPurposes.get(attachment.id) ||
            !attachment.finalizedAt,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more form media uploads are invalid.",
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

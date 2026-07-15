import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";

import { FORMS } from "@forge/consts";
import { and, eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/auth";
import {
  FormAttachment,
  FormCallbackConfiguration,
  FormCallbackExecution,
  FormResponse,
  FormSectionEditRole,
  FormSections,
  FormSectionViewRole,
  FormsSchemas,
} from "@forge/db/schemas/knight-hacks";
import { formDefinitionSchema } from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import {
  createFormAttachmentUpload,
  finalizeFormAttachment,
  getFormAttachmentDownloadUrl,
  getLegacyFormFileDownloadUrl,
  mimeTypeAllowed,
} from "../utils/forms/attachments";
import { listFormCallbackCatalog } from "../utils/forms/callbacks";
import {
  codeOwnedFormConfigs,
  formResponseCallbacks,
} from "../utils/forms/config";
import {
  dispatchFormCallbackExecution,
  saveFormCallbackConfiguration,
} from "../utils/forms/database-callbacks";
import {
  createResponse,
  createResponseInputSchema,
  getFormBySlug,
  updateResponse,
  updateResponseInputSchema,
} from "../utils/forms/manager";
import {
  changePlatformFormState,
  createPlatformForm,
  deletePlatformForm,
  deletePlatformResponse,
  exportPlatformResponses,
  getAdminPlatformForm,
  listAdminForms,
  listPlatformResponses,
  loadPlatformFormActor,
  memberFormHistory,
  provisionFormSection,
  requirePlatformFormCapability,
  respondentForm,
  updatePlatformForm,
  updatePlatformFormSettings,
  visibleSections,
} from "../utils/forms/platform";
import { formCallbackRegistry } from "../utils/forms/registry";
import { isSelectableProductRole } from "../utils/roles/selectable";

const responseModes = [
  "single_locked",
  "single_editable",
  "multiple_locked",
] as const;

function containsExactValue(value: unknown, expected: string): boolean {
  if (value === expected) return true;
  if (Array.isArray(value)) {
    return value.some((entry) => containsExactValue(entry, expected));
  }
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).some((entry) => containsExactValue(entry, expected))
  );
}

function requireCallbackPermission(
  permissions: Awaited<ReturnType<typeof loadPlatformFormActor>>["permissions"],
  callbackSlug: string,
) {
  const definition = formCallbackRegistry.get(callbackSlug);
  if (!definition) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Callback is no longer registered.",
    });
  }
  if (!permissions.IS_OFFICER && !permissions[definition.requiredPermission]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${definition.requiredPermission} is required to manage this callback.`,
    });
  }
}
const formCreateInput = z
  .object({
    closesAt: z.coerce.date().nullable(),
    definition: formDefinitionSchema,
    duesOnly: z.boolean(),
    name: z.string().trim().min(1).max(255),
    opensAt: z.coerce.date().nullable(),
    respondentRoleIds: z.array(z.string().uuid()).max(100),
    responseMode: z.enum(responseModes),
    sectionId: z.string().uuid(),
    slugName: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(255),
  })
  .strict()
  .refine(
    ({ closesAt, opensAt }) => !closesAt || !opensAt || closesAt > opensAt,
    { message: "Close time must be after open time.", path: ["closesAt"] },
  );
function catalogValue(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const formsRouter = {
  createUpload: permProcedure
    .input(
      z
        .object({
          contentType: z.string().trim().min(1).max(255),
          fileName: z.string().trim().min(1).max(255),
          formId: z.string().uuid(),
          purpose: z.enum(["instruction", "response"]),
          questionId: z.string().uuid().optional(),
          size: z.number().int().positive(),
        })
        .superRefine((input, ctx) => {
          if (input.purpose === "response" && !input.questionId) {
            ctx.addIssue({
              code: "custom",
              message: "Response uploads require a question ID.",
              path: ["questionId"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const form = await db.query.FormsSchemas.findFirst({
        where: eq(FormsSchemas.id, input.formId),
      });
      if (!form) throw new Error("Form not found.");
      if (input.purpose === "instruction") {
        await requirePlatformFormCapability(
          await loadPlatformFormActor(ctx.session),
          form.id,
          "edit_definition",
        );
      } else {
        const state = await respondentForm(form.slugName, ctx.session.user.id);
        const canUpload =
          state.respondentState.status === "open" ||
          (state.respondentState.status === "submitted" &&
            state.respondentState.editable);
        if (!canUpload) {
          throw new Error("This form is not accepting response uploads.");
        }
        const definition = formDefinitionSchema.parse(state.definition);
        const question = definition.questions.find(
          (candidate) => candidate.id === input.questionId,
        );
        if (
          question?.type !== "file" ||
          question.retired ||
          input.size > question.maxBytes ||
          !mimeTypeAllowed(input.contentType, question.allowedMimeTypes)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This file does not match the question's upload limits.",
          });
        }
      }
      return createFormAttachmentUpload({
        ...input,
        ownerUserId: ctx.session.user.id,
      });
    }),

  finalizeUpload: protectedProcedure
    .input(z.object({ attachmentId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      finalizeFormAttachment({
        attachmentId: input.attachmentId,
        ownerUserId: ctx.session.user.id,
      }),
    ),

  getAttachmentDownload: permProcedure
    .input(z.object({ attachmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const attachment = await db.query.FormAttachment.findFirst({
        where: eq(FormAttachment.id, input.attachmentId),
      });
      if (!attachment) throw new Error("Attachment not found.");
      if (attachment.ownerUserId !== ctx.session.user.id) {
        const form = await db.query.FormsSchemas.findFirst({
          where: eq(FormsSchemas.id, attachment.formId),
        });
        const definition = formDefinitionSchema.safeParse(form?.formData);
        const isPublishedInstruction =
          attachment.responseId === null &&
          form?.state === "published" &&
          definition.success &&
          definition.data.instructions.some(
            (instruction) =>
              instruction.type !== "text" &&
              instruction.attachmentId === attachment.id,
          );
        if (isPublishedInstruction) {
          await respondentForm(form.slugName, ctx.session.user.id);
        } else {
          await requirePlatformFormCapability(
            await loadPlatformFormActor(ctx.session),
            attachment.formId,
            "read_responses",
          );
        }
      }
      const result = await getFormAttachmentDownloadUrl(input.attachmentId);
      return { url: result.url };
    }),

  getLegacyAttachmentDownload: permProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        objectName: z.string().trim().min(1).max(512),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (
        !input.objectName.startsWith(`${input.formId}/files/`) ||
        input.objectName.includes("..") ||
        input.objectName.includes("\\") ||
        input.objectName.includes("\0")
      ) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      const responses = await db
        .select({
          responseData: FormResponse.responseData,
          userId: FormResponse.userId,
        })
        .from(FormResponse)
        .where(eq(FormResponse.form, input.formId));
      const references = responses.filter(({ responseData }) =>
        containsExactValue(responseData, input.objectName),
      );
      if (references.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (!references.some(({ userId }) => userId === ctx.session.user.id)) {
        await requirePlatformFormCapability(
          await loadPlatformFormActor(ctx.session),
          input.formId,
          "read_responses",
        );
      }
      return { url: await getLegacyFormFileDownloadUrl(input.objectName) };
    }),

  searchCatalog: protectedProcedure
    .input(
      z.object({
        catalogId: z.enum(
          Object.keys(FORMS.AVAILABLE_DROPDOWN_CONSTANTS) as [
            FORMS.DropdownConstantKey,
            ...FORMS.DropdownConstantKey[],
          ],
        ),
        query: z.string().trim().max(100).default(""),
      }),
    )
    .query(({ input }) => {
      const query = input.query.toLocaleLowerCase();
      return FORMS.getDropdownOptionsFromConst(input.catalogId)
        .filter((label) => !query || label.toLocaleLowerCase().includes(query))
        .slice(0, 50)
        .map((label) => ({
          active: true,
          label,
          value: catalogValue(label),
        }));
    }),

  listAdmin: permProcedure.query(async ({ ctx }) => {
    const actor = await loadPlatformFormActor(ctx.session);
    return {
      forms: await listAdminForms(actor),
      sections: await visibleSections(actor),
    };
  }),

  sectionProvisioning: permProcedure.query(async ({ ctx }) => {
    if (!ctx.session.permissions.IS_OFFICER) {
      throw new Error("Only officers may provision form sections.");
    }
    const [sections, viewers, editors, roles] = await Promise.all([
      db.select().from(FormSections),
      db.select().from(FormSectionViewRole),
      db.select().from(FormSectionEditRole),
      db
        .select({
          discordRoleId: Roles.discordRoleId,
          id: Roles.id,
          name: Roles.name,
        })
        .from(Roles),
    ]);
    return {
      roles: roles
        .filter(isSelectableProductRole)
        .map(({ id, name }) => ({ id, name })),
      sections: sections.map((section) => ({
        ...section,
        editorRoleIds: editors
          .filter((row) => row.sectionId === section.id)
          .map(({ roleId }) => roleId),
        viewerRoleIds: viewers
          .filter((row) => row.sectionId === section.id)
          .map(({ roleId }) => roleId),
      })),
    };
  }),

  listCallbacks: permProcedure.query(({ ctx }) =>
    listFormCallbackCatalog(formCallbackRegistry, ctx.session.permissions),
  ),

  listRespondentRoles: permProcedure.query(async ({ ctx }) => {
    const actor = await loadPlatformFormActor(ctx.session);
    if ((await visibleSections(actor)).length === 0) {
      throw new Error("You do not have access to the forms workspace.");
    }
    const roles = await db
      .select({
        discordRoleId: Roles.discordRoleId,
        id: Roles.id,
        name: Roles.name,
      })
      .from(Roles)
      .orderBy(Roles.name);
    return roles
      .filter(isSelectableProductRole)
      .map(({ id, name }) => ({ id, name }));
  }),

  getShareAssets: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { form } = await requirePlatformFormCapability(
        await loadPlatformFormActor(ctx.session),
        input.formId,
        "read_definition",
      );
      const host =
        ctx.headers.get("x-forwarded-host") ??
        ctx.headers.get("host") ??
        "localhost:3000";
      const protocol =
        ctx.headers.get("x-forwarded-proto") ??
        (host.startsWith("localhost") ? "http" : "https");
      const canonicalUrl = `${protocol}://${host}/form/${encodeURIComponent(form.slugName)}`;
      return {
        canonicalUrl,
        qrPngDataUrl: await QRCode.toDataURL(canonicalUrl, {
          errorCorrectionLevel: "H",
          margin: 2,
          type: "image/png",
          width: 640,
        }),
      };
    }),

  configureCallback: permProcedure
    .input(
      z.object({
        callbackSlug: z.string().trim().min(1).max(255),
        formId: z.string().uuid(),
        mappings: z.array(z.unknown()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await loadPlatformFormActor(ctx.session);
      const { form } = await requirePlatformFormCapability(
        actor,
        input.formId,
        "edit_definition",
      );
      if (form.kind !== "general" || form.responseMode === "single_editable") {
        throw new Error("Callbacks require a locked general form.");
      }
      return saveFormCallbackConfiguration({
        ...input,
        formDefinition: form.formData,
        permissions: actor.permissions,
        responseMode: form.responseMode,
      });
    }),

  listCallbackExecutions: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requirePlatformFormCapability(
        await loadPlatformFormActor(ctx.session),
        input.formId,
        "read_responses",
      );
      return db
        .select({
          attempts: FormCallbackExecution.attempts,
          callbackSlug: FormCallbackExecution.callbackSlug,
          createdAt: FormCallbackExecution.createdAt,
          id: FormCallbackExecution.id,
          lastError: FormCallbackExecution.lastError,
          responseId: FormCallbackExecution.responseId,
          status: FormCallbackExecution.status,
          updatedAt: FormCallbackExecution.updatedAt,
        })
        .from(FormCallbackExecution)
        .innerJoin(
          FormCallbackConfiguration,
          eq(
            FormCallbackExecution.configurationId,
            FormCallbackConfiguration.id,
          ),
        )
        .where(eq(FormCallbackConfiguration.formId, input.formId));
    }),

  retryCallback: permProcedure
    .input(z.object({ executionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await db
        .select({
          callbackSlug: FormCallbackExecution.callbackSlug,
          formId: FormCallbackConfiguration.formId,
          responseId: FormCallbackExecution.responseId,
        })
        .from(FormCallbackExecution)
        .innerJoin(
          FormCallbackConfiguration,
          eq(
            FormCallbackExecution.configurationId,
            FormCallbackConfiguration.id,
          ),
        )
        .where(eq(FormCallbackExecution.id, input.executionId))
        .then((rows) => rows[0]);
      if (!row) throw new Error("Callback execution not found.");
      if (!row.responseId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Callbacks for deleted responses cannot be retried.",
        });
      }
      const actor = await loadPlatformFormActor(ctx.session);
      await requirePlatformFormCapability(actor, row.formId, "edit_definition");
      requireCallbackPermission(actor.permissions, row.callbackSlug);
      return dispatchFormCallbackExecution(input.executionId);
    }),

  disableCallback: permProcedure
    .input(
      z.object({
        callbackSlug: z.string().trim().min(1),
        formId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await loadPlatformFormActor(ctx.session);
      await requirePlatformFormCapability(
        actor,
        input.formId,
        "edit_definition",
      );
      requireCallbackPermission(actor.permissions, input.callbackSlug);
      const [saved] = await db
        .update(FormCallbackConfiguration)
        .set({ active: false, updatedAt: new Date() })
        .where(
          and(
            eq(FormCallbackConfiguration.formId, input.formId),
            eq(FormCallbackConfiguration.callbackSlug, input.callbackSlug),
          ),
        )
        .returning();
      if (!saved) throw new Error("Callback configuration not found.");
      return saved;
    }),

  createForm: permProcedure
    .input(formCreateInput)
    .mutation(async ({ ctx, input }) =>
      createPlatformForm({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  getAdminForm: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      getAdminPlatformForm(
        await loadPlatformFormActor(ctx.session),
        input.formId,
      ),
    ),

  listResponses: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      listPlatformResponses(
        await loadPlatformFormActor(ctx.session),
        input.formId,
      ),
    ),

  updateForm: permProcedure
    .input(
      z.object({
        definition: formDefinitionSchema,
        expectedRevision: z.number().int().positive(),
        formId: z.string().uuid(),
        name: z.string().trim().min(1).max(255),
        slugName: z.string().trim().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      updatePlatformForm({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  updateSettings: permProcedure
    .input(
      z
        .object({
          closesAt: z.coerce.date().nullable(),
          duesOnly: z.boolean(),
          formId: z.string().uuid(),
          manuallyClosed: z.boolean(),
          opensAt: z.coerce.date().nullable(),
          respondentRoleIds: z.array(z.string().uuid()).max(100),
          responseMode: z.enum(responseModes),
          sectionId: z.string().uuid(),
        })
        .refine(
          ({ closesAt, opensAt }) =>
            !closesAt || !opensAt || closesAt > opensAt,
          {
            message: "Close time must be after open time.",
            path: ["closesAt"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) =>
      updatePlatformFormSettings({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  deleteResponse: permProcedure
    .input(
      z.object({ formId: z.string().uuid(), responseId: z.string().uuid() }),
    )
    .mutation(async ({ ctx, input }) =>
      deletePlatformResponse({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  deleteForm: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      deletePlatformForm({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  changeState: permProcedure
    .input(
      z.object({
        expectedRevision: z.number().int().positive(),
        formId: z.string().uuid(),
        targetState: z.enum(["archived", "published"]),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      changePlatformFormState({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  createSection: permProcedure
    .input(
      z.object({
        editorRoleIds: z.array(z.string().uuid()).max(100),
        name: z.string().trim().min(1).max(255),
        viewerRoleIds: z.array(z.string().uuid()).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      provisionFormSection({
        ...input,
        actor: await loadPlatformFormActor(ctx.session),
      }),
    ),

  updateSection: permProcedure
    .input(
      z.object({
        editorRoleIds: z.array(z.string().uuid()).max(100),
        name: z.string().trim().min(1).max(255),
        sectionId: z.string().uuid(),
        viewerRoleIds: z.array(z.string().uuid()).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.permissions.IS_OFFICER) {
        throw new Error("Only officers may provision form sections.");
      }
      return db.transaction(async (tx) => {
        const [section] = await tx
          .update(FormSections)
          .set({ name: input.name })
          .where(eq(FormSections.id, input.sectionId))
          .returning();
        if (!section) throw new Error("Section not found.");
        await Promise.all([
          tx
            .delete(FormSectionViewRole)
            .where(eq(FormSectionViewRole.sectionId, section.id)),
          tx
            .delete(FormSectionEditRole)
            .where(eq(FormSectionEditRole.sectionId, section.id)),
        ]);
        if (input.viewerRoleIds.length > 0) {
          await tx.insert(FormSectionViewRole).values(
            input.viewerRoleIds.map((roleId) => ({
              roleId,
              sectionId: section.id,
            })),
          );
        }
        if (input.editorRoleIds.length > 0) {
          await tx.insert(FormSectionEditRole).values(
            input.editorRoleIds.map((roleId) => ({
              roleId,
              sectionId: section.id,
            })),
          );
        }
        return section;
      });
    }),

  memberHistory: protectedProcedure.query(({ ctx }) =>
    memberFormHistory(ctx.session.user.id),
  ),

  getRespondentForm: protectedProcedure
    .input(
      z.object({
        responseId: z.string().uuid().optional(),
        slugName: z.string(),
      }),
    )
    .query(({ ctx, input }) =>
      respondentForm(
        decodeURIComponent(input.slugName),
        ctx.session.user.id,
        input.responseId,
      ),
    ),

  exportResponses: permProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      exportPlatformResponses(
        await loadPlatformFormActor(ctx.session),
        input.formId,
      ),
    ),

  getForm: protectedProcedure
    .input(z.object({ slugName: z.string() }))
    .query(async ({ input }) => {
      return await getFormBySlug({
        codeOwnedForms: codeOwnedFormConfigs,
        slugName: input.slugName,
      });
    }),

  createResponse: protectedProcedure
    .input(createResponseInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await createResponse({
        callbacks: formResponseCallbacks,
        codeOwnedForms: codeOwnedFormConfigs,
        input,
        session: ctx.session,
      });
    }),

  updateResponse: protectedProcedure
    .input(updateResponseInputSchema)
    .mutation(({ ctx, input }) =>
      updateResponse({
        codeOwnedForms: codeOwnedFormConfigs,
        input,
        session: ctx.session,
      }),
    ),
} satisfies TRPCRouterRecord;

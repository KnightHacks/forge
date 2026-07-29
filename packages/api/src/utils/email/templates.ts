import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { VisualEmailDocument } from "@forge/email";
import { and, desc, eq, inArray, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailTemplate,
  EmailTemplateRevision,
} from "@forge/db/schemas/knight-hacks";
import {
  compileCodeEmailTemplate,
  compileVisualEmailTemplate,
} from "@forge/email";
import { emailSaveTemplateSchema } from "@forge/validators";

import type { AuditActor } from "../audit/service";
import { createAdminAuditEvent } from "../audit/service";

export const DEFAULT_TEMPLATE_SAMPLE = {
  hacker: { status: "confirmed" },
  hackathon: {
    displayName: "BloomKnights",
    name: "bloomknights",
  },
  member: { graduationYear: 2027 },
  recipient: {
    email: "preview@example.test",
    firstName: "Dylan",
    name: "Dylan Vidal",
  },
  team: { roleNames: ["Design", "Development"] },
};

export function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeTemplateName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function safeBadRequest(error: unknown): never {
  throw new TRPCError({
    cause: error,
    code: "BAD_REQUEST",
    message:
      error instanceof Error
        ? error.message
        : "The email template could not be compiled.",
  });
}

export function compileDraft(
  input:
    | { kind: "code"; source: string }
    | { kind: "visual"; visualDocument: Record<string, unknown> },
  sample: Record<string, unknown> = DEFAULT_TEMPLATE_SAMPLE,
  providerNamespace?: string,
) {
  try {
    return input.kind === "code"
      ? compileCodeEmailTemplate({
          providerNamespace,
          sample,
          source: input.source,
        })
      : compileVisualEmailTemplate({
          document: input.visualDocument as unknown as VisualEmailDocument,
          providerNamespace,
          sample,
        });
  } catch (error) {
    safeBadRequest(error);
  }
}

export async function findTemplate(templateId: string) {
  return db.query.EmailTemplate.findFirst({
    where: eq(EmailTemplate.id, templateId),
  });
}

export async function findLatestRevision(
  templateId: string,
  states?: ("draft" | "published" | "superseded")[],
) {
  return db.query.EmailTemplateRevision.findFirst({
    where: states?.length
      ? and(
          eq(EmailTemplateRevision.templateId, templateId),
          inArray(EmailTemplateRevision.state, states),
        )
      : eq(EmailTemplateRevision.templateId, templateId),
    orderBy: [desc(EmailTemplateRevision.version)],
  });
}

export function revisionSource(
  template: typeof EmailTemplate.$inferSelect,
  revision: typeof EmailTemplateRevision.$inferSelect,
) {
  if (template.kind === "code" && revision.source) {
    return { kind: "code" as const, source: revision.source };
  }
  if (template.kind === "visual" && revision.visualDocument) {
    return {
      kind: "visual" as const,
      visualDocument: revision.visualDocument as Record<string, unknown>,
    };
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "The template source is incomplete.",
  });
}

export async function listTemplateRecords({
  includeArchived,
  limit,
}: {
  includeArchived: boolean;
  limit: number;
}) {
  const templates = await db
    .select()
    .from(EmailTemplate)
    .where(includeArchived ? undefined : isNull(EmailTemplate.archivedAt))
    .orderBy(desc(EmailTemplate.updatedAt))
    .limit(limit);
  return Promise.all(
    templates.map(async (template) => {
      const [revision, publishedRevision] = await Promise.all([
        findLatestRevision(template.id),
        findLatestRevision(template.id, ["published"]),
      ]);
      return {
        ...template,
        latestRevision: revision
          ? {
              id: revision.id,
              publishedAt: revision.publishedAt,
              state: revision.state,
              version: revision.version,
            }
          : null,
        publishedRevision: publishedRevision
          ? {
              id: publishedRevision.id,
              version: publishedRevision.version,
            }
          : null,
      };
    }),
  );
}

export async function saveTemplateDraft(
  input: ReturnType<typeof emailSaveTemplateSchema.parse>,
  actor: AuditActor,
  duplicateSource?: { id: string; name: string },
) {
  const compiled = compileDraft(input);
  const normalizedName = normalizeTemplateName(input.name);
  const actorId = actor.id;

  return db.transaction(async (tx) => {
    const [nameConflict] = await tx
      .select({ id: EmailTemplate.id })
      .from(EmailTemplate)
      .where(
        and(
          eq(EmailTemplate.normalizedName, normalizedName),
          isNull(EmailTemplate.archivedAt),
          input.id ? ne(EmailTemplate.id, input.id) : undefined,
        ),
      )
      .limit(1);
    if (nameConflict) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An active email template already uses this name.",
      });
    }

    let template: typeof EmailTemplate.$inferSelect | undefined;
    let previousTemplate: typeof EmailTemplate.$inferSelect | undefined;
    if (input.id) {
      [previousTemplate] = await tx
        .select()
        .from(EmailTemplate)
        .where(
          and(eq(EmailTemplate.id, input.id), isNull(EmailTemplate.archivedAt)),
        )
        .limit(1)
        .for("update");
      if (!previousTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
      [template] = await tx
        .update(EmailTemplate)
        .set({
          kind: input.kind,
          name: input.name,
          normalizedName,
          updatedBy: actorId,
        })
        .where(
          and(eq(EmailTemplate.id, input.id), isNull(EmailTemplate.archivedAt)),
        )
        .returning();
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
    } else {
      [template] = await tx
        .insert(EmailTemplate)
        .values({
          createdBy: actorId,
          kind: input.kind,
          name: input.name,
          normalizedName,
          updatedBy: actorId,
        })
        .returning();
    }
    if (!template) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The template could not be saved.",
      });
    }

    const [versionRow] = await tx
      .select({
        nextVersion: sql<number>`COALESCE(MAX(${EmailTemplateRevision.version}), 0) + 1`,
      })
      .from(EmailTemplateRevision)
      .where(eq(EmailTemplateRevision.templateId, template.id));
    await tx
      .update(EmailTemplateRevision)
      .set({ state: "superseded" })
      .where(
        and(
          eq(EmailTemplateRevision.templateId, template.id),
          eq(EmailTemplateRevision.state, "draft"),
        ),
      );
    const [revision] = await tx
      .insert(EmailTemplateRevision)
      .values({
        checksum: hashValue(compiled),
        compiledHtml: compiled.html,
        compiledText: compiled.text,
        createdBy: actorId,
        personalizationContract: compiled.contract,
        source: input.kind === "code" ? input.source : null,
        state: "draft",
        templateId: template.id,
        version: Number(versionRow?.nextVersion ?? 1),
        visualDocument: input.kind === "visual" ? input.visualDocument : null,
      })
      .returning();
    if (!revision) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "The email template revision could not be saved.",
      });
    }
    const actionKey = duplicateSource
      ? "email.template.duplicated"
      : previousTemplate
        ? "email.template.draft_saved"
        : "email.template.created";
    await createAdminAuditEvent(
      {
        actionKey,
        actor,
        changes:
          actionKey === "email.template.draft_saved" && previousTemplate
            ? [
                ...(previousTemplate.name === template.name
                  ? []
                  : [
                      {
                        after: template.name,
                        before: previousTemplate.name,
                        field: "name",
                      },
                    ]),
                ...(previousTemplate.kind === template.kind
                  ? []
                  : [
                      {
                        after: template.kind,
                        before: previousTemplate.kind,
                        field: "kind",
                      },
                    ]),
              ]
            : undefined,
        metadata: {
          kind: template.kind,
          revisionVersion: revision.version,
          ...(duplicateSource ? { sourceTemplateId: duplicateSource.id } : {}),
        },
        subjects: [
          {
            relation: "primary",
            targetId: template.id,
            targetLabel: template.name,
            targetType: "email_template",
          },
          ...(duplicateSource
            ? [
                {
                  relation: "secondary" as const,
                  targetId: duplicateSource.id,
                  targetLabel: duplicateSource.name,
                  targetType: "email_template" as const,
                },
              ]
            : []),
        ],
      },
      tx,
    );
    return { revision, template };
  });
}

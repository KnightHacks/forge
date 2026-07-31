import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { VisualEmailDocument } from "@forge/email";
import { and, desc, eq, inArray, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailTemplate,
  EmailTemplateRevision,
  Hackathon,
  HackathonStatusEmail,
} from "@forge/db/schemas/knight-hacks";
import {
  compileCodeEmailTemplate,
  compileVisualEmailTemplate,
} from "@forge/email";
import { formatHackathonDate } from "@forge/email/fields";
import { emailSaveTemplateSchema } from "@forge/validators";

import type { AuditActor } from "../audit/service";
import type { WriteDb } from "../db";
import { createAdminAuditEvent } from "../audit/service";

/**
 * Every field `PERSONALIZATION_FIELDS` offers must appear here, or a preview
 * silently renders it blank. The dates are the reason: an officer previewing
 * "[DUE {{hackathon.confirmationDeadline}}]" saw "[DUE ]" and had no way to
 * tell that from a template bug.
 *
 * Dates are pre-formatted strings, matching what the send path supplies — a
 * subject cannot format a timestamp.
 *
 * They go through `formatHackathonDate` rather than being written out as
 * literals that happen to look like its output. Hand-written literals are how a
 * preview quietly starts lying: change the formatter and the officer still
 * approves "Oct 3, 2026" while the applicant receives something else. This is
 * also what makes that function's placement in `@forge/email` correct — it now
 * has a consumer on each side of the promise.
 */
export const DEFAULT_TEMPLATE_SAMPLE = {
  hacker: { status: "confirmed" },
  hackathon: {
    applicationUrl: "https://bloomknights.org/apply",
    confirmationDeadline: formatHackathonDate("2026-10-03T00:00:00.000Z"),
    displayName: "BloomKnights",
    endDate: formatHackathonDate("2026-10-11T00:00:00.000Z"),
    name: "bloomknights",
    startDate: formatHackathonDate("2026-10-09T00:00:00.000Z"),
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
  // Omitted means "unscoped". Every caller in this package passes one, so a
  // save is always compiled against the template's own domain and club fields
  // cannot leak into hackathon mail. It stays optional only so the compiler
  // keeps working for callers that predate the column — its own tests.
  domain?: "club" | "hackathon",
) {
  try {
    return input.kind === "code"
      ? compileCodeEmailTemplate({
          domain,
          providerNamespace,
          sample,
          source: input.source,
        })
      : compileVisualEmailTemplate({
          document: input.visualDocument as unknown as VisualEmailDocument,
          domain,
          providerNamespace,
          sample,
        });
  } catch (error) {
    safeBadRequest(error);
  }
}

/**
 * Hackathons that have this template bound to one of their statuses.
 *
 * `HackathonStatusEmail.templateId` is `ON DELETE restrict`, which guards hard
 * deletes only. Archiving is a soft delete and changing `domain` is an update,
 * so both walk straight past the foreign key and leave a hackathon reporting
 * itself configured against mail it can no longer send.
 */
export async function templateBindings(
  templateId: string,
  executor: WriteDb = db,
) {
  return executor
    .select({
      displayName: Hackathon.displayName,
      status: HackathonStatusEmail.status,
    })
    .from(HackathonStatusEmail)
    .innerJoin(Hackathon, eq(Hackathon.id, HackathonStatusEmail.hackathonId))
    .where(eq(HackathonStatusEmail.templateId, templateId));
}

function describeBindings(
  bindings: { displayName: string; status: string }[],
): string {
  return bindings
    .map((binding) => `${binding.displayName} (${binding.status})`)
    .join(", ");
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
  domain,
  includeArchived,
  limit,
}: {
  domain?: "club" | "hackathon";
  includeArchived: boolean;
  limit: number;
}) {
  const templates = await db
    .select()
    .from(EmailTemplate)
    .where(
      and(
        includeArchived ? undefined : isNull(EmailTemplate.archivedAt),
        domain ? eq(EmailTemplate.domain, domain) : undefined,
      ),
    )
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
  // Compiled against the template's own domain, so a hackathon template
  // referencing `member.*` or `team.*` is rejected at save rather than
  // rendering blank for a hacker who is not a club member.
  const compiled = compileDraft(
    input,
    DEFAULT_TEMPLATE_SAMPLE,
    undefined,
    input.domain,
  );
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
      if (previousTemplate.domain !== input.domain) {
        const bindings = await templateBindings(input.id, tx);
        if (bindings.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `This template is used by ${describeBindings(bindings)}. Unbind it there before changing what it is used for.`,
          });
        }
      }

      [template] = await tx
        .update(EmailTemplate)
        .set({
          domain: input.domain,
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
          domain: input.domain,
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

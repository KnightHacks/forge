import { randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, asc, desc, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Roles, User } from "@forge/db/schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  EmailTemplate,
  EmailTemplateRevision,
  Hackathon,
} from "@forge/db/schemas/knight-hacks";
import { getDefaultEmailProviderGateway } from "@forge/email";
import {
  emailConfirmSendSchema,
  emailPreviewSendSchema,
  emailResolveAudienceSchema,
  emailSaveTemplateSchema,
  emailSendIdSchema,
  emailSendListSchema,
  emailSendTestSchema,
  emailTemplateIdSchema,
  emailTemplateListSchema,
  emailTemplatePreviewSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { requireEmailPortal } from "../utils/email/access";
import {
  confirmSend,
  loadAudienceCandidates,
  previewSend,
} from "../utils/email/campaign";
import {
  campaignAudienceScope,
  processEmailSend,
  reconcileEmailSend,
} from "../utils/email/delivery";
import { canRetryEmailSend } from "../utils/email/lifecycle";
import {
  compileDraft,
  DEFAULT_TEMPLATE_SAMPLE,
  findLatestRevision,
  findTemplate,
  listTemplateRecords,
  revisionSource,
  saveTemplateDraft,
  templateBindings,
} from "../utils/email/templates";

export const emailRouter = {
  archiveTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return db.transaction(async (tx) => {
        // Lock the template before reading its bindings, matching
        // `saveTemplateDraft`. Without this the binding check is an unlocked
        // read: `hackathon.setStatusEmail` takes `FOR UPDATE` on this row, so a
        // bind committing between this read and the archive below would be
        // invisible here and the archive would still win — leaving a hackathon
        // reporting itself configured against mail the portal calls retired,
        // which is precisely what this guard exists to prevent.
        await tx
          .select({ id: EmailTemplate.id })
          .from(EmailTemplate)
          .where(eq(EmailTemplate.id, input.templateId))
          .limit(1)
          .for("update");

        // The `restrict` FK cannot see a soft delete, so the refusal has to
        // live here.
        const bindings = await templateBindings(input.templateId, tx);
        if (bindings.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `This template is used by ${bindings
              .map((binding) => `${binding.displayName} (${binding.status})`)
              .join(", ")}. Replace it there before archiving.`,
          });
        }

        const [template] = await tx
          .update(EmailTemplate)
          .set({
            archivedAt: new Date(),
            normalizedName: sql`'archived:' || ${EmailTemplate.id}::text`,
            updatedBy: ctx.session.user.id,
          })
          .where(eq(EmailTemplate.id, input.templateId))
          .returning();
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email template not found.",
          });
        }
        await createAdminAuditEvent(
          {
            actionKey: "email.template.archived",
            actor: ctx.session.user,
            changes: [{ after: true, before: false, field: "archived" }],
            metadata: { kind: template.kind },
            subjects: [
              {
                relation: "primary",
                targetId: template.id,
                targetLabel: template.name,
                targetType: "email_template",
              },
            ],
          },
          tx,
        );
        return template;
      });
    }),

  cancelSend: permProcedure
    .input(emailSendIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const send = await db.query.EmailSend.findFirst({
        where: eq(EmailSend.id, input.sendId),
      });
      if (!send) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Send not found." });
      }
      if (send.status === "cancelled") return send;
      if (!["draft", "queued", "scheduled"].includes(send.status)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This send can no longer be cancelled safely.",
        });
      }
      if (send.listmonkCampaignId && send.status === "scheduled") {
        await getDefaultEmailProviderGateway().setCampaignStatus(
          send.listmonkCampaignId,
          "draft",
          campaignAudienceScope(send.audienceDefinition),
        );
      }
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(EmailSend)
          .set({
            cancelledAt: new Date(),
            cancelledBy: ctx.session.user.id,
            status: "cancelled",
            terminalAt: new Date(),
          })
          .where(eq(EmailSend.id, send.id))
          .returning();
        await tx.insert(EmailSendEvent).values({
          actorId: ctx.session.user.id,
          fromStatus: send.status,
          sendId: send.id,
          toStatus: "cancelled",
          type: "cancelled",
        });
        await createAdminAuditEvent(
          {
            actionKey: "email.send.cancelled",
            actor: ctx.session.user,
            changes: [
              { after: "cancelled", before: send.status, field: "status" },
            ],
            subjects: [
              {
                relation: "primary",
                targetId: send.id,
                targetLabel: send.subject,
                targetType: "email_send",
              },
            ],
          },
          tx,
        );
        return updated;
      });
    }),

  confirmSend: permProcedure
    .input(emailConfirmSendSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return confirmSend(input, ctx.session.user);
    }),

  duplicateTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const template = await findTemplate(input.templateId);
      const revision = await findLatestRevision(input.templateId);
      if (!template || !revision) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
      const suffix = randomUUID().slice(0, 6);
      return saveTemplateDraft(
        template.kind === "code"
          ? {
              // A copy stays in its source's domain: duplicating a hackathon
              // template to get a club one would silently widen what fields it
              // may reference.
              domain: template.domain,
              kind: "code",
              name: `${template.name} copy ${suffix}`,
              source: revision.source ?? "",
            }
          : {
              domain: template.domain,
              kind: "visual",
              name: `${template.name} copy ${suffix}`,
              visualDocument: revision.visualDocument as Record<
                string,
                unknown
              >,
            },
        ctx.session.user,
        { id: template.id, name: template.name },
      );
    }),

  getSend: permProcedure
    .input(emailSendIdSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const stored = await db.query.EmailSend.findFirst({
        where: eq(EmailSend.id, input.sendId),
      });
      if (!stored) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Send not found." });
      }
      if (
        stored.listmonkCampaignId &&
        (stored.status === "running" || stored.status === "scheduled")
      ) {
        try {
          await reconcileEmailSend(stored.id);
        } catch {
          // Preserve the last known state when Listmonk cannot be read.
        }
      }
      const send =
        (await db.query.EmailSend.findFirst({
          where: eq(EmailSend.id, input.sendId),
        })) ?? stored;
      const [events, recipients, createdBy, cancelledBy] = await Promise.all([
        db
          .select()
          .from(EmailSendEvent)
          .where(eq(EmailSendEvent.sendId, send.id))
          .orderBy(desc(EmailSendEvent.createdAt)),
        db
          .select({
            attributes: EmailSendRecipient.attributes,
            email: EmailSendRecipient.email,
            exclusionReason: EmailSendRecipient.exclusionReason,
            matchReasons: EmailSendRecipient.matchReasons,
          })
          .from(EmailSendRecipient)
          .where(eq(EmailSendRecipient.sendId, send.id)),
        db.query.User.findFirst({
          columns: { email: true, id: true, name: true },
          where: eq(User.id, send.createdBy),
        }),
        send.cancelledBy
          ? db.query.User.findFirst({
              columns: { email: true, id: true, name: true },
              where: eq(User.id, send.cancelledBy),
            })
          : Promise.resolve(undefined),
      ]);
      return { cancelledBy, createdBy, events, recipients, send };
    }),

  getTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const template = await findTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
      const revisions = await db
        .select()
        .from(EmailTemplateRevision)
        .where(eq(EmailTemplateRevision.templateId, template.id))
        .orderBy(desc(EmailTemplateRevision.version));
      return { revisions, template };
    }),

  listAudienceOptions: permProcedure.query(async ({ ctx }) => {
    requireEmailPortal(ctx);
    const [hackathons, roles] = await Promise.all([
      db
        .select({
          displayName: Hackathon.displayName,
          id: Hackathon.id,
          name: Hackathon.name,
        })
        .from(Hackathon)
        .orderBy(desc(Hackathon.startDate)),
      db
        .select({ id: Roles.id, name: Roles.name })
        .from(Roles)
        .orderBy(asc(Roles.name), asc(Roles.id)),
    ]);
    return {
      presets: [
        { kind: "current_members" as const, label: "Current members" },
        { kind: "alumni" as const, label: "Alumni" },
        { kind: "team_members" as const, label: "Team members" },
      ],
      hackathons: hackathons.map((hackathon) => ({
        ...hackathon,
        allLabel: `${hackathon.displayName} Hackers`,
        statuses: [
          "withdrawn",
          "pending",
          "accepted",
          "waitlisted",
          "checkedin",
          "confirmed",
          "denied",
        ] as const,
      })),
      roles,
    };
  }),

  resolveAudience: permProcedure
    .input(emailResolveAudienceSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const snapshot = await loadAudienceCandidates(input.audiences);
      return {
        conflicts: snapshot.conflicts,
        counts: snapshot.counts,
        recipients: snapshot.recipients.map((recipient) => ({
          attributes: recipient.attributes,
          email: recipient.email,
          matchReasons: recipient.matchReasons,
          name: recipient.attributes.recipient.name,
        })),
        warnings: snapshot.warnings,
      };
    }),

  listSends: permProcedure
    .input(emailSendListSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const sends = await db
        .select()
        .from(EmailSend)
        .orderBy(desc(EmailSend.createdAt))
        .limit(input.limit);
      const reconcilable = sends.filter(
        (send) =>
          send.listmonkCampaignId &&
          (send.status === "running" || send.status === "scheduled"),
      );
      if (reconcilable.length === 0) return sends;
      await Promise.allSettled(
        reconcilable.map(({ id }) => reconcileEmailSend(id)),
      );
      return db
        .select()
        .from(EmailSend)
        .orderBy(desc(EmailSend.createdAt))
        .limit(input.limit);
    }),

  listTemplates: permProcedure
    .input(emailTemplateListSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return listTemplateRecords(input);
    }),

  previewSend: permProcedure
    .input(emailPreviewSendSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return previewSend(input, ctx.session.user);
    }),

  previewTemplate: permProcedure
    .input(emailTemplatePreviewSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const template = await findTemplate(input.templateId);
      const revision = await findLatestRevision(input.templateId, [
        "draft",
        "published",
      ]);
      if (!template || !revision) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
      // Scoped to the template's domain so preview and save agree. Compiling
      // unscoped meant an author saw a green preview of a club field in a
      // hackathon template and then an unexplained rejection on save.
      return compileDraft(
        revisionSource(template, revision),
        { ...DEFAULT_TEMPLATE_SAMPLE, ...input.sample },
        undefined,
        template.domain,
      );
    }),

  publishTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return db.transaction(async (tx) => {
        const template = await tx.query.EmailTemplate.findFirst({
          where: eq(EmailTemplate.id, input.templateId),
        });
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email template not found.",
          });
        }
        const [draft] = await tx
          .select()
          .from(EmailTemplateRevision)
          .where(
            and(
              eq(EmailTemplateRevision.templateId, input.templateId),
              eq(EmailTemplateRevision.state, "draft"),
            ),
          )
          .orderBy(desc(EmailTemplateRevision.version))
          .limit(1)
          .for("update");
        if (!draft?.compiledHtml || !draft.compiledText) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Save a valid draft before publishing.",
          });
        }
        await tx
          .update(EmailTemplateRevision)
          .set({ state: "superseded" })
          .where(
            and(
              eq(EmailTemplateRevision.templateId, input.templateId),
              eq(EmailTemplateRevision.state, "published"),
            ),
          );
        const [published] = await tx
          .update(EmailTemplateRevision)
          .set({ publishedAt: new Date(), state: "published" })
          .where(eq(EmailTemplateRevision.id, draft.id))
          .returning();
        await tx
          .update(EmailTemplate)
          .set({ updatedBy: ctx.session.user.id })
          .where(eq(EmailTemplate.id, input.templateId));
        await createAdminAuditEvent(
          {
            actionKey: "email.template.published",
            actor: ctx.session.user,
            changes: [{ after: "published", before: "draft", field: "state" }],
            metadata: {
              kind: template.kind,
              revisionVersion: draft.version,
            },
            subjects: [
              {
                relation: "primary",
                targetId: template.id,
                targetLabel: template.name,
                targetType: "email_template",
              },
            ],
          },
          tx,
        );
        return published;
      });
    }),

  retrySend: permProcedure
    .input(emailSendIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const send = await db.query.EmailSend.findFirst({
        where: eq(EmailSend.id, input.sendId),
      });
      if (!send) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Send not found." });
      }
      const retry = canRetryEmailSend({
        providerMayHaveStarted: send.providerMayHaveStarted,
        status:
          send.status === "failed"
            ? "failed"
            : send.status === "queued"
              ? "queued"
              : send.status === "running"
                ? "running"
                : send.status === "completed"
                  ? "completed"
                  : send.status === "cancelled"
                    ? "cancelled"
                    : "scheduled",
      });
      if (!retry.allowed) {
        throw new TRPCError({ code: "CONFLICT", message: retry.reason });
      }
      await db.transaction(async (tx) => {
        await tx
          .update(EmailSend)
          .set({ nextRetryAt: new Date(), safeError: null, status: "queued" })
          .where(eq(EmailSend.id, send.id));
        await createAdminAuditEvent(
          {
            actionKey: "email.send.retry_queued",
            actor: ctx.session.user,
            changes: [
              { after: "queued", before: send.status, field: "status" },
            ],
            metadata: { retryAttemptCount: send.retryAttemptCount },
            subjects: [
              {
                relation: "primary",
                targetId: send.id,
                targetLabel: send.subject,
                targetType: "email_send",
              },
            ],
          },
          tx,
        );
      });
      return processEmailSend(send.id);
    }),

  saveTemplateDraft: permProcedure
    .input(emailSaveTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return saveTemplateDraft(input, ctx.session.user);
    }),

  sendTest: permProcedure
    .input(emailSendTestSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      let template: typeof EmailTemplate.$inferSelect | null | undefined = null;
      const gateway = getDefaultEmailProviderGateway();
      let result: Awaited<ReturnType<typeof gateway.sendTest>>;
      if (input.content.mode === "plainText") {
        result = await gateway.sendTest({
          html: "",
          subject: input.content.subject,
          text: input.content.plainText,
        });
      } else {
        const revision = await db.query.EmailTemplateRevision.findFirst({
          where: and(
            eq(EmailTemplateRevision.id, input.content.templateRevisionId),
            eq(EmailTemplateRevision.state, "published"),
          ),
        });
        if (!revision) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Published email template not found.",
          });
        }
        template = await findTemplate(revision.templateId);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email template not found.",
          });
        }
        const compiled = compileDraft(
          revisionSource(template, revision),
          { ...DEFAULT_TEMPLATE_SAMPLE, ...input.sample },
          undefined,
          template.domain,
        );
        result = await gateway.sendTest({
          html: compiled.html,
          subject: input.content.subject,
          text: compiled.text,
        });
      }
      await createAdminAuditEvent({
        actionKey: "email.test.sent",
        actor: ctx.session.user,
        metadata: {
          contentMode: input.content.mode,
          templateRevisionId:
            input.content.mode === "template"
              ? input.content.templateRevisionId
              : null,
        },
        subjects: [
          {
            relation: "primary",
            targetId: "email-test-delivery",
            targetLabel: "Email test delivery",
            targetType: "provider",
          },
          ...(template
            ? [
                {
                  relation: "secondary" as const,
                  targetId: template.id,
                  targetLabel: template.name,
                  targetType: "email_template" as const,
                },
              ]
            : []),
        ],
      });
      return result;
    }),
} satisfies TRPCRouterRecord;

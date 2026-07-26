import { createHash, randomUUID } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type { PersonalizationField, VisualEmailDocument } from "@forge/email";
import type {
  EmailAudienceDefinition,
  EmailSendContent,
} from "@forge/validators";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  EmailTemplate,
  EmailTemplateRevision,
  Hackathon,
  Hacker,
  HackerAttendee,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  compileCodeEmailTemplate,
  compileVisualEmailTemplate,
  EmailProviderError,
  getDefaultEmailProviderGateway,
} from "@forge/email";
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

import { isBladeE2E, nodeEnv } from "../env";
import { permProcedure } from "../trpc";
import { requireEmailPortal } from "../utils/email/access";
import {
  applyManualRecipientExclusions,
  buildEmailAudienceSnapshot,
  isDevelopmentReviewAudienceDefinition,
  normalizeRecipientEmail,
} from "../utils/email/audience";
import {
  assertConfirmableEmailPreview,
  buildEmailPreviewVersion,
  canRetryEmailSend,
  EMAIL_PREVIEW_TTL_MS,
} from "../utils/email/lifecycle";

const DEFAULT_TEMPLATE_SAMPLE = {
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

type EmailSendStatus = typeof EmailSend.$inferSelect.status;
type CampaignAudienceScope = "development_review" | undefined;

function developmentCampaignReviewEnabled() {
  return nodeEnv === "development" && !isBladeE2E;
}

function campaignAudienceScope(value: unknown): CampaignAudienceScope {
  return developmentCampaignReviewEnabled() &&
    isDevelopmentReviewAudienceDefinition(value)
    ? "development_review"
    : undefined;
}

function developmentReviewOnlyError() {
  return new EmailProviderError(
    "TEST_DELIVERY_ONLY",
    "Development campaign delivery is limited to Team members and explicit role audiences.",
  );
}

function developmentAudienceRoleIds(value: unknown) {
  if (!isDevelopmentReviewAudienceDefinition(value)) return null;
  return (value as EmailAudienceDefinition[])
    .filter(
      (
        definition,
      ): definition is Extract<EmailAudienceDefinition, { kind: "role" }> =>
        definition.kind === "role",
    )
    .map(({ roleId }) => roleId);
}

async function loadCurrentDevelopmentAudienceEmails(
  audienceDefinition: unknown,
) {
  const roleIds = developmentAudienceRoleIds(audienceDefinition);
  if (!roleIds) throw developmentReviewOnlyError();
  const includesTeam = (audienceDefinition as EmailAudienceDefinition[]).some(
    ({ kind }) => kind === "team_members",
  );
  const roleCondition =
    includesTeam && roleIds.length > 0
      ? or(eq(Roles.emailAudienceEnabled, true), inArray(Roles.id, roleIds))
      : includesTeam
        ? eq(Roles.emailAudienceEnabled, true)
        : inArray(Roles.id, roleIds);
  const rows = await db
    .select({ memberEmail: Member.email, userEmail: User.email })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .leftJoin(Member, eq(Member.userId, User.id))
    .where(roleCondition);
  return new Set(
    rows
      .map(({ memberEmail, userEmail }) => memberEmail ?? userEmail)
      .filter((email): email is string => Boolean(email))
      .map(normalizeRecipientEmail),
  );
}

async function assertCurrentDevelopmentAudienceRecipients(
  audienceDefinition: unknown,
  emails: string[],
) {
  const currentAudienceEmails =
    await loadCurrentDevelopmentAudienceEmails(audienceDefinition);
  if (
    emails.some(
      (email) => !currentAudienceEmails.has(normalizeRecipientEmail(email)),
    )
  ) {
    throw developmentReviewOnlyError();
  }
}

function hashValue(value: unknown) {
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

function compileDraft(
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

async function findTemplate(templateId: string) {
  return db.query.EmailTemplate.findFirst({
    where: eq(EmailTemplate.id, templateId),
  });
}

async function findLatestRevision(
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

function revisionSource(
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

async function listTemplateRecords({
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

async function saveTemplateDraft(
  input: ReturnType<typeof emailSaveTemplateSchema.parse>,
  actorId: string,
) {
  const compiled = compileDraft(input);
  const normalizedName = normalizeTemplateName(input.name);

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
    if (input.id) {
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
    return { revision, template };
  });
}

async function loadAudienceCandidates(definitions: EmailAudienceDefinition[]) {
  const currentDateResult = await db.execute<{ currentDate: string }>(
    sql`SELECT CURRENT_DATE::text AS "currentDate"`,
  );
  const currentDate = currentDateResult.rows[0]?.currentDate;
  const [members, roleAssignments, teamRoles, hackerRows] = await Promise.all([
    db
      .select({
        email: Member.email,
        firstName: Member.firstName,
        graduationDate: Member.gradDate,
        id: Member.id,
        lastName: Member.lastName,
        userId: Member.userId,
      })
      .from(Member),
    db
      .select({
        email: User.email,
        name: User.name,
        roleId: Roles.id,
        roleName: Roles.name,
        userId: Permissions.userId,
      })
      .from(Permissions)
      .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
      .innerJoin(User, eq(User.id, Permissions.userId)),
    db
      .select({ id: Roles.id })
      .from(Roles)
      .where(eq(Roles.emailAudienceEnabled, true)),
    db
      .select({
        email: Hacker.email,
        firstName: Hacker.firstName,
        hackathonDisplayName: Hackathon.displayName,
        hackathonId: HackerAttendee.hackathonId,
        hackathonName: Hackathon.name,
        hackerId: Hacker.id,
        lastName: Hacker.lastName,
        status: HackerAttendee.status,
      })
      .from(HackerAttendee)
      .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
      .innerJoin(Hackathon, eq(Hackathon.id, HackerAttendee.hackathonId)),
  ]);
  const roleNamesByUser = new Map<string, string[]>();
  const roleIdsByUser = new Map<string, string[]>();
  for (const assignment of roleAssignments) {
    const names = roleNamesByUser.get(assignment.userId) ?? [];
    names.push(assignment.roleName);
    roleNamesByUser.set(assignment.userId, names);
    const ids = roleIdsByUser.get(assignment.userId) ?? [];
    ids.push(assignment.roleId);
    roleIdsByUser.set(assignment.userId, ids);
  }
  const memberUserIds = new Set(members.map(({ userId }) => userId));
  const selectedTeamRoleIds = teamRoles.map(({ id }) => id);
  const usersWithoutMember = [...roleNamesByUser.entries()]
    .filter(([userId]) => !memberUserIds.has(userId))
    .map(([userId, roleNames]) => {
      const assignment = roleAssignments.find((row) => row.userId === userId);
      return {
        email: assignment?.email,
        name: assignment?.name,
        roleIds: roleIdsByUser.get(userId) ?? [],
        roleNames,
        userId,
      };
    });
  const selectedRoleIds = new Set(
    definitions
      .filter(
        (
          definition,
        ): definition is Extract<EmailAudienceDefinition, { kind: "role" }> =>
          definition.kind === "role",
      )
      .map(({ roleId }) => roleId),
  );

  const allCandidateEmails = [
    ...members.map(({ email }) => email),
    ...hackerRows.map(({ email }) => email),
    ...usersWithoutMember
      .filter(({ roleIds }) =>
        roleIds.some((roleId) => selectedRoleIds.has(roleId)),
      )
      .map(({ email }) => email)
      .filter((email): email is string => Boolean(email)),
  ];
  const providerStates =
    await getDefaultEmailProviderGateway().lookupSubscriberStates([
      ...new Set(allCandidateEmails.map((email) => email.trim().toLowerCase())),
    ]);

  return buildEmailAudienceSnapshot({
    currentDate: currentDate ?? new Date().toISOString().slice(0, 10),
    definitions,
    hackers: hackerRows.map((hacker) => ({
      email: hacker.email,
      firstName: hacker.firstName,
      hackathonDisplayName: hacker.hackathonDisplayName,
      hackathonId: hacker.hackathonId,
      hackathonName: hacker.hackathonName,
      id: hacker.hackerId,
      name: `${hacker.firstName} ${hacker.lastName}`.trim(),
      status: hacker.status,
    })),
    members: members.map((member) => ({
      email: member.email,
      firstName: member.firstName,
      graduationDate: member.graduationDate,
      id: member.id,
      name: `${member.firstName} ${member.lastName}`.trim(),
      roleIds: roleIdsByUser.get(member.userId) ?? [],
      roleNames: roleNamesByUser.get(member.userId) ?? [],
    })),
    providerStates,
    teamRoleIds: selectedTeamRoleIds,
    usersWithoutMember,
  });
}

function valueAtPath(value: unknown, path: string) {
  let current = value;
  for (const segment of path.split(".")) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(segment in current)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function withFallbackData(
  attributes: Record<string, unknown>,
  fallbacks: Record<string, unknown>,
) {
  const result = structuredClone(attributes);
  for (const [path, fallback] of Object.entries(fallbacks)) {
    if (valueAtPath(result, path) !== undefined) continue;
    const segments = path.split(".");
    let current = result;
    for (const segment of segments.slice(0, -1)) {
      const existing = current[segment];
      if (
        typeof existing !== "object" ||
        existing === null ||
        Array.isArray(existing)
      ) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }
    const finalSegment = segments.at(-1);
    if (finalSegment) current[finalSegment] = fallback;
  }
  return result;
}

function coverageFor(
  contract: PersonalizationField[],
  recipients: { attributes: unknown }[],
  fallbacks: Record<string, unknown>,
) {
  return contract.map((field) => {
    const covered = recipients.filter((recipient) => {
      const value = valueAtPath(recipient.attributes, field.field);
      return value !== undefined && value !== null && value !== "";
    }).length;
    const hasFallback =
      field.fallback !== undefined || fallbacks[field.field] !== undefined;
    return {
      blocker: field.required && !hasFallback && covered < recipients.length,
      covered,
      fallback: field.fallback ?? fallbacks[field.field],
      field: field.field,
      missing: recipients.length - covered,
      required: field.required,
      type: field.type,
    };
  });
}

async function materializeContent(content: EmailSendContent, sendId: string) {
  if (content.mode === "plainText") {
    return {
      compiledHtml: null,
      compiledText: content.plainText,
      contract: [] as PersonalizationField[],
      fallbackData: {} as Record<string, unknown>,
      plainTextSource: content.plainText,
      subject: content.subject,
      templateRevisionId: null,
    };
  }
  const revision = await db.query.EmailTemplateRevision.findFirst({
    where: and(
      eq(EmailTemplateRevision.id, content.templateRevisionId),
      eq(EmailTemplateRevision.state, "published"),
    ),
  });
  if (!revision) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Published email template not found.",
    });
  }
  const template = await findTemplate(revision.templateId);
  if (!template || template.archivedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose an active published email template.",
    });
  }
  const compiled = compileDraft(
    revisionSource(template, revision),
    { ...DEFAULT_TEMPLATE_SAMPLE, ...content.fallbackData },
    sendId,
  );
  return {
    compiledHtml: compiled.html,
    compiledText: compiled.text,
    contract: revision.personalizationContract as PersonalizationField[],
    fallbackData: content.fallbackData,
    plainTextSource: null,
    subject: content.subject,
    templateRevisionId: revision.id,
  };
}

async function previewSend(
  input: ReturnType<typeof emailPreviewSendSchema.parse>,
  actorId: string,
) {
  if (
    developmentCampaignReviewEnabled() &&
    !isDevelopmentReviewAudienceDefinition(input.audiences)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Development campaign delivery is limited to Team members and role audiences.",
    });
  }
  const sendId = input.sendId ?? randomUUID();
  if (
    input.scheduledFor &&
    Date.parse(input.scheduledFor) < Date.now() - 60_000
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Schedule time must be in the future.",
    });
  }
  const [content, snapshot] = await Promise.all([
    materializeContent(input.content, sendId),
    loadAudienceCandidates(input.audiences),
  ]);
  const hydratedRecipients = snapshot.recipients.map((recipient) => ({
    ...recipient,
    attributes: withFallbackData(recipient.attributes, content.fallbackData),
  }));
  const { excludedEmails: excludedManually, included: includedRecipients } =
    applyManualRecipientExclusions(
      hydratedRecipients,
      input.excludedRecipients,
    );
  const coverage = coverageFor(
    content.contract,
    includedRecipients,
    content.fallbackData,
  );
  const blockingFields = coverage.filter(({ blocker }) => blocker);
  const blockedEmails = new Set(
    includedRecipients
      .filter((recipient) =>
        blockingFields.some(
          (field) =>
            valueAtPath(recipient.attributes, field.field) === undefined,
        ),
      )
      .map(({ email }) => email),
  );
  const recipients = includedRecipients.filter(
    ({ email }) => !blockedEmails.has(email),
  );
  const counts = {
    duplicatesCollapsed: snapshot.counts.duplicatesCollapsed,
    excludedBlocklisted: snapshot.counts.excludedBlocklisted,
    excludedInvalid: snapshot.counts.excludedInvalid,
    excludedManual: excludedManually.size,
    excludedMissingFields: blockedEmails.size,
    excludedUnsubscribed: snapshot.counts.excludedUnsubscribed,
    finalUnique: recipients.length,
    rawMatches: snapshot.counts.rawMatches,
  };
  const contentHash = hashValue({
    html: content.compiledHtml,
    subject: content.subject,
    text: content.compiledText,
    templateRevisionId: content.templateRevisionId,
  });
  const audienceHash = hashValue({
    definitions: input.audiences,
    excludedRecipients: [...excludedManually].sort(),
    snapshot: snapshot.checksum,
  });
  const scheduleHash = hashValue(input.scheduledFor);
  const previewVersion = buildEmailPreviewVersion({
    audienceHash,
    contentHash,
    recipientCount: recipients.length,
    scheduleHash,
  });
  const previewExpiresAt = new Date(Date.now() + EMAIL_PREVIEW_TTL_MS);

  await db.transaction(async (tx) => {
    if (input.sendId) {
      const [existing] = await tx
        .select({ createdBy: EmailSend.createdBy, status: EmailSend.status })
        .from(EmailSend)
        .where(eq(EmailSend.id, sendId))
        .for("update");
      if (existing?.createdBy !== actorId || existing.status !== "draft") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This draft can no longer be replaced.",
        });
      }
      await tx
        .delete(EmailSendRecipient)
        .where(eq(EmailSendRecipient.sendId, sendId));
      await tx
        .update(EmailSend)
        .set({
          audienceDefinition: input.audiences,
          audienceHash,
          compiledHtml: content.compiledHtml,
          compiledText: content.compiledText,
          contentHash,
          duplicateCount: counts.duplicatesCollapsed,
          excludedInvalidCount: counts.excludedInvalid,
          excludedManualCount: counts.excludedManual,
          excludedMissingFieldCount: counts.excludedMissingFields,
          excludedSuppressedCount:
            counts.excludedBlocklisted + counts.excludedUnsubscribed,
          finalRecipientCount: counts.finalUnique,
          plainTextSource: content.plainTextSource,
          previewExpiresAt,
          previewVersion,
          rawMatchCount: counts.rawMatches,
          scheduledFor: input.scheduledFor
            ? new Date(input.scheduledFor)
            : null,
          subject: content.subject,
          templateRevisionId: content.templateRevisionId,
        })
        .where(eq(EmailSend.id, sendId));
    } else {
      await tx.insert(EmailSend).values({
        audienceDefinition: input.audiences,
        audienceHash,
        compiledHtml: content.compiledHtml,
        compiledText: content.compiledText,
        contentHash,
        createdBy: actorId,
        duplicateCount: counts.duplicatesCollapsed,
        excludedInvalidCount: counts.excludedInvalid,
        excludedManualCount: counts.excludedManual,
        excludedMissingFieldCount: counts.excludedMissingFields,
        excludedSuppressedCount:
          counts.excludedBlocklisted + counts.excludedUnsubscribed,
        finalRecipientCount: counts.finalUnique,
        id: sendId,
        plainTextSource: content.plainTextSource,
        previewExpiresAt,
        previewVersion,
        providerTag: `forge-send:${sendId}`,
        rawMatchCount: counts.rawMatches,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        subject: content.subject,
        templateRevisionId: content.templateRevisionId,
      });
    }
    if (recipients.length > 0) {
      await tx.insert(EmailSendRecipient).values(
        recipients.map((recipient) => ({
          attributes: recipient.attributes,
          email: recipient.email,
          matchReasons: recipient.matchReasons,
          normalizedEmail: recipient.email,
          sendId,
        })),
      );
    }
  });

  return {
    blockers: blockingFields.map((field) => ({
      code: "MISSING_REQUIRED_FIELD" as const,
      count: field.missing,
      field: field.field,
    })),
    conflicts: snapshot.conflicts,
    counts,
    coverage,
    expiresAt: previewExpiresAt.toISOString(),
    sampleRecipients: recipients.slice(0, 10).map((recipient) => ({
      attributes: recipient.attributes,
      email: recipient.email,
      matchReasons: recipient.matchReasons,
    })),
    sendId,
    version: previewVersion,
    warnings: snapshot.warnings,
  };
}

export async function processEmailSend(sendId: string) {
  const now = new Date();
  const [claimed] = await db
    .update(EmailSend)
    .set({
      retryLeaseExpiresAt: new Date(now.getTime() + 5 * 60_000),
      status: "syncing",
    })
    .where(
      and(
        eq(EmailSend.id, sendId),
        or(
          eq(EmailSend.status, "queued"),
          and(
            eq(EmailSend.status, "scheduled"),
            isNotNull(EmailSend.scheduledFor),
            lte(EmailSend.scheduledFor, now),
          ),
        ),
        isNull(EmailSend.listmonkCampaignId),
      ),
    )
    .returning();
  if (!claimed) return null;
  let recipients = await db
    .select()
    .from(EmailSendRecipient)
    .where(
      and(
        eq(EmailSendRecipient.sendId, sendId),
        isNull(EmailSendRecipient.exclusionReason),
      ),
    );
  const gateway = getDefaultEmailProviderGateway();
  try {
    const audienceScope = campaignAudienceScope(claimed.audienceDefinition);
    if (developmentCampaignReviewEnabled()) {
      await assertCurrentDevelopmentAudienceRecipients(
        claimed.audienceDefinition,
        recipients.map(({ normalizedEmail }) => normalizedEmail),
      );
    }
    const providerStates = await gateway.lookupSubscriberStates(
      recipients.map(({ normalizedEmail }) => normalizedEmail),
    );
    const lateSuppressions = providerStates.filter(
      ({ status }) => status !== "enabled",
    );
    if (lateSuppressions.length > 0) {
      for (const status of ["blocklisted", "unsubscribed"] as const) {
        const emails = lateSuppressions
          .filter((recipient) => recipient.status === status)
          .map(({ email }) => email.trim().toLowerCase());
        if (emails.length > 0) {
          await db
            .update(EmailSendRecipient)
            .set({ exclusionReason: `late_${status}` })
            .where(
              and(
                eq(EmailSendRecipient.sendId, sendId),
                inArray(EmailSendRecipient.normalizedEmail, emails),
                isNull(EmailSendRecipient.exclusionReason),
              ),
            );
        }
      }
      const suppressed = new Set(
        lateSuppressions.map(({ email }) => email.trim().toLowerCase()),
      );
      recipients = recipients.filter(
        ({ normalizedEmail }) => !suppressed.has(normalizedEmail),
      );
      await db.transaction(async (tx) => {
        await tx
          .update(EmailSend)
          .set({
            excludedSuppressedCount:
              claimed.excludedSuppressedCount + lateSuppressions.length,
            finalRecipientCount: recipients.length,
          })
          .where(eq(EmailSend.id, sendId));
        await tx.insert(EmailSendEvent).values({
          fromStatus: "syncing",
          metadata: { removedSuppressed: lateSuppressions.length },
          sendId,
          toStatus: "syncing",
          type: "late_suppressions_removed",
        });
      });
    }
    if (recipients.length === 0) {
      await db.transaction(async (tx) => {
        await tx
          .update(EmailSend)
          .set({
            retryLeaseExpiresAt: null,
            safeError: null,
            status: "completed",
            terminalAt: new Date(),
          })
          .where(eq(EmailSend.id, sendId));
        await tx.insert(EmailSendEvent).values({
          fromStatus: "syncing",
          metadata: { recipientCount: 0 },
          sendId,
          toStatus: "completed",
          type: "no_eligible_recipients",
        });
      });
      return { campaignId: null, status: "completed" as const };
    }
    const campaign = await gateway.createCampaign({
      audienceScope,
      html: claimed.compiledHtml ?? "",
      isRetry: claimed.retryAttemptCount > 0,
      recipientData: recipients.map((recipient) => {
        const attributes =
          typeof recipient.attributes === "object" &&
          recipient.attributes !== null &&
          !Array.isArray(recipient.attributes)
            ? (recipient.attributes as Record<string, unknown>)
            : {};
        const recipientAttributes =
          typeof attributes.recipient === "object" &&
          attributes.recipient !== null &&
          !Array.isArray(attributes.recipient)
            ? (attributes.recipient as Record<string, unknown>)
            : {};
        return {
          attributes,
          email: recipient.normalizedEmail,
          name:
            typeof recipientAttributes.name === "string"
              ? recipientAttributes.name
              : "",
        };
      }),
      recipientSnapshot: recipients.map(
        ({ normalizedEmail }) => normalizedEmail,
      ),
      sendId,
      subject: claimed.subject,
      text: claimed.compiledText,
    });
    await db
      .update(EmailSend)
      .set({
        listmonkCampaignId: campaign.campaignId,
        listmonkListId: campaign.listId,
        providerMayHaveStarted: true,
      })
      .where(eq(EmailSend.id, sendId));
    try {
      await gateway.setCampaignStatus(
        campaign.campaignId,
        "running",
        audienceScope,
      );
    } catch {
      await db
        .update(EmailSend)
        .set({
          retryLeaseExpiresAt: null,
          safeError: "Campaign start is being reconciled with the provider.",
          status: "running",
        })
        .where(eq(EmailSend.id, sendId));
      return { campaignId: campaign.campaignId, status: "running" as const };
    }
    const nextStatus: EmailSendStatus = "running";
    await db.transaction(async (tx) => {
      await tx
        .update(EmailSend)
        .set({
          retryAttemptCount: 0,
          retryLeaseExpiresAt: null,
          safeError: null,
          status: nextStatus,
        })
        .where(eq(EmailSend.id, sendId));
      await tx.insert(EmailSendEvent).values({
        fromStatus: "syncing",
        metadata: { recipientCount: recipients.length },
        sendId,
        toStatus: nextStatus,
        type: "provider_handoff",
      });
    });
    await reconcileEmailSend(sendId);
    return { campaignId: campaign.campaignId, status: nextStatus };
  } catch (error) {
    if (
      error instanceof EmailProviderError &&
      error.code === "TEST_DELIVERY_ONLY"
    ) {
      await db
        .update(EmailSend)
        .set({
          nextRetryAt: null,
          retryLeaseExpiresAt: null,
          safeError: "Audience delivery is disabled in this environment.",
          status: "failed",
          terminalAt: new Date(),
        })
        .where(eq(EmailSend.id, sendId));
      return { campaignId: null, status: "failed" as const };
    }
    const attempt = claimed.retryAttemptCount + 1;
    const terminal = attempt >= 5;
    await db
      .update(EmailSend)
      .set({
        nextRetryAt: terminal
          ? null
          : new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000),
        retryAttemptCount: attempt,
        retryLeaseExpiresAt: null,
        safeError: "The email provider could not prepare this campaign.",
        status: terminal ? "failed" : "queued",
        terminalAt: terminal ? new Date() : null,
      })
      .where(eq(EmailSend.id, sendId));
    return { campaignId: null, status: terminal ? "failed" : "queued" };
  }
}

export async function reconcileEmailSend(sendId: string) {
  const send = await db.query.EmailSend.findFirst({
    where: eq(EmailSend.id, sendId),
  });
  if (!send?.listmonkCampaignId) return null;
  const audienceScope = campaignAudienceScope(send.audienceDefinition);
  if (developmentCampaignReviewEnabled()) {
    const recipients = await db
      .select({ normalizedEmail: EmailSendRecipient.normalizedEmail })
      .from(EmailSendRecipient)
      .where(
        and(
          eq(EmailSendRecipient.sendId, send.id),
          isNull(EmailSendRecipient.exclusionReason),
        ),
      );
    await assertCurrentDevelopmentAudienceRecipients(
      send.audienceDefinition,
      recipients.map(({ normalizedEmail }) => normalizedEmail),
    );
  }
  const state = await getDefaultEmailProviderGateway().reconcileCampaign(
    send.listmonkCampaignId,
  );
  if (
    state.status === "draft" &&
    send.status === "running" &&
    send.providerMayHaveStarted
  ) {
    await getDefaultEmailProviderGateway().setCampaignStatus(
      send.listmonkCampaignId,
      "running",
      audienceScope,
    );
  }
  const status: EmailSendStatus =
    state.status === "finished" || state.status === "completed"
      ? "completed"
      : state.status === "running"
        ? "running"
        : state.status === "scheduled"
          ? "scheduled"
          : state.status === "cancelled"
            ? "cancelled"
            : state.status === "failed"
              ? "failed"
              : send.status;
  if (
    status === send.status &&
    state.sentCount === send.providerSentCount &&
    state.bounceCount === send.providerBounceCount
  ) {
    return send;
  }
  const [updated] = await db
    .update(EmailSend)
    .set({
      providerBounceCount: state.bounceCount,
      providerSentCount: state.sentCount,
      status,
      terminalAt:
        status === "completed" || status === "cancelled" || status === "failed"
          ? new Date()
          : null,
    })
    .where(eq(EmailSend.id, sendId))
    .returning();
  return updated;
}

export async function runEmailDeliveryCycle() {
  const now = new Date();
  await Promise.all([
    db
      .update(EmailSend)
      .set({
        nextRetryAt: now,
        retryAttemptCount: sql`${EmailSend.retryAttemptCount} + 1`,
        retryLeaseExpiresAt: null,
        safeError: "An interrupted provider preparation is being retried.",
        status: "queued",
      })
      .where(
        and(
          eq(EmailSend.status, "syncing"),
          isNull(EmailSend.listmonkCampaignId),
          isNotNull(EmailSend.retryLeaseExpiresAt),
          lte(EmailSend.retryLeaseExpiresAt, now),
        ),
      ),
    db
      .update(EmailSend)
      .set({
        providerMayHaveStarted: true,
        retryLeaseExpiresAt: null,
        safeError: "An interrupted provider handoff is being reconciled.",
        status: "running",
      })
      .where(
        and(
          eq(EmailSend.status, "syncing"),
          isNotNull(EmailSend.listmonkCampaignId),
          isNotNull(EmailSend.retryLeaseExpiresAt),
          lte(EmailSend.retryLeaseExpiresAt, now),
        ),
      ),
  ]);
  const [preparation, reconciliation] = await Promise.all([
    db
      .select({ id: EmailSend.id })
      .from(EmailSend)
      .where(
        and(
          or(
            eq(EmailSend.status, "queued"),
            and(
              eq(EmailSend.status, "scheduled"),
              isNotNull(EmailSend.scheduledFor),
              lte(EmailSend.scheduledFor, now),
            ),
          ),
          isNull(EmailSend.listmonkCampaignId),
          or(isNull(EmailSend.nextRetryAt), lte(EmailSend.nextRetryAt, now)),
        ),
      )
      .limit(25),
    db
      .select({ id: EmailSend.id })
      .from(EmailSend)
      .where(
        and(
          inArray(EmailSend.status, ["scheduled", "running"]),
          isNotNull(EmailSend.listmonkCampaignId),
        ),
      )
      .limit(100),
  ]);
  const prepared = await Promise.allSettled(
    preparation.map(({ id }) => processEmailSend(id)),
  );
  const reconciled = await Promise.allSettled(
    reconciliation.map(({ id }) => reconcileEmailSend(id)),
  );

  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1_000);
  const expiredSends = await db
    .select({ id: EmailSend.id })
    .from(EmailSend)
    .where(
      and(
        inArray(EmailSend.status, ["completed", "cancelled", "failed"]),
        isNotNull(EmailSend.terminalAt),
        lte(EmailSend.terminalAt, cutoff),
      ),
    )
    .limit(500);
  let removedRecipients = 0;
  for (const expired of expiredSends) {
    const recipients = await db
      .select({ normalizedEmail: EmailSendRecipient.normalizedEmail })
      .from(EmailSendRecipient)
      .where(eq(EmailSendRecipient.sendId, expired.id));
    try {
      await getDefaultEmailProviderGateway().removeRecipientNamespace(
        expired.id,
        recipients.map(({ normalizedEmail }) => normalizedEmail),
      );
    } catch {
      await db
        .update(EmailSend)
        .set({
          safeError: "Recipient metadata cleanup is pending.",
        })
        .where(eq(EmailSend.id, expired.id));
      continue;
    }
    const deleted = await db
      .delete(EmailSendRecipient)
      .where(eq(EmailSendRecipient.sendId, expired.id))
      .returning({ id: EmailSendRecipient.id });
    removedRecipients += deleted.length;
  }

  const expiredDrafts = await db
    .select({ id: EmailSend.id })
    .from(EmailSend)
    .where(
      and(eq(EmailSend.status, "draft"), lte(EmailSend.previewExpiresAt, now)),
    )
    .limit(500);
  if (expiredDrafts.length > 0) {
    const ids = expiredDrafts.map(({ id }) => id);
    await db
      .delete(EmailSendRecipient)
      .where(inArray(EmailSendRecipient.sendId, ids));
    await db.delete(EmailSend).where(inArray(EmailSend.id, ids));
  }
  return {
    prepared: prepared.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length,
    reconciled: reconciled.filter(
      (result) => result.status === "fulfilled" && result.value !== null,
    ).length,
    removedDrafts: expiredDrafts.length,
    removedRecipients,
  };
}

async function confirmSend(
  input: ReturnType<typeof emailConfirmSendSchema.parse>,
  actorId: string,
) {
  const send = await db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(EmailSend)
      .where(eq(EmailSend.id, input.sendId))
      .for("update");
    if (record?.createdBy !== actorId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Email draft not found.",
      });
    }
    if (
      developmentCampaignReviewEnabled() &&
      !isDevelopmentReviewAudienceDefinition(record.audienceDefinition)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Development campaign delivery is limited to Team members and role audiences.",
      });
    }
    try {
      assertConfirmableEmailPreview({
        actual: {
          ...record,
          expiresAt: record.previewExpiresAt,
          recipientCount: record.finalRecipientCount,
          sendId: record.id,
          version: record.previewVersion,
        },
        expectedRecipientCount: input.expectedRecipientCount,
        expectedVersion: input.previewVersion,
        now: new Date(),
      });
    } catch (error) {
      throw new TRPCError({
        cause: error,
        code: "CONFLICT",
        message: error instanceof Error ? error.message : "Preview is stale.",
      });
    }
    if (record.excludedMissingFieldCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Resolve personalization blockers before confirming.",
      });
    }
    const status: EmailSendStatus =
      record.scheduledFor && record.scheduledFor.getTime() > Date.now()
        ? "scheduled"
        : "queued";
    const [updated] = await tx
      .update(EmailSend)
      .set({ confirmedAt: new Date(), status })
      .where(eq(EmailSend.id, record.id))
      .returning();
    await tx.insert(EmailSendEvent).values({
      actorId,
      fromStatus: "draft",
      metadata: { recipientCount: record.finalRecipientCount },
      sendId: record.id,
      toStatus: status,
      type: "confirmed",
    });
    return updated;
  });
  if (send?.status === "queued") await processEmailSend(send.id);
  return db.query.EmailSend.findFirst({
    where: eq(EmailSend.id, input.sendId),
  });
}

export const emailRouter = {
  archiveTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const [template] = await db
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
      return template;
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
      const [updated] = await db
        .update(EmailSend)
        .set({
          cancelledAt: new Date(),
          cancelledBy: ctx.session.user.id,
          status: "cancelled",
          terminalAt: new Date(),
        })
        .where(eq(EmailSend.id, send.id))
        .returning();
      await db.insert(EmailSendEvent).values({
        actorId: ctx.session.user.id,
        fromStatus: send.status,
        sendId: send.id,
        toStatus: "cancelled",
        type: "cancelled",
      });
      return updated;
    }),

  confirmSend: permProcedure
    .input(emailConfirmSendSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return confirmSend(input, ctx.session.user.id);
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
              kind: "code",
              name: `${template.name} copy ${suffix}`,
              source: revision.source ?? "",
            }
          : {
              kind: "visual",
              name: `${template.name} copy ${suffix}`,
              visualDocument: revision.visualDocument as Record<
                string,
                unknown
              >,
            },
        ctx.session.user.id,
      );
    }),

  getSend: permProcedure
    .input(emailSendIdSchema)
    .query(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      const send = await db.query.EmailSend.findFirst({
        where: eq(EmailSend.id, input.sendId),
      });
      if (!send) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Send not found." });
      }
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
      return previewSend(input, ctx.session.user.id);
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
      return compileDraft(revisionSource(template, revision), {
        ...DEFAULT_TEMPLATE_SAMPLE,
        ...input.sample,
      });
    }),

  publishTemplate: permProcedure
    .input(emailTemplateIdSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return db.transaction(async (tx) => {
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
      await db
        .update(EmailSend)
        .set({ nextRetryAt: new Date(), safeError: null, status: "queued" })
        .where(eq(EmailSend.id, send.id));
      return processEmailSend(send.id);
    }),

  saveTemplateDraft: permProcedure
    .input(emailSaveTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      return saveTemplateDraft(input, ctx.session.user.id);
    }),

  sendTest: permProcedure
    .input(emailSendTestSchema)
    .mutation(async ({ ctx, input }) => {
      requireEmailPortal(ctx);
      if (input.content.mode === "plainText") {
        return getDefaultEmailProviderGateway().sendTest({
          html: "",
          subject: input.content.subject,
          text: input.content.plainText,
        });
      }
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
      const template = await findTemplate(revision.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found.",
        });
      }
      const compiled = compileDraft(revisionSource(template, revision), {
        ...DEFAULT_TEMPLATE_SAMPLE,
        ...input.sample,
      });
      return getDefaultEmailProviderGateway().sendTest({
        html: compiled.html,
        subject: input.content.subject,
        text: compiled.text,
      });
    }),
} satisfies TRPCRouterRecord;

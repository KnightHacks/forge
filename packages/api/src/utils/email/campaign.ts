import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { PersonalizationField } from "@forge/email";
import type {
  EmailAudienceDefinition,
  EmailSendContent,
} from "@forge/validators";
import { and, eq, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  EmailTemplateRevision,
  Hackathon,
  Hacker,
  HackerAttendee,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { getDefaultEmailProviderGateway } from "@forge/email";
import { formatHackathonDate } from "@forge/email/fields";
import {
  emailConfirmSendSchema,
  emailPreviewSendSchema,
} from "@forge/validators";

import type { AuditActor } from "../audit/service";
import type { EmailSendStatus } from "./delivery";
import { createAdminAuditEvent } from "../audit/service";
import {
  applyManualRecipientExclusions,
  buildEmailAudienceSnapshot,
  isDevelopmentReviewAudienceDefinition,
} from "./audience";
import { developmentCampaignReviewEnabled, processEmailSend } from "./delivery";
import {
  assertConfirmableEmailPreview,
  buildEmailPreviewVersion,
  EMAIL_PREVIEW_TTL_MS,
} from "./lifecycle";
import {
  compileDraft,
  DEFAULT_TEMPLATE_SAMPLE,
  findTemplate,
  hashValue,
  revisionSource,
} from "./templates";

export async function loadAudienceCandidates(
  definitions: EmailAudienceDefinition[],
) {
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
        hackathonApplicationUrl: Hackathon.applicationUrl,
        hackathonConfirmationDeadline: Hackathon.confirmationDeadline,
        hackathonDisplayName: Hackathon.displayName,
        hackathonEndDate: Hackathon.endDate,
        hackathonId: HackerAttendee.hackathonId,
        hackathonName: Hackathon.name,
        hackathonStartDate: Hackathon.startDate,
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
      // Dates are formatted here, not in the template. The catalog declares
      // these as pre-formatted strings and the preview sample builds them with
      // the same helper, so an officer approving "Oct 3, 2026" is approving what
      // actually goes out.
      hackathonApplicationUrl: hacker.hackathonApplicationUrl ?? undefined,
      hackathonConfirmationDeadline: formatHackathonDate(
        hacker.hackathonConfirmationDeadline,
      ),
      hackathonDisplayName: hacker.hackathonDisplayName,
      hackathonEndDate: formatHackathonDate(hacker.hackathonEndDate),
      hackathonId: hacker.hackathonId,
      hackathonName: hacker.hackathonName,
      hackathonStartDate: formatHackathonDate(hacker.hackathonStartDate),
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

/**
 * Exported for hacker status mail, which builds its own send rather than going
 * through `previewSend`: that path selects recipients by audience definition
 * ("every pending hacker in this hackathon"), and a status transition mails a
 * specific set of people an officer selected. Sharing the compile step is what
 * keeps the mail an applicant receives identical to the one an officer
 * previewed on the configuration screen.
 */
export async function materializeContent(
  content: EmailSendContent,
  sendId: string,
) {
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
  // The real send path. Scoped to the template's domain so a template whose
  // domain no longer matches its fields fails loudly here rather than
  // delivering blanks to a recipient's inbox.
  const compiled = compileDraft(
    revisionSource(template, revision),
    { ...DEFAULT_TEMPLATE_SAMPLE, ...content.fallbackData },
    sendId,
    template.domain,
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

export async function previewSend(
  input: ReturnType<typeof emailPreviewSendSchema.parse>,
  actor: AuditActor,
) {
  const actorId = actor.id;
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
    await createAdminAuditEvent(
      {
        actionKey: "email.send.previewed",
        actor,
        metadata: {
          audienceGroupCount: input.audiences.length,
          contentMode: input.content.mode,
          excludedManualCount: counts.excludedManual,
          recipientCount: counts.finalUnique,
          replacedDraft: Boolean(input.sendId),
          scheduledFor: input.scheduledFor,
        },
        subjects: [
          {
            relation: "primary",
            targetId: sendId,
            targetLabel: content.subject,
            targetType: "email_send",
          },
        ],
      },
      tx,
    );
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

export async function confirmSend(
  input: ReturnType<typeof emailConfirmSendSchema.parse>,
  actor: AuditActor,
) {
  const actorId = actor.id;
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
    await createAdminAuditEvent(
      {
        actionKey: "email.send.confirmed",
        actor,
        changes: [{ after: status, before: "draft", field: "status" }],
        metadata: {
          recipientCount: record.finalRecipientCount,
          scheduledFor: record.scheduledFor?.toISOString() ?? null,
        },
        subjects: [
          {
            relation: "primary",
            targetId: record.id,
            targetLabel: record.subject,
            targetType: "email_send",
          },
        ],
      },
      tx,
    );
    return updated;
  });
  if (send?.status === "queued") await processEmailSend(send.id);
  return db.query.EmailSend.findFirst({
    where: eq(EmailSend.id, input.sendId),
  });
}

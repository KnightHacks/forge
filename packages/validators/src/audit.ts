import { z } from "zod";

const policy = <
  const MetadataKey extends string,
  const ChangeField extends string,
>(
  domain: AuditDomain,
  label: string,
  metadataKeys: readonly MetadataKey[] = [],
  changeFields: readonly ChangeField[] = [],
) => ({ changeFields, domain, label, metadataKeys });

export const AUDIT_DOMAINS = [
  "alumni",
  "analytics",
  "attendance",
  "companies",
  "events",
  "forms",
  "issues",
  "members",
  "roles",
] as const;

export type AuditDomain = (typeof AUDIT_DOMAINS)[number];

export const AUDIT_ACTION_CATALOG = {
  "analytics.report.exported": policy(
    "analytics",
    "Exported analytics report",
    ["kind", "dateFrom", "dateTo", "eventIds", "rowCount"],
  ),
  "member.directory.exported": policy("members", "Exported member directory", [
    "filterFacets",
    "sortKey",
    "sortDirection",
    "rowCount",
  ]),
  "event.attendance.exported": policy("events", "Exported event attendance", [
    "rowCount",
  ]),
  "event.feedback.exported": policy("events", "Exported event feedback", [
    "rowCount",
    "questionCount",
  ]),
  "form.responses.exported": policy("forms", "Exported form responses", [
    "responseCount",
    "questionCount",
    "formState",
  ]),
  "attendance.checked_in": policy("attendance", "Checked in member", [
    "method",
    "repeatAllowed",
    "pointsAwarded",
    "additionalAttendance",
  ]),
  "attendance.removed": policy("attendance", "Removed member attendance", [
    "pointsReversed",
    "originalCheckInAt",
  ]),
  "member.dues.granted": policy("members", "Granted member dues", [
    "academicYear",
    "created",
    "reactivated",
  ]),
  "member.dues.revoked": policy("members", "Revoked member dues", [
    "academicYears",
    "affectedPaymentCount",
  ]),
  "member.dues.invalidated_bulk": policy(
    "members",
    "Invalidated effective dues",
    ["affectedMemberCount", "referenceAcademicYear", "referenceDate"],
  ),
  "member.profile.updated": policy(
    "members",
    "Updated member",
    [],
    [
      "points",
      "firstName",
      "lastName",
      "major",
      "school",
      "gradDate",
      "shirtSize",
      "gender",
      "raceOrEthnicity",
      "dietaryRestrictions",
      "hasResume",
      "employmentCount",
    ],
  ),
  "member.profile.deleted": policy("members", "Deleted member profile", [
    "deletedObjectTypes",
    "deletedObjectCount",
    "filesCleaned",
  ]),
  "member.profile_picture.replaced": policy(
    "members",
    "Replaced member profile picture",
    ["mimeType", "byteSize", "hadPrevious"],
  ),
  "member.profile_picture.removed": policy(
    "members",
    "Removed member profile picture",
    ["hadPrevious"],
  ),
  "member.resume.replaced": policy("members", "Replaced member résumé", [
    "filename",
    "byteSize",
    "hadPrevious",
  ]),
  "member.resume.removed": policy("members", "Removed member résumé", [
    "hadPrevious",
  ]),
  "member.resume.accessed": policy("members", "Accessed member résumé", [
    "filename",
    "accessMechanism",
  ]),
  "company.updated": policy(
    "companies",
    "Updated company",
    [],
    ["displayName", "legalName", "domain", "aliases"],
  ),
  "company.approved": policy(
    "companies",
    "Approved company",
    [],
    ["reviewState"],
  ),
  "company.rejected": policy(
    "companies",
    "Rejected company",
    [],
    ["reviewState"],
  ),
  "company.image.replaced": policy("companies", "Replaced company image", [
    "mimeType",
    "byteSize",
    "hadPrevious",
  ]),
  "company.image.removed": policy("companies", "Removed company image", [
    "hadPrevious",
  ]),
  "company.merged": policy("companies", "Merged duplicate company", [
    "movedEmploymentCount",
    "affectedMemberCount",
    "aliasesBefore",
    "aliasesAfter",
    "effect",
  ]),
  "role.linked": policy("roles", "Linked Discord role", [
    "permissionKeys",
    "discordRoleId",
    "discordRoleName",
    "checkedCount",
    "addedCount",
    "removedCount",
    "failedCount",
    "effect",
  ]),
  "role.permissions.updated": policy(
    "roles",
    "Updated role permissions",
    [],
    ["permissionKeys"],
  ),
  "role.issue_reminders.updated": policy(
    "roles",
    "Updated role issue reminders",
    [],
    ["enabled", "channelId"],
  ),
  "role.synced": policy("roles", "Synced linked role", [
    "checkedCount",
    "addedCount",
    "removedCount",
    "unchangedCount",
    "skippedCount",
    "failedCount",
    "effect",
  ]),
  "role.unlinked": policy("roles", "Unlinked Blade role", [
    "removedAssignmentCount",
    "permissionKeys",
    "effect",
  ]),
  "role.assignments.granted": policy("roles", "Granted role assignments", [
    "selectedCount",
    "succeededCount",
    "skippedCount",
    "failedCount",
    "roleId",
    "roleName",
    "stage",
    "compensated",
  ]),
  "role.assignments.revoked": policy("roles", "Revoked role assignments", [
    "selectedCount",
    "succeededCount",
    "skippedCount",
    "failedCount",
    "roleId",
    "roleName",
    "stage",
    "compensated",
  ]),
  "event.created": policy("events", "Created event", [
    "creationSource",
    "sourceEventId",
    "startAt",
    "endAt",
    "tagId",
    "discordStatus",
    "googleStatus",
  ]),
  "event.updated": policy(
    "events",
    "Updated event",
    ["discordStatus", "googleStatus"],
    ["name", "startAt", "endAt", "location", "tagId", "points", "roles"],
  ),
  "event.integration.repaired": policy("events", "Repaired event integration", [
    "providerScope",
    "discordStatus",
    "googleStatus",
  ]),
  "event.discord_projection.resolved": policy(
    "events",
    "Resolved Discord event projection",
    ["mode", "projectionId", "projectionType", "result"],
  ),
  "event.deleted": policy("events", "Deleted event", [
    "stage",
    "discordStatus",
    "googleStatus",
  ]),
  "event.tag.created": policy("events", "Created event tag", [
    "name",
    "color",
    "defaultPoints",
  ]),
  "event.tag.updated": policy(
    "events",
    "Updated event tag",
    [],
    ["name", "color", "defaultPoints"],
  ),
  "event.tag.archived": policy("events", "Archived event tag", [], ["active"]),
  "event.feedback_template.updated": policy(
    "events",
    "Updated global event feedback template",
    ["revisionBefore", "revisionAfter", "questionIds", "questionTypes"],
  ),
  "event.feedback_question.added": policy(
    "events",
    "Added event feedback question",
    ["questionId", "questionType", "revisionBefore", "revisionAfter"],
  ),
  "event.feedback_response.deleted": policy(
    "events",
    "Deleted event feedback response",
    ["rewardHistoryPreserved"],
  ),
  "alumni.bulletin.created": policy("alumni", "Created alumni bulletin post", [
    "state",
    "publishAt",
    "expiresAt",
    "formId",
    "hasExternalUrl",
    "hasImage",
  ]),
  "alumni.bulletin.updated": policy(
    "alumni",
    "Updated alumni bulletin post",
    ["changedFields"],
    [
      "title",
      "state",
      "publishAt",
      "expiresAt",
      "ctaLabel",
      "formId",
      "hasExternalUrl",
      "hasImage",
    ],
  ),
  "alumni.bulletin.reordered": policy("alumni", "Reordered alumni bulletin", [
    "postCount",
    "displayOrder",
  ]),
  "alumni.bulletin.archived": policy(
    "alumni",
    "Archived alumni bulletin post",
    ["priorState"],
    ["state"],
  ),
  "alumni.bulletin.restored": policy(
    "alumni",
    "Restored alumni bulletin post",
    ["priorState"],
    ["state"],
  ),
  "alumni.bulletin_image.uploaded": policy(
    "alumni",
    "Uploaded alumni bulletin image",
    ["mimeType", "byteSize"],
  ),
  "alumni.bulletin_image.removed": policy(
    "alumni",
    "Removed alumni bulletin image",
  ),
  "form.created": policy("forms", "Created form", [
    "name",
    "slug",
    "sectionId",
    "responseMode",
    "state",
    "questionCount",
  ]),
  "form.definition.updated": policy(
    "forms",
    "Updated form definition",
    ["revision", "questionIds", "questionTypes", "questionCount"],
    ["name", "slug", "definition"],
  ),
  "form.settings.updated": policy(
    "forms",
    "Updated form settings",
    [],
    [
      "state",
      "responseMode",
      "opensAt",
      "closesAt",
      "manualClosure",
      "sectionId",
      "respondentRoleIds",
    ],
  ),
  "form.published": policy("forms", "Published form", ["revision"], ["state"]),
  "form.archived": policy("forms", "Archived form", ["revision"], ["state"]),
  "form.deleted": policy("forms", "Deleted form", [
    "attachmentCount",
    "priorState",
  ]),
  "form.instruction_attachment.uploaded": policy(
    "forms",
    "Uploaded form instruction media",
    ["filename", "mimeType", "byteSize", "attachmentId"],
  ),
  "form.callback.configured": policy("forms", "Configured form callback", [
    "callbackSlug",
    "active",
    "mappingFields",
    "destinationIds",
  ]),
  "form.callback.disabled": policy("forms", "Disabled form callback", [
    "callbackSlug",
    "activeBefore",
    "activeAfter",
  ]),
  "form.callback.retried": policy("forms", "Retried form callback", [
    "callbackSlug",
    "attemptNumber",
    "result",
    "destinationType",
  ]),
  "form.response.deleted": policy("forms", "Deleted form response", [
    "submittedAt",
    "attachmentCount",
    "callbackEffectsPreserved",
  ]),
  "form.section.created": policy("forms", "Created form section", [
    "name",
    "viewerRoleIds",
    "editorRoleIds",
  ]),
  "form.section.updated": policy(
    "forms",
    "Updated form section",
    [],
    ["name", "viewerRoleIds", "editorRoleIds"],
  ),
  "form.response_attachment.accessed": policy(
    "forms",
    "Accessed form response attachment",
    ["filename", "mimeType", "byteSize", "storageKind"],
  ),
  "issue.tree.created": policy("issues", "Created issue tree", [
    "createdCount",
    "treeDepth",
    "teamId",
    "priority",
    "status",
    "assigneeIds",
    "eventId",
    "parentId",
    "originTemplateId",
  ]),
  "issue.status.changed": policy(
    "issues",
    "Changed issue status",
    ["revision"],
    ["status"],
  ),
  "issue.updated": policy(
    "issues",
    "Updated issue",
    ["revision"],
    [
      "name",
      "status",
      "priority",
      "dueAt",
      "teamId",
      "eventId",
      "parentId",
      "assigneeIds",
      "visibleTeamIds",
    ],
  ),
  "issue.tree.archived": policy("issues", "Archived issue tree", [
    "archivedCount",
    "archiveBatchId",
  ]),
  "issue.archive_batch.restored": policy(
    "issues",
    "Restored issue archive batch",
    ["restoredCount", "archiveBatchId"],
  ),
  "issue.template.created": policy("issues", "Created issue-tree template", [
    "name",
    "nodeCount",
    "treeDepth",
  ]),
  "issue.template.updated": policy(
    "issues",
    "Updated issue-tree template",
    ["nodeCount", "treeDepth"],
    ["name", "disabled"],
  ),
  "issue.template.disabled": policy(
    "issues",
    "Disabled issue-tree template",
    [],
    ["disabled"],
  ),
} as const;

export type AuditActionKey = keyof typeof AUDIT_ACTION_CATALOG;

export const AUDIT_ACTION_KEYS = Object.keys(
  AUDIT_ACTION_CATALOG,
) as AuditActionKey[];

export const auditActionKeySchema = z.enum(
  AUDIT_ACTION_KEYS as [AuditActionKey, ...AuditActionKey[]],
);

export const auditDomainSchema = z.enum(AUDIT_DOMAINS);

export const AUDIT_TARGET_TYPES = [
  "alumni_bulletin",
  "analytics_report",
  "attachment",
  "attendance",
  "bulletin_image",
  "bulletin_post",
  "callback_execution",
  "company",
  "discord_role",
  "dues_population",
  "employment",
  "event",
  "event_tag",
  "feedback_question",
  "feedback_template",
  "form",
  "form_response",
  "form_section",
  "issue",
  "issue_template",
  "issue_tree",
  "member",
  "member_directory",
  "provider",
  "role",
  "role_assignment_batch",
  "user",
] as const;

export const auditTargetTypeSchema = z.enum(AUDIT_TARGET_TYPES);
export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;

export const auditOutcomeSchema = z.enum(["committed", "partial_external"]);
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

export const auditResultOutcomeSchema = z.enum([
  "succeeded",
  "skipped",
  "failed_external",
  "failed_internal",
  "compensated",
]);
export type AuditResultOutcome = z.infer<typeof auditResultOutcomeSchema>;

export const auditSubjectRelationSchema = z.enum([
  "primary",
  "secondary",
  "result",
]);

export const auditJsonScalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const auditJsonValueSchema = z.union([
  auditJsonScalarSchema,
  z.array(auditJsonScalarSchema).max(200),
]);

export const auditMetadataSchema = z
  .record(z.string().min(1).max(64), auditJsonValueSchema)
  .refine((metadata) => Object.keys(metadata).length <= 64, {
    message: "Audit metadata has too many fields",
  });

export const auditChangeSchema = z
  .object({
    after: auditJsonValueSchema.optional(),
    before: auditJsonValueSchema.optional(),
    field: z.string().min(1).max(64),
  })
  .strict();

export const auditSubjectInputSchema = z
  .object({
    memberId: z.string().uuid().nullable().optional(),
    metadata: auditMetadataSchema.default({}),
    relation: auditSubjectRelationSchema,
    resultOutcome: auditResultOutcomeSchema.nullable().optional(),
    targetId: z.string().min(1).max(255),
    targetLabel: z.string().min(1).max(512),
    targetType: auditTargetTypeSchema,
  })
  .strict()
  .superRefine((subject, context) => {
    const isResult = subject.relation === "result";
    if (isResult !== Boolean(subject.resultOutcome)) {
      context.addIssue({
        code: "custom",
        message: "Only result subjects have a result outcome",
        path: ["resultOutcome"],
      });
    }
  });

export const auditCursorSchema = z
  .object({
    id: z.string().uuid(),
    occurredAt: z.date(),
  })
  .strict();

export const auditListInputSchema = z
  .object({
    actionKeys: z.array(auditActionKeySchema).max(20).optional(),
    actorUserId: z.string().uuid().optional(),
    cursor: auditCursorSchema.optional(),
    domains: z.array(auditDomainSchema).max(AUDIT_DOMAINS.length).optional(),
    from: z.date().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    memberId: z.string().uuid().optional(),
    outcomes: z.array(auditOutcomeSchema).max(2).optional(),
    search: z.string().trim().max(100).optional(),
    targetTypes: z
      .array(auditTargetTypeSchema)
      .max(AUDIT_TARGET_TYPES.length)
      .optional(),
    to: z.date().optional(),
  })
  .strict()
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: "The start date must be before the end date",
    path: ["from"],
  });

export type AuditListInput = z.infer<typeof auditListInputSchema>;

export const auditDetailInputSchema = z
  .object({ eventId: z.string().uuid() })
  .strict();

export const auditMemberSearchInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(100).default(""),
  })
  .strict();

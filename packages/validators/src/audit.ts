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
  "email",
  "events",
  "forms",
  // The hackathon product surface: which hackathons exist, the mail each sends
  // on a status change, and the classes hackers are split into. Separate from
  // "platform", which is Discord wiring, and from "events", which is Club.
  "hackathons",
  "issues",
  "members",
  // Platform wiring: which Discord server, channels, and roles the platform
  // resolves. Filed by effect rather than by table, the same rule that puts
  // `role.email_audience.updated` under "email" — "changed the recruiting
  // notification channel" is neither a roles nor an events action.
  "platform",
  "roles",
] as const;

export type AuditDomain = (typeof AUDIT_DOMAINS)[number];

export const AUDIT_ACTION_CATALOG = {
  "analytics.report.exported": policy(
    "analytics",
    "Exported analytics report",
    [
      "kind",
      "dateFrom",
      "dateTo",
      "eventIds",
      "rowCount",
      "phase",
      "hackathonId",
      "policyVersion",
      "policyAcknowledged",
      "pool",
      "skippedCount",
      "byteLength",
      "partNumber",
      "partCount",
      "planFingerprint",
      "failureFamily",
      "includedIndexKeys",
      "generatedAt",
    ],
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
  "hackathon_event.checked_in": policy(
    "attendance",
    "Processed hackathon event check-in",
    ["method", "purpose", "pointsAwarded", "repeatAllowed", "outcome"],
  ),
  "hackathon_event.attendance_voided": policy(
    "attendance",
    "Voided hackathon event attendance",
    ["pointsReversed", "reason"],
  ),
  "hackathon_event.roles_retried": policy(
    "attendance",
    "Retried hackathon Discord roles",
    ["grantCount", "succeededCount", "failedCount"],
  ),
  "hackathon_event.created": policy("hackathons", "Created hackathon event", [
    "creationSource",
    "discordStatus",
    "endAt",
    "googleStatus",
    "startAt",
    "tagId",
  ]),
  "hackathon_event.updated": policy(
    "hackathons",
    "Updated hackathon event",
    ["discordStatus", "googleStatus"],
    ["name", "startAt", "endAt", "location", "tagId", "points"],
  ),
  "hackathon_event.deleted": policy("hackathons", "Deleted hackathon event", [
    "stage",
    "discordStatus",
    "googleStatus",
  ]),
  "hackathon_event.integration_repaired": policy(
    "hackathons",
    "Repaired hackathon event integration",
    ["providerScope", "discordStatus", "googleStatus"],
  ),
  "hackathon_event.publication_desired_state.updated": policy(
    "hackathons",
    "Changed hackathon event publication",
    ["provider", "desiredEnabled", "revision", "workItemCount"],
  ),
  "hackathon_event.publication_retried": policy(
    "hackathons",
    "Retried hackathon event publication",
    ["provider", "requeuedCount", "blockedCount", "revision"],
  ),
  "hackathon_event.discord_projection.resolved": policy(
    "hackathons",
    "Resolved hackathon Discord event projection",
    ["mode", "projectionId", "projectionType", "result"],
  ),
  "hackathon_event.feedback_form_provisioned": policy(
    "hackathons",
    "Provisioned hackathon event feedback form",
    ["formId", "result"],
  ),
  "hackathon_event.tag.created": policy(
    "hackathons",
    "Created hackathon event tag",
    [
      "name",
      "color",
      "defaultPoints",
      "creationSource",
      "operationId",
      "sourceHackathonId",
      "sourceTagId",
      "targetHackathonId",
    ],
  ),
  "hackathon_event.tag.updated": policy(
    "hackathons",
    "Updated hackathon event tag",
    [],
    ["name", "color", "defaultPoints"],
  ),
  "hackathon_event.tag.archived": policy(
    "hackathons",
    "Archived hackathon event tag",
    [],
    ["active"],
  ),
  "hackathon.portal_client_updated": policy(
    "hackathons",
    "Updated hackathon portal client",
    ["enabled", "originHost"],
  ),
  "hackathon.agreement_created": policy(
    "hackathons",
    "Created hackathon agreement",
    ["stage", "key", "version", "required"],
  ),
  "hackathon.agreement_activated": policy(
    "hackathons",
    "Activated hackathon agreement",
    ["stage", "key", "version", "required"],
  ),
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
  "member.dues.payment_availability_updated": policy(
    "members",
    "Changed member dues payment availability",
    [],
    ["paymentsEnabled"],
  ),
  "member.dues.payment_started": policy(
    "members",
    "Started member dues payment",
    ["academicYear", "amount", "paymentIntentId"],
  ),
  "member.dues.paid": policy("members", "Paid member dues", [
    "academicYear",
    "amount",
    "paymentIntentId",
    "created",
  ]),
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
  "member.profile_picture.uploaded": policy(
    "members",
    "Uploaded member profile picture",
    ["mimeType", "byteSize"],
  ),
  "member.resume.replaced": policy("members", "Replaced member résumé", [
    "filename",
    "byteSize",
    "hadPrevious",
  ]),
  "member.resume.removed": policy("members", "Removed member résumé", [
    "hadPrevious",
  ]),
  "member.resume.uploaded": policy("members", "Uploaded member résumé", [
    "byteSize",
  ]),
  "member.employment.replaced": policy(
    "members",
    "Replaced member employment history",
    ["entryCountBefore", "entryCountAfter"],
  ),
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
  "email.template.created": policy("email", "Created email template", [
    "kind",
    "revisionVersion",
  ]),
  "email.template.draft_saved": policy(
    "email",
    "Saved email template draft",
    ["kind", "revisionVersion"],
    ["name", "kind"],
  ),
  "email.template.published": policy(
    "email",
    "Published email template",
    ["kind", "revisionVersion"],
    ["state"],
  ),
  "email.template.archived": policy(
    "email",
    "Archived email template",
    ["kind"],
    ["archived"],
  ),
  "email.template.duplicated": policy("email", "Duplicated email template", [
    "kind",
    "revisionVersion",
    "sourceTemplateId",
  ]),
  "email.send.previewed": policy("email", "Prepared email campaign preview", [
    "audienceGroupCount",
    "contentMode",
    "excludedManualCount",
    "recipientCount",
    "replacedDraft",
    "scheduledFor",
  ]),
  "email.send.confirmed": policy(
    "email",
    "Confirmed email campaign",
    ["recipientCount", "scheduledFor"],
    ["status"],
  ),
  "email.send.cancelled": policy(
    "email",
    "Cancelled email campaign",
    [],
    ["status"],
  ),
  "email.send.retry_queued": policy(
    "email",
    "Queued email campaign retry",
    ["retryAttemptCount"],
    ["status"],
  ),
  "email.test.sent": policy("email", "Sent test email", [
    "contentMode",
    "templateRevisionId",
  ]),
  "role.email_audience.updated": policy(
    "email",
    "Updated email audience role",
    [],
    ["enabled"],
  ),
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
  "role.club_classification.updated": policy(
    "roles",
    "Updated club roster classification",
    // `created` distinguishes a first classification, whose changes carry an
    // `after` with no `before`, from an edit of an existing row.
    ["created"],
    // `teamSlug`, not `teamId`: a UUID in an audit row is unreadable, and the
    // slug is both stable and human-legible.
    ["kind", "rank", "teamSlug", "rosterLabel", "calloutLabel"],
  ),
  "role.event_feedback_exclusion.updated": policy(
    "events",
    "Updated role event feedback exclusion",
    // No metadata, matching `role.email_audience.updated`, the sibling toggle.
    // The blast radius is a count recomputed at read time for the confirmation;
    // a count supplied by the client is a number the log cannot vouch for.
    [],
    ["excluded"],
  ),
  "discord_config.updated": policy(
    "platform",
    "Updated Discord configuration",
    // `isInert` records whether the key was read by anything at write time, so
    // a later reader can tell an inert-row cleanup from a live-wiring change
    // without re-deriving the classification from a code version they no
    // longer have.
    ["configKey", "configKind", "isInert", "guildRepointAcknowledged"],
    // Snowflakes go in the clear. They are public Discord IDs, and "what was it
    // before" is the entire point of the log.
    ["label", "description", "productionId", "developmentId"],
  ),
  "hackathon.created": policy("hackathons", "Created hackathon"),
  // Change fields declared so an update reads as a diff. `validateActionPayload`
  // rejects any field not listed here, so an undeclared field means the event
  // can never carry a before/after — which is the entire point of the log.
  "hackathon.updated": policy(
    "hackathons",
    "Updated hackathon",
    [],
    [
      "displayName",
      "theme",
      "applicationUrl",
      "applicationOpen",
      "applicationDeadline",
      "confirmationDeadline",
      "confirmationCapacity",
      "startDate",
      "endDate",
      "timezone",
      "eventAnnouncementChannelId",
      "generalHackerDiscordRoleId",
    ],
  ),
  "hackathon.deleted": policy("hackathons", "Deleted hackathon"),
  "project.inventory_imported": policy(
    "hackathons",
    "Imported project inventory",
    [
      "byteLength",
      "challengeCount",
      "collapsedDuplicateRows",
      "excludedDraftProjects",
      "fileHash",
      "memberCount",
      "projectCount",
      "rejectedProjects",
    ],
  ),
  "project.inventory_dropped": policy(
    "hackathons",
    "Permanently deleted project inventory",
    ["projectCount"],
  ),
  "project.updated": policy("hackathons", "Updated project", ["changedFields"]),
  "project.deleted": policy("hackathons", "Deleted project"),
  "project.restored": policy("hackathons", "Restored project"),
  // `status` names which applicant status the mail belongs to, and
  // `templateName` records what it pointed at *then* — the template can be
  // renamed later, and the log should not silently follow it.
  "hackathon.status_email_set": policy(
    "hackathons",
    "Set hackathon status email",
    ["status", "templateName"],
  ),
  "hackathon.status_email_cleared": policy(
    "hackathons",
    "Cleared hackathon status email",
    ["status"],
  ),
  // `kind` distinguishes an ordinary class from the hackathon's single VIP
  // entry, which behaves differently and cannot be inferred from the name.
  "hackathon.class_created": policy("hackathons", "Created hackathon class", [
    "kind",
  ]),
  // `discordRoleId` especially: repointing it re-grants Discord channel access,
  // so "what was it before" has to be answerable.
  "hackathon.class_updated": policy(
    "hackathons",
    "Updated hackathon class",
    [],
    ["name", "discordRoleId", "color"],
  ),
  "hackathon.class_deleted": policy("hackathons", "Deleted hackathon class"),
  // Hacker management. The status is carried **both** ways on purpose: as a
  // change diff, so the log renders "pending → denied" like every other edit,
  // and as metadata, so `previousStatus` and the `sendId` that carried the mail
  // are queryable. Note the stored value is what appears — an officer performs
  // a "capacity reject" and the log reads `denied`, because that is the value
  // in the column and a log that renamed it would not match the database.
  "hacker.status_changed": policy(
    "hackathons",
    "Changed hacker status",
    ["previousStatus", "status", "sendId"],
    ["status"],
  ),
  // One event per bulk action, not per hacker: the officer performed one act.
  // Counts rather than a name list, because a bulk of two hundred would
  // otherwise write a payload nobody reads.
  //
  // The trade-off is real and worth stating: an individual applicant's bulk
  // move is **not** separately recoverable from the log. Answering "who denied
  // me?" for someone caught in a bulk means finding the event by hackathon and
  // time, not by searching for that person. Per-hacker events for a
  // two-hundred-person bulk were judged worse.
  "hacker.bulk_status_changed": policy(
    "hackathons",
    "Bulk changed hacker status",
    // `skippedDuplicateEmail` is broken out because it is the only skip reason
    // that leaves no other trace: a blacklist leaves `blacklistedAt`, an
    // already-at-status leaves the status, a missing applicant leaves no row.
    // A collapsed duplicate exists nowhere else once the officer closes the
    // toast, and "why was I never told?" has to be answerable weeks later.
    [
      "status",
      "movedCount",
      "skippedCount",
      "skippedDuplicateEmail",
      "sendId",
      // True when the bulk moved more applicants than the event names
      // individually, so a partial subject list is never read as the whole set.
      "subjectsTruncated",
      // Non-zero only outside production, where sends are narrowed to the team.
      "withheldCount",
    ],
  ),
  // The reason is recorded here as well as on the row, because the row's
  // reason is overwritten by the next blacklist and the log is what survives.
  /*
    Manual point awards live in the audit log rather than a ledger table.

    `HackerAttendee.points` is a single integer with no history of its own, and
    the audit event already records actor, time, subject and metadata — which is
    exactly the ledger a manual award needs. Adding a table would duplicate that
    and require a migration; this does not.
  */
  "hacker.points_awarded": policy("hackathons", "Adjusted hacker points", [
    "delta",
    "reason",
    "resultingPoints",
  ]),
  // The correctable fields, named so the log shows which one an officer
  // touched. Deliberately not school, major or the MLH consent answers — those
  // are the applicant's own answers, not an officer's to rewrite.
  "hacker.profile_updated": policy(
    "hackathons",
    "Edited hacker profile",
    ["revision"],
    [
      "country",
      "dob",
      "discordUser",
      "email",
      "firstName",
      "foodAllergies",
      "gender",
      "githubProfileUrl",
      "gradDate",
      "lastName",
      "levelOfStudy",
      "linkedinProfileUrl",
      "major",
      "phoneNumber",
      "raceOrEthnicity",
      "school",
      "shirtSize",
      "websiteUrl",
    ],
  ),
  "hacker.application_submitted": policy(
    "hackathons",
    "Submitted hackathon application",
    ["status", "revision"],
  ),
  "hacker.application_updated": policy(
    "hackathons",
    "Updated hackathon application",
    ["revision"],
  ),
  "hacker.application_confirmed": policy(
    "hackathons",
    "Confirmed hackathon attendance",
    ["status"],
  ),
  "hacker.application_deleted": policy(
    "hackathons",
    "Deleted hackathon application",
    ["hackathonId", "legacySnapshotDeleted", "clearedCommandCount"],
  ),
  "hacker.application_withdrawn": policy(
    "hackathons",
    "Withdrew hackathon application",
    ["status"],
  ),
  "hacker.resume_uploaded": policy("hackathons", "Uploaded hacker résumé", [
    "byteSize",
    "hadPrevious",
    "revision",
  ]),
  "hacker.resume_replaced": policy("hackathons", "Replaced hacker résumé", [
    "byteSize",
    "hadPrevious",
    "revision",
  ]),
  "hacker.resume_removed": policy("hackathons", "Removed hacker résumé", [
    "hadPrevious",
    "revision",
  ]),
  "hacker.resume_accessed": policy("hackathons", "Accessed hacker résumé", [
    "hadPrevious",
  ]),
  "hacker.check_in_pass_issued": policy(
    "hackathons",
    "Issued hacker check-in pass",
    ["version"],
  ),
  "hacker.blacklisted": policy("hackathons", "Blacklisted hacker", ["reason"]),
  "hacker.unblacklisted": policy("hackathons", "Removed hacker blacklist"),
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
  "check_in_attempt",
  "company",
  "discord_config",
  "discord_role",
  "dues_population",
  "dues_configuration",
  "employment",
  "email_send",
  "email_template",
  "event",
  "event_tag",
  "feedback_question",
  "feedback_template",
  "form",
  "form_response",
  "form_section",
  "hackathon",
  "hackathon_agreement",
  "hackathon_class",
  "hacker_attendee",
  "hacker_profile",
  "issue",
  "issue_template",
  "issue_tree",
  "member",
  "member_directory",
  "provider",
  "project",
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

export const auditCheckInOutcomeSchema = z.enum([
  "checked_in",
  "already_checked_in",
  "invalid_qr",
  "hacker_not_found",
  "wrong_status",
  "not_checked_in",
  "wrong_class",
  "not_ready",
]);

export type AuditCheckInOutcome = z.infer<typeof auditCheckInOutcomeSchema>;

export const auditListInputSchema = z
  .object({
    actionKeys: z.array(auditActionKeySchema).max(20).optional(),
    actorUserId: z.string().uuid().optional(),
    checkInOutcomes: z.array(auditCheckInOutcomeSchema).max(8).optional(),
    cursor: auditCursorSchema.optional(),
    domains: z.array(auditDomainSchema).max(AUDIT_DOMAINS.length).optional(),
    from: z.date().optional(),
    hackerAttendeeId: z.string().uuid().optional(),
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

export const auditHackerSearchInputSchema = auditMemberSearchInputSchema;

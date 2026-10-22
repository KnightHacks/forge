import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTableCreator,
  unique,
} from "drizzle-orm/pg-core";

import { User } from "./auth";

const createTable = pgTableCreator((name) => `knight_hacks_case_study_${name}`);

export const CaseStudy = createTable(
  "study",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    slug: t.varchar({ length: 120 }).notNull().unique(),
    ownerUserId: t.uuid().references(() => User.id, { onDelete: "set null" }),
    publishedRevisionId: t.uuid(),
    visibility: t.varchar({ length: 16 }).notNull().default("active"),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    publishedRevisionFk: foreignKey({
      columns: [table.publishedRevisionId, table.id],
      foreignColumns: [CaseStudyRevision.id, CaseStudyRevision.caseStudyId],
      name: "case_study_published_revision_same_study_fk",
    }).onDelete("restrict"),
    visibilityCheck: check(
      "case_study_visibility_check",
      sql`${table.visibility} IN ('active', 'suspended', 'withdrawn')`,
    ),
    ownerIdx: index("case_study_owner_idx").on(table.ownerUserId),
  }),
);

export const CaseStudyDraft = createTable(
  "draft",
  (t) => ({
    caseStudyId: t
      .uuid()
      .primaryKey()
      .references(() => CaseStudy.id, { onDelete: "restrict" }),
    ownerUserId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    version: t.integer().notNull().default(0),
    content: t
      .jsonb()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    versionCheck: check(
      "case_study_draft_version_check",
      sql`${table.version} >= 0`,
    ),
  }),
);

export const CaseStudyRevision = createTable(
  "revision",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    caseStudyId: t
      .uuid()
      .notNull()
      .references((): AnyPgColumn => CaseStudy.id, { onDelete: "restrict" }),
    revisionNo: t.integer().notNull(),
    content: t.jsonb(),
    contentHash: t.varchar({ length: 64 }).notNull(),
    privateEvidence: t.jsonb(),
    authorConnection: t.varchar({ length: 32 }).notNull(),
    attributionSubjectIds: t
      .uuid()
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    attributionHashes: t
      .varchar({ length: 64 })
      .array()
      .notNull()
      .default(sql`ARRAY[]::varchar(64)[]`),
    submitterUserId: t.uuid().notNull(),
    submittedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    redactedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    revisionNoUnique: unique("case_study_revision_number_unique").on(
      table.caseStudyId,
      table.revisionNo,
    ),
    sameStudyTarget: unique("case_study_revision_id_study_unique").on(
      table.id,
      table.caseStudyId,
    ),
    revisionNoCheck: check(
      "case_study_revision_no_check",
      sql`${table.revisionNo} > 0`,
    ),
    contentHashCheck: check(
      "case_study_revision_hash_check",
      sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    payloadCheck: check(
      "case_study_revision_payload_check",
      sql`${table.content} IS NOT NULL OR ${table.redactedAt} IS NOT NULL`,
    ),
    connectionCheck: check(
      "case_study_revision_connection_check",
      sql`${table.authorConnection} IN ('member', 'alumni', 'community', 'other')`,
    ),
    attributionPairCheck: check(
      "case_study_revision_attribution_pair_check",
      sql`cardinality(${table.attributionSubjectIds}) = cardinality(${table.attributionHashes}) AND array_position(${table.attributionSubjectIds}, NULL) IS NULL AND array_position(${table.attributionHashes}, NULL) IS NULL AND (cardinality(${table.attributionHashes}) = 0 OR array_to_string(${table.attributionHashes}, ',') ~ '^([0-9a-f]{64})(,[0-9a-f]{64})*$')`,
    ),
  }),
);

export const CaseStudyContributor = createTable(
  "contributor",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    caseStudyId: t
      .uuid()
      .notNull()
      .references(() => CaseStudy.id, { onDelete: "restrict" }),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    attribution: t.jsonb().notNull(),
    canEdit: t.boolean().notNull().default(false),
    display: t.boolean().notNull().default(false),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    accountUnique: unique("case_study_contributor_account_unique").on(
      table.caseStudyId,
      table.userId,
    ),
    userIdx: index("case_study_contributor_user_idx").on(table.userId),
  }),
);

export const CaseStudyInvitation = createTable(
  "invitation",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    caseStudyId: t
      .uuid()
      .notNull()
      .references(() => CaseStudy.id, { onDelete: "restrict" }),
    tokenHash: t.varchar({ length: 64 }).unique(),
    attributionHash: t.varchar({ length: 64 }).notNull(),
    targetUserId: t.uuid().references(() => User.id, { onDelete: "cascade" }),
    redeemerUserId: t.uuid().references(() => User.id, { onDelete: "cascade" }),
    confirmingUserId: t
      .uuid()
      .references(() => User.id, { onDelete: "cascade" }),
    status: t.varchar({ length: 16 }).notNull().default("pending"),
    expiresAt: t.timestamp({ withTimezone: true }).notNull(),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    statusCheck: check(
      "case_study_invitation_status_check",
      sql`${table.status} IN ('pending', 'redeemed', 'confirmed', 'consumed', 'revoked')`,
    ),
    expiryCheck: check(
      "case_study_invitation_expiry_check",
      sql`${table.expiresAt} <= ${table.createdAt} + interval '14 days'`,
    ),
    tokenCheck: check(
      "case_study_invitation_token_check",
      sql`(${table.status} IN ('consumed', 'revoked')) = (${table.tokenHash} IS NULL)`,
    ),
    hashCheck: check(
      "case_study_invitation_hash_check",
      sql`${table.attributionHash} ~ '^[0-9a-f]{64}$' AND (${table.tokenHash} IS NULL OR ${table.tokenHash} ~ '^[0-9a-f]{64}$')`,
    ),
  }),
);

export const CaseStudyConsentDecision = createTable(
  "consent_decision",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    caseStudyId: t
      .uuid()
      .notNull()
      .references(() => CaseStudy.id, { onDelete: "restrict" }),
    subjectUserId: t.uuid().notNull(),
    confirmerUserId: t.uuid(),
    attributionHash: t.varchar({ length: 64 }).notNull(),
    policyVersion: t.integer().notNull(),
    action: t.varchar({ length: 16 }).notNull(),
    decidedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    actionCheck: check(
      "case_study_consent_action_check",
      sql`${table.action} IN ('accept', 'decline', 'revoke')`,
    ),
    policyCheck: check(
      "case_study_consent_policy_check",
      sql`${table.policyVersion} > 0`,
    ),
    hashCheck: check(
      "case_study_consent_hash_check",
      sql`${table.attributionHash} ~ '^[0-9a-f]{64}$'`,
    ),
    subjectIdx: index("case_study_consent_subject_idx").on(
      table.caseStudyId,
      table.subjectUserId,
      table.decidedAt,
    ),
  }),
);

export const CaseStudyReviewDecision = createTable(
  "review_decision",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    revisionId: t
      .uuid()
      .notNull()
      .references(() => CaseStudyRevision.id, { onDelete: "restrict" }),
    stage: t.varchar({ length: 16 }).notNull(),
    outcome: t.varchar({ length: 24 }).notNull(),
    reviewerUserId: t.uuid().notNull(),
    feedback: t.text(),
    eligibility: t.varchar({ length: 24 }),
    evidenceBasis: t.varchar({ length: 32 }),
    claimsVerified: t.boolean(),
    decidedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    redactedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => ({
    stageUnique: unique("case_study_review_stage_unique").on(
      table.revisionId,
      table.stage,
    ),
    stageCheck: check(
      "case_study_review_stage_check",
      sql`${table.stage} IN ('technical', 'editorial')`,
    ),
    outcomeCheck: check(
      "case_study_review_outcome_check",
      sql`${table.outcome} IN ('approve', 'changes_requested', 'reject')`,
    ),
    editorialCheck: check(
      "case_study_review_editorial_check",
      sql`(${table.stage} = 'technical' AND ${table.eligibility} IS NULL AND ${table.evidenceBasis} IS NULL AND ${table.claimsVerified} IS NULL) OR (${table.stage} = 'editorial' AND ${table.eligibility} IS NOT NULL AND ${table.eligibility} IN ('verified', 'unable_to_verify') AND ${table.evidenceBasis} IS NOT NULL AND ${table.claimsVerified} IS NOT NULL AND (${table.outcome} <> 'approve' OR (${table.eligibility} = 'verified' AND ${table.claimsVerified} IS TRUE)))`,
    ),
    evidenceBasisCheck: check(
      "case_study_review_evidence_basis_check",
      sql`${table.evidenceBasis} IS NULL OR ${table.evidenceBasis} IN ('member_record', 'role_record', 'event_record', 'supporting_evidence', 'community_attestation', 'insufficient')`,
    ),
  }),
);

export const CaseStudyPublicationEvent = createTable(
  "publication_event",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    revisionId: t
      .uuid()
      .notNull()
      .references(() => CaseStudyRevision.id, { onDelete: "restrict" }),
    action: t.varchar({ length: 16 }).notNull(),
    actorUserId: t.uuid().notNull(),
    reasonCode: t.varchar({ length: 64 }).notNull(),
    occurredAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => ({
    actionCheck: check(
      "case_study_publication_action_check",
      sql`${table.action} IN ('publish', 'suspend', 'withdraw', 'transfer', 'anonymize')`,
    ),
    reasonCheck: check(
      "case_study_publication_reason_check",
      sql`${table.reasonCode} IN ('owner_request', 'consent_revoked', 'eligibility_failed', 'editorial_hold', 'ownership_transfer', 'privacy_request', 'policy_violation', 'correction')`,
    ),
  }),
);

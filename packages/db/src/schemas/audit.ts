import { sql } from "drizzle-orm";
import { check, index, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `audit_${name}`);

export type AuditJsonScalar = boolean | number | string | null;
export type AuditJsonValue = AuditJsonScalar | AuditJsonScalar[];

export interface AuditChange {
  after?: AuditJsonValue;
  before?: AuditJsonValue;
  field: string;
}

export type AuditMetadata = Record<string, AuditJsonValue>;

export const AdminAuditEvent = createTable(
  "event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    occurredAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    actionKey: t.varchar({ length: 128 }).notNull(),
    domain: t.varchar({ length: 32 }).notNull(),
    outcome: t.varchar({ length: 32 }).notNull(),
    operationId: t.uuid(),
    actorUserId: t.uuid().notNull(),
    actorMemberId: t.uuid(),
    actorDiscordUserId: t.varchar({ length: 255 }),
    actorLabel: t.varchar({ length: 255 }).notNull(),
    actorRoleLabel: t.varchar({ length: 255 }),
    actorRoleColor: t.varchar({ length: 7 }),
    metadata: t
      .jsonb()
      .$type<AuditMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    changes: t
      .jsonb()
      .$type<AuditChange[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
  }),
  (table) => ({
    actionOccurredIdx: index("audit_event_action_occurred_idx").on(
      table.actionKey,
      table.occurredAt,
      table.id,
    ),
    actorOccurredIdx: index("audit_event_actor_occurred_idx").on(
      table.actorUserId,
      table.occurredAt,
      table.id,
    ),
    actorMemberOccurredIdx: index("audit_event_actor_member_occurred_idx").on(
      table.actorMemberId,
      table.occurredAt,
      table.id,
    ),
    domainOccurredIdx: index("audit_event_domain_occurred_idx").on(
      table.domain,
      table.occurredAt,
      table.id,
    ),
    occurredIdx: index("audit_event_occurred_idx").on(
      table.occurredAt,
      table.id,
    ),
    operationIdx: index("audit_event_operation_idx").on(table.operationId),
    outcomeOccurredIdx: index("audit_event_outcome_occurred_idx").on(
      table.outcome,
      table.occurredAt,
      table.id,
    ),
    validActorRoleColor: check(
      "audit_event_actor_role_color_check",
      sql`${table.actorRoleColor} IS NULL OR ${table.actorRoleColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    validOutcome: check(
      "audit_event_outcome_check",
      sql`${table.outcome} IN ('committed', 'partial_external')`,
    ),
  }),
);

export const AdminAuditSubject = createTable(
  "subject",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    eventId: t
      .uuid()
      .notNull()
      .references(() => AdminAuditEvent.id, { onDelete: "cascade" }),
    relation: t.varchar({ length: 16 }).notNull(),
    targetType: t.varchar({ length: 64 }).notNull(),
    targetId: t.varchar({ length: 255 }).notNull(),
    targetLabel: t.varchar({ length: 512 }).notNull(),
    memberId: t.uuid(),
    resultOutcome: t.varchar({ length: 32 }),
    position: t.integer().notNull().default(0),
    metadata: t
      .jsonb()
      .$type<AuditMetadata>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  }),
  (table) => ({
    eventPositionIdx: index("audit_subject_event_position_idx").on(
      table.eventId,
      table.position,
      table.id,
    ),
    memberEventIdx: index("audit_subject_member_event_idx").on(
      table.memberId,
      table.eventId,
    ),
    onePrimarySubject: uniqueIndex("audit_subject_one_primary_idx")
      .on(table.eventId)
      .where(sql`${table.relation} = 'primary'`),
    targetEventIdx: index("audit_subject_target_event_idx").on(
      table.targetType,
      table.targetId,
      table.eventId,
    ),
    validRelation: check(
      "audit_subject_relation_check",
      sql`${table.relation} IN ('primary', 'secondary', 'result')`,
    ),
    validResultOutcome: check(
      "audit_subject_result_outcome_check",
      sql`${table.resultOutcome} IS NULL OR ${table.resultOutcome} IN ('succeeded', 'skipped', 'failed_external', 'failed_internal', 'compensated')`,
    ),
    resultOutcomeShape: check(
      "audit_subject_result_outcome_shape_check",
      sql`(${table.relation} = 'result') = (${table.resultOutcome} IS NOT NULL)`,
    ),
  }),
);

export type InsertAdminAuditEvent = typeof AdminAuditEvent.$inferInsert;
export type SelectAdminAuditEvent = typeof AdminAuditEvent.$inferSelect;
export type InsertAdminAuditSubject = typeof AdminAuditSubject.$inferInsert;
export type SelectAdminAuditSubject = typeof AdminAuditSubject.$inferSelect;

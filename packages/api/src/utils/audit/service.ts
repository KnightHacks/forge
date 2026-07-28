import type {
  AuditActionKey,
  AuditOutcome,
  AuditResultOutcome,
  AuditTargetType,
} from "@forge/validators";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { AdminAuditEvent, AdminAuditSubject } from "@forge/db/schemas/audit";
import { Permissions, Roles } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import {
  AUDIT_ACTION_CATALOG,
  auditActionKeySchema,
  auditChangeSchema,
  auditMetadataSchema,
  auditOutcomeSchema,
  auditSubjectInputSchema,
} from "@forge/validators";

import type { WriteDb } from "../db";
import { isBladeE2E } from "../../env";
import { loadClubTeamConfig } from "../guild/club-team-config";
import { getGuildRoleCallout } from "../guild/role-callout";

const BLADE_E2E_AUDIT_EVENT_ID = "00000000-0000-4000-8000-000000000000";

export interface AuditActor {
  discordUserId?: string | null;
  id: string;
  name?: string | null;
  snapshot?: {
    memberId: string | null;
    roleColor: string | null;
    roleLabel: string | null;
  };
}

export interface AuditChangeInput {
  after?:
    | boolean
    | number
    | string
    | null
    | (boolean | number | string | null)[];
  before?:
    | boolean
    | number
    | string
    | null
    | (boolean | number | string | null)[];
  field: string;
}

export interface AuditSubjectInput {
  memberId?: string | null;
  metadata?: Record<
    string,
    boolean | number | string | null | (boolean | number | string | null)[]
  >;
  relation: "primary" | "result" | "secondary";
  resultOutcome?: AuditResultOutcome | null;
  targetId: string;
  targetLabel: string;
  targetType: AuditTargetType;
}

export interface CreateAdminAuditEventInput {
  actionKey: AuditActionKey;
  actor: AuditActor;
  changes?: AuditChangeInput[];
  metadata?: Record<
    string,
    boolean | number | string | null | (boolean | number | string | null)[]
  >;
  occurredAt?: Date;
  operationId?: string | null;
  outcome?: AuditOutcome;
  subjects: AuditSubjectInput[];
}

export function validateActionPayload(
  actionKey: AuditActionKey,
  metadata: CreateAdminAuditEventInput["metadata"],
  changes: AuditChangeInput[] | undefined,
) {
  auditActionKeySchema.parse(actionKey);
  const actionPolicy = AUDIT_ACTION_CATALOG[actionKey];
  const metadataKeys = new Set<string>(actionPolicy.metadataKeys);
  const changeFields = new Set<string>(actionPolicy.changeFields);
  const parsedMetadata = auditMetadataSchema.parse(metadata ?? {});
  const parsedChanges = (changes ?? []).map((change) =>
    auditChangeSchema.parse(change),
  );

  for (const key of Object.keys(parsedMetadata)) {
    if (!metadataKeys.has(key)) {
      throw new Error(
        `Audit metadata key "${key}" is not allowed for ${actionKey}`,
      );
    }
  }
  for (const change of parsedChanges) {
    if (!changeFields.has(change.field)) {
      throw new Error(
        `Audit change field "${change.field}" is not allowed for ${actionKey}`,
      );
    }
  }

  return { actionPolicy, parsedChanges, parsedMetadata };
}

export function validateSubjects(
  actionKey: AuditActionKey,
  subjects: AuditSubjectInput[],
) {
  const actionPolicy = AUDIT_ACTION_CATALOG[actionKey];
  const metadataKeys = new Set<string>(actionPolicy.metadataKeys);
  const parsed = subjects.map((subject) =>
    auditSubjectInputSchema.parse({
      ...subject,
      metadata: subject.metadata ?? {},
    }),
  );

  if (parsed.filter((subject) => subject.relation === "primary").length !== 1) {
    throw new Error("An audit event must have exactly one primary subject");
  }

  for (const subject of parsed) {
    for (const key of Object.keys(subject.metadata)) {
      if (!metadataKeys.has(key)) {
        throw new Error(
          `Audit subject metadata key "${key}" is not allowed for ${actionKey}`,
        );
      }
    }
  }

  return parsed;
}

async function resolveActorSnapshot(actor: AuditActor, executor: WriteDb) {
  const actorLabel = actor.name?.trim();
  if (actor.snapshot) {
    return {
      actorDiscordUserId: actor.discordUserId ?? null,
      actorLabel: actorLabel?.length ? actorLabel : "Unknown administrator",
      actorMemberId: actor.snapshot.memberId,
      actorRoleColor: actor.snapshot.roleColor,
      actorRoleLabel: actor.snapshot.roleLabel,
      actorUserId: actor.id,
    };
  }

  const [member] = await executor
    .select({ id: Member.id })
    .from(Member)
    .where(eq(Member.userId, actor.id))
    .limit(1);
  const roles = await executor
    .select({
      color: Roles.teamHexcodeColor,
      roleId: Roles.id,
    })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .where(eq(Permissions.userId, actor.id));
  const roleCallout = getGuildRoleCallout(
    await loadClubTeamConfig(executor),
    roles,
  );

  return {
    actorDiscordUserId: actor.discordUserId ?? null,
    actorLabel: actorLabel?.length ? actorLabel : "Unknown administrator",
    actorMemberId: member?.id ?? null,
    actorRoleColor: roleCallout?.color ?? null,
    actorRoleLabel: roleCallout?.label ?? null,
    actorUserId: actor.id,
  };
}

export async function captureAdminAuditActor(
  actor: AuditActor,
  executor: WriteDb = db,
): Promise<AuditActor> {
  const snapshot = await resolveActorSnapshot(
    { ...actor, snapshot: undefined },
    executor,
  );
  return {
    ...actor,
    snapshot: {
      memberId: snapshot.actorMemberId,
      roleColor: snapshot.actorRoleColor,
      roleLabel: snapshot.actorRoleLabel,
    },
  };
}

export async function createAdminAuditEvent(
  input: CreateAdminAuditEventInput,
  executor: WriteDb = db,
) {
  const outcome = auditOutcomeSchema.parse(input.outcome ?? "committed");
  const { actionPolicy, parsedChanges, parsedMetadata } = validateActionPayload(
    input.actionKey,
    input.metadata,
    input.changes,
  );
  const subjects = validateSubjects(input.actionKey, input.subjects);
  if (
    subjects.some((subject) => subject.relation === "result") &&
    !input.operationId
  ) {
    throw new Error("Audit result subjects require an explicit operation ID");
  }
  if (isBladeE2E) return { id: BLADE_E2E_AUDIT_EVENT_ID };

  const actorSnapshot = await resolveActorSnapshot(input.actor, executor);
  const [event] = await executor
    .insert(AdminAuditEvent)
    .values({
      ...actorSnapshot,
      actionKey: input.actionKey,
      changes: parsedChanges,
      domain: actionPolicy.domain,
      metadata: parsedMetadata,
      occurredAt: input.occurredAt,
      operationId: input.operationId ?? null,
      outcome,
    })
    .returning({ id: AdminAuditEvent.id });

  if (!event) {
    throw new Error("Admin audit event insert did not return an ID");
  }

  await executor.insert(AdminAuditSubject).values(
    subjects.map((subject, position) => ({
      eventId: event.id,
      memberId: subject.memberId ?? null,
      metadata: subject.metadata,
      position,
      relation: subject.relation,
      resultOutcome: subject.resultOutcome ?? null,
      targetId: subject.targetId,
      targetLabel: subject.targetLabel,
      targetType: subject.targetType,
    })),
  );

  return { id: event.id };
}

export async function appendAdminAuditResults(
  input: {
    actionKey: AuditActionKey;
    eventId: string;
    results: Omit<AuditSubjectInput, "relation">[];
  },
  executor: WriteDb = db,
) {
  // Validated ahead of the Blade E2E short-circuit, the same way
  // `createAdminAuditEvent` orders it. Skipping validation too left the append
  // path with no end-to-end coverage at all: a malformed result subject passed
  // silently under the harness and only failed once it reached a real database.
  const subjects = validateSubjects(input.actionKey, [
    {
      relation: "primary",
      targetId: input.eventId,
      targetLabel: "validation-only",
      targetType: "provider",
    },
    ...input.results.map((result) => ({
      ...result,
      relation: "result" as const,
    })),
  ]).slice(1);
  if (isBladeE2E) return;

  const [event] = await executor
    .select({
      actionKey: AdminAuditEvent.actionKey,
      operationId: AdminAuditEvent.operationId,
    })
    .from(AdminAuditEvent)
    .where(eq(AdminAuditEvent.id, input.eventId))
    .limit(1);
  if (!event) {
    throw new Error("Admin audit event not found");
  }
  if (event.actionKey !== input.actionKey) {
    throw new Error("Admin audit action key does not match the parent event");
  }
  if (!event.operationId) {
    throw new Error(
      "Admin audit result subjects require a parent operation ID",
    );
  }

  const existing = await executor
    .select({
      position: AdminAuditSubject.position,
      relation: AdminAuditSubject.relation,
    })
    .from(AdminAuditSubject)
    .where(eq(AdminAuditSubject.eventId, input.eventId));
  if (existing.some((subject) => subject.relation === "result")) {
    throw new Error("Admin audit results have already been appended");
  }
  const startingPosition =
    existing.reduce(
      (maximum, subject) => Math.max(maximum, subject.position),
      -1,
    ) + 1;

  if (subjects.length > 0) {
    await executor.insert(AdminAuditSubject).values(
      subjects.map((subject, index) => ({
        eventId: input.eventId,
        memberId: subject.memberId ?? null,
        metadata: subject.metadata,
        position: startingPosition + index,
        relation: "result" as const,
        resultOutcome: subject.resultOutcome,
        targetId: subject.targetId,
        targetLabel: subject.targetLabel,
        targetType: subject.targetType,
      })),
    );
  }
}

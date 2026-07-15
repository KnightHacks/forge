import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { DISCORD } from "@forge/consts";
import { and, eq, inArray, lte, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  FormCallbackConfiguration,
  FormCallbackExecution,
  Member,
} from "@forge/db/schemas/knight-hacks";
import * as discord from "@forge/utils/discord";
import { callbackConfigurationSchema } from "@forge/validators";

import type { WriteDb } from "../db";
import type { PermissionMap } from "../permissions";
import { liveRoleDiscordGateway } from "../roles/discord-gateway";
import {
  assertAllowedFormCallbackDiscordRole,
  formCallbackDeliveryNonce,
  RETRYABLE_FORM_CALLBACK_STATUSES,
} from "./callback-policy";
import {
  assertCallbackMappingsMatchSchema,
  mapFormCallbackInput,
} from "./callbacks";
import { formCallbackRegistry } from "./registry";

const LEASE_MS = 5 * 60 * 1000;

async function requireAllowedAssignableRole(database: WriteDb, roleId: string) {
  const parsedRoleId = z.string().uuid().parse(roleId);
  const role = await database.query.Roles.findFirst({
    where: eq(Roles.id, parsedRoleId),
  });
  if (!role) throw new Error("The selected assignable role no longer exists.");
  assertAllowedFormCallbackDiscordRole(role.discordRoleId);
  return role;
}

export async function saveFormCallbackConfiguration(input: {
  callbackSlug: string;
  formDefinition: unknown;
  formId: string;
  mappings: unknown;
  permissions: PermissionMap;
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
}) {
  const parsed = callbackConfigurationSchema.parse({
    callbackSlug: input.callbackSlug,
    mappings: input.mappings,
    responseMode: input.responseMode,
  });
  const definition = formCallbackRegistry.get(parsed.callbackSlug);
  if (!definition) throw new Error("Callback is not registered.");

  if (
    !input.permissions.IS_OFFICER &&
    !input.permissions[definition.requiredPermission]
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${definition.requiredPermission} is required to configure this callback.`,
    });
  }

  assertCallbackMappingsMatchSchema({
    callbackSchema: definition.inputSchema,
    formDefinition: input.formDefinition,
    mappings: parsed.mappings,
  });

  if (parsed.callbackSlug === "discord.assign-role") {
    const fixedRoleIds = parsed.mappings.flatMap((mapping) =>
      mapping.inputKey === "roleId" &&
      mapping.source.kind === "fixed" &&
      typeof mapping.source.value === "string"
        ? [mapping.source.value]
        : [],
    );
    if (fixedRoleIds.length > 0) {
      for (const roleId of new Set(fixedRoleIds)) {
        await requireAllowedAssignableRole(db, roleId);
      }
    }
  }

  const [saved] = await db
    .insert(FormCallbackConfiguration)
    .values({
      callbackSlug: parsed.callbackSlug,
      formId: input.formId,
      mappings: parsed.mappings,
    })
    .onConflictDoUpdate({
      set: { active: true, mappings: parsed.mappings, updatedAt: new Date() },
      target: [
        FormCallbackConfiguration.formId,
        FormCallbackConfiguration.callbackSlug,
      ],
    })
    .returning();
  return saved;
}

export async function enqueueConfiguredFormCallbacks(input: {
  answers: Record<string, unknown>;
  database: WriteDb;
  formId: string;
  responseId: string;
  submittedAt: Date;
  userId: string;
}) {
  const configurations = await input.database
    .select()
    .from(FormCallbackConfiguration)
    .where(
      and(
        eq(FormCallbackConfiguration.formId, input.formId),
        eq(FormCallbackConfiguration.active, true),
      ),
    );
  if (configurations.length === 0) return [];

  const member = await input.database.query.Member.findFirst({
    columns: { id: true },
    where: eq(Member.userId, input.userId),
  });
  const executions: (typeof FormCallbackExecution.$inferSelect)[] = [];

  for (const configuration of configurations) {
    let mappedInput: Record<string, unknown> = {};
    let lastError: string | null = null;
    let status: "failed" | "pending" = "pending";
    try {
      const parsed = callbackConfigurationSchema.shape.mappings.parse(
        configuration.mappings,
      );
      mappedInput = mapFormCallbackInput(parsed, {
        answers: input.answers,
        system: {
          event_id: null,
          member_id: member?.id ?? null,
          response_id: input.responseId,
          submitted_at: input.submittedAt.toISOString(),
          user_id: input.userId,
        },
      });
      const definition = formCallbackRegistry.get(configuration.callbackSlug);
      if (!definition) throw new Error("Callback is no longer registered.");
      mappedInput = definition.inputSchema.parse(mappedInput) as Record<
        string,
        unknown
      >;
      if (configuration.callbackSlug === "discord.assign-role") {
        await requireAllowedAssignableRole(
          input.database,
          z.string().uuid().parse(mappedInput.roleId),
        );
      }
    } catch (cause) {
      status = "failed";
      lastError =
        cause instanceof Error
          ? cause.message.slice(0, 2_000)
          : "Invalid callback input.";
    }

    const [execution] = await input.database
      .insert(FormCallbackExecution)
      .values({
        callbackSlug: configuration.callbackSlug,
        configurationId: configuration.id,
        input: mappedInput,
        lastError,
        responseId: input.responseId,
        status,
      })
      .returning();
    if (execution) executions.push(execution);
  }
  return executions;
}

async function runAssignRole(input: { memberId: string; roleId: string }) {
  const [member, role] = await Promise.all([
    db
      .select({ discordUserId: User.discordUserId, userId: Member.userId })
      .from(Member)
      .innerJoin(User, eq(Member.userId, User.id))
      .where(eq(Member.id, input.memberId))
      .then((rows) => rows[0]),
    requireAllowedAssignableRole(db, input.roleId),
  ]);
  if (!member) throw new Error("Callback member was not found.");
  const gateway = liveRoleDiscordGateway;
  await gateway.grantRole(member.discordUserId, role.discordRoleId);
  try {
    await db
      .insert(Permissions)
      .values({ roleId: role.id, userId: member.userId })
      .onConflictDoNothing();
  } catch (cause) {
    await gateway.revokeRole(member.discordUserId, role.discordRoleId);
    throw cause;
  }
}

async function runRecruitingNotification(
  input: {
    memberId: string;
    note: string;
  },
  executionId: string,
) {
  const member = await db.query.Member.findFirst({
    where: eq(Member.id, input.memberId),
  });
  if (!member) throw new Error("Callback member was not found.");
  await discord.api.post(Routes.channelMessages(DISCORD.RECRUITING_CHANNEL), {
    body: {
      content: `**Form recruiting notification**\n${member.firstName} ${member.lastName} (${member.email})\n${input.note}`,
      allowed_mentions: { parse: [] },
      enforce_nonce: true,
      nonce: formCallbackDeliveryNonce(executionId),
    },
  });
}

export async function dispatchFormCallbackExecution(executionId: string) {
  const leaseToken = randomUUID();
  const now = new Date();
  const [execution] = await db
    .update(FormCallbackExecution)
    .set({
      attempts: sql`${FormCallbackExecution.attempts} + 1`,
      lastError: null,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      leaseToken,
      status: "running",
      updatedAt: now,
    })
    .where(
      and(
        eq(FormCallbackExecution.id, executionId),
        or(
          inArray(
            FormCallbackExecution.status,
            RETRYABLE_FORM_CALLBACK_STATUSES,
          ),
          and(
            eq(FormCallbackExecution.status, "running"),
            lte(FormCallbackExecution.leaseExpiresAt, now),
          ),
        ),
      ),
    )
    .returning();
  if (!execution) return null;

  try {
    const definition = formCallbackRegistry.get(execution.callbackSlug);
    if (!definition) {
      throw new Error(`No callback handler for ${execution.callbackSlug}.`);
    }
    const parsedInput = definition.inputSchema.parse(execution.input);
    if (execution.callbackSlug === "discord.assign-role") {
      await runAssignRole(parsedInput as { memberId: string; roleId: string });
    } else if (execution.callbackSlug === "recruiting.notify") {
      await runRecruitingNotification(
        parsedInput as {
          memberId: string;
          note: string;
        },
        execution.id,
      );
    } else {
      throw new Error(`No callback handler for ${execution.callbackSlug}.`);
    }
    const [completed] = await db
      .update(FormCallbackExecution)
      .set({
        leaseExpiresAt: null,
        leaseToken: null,
        status: "succeeded",
        succeededAt: new Date(),
      })
      .where(
        and(
          eq(FormCallbackExecution.id, execution.id),
          eq(FormCallbackExecution.leaseToken, leaseToken),
          eq(FormCallbackExecution.status, "running"),
        ),
      )
      .returning({ id: FormCallbackExecution.id });
    if (!completed) return { status: "superseded" as const };
    return { status: "succeeded" as const };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Callback failed.";
    const [completed] = await db
      .update(FormCallbackExecution)
      .set({
        lastError: error.slice(0, 2_000),
        leaseExpiresAt: null,
        leaseToken: null,
        status: "failed",
      })
      .where(
        and(
          eq(FormCallbackExecution.id, execution.id),
          eq(FormCallbackExecution.leaseToken, leaseToken),
          eq(FormCallbackExecution.status, "running"),
        ),
      )
      .returning({ id: FormCallbackExecution.id });
    if (!completed) return { error, status: "superseded" as const };
    return { error, status: "failed" as const };
  }
}

export async function dispatchPendingFormCallbacks(limit = 25) {
  const rows = await db
    .select({ id: FormCallbackExecution.id })
    .from(FormCallbackExecution)
    .where(
      or(
        and(
          eq(FormCallbackExecution.status, "pending"),
          sql`${FormCallbackExecution.availableAt} <= now()`,
        ),
        and(
          eq(FormCallbackExecution.status, "running"),
          lte(FormCallbackExecution.leaseExpiresAt, new Date()),
        ),
      ),
    )
    .limit(Math.min(Math.max(limit, 1), 100));
  return Promise.all(rows.map(({ id }) => dispatchFormCallbackExecution(id)));
}

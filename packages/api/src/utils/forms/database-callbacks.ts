import { randomUUID } from "node:crypto";
import { callTRPCProcedure, TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, inArray, lte, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  FormCallbackConfiguration,
  FormCallbackExecution,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { callbackConfigurationSchema } from "@forge/validators";

import type { WriteDb } from "../db";
import type { PermissionMap } from "../permissions";
import {
  assertAllowedFormCallbackDiscordRole,
  RETRYABLE_FORM_CALLBACK_STATUSES,
} from "./callback-policy";
import {
  assertCallbackMappingsMatchSchema,
  getFormCallbackRegistry,
  mapFormCallbackInput,
} from "./callbacks";

const LEASE_MS = 5 * 60 * 1000;

function requireAllowedAssignableRole(roleId: string) {
  const parsedRoleId = z
    .string()
    .regex(/^\d{17,20}$/)
    .parse(roleId);
  assertAllowedFormCallbackDiscordRole(parsedRoleId);
}

export async function saveFormCallbackConfiguration(input: {
  callbackSlug: string;
  database?: WriteDb;
  formDefinition: unknown;
  formId: string;
  mappings: unknown;
  permissions: PermissionMap;
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
}) {
  const database = input.database ?? db;
  const parsed = callbackConfigurationSchema.parse({
    callbackSlug: input.callbackSlug,
    mappings: input.mappings,
    responseMode: input.responseMode,
  });
  const definition = (await getFormCallbackRegistry()).get(parsed.callbackSlug);
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
    definition,
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
        requireAllowedAssignableRole(roleId);
      }
    }
  }

  const [saved] = await database
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

  const respondent = await input.database
    .select({
      authUserId: User.id,
      discordUserId: User.discordUserId,
      email: Member.email,
      firstName: Member.firstName,
      lastName: Member.lastName,
      memberId: Member.id,
    })
    .from(Member)
    .innerJoin(User, eq(Member.userId, User.id))
    .where(eq(Member.userId, input.userId))
    .then((rows) => rows[0]);
  const executions: (typeof FormCallbackExecution.$inferSelect)[] = [];
  const registry = await getFormCallbackRegistry();

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
        respondent: {
          auth_user_id: respondent?.authUserId ?? null,
          discord_user_id: respondent?.discordUserId ?? null,
          member_id: respondent?.memberId ?? null,
          respondent_email: respondent?.email ?? null,
          respondent_name: respondent
            ? `${respondent.firstName} ${respondent.lastName}`.trim()
            : null,
        },
      });
      const definition = registry.get(configuration.callbackSlug);
      if (!definition) throw new Error("Callback is no longer registered.");
      mappedInput = definition.inputSchema.parse(mappedInput) as Record<
        string,
        unknown
      >;
      if (configuration.callbackSlug === "discord.assign-role") {
        requireAllowedAssignableRole(z.string().parse(mappedInput.roleId));
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
    const definition = (await getFormCallbackRegistry()).get(
      execution.callbackSlug,
    );
    if (!definition) {
      throw new Error(`No callback handler for ${execution.callbackSlug}.`);
    }
    const parsedInput = definition.inputSchema.parse(execution.input);
    const { formCallbackRouter } = await import("./procedures");
    await callTRPCProcedure({
      batchIndex: 0,
      ctx: {
        formCallback: { executionId: execution.id },
        headers: new Headers(),
        session: null,
        source: "form-callback",
      },
      getRawInput: () => Promise.resolve(parsedInput),
      path: definition.procedurePath,
      router: formCallbackRouter,
      signal: undefined,
      type: "mutation",
    });
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

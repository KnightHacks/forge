import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FORMS } from "@forge/consts";

import type { PermissionMap } from "../../utils/permissions";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import {
  assertAllowedFormCallbackDiscordRole,
  formCallbackDeliveryNonce,
  isFormCallbackExecutionClaimable,
} from "../../utils/forms/callback-policy";
import {
  assertCallbackConfigurationAllowed,
  assertCallbackMappingsMatchSchema,
  createFormCallbackDispatcher,
  createFormCallbackRegistry,
  createFormCallbackRegistryFromRouter,
  defineFormCallback,
  listFormCallbackCatalog,
  mapFormCallbackInput,
} from "../../utils/forms/callbacks";
import { createEmptyPermissionMap } from "../../utils/permissions";

const SAFE_ROLE = "00000000-0000-4000-8000-000000000201";
const UNSAFE_ROLE = "00000000-0000-4000-8000-000000000202";
const QUESTION_ID = "10000000-0000-4000-8000-000000000201";
const callbackFormDefinition = {
  description: "Apply to a team.",
  instructions: [],
  questions: [
    {
      id: QUESTION_ID,
      maxLength: 500,
      prompt: "Why are you interested?",
      required: true,
      retired: false,
      type: "short_text" as const,
    },
  ],
  title: "Team application",
};

function permissionMap(...keys: (keyof PermissionMap)[]) {
  const result = createEmptyPermissionMap();
  for (const key of keys) result[key] = true;
  return result;
}

const assignRole = defineFormCallback({
  description: "Assign an approved Discord role after submission.",
  inputSchema: z.object({
    memberId: z.string().uuid(),
    reason: z.string().min(1),
    roleId: z.literal(SAFE_ROLE),
  }),
  label: "Assign Discord role",
  requiredPermission: "ASSIGN_ROLES",
  slug: "discord.assign-role",
});

const notifyRecruiting = defineFormCallback({
  description: "Notify the recruiting channel with mapped response fields.",
  inputSchema: z.object({
    memberId: z.string().uuid(),
    note: z.string(),
  }),
  label: "Notify recruiting",
  requiredPermission: "EDIT_FORMS",
  slug: "recruiting.notify",
});

describe("form callback catalog and mapping", () => {
  it("[TC-034] enforces the production Discord role allowlist", () => {
    const [allowedRole] = FORMS.ALLOWED_ASSIGNABLE_DISCORD_ROLES;
    expect(allowedRole).toBeDefined();
    expect(() =>
      assertAllowedFormCallbackDiscordRole(allowedRole ?? ""),
    ).not.toThrow();
    expect(() =>
      assertAllowedFormCallbackDiscordRole("not-an-allowed-discord-role"),
    ).toThrow(/allowlist/i);
  });

  it("[TC-029] lists every tagged callback but disables unavailable actions with permission copy", () => {
    const registry = createFormCallbackRegistry([assignRole, notifyRecruiting]);
    const catalog = listFormCallbackCatalog(
      registry,
      permissionMap("EDIT_FORMS"),
    );

    expect(catalog).toEqual([
      expect.objectContaining({
        available: false,
        requiredPermission: "ASSIGN_ROLES",
        slug: "discord.assign-role",
      }),
      expect.objectContaining({
        available: true,
        requiredPermission: "EDIT_FORMS",
        slug: "recruiting.notify",
      }),
    ]);
  });

  it("[TC-030, TC-NEG-014] maps question IDs, fixed, and respondent values without ambiguous label matching", () => {
    expect(
      mapFormCallbackInput(
        [
          {
            inputKey: "reason",
            source: { kind: "question", questionId: QUESTION_ID },
          },
          {
            inputKey: "roleId",
            source: { kind: "fixed", value: SAFE_ROLE },
          },
          {
            inputKey: "memberId",
            source: { kind: "respondent", value: "member_id" },
          },
        ],
        {
          answers: { [QUESTION_ID]: "Workshop application" },
          respondent: {
            auth_user_id: "40000000-0000-4000-8000-000000000201",
            discord_user_id: "123456789012345678",
            member_id: "20000000-0000-4000-8000-000000000201",
            respondent_email: "synthetic@example.invalid",
            respondent_name: "Test Member",
          },
        },
      ),
    ).toEqual({
      memberId: "20000000-0000-4000-8000-000000000201",
      reason: "Workshop application",
      roleId: SAFE_ROLE,
    });
  });

  it("[TC-017] keeps every respondent identity source distinct", () => {
    const respondent = {
      auth_user_id: "40000000-0000-4000-8000-000000000201",
      discord_user_id: "123456789012345678",
      member_id: "20000000-0000-4000-8000-000000000201",
      respondent_email: "synthetic@example.invalid",
      respondent_name: "Test Member",
    };
    expect(
      mapFormCallbackInput(
        Object.keys(respondent).map((value) => ({
          inputKey: value,
          source: {
            kind: "respondent" as const,
            value: value as keyof typeof respondent,
          },
        })),
        { answers: {}, respondent },
      ),
    ).toEqual(respondent);
  });

  it("[TC-034] requires callback metadata permission and always enforces the safe role allowlist", () => {
    expect(() =>
      assertCallbackConfigurationAllowed(assignRole, {
        input: {
          memberId: crypto.randomUUID(),
          reason: "Applied",
          roleId: SAFE_ROLE,
        },
        permissions: permissionMap("EDIT_FORMS"),
      }),
    ).toThrow(/ASSIGN_ROLES/);

    expect(() =>
      assertCallbackConfigurationAllowed(assignRole, {
        input: {
          memberId: crypto.randomUUID(),
          reason: "Applied",
          roleId: UNSAFE_ROLE,
        },
        permissions: permissionMap("IS_OFFICER"),
      }),
    ).toThrow(/approved|allowlist/i);

    expect(() =>
      assertCallbackConfigurationAllowed(assignRole, {
        input: {
          memberId: crypto.randomUUID(),
          reason: "Applied",
          roleId: SAFE_ROLE,
        },
        permissions: permissionMap("ASSIGN_ROLES"),
      }),
    ).not.toThrow();
  });

  it("[TC-038] rejects duplicate callback metadata deterministically", () => {
    expect(() => createFormCallbackRegistry([assignRole, assignRole])).toThrow(
      /duplicate.*discord\.assign-role/i,
    );
  });

  it("[TC-015] discovers only metadata-registered tRPC mutations and exposes input copy", () => {
    const inputSchema = z.object({ message: z.string() });
    const router = createTRPCRouter({
      ignored: publicProcedure.query(() => "ignored"),
      notify: publicProcedure
        .meta({
          formCallback: {
            description: "Send a test notification.",
            inputSchema,
            inputs: {
              message: {
                description: "Text included in the notification.",
                label: "Message",
                placeholder: "Hello",
              },
            },
            label: "Notify",
            requiredPermission: "EDIT_FORMS",
            slug: "test.notify",
          },
        })
        .input(inputSchema)
        .mutation(({ input }) => input.message),
    });

    const registry = createFormCallbackRegistryFromRouter(router);
    expect([...registry.keys()]).toEqual(["test.notify"]);
    expect(
      listFormCallbackCatalog(registry, permissionMap("EDIT_FORMS"))[0],
    ).toMatchObject({
      available: true,
      inputs: [
        {
          description: "Text included in the notification.",
          key: "message",
          label: "Message",
          placeholder: "Hello",
        },
      ],
    });
  });

  it("[TC-016] rejects using one question for two procedure inputs", () => {
    const twoFields = defineFormCallback({
      description: "Two text fields",
      inputSchema: z.object({ first: z.string(), second: z.string() }),
      label: "Two fields",
      requiredPermission: "EDIT_FORMS",
      slug: "test.two-fields",
    });

    expect(() =>
      assertCallbackMappingsMatchSchema({
        definition: twoFields,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "first",
            source: { kind: "question", questionId: QUESTION_ID },
          },
          {
            inputKey: "second",
            source: { kind: "question", questionId: QUESTION_ID },
          },
        ],
      }),
    ).toThrow(/each form question may supply only one/i);
  });

  it("[TC-030] validates callback keys, required mappings, sources, and field types at configuration time", () => {
    expect(() =>
      assertCallbackMappingsMatchSchema({
        definition: notifyRecruiting,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "respondent", value: "member_id" },
          },
          {
            inputKey: "note",
            source: { kind: "question", questionId: QUESTION_ID },
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      assertCallbackMappingsMatchSchema({
        definition: notifyRecruiting,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "respondent", value: "member_id" },
          },
        ],
      }),
    ).toThrow(/missing.*note/i);

    expect(() =>
      assertCallbackMappingsMatchSchema({
        definition: notifyRecruiting,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "unknown",
            source: { kind: "fixed", value: "value" },
          },
        ],
      }),
    ).toThrow(/unknown callback input/i);

    expect(() =>
      assertCallbackMappingsMatchSchema({
        definition: notifyRecruiting,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "respondent", value: "discord_user_id" },
          },
          {
            inputKey: "note",
            source: { kind: "question", questionId: QUESTION_ID },
          },
        ],
      }),
    ).toThrow(/incompatible.*memberId/i);
  });
});

describe("durable callback execution", () => {
  it("[TC-033] reclaims only expired running leases", () => {
    const now = new Date("2026-07-15T18:00:00.000Z");
    expect(
      isFormCallbackExecutionClaimable(
        {
          leaseExpiresAt: new Date("2026-07-15T17:59:59.999Z"),
          status: "running",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isFormCallbackExecutionClaimable(
        {
          leaseExpiresAt: new Date("2026-07-15T18:00:00.001Z"),
          status: "running",
        },
        now,
      ),
    ).toBe(false);
    expect(
      isFormCallbackExecutionClaimable(
        { leaseExpiresAt: null, status: "succeeded" },
        now,
      ),
    ).toBe(false);
    expect(
      isFormCallbackExecutionClaimable(
        { leaseExpiresAt: null, status: "failed" },
        now,
      ),
    ).toBe(true);
  });

  it("[TC-NEG-008] reuses the execution identity as the provider nonce", () => {
    const executionId = "30000000-0000-4000-8000-000000000201";
    const nonce = formCallbackDeliveryNonce(executionId);
    expect(nonce.length).toBeLessThanOrEqual(25);
    expect(Buffer.from(nonce, "base64url").toString("hex")).toBe(
      executionId.replaceAll("-", ""),
    );
    expect(nonce).not.toBe(
      formCallbackDeliveryNonce("30000000-0000-4000-8000-000000000202"),
    );
    expect(formCallbackDeliveryNonce(executionId)).toBe(
      formCallbackDeliveryNonce(executionId),
    );
  });

  it("[TC-001] rejects malformed execution identities", () => {
    for (const id of ["", "not-a-uuid", "30000000000040008000000000000201"]) {
      expect(() => formCallbackDeliveryNonce(id)).toThrow();
    }
  });

  it("[TC-032, TC-033] records independent successes and failures and permits retry", async () => {
    const attempts = new Map<string, number>();
    interface TestExecution {
      attempts: number;
      error?: string;
      id: string;
      input: Record<string, string>;
      slug: string;
      status: "failed" | "pending" | "succeeded";
    }
    const executions = new Map<string, TestExecution>([
      [
        "execution-role",
        {
          attempts: 0,
          id: "execution-role",
          input: {
            memberId: "20000000-0000-4000-8000-000000000201",
            reason: "Applied",
            roleId: SAFE_ROLE,
          },
          slug: assignRole.slug,
          status: "pending" as const,
        },
      ],
      [
        "execution-recruiting",
        {
          attempts: 0,
          id: "execution-recruiting",
          input: {
            memberId: "20000000-0000-4000-8000-000000000201",
            note: "Strong candidate",
          },
          slug: notifyRecruiting.slug,
          status: "pending" as const,
        },
      ],
    ]);
    const state = {
      claim: vi.fn((id: string) => {
        const execution = executions.get(id);
        if (!execution || execution.status === "succeeded")
          return Promise.resolve(null);
        attempts.set(id, (attempts.get(id) ?? 0) + 1);
        return Promise.resolve(execution);
      }),
      fail: vi.fn((id: string, message: string) => {
        const current = executions.get(id);
        if (current)
          executions.set(id, { ...current, error: message, status: "failed" });
        return Promise.resolve();
      }),
      succeed: vi.fn((id: string) => {
        const current = executions.get(id);
        if (current) executions.set(id, { ...current, status: "succeeded" });
        return Promise.resolve();
      }),
    };
    let recruitingFails = true;
    const dispatcher = createFormCallbackDispatcher({
      handlers: {
        "discord.assign-role": vi.fn().mockResolvedValue(undefined),
        "recruiting.notify": vi.fn(() => {
          if (recruitingFails)
            return Promise.reject(new Error("Discord unavailable"));
          return Promise.resolve();
        }),
      },
      registry: createFormCallbackRegistry([assignRole, notifyRecruiting]),
      state,
    });

    await expect(dispatcher.dispatch("execution-role")).resolves.toEqual({
      status: "succeeded",
    });
    await expect(
      dispatcher.dispatch("execution-recruiting"),
    ).resolves.toMatchObject({
      error: "Discord unavailable",
      status: "failed",
    });
    recruitingFails = false;
    await expect(dispatcher.retry("execution-recruiting")).resolves.toEqual({
      status: "succeeded",
    });
    expect(attempts).toEqual(
      new Map([
        ["execution-role", 1],
        ["execution-recruiting", 2],
      ]),
    );
  });

  it("[TC-NEG-008] never re-runs a successful external effect", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const state = {
      claim: vi
        .fn()
        .mockResolvedValueOnce({
          attempts: 0,
          id: "execution-role",
          input: {
            memberId: "20000000-0000-4000-8000-000000000201",
            reason: "Applied",
            roleId: SAFE_ROLE,
          },
          slug: assignRole.slug,
          status: "pending",
        })
        .mockResolvedValue(null),
      fail: vi.fn(),
      succeed: vi.fn(),
    };
    const dispatcher = createFormCallbackDispatcher({
      handlers: { "discord.assign-role": handler },
      registry: createFormCallbackRegistry([assignRole]),
      state,
    });

    await dispatcher.dispatch("execution-role");
    await dispatcher.retry("execution-role");

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

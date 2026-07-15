import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FORMS } from "@forge/consts";

import type { PermissionMap } from "../../utils/permissions";
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

  it("[TC-030, TC-NEG-014] maps question IDs, fixed, and system values without ambiguous label matching", () => {
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
            source: { kind: "system", value: "member_id" },
          },
        ],
        {
          answers: { [QUESTION_ID]: "Workshop application" },
          system: {
            event_id: null,
            member_id: "20000000-0000-4000-8000-000000000201",
            response_id: "30000000-0000-4000-8000-000000000201",
            submitted_at: new Date("2026-07-15T18:00:00.000Z"),
            user_id: "40000000-0000-4000-8000-000000000201",
          },
        },
      ),
    ).toEqual({
      memberId: "20000000-0000-4000-8000-000000000201",
      reason: "Workshop application",
      roleId: SAFE_ROLE,
    });
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

  it("[TC-030] validates callback keys, required mappings, sources, and field types at configuration time", () => {
    expect(() =>
      assertCallbackMappingsMatchSchema({
        callbackSchema: notifyRecruiting.inputSchema,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "system", value: "member_id" },
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
        callbackSchema: notifyRecruiting.inputSchema,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "system", value: "member_id" },
          },
        ],
      }),
    ).toThrow(/missing.*note/i);

    expect(() =>
      assertCallbackMappingsMatchSchema({
        callbackSchema: notifyRecruiting.inputSchema,
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
        callbackSchema: notifyRecruiting.inputSchema,
        formDefinition: callbackFormDefinition,
        mappings: [
          {
            inputKey: "memberId",
            source: { kind: "system", value: "event_id" },
          },
          {
            inputKey: "note",
            source: { kind: "question", questionId: QUESTION_ID },
          },
        ],
      }),
    ).toThrow(/do not provide an event ID/i);
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
    expect(formCallbackDeliveryNonce(executionId)).toBe(executionId);
    expect(formCallbackDeliveryNonce(executionId)).toBe(
      formCallbackDeliveryNonce(executionId),
    );
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

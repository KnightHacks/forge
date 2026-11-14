import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Session } from "@forge/auth/server";
import type { db as DatabaseClient } from "@forge/db/client";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq, sql } from "@forge/db";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { McpActivity } from "@forge/db/schemas/mcp-activity";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type * as McpActivityModule from "../../utils/mcp/activity";
import { permissionBitstring } from "../support/permissions";

const runLocally = canRunDatabaseTests();
const memberId = randomUUID();
const otherId = randomUUID();
const officerId = randomUUID();
const roleId = randomUUID();
const clientId = `mcp-637-test-${randomUUID()}`;
const userIds = [memberId, otherId, officerId];
let factory: Awaited<ReturnType<typeof createFactory>>;
let db: typeof DatabaseClient;
let recordMcpActivity: typeof McpActivityModule.recordMcpActivity;
let disposable: DisposableDatabase | undefined;
let clientReady = false;
let fixturesReady = false;

async function createFactory() {
  const { mcpActivityRouter } = await import("../../routers/mcp-activity");
  const { createCallerFactory, createTRPCRouter } = await import("../../trpc");
  return createCallerFactory(
    createTRPCRouter({ mcpActivity: mcpActivityRouter }),
  );
}

function caller(userId: string) {
  const createdAt = new Date();
  const session: Session = {
    user: {
      id: userId,
      name: "MCP integration fixture",
      email: "mcp-fixture@example.test",
      emailVerified: true,
      image: null,
      createdAt,
      updatedAt: createdAt,
      discordUserId: `fixture-${userId}`,
    },
    session: {
      id: `fixture-${userId}`,
      userId,
      token: "synthetic-test-session",
      createdAt,
      updatedAt: createdAt,
      expiresAt: new Date(createdAt.getTime() + 60_000),
      ipAddress: null,
      userAgent: null,
    },
  };
  return factory({
    headers: new Headers(),
    session,
    source: "mcp-activity-integration",
  }).mcpActivity;
}

// Migrate an isolated database before importing any module that captures the
// singleton client. The configured loopback database may have no schema in CI.
beforeAll(async () => {
  if (!runLocally) return;
  disposable = await provisionDisposableDatabase("forge_mcp_activity");
  vi.stubEnv("DATABASE_URL", disposable.url);
  ({ db } = await import("@forge/db/client"));
  clientReady = true;
  ({ recordMcpActivity } = await import("../../utils/mcp/activity"));
  factory = await createFactory();
  const connected = await db.execute<{ name: string }>(
    sql`select current_database() as name`,
  );
  expect(connected.rows[0]?.name).toBe(
    new URL(disposable.url).pathname.slice(1),
  );
  await db.transaction(async (tx) => {
    await tx
      .insert(User)
      .values(
        userIds.map((id) => ({ id, discordUserId: `mcp-fixture-${id}` })),
      );
    await tx.insert(Roles).values({
      id: roleId,
      discordRoleId: `mcp-fixture-${roleId}`,
      name: "MCP test officer",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await tx.insert(Permissions).values({ roleId, userId: officerId });
  });
  fixturesReady = true;
}, 120_000);

afterEach(async () => {
  if (fixturesReady)
    await db.delete(McpActivity).where(eq(McpActivity.clientId, clientId));
});

afterAll(async () => {
  try {
    if (clientReady) await db.$client.end();
  } finally {
    try {
      await disposable?.drop();
    } finally {
      vi.unstubAllEnvs();
    }
  }
});

describe.runIf(runLocally)("MCP activity PostgreSQL persistence", () => {
  it.each(["allowed", "denied", "failed"] as const)(
    "persists exactly one %s call",
    async (outcome) => {
      await recordMcpActivity({
        actorUserId: memberId,
        clientId,
        tool: "call_action",
        procedurePath: "member.getMember",
        outcome,
      });
      const { items } = await caller(memberId).listMine({ clientId });
      expect(items).toHaveLength(1);
      expect(items[0]?.outcome).toBe(outcome);
    },
  );

  it("persists neither returned rows nor token values, including SQL literals/comments", async () => {
    const entry = {
      actorUserId: memberId,
      clientId,
      tool: "query_database",
      outcome: "allowed" as const,
      sqlQuery:
        "SELECT 'literal-credential' FROM auth_session /* comment-credential */",
      rows: [{ sessionToken: "returned-credential" }],
      accessToken: "oauth-credential",
      token: "session-credential",
    };
    await recordMcpActivity(entry);
    const { items } = await caller(memberId).listMine({ clientId });
    expect(items).toHaveLength(1);
    const persisted = JSON.stringify(items);
    for (const secret of [
      "literal-credential",
      "comment-credential",
      "returned-credential",
      "oauth-credential",
      "session-credential",
    ])
      expect(persisted).not.toContain(secret);
    expect(items[0]?.sqlQuery).toBe("SELECT ? FROM auth_session");
  });

  it("enforces the outcome constraint and actor foreign key in PostgreSQL", async () => {
    await expect(
      db.insert(McpActivity).values({
        actorUserId: memberId,
        clientId,
        tool: "call_action",
        outcome: sql`'invalid'`,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      recordMcpActivity({
        actorUserId: randomUUID(),
        clientId,
        tool: "call_action",
        outcome: "failed",
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    expect((await caller(officerId).list({ clientId })).items).toEqual([]);
  });

  it("retains activity while clearing the actor when a fixture account is deleted", async () => {
    const deletedId = randomUUID();
    await db
      .insert(User)
      .values({ id: deletedId, discordUserId: `mcp-fixture-${deletedId}` });
    try {
      await recordMcpActivity({
        actorUserId: deletedId,
        clientId,
        tool: "call_action",
        outcome: "allowed",
      });
      await db.delete(User).where(eq(User.id, deletedId));
      const { items } = await caller(officerId).list({ clientId });
      expect(items).toHaveLength(1);
      expect(items[0]?.actorUserId).toBeNull();
    } finally {
      await db.delete(User).where(eq(User.id, deletedId));
    }
  });
});

describe.runIf(runLocally)(
  "MCP activity PostgreSQL visibility and pagination",
  () => {
    it("returns only the member's rows while an officer can inspect both actors", async () => {
      await recordMcpActivity({
        actorUserId: memberId,
        clientId,
        tool: "call_action",
        outcome: "allowed",
      });
      await recordMcpActivity({
        actorUserId: otherId,
        clientId,
        tool: "query_database",
        outcome: "denied",
        target: "fixture-target",
      });
      const member = caller(memberId);
      expect(
        (await member.listMine({ clientId })).items.map(
          (item) => item.actorUserId,
        ),
      ).toEqual([memberId]);
      await expect(member.list({ clientId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect((await caller(officerId).list({ clientId })).items).toHaveLength(
        2,
      );
      const filtered = await caller(officerId).list({
        clientId,
        actorUserId: otherId,
        tool: "query_database",
        outcome: "denied",
        target: "fixture-target",
      });
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0]?.actorUserId).toBe(otherId);
    });

    it("pages equal and sub-millisecond timestamps without skipping or duplicating rows", async () => {
      const prefix = randomUUID().slice(0, -1);
      const ids = [`${prefix}3`, `${prefix}2`, `${prefix}1`];
      await db.insert(McpActivity).values(
        ids.map((id, position) => ({
          id,
          actorUserId: memberId,
          clientId,
          tool: "call_action",
          outcome: "allowed" as const,
          createdAt:
            position < 2
              ? sql`'2026-11-13T12:00:00.123456Z'::timestamptz`
              : sql`'2026-11-13T12:00:00.123123Z'::timestamptz`,
        })),
      );
      const member = caller(memberId);
      const first = await member.listMine({ clientId, limit: 1 });
      expect(first.items.map((item) => item.id)).toEqual([ids[0]]);
      const second = await member.listMine({
        clientId,
        limit: 1,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items.map((item) => item.id)).toEqual([ids[1]]);
      const third = await member.listMine({
        clientId,
        limit: 1,
        cursor: second.nextCursor ?? undefined,
      });
      expect(third.items.map((item) => item.id)).toEqual([ids[2]]);
      expect(third.nextCursor).toBeNull();
      expect(
        (
          await member.listMine({
            clientId,
            from: new Date("2026-11-13T12:00:00.123Z"),
            to: new Date("2026-11-13T12:00:00.124Z"),
          })
        ).items,
      ).toHaveLength(3);
    });
  },
);

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type * as DatabaseClient from "@forge/db/client";
import type { SelectMcpActivity } from "@forge/db/schemas/mcp-activity";

import { mcpActivityRouter } from "../../routers/mcp-activity";
import { createCallerFactory, createTRPCRouter } from "../../trpc";
import { permissionBitstring } from "../support/permissions";

const storage = vi.hoisted(() => ({
  select: vi.fn(),
  permissionRows: [] as { permissions: string }[],
  rows: [] as SelectMcpActivity[],
  queries: [] as { sql: string; params: unknown[] }[],
}));

vi.mock("@forge/db/client", async (importOriginal) => {
  // Compile the actual Drizzle query; return fixture rows at the DB boundary.
  // No connection or migration is needed to verify predicates/bound parameters.
  const actual = await importOriginal<typeof DatabaseClient>();
  return {
    db: {
      select: storage.select,
      query: {
        McpActivity: {
          findMany: (
            input: Parameters<typeof actual.db.query.McpActivity.findMany>[0],
          ) => {
            storage.queries.push(
              actual.db.query.McpActivity.findMany(input).toSQL(),
            );
            return Promise.resolve(storage.rows);
          },
        },
      },
    },
  };
});

const actorUserId = "00000000-0000-4000-8000-000000000001";
const otherUserId = "00000000-0000-4000-8000-000000000002";
const createdAt = new Date("2026-11-13T12:00:00Z");
const session: Session = {
  user: {
    id: actorUserId,
    name: "MCP member",
    email: "mcp@example.test",
    emailVerified: true,
    image: null,
    createdAt,
    updatedAt: createdAt,
    discordUserId: "123456789012345678",
  },
  session: {
    id: "fixture-session",
    userId: actorUserId,
    token: "fixture-session-token",
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date("2026-11-14T12:00:00Z"),
    ipAddress: null,
    userAgent: null,
  },
};
const factory = createCallerFactory(
  createTRPCRouter({ mcpActivity: mcpActivityRouter }),
);
function caller(currentSession: Session | null = session) {
  return factory({
    headers: new Headers(),
    session: currentSession,
    source: "mcp-activity-test",
  }).mcpActivity;
}

function row(id: string): SelectMcpActivity {
  return {
    id,
    actorUserId,
    clientId: "client-one",
    clientName: "Test client",
    tool: "call_action",
    procedurePath: "member.getMember",
    sqlQuery: null,
    target: null,
    outcome: "allowed",
    errorCode: null,
    createdAt,
  };
}

describe("MCP activity visibility and pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.rows = [];
    storage.queries = [];
    storage.permissionRows = [];
    storage.select.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(storage.permissionRows),
        }),
      }),
    });
  });

  it("rejects unauthenticated reads before storage", async () => {
    await expect(caller(null).list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller(null).listMine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(storage.select).not.toHaveBeenCalled();
    expect(storage.queries).toEqual([]);
  });

  it("restricts a member's query to the session user without requiring officer permissions", async () => {
    storage.rows = [row("00000000-0000-4000-8000-000000000003")];
    const result = await caller().listMine();
    expect(result.items).toEqual(storage.rows);
    expect(storage.select).not.toHaveBeenCalled();
    expect(storage.queries).toHaveLength(1);
    expect(storage.queries[0]?.sql).toMatch(
      /where "McpActivity"\."actor_user_id" = \$1/,
    );
    expect(storage.queries[0]?.params).toEqual([actorUserId, 51]);
  });

  it("rejects attempts to select another member's activity through listMine", async () => {
    const input = { actorUserId: otherUserId, limit: 20 };
    await expect(caller().listMine(input)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(storage.queries).toEqual([]);
  });

  it("denies non-officers even when they can read member and club data", async () => {
    storage.permissionRows = [
      { permissions: permissionBitstring("READ_MEMBERS", "READ_CLUB_DATA") },
    ];
    await expect(caller().list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storage.queries).toEqual([]);
  });

  it("lets officers read all rows, then enforces permission revocation on the next read", async () => {
    storage.permissionRows = [
      { permissions: permissionBitstring("IS_OFFICER") },
    ];
    storage.rows = [
      row("00000000-0000-4000-8000-000000000003"),
      {
        ...row("00000000-0000-4000-8000-000000000004"),
        actorUserId: otherUserId,
      },
    ];
    expect((await caller().list()).items).toEqual(storage.rows);
    expect(storage.queries[0]?.sql).not.toContain(" where ");
    expect(storage.queries[0]?.params).toEqual([51]);
    storage.permissionRows = [];
    await expect(caller().list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storage.queries).toHaveLength(1);
  });

  it("binds officer filters and time bounds without embedding values in SQL", async () => {
    storage.permissionRows = [
      { permissions: permissionBitstring("IS_OFFICER") },
    ];
    const from = new Date("2026-11-01T00:00:00Z");
    const to = new Date("2026-12-01T00:00:00Z");
    await caller().list({
      actorUserId: otherUserId,
      clientId: "client-one",
      tool: "query_database",
      outcome: "denied",
      procedurePath: "member.getMember",
      target: "target' OR true --",
      from,
      to,
    });
    const query = storage.queries[0];
    expect(query?.params).toEqual(
      expect.arrayContaining([
        otherUserId,
        "client-one",
        "query_database",
        "denied",
        "member.getMember",
        "target' OR true --",
        from.toISOString(),
        to.toISOString(),
        51,
      ]),
    );
    for (const column of [
      "actor_user_id",
      "client_id",
      "tool",
      "outcome",
      "procedure_path",
      "target",
      "created_at",
    ])
      expect(query?.sql).toContain(`"${column}"`);
    expect(query?.sql).not.toContain("OR true");
  });

  it("pages tied timestamps by UUID and uses the stored timestamp's full precision", async () => {
    const older = row("00000000-0000-4000-8000-000000000003");
    const newer = row("00000000-0000-4000-8000-000000000004");
    storage.rows = [newer, older];
    const page = await caller().listMine({ limit: 1 });
    expect(page).toEqual({ items: [newer], nextCursor: newer.id });
    storage.rows = [older];
    expect(await caller().listMine({ limit: 1, cursor: newer.id })).toEqual({
      items: [older],
      nextCursor: null,
    });
    const query = storage.queries[1];
    expect(query?.sql).toContain(
      'order by "McpActivity"."created_at" desc, "McpActivity"."id" desc',
    );
    expect(query?.sql).toMatch(
      /\("McpActivity"\."created_at", "McpActivity"\."id"\) < /,
    );
    expect(query?.sql).toContain(
      'select created_at, id from "mcp_activity" where id =',
    );
    expect(query?.params).toEqual([actorUserId, newer.id, 2]);
  });

  it.each([
    { limit: 0 },
    { limit: 101 },
    { cursor: "not-a-uuid" },
    { from: new Date("2026-12-01"), to: new Date("2026-11-01") },
  ])("rejects invalid pagination and filters", async (input) => {
    await expect(caller().listMine(input)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(storage.queries).toEqual([]);
  });
});

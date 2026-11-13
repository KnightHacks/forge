import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { McpActivity } from "@forge/db/schemas/mcp-activity";

import type { RecordMcpActivityInput } from "../../utils/mcp/activity";
import { recordMcpActivity } from "../../utils/mcp/activity";

const storage = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@forge/db/client", () => ({ db: { insert: storage.insert } }));

const actorUserId = "00000000-0000-4000-8000-000000000001";

function recordedSqlQuery() {
  const row: unknown = storage.values.mock.calls[0]?.[0];
  if (
    typeof row !== "object" ||
    row === null ||
    !("sqlQuery" in row) ||
    typeof row.sqlQuery !== "string"
  )
    throw new Error("Missing SQL preview");
  return row.sqlQuery;
}

describe("MCP activity writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.insert.mockReturnValue({ values: storage.values });
  });

  it.each(["allowed", "denied", "failed"] as const)(
    "records exactly one %s call",
    async (outcome) => {
      await recordMcpActivity({
        actorUserId,
        clientId: "client-one",
        clientName: "Test client",
        tool: "call_action",
        procedurePath: "member.getMember",
        outcome,
        errorCode: outcome === "allowed" ? null : "FORBIDDEN",
      });

      expect(storage.insert).toHaveBeenCalledExactlyOnceWith(McpActivity);
      expect(storage.values).toHaveBeenCalledExactlyOnceWith({
        actorUserId,
        clientId: "client-one",
        clientName: "Test client",
        tool: "call_action",
        procedurePath: "member.getMember",
        outcome,
        errorCode: outcome === "allowed" ? null : "FORBIDDEN",
      });
    },
  );

  it("never persists result rows or credentials from a larger runtime object", async () => {
    expectTypeOf<
      Extract<keyof RecordMcpActivityInput, "rows" | "accessToken" | "token">
    >().toBeNever();
    const entry = {
      actorUserId,
      tool: "query_database",
      outcome: "allowed" as const,
      rows: [{ sessionToken: "returned-row-token" }],
      result: { email: "private-result@example.test" },
      accessToken: "oauth-access-token",
      token: "session-token",
      authorization: "Bearer secret-header",
    };
    await recordMcpActivity(entry);
    expect(storage.values).toHaveBeenCalledExactlyOnceWith({
      actorUserId,
      tool: "query_database",
      outcome: "allowed",
    });
  });

  it.each([
    "SELECT 'secret-token-value', 42 -- secret-token-value\nFROM example",
    "SELECT E'secret-token-value\\\\text', U&'secret-token-value' FROM example",
    "SELECT $$secret-token-value$$, $body$secret-token-value$body$ FROM example",
    'SELECT "secret-token-value" FROM example /* outer /* secret-token-value */ comment */',
    "SELECT 1+/* secret-token-value */ 2 FROM example",
  ])("redacts SQL values, quoted names, and comments: %s", async (sqlQuery) => {
    await recordMcpActivity({
      actorUserId,
      tool: "query_database",
      outcome: "allowed",
      sqlQuery,
    });
    expect(storage.values).toHaveBeenCalledOnce();
    expect(JSON.stringify(storage.values.mock.calls)).not.toContain(
      "secret-token-value",
    );
    expect(recordedSqlQuery()).toContain("SELECT");
  });

  it.each([
    "SELECT 'secret-token-value",
    "SELECT /* secret-token-value",
    "SELECT $tag$secret-token-value",
  ])(
    "omits an unterminated SQL preview while preserving the failed activity",
    async (sqlQuery) => {
      await recordMcpActivity({
        actorUserId,
        tool: "query_database",
        outcome: "failed",
        sqlQuery,
      });
      expect(storage.values).toHaveBeenCalledExactlyOnceWith({
        actorUserId,
        tool: "query_database",
        outcome: "failed",
        sqlQuery: null,
      });
    },
  );

  it("omits SQL whose backslash interpretation depends on connection settings", async () => {
    await recordMcpActivity({
      actorUserId,
      tool: "query_database",
      outcome: "failed",
      sqlQuery: "SELECT 'a\\' 'secret-token-value'",
    });
    expect(storage.values).toHaveBeenCalledExactlyOnceWith({
      actorUserId,
      tool: "query_database",
      outcome: "failed",
      sqlQuery: null,
    });
  });

  it("caps the SQL preview at 4096 characters after redaction", async () => {
    await recordMcpActivity({
      actorUserId,
      tool: "query_database",
      outcome: "allowed",
      sqlQuery: `SELECT ${"column_name, ".repeat(1000)}'secret-token-value'`,
    });
    expect(recordedSqlQuery()).toHaveLength(4096);
    expect(recordedSqlQuery()).not.toContain("secret-token-value");
  });

  it("propagates a persistence failure without retrying or inserting twice", async () => {
    storage.values.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(
      recordMcpActivity({
        actorUserId,
        tool: "call_action",
        outcome: "failed",
      }),
    ).rejects.toThrow("storage unavailable");
    expect(storage.insert).toHaveBeenCalledOnce();
    expect(storage.values).toHaveBeenCalledOnce();
  });

  it("records a denial before an actor or client can be verified", async () => {
    await recordMcpActivity({
      actorUserId: null,
      tool: "call_action",
      outcome: "denied",
      errorCode: "UNAUTHORIZED",
    });
    expect(storage.values).toHaveBeenCalledExactlyOnceWith({
      actorUserId: null,
      tool: "call_action",
      outcome: "denied",
      errorCode: "UNAUTHORIZED",
    });
  });

  it.each([
    { actorUserId: null, tool: "call_action", outcome: "allowed" as const },
    {
      actorUserId,
      tool: "call_action",
      outcome: "failed" as const,
      errorCode: "database error containing secret-token",
    },
  ])(
    "rejects invalid identity/error metadata before inserting",
    async (entry) => {
      await expect(recordMcpActivity(entry)).rejects.toThrow();
      expect(storage.insert).not.toHaveBeenCalled();
    },
  );
});

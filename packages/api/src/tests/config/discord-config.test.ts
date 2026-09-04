import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { SelectDiscordConfig } from "@forge/db/schemas/discord-config";
import { DISCORD } from "@forge/consts";
import { getTableName } from "@forge/db";
import { DiscordConfig } from "@forge/db/schemas/discord-config";

import { permissionBitstring } from "../support/permissions";

const mocks = vi.hoisted(() => ({
  configRows: [] as unknown[],
  db: { select: vi.fn(), transaction: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const { discordConfigRouter } = await import("../../routers/discord-config");
const { createCallerFactory } = await import("../../trpc");

const callerFactory = createCallerFactory(discordConfigRouter);
const SESSION = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "console-test" },
} as Session;

function createCaller(session: Session | null = SESSION) {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "discord-config-test",
  });
}

/** The fourteen rows migration 0025 seeds, with their real `kind` values. */
const KIND_BY_KEY: Record<DISCORD.ConfigKey, DISCORD.ConfigKind> = {
  admin_role: "role",
  alumni_role: "role",
  design_director_role: "role",
  development_director_role: "role",
  guild: "guild",
  log_channel: "channel",
  officer_role: "role",
  outreach_director_role: "role",
  projects_mentorship_director_role: "role",
  recruiting_channel: "channel",
  sponsorship_director_role: "role",
  vip_role: "role",
  volunteer_role: "role",
  workshops_director_role: "role",
};

function configRow(
  key: DISCORD.ConfigKey,
  overrides: Partial<SelectDiscordConfig> = {},
): SelectDiscordConfig {
  return {
    description: "Identical description text for every row.",
    developmentId: null,
    id: `id-${key}`,
    key,
    kind: KIND_BY_KEY[key],
    label: `Label for ${key}`,
    productionId: "990000000000000001",
    updatedAt: new Date("2026-07-28T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Deliberately shuffled. The procedure's ordering claim is only meaningful if
 * the rows do not arrive already sorted — Postgres promises no order without an
 * `ORDER BY`, and the console renders exactly what the server sends.
 */
function shuffledSeedRows() {
  return [...DISCORD.CONFIG_KEYS].reverse().map((key) => configRow(key));
}

describe("discordConfig procedures (TC-002, TC-019)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.configRows = shuffledSeedRows();
    mocks.db.select.mockImplementation(() => ({
      // Matched by table *name*, not object identity: one case below re-imports
      // the router after `vi.resetModules()`, which hands it a different
      // instance of the schema module.
      from: (table: Parameters<typeof getTableName>[0]) =>
        getTableName(table) === getTableName(DiscordConfig)
          ? // A fresh array each call: the procedure sorts in place.
            Promise.resolve([...mocks.configRows])
          : {
              innerJoin: () => ({
                where: () => Promise.resolve(mocks.permissionRows),
              }),
            },
    }));
  });

  it("exposes exactly two procedures, neither of which creates or deletes", () => {
    // TC-019. A future `create*` or `delete*` fails here before it fails review.
    expect(Object.keys(discordConfigRouter._def.procedures).sort()).toEqual([
      "list",
      "update",
    ]);
  });

  it("refuses an unauthenticated caller before loading permissions", async () => {
    await expect(createCaller(null).list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it.each([["CONFIGURE_ROLES"], ["ASSIGN_ROLES"], ["READ_MEMBERS"]] as const)(
    "refuses a %s holder, who is not an officer",
    async (permission) => {
      // CONFIGURE_ROLES is the one that matters: `/admin/roles` admits it, and
      // this console does not. Conflating them is the easy mistake.
      mocks.permissionRows = [{ permissions: permissionBitstring(permission) }];

      await expect(createCaller().list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        createCaller().update({
          acknowledgeGuildRepoint: false,
          description: "New description",
          developmentId: "",
          key: "vip_role",
          label: "New label",
          productionId: "990000000000000002",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      // The gate runs before any work: nothing reached a transaction.
      expect(mocks.db.transaction).not.toHaveBeenCalled();
    },
  );

  it("returns rows to an officer, grouped guild then channel then role", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    const result = await createCaller().list();

    expect(result.rows.map((row) => row.key)).toEqual([...DISCORD.CONFIG_KEYS]);
    expect(result.rows.map((row) => row.kind)).toEqual([
      "guild",
      "channel",
      "channel",
      ...Array.from({ length: 11 }, () => "role"),
    ]);
  });

  it("groups by the kind column rather than the key text", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    // `vip_role` is keyed `*_role` but claims to be a channel. Grouping must
    // follow the column, so renaming a key never silently regroups the table.
    mocks.configRows = [...DISCORD.CONFIG_KEYS].map((key) =>
      key === "vip_role" ? configRow(key, { kind: "channel" }) : configRow(key),
    );

    const result = await createCaller().list();
    const kinds = result.rows.map((row) => row.kind);

    expect(result.rows[3]?.key).toBe("vip_role");
    expect(kinds.indexOf("role")).toBe(4);
  });

  it("marks exactly the ten inert keys with an empty consumer list", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    const result = await createCaller().list();
    const inert = result.rows
      .filter((row) => row.readBy.length === 0)
      .map((row) => row.key);

    expect(inert).toHaveLength(10);
    expect(
      result.rows
        .filter((row) => row.readBy.length > 0)
        .map((row) => row.key)
        .sort(),
    ).toEqual(["alumni_role", "guild", "log_channel", "recruiting_channel"]);
    // The description text is identical across every fixture row, so nothing
    // here could be distinguishing them by prose.
    expect(new Set(result.rows.map((row) => row.description)).size).toBe(1);
  });

  it("resolves the development snowflake, falling back to production when NULL", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    mocks.configRows = [
      configRow("guild", {
        developmentId: "880000000000000001",
        productionId: "990000000000000001",
      }),
      configRow("alumni_role", {
        developmentId: null,
        productionId: "990000000000000002",
      }),
    ];

    const result = await createCaller().list();

    expect(result.environment).toBe("development");
    expect(result.rows.map((row) => row.resolvedId)).toEqual([
      "880000000000000001",
      // NULL means "reuse productionId". That fallback is the reason the column
      // is nullable and it must not get a second implementation.
      "990000000000000002",
    ]);
  });

  it("resolves the production snowflake when NODE_ENV is production", async () => {
    // The environment is read through `nodeEnv`, which is frozen at module
    // load, so the router is re-imported against a stubbed value rather than
    // mutated in place.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JUDGING_ACCESS_SECRET", "0123456789abcdef0123456789abcdef");
    vi.resetModules();
    try {
      const production = await import("../../routers/discord-config");
      const trpc = await import("../../trpc");
      mocks.permissionRows = [
        { permissions: permissionBitstring("IS_OFFICER") },
      ];
      mocks.configRows = [
        configRow("guild", {
          developmentId: "880000000000000001",
          productionId: "990000000000000001",
        }),
      ];

      const result = await trpc
        .createCallerFactory(production.discordConfigRouter)({
          headers: new Headers(),
          session: SESSION,
          source: "discord-config-test",
        })
        .list();

      expect(result.environment).toBe("production");
      expect(result.rows[0]?.resolvedId).toBe("990000000000000001");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

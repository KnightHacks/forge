import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Session } from "@forge/auth/server";
import type { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import { permissionBitstring } from "../support/permissions";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
  resolver: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const userId = "00000000-0000-4000-8000-000000000635";

const testRouter = createTRPCRouter({
  // No `meta.mcp`: the resolver owns the whole check, as before #635.
  legacy: permProcedure.query(({ ctx }) => {
    mocks.resolver();
    permissions.controlPerms.or(["READ_CLUB_DATA"], ctx);
    return "legacy" as const;
  }),
  // No `meta.mcp` and no check: permProcedure must not add one.
  unchecked: permProcedure.query(() => {
    mocks.resolver();
    return "unchecked" as const;
  }),
  anyRule: permProcedure
    .meta({
      mcp: {
        access: { mode: "any", permissions: ["READ_HACKERS", "EDIT_HACKERS"] },
        description: "Test any rule.",
      },
    })
    .query(() => {
      mocks.resolver();
      return "any" as const;
    }),
  allRule: permProcedure
    .meta({
      mcp: {
        access: {
          mode: "all",
          permissions: ["READ_HACK_DATA", "READ_HACKERS"],
        },
        description: "Test all rule.",
      },
    })
    .query(() => {
      mocks.resolver();
      return "all" as const;
    }),
  // The action rule passes; ownership of the requested resource is still
  // decided in the resolver, after permProcedure.
  ownedResource: permProcedure
    .meta({
      mcp: {
        access: { mode: "any", permissions: ["EDIT_HACKERS"] },
        description: "Test resource-level check.",
      },
    })
    .input(z.object({ ownerId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      mocks.resolver();
      if (input.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your resource",
        });
      }
      return ctx.session.permissions;
    }),
});

const callerFactory = createCallerFactory(testRouter);

function createCaller(
  session: Session | null = { user: { id: userId } } as Session,
) {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "mcp-perm-procedure-test",
  });
}

function setPermissions(...keys: PERMISSIONS.PermissionKey[]) {
  mocks.permissionRows =
    keys.length === 0 ? [] : [{ permissions: permissionBitstring(...keys) }];
}

describe("permProcedure with meta.mcp.access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mocks.permissionRows)),
        })),
      })),
    }));
  });

  it("enforces an any rule before the resolver runs", async () => {
    setPermissions("READ_CLUB_DATA");
    await expect(createCaller().anyRule()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.resolver).not.toHaveBeenCalled();

    for (const key of ["READ_HACKERS", "EDIT_HACKERS"] as const) {
      setPermissions(key);
      await expect(createCaller().anyRule()).resolves.toBe("any");
    }
  });

  it("enforces an all rule before the resolver runs", async () => {
    for (const keys of [
      [],
      ["READ_HACK_DATA"],
      ["READ_HACKERS"],
    ] as PERMISSIONS.PermissionKey[][]) {
      setPermissions(...keys);
      await expect(createCaller().allRule()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    expect(mocks.resolver).not.toHaveBeenCalled();

    setPermissions("READ_HACK_DATA", "READ_HACKERS");
    await expect(createCaller().allRule()).resolves.toBe("all");
  });

  it("lets officers through both modes", async () => {
    setPermissions("IS_OFFICER");
    await expect(createCaller().anyRule()).resolves.toBe("any");
    await expect(createCaller().allRule()).resolves.toBe("all");
  });

  it("keeps a resource-level denial in the resolver after the rule passes", async () => {
    setPermissions("EDIT_HACKERS");

    await expect(
      createCaller().ownedResource({ ownerId: "someone-else" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not your resource",
    });
    expect(mocks.resolver).toHaveBeenCalledTimes(1);

    // Resolvers still receive the loaded permission map.
    await expect(
      createCaller().ownedResource({ ownerId: userId }),
    ).resolves.toMatchObject({ EDIT_HACKERS: true, IS_OFFICER: false });
  });

  it("denies the action rule before parsing input", async () => {
    setPermissions();
    // An empty ownerId fails the input schema, yet the caller sees the
    // action-level FORBIDDEN: permProcedure runs before `.input()` parsing.
    await expect(
      createCaller().ownedResource({ ownerId: "" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    setPermissions("EDIT_HACKERS");
    await expect(
      createCaller().ownedResource({ ownerId: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.resolver).not.toHaveBeenCalled();
  });

  it("still rejects unauthenticated callers before loading permissions", async () => {
    await expect(createCaller(null).anyRule()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});

describe("permProcedure without meta.mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mocks.permissionRows)),
        })),
      })),
    }));
  });

  it("adds no check of its own", async () => {
    setPermissions();
    await expect(createCaller().unchecked()).resolves.toBe("unchecked");
    expect(mocks.resolver).toHaveBeenCalledTimes(1);
  });

  it("leaves the resolver's controlPerms check in charge", async () => {
    setPermissions("READ_HACK_DATA");
    await expect(createCaller().legacy()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // The resolver ran: the denial came from its own check.
    expect(mocks.resolver).toHaveBeenCalledTimes(1);

    for (const key of ["READ_CLUB_DATA", "IS_OFFICER"] as const) {
      setPermissions(key);
      await expect(createCaller().legacy()).resolves.toBe("legacy");
    }
  });
});

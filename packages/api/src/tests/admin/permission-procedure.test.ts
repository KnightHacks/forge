import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const testRouter = createTRPCRouter({
  assignRoles: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["ASSIGN_ROLES"], ctx);
    return true;
  }),
  configureRoles: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["CONFIGURE_ROLES"], ctx);
    return true;
  }),
  editMembers: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["EDIT_MEMBERS"], ctx);
    return true;
  }),
  readMembers: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    return true;
  }),
  readRoles: permProcedure.query(({ ctx }) => {
    permissions.controlPerms.or(["CONFIGURE_ROLES", "ASSIGN_ROLES"], ctx);
    return true;
  }),
});
const callerFactory = createCallerFactory(testRouter);
const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "permission-procedure-test",
  },
} as Session;

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "permission-procedure-test",
  });
}

describe("permProcedure", () => {
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

  it("returns UNAUTHORIZED before permission loading without a session", async () => {
    await expect(createCaller(null).readMembers()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for authenticated users without a member capability", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_CLUB_DATA") },
    ];

    await expect(createCaller().readMembers()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("keeps read and edit capabilities separate", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_MEMBERS") },
    ];

    await expect(createCaller().readMembers()).resolves.toBe(true);
    await expect(createCaller().editMembers()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it.each(["EDIT_MEMBERS", "IS_OFFICER"] as const)(
    "allows %s through read and edit gates",
    async (permission) => {
      mocks.permissionRows = [{ permissions: permissionBitstring(permission) }];

      await expect(createCaller().readMembers()).resolves.toBe(true);
      await expect(createCaller().editMembers()).resolves.toBe(true);
    },
  );

  it("keeps configure and assignment role capabilities separate", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("CONFIGURE_ROLES") },
    ];
    await expect(createCaller().readRoles()).resolves.toBe(true);
    await expect(createCaller().configureRoles()).resolves.toBe(true);
    await expect(createCaller().assignRoles()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    mocks.permissionRows = [
      { permissions: permissionBitstring("ASSIGN_ROLES") },
    ];
    await expect(createCaller().readRoles()).resolves.toBe(true);
    await expect(createCaller().assignRoles()).resolves.toBe(true);
    await expect(createCaller().configureRoles()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets officers through both role-management gates", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];

    await expect(createCaller().readRoles()).resolves.toBe(true);
    await expect(createCaller().configureRoles()).resolves.toBe(true);
    await expect(createCaller().assignRoles()).resolves.toBe(true);
  });
});

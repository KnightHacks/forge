import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import { requireClubAnalyticsRead } from "../../utils/analytics/access";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const testRouter = createTRPCRouter({
  exportReport: permProcedure.query(({ ctx }) => {
    requireClubAnalyticsRead(ctx);
    return "csv" as const;
  }),
  getReport: permProcedure.query(({ ctx }) => {
    requireClubAnalyticsRead(ctx);
    return "report" as const;
  }),
});

const callerFactory = createCallerFactory(testRouter);
const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000801",
    name: "analytics-access-test",
  },
} as Session;

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  keys.forEach((key) => {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission: ${key}`);
    bits[permission.idx] = "1";
  });
  return bits.join("");
}

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "analytics-access-test",
  });
}

describe("club analytics API access", () => {
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

  it("[TC-004] distinguishes authentication from authorization failures", async () => {
    await expect(createCaller(null).getReport()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();

    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_CLUB_EVENT") },
    ];
    await expect(createCaller().getReport()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(createCaller().exportReport()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("[TC-004] authorizes READ_CLUB_DATA and officer callers", async () => {
    for (const permission of ["READ_CLUB_DATA", "IS_OFFICER"] as const) {
      mocks.permissionRows = [{ permissions: permissionBitstring(permission) }];
      await expect(createCaller().getReport()).resolves.toBe("report");
      await expect(createCaller().exportReport()).resolves.toBe("csv");
    }
  });
});

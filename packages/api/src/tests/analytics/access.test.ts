import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import {
  requireClubAnalyticsRead,
  requireHackathonAnalyticsIdentifiedRead,
  requireHackathonAnalyticsRead,
  requireHackathonResumeBundlePrepare,
} from "../../utils/analytics/access";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const testRouter = createTRPCRouter({
  exportHackathonAggregate: permProcedure.query(({ ctx }) => {
    requireHackathonAnalyticsRead(ctx);
    return "hack-export" as const;
  }),
  exportHackathonPointsLeaderboard: permProcedure.query(({ ctx }) => {
    requireHackathonAnalyticsIdentifiedRead(ctx);
    return "points-export" as const;
  }),
  exportReport: permProcedure.query(({ ctx }) => {
    requireClubAnalyticsRead(ctx);
    return "csv" as const;
  }),
  getDiscordReport: permProcedure.query(({ ctx }) => {
    requireClubAnalyticsRead(ctx);
    return "discord-report" as const;
  }),
  getReport: permProcedure.query(({ ctx }) => {
    requireClubAnalyticsRead(ctx);
    return "report" as const;
  }),
  getHackathonIdentifiedRows: permProcedure.query(({ ctx }) => {
    requireHackathonAnalyticsIdentifiedRead(ctx);
    return "identified" as const;
  }),
  getHackathonReport: permProcedure.query(({ ctx }) => {
    requireHackathonAnalyticsRead(ctx);
    return "hack-report" as const;
  }),
  prepareHackathonResumeBundle: permProcedure.query(({ ctx }) => {
    requireHackathonResumeBundlePrepare(ctx);
    return "resume-bundle" as const;
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
    await expect(createCaller().getDiscordReport()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("[TC-004] authorizes READ_CLUB_DATA and officer callers", async () => {
    for (const permission of ["READ_CLUB_DATA", "IS_OFFICER"] as const) {
      mocks.permissionRows = [{ permissions: permissionBitstring(permission) }];
      await expect(createCaller().getReport()).resolves.toBe("report");
      await expect(createCaller().exportReport()).resolves.toBe("csv");
      await expect(createCaller().getDiscordReport()).resolves.toBe(
        "discord-report",
      );
    }
  });
});

describe("hackathon analytics API access", () => {
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

  it("[TC-005] separates aggregate, identified, and resume capabilities", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_HACK_DATA") },
    ];
    await expect(createCaller().getHackathonReport()).resolves.toBe(
      "hack-report",
    );
    await expect(createCaller().exportHackathonAggregate()).resolves.toBe(
      "hack-export",
    );
    await expect(
      createCaller().exportHackathonPointsLeaderboard(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createCaller().getHackathonIdentifiedRows(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createCaller().prepareHackathonResumeBundle(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.permissionRows = [
      {
        permissions: permissionBitstring("READ_HACK_DATA", "READ_HACKERS"),
      },
    ];
    await expect(createCaller().getHackathonIdentifiedRows()).resolves.toBe(
      "identified",
    );
    await expect(
      createCaller().exportHackathonPointsLeaderboard(),
    ).resolves.toBe("points-export");
    await expect(
      createCaller().prepareHackathonResumeBundle(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("[TC-005] allows officers to use every analytics capability", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    await expect(createCaller().getHackathonReport()).resolves.toBe(
      "hack-report",
    );
    await expect(createCaller().getHackathonIdentifiedRows()).resolves.toBe(
      "identified",
    );
    await expect(
      createCaller().exportHackathonPointsLeaderboard(),
    ).resolves.toBe("points-export");
    await expect(createCaller().prepareHackathonResumeBundle()).resolves.toBe(
      "resume-bundle",
    );
  });
});

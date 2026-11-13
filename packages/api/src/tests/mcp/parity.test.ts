import type { AnyProcedure, AnyRouter } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Session } from "@forge/auth/server";
import type { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

import type { ForgeTRPCMeta } from "../../utils/forms/callbacks";
import { appRouter } from "../../root";
import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import { permissionBitstring } from "../support/permissions";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

// Importing `appRouter` constructs module-scope clients; stub them as
// `api-surface.test.ts` does. The report builders are stubbed so an allowed
// call resolves without a database.
vi.mock("@forge/db/client", () => ({ db: mocks.db }));
vi.mock("@forge/utils/stripe", () => ({ stripe: {} }));
vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {},
}));
vi.mock("../../utils/resume/storage", () => ({ resumeStorageClient: {} }));
vi.mock("../../minio/minio-client", () => ({ minioClient: {} }));
vi.mock("../../utils/analytics/club-report", () => ({
  getClubAnalyticsReport: vi.fn(() => Promise.resolve("allowed")),
}));
vi.mock("../../utils/analytics/discord-report", () => ({
  getDiscordAnalyticsReport: vi.fn(() => Promise.resolve("allowed")),
}));
vi.mock("../../utils/analytics/team-performance-report", () => ({
  getTeamPerformanceReport: vi.fn(() => Promise.resolve("allowed")),
  listTeamPerformanceOptions: vi.fn(() => Promise.resolve("allowed")),
}));
vi.mock(
  "../../utils/analytics/hackathon-report.server",
  async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    getHackathonAnalyticsReport: vi.fn(() => Promise.resolve("allowed")),
    listHackathonAnalyticsOptions: vi.fn(() => Promise.resolve("allowed")),
  }),
);

const createAppCaller = createCallerFactory(appRouter);
type Caller = ReturnType<typeof createAppCaller>;

/**
 * Each procedure that moved its action-level check into `meta.mcp.access`,
 * with the exact `controlPerms` call its resolver made before the move.
 */
const movedProcedures: Record<
  string,
  {
    before: {
      mode: "and" | "or";
      permissions: PERMISSIONS.PermissionKey[];
    };
    call: (caller: Caller) => Promise<unknown>;
  }
> = {
  "analytics.getDiscordReport": {
    before: { mode: "or", permissions: ["READ_CLUB_DATA"] },
    call: (caller) => caller.analytics.getDiscordReport({}),
  },
  "analytics.getHackathonReport": {
    before: { mode: "or", permissions: ["READ_HACK_DATA"] },
    call: (caller) =>
      caller.analytics.getHackathonReport({
        hackathonId: "00000000-0000-4000-8000-000000000001",
      }),
  },
  "analytics.getReport": {
    before: { mode: "or", permissions: ["READ_CLUB_DATA"] },
    call: (caller) => caller.analytics.getReport({}),
  },
  "analytics.getTeamPerformanceReport": {
    before: { mode: "or", permissions: ["READ_CLUB_DATA"] },
    call: (caller) =>
      caller.analytics.getTeamPerformanceReport({ teamSlug: "development" }),
  },
  "analytics.listHackathonOptions": {
    before: { mode: "or", permissions: ["READ_HACK_DATA"] },
    call: (caller) => caller.analytics.listHackathonOptions(),
  },
  "analytics.listTeamPerformanceOptions": {
    before: { mode: "or", permissions: ["READ_CLUB_DATA"] },
    call: (caller) => caller.analytics.listTeamPerformanceOptions(),
  },
};

/** Callers covering each relevant permission alone, together, and none. */
const users: PERMISSIONS.PermissionKey[][] = [
  [],
  ["EMAIL_PORTAL"],
  ["READ_CLUB_DATA"],
  ["READ_HACK_DATA"],
  ["READ_HACKERS"],
  ["READ_HACK_DATA", "READ_HACKERS"],
  ["READ_CLUB_DATA", "READ_HACK_DATA"],
  ["IS_OFFICER"],
];

// The pre-move procedure shape: permProcedure plus the resolver check.
const permissionListSchema = z.array(
  z.custom<PERMISSIONS.PermissionKey>((value) => typeof value === "string"),
);
const beforeRouter = createTRPCRouter({
  and: permProcedure
    .input(permissionListSchema)
    .query(({ ctx, input }) => permissions.controlPerms.and(input, ctx)),
  or: permProcedure
    .input(permissionListSchema)
    .query(({ ctx, input }) => permissions.controlPerms.or(input, ctx)),
});

const session = {
  user: { id: "00000000-0000-4000-8000-000000000636" },
} as Session;

function context() {
  return { headers: new Headers(), session, source: "mcp-parity-test" };
}

async function outcome(call: Promise<unknown>) {
  try {
    await call;
    return "allowed";
  } catch (error) {
    expect(error).toMatchObject({ code: "FORBIDDEN" });
    return "forbidden";
  }
}

function declaredMcpProcedures() {
  const router: AnyRouter = appRouter;
  const procedures = router._def.procedures as Record<string, AnyProcedure>;
  return Object.entries(procedures)
    .filter(
      ([, procedure]) =>
        (procedure._def.meta as ForgeTRPCMeta | undefined)?.mcp !== undefined,
    )
    .map(([path]) => path)
    .sort();
}

describe("procedures moved into meta.mcp.access", () => {
  beforeEach(() => {
    mocks.permissionRows = [];
    mocks.db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mocks.permissionRows)),
        })),
      })),
    }));
  });

  it("has a parity case for every procedure that declares meta.mcp", () => {
    expect(declaredMcpProcedures()).toEqual(
      Object.keys(movedProcedures).sort(),
    );
  });

  it.each(Object.entries(movedProcedures))(
    "%s allows and denies the same users as its old resolver check",
    async (_path, { before, call }) => {
      const beforeCaller = createCallerFactory(beforeRouter)(context());
      const afterCaller = createAppCaller(context());

      const results = [];
      for (const keys of users) {
        mocks.permissionRows =
          keys.length === 0
            ? []
            : [{ permissions: permissionBitstring(...keys) }];
        results.push({
          after: await outcome(call(afterCaller)),
          before: await outcome(beforeCaller[before.mode](before.permissions)),
          keys,
        });
      }

      for (const result of results) {
        expect(result.after, `[${result.keys.join(",")}]`).toBe(result.before);
      }
      // Guards the matrix: each rule must both allow and deny someone.
      expect(results.map((result) => result.before)).toContain("allowed");
      expect(results.map((result) => result.before)).toContain("forbidden");
    },
  );
});

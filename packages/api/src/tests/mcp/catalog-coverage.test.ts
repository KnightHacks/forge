import type { AnyProcedure, AnyRouter } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ForgeTRPCMeta } from "../../utils/forms/callbacks";
import {
  appRouter,
  callAction,
  describeAction,
  searchActions,
} from "../../index";
import { buildActionCatalog } from "../../utils/mcp/catalog";
import { createEmptyPermissionMap } from "../../utils/permissions";

const mocks = vi.hoisted(() => ({
  loadPermissions: vi.fn(),
  report: vi.fn((input: unknown) => Promise.resolve(input)),
}));
vi.mock("../../utils/permissions-db", () => ({
  loadPermissionsForUser: mocks.loadPermissions,
}));
vi.mock("../../utils/analytics/team-performance-report", () => ({
  getTeamPerformanceReport: mocks.report,
  listTeamPerformanceOptions: () => Promise.resolve(["development"]),
}));
vi.mock("@forge/db/client", () => ({ db: {} }));
vi.mock("@forge/utils/stripe", () => ({ stripe: {} }));
vi.mock("../../utils/profile-picture/storage", () => ({
  profilePictureStorageClient: {},
}));
vi.mock("../../utils/resume/storage", () => ({ resumeStorageClient: {} }));
vi.mock("../../minio/minio-client", () => ({ minioClient: {} }));

describe("MCP catalog router coverage", () => {
  it("exports the app gateway and preserves native Date inputs for real procedures", async () => {
    const permissions = createEmptyPermissionMap();
    permissions.READ_CLUB_DATA = true;
    mocks.loadPermissions.mockResolvedValue(permissions);
    const session = {
      session: {
        id: "session",
        userId: "actor",
        token: "fixture",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      },
      user: {
        id: "actor",
        name: "Actor",
        email: "actor@example.com",
        emailVerified: true,
        discordUserId: "123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    expect(
      (await searchActions(session, "")).map((action) => action.path),
    ).toContain("analytics.listTeamPerformanceOptions");
    await expect(
      describeAction(session, "analytics.getTeamPerformanceReport"),
    ).resolves.toMatchObject({
      path: "analytics.getTeamPerformanceReport",
      inputSchema: { required: ["teamSlug"] },
    });
    await expect(
      callAction(session, "analytics.listTeamPerformanceOptions", undefined),
    ).resolves.toEqual(["development"]);
    const input = {
      teamSlug: "development",
      period: {
        kind: "custom",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-02T00:00:00Z"),
      },
    };
    await expect(
      callAction(session, "analytics.getTeamPerformanceReport", input),
    ).resolves.toEqual(input);
    expect(mocks.report).toHaveBeenCalledExactlyOnceWith(input);
    permissions.IS_OFFICER = true;
    expect(
      (await searchActions(session, "  ")).map((action) => action.path).sort(),
    ).toEqual([...buildActionCatalog(appRouter).keys()].sort());
    await expect(
      callAction(session, "analytics.getTeamPerformanceReport", {
        ...input,
        period: { ...input.period, from: input.period.from.toISOString() },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("contains every opted-in procedure, with a generated input schema", () => {
    const router: AnyRouter = appRouter;
    const expected = Object.entries(
      router._def.procedures as Record<string, AnyProcedure>,
    )
      .filter(
        ([, procedure]) =>
          (procedure._def.meta as ForgeTRPCMeta | undefined)?.mcp !== undefined,
      )
      .map(([path]) => path)
      .sort();
    expect(expected.length).toBeGreaterThan(0);
    const catalog = buildActionCatalog(appRouter);
    expect([...catalog.keys()].sort()).toEqual(expected);
    for (const action of catalog.values())
      expect(action.inputSchema).toBeDefined();
  });
});

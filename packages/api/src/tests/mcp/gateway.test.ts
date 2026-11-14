import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Session } from "@forge/auth/server";
import type { PERMISSIONS } from "@forge/consts";

import { createTRPCRouter, permProcedure, publicProcedure } from "../../trpc";
import { createActionGateway } from "../../utils/mcp/gateway";
import { permissionBitstring } from "../support/permissions";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  rows: [] as { permissions: string }[],
  audit: vi.fn(),
}));
vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const now = new Date("2026-11-13T00:00:00Z");
const session: Session = {
  session: {
    id: "session",
    userId: "actor",
    token: "fixture-token",
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: null,
  },
  user: {
    id: "actor",
    name: "Actor",
    email: "actor@example.com",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
    discordUserId: "123",
  },
};
const club = {
  access: { mode: "any", permissions: ["READ_CLUB_DATA"] },
  description: "Read Club reports.",
} as const;
const router = createTRPCRouter({
  reports: createTRPCRouter({
    club: permProcedure.meta({ mcp: club }).query(() => "club"),
    hack: permProcedure
      .meta({
        mcp: {
          access: { mode: "any", permissions: ["READ_HACK_DATA"] },
          description: "Read hackathon reports.",
        },
      })
      .query(() => "hack"),
    owned: permProcedure
      .meta({
        mcp: {
          ...club,
          description: "Read one owned resource with Club reports.",
        },
      })
      .input(z.object({ ownerId: z.string().min(1) }))
      .mutation(({ ctx, input }) => {
        if (ctx.session.user.id !== input.ownerId)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not your resource",
          });
        mocks.audit({ actor: ctx.session.user.id, source: ctx.source });
        return input.ownerId;
      }),
    hidden: publicProcedure.query(() => "hidden"),
  }),
});
const gateway = createActionGateway(router);
function grant(...keys: PERMISSIONS.PermissionKey[]) {
  mocks.rows = [{ permissions: permissionBitstring(...keys) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  grant();
  mocks.db.select.mockImplementation(() => ({
    from: () => ({
      innerJoin: () => ({ where: () => Promise.resolve(mocks.rows) }),
    }),
  }));
});

describe("MCP action gateway", () => {
  it("rejects anonymous sessions before reading permissions", async () => {
    await expect(gateway.searchActions(null, "")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      gateway.describeAction(null, "reports.club"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const onToolCall = vi.fn();
    await expect(
      gateway.callAction(null, "reports.club", {}, { onToolCall }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(onToolCall).toHaveBeenCalledExactlyOnceWith({
      actorUserId: null,
      path: "reports.club",
      outcome: "denied",
      errorCode: "UNAUTHORIZED",
    });
  });

  it("enforces metadata even if the opted-in procedure is public", async () => {
    const resolve = vi.fn(() => "public");
    const alternate = createActionGateway(
      createTRPCRouter({
        read: publicProcedure.meta({ mcp: club }).query(resolve),
      }),
    );
    await expect(
      alternate.callAction(session, "read", {}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("preserves procedure errors if the activity hook fails", async () => {
    grant("READ_CLUB_DATA");
    const failure = new Error("Activity writer unavailable");
    const onToolCall = vi.fn(() => Promise.reject(failure));
    await expect(
      gateway.callAction(
        session,
        "reports.owned",
        { ownerId: "other" },
        { onToolCall },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      gateway.callAction(session, "reports.club", {}, { onToolCall }),
    ).rejects.toBe(failure);
    expect(onToolCall).toHaveBeenCalledTimes(2);
  });

  it("reads permission changes on the very next search, describe and call", async () => {
    grant("READ_CLUB_DATA");
    await expect(gateway.callAction(session, "reports.club", {})).resolves.toBe(
      "club",
    );
    grant();
    await expect(
      gateway.callAction(session, "reports.club", {}),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(gateway.searchActions(session, "")).resolves.toEqual([]);
    await expect(
      gateway.describeAction(session, "reports.club"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    grant("READ_CLUB_DATA");
    await expect(gateway.callAction(session, "reports.club", {})).resolves.toBe(
      "club",
    );
  });

  it("reports allowed, denied and failed calls once without inputs or results", async () => {
    const onToolCall = vi.fn();
    grant("READ_CLUB_DATA");
    await gateway.callAction(
      session,
      "reports.owned",
      { ownerId: "actor" },
      { onToolCall },
    );
    await expect(
      gateway.callAction(
        session,
        "reports.owned",
        { ownerId: "other" },
        { onToolCall },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      gateway.callAction(
        session,
        "reports.owned",
        { ownerId: "" },
        { onToolCall },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(onToolCall.mock.calls).toEqual([
      [
        {
          actorUserId: "actor",
          path: "reports.owned",
          outcome: "allowed",
          errorCode: null,
        },
      ],
      [
        {
          actorUserId: "actor",
          path: "reports.owned",
          outcome: "denied",
          errorCode: "FORBIDDEN",
        },
      ],
      [
        {
          actorUserId: "actor",
          path: "reports.owned",
          outcome: "failed",
          errorCode: "BAD_REQUEST",
        },
      ],
    ]);
  });
  it("runs the real validation, resource check and audit on calls", async () => {
    grant("READ_CLUB_DATA");
    await expect(
      gateway.callAction(session, "reports.owned", { ownerId: "other" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not your resource",
    });
    await expect(
      gateway.callAction(session, "reports.owned", { ownerId: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.audit).not.toHaveBeenCalled();
    await expect(
      gateway.callAction(session, "reports.owned", {
        ownerId: session.user.id,
      }),
    ).resolves.toBe("actor");
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      actor: "actor",
      source: "mcp",
    });
    await expect(
      gateway.callAction(session, "reports.hidden", {}),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("describes allowed actions and distinguishes forbidden from absent paths", async () => {
    grant("READ_CLUB_DATA");
    await expect(
      gateway.describeAction(session, "reports.owned"),
    ).resolves.toMatchObject({
      path: "reports.owned",
      description: "Read one owned resource with Club reports.",
      inputSchema: { type: "object", required: ["ownerId"] },
    });
    await expect(
      gateway.describeAction(session, "reports.hack"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      gateway.describeAction(session, "reports.hidden"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      gateway.describeAction(session, "missing"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("lists all allowed actions for an empty query and filters and ranks text matches", async () => {
    grant("READ_CLUB_DATA");
    expect(
      (await gateway.searchActions(session, "")).map((action) => action.path),
    ).toEqual(["reports.club", "reports.owned"]);
    expect(
      (await gateway.searchActions(session, "CLUB")).map(
        (action) => action.path,
      ),
    ).toEqual(["reports.club", "reports.owned"]);
    expect(
      (await gateway.searchActions(session, "club resource")).map(
        (action) => action.path,
      ),
    ).toEqual(["reports.owned"]);
    expect(await gateway.searchActions(session, "hackathon")).toEqual([]);
    grant("IS_OFFICER");
    expect(await gateway.searchActions(session, "")).toHaveLength(3);
  });
});

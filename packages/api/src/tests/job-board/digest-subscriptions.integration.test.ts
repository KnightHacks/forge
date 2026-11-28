import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { db as DatabaseClient } from "@forge/db/client";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq, inArray, sql } from "@forge/db";
import { Roles } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type * as DigestServices from "../../utils/job-board/digest-subscriptions";
import { permissionBitstring } from "../support/permissions";
import { insertJobBoardTestMember } from "./member-fixture";

const internshipRoleId = "444444444444444444";
const newGradRoleId = "555555555555555555";
const guildId = "999999999999999999";
const userId = "222222222222222222";
const internshipOptIn = { track: "internship", enabled: true } as const;

vi.mock("@forge/utils/discord-config", () => ({
  getDiscordConfigId: vi.fn((key: string) => {
    if (key === "career_internship_digest_role") {
      return Promise.resolve(internshipRoleId);
    }
    if (key === "career_new_grad_digest_role") {
      return Promise.resolve(newGradRoleId);
    }
    throw new Error(`Unexpected Discord config key: ${key}`);
  }),
  getKnightHacksGuildId: vi.fn().mockResolvedValue(guildId),
}));

function createGateway() {
  type Gateway = DigestServices.DigestRoleGateway;
  return {
    getRoleId: vi.fn<Gateway["getRoleId"]>((track) =>
      Promise.resolve(
        track === "internship" ? internshipRoleId : newGradRoleId,
      ),
    ),
    listRoleMemberIds: vi
      .fn<Gateway["listRoleMemberIds"]>()
      .mockResolvedValue([]),
    grantRole: vi.fn<Gateway["grantRole"]>().mockResolvedValue(undefined),
    revokeRole: vi.fn<Gateway["revokeRole"]>().mockResolvedValue(undefined),
  };
}

const runLocally = canRunDatabaseTests();
let database: DisposableDatabase | undefined;
let db: typeof DatabaseClient;
let closePool: (() => Promise<void>) | undefined;
let services: typeof DigestServices;
let memberId: string;

beforeAll(async () => {
  if (!runLocally) return;
  database = await provisionDisposableDatabase("forge_digest_subscriptions");
  vi.stubEnv("DATABASE_URL", database.url);
  ({ db } = await import("@forge/db/client"));
  closePool = () => db.$client.end();
  const connected = await db.execute<{ name: string }>(
    sql`select current_database() as name`,
  );
  expect(connected.rows[0]?.name).toBe(new URL(database.url).pathname.slice(1));
  services = await import("../../utils/job-board/digest-subscriptions");
  memberId = await insertJobBoardTestMember(db, userId);
}, 120_000);

beforeEach(async () => {
  await db.update(Member).set({
    jobInternshipDigestEnabled: false,
    jobNewGradDigestEnabled: false,
  });
  const { logger } = await import("@forge/utils");
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  try {
    await closePool?.();
  } finally {
    try {
      await database?.drop();
    } finally {
      vi.unstubAllEnvs();
    }
  }
});

describe.runIf(runLocally)(
  "Career digest opt-ins on disposable PostgreSQL",
  () => {
    it("saves each track before syncing its Discord role (D1)", async () => {
      const { listDigestSubscriptions, setDigestSubscription } = services;
      const gateway = createGateway();
      const beforeRoleCalls: boolean[] = [];

      expect(await listDigestSubscriptions(db, memberId)).toEqual({
        internship: false,
        new_grad: false,
      });
      await setDigestSubscription(
        db,
        memberId,
        { track: "new_grad", enabled: true },
        gateway,
      );
      expect(gateway.grantRole).toHaveBeenCalledWith(userId, newGradRoleId);
      gateway.grantRole.mockClear();
      gateway.grantRole.mockImplementation(async () => {
        beforeRoleCalls.push(
          (await listDigestSubscriptions(db, memberId)).internship,
        );
      });
      gateway.revokeRole.mockImplementation(async () => {
        beforeRoleCalls.push(
          (await listDigestSubscriptions(db, memberId)).internship,
        );
      });

      for (const enabled of [true, true, false]) {
        expect(
          await setDigestSubscription(
            db,
            memberId,
            { ...internshipOptIn, enabled },
            gateway,
          ),
        ).toEqual({ enabled, roleSynced: true });
      }

      expect(beforeRoleCalls).toEqual([true, true, false]);
      expect(gateway.grantRole).toHaveBeenCalledTimes(2);
      expect(gateway.grantRole).toHaveBeenCalledWith(userId, internshipRoleId);
      expect(gateway.revokeRole).toHaveBeenCalledOnce();
      expect(gateway.revokeRole).toHaveBeenCalledWith(userId, internshipRoleId);
      expect(await listDigestSubscriptions(db, memberId)).toEqual({
        internship: false,
        new_grad: true,
      });
    });

    it("makes no Discord call when the save fails (D2)", async () => {
      const { setDigestSubscription } = services;
      const gateway = createGateway();

      await expect(
        setDigestSubscription(db, randomUUID(), internshipOptIn, gateway),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        setDigestSubscription(
          db,
          "invalid-member-id",
          internshipOptIn,
          gateway,
        ),
      ).rejects.toThrow();
      expect(gateway.getRoleId).not.toHaveBeenCalled();
      expect(gateway.grantRole).not.toHaveBeenCalled();
      expect(gateway.revokeRole).not.toHaveBeenCalled();
    });

    it("keeps the saved choice when a Discord identity or role is unavailable (D2)", async () => {
      const { listDigestSubscriptions, setDigestSubscription } = services;
      const gateway = createGateway();
      const invalidMember = await insertJobBoardTestMember(db, "display-only");

      expect(
        await setDigestSubscription(
          db,
          invalidMember,
          internshipOptIn,
          gateway,
        ),
      ).toEqual({ enabled: true, roleSynced: false });
      expect(await listDigestSubscriptions(db, invalidMember)).toEqual({
        internship: true,
        new_grad: false,
      });
      expect(gateway.getRoleId).not.toHaveBeenCalled();

      gateway.getRoleId.mockRejectedValueOnce(new Error("Missing role setup"));
      expect(
        await setDigestSubscription(db, memberId, internshipOptIn, gateway),
      ).toEqual({ enabled: true, roleSynced: false });
      expect(await listDigestSubscriptions(db, memberId)).toEqual({
        internship: true,
        new_grad: false,
      });
      expect(gateway.grantRole).not.toHaveBeenCalled();
    });

    it("keeps an opt-out saved if Discord rejects the revocation (D2)", async () => {
      const { listDigestSubscriptions, setDigestSubscription } = services;
      const gateway = createGateway();
      await setDigestSubscription(db, memberId, internshipOptIn, gateway);
      gateway.revokeRole.mockRejectedValueOnce(
        new Error("Discord is unavailable"),
      );

      expect(
        await setDigestSubscription(
          db,
          memberId,
          { ...internshipOptIn, enabled: false },
          gateway,
        ),
      ).toEqual({ enabled: false, roleSynced: false });
      expect(await listDigestSubscriptions(db, memberId)).toEqual({
        internship: false,
        new_grad: false,
      });
    });
  },
);

function firstGuildMemberPage() {
  return Array.from({ length: 1000 }, (_, index) => ({
    user: { id: (100000000000000000n + BigInt(index)).toString() },
    roles: index === 0 ? [internshipRoleId] : [],
  }));
}

describe.runIf(runLocally)(
  "Career digest role repair on disposable PostgreSQL",
  () => {
    it("repairs role differences, counts failures, and retries only the remaining change (D3)", async () => {
      const { reconcileDigestRole } = services;
      const gateway = createGateway();
      const shouldKeep = "111111111111111111";
      const secondGrant = "333333333333333333";
      const shouldRevoke = "666666666666666666";
      const newGradOnly = await insertJobBoardTestMember(
        db,
        "777777777777777777",
      );
      const optedIn = [
        memberId,
        await insertJobBoardTestMember(db, shouldKeep),
        await insertJobBoardTestMember(db, secondGrant),
        await insertJobBoardTestMember(db, userId),
        await insertJobBoardTestMember(db, "display-only"),
      ];
      await db
        .update(Member)
        .set({ jobInternshipDigestEnabled: true })
        .where(inArray(Member.id, optedIn));
      await db
        .update(Member)
        .set({ jobNewGradDigestEnabled: true })
        .where(eq(Member.id, newGradOnly));

      const current = new Set([shouldKeep, shouldRevoke]);
      gateway.listRoleMemberIds.mockImplementation(() =>
        Promise.resolve([...current]),
      );
      gateway.grantRole
        .mockRejectedValueOnce(new Error("Transient Discord grant failure"))
        .mockImplementation((id) => {
          current.add(id);
          return Promise.resolve();
        });
      gateway.revokeRole.mockImplementation((id) => {
        current.delete(id);
        return Promise.resolve();
      });

      expect(await reconcileDigestRole(db, "internship", gateway)).toEqual({
        granted: 1,
        revoked: 1,
        failed: 1,
      });
      expect(gateway.grantRole).toHaveBeenCalledTimes(2);
      const failedGrant = gateway.grantRole.mock.calls[0]?.[0];
      expect([userId, secondGrant]).toContain(failedGrant);
      expect([...current].sort()).toEqual([
        shouldKeep,
        ...[userId, secondGrant].filter((id) => id !== failedGrant),
      ]);
      expect(gateway.revokeRole).toHaveBeenCalledWith(
        shouldRevoke,
        internshipRoleId,
      );

      gateway.grantRole.mockClear();
      expect(await reconcileDigestRole(db, "internship", gateway)).toEqual({
        granted: 1,
        revoked: 0,
        failed: 0,
      });
      expect(gateway.grantRole).toHaveBeenCalledExactlyOnceWith(
        failedGrant,
        internshipRoleId,
      );
      expect([...current].sort()).toEqual([shouldKeep, userId, secondGrant]);
    });

    it("makes no role changes if a later page of the Discord member list fails (D4)", async () => {
      const { api } = await import("@forge/utils/discord");
      const failure = new Error("Discord member listing failed");
      const get = vi
        .spyOn(api, "get")
        .mockRejectedValue(new Error("Unexpected guild member read"))
        .mockResolvedValueOnce(firstGuildMemberPage())
        .mockRejectedValueOnce(failure);
      const put = vi.spyOn(api, "put").mockResolvedValue(undefined);
      const remove = vi.spyOn(api, "delete").mockResolvedValue(undefined);
      await db
        .update(Member)
        .set({ jobInternshipDigestEnabled: true })
        .where(eq(Member.id, memberId));

      await expect(services.reconcileDigestRole(db, "internship")).rejects.toBe(
        failure,
      );

      expect(get).toHaveBeenNthCalledWith(
        1,
        `/guilds/${guildId}/members?limit=1000`,
      );
      expect(get).toHaveBeenNthCalledWith(
        2,
        `/guilds/${guildId}/members?limit=1000&after=100000000000000999`,
      );
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it("repairs only the configured track role across all member pages (D4)", async () => {
      const { api } = await import("@forge/utils/discord");
      const existing = "111111111111111111";
      const stale = "666666666666666666";
      const existingMemberId = await insertJobBoardTestMember(db, existing);
      await db
        .update(Member)
        .set({ jobNewGradDigestEnabled: true })
        .where(inArray(Member.id, [memberId, existingMemberId]));
      const get = vi
        .spyOn(api, "get")
        .mockRejectedValue(new Error("Unexpected guild member read"))
        .mockResolvedValueOnce(firstGuildMemberPage())
        .mockResolvedValueOnce([
          { user: { id: existing }, roles: [newGradRoleId] },
          { user: { id: stale }, roles: [newGradRoleId] },
        ]);
      const put = vi.spyOn(api, "put").mockResolvedValue(undefined);
      const remove = vi.spyOn(api, "delete").mockResolvedValue(undefined);

      expect(await services.reconcileDigestRole(db, "new_grad")).toEqual({
        granted: 1,
        revoked: 1,
        failed: 0,
      });
      expect(get).toHaveBeenCalledTimes(2);
      expect(put).toHaveBeenCalledExactlyOnceWith(
        `/guilds/${guildId}/members/${userId}/roles/${newGradRoleId}`,
      );
      expect(remove).toHaveBeenCalledExactlyOnceWith(
        `/guilds/${guildId}/members/${stale}/roles/${newGradRoleId}`,
      );
    });

    it("keeps role management counts across all read member pages", async () => {
      const { api } = await import("@forge/utils/discord");
      const { liveRoleDiscordGateway } =
        await import("../../utils/roles/discord-gateway");
      const get = vi
        .spyOn(api, "get")
        .mockRejectedValue(new Error("Unexpected guild member read"))
        .mockResolvedValueOnce(firstGuildMemberPage())
        .mockResolvedValueOnce([
          { user: { id: userId }, roles: [internshipRoleId, newGradRoleId] },
        ]);

      expect(await liveRoleDiscordGateway.getRoleCounts()).toEqual({
        [internshipRoleId]: 2,
        [newGradRoleId]: 1,
      });
      expect(get).toHaveBeenCalledTimes(2);
    });
  },
);

describe.runIf(runLocally)(
  "Career digest role safety on disposable PostgreSQL",
  () => {
    it("rejects a shared or Blade-linked role before any role operations (D5)", async () => {
      const {
        listDigestSubscriptions,
        reconcileDigestRole,
        setDigestSubscription,
      } = services;
      const linkedRoleId = "888888888888888888";
      await db.insert(Roles).values({
        discordRoleId: linkedRoleId,
        name: "Linked role fixture",
        permissions: permissionBitstring("IS_OFFICER"),
      });
      const shared = createGateway();
      shared.getRoleId.mockResolvedValue(internshipRoleId);
      const linked = createGateway();
      linked.getRoleId.mockImplementation((track) =>
        Promise.resolve(track === "internship" ? linkedRoleId : newGradRoleId),
      );

      for (const [gateway, error] of [
        [shared, /different Discord roles/],
        [linked, /linked to Blade permissions/],
      ] as const) {
        expect(
          await setDigestSubscription(db, memberId, internshipOptIn, gateway),
        ).toEqual({ enabled: true, roleSynced: false });
        expect((await listDigestSubscriptions(db, memberId)).internship).toBe(
          true,
        );
        await expect(
          reconcileDigestRole(db, "internship", gateway),
        ).rejects.toThrow(error);
        expect(gateway.listRoleMemberIds).not.toHaveBeenCalled();
        expect(gateway.grantRole).not.toHaveBeenCalled();
        expect(gateway.revokeRole).not.toHaveBeenCalled();
      }
    });

    it("keeps a shared Discord identity subscribed while one member record still opts in (D6)", async () => {
      const { setDigestSubscription } = services;
      const gateway = createGateway();
      const otherMemberId = await insertJobBoardTestMember(db, userId);
      await setDigestSubscription(db, memberId, internshipOptIn, gateway);
      await setDigestSubscription(db, otherMemberId, internshipOptIn, gateway);
      const optOut = { ...internshipOptIn, enabled: false };

      expect(
        await setDigestSubscription(db, memberId, optOut, gateway),
      ).toEqual({ enabled: false, roleSynced: true });
      expect(gateway.revokeRole).not.toHaveBeenCalled();
      await setDigestSubscription(db, otherMemberId, optOut, gateway);
      expect(gateway.revokeRole).toHaveBeenCalledExactlyOnceWith(
        userId,
        internshipRoleId,
      );
    });
  },
);

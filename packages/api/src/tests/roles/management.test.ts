import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { roleManagementQuerySchema } from "@forge/validators";

import {
  filterDiscordRolesForLinking,
  filterRoleUsers,
  isCosmeticPermissionString,
  permissionBitstringToKeys,
  permissionKeysToBitstring,
  planRoleMembershipSync,
  retainsAssignedRoleAdministrator,
  retainsAssignedRoleAdministratorAfterRevocations,
  runRoleAssignmentBatch,
} from "../../utils/roles/management";

const ROLE_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";

describe("role management data behavior", () => {
  it("normalizes permission keys to stable bit indices and identifies cosmetics", () => {
    const bitstring = permissionKeysToBitstring([
      "READ_MEMBERS",
      "CONFIGURE_ROLES",
    ]);

    expect(bitstring).toHaveLength(
      Object.keys(PERMISSIONS.PERMISSION_DATA).length,
    );
    const readIndex = PERMISSIONS.PERMISSIONS.READ_MEMBERS;
    const configureIndex = PERMISSIONS.PERMISSIONS.CONFIGURE_ROLES;
    expect(readIndex).toBeDefined();
    expect(configureIndex).toBeDefined();
    expect(bitstring[readIndex ?? -1]).toBe("1");
    expect(bitstring[configureIndex ?? -1]).toBe("1");
    expect(permissionBitstringToKeys(bitstring)).toEqual([
      "READ_MEMBERS",
      "CONFIGURE_ROLES",
    ]);
    expect(isCosmeticPermissionString("0".repeat(bitstring.length))).toBe(true);
    expect(isCosmeticPermissionString(bitstring)).toBe(false);
  });

  it("filters Discord discovery to eligible unlinked roles", () => {
    const result = filterDiscordRolesForLinking({
      guildId: "100000000000000000",
      linkedRoleIds: new Set(["100000000000000004"]),
      memberCounts: { "100000000000000003": 7 },
      roles: [
        {
          color: 0,
          id: "100000000000000000",
          managed: false,
          name: "@everyone",
          position: 0,
        },
        {
          color: 0,
          id: "100000000000000001",
          managed: true,
          name: "Bot role",
          position: 4,
        },
        {
          color: 0x6d28d9,
          id: "100000000000000003",
          managed: false,
          name: "Design",
          position: 3,
        },
        {
          color: 0,
          id: "100000000000000002",
          managed: false,
          name: "Community",
          position: 1,
        },
        {
          color: 0,
          id: "100000000000000004",
          managed: false,
          name: "Already linked",
          position: 5,
        },
      ],
    });

    expect(result.map((role) => role.name)).toEqual(["Design", "Community"]);
    expect(result[0]).toMatchObject({
      hexColor: "#6d28d9",
      memberCount: 7,
    });
  });

  it("keeps eligible Discord roles selectable when member counts are unavailable", () => {
    const result = filterDiscordRolesForLinking({
      guildId: "100000000000000000",
      linkedRoleIds: new Set(),
      memberCounts: null,
      roles: [
        {
          color: 0,
          id: "100000000000000001",
          managed: false,
          name: "Community",
          position: 1,
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "100000000000000001",
        memberCount: null,
      }),
    ]);
  });

  it("uses AND role filters, normalized search, and deterministic pagination", () => {
    const input = roleManagementQuerySchema.parse({
      page: 1,
      pageSize: 25,
      userQuery: "alce",
      userRoleIds: [ROLE_ID, SECOND_ROLE_ID],
      view: "assignments",
    });
    const result = filterRoleUsers(
      [
        {
          discordUserId: "100000000000000010",
          email: "alice@example.test",
          id: USER_ID,
          memberName: "Alice Archive",
          name: "admin-target-00",
          roleIds: [ROLE_ID, SECOND_ROLE_ID],
        },
        {
          discordUserId: "100000000000000011",
          email: "bob@example.test",
          id: "00000000-0000-4000-8000-000000000004",
          memberName: "Bob Builder",
          name: "bob",
          roleIds: [ROLE_ID],
        },
      ],
      input,
    );

    expect(result.users.map((user) => user.id)).toEqual([USER_ID]);
    expect(result.pagination).toMatchObject({ page: 1, totalCount: 1 });
  });

  it.each([
    "alice@example.test",
    "100000000000000010",
    "Alice Archive",
    "admin-target-00",
  ])("finds users by supported identity value %s", (userQuery) => {
    const input = roleManagementQuerySchema.parse({
      userQuery,
      view: "assignments",
    });
    const result = filterRoleUsers(
      [
        {
          discordUserId: "100000000000000010",
          email: "alice@example.test",
          id: USER_ID,
          memberName: "Alice Archive",
          name: "admin-target-00",
          roleIds: [],
        },
      ],
      input,
    );

    expect(result.users.map((user) => user.id)).toEqual([USER_ID]);
  });

  it("plans adds, stale removals, and duplicate collapse for one-role sync", () => {
    const plan = planRoleMembershipSync([
      { assignmentIds: [], discordHasRole: true, userId: "add" },
      {
        assignmentIds: ["stale"],
        discordHasRole: false,
        userId: "remove",
      },
      {
        assignmentIds: ["keep", "duplicate"],
        discordHasRole: true,
        userId: "dedupe",
      },
      { assignmentIds: [], discordHasRole: false, userId: "unchanged" },
    ]);

    expect(plan.addUserIds).toEqual(["add"]);
    expect(plan.removeAssignmentIds).toEqual(["stale", "duplicate"]);
    expect(plan.unchangedCount).toBe(2);
  });

  it("blocks removal of the final assigned administrative role", () => {
    const adminBits = permissionKeysToBitstring(["CONFIGURE_ROLES"]);
    const cosmeticBits = permissionKeysToBitstring([]);

    expect(
      retainsAssignedRoleAdministrator({
        assignments: [{ roleId: ROLE_ID, userId: USER_ID }],
        nextPermissionsByRole: new Map([[ROLE_ID, cosmeticBits]]),
        roles: [{ id: ROLE_ID, permissions: adminBits }],
      }),
    ).toBe(false);
    expect(
      retainsAssignedRoleAdministrator({
        assignments: [
          { roleId: ROLE_ID, userId: USER_ID },
          { roleId: SECOND_ROLE_ID, userId: USER_ID },
        ],
        nextPermissionsByRole: new Map([[ROLE_ID, cosmeticBits]]),
        roles: [
          { id: ROLE_ID, permissions: adminBits },
          { id: SECOND_ROLE_ID, permissions: adminBits },
        ],
      }),
    ).toBe(true);
  });

  it("blocks batch revocation of the final administrative assignment", () => {
    const adminBits = permissionKeysToBitstring(["CONFIGURE_ROLES"]);
    const cosmeticBits = permissionKeysToBitstring([]);
    const assignments = [
      { roleId: ROLE_ID, userId: USER_ID },
      { roleId: SECOND_ROLE_ID, userId: USER_ID },
    ];
    const roles = [
      { id: ROLE_ID, permissions: adminBits },
      { id: SECOND_ROLE_ID, permissions: cosmeticBits },
    ];

    expect(
      retainsAssignedRoleAdministratorAfterRevocations({
        assignments,
        revokedRoleIds: new Set([ROLE_ID]),
        revokedUserIds: new Set([USER_ID]),
        roles,
      }),
    ).toBe(false);
    expect(
      retainsAssignedRoleAdministratorAfterRevocations({
        assignments,
        revokedRoleIds: new Set([SECOND_ROLE_ID]),
        revokedUserIds: new Set([USER_ID]),
        roles,
      }),
    ).toBe(true);
  });
});

describe("Discord-first role assignment", () => {
  it("does not grant Blade membership when Discord fails", async () => {
    const grantBlade = vi.fn();
    const result = await runRoleAssignmentBatch({
      action: "grant",
      existingPairs: new Set(),
      grantBlade,
      grantDiscord: vi.fn().mockRejectedValue(new Error("hierarchy")),
      revokeBlade: vi.fn(),
      revokeDiscord: vi.fn(),
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });

    expect(grantBlade).not.toHaveBeenCalled();
    expect(result.failed).toEqual([
      expect.objectContaining({ roleId: ROLE_ID, stage: "discord" }),
    ]);
  });

  it("compensates Discord when the Blade grant fails", async () => {
    const revokeDiscord = vi.fn().mockResolvedValue(undefined);
    const result = await runRoleAssignmentBatch({
      action: "grant",
      existingPairs: new Set(),
      grantBlade: vi.fn().mockRejectedValue(new Error("db")),
      grantDiscord: vi.fn().mockResolvedValue(undefined),
      revokeBlade: vi.fn(),
      revokeDiscord,
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });

    expect(revokeDiscord).toHaveBeenCalledWith(
      "300000000000000001",
      "200000000000000001",
    );
    expect(result.failed[0]).toMatchObject({
      compensated: true,
      stage: "blade",
    });
  });

  it("skips existing grants and removes all Blade rows after Discord revoke", async () => {
    const pair = `${USER_ID}:${ROLE_ID}`;
    const revokeBlade = vi.fn().mockResolvedValue(undefined);
    const revokeDiscord = vi.fn().mockResolvedValue(undefined);

    const skipped = await runRoleAssignmentBatch({
      action: "grant",
      existingPairs: new Set([pair]),
      grantBlade: vi.fn(),
      grantDiscord: vi.fn(),
      revokeBlade,
      revokeDiscord,
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });
    expect(skipped.skipped).toHaveLength(1);

    const revoked = await runRoleAssignmentBatch({
      action: "revoke",
      existingPairs: new Set([pair]),
      grantBlade: vi.fn(),
      grantDiscord: vi.fn(),
      revokeBlade,
      revokeDiscord,
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });
    expect(revokeDiscord).toHaveBeenCalledBefore(revokeBlade);
    expect(revoked.succeeded).toHaveLength(1);
  });

  it("leaves Blade assignments intact when Discord revoke fails", async () => {
    const revokeBlade = vi.fn();
    const result = await runRoleAssignmentBatch({
      action: "revoke",
      existingPairs: new Set([`${USER_ID}:${ROLE_ID}`]),
      grantBlade: vi.fn(),
      grantDiscord: vi.fn(),
      revokeBlade,
      revokeDiscord: vi.fn().mockRejectedValue(new Error("discord")),
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });

    expect(revokeBlade).not.toHaveBeenCalled();
    expect(result.failed).toEqual([
      expect.objectContaining({ stage: "discord" }),
    ]);
  });

  it("restores Discord when Blade revoke fails", async () => {
    const grantDiscord = vi.fn().mockResolvedValue(undefined);
    const result = await runRoleAssignmentBatch({
      action: "revoke",
      existingPairs: new Set([`${USER_ID}:${ROLE_ID}`]),
      grantBlade: vi.fn(),
      grantDiscord,
      revokeBlade: vi.fn().mockRejectedValue(new Error("db")),
      revokeDiscord: vi.fn().mockResolvedValue(undefined),
      roles: [{ discordRoleId: "200000000000000001", id: ROLE_ID }],
      users: [{ discordUserId: "300000000000000001", id: USER_ID }],
    });

    expect(grantDiscord).toHaveBeenCalledWith(
      "300000000000000001",
      "200000000000000001",
    );
    expect(result.failed).toEqual([
      expect.objectContaining({ compensated: true, stage: "blade" }),
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

describe("hasPermission", () => {
  it("should return true when permission bit is '1'", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "1".repeat(permissionsCount);

    // Test first permission
    const firstPermIndex =
      PERMISSIONS.PERMISSIONS[
        Object.keys(
          PERMISSIONS.PERMISSIONS,
        )[0] as keyof typeof PERMISSIONS.PERMISSIONS
      ]!;
    expect(permissions.hasPermission(permissionString, firstPermIndex)).toBe(
      true,
    );
  });

  it("should return false when permission bit is '0'", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "0".repeat(permissionsCount);

    const firstPermIndex =
      PERMISSIONS.PERMISSIONS[
        Object.keys(
          PERMISSIONS.PERMISSIONS,
        )[0] as keyof typeof PERMISSIONS.PERMISSIONS
      ]!;
    expect(permissions.hasPermission(permissionString, firstPermIndex)).toBe(
      false,
    );
  });

  it("should handle mixed permission strings", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    // Set first bit to 1, rest to 0
    const permissionString = "1" + "0".repeat(permissionsCount - 1);

    const firstPermIndex =
      PERMISSIONS.PERMISSIONS[
        Object.keys(
          PERMISSIONS.PERMISSIONS,
        )[0] as keyof typeof PERMISSIONS.PERMISSIONS
      ]!;
    const secondPermIndex =
      PERMISSIONS.PERMISSIONS[
        Object.keys(
          PERMISSIONS.PERMISSIONS,
        )[1] as keyof typeof PERMISSIONS.PERMISSIONS
      ]!;

    expect(permissions.hasPermission(permissionString, firstPermIndex)).toBe(
      true,
    );
    expect(permissions.hasPermission(permissionString, secondPermIndex)).toBe(
      false,
    );
  });

  it("should handle edge indices", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "0".repeat(permissionsCount - 1) + "1";

    const lastPermIndex = permissionsCount - 1;
    expect(permissions.hasPermission(permissionString, lastPermIndex)).toBe(
      true,
    );
    expect(permissions.hasPermission(permissionString, 0)).toBe(false);
  });

  it("should work with permissions from database", async () => {
    const { getTestDb } = await import("../../setup/db");
    const testDb = getTestDb();

    // Create a role with specific permissions
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "1" + "0".repeat(permissionsCount - 1); // First permission only

    const { createTestRole, createTestUser, grantRole } =
      await import("../../setup/fixtures");

    const role = await createTestRole({ permissions: permissionString });
    const user = await createTestUser();
    await grantRole(user.id, role.id);

    // Fetch the role from database to verify
    const dbRole = await testDb.query.Roles.findFirst({
      where: (r, { eq }) => eq(r.id, role.id),
    });

    expect(dbRole).toBeDefined();
    expect(dbRole?.permissions).toBe(permissionString);

    // Test hasPermission with the role's permission string
    const firstPermIndex = PERMISSIONS.PERMISSIONS.IS_OFFICER;
    expect(permissions.hasPermission(dbRole!.permissions, firstPermIndex)).toBe(
      true,
    );
  });
});

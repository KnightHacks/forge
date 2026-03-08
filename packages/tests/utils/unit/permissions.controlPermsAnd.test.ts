import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

import {
  createTestRole,
  createTestUser,
  grantRole,
} from "../../setup/fixtures";
import { buildPermissionsMap } from "../../setup/helpers";

describe("controlPerms.and()", () => {
  it("should return true if user has all required permissions", async () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;

    // Create role with both READ_MEMBERS (index 2) and EDIT_MEMBERS (index 3)
    const permissionString =
      "0".repeat(2) + "11" + "0".repeat(permissionsCount - 4);
    const role = await createTestRole({ permissions: permissionString });
    const user = await createTestUser();
    await grantRole(user.id, role.id);

    const permissionsMap = await buildPermissionsMap(user.id);

    const ctx = {
      session: {
        permissions: permissionsMap,
      },
    };

    // User has both READ_MEMBERS and EDIT_MEMBERS, should pass AND check
    expect(() => {
      permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();
  });

  it("should throw UNAUTHORIZED if user is missing any required permission", async () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;

    // Create role with only READ_MEMBERS (index 2), not EDIT_MEMBERS
    const permissionString =
      "0".repeat(2) + "1" + "0".repeat(permissionsCount - 3);
    const role = await createTestRole({ permissions: permissionString });
    const user = await createTestUser();
    await grantRole(user.id, role.id);

    const permissionsMap = await buildPermissionsMap(user.id);

    const ctx = {
      session: {
        permissions: permissionsMap,
      },
    };

    // User has READ_MEMBERS but not EDIT_MEMBERS, should throw
    expect(() => {
      permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).toThrow(TRPCError);
  });

  it("should return true if user has IS_OFFICER (overwrites all checks)", async () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;

    // Create role with IS_OFFICER permission (index 0)
    const permissionString = "1" + "0".repeat(permissionsCount - 1);
    const role = await createTestRole({ permissions: permissionString });
    const user = await createTestUser();
    await grantRole(user.id, role.id);

    const permissionsMap = await buildPermissionsMap(user.id);

    const ctx = {
      session: {
        permissions: permissionsMap,
      },
    };

    // User has IS_OFFICER, should pass even without required permissions
    expect(() => {
      permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();
  });
});

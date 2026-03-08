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

describe("controlPerms.or()", () => {
  it("should return true if user has at least one required permission", async () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;

    // Create role with READ_MEMBERS permission (index 2)
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

    // User has READ_MEMBERS, so should pass OR check
    expect(() => {
      permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();
  });

  it("should throw UNAUTHORIZED if user has none of the required permissions", async () => {
    // Create role with no permissions
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "0".repeat(permissionsCount);
    const role = await createTestRole({ permissions: permissionString });
    const user = await createTestUser();
    await grantRole(user.id, role.id);

    const permissionsMap = await buildPermissionsMap(user.id);

    const ctx = {
      session: {
        permissions: permissionsMap,
      },
    };

    // User has none of the required permissions, should throw
    expect(() => {
      permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
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
      permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();
  });
});

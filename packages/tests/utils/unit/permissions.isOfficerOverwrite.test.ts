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

describe("IS_OFFICER overwrite functionality", () => {
  it("should bypass OR checks when IS_OFFICER is true", async () => {
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

    // IS_OFFICER should bypass all permission checks
    expect(() => {
      permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();

    expect(() => {
      permissions.controlPerms.or(["READ_HACKERS", "EDIT_HACKERS"], ctx);
    }).not.toThrow();
  });

  it("should bypass AND checks when IS_OFFICER is true", async () => {
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

    // IS_OFFICER should bypass all permission checks
    expect(() => {
      permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).not.toThrow();

    expect(() => {
      permissions.controlPerms.and(["READ_HACKERS", "EDIT_HACKERS"], ctx);
    }).not.toThrow();
  });

  it("should not bypass checks when IS_OFFICER is false", async () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;

    // Create role with no permissions
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

    // Without IS_OFFICER, should fail permission checks
    expect(() => {
      permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).toThrow(TRPCError);

    expect(() => {
      permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
    }).toThrow(TRPCError);
  });
});

import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";
import { permissions } from "@forge/utils";

describe("getPermsAsList", () => {
  it("should return empty list for all-zero permissions", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "0".repeat(permissionsCount);
    const result = permissions.getPermsAsList(permissionString);
    expect(result).toEqual([]);
  });

  it("should return list with IS_OFFICER when first bit is set", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "1" + "0".repeat(permissionsCount - 1);
    const result = permissions.getPermsAsList(permissionString);
    expect(result).toContain("Is Officer");
    expect(result.length).toBe(1);
  });

  it("should return list with multiple permissions when multiple bits are set", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    // Set first two bits
    const permissionString = "11" + "0".repeat(permissionsCount - 2);
    const result = permissions.getPermsAsList(permissionString);
    expect(result.length).toBe(2);
    expect(result).toContain("Is Officer");
  });

  it("should return list with last permission when last bit is set", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "0".repeat(permissionsCount - 1) + "1";
    const result = permissions.getPermsAsList(permissionString);
    expect(result.length).toBe(1);
    // Last permission should be "Configure Roles" based on the permissions list
    expect(result[0]).toBeDefined();
  });

  it("should return all permissions when all bits are set", () => {
    const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
    const permissionString = "1".repeat(permissionsCount);
    const result = permissions.getPermsAsList(permissionString);
    expect(result.length).toBe(permissionsCount);
    expect(result).toContain("Is Officer");
  });
});

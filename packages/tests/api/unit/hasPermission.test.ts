import { TRPCError } from "@trpc/server";
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

  describe("controlPerms.or()", () => {
    it("should return true if user has at least one required permission", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: false,
            READ_MEMBERS: true,
            EDIT_MEMBERS: false,
            READ_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has READ_MEMBERS, so should pass OR check
      expect(() => {
        permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).not.toThrow();
    });

    it("should throw UNAUTHORIZED if user has none of the required permissions", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: false,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
            READ_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has none of the required permissions, should throw
      expect(() => {
        permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).toThrow(TRPCError);
    });

    it("should return true if user has IS_OFFICER (overwrites all checks)", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: true,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has IS_OFFICER, should pass even without required permissions
      expect(() => {
        permissions.controlPerms.or(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).not.toThrow();
    });
  });

  describe("controlPerms.and()", () => {
    it("should return true if user has all required permissions", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: false,
            READ_MEMBERS: true,
            EDIT_MEMBERS: true,
            READ_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has both READ_MEMBERS and EDIT_MEMBERS, should pass AND check
      expect(() => {
        permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).not.toThrow();
    });

    it("should throw UNAUTHORIZED if user is missing any required permission", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: false,
            READ_MEMBERS: true,
            EDIT_MEMBERS: false,
            READ_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has READ_MEMBERS but not EDIT_MEMBERS, should throw
      expect(() => {
        permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).toThrow(TRPCError);
    });

    it("should return true if user has IS_OFFICER (overwrites all checks)", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: true,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
        },
      };

      // User has IS_OFFICER, should pass even without required permissions
      expect(() => {
        permissions.controlPerms.and(["READ_MEMBERS", "EDIT_MEMBERS"], ctx);
      }).not.toThrow();
    });
  });

  describe("IS_OFFICER overwrite functionality", () => {
    it("should bypass OR checks when IS_OFFICER is true", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: true,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
            READ_HACKERS: false,
            EDIT_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
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

    it("should bypass AND checks when IS_OFFICER is true", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: true,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
            READ_HACKERS: false,
            EDIT_HACKERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
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

    it("should not bypass checks when IS_OFFICER is false", () => {
      const ctx = {
        session: {
          permissions: {
            IS_OFFICER: false,
            READ_MEMBERS: false,
            EDIT_MEMBERS: false,
          } as Record<keyof typeof PERMISSIONS.PERMISSIONS, boolean>,
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
});

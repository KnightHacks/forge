import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";

import {
  canAccessCompanyAdmin,
  canAccessDiscordArchive,
  canEditCompanyAdmin,
} from "~/lib/admin-access";

type EffectivePermissions = Parameters<typeof canAccessCompanyAdmin>[0];

function permissions(
  ...allowed: PERMISSIONS.PermissionKey[]
): EffectivePermissions {
  return Object.fromEntries(
    PERMISSIONS.PERMISSION_KEYS.map((key) => [key, allowed.includes(key)]),
  ) as EffectivePermissions;
}

describe("dedicated admin access", () => {
  it("separates company access from member access", () => {
    expect(canAccessCompanyAdmin(permissions("READ_MEMBERS"))).toBe(false);
    expect(canAccessCompanyAdmin(permissions("EDIT_MEMBERS"))).toBe(false);
    expect(canAccessCompanyAdmin(permissions("READ_COMPANIES"))).toBe(true);
    expect(canAccessCompanyAdmin(permissions("EDIT_COMPANIES"))).toBe(true);
  });

  it("keeps company editing narrower than reading", () => {
    expect(canEditCompanyAdmin(permissions("READ_COMPANIES"))).toBe(false);
    expect(canEditCompanyAdmin(permissions("EDIT_COMPANIES"))).toBe(true);
    expect(canEditCompanyAdmin(permissions("IS_OFFICER"))).toBe(true);
  });

  it("delegates Discord archive access without granting officer", () => {
    expect(canAccessDiscordArchive(permissions("READ_DISCORD_ARCHIVE"))).toBe(
      true,
    );
    expect(canAccessDiscordArchive(permissions("READ_CLUB_DATA"))).toBe(false);
    expect(canAccessDiscordArchive(permissions("IS_OFFICER"))).toBe(true);
  });
});

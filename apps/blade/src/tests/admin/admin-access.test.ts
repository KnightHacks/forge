import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@forge/consts";

import {
  canAccessCompanyAdmin,
  canAccessDiscordArchive,
  canAccessHackathonAdmin,
  canAccessHackerAdmin,
  canAccessPointStore,
  canAccessPrintingQueue,
  canEditCompanyAdmin,
  canEditHackerAdmin,
  getAdminNavigationAccess,
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
  it.each(["READ_HACKERS", "EDIT_HACKERS"] as const)(
    "grants hacker access through %s without configuration access",
    (permission) => {
      const granted = permissions(permission);
      expect(canAccessHackerAdmin(granted)).toBe(true);
      expect(getAdminNavigationAccess(granted).hackers).toBe(true);
      expect(canAccessHackathonAdmin(granted)).toBe(false);
      expect(canEditHackerAdmin(granted)).toBe(permission === "EDIT_HACKERS");
    },
  );

  it("keeps unrelated permissions out and preserves the officer override", () => {
    expect(canAccessHackerAdmin(permissions("READ_HACK_DATA"))).toBe(false);
    expect(canAccessHackerAdmin(permissions("READ_MEMBERS"))).toBe(false);
    expect(canAccessHackerAdmin(permissions())).toBe(false);
    expect(canAccessHackerAdmin(permissions("IS_OFFICER"))).toBe(true);
    expect(canEditHackerAdmin(permissions("IS_OFFICER"))).toBe(true);
  });

  it("[TC-NEG-002/003] gates the printing queue on PRINTING_QUEUE or officer", () => {
    expect(canAccessPrintingQueue(permissions("PRINTING_QUEUE"))).toBe(true);
    expect(canAccessPrintingQueue(permissions("IS_OFFICER"))).toBe(true);
    expect(canAccessPrintingQueue(permissions("READ_HACKERS"))).toBe(false);
    expect(
      getAdminNavigationAccess(permissions("PRINTING_QUEUE")).printing,
    ).toBe(true);
    expect(getAdminNavigationAccess(permissions("EDIT_HACKERS")).printing).toBe(
      false,
    );
  });

  it("gates the point store on its dedicated permission", () => {
    expect(canAccessPointStore(permissions("HACKATHON_MERCH_STORE"))).toBe(
      true,
    );
    expect(canAccessPointStore(permissions("EDIT_HACKERS"))).toBe(false);
    expect(canAccessPointStore(permissions("IS_OFFICER"))).toBe(false);
    expect(
      getAdminNavigationAccess(permissions("HACKATHON_MERCH_STORE")).pointStore,
    ).toBe(true);
  });

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

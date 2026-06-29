import { describe, expect, it } from "vitest";

import {
  discordRoleIdSchema,
  ROLE_UNLINK_CONFIRMATION,
  roleBatchAssignmentSchema,
  roleCreateSchema,
  roleManagementQuerySchema,
  rolePermissionUpdateSchema,
  roleUnlinkSchema,
} from "../role-management";

const ROLE_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

describe("role management validators", () => {
  it("accepts Discord snowflakes and rejects malformed IDs", () => {
    expect(discordRoleIdSchema.parse("1151884200069320805")).toBe(
      "1151884200069320805",
    );
    expect(() => discordRoleIdSchema.parse("role-123")).toThrow();
    expect(() => discordRoleIdSchema.parse("123")).toThrow();
  });

  it("accepts empty permissions for cosmetic roles and rejects duplicates", () => {
    expect(
      roleCreateSchema.parse({
        discordRoleId: "1151884200069320805",
        permissions: [],
      }),
    ).toEqual({
      discordRoleId: "1151884200069320805",
      permissions: [],
    });

    expect(() =>
      rolePermissionUpdateSchema.parse({
        roleId: ROLE_ID,
        permissions: ["READ_MEMBERS", "READ_MEMBERS"],
      }),
    ).toThrow();
    expect(() =>
      rolePermissionUpdateSchema.parse({
        roleId: ROLE_ID,
        permissions: ["NOT_A_PERMISSION"],
      }),
    ).toThrow();
  });

  it("rejects raw bitstrings, malformed targets, and immutable Discord-ID changes", () => {
    expect(() =>
      rolePermissionUpdateSchema.parse({
        permissions: "101010",
        roleId: ROLE_ID,
      }),
    ).toThrow();
    expect(() =>
      rolePermissionUpdateSchema.parse({
        permissions: [],
        roleId: "not-a-uuid",
      }),
    ).toThrow();

    expect(() =>
      rolePermissionUpdateSchema.parse({
        discordRoleId: "999999999999999999",
        permissions: [],
        roleId: ROLE_ID,
      }),
    ).toThrow();
    expect(() =>
      roleCreateSchema.parse({
        color: "#ffffff",
        discordRoleId: "1151884200069320805",
        name: "Client-controlled name",
        permissions: [],
      }),
    ).toThrow();
  });

  it("parses URL state and enforces the exact assignment page sizes", () => {
    expect(roleManagementQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 25,
      roleQuery: "",
      roleTypes: [],
      userQuery: "",
      userRoleIds: [],
      view: "roles",
    });

    for (const pageSize of [25, 50, 100, 250, 500] as const) {
      expect(roleManagementQuerySchema.parse({ pageSize }).pageSize).toBe(
        pageSize,
      );
    }
    expect(() => roleManagementQuerySchema.parse({ pageSize: 10 })).toThrow();
    expect(() =>
      roleManagementQuerySchema.parse({ view: "unknown" }),
    ).toThrow();
  });

  it("deduplicates no batch inputs and caps the Cartesian product", () => {
    expect(
      roleBatchAssignmentSchema.parse({
        action: "grant",
        roleIds: [ROLE_ID],
        userIds: [USER_ID],
      }),
    ).toMatchObject({ action: "grant" });

    expect(() =>
      roleBatchAssignmentSchema.parse({
        action: "grant",
        roleIds: [ROLE_ID, ROLE_ID],
        userIds: [USER_ID],
      }),
    ).toThrow();

    const tooManyUsers = Array.from(
      { length: 101 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const roles = Array.from(
      { length: 10 },
      (_, index) =>
        `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(() =>
      roleBatchAssignmentSchema.parse({
        action: "revoke",
        roleIds: roles,
        userIds: tooManyUsers,
      }),
    ).toThrow();
  });

  it("requires the exact unlink phrase", () => {
    expect(ROLE_UNLINK_CONFIRMATION).toBe("I am absolutely sure");
    expect(
      roleUnlinkSchema.parse({
        confirmation: ROLE_UNLINK_CONFIRMATION,
        roleId: ROLE_ID,
      }),
    ).toMatchObject({ roleId: ROLE_ID });
    expect(() =>
      roleUnlinkSchema.parse({ roleId: ROLE_ID, confirmation: "sure" }),
    ).toThrow();
  });
});

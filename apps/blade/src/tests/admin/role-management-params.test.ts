import { describe, expect, it } from "vitest";

import {
  buildRoleManagementSearchParams,
  parseRoleManagementSearchParams,
} from "~/app/_components/admin/roles/params";

describe("role management URL state", () => {
  it("parses tabs, filters, pagination, and selected role", () => {
    expect(
      parseRoleManagementSearchParams({
        page: "2",
        pageSize: "100",
        permission: ["READ_MEMBERS", "EDIT_MEMBERS"],
        role: "00000000-0000-4000-8000-000000000001",
        roleQuery: "design",
        roleType: ["cosmetic", "missing"],
        userQuery: "alice",
        userRole: ["00000000-0000-4000-8000-000000000002"],
        view: "assignments",
      }),
    ).toMatchObject({
      page: 2,
      pageSize: 100,
      permissionKeys: ["READ_MEMBERS", "EDIT_MEMBERS"],
      role: "00000000-0000-4000-8000-000000000001",
      roleQuery: "design",
      roleTypes: ["cosmetic", "missing"],
      userQuery: "alice",
      userRoleIds: ["00000000-0000-4000-8000-000000000002"],
      view: "assignments",
    });
  });

  it("falls back safely for malformed values", () => {
    expect(
      parseRoleManagementSearchParams({
        page: "zero",
        pageSize: "10",
        permission: "NOPE",
        role: "not-a-uuid",
        roleType: "unknown",
        view: "unknown",
      }),
    ).toMatchObject({
      page: 1,
      pageSize: 25,
      permissionKeys: [],
      role: undefined,
      roleTypes: [],
      view: "roles",
    });
  });

  it("builds deterministic repeated parameters and omits defaults", () => {
    const input = parseRoleManagementSearchParams({
      permission: ["EDIT_MEMBERS", "READ_MEMBERS"],
      roleType: ["missing", "cosmetic"],
      userRole: [
        "00000000-0000-4000-8000-000000000003",
        "00000000-0000-4000-8000-000000000002",
      ],
      view: "assignments",
    });
    const params = buildRoleManagementSearchParams(input);

    expect(params.get("page")).toBeNull();
    expect(params.get("pageSize")).toBeNull();
    expect(params.getAll("permission")).toEqual([
      "EDIT_MEMBERS",
      "READ_MEMBERS",
    ]);
    expect(params.getAll("roleType")).toEqual(["cosmetic", "missing"]);
    expect(params.getAll("userRole")).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ]);
  });
});

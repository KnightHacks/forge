import { describe, expect, it } from "vitest";

import {
  buildAdminMemberSearchParams,
  parseAdminMemberSearchParams,
} from "~/app/_components/admin/members/params";

describe("admin member URL state", () => {
  it("parses repeated filters and a shareable member dialog", () => {
    const result = parseAdminMemberSearchParams({
      company: ["Knight Hacks", "NVIDIA"],
      dues: "unpaid",
      member: "00000000-0000-4000-8000-000000000001",
      page: "3",
      role: [
        "00000000-0000-4000-8000-000000000101",
        "00000000-0000-4000-8000-000000000102",
      ],
      school: "University of Central Florida",
    });

    expect(result.input).toMatchObject({
      companies: ["Knight Hacks", "NVIDIA"],
      duesStatuses: ["unpaid"],
      page: 3,
      roleIds: [
        "00000000-0000-4000-8000-000000000101",
        "00000000-0000-4000-8000-000000000102",
      ],
      schools: ["University of Central Florida"],
    });
    expect(result.selectedMemberId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("round-trips graduation status and alumni confirmation independently", () => {
    const parsed = parseAdminMemberSearchParams({
      alumni: "unconfirmed",
      gradStatus: "graduated",
    });

    expect(parsed.input.graduationStatuses).toEqual(["graduated"]);
    expect(parsed.input.alumniConfirmations).toEqual(["unconfirmed"]);

    const params = buildAdminMemberSearchParams(parsed.input);
    expect(params.getAll("gradStatus")).toEqual(["graduated"]);
    expect(params.getAll("alumni")).toEqual(["unconfirmed"]);

    const defaults = parseAdminMemberSearchParams({});
    expect(defaults.input.graduationStatuses).toEqual([]);
    expect(defaults.input.alumniConfirmations).toEqual([]);
  });

  it("falls back safely for invalid URL input", () => {
    const result = parseAdminMemberSearchParams({
      member: "not-a-uuid",
      pageSize: "13",
      school: "Unknown School",
    });

    expect(result.input.page).toBe(1);
    expect(result.input.pageSize).toBe(25);
    expect(result.input.schools).toEqual([]);
    expect(result.selectedMemberId).toBeNull();
  });

  it("round-trips role IDs as repeated filters", () => {
    const roleIds = [
      "00000000-0000-4000-8000-000000000101",
      "00000000-0000-4000-8000-000000000102",
    ];
    const parsed = parseAdminMemberSearchParams({ role: roleIds });

    expect(parsed.input.roleIds).toEqual(roleIds);
    expect(buildAdminMemberSearchParams(parsed.input).getAll("role")).toEqual(
      roleIds,
    );
  });

  it("serializes non-default filters without losing arrays", () => {
    const parsed = parseAdminMemberSearchParams({
      gender: ["Man", "Non-binary"],
      q: "lenny",
    });
    const params = buildAdminMemberSearchParams(
      parsed.input,
      "00000000-0000-4000-8000-000000000001",
    );

    expect(params.get("q")).toBe("lenny");
    expect(params.getAll("gender")).toEqual(["Man", "Non-binary"]);
    expect(params.get("member")).toBe("00000000-0000-4000-8000-000000000001");
  });
});

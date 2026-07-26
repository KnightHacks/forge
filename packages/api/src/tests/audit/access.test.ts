import { describe, expect, it } from "vitest";

import { assertCanReadAdminAudit } from "../../utils/audit/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

describe("admin audit access", () => {
  it("allows effective officers", () => {
    expect(() =>
      assertCanReadAdminAudit({
        ...createEmptyPermissionMap(),
        IS_OFFICER: true,
      }),
    ).not.toThrow();
  });

  it("rejects directors and other administrators without IS_OFFICER", () => {
    for (const permission of [
      "CONFIGURE_ROLES",
      "ASSIGN_ROLES",
      "EDIT_MEMBERS",
      "MANAGE_ALUMNI_DASHBOARD",
    ] as const) {
      expect(() =>
        assertCanReadAdminAudit({
          ...createEmptyPermissionMap(),
          [permission]: true,
        }),
      ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    }
  });
});

import { describe, expect, it } from "vitest";

import { assertCanReadDiscordArchiveHealth } from "../../utils/discord-archive/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

describe("Discord archive health access", () => {
  it("allows effective officers", () => {
    expect(() =>
      assertCanReadDiscordArchiveHealth({
        ...createEmptyPermissionMap(),
        IS_OFFICER: true,
      }),
    ).not.toThrow();
  });

  it("rejects directors and data readers without effective officer access", () => {
    for (const permission of [
      "READ_CLUB_DATA",
      "CONFIGURE_ROLES",
      "ASSIGN_ROLES",
      "EDIT_MEMBERS",
      "MANAGE_ALUMNI_DASHBOARD",
    ] as const) {
      expect(() =>
        assertCanReadDiscordArchiveHealth({
          ...createEmptyPermissionMap(),
          [permission]: true,
        }),
      ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    }
  });
});

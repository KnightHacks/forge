import { describe, expect, it } from "vitest";

import { assertCanReadDiscordArchiveHealth } from "../../utils/discord-archive/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

describe("Discord archive health access", () => {
  function actor(
    ...allowed: (keyof ReturnType<typeof createEmptyPermissionMap>)[]
  ) {
    const permissions = createEmptyPermissionMap();
    for (const permission of allowed) permissions[permission] = true;
    return { session: { permissions } };
  }

  it.each(["READ_DISCORD_ARCHIVE", "IS_OFFICER"] as const)(
    "allows %s",
    (permission) => {
      expect(() =>
        assertCanReadDiscordArchiveHealth(actor(permission)),
      ).not.toThrow();
    },
  );

  it("rejects unrelated administrative permissions", () => {
    for (const permission of [
      "READ_CLUB_DATA",
      "CONFIGURE_ROLES",
      "ASSIGN_ROLES",
      "EDIT_MEMBERS",
      "MANAGE_ALUMNI_DASHBOARD",
    ] as const) {
      expect(() =>
        assertCanReadDiscordArchiveHealth(actor(permission)),
      ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    }
  });
});

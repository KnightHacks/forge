import { describe, expect, it } from "vitest";

import { isSelectableProductRole } from "../../utils/roles/selectable";

describe("selectable product roles", () => {
  it("hides E2E fixtures from product selectors without hiding normal roles", () => {
    expect(
      isSelectableProductRole({
        discordRoleId: "forms-platform-officer-e2e",
        name: "Forms Platform Officer",
      }),
    ).toBe(false);
    expect(
      isSelectableProductRole({
        discordRoleId: "123456789",
        name: "Role Management E2E",
      }),
    ).toBe(false);
    expect(
      isSelectableProductRole({
        discordRoleId: "123456789",
        name: "Workshop",
      }),
    ).toBe(true);
  });
});

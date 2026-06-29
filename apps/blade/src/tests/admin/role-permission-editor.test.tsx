import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@forge/consts";

import { RolePermissionEditor } from "~/app/_components/admin/roles/role-permission-editor";

describe("RolePermissionEditor", () => {
  it("shows every permission once under domain headings", () => {
    const html = renderToStaticMarkup(
      createElement(RolePermissionEditor, {
        onChange: vi.fn(),
        selected: [],
      }),
    );

    for (const heading of [
      "Global",
      "Members",
      "Hackers",
      "Events",
      "Forms",
      "Roles",
      "Issues",
    ]) {
      expect(html).toContain(heading);
    }
    for (const permission of Object.values(PERMISSIONS.PERMISSION_DATA)) {
      expect(html.match(new RegExp(`>${permission.name}<`, "g"))).toHaveLength(
        1,
      );
    }
    expect(html).toContain("Cosmetic role");
  });

  it("warns when officer override is selected", () => {
    const html = renderToStaticMarkup(
      createElement(RolePermissionEditor, {
        onChange: vi.fn(),
        selected: ["IS_OFFICER"],
      }),
    );

    expect(html).toContain("Officer bypasses every normal permission gate");
  });
});

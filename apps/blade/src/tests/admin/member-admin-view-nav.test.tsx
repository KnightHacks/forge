import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemberAdminViewNav } from "../../app/_components/admin/members/member-admin-view-nav";

describe("Member admin view navigation", () => {
  it("offers equal People and Companies views", () => {
    const html = renderToStaticMarkup(
      createElement(MemberAdminViewNav, { active: "companies" }),
    );

    expect(html).toContain('href="/admin/members"');
    expect(html).toContain('href="/admin/members/companies"');
    expect(html).toContain(">People<");
    expect(html).toContain(">Companies<");
    expect(html).toContain('aria-current="page"');
  });
});

import { ShieldCheck } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ADMIN_PAGE_EYEBROWS,
  AdminPageHeader,
} from "~/app/_components/admin/admin-page";

describe("admin page chrome", () => {
  it("keeps every rendered admin page eyebrow unique", () => {
    const eyebrows = Object.values(ADMIN_PAGE_EYEBROWS);

    expect(new Set(eyebrows).size).toBe(eyebrows.length);
  });

  it("renders the eyebrow, title, and description it is given", () => {
    const html = renderToStaticMarkup(
      <AdminPageHeader
        description="Manage the workspace."
        eyebrow="Club operations"
        icon={ShieldCheck}
        title="Administration"
      />,
    );

    expect(html).toContain("Club operations");
    expect(html).toContain("Administration");
    expect(html).toContain("Manage the workspace.");
  });
});

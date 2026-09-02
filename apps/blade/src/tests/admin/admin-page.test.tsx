import { ShieldCheck } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminPageHeader,
  AdminPageHeaderSkeleton,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";

describe("admin page chrome", () => {
  it("keeps every rendered admin page eyebrow unique", () => {
    const eyebrows = Object.values(ADMIN_PAGE_EYEBROWS);

    expect(new Set(eyebrows).size).toBe(eyebrows.length);
  });

  it("renders a compact title with an accessible description control", () => {
    const html = renderToStaticMarkup(
      <AdminPageHeader
        description="Manage the workspace."
        eyebrow="Club operations"
        icon={ShieldCheck}
        title="Administration"
      />,
    );

    expect(html).not.toContain("Club operations");
    expect(html).toContain("Administration");
    expect(html).toContain("Manage the workspace.");
    expect(html).toContain('aria-label="About this page"');
    expect(html).toContain("aria-describedby=");
    expect(html).toContain('class="sr-only"');
  });

  it("keeps only the title row in the compact header skeleton", () => {
    const html = renderToStaticMarkup(<AdminPageHeaderSkeleton />);

    // The layout wrapper contains one title row with one placeholder.
    expect(html.match(/<div/g)?.length).toBe(3);
  });
});

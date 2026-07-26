import { ShieldCheck } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  adminPageClassName,
  AdminPageHeader,
  AdminPageHeaderSkeleton,
} from "~/app/_components/admin/admin-page";

describe("admin page chrome", () => {
  it("keeps the Companies and Members shell contract centralized", () => {
    expect(adminPageClassName).toContain("container min-w-0 px-3");
    expect(adminPageClassName).toContain("sm:px-8");
    expect(adminPageClassName).toContain("md:pt-10");
  });

  it("renders a normal-case icon eyebrow and responsive title", () => {
    const html = renderToStaticMarkup(
      <AdminPageHeader
        description="Manage the workspace."
        eyebrow="Club operations"
        icon={ShieldCheck}
        title="Administration"
      />,
    );

    expect(html).toContain("text-sm font-medium text-primary");
    expect(html).not.toContain("uppercase");
    expect(html).toContain("text-2xl");
    expect(html).toContain("sm:text-3xl");
    expect(html).toContain("md:text-4xl");
    expect(html).toContain("Club operations");
  });

  it("keeps loading headers structurally aligned with loaded headers", () => {
    const html = renderToStaticMarkup(<AdminPageHeaderSkeleton actions={2} />);

    expect(html).toContain("lg:flex-row");
    expect(html.match(/h-11 w-32/g)).toHaveLength(2);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminCheckInLoading from "~/app/admin/check-in/loading";

describe("Event check-in loading state", () => {
  it("preserves the Blade card and control geometry while content loads", () => {
    const html = renderToStaticMarkup(createElement(AdminCheckInLoading));

    expect(html).toContain('data-testid="event-check-in-loading"');
    expect(html).toContain('aria-label="Loading event check-in"');
    expect(html).toContain("bg-card/95");
    expect(html).toContain("bg-background/60");
    expect(html).toContain("border-border/60");
    expect(html).not.toContain("h-[32rem]");
  });
});

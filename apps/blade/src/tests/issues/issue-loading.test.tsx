import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IssueWorkspaceSkeleton } from "~/app/_components/admin/issues/issue-workspace-skeleton";

describe("Issue workspace loading states", () => {
  it.each(["calendar", "kanban", "list"] as const)(
    "renders a view-shaped %s skeleton",
    (view) => {
      const html = renderToStaticMarkup(
        createElement(IssueWorkspaceSkeleton, { view }),
      );

      expect(html).toContain(`data-issue-loading-view="${view}"`);
      expect(html).toContain(`aria-label="Loading issue ${view}"`);
      expect(html).not.toContain("Loading issues…");
    },
  );
});

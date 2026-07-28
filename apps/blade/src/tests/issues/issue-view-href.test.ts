import { describe, expect, it } from "vitest";

import {
  issueSearchHref,
  issueViewHref,
} from "~/app/_components/admin/issues/issue-view-href";
import { parseIssueSearchParams } from "~/app/_components/admin/issues/params";

const clean = parseIssueSearchParams({});

describe("Issue view links", () => {
  it("drops the question mark when nothing is filtered", () => {
    expect(issueViewHref("kanban", clean)).toBe("/admin/issues/kanban");
  });

  it("carries the current filters between views", () => {
    const href = issueViewHref("list", {
      ...clean,
      search: "kickoff",
      statuses: ["Planning"],
    });

    expect(href.startsWith("/admin/issues/list?")).toBe(true);
    expect(href).toContain("q=kickoff");
    expect(href).toContain("status=Planning");
  });

  it("links the archive the same way as any other view", () => {
    expect(issueViewHref("archive", clean)).toBe("/admin/issues/archive");
    expect(issueViewHref("archive", { ...clean, search: "kickoff" })).toBe(
      "/admin/issues/archive?q=kickoff",
    );
  });

  it("keeps a non-default calendar position and mode", () => {
    const href = issueViewHref("calendar", {
      ...clean,
      calendarDate: "2026-07-15",
      calendarMode: "week",
    });

    expect(href).toContain("mode=week");
    expect(href).toContain("date=2026-07-15");
  });
});

describe("Issue same-page links", () => {
  it("keeps a bare question mark so an empty query clears the URL", () => {
    expect(issueSearchHref(clean)).toBe("?");
  });

  it("rewrites only the query string", () => {
    expect(issueSearchHref({ ...clean, page: 3 })).toBe("?page=3");
  });
});

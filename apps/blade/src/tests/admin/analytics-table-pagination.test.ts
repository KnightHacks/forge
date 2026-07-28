import { describe, expect, it } from "vitest";

import { resolveTablePage } from "~/app/_components/admin/analytics/analytics-table-pagination";

describe("resolveTablePage", () => {
  it("reports one empty page when there are no rows", () => {
    expect(resolveTablePage({ page: 0, pageSize: 10, rowCount: 0 })).toEqual({
      currentPage: 0,
      end: 0,
      pageCount: 1,
      start: 0,
    });
  });

  it("ends a partial final page at the row count, not at the page size", () => {
    // The dashboard renders "Showing {start + 1}–{end} of {rowCount}", so an
    // unclamped end would claim rows 11–20 of 11.
    expect(resolveTablePage({ page: 1, pageSize: 10, rowCount: 11 })).toEqual({
      currentPage: 1,
      end: 11,
      pageCount: 2,
      start: 10,
    });
  });

  it("fills the final page exactly when the row count divides evenly", () => {
    expect(resolveTablePage({ page: 1, pageSize: 10, rowCount: 20 })).toEqual({
      currentPage: 1,
      end: 20,
      pageCount: 2,
      start: 10,
    });
  });

  it("clamps a page that a shrinking row set left out of range", () => {
    // Changing an analytics filter can drop the row set under the page the
    // reader is already on. Clamping shows the last page instead of an empty
    // table, without writing corrected state back during render.
    expect(resolveTablePage({ page: 9, pageSize: 10, rowCount: 11 })).toEqual({
      currentPage: 1,
      end: 11,
      pageCount: 2,
      start: 10,
    });
  });

  it("keeps a single page when the page size exceeds the row count", () => {
    expect(resolveTablePage({ page: 3, pageSize: 50, rowCount: 11 })).toEqual({
      currentPage: 0,
      end: 11,
      pageCount: 1,
      start: 0,
    });
  });
});

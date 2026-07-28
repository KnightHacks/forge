/**
 * Resolves the visible slice of an analytics table.
 *
 * `page` is clamped rather than corrected in state: a filter change can shrink
 * the row set under a page the reader is already on, and clamping keeps the
 * last page visible instead of rendering an empty table. `end` is clamped to
 * the row count so the "Showing 1–10 of 11" label never overstates the slice.
 */
export function resolveTablePage({
  page,
  pageSize,
  rowCount,
}: {
  page: number;
  pageSize: number;
  rowCount: number;
}) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, rowCount);
  return { currentPage, end, pageCount, start };
}

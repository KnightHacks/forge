import type { IssueWorkspaceView } from "./issue-workspace";
import type { IssueSearchInput } from "./params";
import { buildIssueSearchParams } from "./params";

/**
 * A link to another issue view that carries the current filters, sort, and
 * calendar position with it. An empty query drops the `?` entirely so the
 * canonical view URL has no trailing punctuation.
 */
export function issueViewHref(
  view: IssueWorkspaceView,
  input: IssueSearchInput,
) {
  const query = buildIssueSearchParams(input).toString();
  return `/admin/issues/${view}${query ? `?${query}` : ""}`;
}

/**
 * A same-page link that only rewrites the query string. Unlike
 * {@link issueViewHref} the `?` is always present, because a bare `?` is what
 * clears every filter from the current URL.
 */
export function issueSearchHref(input: IssueSearchInput) {
  return `?${buildIssueSearchParams(input).toString()}`;
}

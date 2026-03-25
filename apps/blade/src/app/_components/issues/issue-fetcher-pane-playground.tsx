"use client";

import { useState } from "react";

import type {
  IssueFetcherPaneData,
  IssueFetcherPaneIssue,
} from "~/app/_components/issues/issue-fetcher-pane";
import { IssueFetcherPane } from "~/app/_components/issues/issue-fetcher-pane";

export function IssueFetcherPanePlayground() {
  const [issues, setIssues] = useState<IssueFetcherPaneIssue[]>([]);
  const [fetcherData, setFetcherData] = useState<IssueFetcherPaneData | null>(
    null,
  );
  const isReady = fetcherData !== null;

  return (
    <div className="space-y-6">
      <IssueFetcherPane setIssues={setIssues} onDataChange={setFetcherData} />

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Playground View</h3>
          {isReady && (
            <span className="text-sm text-muted-foreground">
              Showing {issues.length} issue(s)
            </span>
          )}
        </div>

        {!isReady ? (
          <p className="text-sm text-muted-foreground">
            Waiting for fetcher state...
          </p>
        ) : fetcherData.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading issues...</p>
        ) : fetcherData.error ? (
          <p className="text-sm text-destructive">{fetcherData.error}</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No issues match the current filters.
          </p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <article key={issue.id} className="rounded-md border p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">{issue.name}</h4>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {issue.status}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {issue.priority}
                  </span>
                  {issue.event && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      EVENT-LINKED
                    </span>
                  )}
                  {fetcherData.blockedParentIds.has(issue.id) && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      BLOCKED
                    </span>
                  )}
                </div>

                <p className="mb-2 text-sm text-muted-foreground">
                  {issue.description}
                </p>

                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <strong>Team:</strong>{" "}
                    {fetcherData.roleNameById.get(issue.team) ?? issue.team}
                  </p>
                  <p>
                    <strong>Due:</strong>{" "}
                    {issue.date ? new Date(issue.date).toLocaleString() : "N/A"}
                  </p>
                  <p>
                    <strong>Subtask:</strong> {issue.parent ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Visible To:</strong> {issue.teamVisibility.length}{" "}
                    role(s)
                  </p>
                  <p>
                    <strong>Assignees:</strong> {issue.userAssignments.length}
                  </p>
                  <p>
                    <strong>ID:</strong> {issue.id}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

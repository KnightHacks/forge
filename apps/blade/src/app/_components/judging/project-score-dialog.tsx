"use client";

import { useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Skeleton } from "@forge/ui/skeleton";

import { api } from "~/trpc/react";

type Workspace = RouterOutputs["judging"]["getWorkspace"];

export function ProjectScoreDialog({
  challengeLabel,
  onOpenChange,
  open,
  project,
  workspace,
}: {
  challengeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: { id: string; title: string } | null;
  workspace: Workspace;
}) {
  const [feedbackPage, setFeedbackPage] = useState(1);
  const details = api.judging.getProjectJudgingDetails.useQuery(
    {
      challengeId: workspace.challengeId,
      feedbackPage,
      hackathonId: workspace.hackathonId,
      projectId: project?.id ?? "00000000-0000-4000-8000-000000000000",
    },
    { enabled: open && project !== null },
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project?.title ?? "Project rating"}</DialogTitle>
          <DialogDescription>
            {challengeLabel} rating and judge feedback.
          </DialogDescription>
        </DialogHeader>

        {details.isLoading ? (
          <div className="space-y-3" aria-label="Loading rating details">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : details.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {details.error.message}
          </p>
        ) : details.data?.value === null ? (
          <p className="rounded-md border border-dashed border-white/15 p-5 text-sm text-muted-foreground">
            This rating is not available yet.
          </p>
        ) : (
          <div className="space-y-5">
            <section className="flex items-center justify-between rounded-lg border border-white/10 bg-background/60 p-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Average rating
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {details.data?.count ?? 0} evaluation
                  {(details.data?.count ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <span className="font-mono text-3xl font-semibold">
                {details.data?.value?.toFixed(2)}
              </span>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Judge feedback</h3>
                <Badge variant="outline">
                  {details.data?.feedbackTotal ?? 0} response
                  {(details.data?.feedbackTotal ?? 0) === 1 ? "" : "s"}
                </Badge>
              </div>
              {details.data?.feedback.length ? (
                <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-white/10 bg-background/60">
                  {details.data.feedback.map((response, index) => (
                    <article
                      className="space-y-2 p-4"
                      key={`${response.judgeDisplayName}-${response.label}-${index}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold">
                          {response.label}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {response.isPublic
                              ? "Shared with hackers"
                              : "Not shared with hackers"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {response.judgeDisplayName}
                          </span>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {response.value || "No response"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-white/15 p-5 text-sm text-muted-foreground">
                  No feedback has been submitted for this challenge.
                </p>
              )}
              {(details.data?.feedbackTotal ?? 0) >
              (details.data?.feedbackPageSize ?? 25) ? (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    className="h-11"
                    disabled={feedbackPage === 1 || details.isFetching}
                    onClick={() => setFeedbackPage((page) => page - 1)}
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {feedbackPage} of{" "}
                    {Math.ceil(
                      (details.data?.feedbackTotal ?? 0) /
                        (details.data?.feedbackPageSize ?? 25),
                    )}
                  </span>
                  <Button
                    className="h-11"
                    disabled={
                      feedbackPage * (details.data?.feedbackPageSize ?? 25) >=
                        (details.data?.feedbackTotal ?? 0) || details.isFetching
                    }
                    onClick={() => setFeedbackPage((page) => page + 1)}
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

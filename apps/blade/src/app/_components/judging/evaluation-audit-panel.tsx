"use client";

import { useState } from "react";
import { History } from "lucide-react";

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

type Evaluation = RouterOutputs["judging"]["listEvaluationAudit"][number];

function formatTimestamp(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(value);
}

export function EvaluationAuditPanel({
  evaluations,
  timeZone,
}: {
  evaluations: Evaluation[];
  timeZone: string;
}) {
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const revisions = api.judging.getEvaluationRevisions.useQuery(
    { evaluationId: evaluationId ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: evaluationId !== null },
  );
  const labels = new Map(
    revisions.data?.rubric.map((item) => [item.id, item.label]),
  );

  if (evaluations.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-card/70 px-5 py-14 text-center">
        <History
          aria-hidden="true"
          className="mx-auto size-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-semibold">No evaluations yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Saved evaluations and their revision history will appear here for
          judging support and dispute review.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/90">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <h2 className="font-semibold">Evaluation history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect every saved revision. This view is limited to officers.
          </p>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium">Judge</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Revision</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id}>
                  <td className="px-4 py-3 font-medium">
                    {evaluation.projectTitle}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {evaluation.challengeLabel}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {evaluation.judgeDisplayName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatTimestamp(evaluation.updatedAt, timeZone)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {evaluation.revision}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      className="h-11 md:h-9"
                      onClick={() => setEvaluationId(evaluation.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      View history
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border/60 md:hidden">
          {evaluations.map((evaluation) => (
            <article className="space-y-3 p-4" key={evaluation.id}>
              <div>
                <h3 className="font-semibold">{evaluation.projectTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {evaluation.challengeLabel} · {evaluation.judgeDisplayName}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {formatTimestamp(evaluation.updatedAt, timeZone)}
                </span>
                <Badge variant="outline">Revision {evaluation.revision}</Badge>
              </div>
              <Button
                className="h-11 w-full"
                onClick={() => setEvaluationId(evaluation.id)}
                type="button"
                variant="outline"
              >
                View history
              </Button>
            </article>
          ))}
        </div>
      </section>

      <Dialog
        onOpenChange={(open) => !open && setEvaluationId(null)}
        open={evaluationId !== null}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {revisions.data?.evaluation.projectTitle ?? "Evaluation history"}
            </DialogTitle>
            <DialogDescription>
              {revisions.data
                ? `${revisions.data.evaluation.challengeLabel} · ${revisions.data.evaluation.judgeDisplayName}`
                : "Loading saved revisions."}
            </DialogDescription>
          </DialogHeader>
          {revisions.isLoading ? (
            <div aria-label="Loading evaluation history" className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : revisions.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {revisions.error.message}
            </p>
          ) : (
            <div className="space-y-4">
              {revisions.data?.revisions.map((revision) => (
                <article
                  className="space-y-4 rounded-lg border border-white/10 bg-background/60 p-4"
                  key={revision.revision}
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>Revision {revision.revision}</Badge>
                      <Badge variant="outline">
                        {revision.actorKind === "guest"
                          ? "Guest judge"
                          : "Blade member"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(revision.createdAt, timeZone)}
                    </span>
                  </header>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {revision.ratingAnswers.map((answer) => (
                      <div
                        className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                        key={answer.itemId}
                      >
                        <dt className="text-sm text-muted-foreground">
                          {labels.get(answer.itemId) ?? "Rating"}
                        </dt>
                        <dd className="font-mono font-semibold">
                          {answer.value}/5
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {revision.responseAnswers.length ? (
                    <div className="space-y-3">
                      {revision.responseAnswers.map((answer) => (
                        <div className="space-y-1" key={answer.itemId}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold">
                              {labels.get(answer.itemId) ?? "Feedback"}
                            </h4>
                            <Badge variant="outline">
                              {answer.isPublic
                                ? "Shared with hackers"
                                : "Not shared with hackers"}
                            </Badge>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {answer.value || "No response"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { ClipboardCheck, Eye, Pencil } from "lucide-react";

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

import { formatClubDateTime } from "~/lib/dates";
import { EvaluationDialog } from "./evaluation-dialog";

type Workspace = RouterOutputs["judging"]["getWorkspace"];
type Submission = RouterOutputs["judging"]["listMySubmissions"][number];

export function JudgeSubmissions({
  submissions,
  workspace,
}: {
  submissions: Submission[];
  workspace: Workspace;
}) {
  const [feedback, setFeedback] = useState<Submission | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);

  if (submissions.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-card/70 px-5 py-14 text-center">
        <ClipboardCheck
          className="mx-auto size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-lg font-semibold">No submissions yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Scores you submit from Projects appear here. You can return to edit
          them while judging is open.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead className="border-b border-border/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 text-right font-medium">Your score</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{submission.projectTitle}</p>
                    {!submission.projectAvailable ? (
                      <Badge className="mt-2" variant="outline">
                        Project unavailable
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {submission.challengeLabel}
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-semibold">
                    {submission.score?.toFixed(2) ?? "(?)"}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatClubDateTime(submission.updatedAt)}
                    {submission.revision > 1 ? (
                      <span className="block text-xs">
                        Revision {submission.revision}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setFeedback(submission)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="mr-2 size-4" aria-hidden="true" />
                        Feedback
                      </Button>
                      <Button
                        disabled={
                          workspace.state !== "open" ||
                          !submission.projectAvailable
                        }
                        onClick={() => setEditing(submission)}
                        size="sm"
                      >
                        <Pencil className="mr-2 size-4" aria-hidden="true" />
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border/60 md:hidden">
          {submissions.map((submission) => (
            <article className="space-y-4 p-4" key={submission.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{submission.projectTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {submission.challengeLabel}
                  </p>
                </div>
                <span className="font-mono text-lg font-semibold">
                  {submission.score?.toFixed(2) ?? "(?)"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Updated {formatClubDateTime(submission.updatedAt)} · Revision{" "}
                {submission.revision}
              </p>
              {!submission.projectAvailable ? (
                <Badge variant="outline">Project unavailable</Badge>
              ) : null}
              <div className="flex gap-2">
                <Button
                  className="min-h-11"
                  onClick={() => setFeedback(submission)}
                  size="sm"
                  variant="outline"
                >
                  View feedback
                </Button>
                <Button
                  className="min-h-11"
                  disabled={
                    workspace.state !== "open" || !submission.projectAvailable
                  }
                  onClick={() => setEditing(submission)}
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Dialog
        onOpenChange={(open) => !open && setFeedback(null)}
        open={!!feedback}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{feedback?.projectTitle}</DialogTitle>
            <DialogDescription>
              Your saved rubric answers for {feedback?.challengeLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {feedback?.ratings.map((answer) => (
              <div
                className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-background/60 p-3"
                key={answer.itemId}
              >
                <span className="text-sm font-medium">{answer.label}</span>
                <span className="font-mono text-lg font-semibold">
                  {answer.value}/5
                </span>
              </div>
            ))}
            {feedback?.responses.map((answer) => (
              <div className="space-y-2" key={answer.itemId}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{answer.label}</h3>
                  <Badge variant="outline">
                    {answer.isPublic
                      ? "Shared with hackers"
                      : "Not shared with hackers"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap rounded-md border border-white/10 bg-background/60 p-3 text-sm leading-6">
                  {answer.value || "No response"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {editing ? (
        <EvaluationDialog
          challengeLabel={editing.challengeLabel}
          key={editing.id}
          onOpenChange={(open) => !open && setEditing(null)}
          open
          project={{
            id: editing.projectId,
            title: editing.projectTitle,
          }}
          submission={editing}
          workspace={{
            ...workspace,
            challengeId: editing.challengeId,
          }}
        />
      ) : null}
    </>
  );
}

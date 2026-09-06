"use client";

import { useMemo, useState } from "react";
import { Eye, LockKeyhole, Save } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Alert, AlertDescription, AlertTitle } from "@forge/ui/alert";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { RadioGroup, RadioGroupItem } from "@forge/ui/radio-group";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type Workspace = RouterOutputs["judging"]["getWorkspace"];
type Submission = RouterOutputs["judging"]["listMySubmissions"][number];

export interface EvaluationProject {
  id: string;
  title: string;
}

function policyCopy(
  policy: "private" | "public" | "public_optional" | null,
  shared: boolean,
) {
  if (policy === "public") {
    return {
      description:
        "This response is marked for sharing with the hackers who submitted this project.",
      label: "Shared with hackers",
    };
  }
  if (policy === "public_optional") {
    return shared
      ? {
          description:
            "This response is marked for sharing with the hackers who submitted this project.",
          label: "Shared with hackers",
        }
      : {
          description:
            "This response is excluded from hacker feedback delivery.",
          label: "Not shared with hackers",
        };
  }
  return {
    description: "This response is excluded from hacker feedback delivery.",
    label: "Not shared with hackers",
  };
}

export function EvaluationDialog({
  challengeLabel,
  onOpenChange,
  open,
  project,
  submission,
  workspace,
}: {
  challengeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: EvaluationProject;
  submission?: Submission;
  workspace: Workspace;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (submission?.ratings ?? []).map((answer) => [
        answer.itemId,
        answer.value,
      ]),
    ),
  );
  const [responses, setResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (submission?.responses ?? []).map((answer) => [
        answer.itemId,
        answer.value,
      ]),
    ),
  );
  const [shared, setShared] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (submission?.responses ?? []).map((answer) => [
        answer.itemId,
        answer.isPublic,
      ]),
    ),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const save = api.judging.saveEvaluation.useMutation();
  const ratingItems = useMemo(
    () => workspace.rubric.filter((item) => item.kind === "rating"),
    [workspace.rubric],
  );
  const responseItems = useMemo(
    () => workspace.rubric.filter((item) => item.kind === "short_response"),
    [workspace.rubric],
  );
  const challengeName = /challenge$/i.test(challengeLabel)
    ? challengeLabel
    : `${challengeLabel} Challenge`;

  const activeProject = project;

  async function submit() {
    const missingRating = ratingItems.some((item) => !ratings[item.id]);
    const missingResponse = responseItems.some(
      (item) => item.required && !responses[item.id]?.trim(),
    );
    if (missingRating || missingResponse) {
      const message = "Complete every required rubric item before saving.";
      setSaveError(message);
      toast.error(message);
      return;
    }
    setSaveError(null);
    try {
      await save.mutateAsync({
        challengeId: workspace.challengeId,
        hackathonId: workspace.hackathonId,
        projectId: activeProject.id,
        ratings: ratingItems.map((item) => ({
          itemId: item.id,
          value: ratings[item.id] ?? 1,
        })),
        responses: responseItems
          .filter((item) => item.required || responses[item.id]?.trim())
          .map((item) => ({
            isPublic:
              (workspace.principalKind === "guest"
                ? item.guestVisibilityPolicy
                : item.memberVisibilityPolicy) === "public_optional"
                ? shared[item.id] === true
                : undefined,
            itemId: item.id,
            value: responses[item.id]?.trim() ?? "",
          })),
      });
      toast.success(submission ? "Submission updated." : "Score submitted.");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save your score.";
      setSaveError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/70 p-5 pr-12 text-left sm:p-6">
          <DialogTitle>
            {submission ? "Edit" : "Judge"} {project.title}
          </DialogTitle>
          <DialogDescription className="mt-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 font-medium text-primary">
            Judging for the {challengeName}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {workspace.state !== "open" ? (
            <Alert>
              <LockKeyhole className="size-4" />
              <AlertTitle>Judging is {workspace.state}</AlertTitle>
              <AlertDescription>
                {workspace.state === "closed"
                  ? "Saved submissions are read-only until an officer reopens judging."
                  : "An officer must open judging before scores can be submitted."}
              </AlertDescription>
            </Alert>
          ) : null}

          {responseItems.length ? (
            <Alert className="border-primary/30 bg-primary/10">
              <Eye className="size-4 text-primary" />
              <AlertTitle className="text-primary">
                {workspace.principalKind === "guest"
                  ? "Choose what will be shared with hackers"
                  : "Your feedback is shared with hackers"}
              </AlertTitle>
              <AlertDescription>
                {workspace.principalKind === "guest"
                  ? "Each written response below shows whether it is marked for sharing with this project's hackers. Authenticated judges and officers can review every response."
                  : "Every written response you submit is marked for sharing with this project's hackers. Other authenticated judges and officers can also review it."}
              </AlertDescription>
            </Alert>
          ) : null}

          {ratingItems.map((item) => (
            <fieldset className="space-y-3" key={item.id}>
              <legend className="text-sm font-semibold">
                {item.label} <span className="text-destructive">*</span>
              </legend>
              {item.description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
              <RadioGroup
                aria-label={item.label}
                className="grid grid-cols-5 gap-2"
                onValueChange={(value) =>
                  setRatings((current) => ({
                    ...current,
                    [item.id]: Number(value),
                  }))
                }
                value={ratings[item.id]?.toString() ?? ""}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <Label
                    className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background/60 font-mono hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
                    htmlFor={`${item.id}-${value}`}
                    key={value}
                  >
                    <RadioGroupItem
                      className="sr-only"
                      id={`${item.id}-${value}`}
                      value={value.toString()}
                    />
                    {value}
                  </Label>
                ))}
              </RadioGroup>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Needs work</span>
                <span>Exceptional</span>
              </div>
            </fieldset>
          ))}

          {responseItems.map((item) => {
            const policy =
              workspace.principalKind === "guest"
                ? item.guestVisibilityPolicy
                : item.memberVisibilityPolicy;
            const visibility = policyCopy(policy, shared[item.id] === true);
            return (
              <div className="space-y-2" key={item.id}>
                <Label htmlFor={item.id}>
                  {item.label}
                  {item.required ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </Label>
                {item.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                <Textarea
                  className="min-h-28 resize-y"
                  id={item.id}
                  maxLength={2000}
                  onChange={(event) =>
                    setResponses((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="Write useful feedback for the project team"
                  value={responses[item.id] ?? ""}
                />
                <div className="flex items-start gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-sm text-muted-foreground">
                  {policy === "public" ||
                  (policy === "public_optional" && shared[item.id] === true) ? (
                    <Eye
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <LockKeyhole
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {visibility.label}
                      </p>
                      <p className="mt-1">{visibility.description}</p>
                    </div>
                    {policy === "public_optional" ? (
                      <Label className="flex min-h-11 cursor-pointer items-center gap-2 text-foreground">
                        <Checkbox
                          checked={shared[item.id] === true}
                          onCheckedChange={(checked) =>
                            setShared((current) => ({
                              ...current,
                              [item.id]: checked === true,
                            }))
                          }
                        />
                        Share this response with this project's hackers
                      </Label>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="shrink-0 border-t border-border/70 bg-card/95 p-4 sm:p-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-5 text-muted-foreground">
              <p>
                {workspace.principalKind === "guest"
                  ? "Judges and officers can review every response. Hacker sharing follows the setting shown under each field."
                  : "Your written responses are marked for sharing with this project's hackers."}
              </p>
              {saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
            </div>
            <Button
              className="shrink-0"
              disabled={workspace.state !== "open" || save.isPending}
              onClick={() => void submit()}
              type="button"
            >
              <Save className="mr-2 size-4" aria-hidden="true" />
              {save.isPending
                ? "Saving..."
                : submission
                  ? "Update submission"
                  : "Submit score"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

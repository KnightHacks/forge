"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useEvaluationAutosave } from "~/lib/judging/use-evaluation-autosave";
import { useJudgingClock } from "~/lib/judging/use-judging-clock";
import { api } from "~/trpc/react";

type Workspace = RouterOutputs["judging"]["getWorkspace"];
type Submission = RouterOutputs["judging"]["listMySubmissions"][number];

export interface EvaluationProject {
  id: string;
  title: string;
  prizeCategories?: string[];
  challenges?: {
    id: string;
    label: string;
    parentId: string | null;
  }[];
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

interface EvaluationDialogProps {
  challengeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: EvaluationProject;
  submission?: Submission;
  workspace: Workspace;
}

export function EvaluationDialog(props: EvaluationDialogProps) {
  return props.open ? <EvaluationSession {...props} /> : null;
}

function EvaluationSession(props: EvaluationDialogProps) {
  const [ready, setReady] = useState(false);
  const editor = api.judging.getEvaluationEditor.useQuery(
    {
      challengeId: props.workspace.challengeId,
      hackathonId: props.workspace.hackathonId,
      projectId: props.project.id,
    },
    {
      enabled: props.open,
      refetchInterval: props.open ? 5000 : false,
      refetchOnMount: "always",
      staleTime: 0,
    },
  );
  // Seed answers once from a fresh successful response; later heartbeats must
  // not remount the editor or replace what the judge is currently typing.
  if (!ready && editor.isFetchedAfterMount && editor.isSuccess) setReady(true);
  if (
    !ready ||
    !editor.data ||
    (!editor.data.canEdit && !editor.data.evaluationId)
  )
    return (
      <Dialog open onOpenChange={props.onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{props.project.title}</DialogTitle>
            <DialogDescription>
              {editor.error?.message ??
                editor.data?.reason ??
                "Checking your room and appointment..."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  return (
    <EvaluationEditor
      {...props}
      editor={editor.data}
      key={`${props.project.id}:${props.workspace.challengeId}`}
    />
  );
}

function EvaluationEditor({
  challengeLabel,
  onOpenChange,
  open,
  project,
  submission,
  workspace,
  editor,
}: {
  challengeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: EvaluationProject;
  submission?: Submission;
  workspace: Workspace;
  editor: RouterOutputs["judging"]["getEvaluationEditor"];
}) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (editor.draft?.ratings ?? submission?.ratings ?? []).map((answer) => [
        answer.itemId,
        answer.value,
      ]),
    ),
  );
  const [responses, setResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (editor.draft?.responses ?? submission?.responses ?? []).map((answer) => [
        answer.itemId,
        answer.value,
      ]),
    ),
  );
  const [shared, setShared] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      (editor.draft?.responses ?? submission?.responses ?? []).map((answer) => [
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
  const challengeName = /challenges?$/i.test(challengeLabel)
    ? challengeLabel
    : `${challengeLabel} Challenge`;

  const activeProject = project;
  const now = useJudgingClock(editor.serverNow);
  const [deadline] = useState(editor.deadlineAt);
  const expiryHandled = useRef(false);
  const seconds = deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000))
    : null;
  const expired = deadline !== null && seconds === 0;
  const gapEnded = !deadline && editor.lockAt !== null && now >= editor.lockAt;
  const editable =
    editor.canEdit && workspace.state === "open" && !expired && !gapEnded;
  const answers = useMemo(
    () => ({
      challengeId: workspace.challengeId,
      hackathonId: workspace.hackathonId,
      projectId: project.id,
      expectedRevision: submission?.revision ?? editor.evaluationRevision,
      ratings: Object.entries(ratings).map(([itemId, value]) => ({
        itemId,
        value,
      })),
      responses: responseItems.map((item) => ({
        itemId: item.id,
        value: responses[item.id] ?? "",
        isPublic: shared[item.id] === true,
      })),
    }),
    [
      editor.evaluationRevision,
      project.id,
      ratings,
      responseItems,
      responses,
      shared,
      submission?.revision,
      workspace.challengeId,
      workspace.hackathonId,
    ],
  );
  const autosave = useEvaluationAutosave(answers, editor, editable);
  const utils = api.useUtils();
  useEffect(() => {
    if ((!expired && !gapEnded) || expiryHandled.current) return;
    expiryHandled.current = true;
    void utils.judging.getEvaluationEditor
      .invalidate()
      .then(() => utils.judging.listMySubmissions.invalidate())
      .catch(() => undefined);
    router.refresh();
    if (gapEnded) {
      toast.message(
        "Your room's next booking has started. Finish this submission during downtime.",
      );
      onOpenChange(false);
    }
  }, [expired, gapEnded, onOpenChange, router, utils]);
  async function close(nextOpen: boolean) {
    if (!nextOpen && editable) {
      try {
        await autosave.flush();
      } catch {
        return;
      }
    }
    onOpenChange(nextOpen);
  }

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
      await autosave.flush();
      await save.mutateAsync({
        expectedRevision: submission?.revision ?? editor.evaluationRevision,
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
    <Dialog onOpenChange={(value) => void close(value)} open={open}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 [&>button]:right-2 [&>button]:top-2 [&>button]:z-10 [&>button]:size-11">
        <DialogHeader className="shrink-0 border-b border-border/70 p-4 pr-14 text-left sm:p-6 sm:pr-14">
          <DialogTitle className="break-words text-base leading-6 sm:text-lg">
            {submission ? "Edit" : "Judge"} {project.title}
          </DialogTitle>
          <DialogDescription className="mt-2 break-words rounded-md border border-primary/25 bg-primary/10 px-3 py-2 font-medium text-primary">
            {challengeName}
          </DialogDescription>
          {project.challenges?.some(
            (challenge) => challenge.parentId === workspace.challengeId,
          ) ? (
            <div
              className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto"
              role="group"
              aria-label="Challenge opt-ins"
            >
              {project.challenges
                .filter(
                  (challenge) => challenge.parentId === workspace.challengeId,
                )
                .map((challenge) => (
                  <span
                    key={challenge.id}
                    className="max-w-full break-words rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary"
                  >
                    {challenge.label}
                  </span>
                ))}
            </div>
          ) : null}
          {seconds !== null ? (
            <div
              role="timer"
              aria-label="Judging time remaining"
              className={`mt-3 rounded-md border px-3 py-2 font-mono text-xl font-semibold sm:text-2xl ${seconds < 90 ? "border-red-400/50 bg-red-400/10 text-red-200 motion-safe:animate-pulse" : seconds < 180 ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-white/15 bg-background/60"}`}
            >
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              <span className="ml-3 font-sans text-sm font-normal">
                until teardown
              </span>
            </div>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:space-y-6 sm:p-6">
          {expired ? (
            <Alert>
              <AlertTitle>
                {editor.evaluationId
                  ? editor.isComplete
                    ? "Automatically submitted"
                    : "Saved incomplete"
                  : "Judging time has ended"}
              </AlertTitle>
              <AlertDescription>
                {editor.evaluationId
                  ? "Return to the Submissions tab during room downtime to review or finish your answers."
                  : "Checking the last saved answers. Keep this window open until the submission state is confirmed."}
              </AlertDescription>
            </Alert>
          ) : !editable && editor.reason ? (
            <Alert>
              <AlertTitle>Wait until downtime</AlertTitle>
              <AlertDescription>{editor.reason}</AlertDescription>
            </Alert>
          ) : null}
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
                  ? "Choose which responses to mark for hacker sharing. Judges and officers can review every response."
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
                disabled={!editable}
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
                  disabled={!editable}
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
                {workspace.principalKind === "guest" || policy !== "public" ? (
                  <div className="flex items-start gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-sm text-muted-foreground">
                    {policy === "public" ||
                    (policy === "public_optional" &&
                      shared[item.id] === true) ? (
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
                ) : null}
              </div>
            );
          })}
        </div>
        <DialogFooter className="shrink-0 border-t border-border/70 bg-card p-3 sm:p-5">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0 text-xs leading-5 text-muted-foreground">
              <p
                role="status"
                className={
                  autosave.status === "error" ? "text-destructive" : ""
                }
              >
                {autosave.message}
              </p>
              {autosave.status === "error" && editable ? (
                <Button
                  variant="link"
                  onClick={() => void autosave.flush().catch(() => undefined)}
                >
                  Retry saving progress
                </Button>
              ) : null}
              {saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
            </div>
            <Button
              className="min-h-11 shrink-0"
              disabled={!editable || save.isPending}
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

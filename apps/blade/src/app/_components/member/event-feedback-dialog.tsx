"use client";

import { CheckCircle2, Gift, LockKeyhole } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { RadioGroup, RadioGroupItem } from "@forge/ui/radio-group";
import { Textarea } from "@forge/ui/textarea";

type FeedbackQuestion =
  | {
      id: string;
      label: string;
      max: number;
      min: number;
      required: boolean;
      type: "linear_scale";
    }
  | {
      id: string;
      label: string;
      required: boolean;
      type: "paragraph";
    }
  | {
      allowOther: boolean;
      id: string;
      label: string;
      options: string[];
      required: boolean;
      type: "multiple_choice";
    };

interface EventFeedbackDefinition {
  id: string;
  questions: FeedbackQuestion[];
}

type EventFeedbackDialogState =
  | {
      closesAt: string;
      rewardAmount: number;
      status: "available";
    }
  | {
      answers:
        | { label: string; questionId: string; value: number | string }[]
        | null;
      responseDeleted?: boolean;
      rewardAmount: number;
      status: "completed";
      submittedAt: string;
      windowClosed: boolean;
    };

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function FeedbackQuestionControl({ question }: { question: FeedbackQuestion }) {
  if (question.type === "linear_scale") {
    return (
      <fieldset className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-4">
        <legend className="px-1 text-sm font-medium">
          {question.label}
          {question.required && <span className="text-destructive"> *</span>}
        </legend>
        <RadioGroup
          aria-label={question.label}
          className="grid grid-cols-5 gap-2"
          name={question.id}
        >
          {Array.from(
            { length: question.max - question.min + 1 },
            (_, index) => question.min + index,
          ).map((value) => (
            <div key={value} className="grid justify-items-center gap-1.5">
              <RadioGroupItem
                id={`${question.id}-${value}`}
                value={String(value)}
                className="h-6 w-6"
              />
              <Label htmlFor={`${question.id}-${value}`}>{value}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    );
  }

  if (question.type === "paragraph") {
    return (
      <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-4">
        <Label htmlFor={question.id}>
          {question.label}
          {question.required && <span className="text-destructive"> *</span>}
        </Label>
        <Textarea
          id={question.id}
          name={question.id}
          className="min-h-28 bg-background/70 focus-visible:ring-2"
        />
      </div>
    );
  }

  return (
    <fieldset className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-4">
      <legend className="px-1 text-sm font-medium">
        {question.label}
        {question.required && <span className="text-destructive"> *</span>}
      </legend>
      <RadioGroup
        aria-label={question.label}
        className="grid gap-3"
        name={question.id}
      >
        {question.options.map((option) => (
          <div key={option} className="flex min-h-11 items-center gap-3">
            <RadioGroupItem
              id={`${question.id}-${option}`}
              value={option}
              className="focus-visible:ring-2"
            />
            <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
      {question.allowOther && (
        <div className="grid gap-2">
          <Label htmlFor={`${question.id}-other-text`}>Specify Other</Label>
          <Input
            id={`${question.id}-other-text`}
            name={`${question.id}Other`}
            className="h-11 bg-background/70 focus-visible:ring-2"
          />
        </div>
      )}
    </fieldset>
  );
}

export function EventFeedbackDialog({
  definition,
  error,
  event,
  onClose,
  onSubmit,
  open,
  state,
}: {
  definition: EventFeedbackDefinition;
  error?: string | null;
  event: { id: string; name: string };
  onClose: () => void;
  onSubmit: (answers: {
    customAnswers: Record<string, unknown>;
    discovery: string;
    discoveryOther?: string;
    fun: number;
    improve: string;
    learning: number;
    overall: number;
    worked: string;
  }) => void;
  open: boolean;
  state: EventFeedbackDialogState;
}) {
  const formText = (value: FormDataEntryValue | null) =>
    typeof value === "string" ? value : "";
  const responseDeleted =
    state.status === "completed" && state.responseDeleted === true;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        aria-label={`Event feedback for ${event.name}`}
        data-event-feedback-dialog-layout="responsive"
        data-event-feedback-dialog-state={state.status}
        className="inset-0 left-0 top-0 h-[100svh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90svh] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border"
      >
        <DialogHeader className="border-b border-border/70 bg-card/95 px-4 py-4 pr-14 text-left sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Event feedback</Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              {state.rewardAmount} points
            </Badge>
          </div>
          <DialogTitle className="mt-2 text-xl sm:text-2xl">
            {event.name}
          </DialogTitle>
          <DialogDescription>
            {state.status === "available"
              ? `Share your experience by ${formatDateTime(state.closesAt)}.`
              : "Review your completed event feedback."}
          </DialogDescription>
        </DialogHeader>

        {state.status === "available" ? (
          <form
            className="grid min-w-0 gap-4 overflow-y-auto p-4 sm:p-6"
            onSubmit={(formEvent) => {
              formEvent.preventDefault();
              const data = new FormData(formEvent.currentTarget);
              const coreQuestionIds = new Set([
                "overall",
                "fun",
                "learning",
                "worked",
                "improve",
                "discovery",
              ]);
              const customAnswers = Object.fromEntries(
                definition.questions
                  .filter((question) => !coreQuestionIds.has(question.id))
                  .flatMap((question) => {
                    const raw = data.get(question.id);
                    if (raw === null || raw === "") return [];
                    return [
                      [
                        question.id,
                        question.type === "linear_scale"
                          ? Number(raw)
                          : formText(raw),
                      ],
                    ];
                  }),
              );
              onSubmit({
                customAnswers,
                discovery: formText(data.get("discovery")),
                discoveryOther:
                  formText(data.get("discoveryOther")).trim() || undefined,
                fun: Number(data.get("fun")),
                improve: formText(data.get("improve")),
                learning: Number(data.get("learning")),
                overall: Number(data.get("overall")),
                worked: formText(data.get("worked")),
              });
            }}
          >
            <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm">
              <span className="font-medium">
                Earn {state.rewardAmount} points
              </span>{" "}
              after your first accepted submission, regardless of your answers.
            </div>
            {definition.questions.map((question) => (
              <FeedbackQuestionControl key={question.id} question={question} />
            ))}
            {error && (
              <p
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
            <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 border-t border-border/70 bg-card/95 p-4 sm:-mx-6 sm:-mb-6 sm:p-6">
              <Button
                type="submit"
                className="min-h-11 w-full focus-visible:ring-2 sm:w-auto"
              >
                Submit feedback
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid min-w-0 gap-4 overflow-y-auto p-4 sm:p-6">
            <section className="rounded-md border border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.08)] p-4">
              <div className="flex items-start gap-3">
                {responseDeleted ? (
                  <LockKeyhole
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--chart-2))]"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <h2 className="font-semibold">
                    {responseDeleted
                      ? "Feedback completed"
                      : "Feedback submitted"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.rewardAmount} points earned
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Read only
                  </Badge>
                </div>
              </div>
            </section>

            {state.answers ? (
              <section
                aria-label="Submitted feedback answers"
                className="grid gap-3"
              >
                {state.answers.map((answer) => (
                  <div
                    key={answer.questionId}
                    className="rounded-md border border-white/10 bg-background/60 p-3"
                  >
                    <h3 className="text-sm font-medium">{answer.label}</h3>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {answer.value}
                    </p>
                  </div>
                ))}
              </section>
            ) : (
              <p className="rounded-md border border-white/10 bg-background/60 p-4 text-sm text-muted-foreground">
                The submitted answers are no longer available. Your completed
                status and reward are unchanged.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

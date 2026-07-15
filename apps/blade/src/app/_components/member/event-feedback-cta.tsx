"use client";

import { CheckCircle2, MessageSquareText } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

type EventFeedbackCtaState =
  | {
      closesAt: string;
      rewardAmount: number;
      status: "available" | "due_soon";
    }
  | {
      rewardAmount: number;
      status: "completed";
    };

export function EventFeedbackCta({
  eventName,
  feedback,
  onOpen,
  surface,
}: {
  eventName: string;
  feedback: EventFeedbackCtaState;
  onOpen: () => void;
  surface: "dashboard" | "event_history";
}) {
  const urgent = feedback.status === "due_soon";
  const dashboard = surface === "dashboard";
  const completed = feedback.status === "completed";
  const actionLabel = completed
    ? `Review feedback for ${eventName}`
    : urgent
      ? `Give feedback for ${eventName}. Feedback is due soon.`
      : `Give feedback for ${eventName}`;

  return (
    <div
      data-feedback-surface={surface}
      data-feedback-state={feedback.status}
      className="flex min-w-0 items-center justify-end gap-1.5"
    >
      <TooltipProvider delayDuration={200}>
        {urgent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-label="Feedback is due soon"
                className="grid min-h-11 min-w-8 cursor-help place-items-center font-mono text-sm font-semibold text-destructive sm:min-h-9"
                role="img"
                tabIndex={0}
              >
                (!)
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Feedback is due soon</TooltipContent>
          </Tooltip>
        )}
        {!dashboard && completed && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-4 w-4 text-[hsl(var(--chart-2))]"
              aria-hidden="true"
            />
            Feedback submitted · {feedback.rewardAmount} points earned
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size={dashboard ? "icon" : "sm"}
              data-feedback-completed-visual={completed ? "success" : undefined}
              className={cn(
                "min-h-11 focus-visible:ring-2 sm:min-h-9",
                dashboard ? "min-w-11 sm:min-w-9" : "gap-2",
                completed &&
                  "border-[hsl(var(--chart-2)/0.45)] bg-[hsl(var(--chart-2)/0.18)] text-muted-foreground shadow-none hover:bg-[hsl(var(--chart-2)/0.25)] hover:text-foreground",
              )}
              aria-label={actionLabel}
              onClick={onOpen}
            >
              <MessageSquareText
                className={cn("h-4 w-4", completed && "text-muted-foreground")}
                aria-hidden="true"
              />
              {!dashboard && (completed ? "Review feedback" : "Give feedback")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {completed ? "Feedback submitted — review" : "Give feedback"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

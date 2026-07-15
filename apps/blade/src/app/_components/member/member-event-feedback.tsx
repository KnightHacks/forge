"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { EventFeedbackCta } from "./event-feedback-cta";
import { EventFeedbackDialog } from "./event-feedback-dialog";

export interface MemberFeedbackOpportunity {
  answers?: {
    customAnswers?: Record<string, unknown>;
    discovery: string;
    discoveryOther?: string;
    fun: number;
    improve?: string;
    learning: number;
    overall: number;
    worked?: string;
  } | null;
  customQuestions?: unknown[];
  dueAt: string;
  eventId: string;
  eventName: string;
  formId: string;
  pointsAwarded?: number;
  responseId?: string | null;
  rewardPoints: number;
  status: "available" | "completed" | "due_soon";
  submittedAt?: Date | string;
  urgent: boolean;
}

const feedbackDefinition = {
  id: "event-feedback",
  questions: [
    {
      id: "overall",
      label: "Overall event rating",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "fun",
      label: "How fun was the event?",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "learning",
      label: "How much did you learn?",
      max: 5,
      min: 1,
      required: true,
      type: "linear_scale" as const,
    },
    {
      id: "worked",
      label: "What worked well?",
      required: false,
      type: "paragraph" as const,
    },
    {
      id: "improve",
      label: "What should we improve?",
      required: false,
      type: "paragraph" as const,
    },
    {
      allowOther: true,
      id: "discovery",
      label: "How did you hear about this event?",
      options: [
        "Discord",
        "Instagram",
        "KnightConnect",
        "Word of mouth",
        "CECS emailing list",
        "Reddit",
        "LinkedIn",
        "Class presentation",
        "Another club",
        "Google Calendar",
        "Other",
      ],
      required: true,
      type: "multiple_choice" as const,
    },
  ],
};

type CustomFeedbackQuestion =
  | {
      id: string;
      label: string;
      required: boolean;
      type: "paragraph";
    }
  | {
      id: string;
      label: string;
      max: number;
      min: number;
      required: boolean;
      type: "linear_scale";
    };

export function MemberEventFeedback({
  opportunity,
  surface,
}: {
  opportunity: MemberFeedbackOpportunity;
  surface: "dashboard" | "event_history";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(
    opportunity.status === "completed",
  );
  const [error, setError] = useState<string | null>(null);
  const [acceptedSubmission, setAcceptedSubmission] = useState<{
    answers: NonNullable<MemberFeedbackOpportunity["answers"]>;
    responseId: string | null;
    submittedAt: string;
  } | null>(null);
  const customQuestions = (opportunity.customQuestions ?? []).reduce<
    CustomFeedbackQuestion[]
  >((questions, value) => {
    if (typeof value !== "object" || value === null) return questions;
    if (!("id" in value) || typeof value.id !== "string") return questions;
    if (!("prompt" in value) || typeof value.prompt !== "string")
      return questions;
    if (!("type" in value) || typeof value.type !== "string") return questions;
    const required = "required" in value && value.required === true;
    if (value.type === "paragraph") {
      questions.push({
        id: value.id,
        label: value.prompt,
        required,
        type: "paragraph" as const,
      });
      return questions;
    }
    if (
      value.type === "linear_scale" &&
      "min" in value &&
      "max" in value &&
      typeof value.min === "number" &&
      typeof value.max === "number"
    ) {
      questions.push({
        id: value.id,
        label: value.prompt,
        max: value.max,
        min: value.min,
        required,
        type: "linear_scale" as const,
      });
      return questions;
    }
    return questions;
  }, []);
  const utils = api.useUtils();
  const submit = api.event.submitFeedback.useMutation({
    onSuccess(result, variables) {
      setCompleted(true);
      setOpen(false);
      setError(null);
      setAcceptedSubmission({
        answers: variables.answers,
        responseId: result.responseId,
        submittedAt: new Date().toISOString(),
      });
      toast.success("Feedback submitted", {
        description: `${result.pointsAwarded} points earned. Thanks for helping us improve ${opportunity.eventName}.`,
      });
      void Promise.all([
        utils.event.listMyFeedback.invalidate(),
        utils.member.getMember.invalidate(),
      ]);
      router.refresh();
    },
    onError(mutationError) {
      setError(mutationError.message);
    },
  });

  const ctaState = completed
    ? ({
        rewardAmount: opportunity.rewardPoints,
        status: "completed" as const,
      } satisfies Parameters<typeof EventFeedbackCta>[0]["feedback"])
    : {
        closesAt: opportunity.dueAt,
        rewardAmount: opportunity.rewardPoints,
        status: opportunity.status as "available" | "due_soon",
      };
  const displayedAnswers = opportunity.answers ?? acceptedSubmission?.answers;
  const displayedResponseId =
    acceptedSubmission?.responseId ?? opportunity.responseId;
  const displayedSubmittedAt =
    acceptedSubmission?.submittedAt ?? opportunity.submittedAt;

  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-end gap-2"
      data-feedback-position="bottom-right"
    >
      <EventFeedbackCta
        eventName={opportunity.eventName}
        feedback={ctaState}
        onOpen={() => setOpen(true)}
        surface={surface}
      />
      {error && (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <EventFeedbackDialog
        definition={{
          ...feedbackDefinition,
          questions: [...feedbackDefinition.questions, ...customQuestions],
        }}
        error={error}
        event={{ id: opportunity.eventId, name: opportunity.eventName }}
        onClose={() => setOpen(false)}
        onSubmit={(answers) => {
          setError(null);
          submit.mutate({ answers, formId: opportunity.formId });
        }}
        open={open}
        state={
          completed
            ? {
                answers: displayedAnswers
                  ? [
                      {
                        label: "Overall event rating",
                        questionId: "overall",
                        value: displayedAnswers.overall,
                      },
                      {
                        label: "Fun",
                        questionId: "fun",
                        value: displayedAnswers.fun,
                      },
                      {
                        label: "Learning",
                        questionId: "learning",
                        value: displayedAnswers.learning,
                      },
                      {
                        label: "What worked well?",
                        questionId: "worked",
                        value: displayedAnswers.worked ?? "",
                      },
                      {
                        label: "What should improve?",
                        questionId: "improve",
                        value: displayedAnswers.improve ?? "",
                      },
                      {
                        label: "Discovery source",
                        questionId: "discovery",
                        value:
                          displayedAnswers.discovery === "Other"
                            ? (displayedAnswers.discoveryOther ?? "Other")
                            : displayedAnswers.discovery,
                      },
                      ...Object.entries(
                        displayedAnswers.customAnswers ?? {},
                      ).map(([questionId, value]) => ({
                        label:
                          customQuestions.find(
                            (question) => question.id === questionId,
                          )?.label ?? "Event question",
                        questionId,
                        value:
                          typeof value === "number" || typeof value === "string"
                            ? value
                            : JSON.stringify(value),
                      })),
                    ]
                  : null,
                responseDeleted:
                  opportunity.status === "completed" &&
                  displayedResponseId === null,
                rewardAmount: opportunity.rewardPoints,
                status: "completed",
                submittedAt: displayedSubmittedAt
                  ? new Date(displayedSubmittedAt).toISOString()
                  : new Date().toISOString(),
                windowClosed: new Date(opportunity.dueAt) <= new Date(),
              }
            : {
                closesAt: opportunity.dueAt,
                rewardAmount: opportunity.rewardPoints,
                status: "available",
              }
        }
      />
    </div>
  );
}

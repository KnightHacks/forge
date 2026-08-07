import type { ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Skeleton } from "@forge/ui/skeleton";

import { formatClubLongDate } from "~/lib/dates";
import { FormResponseValue } from "./form-response-value";

interface GenericFormDefinition {
  description: string;
  id: string;
  name: string;
  questions: unknown[];
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  slugName: string;
}

type GenericRespondentState =
  | { opensAt: string | null; status: "scheduled" }
  | {
      status: "archived" | "closed" | "ineligible" | "manually_closed" | "open";
    }
  | {
      answers: { questionId: string; value: unknown }[];
      editable: boolean;
      responseId: string;
      status: "submitted";
      submittedAt: string;
    };

function formatDate(value: string) {
  return formatClubLongDate(value);
}

const NOTICE_ICON_CLASS = "mt-0.5 h-5 w-5 shrink-0";

export function RespondentFormSkeleton() {
  return (
    <main
      aria-label="Form loading"
      aria-busy="true"
      data-form-respondent-layout="mobile-first"
      data-loading-surface="respondent-form"
      className="container min-w-0 overflow-x-clip px-3 pb-28 pt-4 sm:px-4 sm:pb-16 sm:pt-10"
    >
      <Card className="mx-auto min-w-0 max-w-3xl gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardHeader className="border-b border-border/70 p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-11 w-40 rounded-md" />
          </div>
          <Skeleton className="h-9 w-3/4 max-w-lg" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-4/5 max-w-lg" />
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5 p-3 sm:p-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid gap-2" key={index}>
              <Skeleton className="h-4 w-40 max-w-[66%]" />
              <Skeleton
                className={
                  index === 2
                    ? "h-28 w-full rounded-md"
                    : "h-11 w-full rounded-md"
                }
              />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-md sm:ml-auto sm:w-36" />
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Copy for every state where the form exists but cannot be answered. Returns
 * null for the states that render the form or a submitted response instead.
 */
function unavailableNotice(state: GenericRespondentState) {
  switch (state.status) {
    case "scheduled":
      return {
        body: state.opensAt ? `Opens ${formatDate(state.opensAt)}.` : undefined,
        formState: "scheduled",
        heading: "This form is not open yet",
        icon: (
          <CalendarClock
            aria-hidden="true"
            className={`${NOTICE_ICON_CLASS} text-primary`}
          />
        ),
      };
    case "closed":
      return {
        body: "Responses are no longer accepted.",
        formState: "closed",
        heading: "This form is closed",
        icon: (
          <LockKeyhole
            aria-hidden="true"
            className={`${NOTICE_ICON_CLASS} text-muted-foreground`}
          />
        ),
      };
    case "manually_closed":
      return {
        body: "Responses are no longer accepted.",
        formState: "manually_closed",
        heading: "This form was closed early",
        icon: (
          <LockKeyhole
            aria-hidden="true"
            className={`${NOTICE_ICON_CLASS} text-muted-foreground`}
          />
        ),
      };
    case "archived":
      return {
        body: "Archived forms no longer accept responses.",
        formState: "archived",
        heading: "This form has been archived",
        icon: (
          <Archive
            aria-hidden="true"
            className={`${NOTICE_ICON_CLASS} text-muted-foreground`}
          />
        ),
      };
    case "ineligible":
      return {
        body: "It is limited to specific members.",
        formState: "ineligible",
        heading: "You are not eligible for this form",
        icon: (
          <ShieldAlert
            aria-hidden="true"
            className={`${NOTICE_ICON_CLASS} text-muted-foreground`}
          />
        ),
      };
    default:
      return null;
  }
}

function UnavailableNotice({
  body,
  formState,
  heading,
  icon,
}: {
  body?: string;
  formState: string;
  heading: string;
  icon: ReactNode;
}) {
  return (
    <section
      role="status"
      data-form-state={formState}
      className="rounded-md border border-white/10 bg-background/60 p-4"
    >
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h2 className="font-semibold">{heading}</h2>
          {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
        </div>
      </div>
    </section>
  );
}

export function GenericFormRespondent({
  definition,
  openForm,
  respondentState,
}: {
  definition: GenericFormDefinition;
  openForm?: ReactNode;
  respondentState: GenericRespondentState;
}) {
  const notice = unavailableNotice(respondentState);
  return (
    <main
      aria-labelledby="form-title"
      data-form-respondent-layout="mobile-first"
      className="container min-w-0 overflow-x-clip px-3 pb-28 pt-4 sm:px-4 sm:pb-16 sm:pt-10"
    >
      <Card className="mx-auto min-w-0 max-w-3xl gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardHeader className="border-b border-border/70 p-4 sm:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="w-fit">
              Member form
            </Badge>
            <Button
              asChild
              className="min-h-11 gap-2 focus-visible:ring-2"
              variant="outline"
            >
              <Link href="/member/dashboard">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to dashboard
              </Link>
            </Button>
          </div>
          <h1
            id="form-title"
            className="text-2xl font-semibold leading-tight sm:text-3xl"
          >
            {definition.name}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {definition.description}
          </p>
        </CardHeader>
        <CardContent className="min-w-0 p-3 sm:p-6">
          {respondentState.status === "open" && openForm}
          {notice && <UnavailableNotice {...notice} />}

          {respondentState.status === "submitted" && (
            <section
              aria-live="polite"
              data-form-state="submitted"
              className="rounded-md border border-[hsl(var(--chart-2)/0.35)] bg-[hsl(var(--chart-2)/0.08)] p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--chart-2))]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">Your submitted response</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {respondentState.editable
                      ? "You can update it while this form remains open."
                      : "This response is locked and cannot be edited."}
                  </p>
                </div>
              </div>
            </section>
          )}
          {respondentState.status === "submitted" && (
            <section aria-label="Submitted answers" className="mt-4 grid gap-3">
              {respondentState.editable && openForm
                ? openForm
                : respondentState.answers.map((answer) => {
                    const question = definition.questions.find(
                      (candidate) =>
                        typeof candidate === "object" &&
                        candidate !== null &&
                        "id" in candidate &&
                        candidate.id === answer.questionId,
                    ) as { prompt?: string; type?: string } | undefined;
                    return (
                      <div
                        className="rounded-md border border-white/10 bg-background/60 p-3"
                        key={answer.questionId}
                      >
                        <h3 className="text-sm font-medium">
                          {question?.prompt ?? "Response"}
                        </h3>
                        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          <FormResponseValue
                            questionType={question?.type}
                            value={answer.value}
                          />
                        </div>
                      </div>
                    );
                  })}
            </section>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

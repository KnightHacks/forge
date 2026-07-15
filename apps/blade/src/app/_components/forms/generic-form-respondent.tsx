import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";

import {
  formatFormResponseValue,
  FormResponseValue,
} from "./form-response-value";

interface GenericFormDefinition {
  description: string;
  id: string;
  name: string;
  questions: unknown[];
  responseMode: "multiple_locked" | "single_editable" | "single_locked";
  slugName: string;
}

type GenericRespondentState =
  | { opensAt: string; status: "scheduled" }
  | { status: "open" }
  | { closedAt: string; reason: "manual" | "schedule"; status: "closed" }
  | {
      answers: { questionId: string; value: unknown }[];
      editable: boolean;
      responseId: string;
      status: "submitted";
      submittedAt: string;
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

export { formatFormResponseValue as formatRespondentAnswer };

export function GenericFormRespondent({
  definition,
  openForm,
  respondentState,
}: {
  definition: GenericFormDefinition;
  openForm?: ReactNode;
  respondentState: GenericRespondentState;
}) {
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
          {respondentState.status === "scheduled" && (
            <section
              role="status"
              data-form-state="scheduled"
              className="rounded-md border border-white/10 bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                <CalendarClock
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-semibold">This form is not open yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Opens {formatDate(respondentState.opensAt)}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {respondentState.status === "closed" && (
            <section
              role="status"
              data-form-state="closed"
              className="rounded-md border border-white/10 bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                <LockKeyhole
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-semibold">This form is closed</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Responses are no longer accepted.
                  </p>
                </div>
              </div>
            </section>
          )}

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

import Link from "next/link";
import { CalendarClock, FileText, LockKeyhole } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface MemberFormResponseItem {
  formKind: "event_feedback" | "general" | "system";
  formName: string;
  locked: boolean;
  responseId: string;
  slugName: string;
  submittedAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function MemberFormHistory({
  responses,
}: {
  responses: MemberFormResponseItem[];
}) {
  const genericResponses = responses.filter(
    (response) => response.formKind !== "event_feedback",
  );

  return (
    <main
      aria-labelledby="previous-forms-heading"
      data-member-form-history-layout="responsive"
      className="container min-w-0 space-y-5 pb-16 pt-5 sm:space-y-6 sm:pt-8"
    >
      <header>
        <p className="text-sm font-medium text-primary">Response history</p>
        <h1
          id="previous-forms-heading"
          className="mt-1 text-3xl font-semibold sm:text-4xl"
        >
          Previous forms
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review form responses you have already submitted.
        </p>
      </header>

      <section aria-label="Submitted form responses" className="grid gap-3">
        {genericResponses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-card/80 p-8 text-center text-sm text-muted-foreground">
            You have no retained form responses.
          </div>
        ) : (
          genericResponses.map((response) => (
            <Card
              key={response.responseId}
              className="gap-3 border-white/10 bg-card/95 py-4 shadow-xl shadow-black/15"
            >
              <CardHeader className="grid gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    {response.locked && (
                      <Badge variant="outline" className="gap-1.5">
                        <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-3 text-lg leading-tight">
                    {response.formName}
                  </CardTitle>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    Submitted {formatDate(response.submittedAt)}
                  </p>
                </div>
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="min-h-11 focus-visible:ring-2"
                >
                  <Link
                    href={`/form/${encodeURIComponent(response.slugName)}?responseId=${encodeURIComponent(response.responseId)}`}
                  >
                    Review response
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="sr-only px-4">
                Response identifier {response.responseId}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}

"use client";

import { Download, MessageSquareText, Plus } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

interface EventFeedbackMetrics {
  averages: { fun: number; learning: number; overall: number };
  customQuestionSummaries?: {
    average?: number | null;
    distribution?: Record<string, number>;
    nonEmptyCount?: number;
    prompt: string;
    questionId: string;
    type: "linear_scale" | "paragraph";
  }[];
  discovery: { count: number; label: string }[];
  distributions: {
    fun: number[];
    learning: number[];
    overall: number[];
  };
  includedCount: number;
  locallyExcludedCount: number;
}

interface EventFeedbackResponse {
  answers: {
    customAnswers?: Record<string, unknown>;
    discovery: string;
    discoveryOther?: string;
    fun: number;
    improve: string;
    learning: number;
    overall: number;
    worked: string;
  };
  member: { id: string; name: string };
  responseId: string;
  submittedAt: string;
}

interface EventFeedbackPanelAccess {
  canEditQuestions: boolean;
  canReadResponses: boolean;
  isOfficer: boolean;
}

function average(value: number) {
  return value.toFixed(2);
}

function Distribution({ counts, label }: { counts: number[]; label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} distribution`}
      className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3"
    >
      <h4 className="text-sm font-medium">{label} distribution</h4>
      <div className="grid grid-cols-5 gap-1 text-center text-xs text-muted-foreground">
        {counts.map((count, index) => (
          <span key={`${label}-${index}`} className="rounded bg-card/70 p-2">
            <span className="block font-mono text-foreground">{count}</span>
            {index + 1} star
          </span>
        ))}
      </div>
    </div>
  );
}

const discoveryColors = [
  "hsl(var(--primary))",
  "hsl(196 75% 52%)",
  "hsl(42 90% 55%)",
  "hsl(270 70% 65%)",
  "hsl(145 62% 45%)",
  "hsl(4 78% 58%)",
];

function DiscoveryPie({
  sources,
}: {
  sources: { count: number; label: string }[];
}) {
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  let cursor = 0;
  const segments = sources.map((source, index) => {
    const start = cursor;
    cursor += total === 0 ? 0 : (source.count / total) * 100;
    return `${discoveryColors[index % discoveryColors.length]} ${start}% ${cursor}%`;
  });
  return (
    <div
      role="img"
      aria-label="Discovery source distribution"
      className="grid gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
    >
      <div
        className="mx-auto aspect-square w-28 rounded-full border border-white/10 bg-card"
        style={{
          background:
            total > 0 ? `conic-gradient(${segments.join(", ")})` : undefined,
        }}
      />
      <div>
        <h4 className="text-sm font-medium">Discovery source</h4>
        <div className="mt-2 grid gap-1.5">
          {sources.map((source, index) => (
            <div
              className="flex items-center justify-between gap-3 text-xs"
              key={source.label}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{
                    backgroundColor:
                      discoveryColors[index % discoveryColors.length],
                  }}
                />
                <span className="truncate">{source.label}</span>
              </span>
              <span className="font-mono text-muted-foreground">
                {source.count}
              </span>
            </div>
          ))}
          {sources.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No discovery responses yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventFeedbackPanel({
  access,
  eventName,
  excludedResponseIds,
  metrics,
  onExcludedResponseIdsChange,
  onAddQuestion,
  onExportCsv,
  responses = [],
}: {
  access: EventFeedbackPanelAccess;
  eventId: string;
  eventName: string;
  excludedResponseIds: string[];
  metrics: EventFeedbackMetrics;
  onExcludedResponseIdsChange: (responseIds: string[]) => void;
  onAddQuestion?: () => void;
  onExportCsv?: () => void;
  responses?: EventFeedbackResponse[];
}) {
  const canEditQuestions = access.canEditQuestions || access.isOfficer;
  const customQuestionSummaries = metrics.customQuestionSummaries ?? [];

  function toggleExcluded(responseId: string, excluded: boolean) {
    onExcludedResponseIdsChange(
      excluded
        ? [...new Set([...excludedResponseIds, responseId])]
        : excludedResponseIds.filter((id) => id !== responseId),
    );
  }

  return (
    <section
      aria-label={`Feedback metrics for ${eventName}`}
      data-feedback-metrics-layout="responsive"
      data-exclusion-scope="session"
      className="grid min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold">Event feedback</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {metrics.includedCount} included · {metrics.locallyExcludedCount}{" "}
            locally excluded
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditQuestions && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2 focus-visible:ring-2"
              onClick={onAddQuestion}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add event question
            </Button>
          )}
          {access.canReadResponses && onExportCsv && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2 focus-visible:ring-2"
              onClick={onExportCsv}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Overall rating", metrics.averages.overall],
          ["Fun rating", metrics.averages.fun],
          ["Learning rating", metrics.averages.learning],
        ].map(([label, value]) => (
          <Card
            key={String(label)}
            className="gap-2 border-white/10 bg-card/95 py-4 shadow-xl shadow-black/15"
          >
            <CardHeader className="px-4">
              <CardTitle className="text-sm text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <span className="font-mono text-3xl font-semibold">
                {average(Number(value))}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">/ 5</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Distribution
          counts={metrics.distributions.overall}
          label="Overall rating"
        />
        <Distribution counts={metrics.distributions.fun} label="Fun rating" />
        <Distribution
          counts={metrics.distributions.learning}
          label="Learning rating"
        />
        <DiscoveryPie sources={metrics.discovery} />
      </div>

      {customQuestionSummaries.length > 0 && (
        <section
          aria-labelledby="custom-feedback-summaries"
          className="grid gap-3"
        >
          <h3 id="custom-feedback-summaries" className="text-lg font-semibold">
            Event-specific questions
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {customQuestionSummaries.map((summary) => (
              <div
                className="rounded-md border border-white/10 bg-background/60 p-3"
                key={summary.questionId}
              >
                <h4 className="text-sm font-medium">{summary.prompt}</h4>
                {summary.type === "linear_scale" ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>
                      Average{" "}
                      {summary.average === null || summary.average === undefined
                        ? "—"
                        : summary.average.toFixed(2)}
                    </span>
                    {Object.entries(summary.distribution ?? {}).map(
                      ([value, count]) => (
                        <span
                          className="rounded bg-card/70 px-2 py-1 font-mono"
                          key={value}
                        >
                          {value}: {count}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {summary.nonEmptyCount ?? 0} non-empty responses
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {access.canReadResponses && (
        <section className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Exclusions reset when you leave or refresh this view. They do not
            modify retained responses or CSV export.
          </p>
          <div className="overflow-hidden rounded-md border border-white/10 bg-card/95">
            <Table aria-label="Event feedback responses">
              <TableHeader>
                <TableRow>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Ratings</TableHead>
                  <TableHead>Qualitative feedback</TableHead>
                  <TableHead>Metrics</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => {
                  const excluded = excludedResponseIds.includes(
                    response.responseId,
                  );
                  const qualitative = [
                    response.answers.worked,
                    response.answers.improve,
                    ...Object.values(
                      response.answers.customAnswers ?? {},
                    ).filter(
                      (value): value is string =>
                        typeof value === "string" && value.trim().length > 0,
                    ),
                  ].filter(Boolean);
                  return (
                    <TableRow
                      key={response.responseId}
                      data-state={excluded ? "selected" : undefined}
                    >
                      <TableCell>
                        <p className="font-medium">{response.member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {response.responseId}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono">
                        {response.answers.overall} / {response.answers.fun} /{" "}
                        {response.answers.learning}
                      </TableCell>
                      <TableCell>
                        {qualitative.length > 0 ? (
                          <ul className="grid gap-1 text-sm">
                            {qualitative.map((answer) => (
                              <li key={answer}>{answer}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No qualitative answer
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                          <Checkbox
                            id={response.responseId}
                            checked={excluded}
                            data-checked={excluded}
                            aria-label={`Exclude ${response.member.name} from metrics`}
                            onCheckedChange={(checked) =>
                              toggleExcluded(
                                response.responseId,
                                checked === true,
                              )
                            }
                          />
                          Exclude from metrics
                        </label>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </section>
  );
}

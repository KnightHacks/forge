"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Eye,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { FormResponseValue } from "~/app/_components/forms/form-response-value";
import { api } from "~/trpc/react";

interface FormQuestionSnapshot {
  id: string;
  prompt: string;
  type: string;
}

export interface IdentifiedFormResponse {
  answers: Record<string, unknown>;
  member: { email: string; id: string; name: string };
  responseId: string;
  snapshot: { questions: readonly FormQuestionSnapshot[] };
  submittedAt: Date | string;
}

interface CountedCategory {
  count: number;
  label: string;
  value: string;
}

interface TextAnswer {
  responseId: string;
  value: string;
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
];

const subscribeToClient = () => () => undefined;

function ShadChart({
  children,
  className,
  config,
  style,
}: {
  children: React.ComponentProps<typeof ChartContainer>["children"];
  className: string;
  config: ChartConfig;
  style?: React.CSSProperties;
}) {
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`${className} rounded-md bg-muted/20`}
        data-chart-library="shadcn"
        style={style}
      />
    );
  }

  return (
    <ChartContainer
      className={className}
      config={config}
      data-chart-library="shadcn"
      style={style}
    >
      {children}
    </ChartContainer>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

function humanizeType(value: string) {
  return value.replaceAll("_", " ");
}

function asCategories(value: unknown): CountedCategory[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((category) => {
    if (!isRecord(category) || typeof category.count !== "number") return [];
    return [
      {
        count: category.count,
        label: textValue(category.label ?? category.value, "Option"),
        value: textValue(category.value ?? category.label, "option"),
      },
    ];
  });
}

function ChoiceDonut({
  categories,
  label,
}: {
  categories: CountedCategory[];
  label: string;
}) {
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const data = categories.map((category, index) => ({
    ...category,
    fill: `var(--color-segment-${index})`,
  }));
  const config = Object.fromEntries(
    categories.map((category, index) => [
      `segment-${index}`,
      {
        color: chartColors[index % chartColors.length],
        label: category.label,
      },
    ]),
  ) satisfies ChartConfig;

  return (
    <div
      aria-label={`${label} response distribution`}
      className="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)] md:items-center"
      data-analytics-visualization="donut"
      role="img"
    >
      <div className="relative">
        <ShadChart
          className="mx-auto aspect-auto h-52 w-full max-w-60"
          config={config}
        >
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="label" />}
            />
            <Pie
              data={data}
              dataKey="count"
              innerRadius={54}
              isAnimationActive={false}
              nameKey="label"
              outerRadius={82}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((category, index) => (
                <Cell fill={category.fill} key={`${category.value}-${index}`} />
              ))}
            </Pie>
          </PieChart>
        </ShadChart>
        <div className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-lg font-semibold">
          {total}
        </div>
      </div>
      <div className="grid divide-y divide-border/60">
        {categories.map((category, index) => {
          const percentage = total === 0 ? 0 : (category.count / total) * 100;
          return (
            <div
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm"
              key={`${category.value}-${index}`}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-sm"
                style={{
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
              <span className="min-w-0 break-words">{category.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {category.count} · {Math.round(percentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountBars({
  categories,
  respondentCount,
  type,
}: {
  categories: CountedCategory[];
  respondentCount: number;
  type: "choice-bars" | "multi-select-bars";
}) {
  const sorted = [...categories].sort((a, b) => b.count - a.count);
  const data = sorted.map((category) => ({
    ...category,
    percentage:
      respondentCount === 0
        ? 0
        : Math.round((category.count / respondentCount) * 100),
  }));
  const config = {
    count: {
      color: "hsl(var(--primary))",
      label: "Responses",
    },
  } satisfies ChartConfig;

  return (
    <div
      aria-label="Response counts by option"
      className="grid gap-2"
      data-analytics-visualization={type}
      role="img"
    >
      <ShadChart
        className="aspect-auto h-[min(22rem,var(--chart-height))] min-h-44 w-full"
        config={config}
        style={
          {
            "--chart-height": `${Math.max(176, data.length * 42)}px`,
          } as React.CSSProperties
        }
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 16 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis allowDecimals={false} type="number" />
          <YAxis
            axisLine={false}
            dataKey="label"
            tickFormatter={(value: string) =>
              value.length > 24 ? `${value.slice(0, 23)}…` : value
            }
            tickLine={false}
            type="category"
            width={128}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const payload = (
                    item as { payload?: { percentage?: number } }
                  ).payload;
                  return (
                    <div className="flex min-w-32 items-center justify-between gap-3">
                      <span className="text-muted-foreground">Responses</span>
                      <span className="font-mono font-medium">
                        {String(value)} · {payload?.percentage ?? 0}%
                        {type === "multi-select-bars" ? " of respondents" : ""}
                      </span>
                    </div>
                  );
                }}
                hideLabel={false}
                labelKey="label"
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            isAnimationActive={false}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ShadChart>
      <div className="sr-only">
        {data.map((category) => (
          <p key={category.value}>
            {category.label}: {category.count} · {category.percentage}%
            {type === "multi-select-bars" ? " of respondents" : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

function NumericDistribution({
  distribution,
}: {
  distribution: [string, unknown][];
}) {
  const values = distribution
    .map(([label, count]) => ({
      count: typeof count === "number" ? count : Number(count) || 0,
      label,
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));
  const total = values.reduce((sum, value) => sum + value.count, 0);
  const config = {
    count: {
      color: "hsl(var(--primary))",
      label: "Responses",
    },
  } satisfies ChartConfig;

  return (
    <div
      aria-label="Numeric response distribution"
      data-analytics-visualization="ordered-distribution"
      role="img"
    >
      <ShadChart className="aspect-auto h-52 w-full" config={config}>
        <BarChart accessibilityLayer data={values} margin={{ top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis axisLine={false} dataKey="label" tickLine={false} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => {
                  const count = Number(value);
                  return (
                    <div className="flex min-w-28 items-center justify-between gap-3">
                      <span className="text-muted-foreground">Responses</span>
                      <span className="font-mono font-medium">
                        {count} ·{" "}
                        {total === 0 ? 0 : Math.round((count / total) * 100)}%
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ShadChart>
      <div className="sr-only">
        {values.map((value) => (
          <p key={value.label}>
            {value.label}: {value.count} ·{" "}
            {total === 0 ? 0 : Math.round((value.count / total) * 100)}%
          </p>
        ))}
      </div>
    </div>
  );
}

function TextAnswerList({
  answers,
  prompt,
  questionType,
}: {
  answers: TextAnswer[];
  prompt: string;
  questionType: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <div className="flex min-h-11 items-center border-b border-border/70 bg-background/40 px-3 text-xs text-muted-foreground">
        {answers.length} responses
      </div>
      <div
        aria-label={`${answers.length} answers to ${prompt}`}
        className="max-h-72 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-answer-density="bounded"
        tabIndex={0}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-20">Response</TableHead>
              <TableHead>Answer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {answers.map((answer, index) => (
              <TableRow key={`${answer.responseId}-${index}`}>
                <TableCell className="align-top font-mono text-xs text-muted-foreground">
                  #{index + 1}
                </TableCell>
                <TableCell className="whitespace-pre-wrap break-words leading-6">
                  <FormResponseValue
                    questionType={questionType}
                    value={answer.value}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ResponseAnalyticsCard({
  summary,
}: {
  summary: Record<string, unknown>;
}) {
  const prompt = textValue(summary.currentPrompt, "Question");
  const type = textValue(summary.type, "response");
  const categories = asCategories(summary.categories);
  const selections = asCategories(summary.selections);
  const distribution = isRecord(summary.distribution)
    ? Object.entries(summary.distribution)
    : [];
  const answers = Array.isArray(summary.answers)
    ? summary.answers.flatMap((answer) =>
        isRecord(answer) && typeof answer.value === "string"
          ? [
              {
                responseId: textValue(answer.responseId, "response"),
                value: answer.value,
              },
            ]
          : [],
      )
    : [];
  const files = Array.isArray(summary.files)
    ? summary.files.filter(isRecord)
    : [];
  const respondentCount =
    typeof summary.respondentCount === "number"
      ? summary.respondentCount
      : categories.reduce((sum, category) => sum + category.count, 0);
  const choiceUsesBars =
    categories.length > 7 || categories.some(({ label }) => label.length > 28);

  return (
    <article className="grid gap-4 p-4 sm:p-5" data-question-layout="row">
      <header className="grid gap-1">
        <h3 className="break-words text-base font-semibold">{prompt}</h3>
        <p className="text-xs capitalize text-muted-foreground">
          {humanizeType(type)}
        </p>
      </header>
      <div className="grid gap-4 text-sm">
        {distribution.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
            <div>
              {typeof summary.average === "number" && (
                <p className="font-mono text-3xl font-semibold">
                  {summary.average.toFixed(2)}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {textValue(summary.responseCount, "0")} responses
              </p>
            </div>
            <NumericDistribution distribution={distribution} />
          </div>
        ) : (
          typeof summary.average === "number" && (
            <div className="flex items-end gap-3">
              <span className="font-mono text-3xl font-semibold">
                {summary.average.toFixed(2)}
              </span>
              <span className="pb-1 text-xs text-muted-foreground">
                {textValue(summary.responseCount, "0")} responses
              </span>
            </div>
          )
        )}
        {categories.length > 0 &&
          (choiceUsesBars ? (
            <CountBars
              categories={categories}
              respondentCount={respondentCount}
              type="choice-bars"
            />
          ) : (
            <ChoiceDonut categories={categories} label={prompt} />
          ))}
        {selections.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {respondentCount} respondents ·{" "}
              {selections.reduce((sum, item) => sum + item.count, 0)} selections
            </p>
            <CountBars
              categories={selections}
              respondentCount={respondentCount}
              type="multi-select-bars"
            />
          </>
        )}
        {answers.length > 0 && (
          <TextAnswerList
            answers={answers}
            prompt={prompt}
            questionType={type}
          />
        )}
        {files.length > 0 && (
          <div className="overflow-hidden rounded-md border border-white/10">
            <div className="flex min-h-11 items-center border-b border-border/70 bg-background/40 px-3 text-xs text-muted-foreground">
              {files.length} uploaded {files.length === 1 ? "file" : "files"}
            </div>
            <div
              aria-label={`${files.length} uploaded files for ${prompt}`}
              className="max-h-72 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              tabIndex={0}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-20">Response</TableHead>
                    <TableHead>Uploaded file</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow
                      key={`${textValue(file.attachmentId ?? file.legacyObjectName, "file")}-${index}`}
                    >
                      <TableCell className="align-top font-mono text-xs text-muted-foreground">
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <FormResponseValue questionType="file" value={file} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {categories.length === 0 &&
          selections.length === 0 &&
          distribution.length === 0 &&
          answers.length === 0 &&
          files.length === 0 && (
            <p className="text-muted-foreground">
              {textValue(summary.responseCount, "0")} responses
            </p>
          )}
      </div>
    </article>
  );
}

function ResponseDetailDialog({
  deletePending,
  onDelete,
  onOpenChange,
  response,
}: {
  deletePending: boolean;
  onDelete: (responseId: string) => void;
  onOpenChange: (open: boolean) => void;
  response?: IdentifiedFormResponse;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setConfirmingDelete(false);
        onOpenChange(open);
      }}
      open={response !== undefined}
    >
      <DialogContent className="flex h-[100svh] max-h-[100svh] max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90svh] sm:max-w-3xl sm:rounded-lg">
        <DialogHeader className="shrink-0 border-b border-border/70 p-5 pr-12">
          <DialogTitle>{response?.member.name ?? "Response"}</DialogTitle>
          <DialogDescription>
            {response?.member.email} ·{" "}
            {response
              ? new Date(response.submittedAt).toLocaleString()
              : "Submitted response"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <dl className="grid gap-3">
            {response &&
              Object.entries(response.answers).map(([questionId, value]) => {
                const question = response.snapshot.questions.find(
                  (candidate) => candidate.id === questionId,
                );
                const prompt = question?.prompt ?? questionId;
                return (
                  <div
                    className="rounded-md border border-white/10 bg-background/60 p-3"
                    key={questionId}
                  >
                    <dt className="text-xs font-medium text-muted-foreground">
                      {prompt}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                      <FormResponseValue
                        questionType={question?.type}
                        value={value}
                      />
                    </dd>
                  </div>
                );
              })}
          </dl>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border/70 p-4 sm:items-center sm:justify-between sm:space-x-0">
          {confirmingDelete ? (
            <>
              <p className="mr-auto text-sm text-destructive">
                Deletes this response and its files. Callback effects remain.
              </p>
              <Button
                className="min-h-11"
                onClick={() => setConfirmingDelete(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11 gap-2"
                disabled={deletePending || !response}
                onClick={() => response && onDelete(response.responseId)}
                variant="destructive"
              >
                {deletePending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete permanently
              </Button>
            </>
          ) : (
            <Button
              className="min-h-11 gap-2 sm:mr-auto"
              onClick={() => setConfirmingDelete(true)}
              variant="outline"
            >
              <Trash2 className="size-4" /> Delete response
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IdentifiedResponses({
  deletePending,
  onDelete,
  responses,
}: {
  deletePending: boolean;
  onDelete: (responseId: string) => void;
  responses: readonly IdentifiedFormResponse[];
}) {
  const [query, setQuery] = useState("");
  const [selectedResponse, setSelectedResponse] =
    useState<IdentifiedFormResponse>();
  const filteredResponses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return responses;
    return responses.filter(
      ({ member }) =>
        member.name.toLowerCase().includes(normalized) ||
        member.email.toLowerCase().includes(normalized),
    );
  }, [query, responses]);
  return (
    <section
      className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/20"
      data-response-density="compact"
    >
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Individual responses</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredResponses.length} identified submissions
          </p>
        </div>
        <Input
          aria-label="Search responses"
          className="min-h-11 w-full text-base sm:w-72 sm:text-sm"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search member or email"
          value={query}
        />
      </div>

      <div
        aria-label="Identified form responses"
        className="max-h-[65svh] overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        tabIndex={0}
      >
        <div className="grid divide-y divide-border/70 md:hidden">
          {filteredResponses.map((response) => (
            <article className="grid gap-3 p-4" key={response.responseId}>
              <div className="min-w-0">
                <p className="truncate font-medium">{response.member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {response.member.email}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{new Date(response.submittedAt).toLocaleString()}</span>
                <span>{Object.keys(response.answers).length} answers</span>
              </div>
              <Button
                className="min-h-11 gap-2"
                onClick={() => setSelectedResponse(response)}
                variant="outline"
              >
                <Eye className="size-4" /> View response
              </Button>
            </article>
          ))}
        </div>
        <div className="hidden min-w-[42rem] md:block">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponses.map((response) => (
                <TableRow key={response.responseId}>
                  <TableCell className="max-w-72">
                    <p className="truncate font-medium">
                      {response.member.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {response.member.email}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(response.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {Object.keys(response.answers).length} answers
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      className="min-h-11 gap-2"
                      onClick={() => setSelectedResponse(response)}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="size-4" /> View response
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredResponses.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {responses.length === 0
              ? "No responses yet."
              : "No responses match that search."}
          </p>
        )}
      </div>

      <ResponseDetailDialog
        deletePending={deletePending}
        onDelete={onDelete}
        onOpenChange={(open) => !open && setSelectedResponse(undefined)}
        response={selectedResponse}
      />
    </section>
  );
}

function workspaceHref(
  pathname: string,
  searchParams: URLSearchParams,
  view: string,
) {
  const next = new URLSearchParams(searchParams);
  if (view === "analytics") next.delete("view");
  else next.set("view", view);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function FormResponsesDashboard({ formId }: { formId: string }) {
  const utils = api.useUtils();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView =
    requestedView === "responses" || requestedView === "delivery"
      ? requestedView
      : "analytics";
  const responses = api.forms.listResponses.useQuery({ formId });
  const callbacks = api.forms.listCallbackExecutions.useQuery({ formId });
  const exportQuery = api.forms.exportResponses.useQuery(
    { formId },
    { enabled: false },
  );
  const deleteResponse = api.forms.deleteResponse.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.forms.listResponses.invalidate({ formId }),
        utils.forms.listCallbackExecutions.invalidate({ formId }),
      ]);
    },
  });
  const retry = api.forms.retryCallback.useMutation({
    async onSuccess() {
      await utils.forms.listCallbackExecutions.invalidate({ formId });
    },
  });

  async function exportCsv() {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `form-${formId}-responses.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-5 sm:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Button asChild variant="ghost" className="-ml-3 min-h-11 gap-2">
            <Link href={`/admin/forms/${formId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Form builder
            </Link>
          </Button>
          <h1 className="mt-2 break-words text-3xl font-semibold sm:text-4xl">
            {responses.data?.form.name ?? "Form responses"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review aggregate trends, individual submissions, and callback
            delivery.
          </p>
        </div>
        <Button
          className="min-h-11 gap-2"
          disabled={exportQuery.isFetching}
          onClick={() => void exportCsv()}
          variant="outline"
        >
          <Download className="size-4" aria-hidden="true" /> Export CSV
        </Button>
      </header>

      {responses.isLoading ? (
        <p
          className="rounded-lg border border-white/10 bg-card/95 p-6"
          role="status"
        >
          Loading responses…
        </p>
      ) : responses.error ? (
        <p
          className="rounded-lg border border-destructive/40 bg-card/95 p-6 text-destructive"
          role="alert"
        >
          {responses.error.message}
        </p>
      ) : (
        <Tabs
          onValueChange={(view) =>
            router.replace(workspaceHref(pathname, searchParams, view), {
              scroll: false,
            })
          }
          value={activeView}
        >
          <TabsList className="grid h-auto min-h-11 w-full grid-cols-3 p-1 sm:w-auto">
            <TabsTrigger className="min-h-11 gap-2 px-2" value="analytics">
              <BarChart3 className="hidden size-4 sm:block" /> Analytics
            </TabsTrigger>
            <TabsTrigger className="min-h-11 gap-2 px-2" value="responses">
              <Users className="hidden size-4 sm:block" /> Responses
            </TabsTrigger>
            <TabsTrigger className="min-h-11 gap-2 px-2" value="delivery">
              <Workflow className="hidden size-4 sm:block" /> Delivery
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4 grid gap-4" value="analytics">
            <section
              aria-label="Response totals"
              className="grid overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/15 sm:grid-cols-2 sm:divide-x sm:divide-border/70"
            >
              <div className="border-b border-border/70 p-4 sm:border-b-0">
                <p className="text-sm text-muted-foreground">Responses</p>
                <p className="mt-1 font-mono text-3xl font-semibold">
                  {responses.data?.analytics.responseCount ?? 0}
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Questions summarized
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold">
                  {
                    Object.keys(responses.data?.analytics.byQuestion ?? {})
                      .length
                  }
                </p>
              </div>
            </section>
            <section
              aria-labelledby="question-summaries-heading"
              className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/20"
              data-analytics-layout="consolidated"
            >
              <header className="border-b border-border/70 p-4 sm:p-5">
                <h2
                  id="question-summaries-heading"
                  className="text-lg font-semibold"
                >
                  Question analytics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One compact section per question. Tables stay bounded and
                  charts use the shared Blade chart system.
                </p>
              </header>
              <div className="divide-y divide-border/70">
                {Object.entries(responses.data?.analytics.byQuestion ?? {}).map(
                  ([questionId, summary]) => (
                    <ResponseAnalyticsCard key={questionId} summary={summary} />
                  ),
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent className="mt-4" value="responses">
            <IdentifiedResponses
              deletePending={deleteResponse.isPending}
              onDelete={(responseId) => {
                deleteResponse.mutate({ formId, responseId });
              }}
              responses={responses.data?.responses ?? []}
            />
          </TabsContent>

          <TabsContent className="mt-4" value="delivery">
            <section className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/20 sm:p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Callback delivery</h2>
              </div>
              <div className="mt-4 grid max-h-[65svh] gap-2 overflow-y-auto overscroll-contain pr-1">
                {callbacks.data?.map((execution) => (
                  <article
                    className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    key={execution.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-medium">
                          {execution.callbackSlug}
                        </span>
                        <Badge
                          variant={
                            execution.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {execution.status}
                        </Badge>
                      </div>
                      {execution.lastError && (
                        <p className="mt-1 break-words text-sm text-destructive">
                          {execution.lastError}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Attempts: {execution.attempts}
                      </p>
                    </div>
                    {execution.status === "failed" && (
                      <Button
                        className="min-h-11 gap-2"
                        disabled={retry.isPending}
                        onClick={() =>
                          retry.mutate({ executionId: execution.id })
                        }
                        variant="outline"
                      >
                        {retry.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}{" "}
                        Retry
                      </Button>
                    )}
                  </article>
                ))}
                {callbacks.isLoading && (
                  <p className="text-sm text-muted-foreground" role="status">
                    Loading callback delivery…
                  </p>
                )}
                {callbacks.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No callback executions.
                  </p>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}

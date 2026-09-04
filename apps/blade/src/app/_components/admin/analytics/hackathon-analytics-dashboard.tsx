"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarRange,
  ChartNoAxesCombined,
  ClipboardList,
  Download,
  FileArchive,
  FileBarChart,
  Loader2,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@forge/api";
import type {
  HackathonAnalyticsDemographic,
  HackathonAnalyticsExportKind,
  HackathonAnalyticsReportInput,
  HackathonAnalyticsSection,
} from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Skeleton } from "@forge/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";
import {
  AnalyticsMetricCard as MetricCard,
  AnalyticsMetricGrid as MetricGrid,
} from "./analytics-metric-card";
import { buildHackathonAnalyticsSearchParams } from "./hackathon-params";

type HackathonReport = RouterOutputs["analytics"]["getHackathonReport"];
type IdentifiedRows =
  | RouterOutputs["analytics"]["getHackathonIdentifiedRows"]
  | null;
type HackathonOptions =
  RouterOutputs["analytics"]["listHackathonOptions"]["options"];
type ResumePool =
  | "current_confirmed"
  | "current_selected"
  | "custom_current_statuses"
  | "on_site";
type ResumeStatus =
  | "accepted"
  | "checkedin"
  | "confirmed"
  | "denied"
  | "pending"
  | "waitlisted"
  | "withdrawn";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "Applications" },
  { id: "events", label: "Events" },
  { id: "live_operations", label: "Live operations" },
  { id: "audience", label: "Audience" },
  { id: "reports", label: "Reports" },
] as const;

const demographics: Record<HackathonAnalyticsDemographic, string> = {
  gender: "Gender",
  race_or_ethnicity: "Race / ethnicity",
  age: "Age group",
  inferred_year_of_study: "Class year (inferred)",
  level_of_study: "Level of study",
  major: "Major",
  school: "School",
  graduation: "Graduation cohort",
  country: "Country",
  first_time_status: "First-time status",
  shirt_size: "Shirt size",
};

const priorityDemographics = [
  "gender",
  "race_or_ethnicity",
  "age",
  "inferred_year_of_study",
  "level_of_study",
  "major",
] as const satisfies readonly HackathonAnalyticsDemographic[];

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        style: "percent",
      }).format(value);
}

function date(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function time(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function pageSlice<T>(rows: readonly T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  return rows.slice((safePage - 1) * pageSize, safePage * pageSize);
}

function Panel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-card/95 p-4 shadow-lg shadow-black/15 sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-border/70 px-5 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function TablePager({
  label,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  total,
}: {
  label: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const first = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(total, safePage * pageSize);
  return (
    <div
      aria-label={`${label} pagination`}
      className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
    >
      <span>
        Showing {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger
            aria-label={`${label} rows per page`}
            className="h-8 w-24"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} rows
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          size="sm"
          variant="outline"
        >
          Previous
        </Button>
        <span className="font-mono">
          {safePage}/{pageCount}
        </span>
        <Button
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          size="sm"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function CompositionPie({
  slices,
  total,
}: {
  slices: HackathonReport["audience"]["composition"]["slices"];
  total: number;
}) {
  const cssColor = (color: string) =>
    color.startsWith("var(") ? `hsl(${color})` : color;
  const stops = slices.map((slice, index) => {
    const precedingCount = slices
      .slice(0, index)
      .reduce((sum, precedingSlice) => sum + precedingSlice.count, 0);
    const start = total === 0 ? 0 : (precedingCount / total) * 100;
    const end =
      total === 0 ? 0 : ((precedingCount + slice.count) / total) * 100;
    return `${cssColor(slice.color)} ${start}% ${end}%`;
  });
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(220px,0.7fr)_1.3fr]">
      <div className="relative mx-auto size-56">
        <div
          aria-label={`Composition of ${number(total)} profiles`}
          className="size-full rounded-full"
          role="img"
          style={{
            background:
              stops.length === 0
                ? "hsl(var(--muted))"
                : `conic-gradient(${stops.join(",")})`,
          }}
        />
        <div className="absolute inset-[27%] grid place-items-center rounded-full border border-border/60 bg-card text-center shadow-inner">
          <span className="font-mono text-2xl font-semibold">
            {number(total)}
          </span>
          <span className="text-xs text-muted-foreground">people</span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {slices.map((slice) => (
          <div
            className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/60 bg-card/95 px-3 py-2"
            key={slice.category}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: cssColor(slice.color) }}
              />
              <span className="truncate">{slice.category}</span>
            </span>
            <span className="shrink-0 font-mono text-sm">
              {number(slice.count)} ·{" "}
              {percent(total ? slice.count / total : null)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HackerAnalyticsProfile({
  attendeeId,
  hackathonId,
  onClose,
}: {
  attendeeId: string;
  hackathonId: string;
  onClose: () => void;
}) {
  const profile = api.analytics.getHackerAnalyticsProfile.useQuery({
    attendeeId,
    hackathonId,
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-card/95 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {profile.data?.displayName ?? "Hacker analytics profile"}
          </DialogTitle>
          <DialogDescription>
            Read-only event and application context. Contact, resume, DOB,
            application text, consent, and blacklist data are excluded.
          </DialogDescription>
        </DialogHeader>
        {!profile.data ? (
          <div className="min-h-40">
            {profile.error ? (
              <p className="grid min-h-40 place-items-center text-sm text-destructive">
                {profile.error.message}
              </p>
            ) : (
              <div
                aria-label="Hacker analytics profile loading"
                aria-busy="true"
                className="grid gap-3 sm:grid-cols-2"
              >
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    className="rounded-md border border-border/60 bg-card/95 p-3"
                    key={index}
                  >
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-2 h-4 w-32 max-w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Status", profile.data.status],
              ["Points", number(profile.data.points)],
              ["Checked in", date(profile.data.checkedInAt)],
              ["Class", profile.data.className ?? "Unassigned"],
              ["VIP", profile.data.isVip ? "Yes" : "No"],
              ["School", profile.data.school],
              ["Major", profile.data.major],
              ["Level of study", profile.data.levelOfStudy],
              ["Inferred year", profile.data.inferredYearOfStudy],
              ["Graduation", profile.data.graduationTerm],
              ["Age band", profile.data.ageBand],
              ["First-time status", profile.data.firstTimeStatus],
              ["Gender", profile.data.gender],
              ["Race / ethnicity", profile.data.raceOrEthnicity],
              ["Shirt size", profile.data.shirtSize],
              [
                "Events attended",
                number(profile.data.eventSummary.distinctEvents),
              ],
            ].map(([label, value]) => (
              <div
                className="rounded-md border border-border/60 bg-card/95 p-3"
                key={label}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HackathonExportButton({
  input,
  kind,
}: {
  input: HackathonAnalyticsReportInput;
  kind: HackathonAnalyticsExportKind;
}) {
  const utils = api.useUtils();
  const [pending, setPending] = useState(false);
  const download = async () => {
    setPending(true);
    try {
      const result = await utils.analytics.exportHackathonReport.fetch({
        kind,
        report: input,
      });
      const url = URL.createObjectURL(
        new Blob([result.content], { type: result.mimeType }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("The hackathon analytics CSV could not be prepared.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Button
      className="mt-5 gap-2"
      disabled={pending}
      onClick={download}
      variant="outline"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {pending ? "Preparing…" : "Download CSV"}
    </Button>
  );
}

export function HackathonAnalyticsDashboard({
  canAccessClub,
  canPrepareResumes,
  comparisonByHackathonId = {},
  identifiedRows,
  input,
  options,
  report,
}: {
  canAccessClub: boolean;
  canPrepareResumes: boolean;
  comparisonByHackathonId?: Record<string, string | null>;
  identifiedRows: IdentifiedRows;
  input: HackathonAnalyticsReportInput;
  options: HackathonOptions;
  report: HackathonReport;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [arrivalView, setArrivalView] = useState<"overall" | "class">(
    "overall",
  );
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(
    null,
  );
  const [resumePolicyAcknowledged, setResumePolicyAcknowledged] =
    useState(false);
  const [resumePool, setResumePool] = useState<ResumePool>("current_confirmed");
  const [resumeStatuses, setResumeStatuses] = useState<ResumeStatus[]>([]);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [audiencePage, setAudiencePage] = useState(1);
  const [audiencePageSize, setAudiencePageSize] = useState(10);
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(10);
  const [eventSort, setEventSort] = useState<"attendance" | "name" | "start">(
    "attendance",
  );
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsPageSize, setPointsPageSize] = useState(10);
  const [pointsSort, setPointsSort] = useState<"events" | "name" | "points">(
    "points",
  );
  const resumePreview = api.analytics.previewResumeBundle.useQuery(
    {
      currentStatuses: resumeStatuses,
      hackathonId: input.hackathonId,
      policyAcknowledged: true,
      policyVersion: "resume-sensitive-index-v1",
      pool: resumePool,
      scope: "hackathon",
    },
    {
      enabled:
        canPrepareResumes &&
        resumePolicyAcknowledged &&
        input.section === "reports" &&
        (resumePool !== "custom_current_statuses" || resumeStatuses.length > 0),
      retry: false,
    },
  );
  const navigate = (patch: Partial<HackathonAnalyticsReportInput>) => {
    const next = { ...input, ...patch };
    const params = buildHackathonAnalyticsSearchParams(next);
    startTransition(() => router.push(`?${params.toString()}`));
  };
  const selectedEvent = report.options.events.find(
    (event) => event.id === input.eventId,
  );
  const arrivalRows = useMemo(
    () =>
      report.events.arrivals?.buckets.map((bucket) => ({
        cumulative: bucket.cumulativeCount,
        interval: bucket.intervalCount,
        label: time(bucket.startAt),
      })) ?? [],
    [report.events.arrivals],
  );
  const classArrivalMax = useMemo(
    () =>
      Math.max(
        1,
        ...(report.events.arrivals?.classSeries.flatMap((series) =>
          series.buckets.map((bucket) => bucket.count),
        ) ?? []),
      ),
    [report.events.arrivals],
  );
  const applicationPaceRows = useMemo(() => {
    const rows = new Map<
      number,
      {
        comparisonCumulative?: number;
        comparisonInterval?: number;
        currentCumulative?: number;
        currentInterval?: number;
        elapsedDay: number;
      }
    >();
    const add = (
      buckets: HackathonReport["applications"]["dailyBuckets"],
      prefix: "comparison" | "current",
    ) => {
      buckets.forEach((bucket) => {
        const row = rows.get(bucket.elapsedDay) ?? {
          elapsedDay: bucket.elapsedDay,
        };
        row[`${prefix}Cumulative`] = bucket.cumulativeCount;
        row[`${prefix}Interval`] = bucket.intervalCount;
        rows.set(bucket.elapsedDay, row);
      });
    };
    add(report.applications.dailyBuckets, "current");
    if (report.comparison) {
      add(report.comparison.applicationDailyBuckets, "comparison");
    }
    return [...rows.values()].sort(
      (left, right) => left.elapsedDay - right.elapsedDay,
    );
  }, [report.applications.dailyBuckets, report.comparison]);
  const sortedEventRows = useMemo(
    () =>
      [...report.events.eventRows].sort((left, right) => {
        if (eventSort === "name") return left.name.localeCompare(right.name);
        if (eventSort === "start") {
          return (
            new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
          );
        }
        return (
          right.distinctAttendance - left.distinctAttendance ||
          left.name.localeCompare(right.name)
        );
      }),
    [eventSort, report.events.eventRows],
  );
  const visibleEventRows = pageSlice(sortedEventRows, eventPage, eventPageSize);
  const sortedPointRows = useMemo(
    () =>
      [...(identifiedRows?.points ?? [])].sort((left, right) => {
        if (pointsSort === "name") return left.name.localeCompare(right.name);
        if (pointsSort === "events") {
          return (
            right.distinctEvents - left.distinctEvents ||
            left.name.localeCompare(right.name)
          );
        }
        return (
          right.points - left.points || left.name.localeCompare(right.name)
        );
      }),
    [identifiedRows?.points, pointsSort],
  );
  const visiblePointRows = pageSlice(
    sortedPointRows,
    pointsPage,
    pointsPageSize,
  );
  const audienceQuery = audienceSearch
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase();
  const searchedCompositionRows = useMemo(() => {
    return audienceQuery
      ? report.audience.composition.rows.filter((row) =>
          row.category
            .normalize("NFKC")
            .toLocaleLowerCase()
            .includes(audienceQuery),
        )
      : report.audience.composition.rows;
  }, [audienceQuery, report.audience.composition.rows]);
  const searchedEngagementRows = useMemo(() => {
    return audienceQuery
      ? report.audience.rows.filter((row) =>
          row.category
            .normalize("NFKC")
            .toLocaleLowerCase()
            .includes(audienceQuery),
        )
      : report.audience.rows;
  }, [audienceQuery, report.audience.rows]);
  const searchedAudienceCount =
    input.audienceView === "composition"
      ? searchedCompositionRows.length
      : searchedEngagementRows.length;
  const visibleCompositionRows = pageSlice(
    searchedCompositionRows,
    audiencePage,
    audiencePageSize,
  );
  const visibleEngagementRows = pageSlice(
    searchedEngagementRows,
    audiencePage,
    audiencePageSize,
  );
  const engagementChartRows = searchedEngagementRows.slice(0, 12);
  const currentStatusCount = (status: ResumeStatus) =>
    report.applications.statusRows.find((row) => row.status === status)
      ?.count ?? 0;
  const selectDemographic = (demographic: HackathonAnalyticsDemographic) => {
    setAudiencePage(1);
    setAudienceSearch("");
    navigate({ demographic });
  };

  const content: Record<HackathonAnalyticsSection, () => ReactNode> = {
    overview: () => (
      <div className="space-y-4">
        <MetricGrid>
          <MetricCard
            definition="Every retained application for this hackathon, including withdrawn applications."
            detail={`${number(report.overview.pipeline.pendingReview)} pending review`}
            label="Applicants"
            value={number(report.overview.pipeline.applicants)}
          />
          <MetricCard
            definition="Applications whose current status is pending review."
            detail="Current review queue"
            label="Pending review"
            value={number(currentStatusCount("pending"))}
          />
          <MetricCard
            definition="Applications whose current status is accepted. Confirmed and checked-in hackers are shown separately."
            detail="Current status"
            label="Accepted"
            value={number(currentStatusCount("accepted"))}
          />
          <MetricCard
            definition="Applications whose current status is confirmed. Checked-in hackers are shown separately."
            detail="Current status"
            label="Confirmed"
            value={number(currentStatusCount("confirmed"))}
          />
          <MetricCard
            definition="Whole-hack checked-in cohort, with a current-status fallback for legacy rows."
            detail={`${percent(report.overview.pipeline.knownConfirmedToCheckInRate)} of hackers known to have confirmed`}
            label="Checked in"
            value={number(report.overview.pipeline.onSite)}
          />
        </MetricGrid>
        {report.comparison ? (
          <Panel
            description={`Current snapshot compared with ${report.comparison.hackathon.displayName}. Deltas are current minus comparison; they do not imply causation.`}
            title="Hack-over-hack comparison"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(
                [
                  ["Applicants", report.comparison.pipeline.applicants],
                  ["Pending review", report.comparison.pipeline.pending],
                  ["Accepted", report.comparison.pipeline.accepted],
                  ["Confirmed", report.comparison.pipeline.confirmed],
                  ["Checked in", report.comparison.pipeline.checkedIn],
                ] as const
              ).map(([label, value]) => (
                <div
                  className="rounded-md border border-border/60 bg-card/95 p-3"
                  key={label}
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold">
                    {number(value.current)}
                  </p>
                  <p
                    className={`mt-1 text-xs ${value.delta > 0 ? "text-emerald-400" : value.delta < 0 ? "text-amber-400" : "text-muted-foreground"}`}
                  >
                    {value.delta > 0 ? "+" : ""}
                    {number(value.delta)} · {percent(value.rateDelta)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
        <Panel
          description="A fixed evidence register across demand, conversion, preparation, live operations, event engagement, and measurement. Cards describe the data without inventing severity."
          title="Organizer action brief"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {report.overview.actionBrief.map((item) => (
              <button
                className="group flex h-full flex-col items-stretch justify-start rounded-lg border border-border/70 bg-card/95 p-4 text-left align-top transition hover:border-primary/45 hover:bg-primary/[0.08]"
                key={item.kind}
                onClick={() => navigate({ section: item.navigation.section })}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">
                    {item.available ? "Available" : "Coverage gap"}
                  </Badge>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 font-medium capitalize">
                  {item.kind.replaceAll("_", " ")}
                </h3>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  {item.evidence.map((evidence) => (
                    <span
                      className="flex justify-between gap-3"
                      key={evidence.key}
                    >
                      <span>{evidence.key.replaceAll("_", " ")}</span>
                      <span className="font-mono text-foreground">
                        {evidence.value === null
                          ? "—"
                          : evidence.key.endsWith("_rate") ||
                              evidence.key === "event_reach"
                            ? percent(evidence.value)
                            : number(evidence.value)}
                      </span>
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    ),
    applications: () => (
      <div className="space-y-4">
        <MetricGrid>
          <MetricCard
            definition="Every retained application for the selected hackathon, including withdrawn applications."
            detail="Current application pool"
            label="Applications"
            value={number(report.overview.pipeline.applicants)}
          />
          <MetricCard
            definition="Applications whose exact current status is pending review."
            detail="Present-state workload"
            label="Pending review"
            value={number(report.overview.pipeline.pendingReview)}
          />
          <MetricCard
            definition="Applications whose current status is accepted. Later status changes overwrite this value."
            detail="Exact current status"
            label="Accepted"
            value={number(currentStatusCount("accepted"))}
          />
          <MetricCard
            definition="Applications whose current status is confirmed. Checked-in hackers are counted separately."
            detail="Exact current status"
            label="Confirmed"
            value={number(currentStatusCount("confirmed"))}
          />
          <MetricCard
            definition="Whole-hack checked-in cohort, using the documented legacy status fallback when needed."
            detail={`${percent(report.overview.pipeline.knownConfirmedToCheckInRate)} of hackers known to have confirmed`}
            label="Checked in"
            value={number(report.overview.pipeline.onSite)}
          />
          <MetricCard
            definition="Applications whose current status is withdrawn."
            detail="Retained in total demand"
            label="Withdrawn"
            value={number(report.overview.pipeline.withdrawn)}
          />
          <MetricCard
            definition="Applications recorded in the final seven days before the deadline."
            detail="Demand near the deadline"
            label="Final 7 days"
            value={number(report.applications.finalSevenDayCount)}
          />
          <MetricCard
            definition="Hackers currently confirmed or checked in with a stored confirmation timestamp."
            detail={`${number(report.applications.confirmationTimeCoverage.numerator)} of ${number(report.applications.confirmationTimeCoverage.denominator)} timestamps`}
            label="Timestamp coverage"
            value={percent(report.applications.confirmationTimeCoverage.rate)}
          />
          <MetricCard
            definition="The next configured application or confirmation deadline after this report was generated."
            detail={
              report.applications.nextDeadline
                ? `${Math.max(0, Math.ceil(report.applications.nextDeadline.millisecondsRemaining / 86_400_000))} day(s) remaining`
                : "All configured deadlines have passed"
            }
            label="Next deadline"
            value={
              report.applications.nextDeadline
                ? date(report.applications.nextDeadline.at)
                : "Complete"
            }
          />
        </MetricGrid>
        <Panel
          description="Application status is mutable: accepted is overwritten by confirmed, then by checked in. Exact historical acceptance conversion cannot be reconstructed for legacy hackathons without a transition ledger."
          title="Funnel conversion quality"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border/60 bg-card/95 p-3">
              <p className="text-sm font-medium">Pending → accepted</p>
              <p className="mt-2 font-mono text-xl">Unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Historical acceptance is not stored.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-card/95 p-3">
              <p className="text-sm font-medium">Accepted → confirmed</p>
              <p className="mt-2 font-mono text-xl">Unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A current-state ratio would overstate conversion.
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-card/95 p-3">
              <p className="text-sm font-medium">Confirmed → checked in</p>
              <p className="mt-2 font-mono text-xl">
                {percent(report.overview.pipeline.knownConfirmedToCheckInRate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {number(report.overview.pipeline.knownConfirmedCheckedIn)} of{" "}
                {number(report.overview.pipeline.knownConfirmed)} hackers known
                to have confirmed
              </p>
            </div>
          </div>
        </Panel>
        <Panel
          description="Daily interval and cumulative applications aligned to elapsed days from application open."
          title="Application pace"
        >
          <ChartContainer
            className="h-72 w-full"
            config={{
              comparisonCumulative: {
                color: "hsl(var(--chart-4))",
                label: report.comparison
                  ? `${report.comparison.hackathon.displayName} cumulative`
                  : "Comparison cumulative",
              },
              currentCumulative: {
                color: "hsl(var(--chart-1))",
                label: "Selected hack cumulative",
              },
              currentInterval: {
                color: "hsl(var(--chart-2))",
                label: "Selected hack daily",
              },
            }}
          >
            <LineChart accessibilityLayer data={applicationPaceRows}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="elapsedDay"
                interval="preserveStartEnd"
                minTickGap={32}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {report.applications.deadlineMarkers.map((marker) => (
                <ReferenceLine
                  key={marker.kind}
                  label={{
                    fill: "hsl(var(--muted-foreground))",
                    position: "insideTopLeft",
                    value:
                      marker.kind === "application"
                        ? "App deadline"
                        : "Confirm deadline",
                  }}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  x={marker.elapsedDay}
                />
              ))}
              <Line
                dataKey="currentCumulative"
                stroke="var(--color-currentCumulative)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="currentInterval"
                stroke="var(--color-currentInterval)"
                dot={false}
                isAnimationActive={false}
              />
              {report.comparison ? (
                <>
                  <ReferenceLine
                    label={{
                      fill: "hsl(var(--chart-4))",
                      position: "insideBottomLeft",
                      value: "Prior app",
                    }}
                    stroke="var(--color-comparisonCumulative)"
                    strokeDasharray="2 4"
                    x={Math.max(
                      0,
                      (new Date(
                        report.comparison.hackathon.applicationDeadline,
                      ).getTime() -
                        new Date(
                          report.comparison.hackathon.applicationOpen,
                        ).getTime()) /
                        86_400_000,
                    )}
                  />
                  <ReferenceLine
                    label={{
                      fill: "hsl(var(--chart-4))",
                      position: "insideBottomLeft",
                      value: "Prior confirm",
                    }}
                    stroke="var(--color-comparisonCumulative)"
                    strokeDasharray="2 4"
                    x={Math.max(
                      0,
                      (new Date(
                        report.comparison.hackathon.confirmationDeadline,
                      ).getTime() -
                        new Date(
                          report.comparison.hackathon.applicationOpen,
                        ).getTime()) /
                        86_400_000,
                    )}
                  />
                  <Line
                    dataKey="comparisonCumulative"
                    stroke="var(--color-comparisonCumulative)"
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              ) : null}
            </LineChart>
          </ChartContainer>
          <div className="mt-4 max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elapsed day</TableHead>
                  <TableHead className="text-right">Selected daily</TableHead>
                  <TableHead className="text-right">
                    Selected cumulative
                  </TableHead>
                  {report.comparison ? (
                    <TableHead className="text-right">
                      Comparison cumulative
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationPaceRows.map((row) => (
                  <TableRow key={row.elapsedDay}>
                    <TableCell>{row.elapsedDay}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.currentInterval ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.currentCumulative ?? "—"}
                    </TableCell>
                    {report.comparison ? (
                      <TableCell className="text-right font-mono">
                        {row.comparisonCumulative ?? "—"}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <Panel
          description="Recorded confirmation timestamps aligned to elapsed days from application open. Coverage is shown above because current statuses can exist without timestamps."
          title="Confirmation cadence"
        >
          <ChartContainer
            className="h-64 w-full"
            config={{
              cumulative: {
                color: "hsl(var(--chart-1))",
                label: "Cumulative",
              },
              interval: { color: "hsl(var(--chart-3))", label: "Daily" },
            }}
          >
            <LineChart
              accessibilityLayer
              data={report.applications.confirmationBuckets}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="elapsedDay" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="cumulativeCount"
                stroke="var(--color-cumulative)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="intervalCount"
                stroke="var(--color-interval)"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          <div className="mt-4 max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elapsed day</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.applications.confirmationBuckets.map((row) => (
                  <TableRow key={row.elapsedDay}>
                    <TableCell>{row.elapsedDay}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.intervalCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.cumulativeCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            description="Current application states; this is not a transition history."
            title="Current status distribution"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.applications.statusRows.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell className="capitalize">
                      {canPrepareResumes ? (
                        <Link
                          className="font-medium text-primary hover:underline"
                          href={`/admin/hackers?hackathon=${encodeURIComponent(input.hackathonId)}&status=${encodeURIComponent(row.status)}`}
                        >
                          {row.status}
                        </Link>
                      ) : (
                        row.status
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel
            description="Age of applications still pending review. Future/invalid timestamps remain explicit."
            title="Pending review age"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.applications.pendingAgeRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <Panel
          description={`${number(report.applications.dietary.recorded)} applicant responses recorded; tags are multi-select and free text remains private.`}
          title="Dietary demand"
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {report.applications.dietary.tags.map((row) => (
              <div
                className="flex justify-between rounded-md border border-border/60 bg-card/95 px-3 py-2"
                key={row.tag}
              >
                <span>{row.tag}</span>
                <span className="font-mono">{number(row.count)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          description={`Exact current statuses by ${demographics[input.demographic].toLowerCase()}. These columns do not pretend mutable statuses are historical conversion.`}
          title="Application status by demographic"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Checked in</TableHead>
                  <TableHead className="text-right">
                    Confirmed → check-in
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.applications.breakdowns[input.demographic].map(
                  (row) => (
                    <TableRow key={row.category}>
                      <TableCell className="min-w-48 font-medium">
                        {row.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {number(row.applicantCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {percent(row.applicantShare)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {number(row.acceptedCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {number(row.confirmedCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {number(row.checkedInCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {percent(row.knownConfirmedToCheckInRate)}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            description={`First-time status coverage: ${percent(report.applications.firstTimeState.coverage.rate)}. Unknown stays separate from returning.`}
            title="First-time demand"
          >
            <Table>
              <TableBody>
                {report.applications.firstTimeRows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell>{row.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.applicantCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel
            description={`Shirt-size coverage: ${percent(report.applications.shirtSizeCoverage.rate)}. Counts support purchasing against the current applicant pool.`}
            title="Shirt demand"
          >
            <Table>
              <TableBody>
                {report.applications.shirtSizeRows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell>{row.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.applicantCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </div>
    ),
    events: () => (
      <div className="space-y-4">
        <MetricGrid>
          <MetricCard
            definition="Distinct hacker-event pairs at matching events, including retained legacy attendance."
            detail={`${number(report.events.summary.occurrenceCount)} retained check-ins`}
            label="Distinct attendance"
            value={number(report.events.summary.distinctAttendance)}
          />
          <MetricCard
            definition="On-site hackers who attended at least one matching event."
            detail="On-site intersection"
            label="Event reach"
            value={percent(report.events.summary.eventReach)}
          />
          <MetricCard
            definition="Engaged hackers who attended at least two different matching events."
            detail="Repeated occurrences at one event do not qualify"
            label="Repeat engagement"
            value={percent(report.events.summary.repeatEventEngagedRate)}
          />
          <MetricCard
            definition="Sum of non-null event-award snapshots. Legacy rows without snapshots remain in attendance totals."
            detail={`${percent(report.events.summary.pointSnapshotCoverage.rate)} point coverage`}
            label="Event points awarded"
            value={
              report.events.summary.pointSnapshotCoverage.numerator === 0 &&
              report.events.summary.pointSnapshotCoverage.denominator > 0
                ? "—"
                : number(report.events.summary.pointsAwarded)
            }
          />
        </MetricGrid>
        <Panel
          description="Top event tags by unique hackers and retained check-ins. The complete event-type table below preserves every tag and its reach."
          title="Popular event tags"
        >
          {report.events.groupings.tag.length === 0 ? (
            <Empty>No event tags match these filters.</Empty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <ChartContainer
                  className="h-72 w-full min-w-[34rem]"
                  config={{
                    checkIns: {
                      color: "hsl(var(--chart-2))",
                      label: "Check-ins",
                    },
                    hackers: {
                      color: "hsl(var(--chart-1))",
                      label: "Unique hackers",
                    },
                  }}
                >
                  <BarChart
                    accessibilityLayer
                    data={report.events.groupings.tag
                      .slice(0, 8)
                      .map((row) => ({
                        category: row.category,
                        checkIns: row.occurrenceCount,
                        hackers: row.distinctAttendeeCount,
                      }))}
                    layout="vertical"
                    margin={{ left: 12, right: 16 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis allowDecimals={false} type="number" />
                    <YAxis
                      axisLine={false}
                      dataKey="category"
                      tickLine={false}
                      type="category"
                      width={112}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="hackers"
                      fill="var(--color-hackers)"
                      isAnimationActive={false}
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="checkIns"
                      fill="var(--color-checkIns)"
                      isAnimationActive={false}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ background: "hsl(var(--chart-1))" }}
                  />
                  Unique hackers
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ background: "hsl(var(--chart-2))" }}
                  />
                  Check-ins
                </span>
              </div>
            </>
          )}
        </Panel>
        <Panel
          description="Every event in the active purpose, tag, and event filter. Legacy events and attendance stay visible; missing timestamp and point snapshots are disclosed as coverage gaps."
          title="Event performance"
        >
          {report.events.eventRows.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="hover:text-foreground"
                        onClick={() => setEventSort("name")}
                      >
                        Event ↕
                      </button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <button
                        className="hover:text-foreground"
                        onClick={() => setEventSort("start")}
                      >
                        Starts ↕
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="hover:text-foreground"
                        onClick={() => setEventSort("attendance")}
                      >
                        Hackers ↕
                      </button>
                    </TableHead>
                    <TableHead className="text-right">First</TableHead>
                    <TableHead className="text-right">Returning</TableHead>
                    <TableHead className="text-right">Check-ins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEventRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.legacy ? "Legacy / unknown" : row.tag}
                        </Badge>
                      </TableCell>
                      <TableCell>{date(row.startAt)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.distinctAttendance}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.firstAttendanceCount ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.returningAttendanceCount ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.occurrenceCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePager
                label="Event performance"
                onPageChange={setEventPage}
                onPageSizeChange={(size) => {
                  setEventPage(1);
                  setEventPageSize(size);
                }}
                page={eventPage}
                pageSize={eventPageSize}
                total={sortedEventRows.length}
              />
            </div>
          ) : (
            <Empty>No events match these filters.</Empty>
          )}
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            description="On-site hackers grouped by distinct matching events attended."
            title="Attendance frequency"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Events attended</TableHead>
                  <TableHead className="text-right">Hackers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.events.frequencyRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel
            description="Event reach within each assigned on-site class. Unassigned remains explicit."
            title="Class event reach"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">On site</TableHead>
                  <TableHead className="text-right">Engaged</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.events.classParticipationRows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell>{row.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.onSiteCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.eventEngagedCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {percent(row.eventReach)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <Panel
          description={`Elapsed hackathon attendance cadence. Timestamp coverage: ${number(report.events.timeline.timestampCoverage.numerator)} of ${number(report.events.timeline.timestampCoverage.denominator)} (${percent(report.events.timeline.timestampCoverage.rate)}).`}
          title="Attendance over the hackathon"
        >
          {report.events.timeline.timestampCoverage.numerator === 0 ? (
            <Empty>
              Arrival timestamps were not stored for these attendance rows.
              Event totals and tag popularity remain available above.
            </Empty>
          ) : (
            <>
              <ChartContainer
                className="h-64 w-full"
                config={{
                  cumulative: {
                    color: "hsl(var(--chart-1))",
                    label: "Cumulative occurrences",
                  },
                  interval: {
                    color: "hsl(var(--chart-2))",
                    label: "Interval occurrences",
                  },
                }}
              >
                <LineChart
                  accessibilityLayer
                  data={report.events.timeline.buckets.map((row) => ({
                    cumulative: row.cumulativeOccurrenceCount,
                    interval: row.occurrenceCount,
                    label: date(row.startAt),
                  }))}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" minTickGap={28} tickLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="interval"
                    dot={false}
                    isAnimationActive={false}
                    stroke="var(--color-interval)"
                  />
                  <Line
                    dataKey="cumulative"
                    dot={false}
                    isAnimationActive={false}
                    stroke="var(--color-cumulative)"
                  />
                </LineChart>
              </ChartContainer>
              <div className="mt-4 max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bucket start</TableHead>
                      <TableHead className="text-right">Occurrences</TableHead>
                      <TableHead className="text-right">Distinct</TableHead>
                      <TableHead className="text-right">Cumulative</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.events.timeline.buckets.map((row) => (
                      <TableRow key={String(row.startAt)}>
                        <TableCell>{date(row.startAt)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.occurrenceCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.distinctAttendance}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.cumulativeOccurrenceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          {(
            [
              ["Event type", report.events.groupings.tag],
              ["Weekday", report.events.groupings.weekday],
              ["Start-time band", report.events.groupings.startTime],
              ["Location", report.events.groupings.location],
              ["Duration", report.events.groupings.duration],
            ] as const
          ).map(([title, rows]) => (
            <Panel
              description="Event count, distinct attendance, and whole-hack on-site reach for this scheduling dimension."
              key={title}
              title={title}
            >
              <div className="max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.eventCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.distinctAttendance}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.eventReach)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          ))}
          <Panel
            description={`Attendance and reach crossed with ${demographics[input.demographic].toLowerCase()}.`}
            title="Attendance by audience"
          >
            <div className="max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Engaged</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Repeat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.events.demographicRows.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.eventEngagedCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {percent(row.eventReach)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {percent(row.repeatEventEngagedRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
        <Panel
          description="Select any event to see exact epoch-bucketed arrivals. Overall shows rush cadence; By class uses immutable successful check-in snapshots only."
          title={
            selectedEvent
              ? `${selectedEvent.name} arrivals`
              : "Event arrivals over time"
          }
        >
          {!report.events.arrivals ? (
            <Empty>
              Select an individual event above to inspect arrival cadence.
            </Empty>
          ) : (
            <>
              <div className="mb-3 flex rounded-md bg-muted/60 p-1 sm:w-fit">
                {(["overall", "class"] as const).map((view) => (
                  <Button
                    key={view}
                    size="sm"
                    variant={arrivalView === view ? "secondary" : "ghost"}
                    onClick={() => setArrivalView(view)}
                  >
                    {view === "overall" ? "Overall" : "By class"}
                  </Button>
                ))}
              </div>
              {arrivalView === "overall" ? (
                <ChartContainer
                  className="h-72 w-full"
                  config={{
                    cumulative: {
                      color: "hsl(var(--chart-1))",
                      label: "Cumulative",
                    },
                    interval: {
                      color: "hsl(var(--chart-2))",
                      label: "Interval",
                    },
                  }}
                >
                  <LineChart accessibilityLayer data={arrivalRows}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      minTickGap={28}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      label="Scheduled start"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      x={time(report.events.arrivals.schedule.startAt)}
                    />
                    <ReferenceLine
                      label="Scheduled end"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      x={time(report.events.arrivals.schedule.endAt)}
                    />
                    <Line
                      dataKey="interval"
                      stroke="var(--color-interval)"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="cumulative"
                      stroke="var(--color-cumulative)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="grid gap-3">
                  {report.events.arrivals.classSeries.map((series) => (
                    <div
                      className="rounded-md border border-border/60 p-3"
                      key={series.category}
                    >
                      <div className="mb-2 flex justify-between">
                        <span className="font-medium">{series.category}</span>
                        <span className="font-mono">
                          {number(
                            series.buckets.reduce(
                              (sum, bucket) => sum + bucket.count,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <div
                        aria-label={`${series.category} arrivals by interval`}
                        className="flex h-16 items-end gap-0.5 overflow-hidden"
                        role="img"
                      >
                        {series.buckets.map((bucket) => (
                          <div
                            className="min-w-0 flex-1 rounded-t-sm bg-primary/70"
                            key={String(bucket.startAt)}
                            style={{
                              height:
                                bucket.count === 0
                                  ? "0%"
                                  : `${Math.max(6, (bucket.count / classArrivalMax) * 100)}%`,
                            }}
                            title={`${date(bucket.startAt)}: ${bucket.count}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Schedule",
                    `${date(report.events.arrivals.schedule.startAt)} – ${date(report.events.arrivals.schedule.endAt)}`,
                  ],
                  [
                    "Peak interval",
                    report.events.arrivals.peakBucket
                      ? `${date(report.events.arrivals.peakBucket.startAt)} · ${number(report.events.arrivals.peakBucket.intervalCount)}`
                      : "—",
                  ],
                  [
                    "50% / 90% arrived",
                    `${date(report.events.arrivals.p50Bucket?.startAt ?? null)} / ${date(report.events.arrivals.p90Bucket?.startAt ?? null)}`,
                  ],
                  [
                    "Before / after event",
                    `${number(report.events.arrivals.beforeStartCount)} / ${number(report.events.arrivals.afterEndCount)}`,
                  ],
                  [
                    "Timestamp coverage",
                    `${number(report.events.arrivals.timestampCoverage.numerator)} / ${number(report.events.arrivals.timestampCoverage.denominator)} · ${percent(report.events.arrivals.timestampCoverage.rate)}`,
                  ],
                  [
                    "Class snapshot coverage",
                    `${number(report.events.arrivals.classCoverage.numerator)} / ${number(report.events.arrivals.classCoverage.denominator)} · ${percent(report.events.arrivals.classCoverage.rate)}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    className="rounded-md border border-border/60 bg-card/95 p-3"
                    key={label}
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-x-auto">
                {arrivalView === "overall" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interval start</TableHead>
                        <TableHead className="text-right">Check-ins</TableHead>
                        <TableHead className="text-right">Cumulative</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.events.arrivals.buckets.map((bucket) => (
                        <TableRow key={String(bucket.startAt)}>
                          <TableCell>{date(bucket.startAt)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {number(bucket.intervalCount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {number(bucket.cumulativeCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Interval start</TableHead>
                        <TableHead className="text-right">Check-ins</TableHead>
                        <TableHead className="text-right">Cumulative</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.events.arrivals.classSeries.flatMap((series) =>
                        series.buckets.map((bucket) => (
                          <TableRow
                            key={`${series.category}-${String(bucket.startAt)}`}
                          >
                            <TableCell>{series.category}</TableCell>
                            <TableCell>{date(bucket.startAt)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {bucket.count}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {bucket.cumulativeCount}
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </Panel>
        <Panel
          description="Current competition points use SQL-style competition ranking. Event-awarded points remain separately filter-scoped with coverage."
          title="Points leaderboard"
        >
          {!identifiedRows ? (
            <Empty>
              You have aggregate access. READ_HACKERS is also required for named
              leaderboard rows and profiles.
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>
                      <button
                        className="hover:text-foreground"
                        onClick={() => setPointsSort("name")}
                      >
                        Hacker ↕
                      </button>
                    </TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">
                      <button
                        className="hover:text-foreground"
                        onClick={() => setPointsSort("events")}
                      >
                        Events ↕
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Event points</TableHead>
                    <TableHead>Last attendance</TableHead>
                    <TableHead className="text-right">
                      <button
                        className="hover:text-foreground"
                        onClick={() => setPointsSort("points")}
                      >
                        Current points ↕
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePointRows.map((row) => (
                    <TableRow key={row.attendeeId}>
                      <TableCell className="font-mono">{row.rank}</TableCell>
                      <TableCell>
                        <button
                          className="text-left font-medium text-primary hover:underline"
                          onClick={() => setSelectedAttendeeId(row.attendeeId)}
                        >
                          {row.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        {row.vip ? "VIP" : (row.className ?? "Unassigned")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.distinctEvents}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.eventAwardedPoints}
                      </TableCell>
                      <TableCell>
                        {row.lastAttendance ? (
                          <>
                            <span>{row.lastAttendance.eventName}</span>
                            <span className="block text-xs text-muted-foreground">
                              {date(row.lastAttendance.checkedInAt)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePager
                label="Points leaderboard"
                onPageChange={setPointsPage}
                onPageSizeChange={(size) => {
                  setPointsPage(1);
                  setPointsPageSize(size);
                }}
                page={pointsPage}
                pageSize={pointsPageSize}
                total={sortedPointRows.length}
              />
            </div>
          )}
        </Panel>
      </div>
    ),
    live_operations: () => (
      <div className="space-y-4">
        <MetricGrid>
          <MetricCard
            definition="Retained check-in attempts in the selected live window."
            detail={`${date(report.live.window.startAt)} to ${date(report.live.window.endAt)}`}
            label="Attempts"
            value={number(report.live.attemptCount)}
          />
          <MetricCard
            definition="Attempts with outcome checked_in divided by retained attempts."
            detail={`${number(report.live.successCount)} successful`}
            label="Success rate"
            value={percent(report.live.successRate)}
          />
          <MetricCard
            definition="Distinct non-null operator IDs, displayed only through report-local aliases."
            detail="Staff identities never leave the builder"
            label="Active operators"
            value={number(report.live.activeOperatorCount)}
          />
          <MetricCard
            definition="Retained operational issue outcomes in the selected window."
            detail={
              report.live.failureCoverageState === "partial"
                ? `Partial history: failures before ${date(report.live.failureCoverageStartsAt)} may be absent`
                : `Complete within retention from ${date(report.live.failureCoverageStartsAt)}`
            }
            label="Issues"
            value={number(report.live.issueCount)}
          />
          <MetricCard
            definition="Retained attempts divided by the exact selected window duration."
            detail="Useful for staffing load"
            label="Attempts / minute"
            value={report.live.attemptsPerMinute?.toFixed(2) ?? "—"}
          />
          <MetricCard
            definition="Most successful check-ins observed in one five-minute bucket."
            detail={date(report.live.peakThroughput?.startAt ?? null)}
            label="Peak 5-minute throughput"
            value={number(report.live.peakThroughput?.successCount ?? 0)}
          />
          <MetricCard
            definition="Repeated attendance occurrences recorded in the selected live window."
            detail="Reported separately from distinct attendance"
            label="Repeat occurrences"
            value={number(report.live.repeatOccurrenceCount)}
          />
          <MetricCard
            definition="Discord general, class, or VIP role grants still pending or failed."
            detail="Current delivery state"
            label="Unresolved role grants"
            value={number(report.live.unresolvedRoleGrantCount)}
          />
        </MetricGrid>
        <Panel
          description="Five-minute attempt and successful check-in cadence across the bounded live window."
          title="Operational throughput"
        >
          <ChartContainer
            className="h-64 w-full"
            config={{
              attempts: { color: "hsl(var(--chart-3))", label: "Attempts" },
              successes: {
                color: "hsl(var(--chart-1))",
                label: "Successful check-ins",
              },
            }}
          >
            <LineChart
              accessibilityLayer
              data={report.live.throughputBuckets.map((row) => ({
                attempts: row.attemptCount,
                label: date(row.startAt),
                successes: row.successCount,
              }))}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={28} tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="attempts"
                stroke="var(--color-attempts)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="successes"
                stroke="var(--color-successes)"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          <div className="mt-4 max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Five-minute bucket</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Successful</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.live.throughputBuckets.map((row) => (
                  <TableRow key={String(row.startAt)}>
                    <TableCell>{date(row.startAt)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.attemptCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.successCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            description="Already checked in remains visible but is not counted as an issue."
            title="Outcome mix"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.live.outcomeRows.map((row) => (
                  <TableRow key={row.outcome}>
                    <TableCell>{row.outcome.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel
            description="Scanner and manual traffic inside the same selected window."
            title="Check-in mode"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.live.modeRows.map((row) => (
                  <TableRow key={row.mode}>
                    <TableCell className="capitalize">{row.mode}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {(
            [
              ["Operator load", report.live.operatorRows, "Operator"],
              ["Event load", report.live.eventRows, "Event"],
              ["Class load", report.live.classRows, "Class"],
            ] as const
          ).map(([title, rows, heading]) => (
            <Panel
              description={
                title === "Operator load"
                  ? "Report-local aliases protect staff identity while showing observed workload."
                  : "Immutable attempt-time context inside the selected live window."
              }
              key={title}
              title={title}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{heading}</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={"label" in row ? row.label : row.category}>
                      <TableCell>
                        {"label" in row ? row.label : row.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          ))}
          <Panel
            description="VIP and minor-at-attempt flags are immutable check-in snapshots; unknown stays explicit."
            title="Attempt-time cohorts"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...report.live.vipRows, ...report.live.minorRows].map(
                  (row, index) => (
                    <TableRow key={`${row.key}-${index}`}>
                      <TableCell>{row.key.replaceAll("_", " ")}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </Panel>
        </div>
        <Panel
          description="Pending or failed Discord role grants needing organizer attention."
          title="Role delivery health"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border/60 bg-card/95 p-4">
              <span className="text-sm text-muted-foreground">Unresolved</span>
              <p className="font-mono text-2xl font-semibold">
                {number(report.live.unresolvedRoleGrantCount)}
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-card/95 p-4">
              <span className="text-sm text-muted-foreground">Retries</span>
              <p className="font-mono text-2xl font-semibold">
                {number(report.live.roleHealth.retryCount)}
              </p>
            </div>
            <div className="rounded-md border border-border/60 bg-card/95 p-4">
              <span className="text-sm text-muted-foreground">
                Oldest unresolved
              </span>
              <p className="mt-1 text-sm font-medium">
                {date(report.live.roleHealth.oldestUnresolvedAt)}
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role kind</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Retries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.live.roleHealth.rows.map((row) => (
                  <TableRow key={row.kind}>
                    <TableCell>{row.kind.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.pendingCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.failedCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {number(row.retryCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {report.live.roleHealth.errorRows.length ? (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Failure family</TableHead>
                    <TableHead className="text-right">Grants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.live.roleHealth.errorRows.map((row) => (
                    <TableRow key={row.family}>
                      <TableCell>{row.family.replaceAll("_", " ")}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </Panel>
      </div>
    ),
    audience: () => (
      <div className="space-y-4">
        <MetricGrid>
          <MetricCard
            definition="All retained applications for the selected hackathon."
            detail="Audience stage denominator"
            label="Applicants"
            value={number(report.audience.totals.applicants)}
          />
          <MetricCard
            definition="Applications whose exact current status is confirmed."
            detail="Checked-in hackers are shown separately"
            label="Confirmed"
            value={number(currentStatusCount("confirmed"))}
          />
          <MetricCard
            definition="Hackers with a whole-hack check-in timestamp or supported legacy fallback."
            detail={`${percent(report.overview.pipeline.knownConfirmedToCheckInRate)} of hackers known to have confirmed`}
            label="Checked in"
            value={number(report.audience.totals.onSite)}
          />
          <MetricCard
            definition="On-site hackers with a matching trusted program-event attendance."
            detail="Active event filters apply"
            label="Event engaged"
            value={number(report.audience.totals.eventEngagedOnSite)}
          />
          <MetricCard
            definition="On-site event-engaged hackers attending at least two distinct program events."
            detail="Repeated occurrences at one event do not qualify"
            label="Repeat event attendees"
            value={number(report.audience.totals.repeatEventEngagedOnSite)}
          />
          <MetricCard
            definition="Usable values for the selected demographic. Missing, invalid, unknown, and not applicable are excluded from coverage."
            detail={`${number(report.audience.coverage.numerator)} of ${number(report.audience.coverage.denominator)}`}
            label="Demographic coverage"
            value={percent(report.audience.coverage.rate)}
          />
        </MetricGrid>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/70 p-2">
          <div className="flex rounded-md bg-muted/60 p-1">
            {(["composition", "engagement"] as const).map((view) => (
              <Button
                className="min-h-11"
                key={view}
                size="sm"
                variant={input.audienceView === view ? "secondary" : "ghost"}
                onClick={() =>
                  navigate({
                    audienceView: view,
                    ...(view === "engagement"
                      ? { compositionCohort: "applicants" as const }
                      : {}),
                  })
                }
              >
                {view === "composition" ? "Composition" : "Engagement"}
              </Button>
            ))}
          </div>
          <span className="ml-1 text-sm font-medium">Break down by</span>
          <div
            className="flex max-w-full gap-1 overflow-x-auto"
            aria-label="Priority demographics"
          >
            {priorityDemographics.map((demographic) => (
              <Button
                className="min-h-11"
                key={demographic}
                size="sm"
                variant={
                  input.demographic === demographic ? "secondary" : "ghost"
                }
                onClick={() => selectDemographic(demographic)}
              >
                {demographics[demographic]}
              </Button>
            ))}
          </div>
          <Select
            value={
              priorityDemographics.some(
                (demographic) => demographic === input.demographic,
              )
                ? ""
                : input.demographic
            }
            onValueChange={selectDemographic}
          >
            <SelectTrigger
              className="min-h-11 w-44"
              aria-label="All audience demographics"
            >
              <SelectValue placeholder="More demographics" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(demographics)
                .filter(
                  ([value]) =>
                    !priorityDemographics.some(
                      (demographic) => demographic === value,
                    ),
                )
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {input.audienceView === "composition" ? (
            <Select
              value={input.compositionCohort}
              onValueChange={(
                value: HackathonAnalyticsReportInput["compositionCohort"],
              ) => navigate({ compositionCohort: value })}
            >
              <SelectTrigger
                className="min-h-11 w-52"
                aria-label="Composition cohort"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applicants">Applicants</SelectItem>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="accepted">Accepted status</SelectItem>
                <SelectItem value="confirmed">Confirmed status</SelectItem>
                <SelectItem value="on_site">Checked in</SelectItem>
                <SelectItem value="event_engaged">Event engaged</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Gender, race / ethnicity, age, class year, level of study, and major
          are first-class breakdowns. Additional recorded dimensions remain
          available; Hack reporting keeps two-year and three-plus undergraduate
          programs separate.
        </p>
        <Panel
          description={
            input.audienceView === "composition"
              ? "Pie composition for the selected cohort. Protected missing and prefer-not-to-answer categories remain visible."
              : "Applicants and checked-in hackers use the same demographic categories; the complete table adds exact current statuses and event engagement."
          }
          title={`${demographics[input.demographic]} ${input.audienceView}`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              aria-label="Search audience categories"
              className="max-w-sm"
              onChange={(event) => {
                setAudiencePage(1);
                setAudienceSearch(event.target.value);
              }}
              placeholder="Search categories"
              value={audienceSearch}
            />
            <span className="text-xs text-muted-foreground">
              {searchedAudienceCount} matching categor
              {searchedAudienceCount === 1 ? "y" : "ies"}
            </span>
          </div>
          {input.audienceView === "composition" ? (
            <div className="grid gap-5">
              <CompositionPie
                slices={report.audience.composition.slices}
                total={report.audience.composition.total}
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">People</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCompositionRows.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell className="min-w-48 font-medium">
                          <span
                            aria-hidden="true"
                            className="mr-2 inline-block size-2.5 rounded-full"
                            style={{
                              background: row.color.startsWith("var(")
                                ? `hsl(${row.color})`
                                : row.color,
                            }}
                          />
                          {row.category}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {number(row.count)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.share)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visibleCompositionRows.length === 0 ? (
                  <Empty>No demographic categories match this search.</Empty>
                ) : null}
                <TablePager
                  label="Audience composition"
                  onPageChange={setAudiencePage}
                  onPageSizeChange={(size) => {
                    setAudiencePage(1);
                    setAudiencePageSize(size);
                  }}
                  page={audiencePage}
                  pageSize={audiencePageSize}
                  total={searchedCompositionRows.length}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              <ChartContainer
                className="h-80 w-full"
                config={{
                  applicantCount: {
                    color: "hsl(var(--chart-1))",
                    label: "Applicants",
                  },
                  checkedInCount: {
                    color: "hsl(var(--chart-2))",
                    label: "Checked in",
                  },
                }}
              >
                <BarChart
                  accessibilityLayer
                  data={engagementChartRows}
                  margin={{ left: 4, right: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    axisLine={false}
                    dataKey="category"
                    minTickGap={16}
                    tickFormatter={(value: string) =>
                      value.length > 14 ? `${value.slice(0, 13)}…` : value
                    }
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="applicantCount"
                    fill="var(--color-applicantCount)"
                    isAnimationActive={false}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="checkedInCount"
                    fill="var(--color-checkedInCount)"
                    isAnimationActive={false}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">Applicants</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Confirmed</TableHead>
                      <TableHead className="text-right">Checked in</TableHead>
                      <TableHead className="text-right">
                        Confirmed → check-in
                      </TableHead>
                      <TableHead className="text-right">Event reach</TableHead>
                      <TableHead className="text-right">Repeat rate</TableHead>
                      <TableHead className="text-right">
                        Events / on-site
                      </TableHead>
                      <TableHead className="text-right">Point share</TableHead>
                      <TableHead className="text-right">
                        Point coverage
                      </TableHead>
                      <TableHead className="text-right">
                        Representation gap
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleEngagementRows.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell className="min-w-48 font-medium">
                          {row.category}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.applicantCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.acceptedCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.confirmedCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.checkedInCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.knownConfirmedToCheckInRate)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.eventReach)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.repeatEventEngagedRate)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.eventsPerOnSite?.toFixed(1) ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {percent(row.awardedPointShare)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {number(row.pointSnapshotCoverage.numerator)}/
                          {number(row.pointSnapshotCoverage.denominator)} ·{" "}
                          {percent(row.pointSnapshotCoverage.rate)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.representationGap !== null &&
                          row.representationGap > 0
                            ? "+"
                            : ""}
                          {percent(row.representationGap)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visibleEngagementRows.length === 0 ? (
                  <Empty>No demographic categories match this search.</Empty>
                ) : null}
                <TablePager
                  label="Audience engagement"
                  onPageChange={setAudiencePage}
                  onPageSizeChange={(size) => {
                    setAudiencePage(1);
                    setAudiencePageSize(size);
                  }}
                  page={audiencePage}
                  pageSize={audiencePageSize}
                  total={searchedEngagementRows.length}
                />
              </div>
            </div>
          )}
        </Panel>
        <Panel
          description="Structured dietary tags are multi-select counts, not mutually exclusive composition. Other free text is counted but never shown."
          title="Dietary planning"
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {report.audience.dietary.tags.map((row) => (
              <div
                className="flex justify-between rounded-md border border-border/60 bg-card/95 px-3 py-2"
                key={row.tag}
              >
                <span>{row.tag}</span>
                <span className="font-mono">{row.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    ),
    reports: () => (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[
          {
            icon: FileBarChart,
            kind: "overview" as const,
            title: "Overview data",
            description:
              "Headline pipeline, engagement, coverage, and action-brief evidence.",
          },
          {
            icon: ClipboardList,
            kind: "applications" as const,
            title: "Applications data",
            description:
              "Exact current stages, application pace, confirmation buckets, and applicant breakdowns.",
          },
          {
            icon: CalendarRange,
            kind: "events" as const,
            title: "Events data",
            description:
              "Complete event performance, arrival buckets, programming groupings, and class reach.",
          },
          {
            icon: Activity,
            kind: "live_operations" as const,
            title: "Live operations data",
            description:
              "Retained throughput buckets, outcomes, modes, operators, classes, and role health.",
          },
          {
            icon: UsersRound,
            kind: "audience" as const,
            title: "Audience data",
            description:
              "Complete selected-dimension composition and engagement rows with exact coverage.",
          },
          {
            icon: Download,
            kind: "institutional_summary" as const,
            title: "MLH / UCF institutional summary",
            description:
              "Hackathon-wide exact aggregate outcomes with explicit denominators and coverage.",
          },
          {
            icon: UsersRound,
            kind: "sponsor" as const,
            title: "Sponsor-safe report",
            description:
              "Privacy-reduced reach and composition with sparse categories protected.",
          },
          {
            icon: Trophy,
            kind: "points_leaderboard" as const,
            requiresIdentified: true,
            title: "Points leaderboard",
            description:
              "Authorized named ranking export with current points, class, VIP status, event counts, and point coverage.",
          },
        ].map((item) => (
          <section
            className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-card/95 p-5 shadow-lg shadow-black/15"
            key={item.title}
          >
            <item.icon className="size-5 text-primary" />
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            {"requiresIdentified" in item &&
            item.requiresIdentified &&
            !identifiedRows ? (
              <Button className="mt-5" disabled variant="outline">
                READ_HACKERS required
              </Button>
            ) : (
              <HackathonExportButton input={input} kind={item.kind} />
            )}
          </section>
        ))}
        <section className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-card/95 p-5 shadow-lg shadow-black/15">
          <FileArchive className="size-5 text-primary" />
          <h2 className="mt-4 font-semibold">Recruiter resume bundle</h2>
          <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
            Hackers currently confirmed or checked in with available resumes,
            organized into independent recruiting-horizon, graduation-term,
            inferred-year, level, major, university, age, gender, and race
            indexes. Preview validates files and creates bounded parts. This is
            sensitive candidate material.
          </p>
          {canPrepareResumes ? (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-2">
                <label className="text-xs font-medium" htmlFor="resume-pool">
                  Candidate pool
                </label>
                <Select
                  value={resumePool}
                  onValueChange={(value: ResumePool) => {
                    setResumePool(value);
                    if (value !== "custom_current_statuses") {
                      setResumeStatuses([]);
                    }
                  }}
                >
                  <SelectTrigger id="resume-pool">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_confirmed">
                      Confirmed + checked in
                    </SelectItem>
                    <SelectItem value="on_site">On site</SelectItem>
                    <SelectItem value="current_selected">
                      Accepted + confirmed + checked in
                    </SelectItem>
                    <SelectItem value="custom_current_statuses">
                      Custom current statuses
                    </SelectItem>
                  </SelectContent>
                </Select>
                {resumePool === "custom_current_statuses" ? (
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-border/60 p-3">
                    {(
                      [
                        "pending",
                        "accepted",
                        "waitlisted",
                        "confirmed",
                        "checkedin",
                        "denied",
                        "withdrawn",
                      ] as const
                    ).map((status) => (
                      <label
                        className="flex items-center gap-2 text-xs capitalize"
                        key={status}
                      >
                        <Checkbox
                          checked={resumeStatuses.includes(status)}
                          onCheckedChange={(checked) =>
                            setResumeStatuses((current) =>
                              checked === true
                                ? [...new Set([...current, status])]
                                : current.filter((value) => value !== status),
                            )
                          }
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <Checkbox
                  aria-label="Acknowledge sensitive resume policy"
                  checked={resumePolicyAcknowledged}
                  className="mt-0.5"
                  onCheckedChange={(checked) =>
                    setResumePolicyAcknowledged(checked === true)
                  }
                />
                <span>
                  I acknowledge policy{" "}
                  <strong>resume-sensitive-index-v1</strong>. This archive is
                  sensitive candidate material for authorized recruiting only
                  and must be deleted when no longer needed.
                </span>
              </label>
              {!resumePolicyAcknowledged ? (
                <Button className="gap-2" disabled>
                  <Download className="size-4" />
                  Acknowledge policy to preview
                </Button>
              ) : resumePool === "custom_current_statuses" &&
                resumeStatuses.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Select at least one current status for the custom pool.
                </p>
              ) : resumePreview.isLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Validating candidate resumes…
                </p>
              ) : resumePreview.error ? (
                <p className="text-sm text-destructive">
                  The resume preview could not be prepared. Try again.
                </p>
              ) : resumePreview.data?.validCount === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No valid resumes are available in this candidate pool.{" "}
                  {resumePreview.data.skippedCount} reference(s) were skipped.
                </p>
              ) : resumePreview.data ? (
                <div className="grid gap-2">
                  <p className="text-xs text-muted-foreground">
                    {resumePreview.data.validCount} valid ·{" "}
                    {resumePreview.data.skippedCount} skipped ·{" "}
                    {resumePreview.data.partCount} ZIP part(s)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resumePreview.data.parts.map((part) => (
                      <Button asChild className="gap-2" key={part.partNumber}>
                        <a
                          download
                          href={`/api/admin/hackathon-resume-bundle?hackathonId=${encodeURIComponent(input.hackathonId)}&pool=${resumePool}&policyAcknowledged=true&policyVersion=resume-sensitive-index-v1&partNumber=${part.partNumber}&planFingerprint=${encodeURIComponent(resumePreview.data.planFingerprint)}${resumeStatuses.map((status) => `&status=${status}`).join("")}`}
                        >
                          <Download className="size-4" />
                          Part {part.partNumber} of{" "}
                          {resumePreview.data.partCount}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button className="gap-2" disabled>
                  <Download className="size-4" />
                  Preview candidate pool
                </Button>
              )}
            </div>
          ) : (
            <Button className="mt-5" disabled variant="outline">
              Officer access required
            </Button>
          )}
        </section>
      </div>
    ),
  };

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        eyebrow="Hackathon intelligence"
        icon={ChartNoAxesCombined}
        title="Analytics"
        description="Application demand, on-site operations, event cadence, audience composition, and recruiter reporting for one explicitly selected hackathon."
      />
      <div className="flex flex-wrap gap-2">
        {canAccessClub ? (
          <>
            <Button asChild variant="outline">
              <Link href="?scope=club">Club analytics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="?scope=team">Team performance</Link>
            </Button>
          </>
        ) : null}
        <Button variant="secondary">Hackathon analytics</Button>
      </div>
      <div className="sticky top-16 z-20 rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl shadow-black/15 backdrop-blur">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto]">
          <Select
            value={input.hackathonId}
            onValueChange={(hackathonId) =>
              navigate({
                hackathonId,
                comparisonHackathonId:
                  comparisonByHackathonId[hackathonId] ?? null,
                eventId: null,
              })
            }
          >
            <SelectTrigger className="h-11" aria-label="Hackathon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={input.comparisonHackathonId ?? "none"}
            onValueChange={(value) =>
              navigate({
                comparisonHackathonId: value === "none" ? null : value,
              })
            }
          >
            <SelectTrigger className="h-11" aria-label="Comparison hackathon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No comparison</SelectItem>
              {options
                .filter((option) => option.id !== input.hackathonId)
                .map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    vs. {option.displayName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            className="h-11 gap-2 sm:col-span-2 xl:col-span-1"
            disabled={isPending}
            variant="outline"
            onClick={() =>
              navigate({
                audienceView: "composition",
                comparisonHackathonId:
                  comparisonByHackathonId[input.hackathonId] ?? null,
                compositionCohort: "applicants",
                demographic: "level_of_study",
                eventId: null,
                eventPurpose: "all",
                eventTags: [],
                liveWindow: "whole_hackathon",
              })
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Activity className="size-4" />
            )}
            Reset
          </Button>
        </div>
        {input.section === "events" || input.section === "live_operations" ? (
          <div
            className={`mt-2 grid min-w-0 gap-2 border-t border-border/60 pt-2 sm:grid-cols-2 ${input.section === "live_operations" ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
          >
            <Select
              value={input.eventPurpose}
              onValueChange={(
                eventPurpose: HackathonAnalyticsReportInput["eventPurpose"],
              ) => navigate({ eventPurpose, eventId: null })}
            >
              <SelectTrigger className="h-11" aria-label="Event purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hackathon events</SelectItem>
                <SelectItem value="program">Modern program events</SelectItem>
                <SelectItem value="primary_check_in">
                  Primary check-in
                </SelectItem>
                <SelectItem value="legacy_unknown">Legacy events</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={input.eventTags[0] ?? "all"}
              onValueChange={(value) =>
                navigate({
                  eventId: null,
                  eventTags: value === "all" ? [] : [value],
                })
              }
            >
              <SelectTrigger className="h-11" aria-label="Event type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {report.options.eventTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={input.eventId ?? "all"}
              onValueChange={(value) =>
                navigate({ eventId: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="h-11" aria-label="Individual event">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All matching events</SelectItem>
                {report.options.events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {input.section === "live_operations" ? (
              <Select
                value={input.liveWindow}
                onValueChange={(
                  liveWindow: HackathonAnalyticsReportInput["liveWindow"],
                ) => navigate({ liveWindow })}
              >
                <SelectTrigger className="h-11" aria-label="Live window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_15_minutes">
                    Last 15 minutes
                  </SelectItem>
                  <SelectItem value="last_hour">Last hour</SelectItem>
                  {input.eventId ? (
                    <SelectItem value="since_event_start">
                      Since event start
                    </SelectItem>
                  ) : null}
                  <SelectItem value="whole_hackathon">
                    Whole hackathon
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}
      </div>
      <nav
        aria-label="Analytics sections"
        className="-mx-1 overflow-x-auto px-1"
      >
        <div className="flex min-w-max gap-1 rounded-lg border border-border/70 bg-card/80 p-1">
          {sections.map((section) => {
            const Icon =
              section.id === "applications"
                ? ClipboardList
                : section.id === "events"
                  ? CalendarRange
                  : section.id === "live_operations"
                    ? Activity
                    : section.id === "audience"
                      ? UsersRound
                      : section.id === "reports"
                        ? FileBarChart
                        : Trophy;
            const keepsEventFilters =
              section.id === "events" || section.id === "live_operations";
            const sectionInput = {
              ...input,
              eventId: keepsEventFilters ? input.eventId : null,
              eventPurpose: keepsEventFilters ? input.eventPurpose : "all",
              eventTags: keepsEventFilters ? input.eventTags : [],
              section: section.id,
            } as HackathonAnalyticsReportInput;
            return (
              <Button
                asChild
                key={section.id}
                variant={input.section === section.id ? "secondary" : "ghost"}
              >
                <Link
                  href={`?${buildHackathonAnalyticsSearchParams(sectionInput).toString()}`}
                >
                  <Icon className="mr-2 size-4" />
                  {section.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
      {content[input.section]()}
      {selectedAttendeeId ? (
        <HackerAnalyticsProfile
          attendeeId={selectedAttendeeId}
          hackathonId={input.hackathonId}
          onClose={() => setSelectedAttendeeId(null)}
        />
      ) : null}
    </main>
  );
}

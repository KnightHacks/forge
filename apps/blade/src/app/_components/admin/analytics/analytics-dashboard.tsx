"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileArchive,
  FileBarChart,
  Info,
  Loader2,
  MessagesSquare,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@forge/api";
import type { ChartConfig } from "@forge/ui/chart";
import type {
  AnalyticsExportKind,
  AnalyticsReportInput,
  AnalyticsSection,
} from "@forge/validators";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import { MemberDetailDialog } from "~/app/_components/admin/members/member-detail-dialog";
import {
  ADMIN_PAGE_EYEBROWS,
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { RESUME_BUNDLE_DOWNLOAD_COOKIE } from "~/consts/browser-storage";
import { formatClubDate, formatClubDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";
import {
  AnalyticsMetricCard as MetricCard,
  AnalyticsMetricGrid as MetricGrid,
} from "./analytics-metric-card";
import { DiscordAnalyticsSection } from "./discord-analytics-section";
import { buildAnalyticsSearchParams } from "./params";

type AnalyticsReport = RouterOutputs["analytics"]["getReport"];
type DiscordAnalyticsReport = RouterOutputs["analytics"]["getDiscordReport"];

interface AnalyticsAccess {
  canEditMembers: boolean;
  canOpenEvents: boolean;
  canOpenMembers: boolean;
}

type LifecycleGroup =
  | AnalyticsReport["highlights"][number]["group"]
  | "discord";

interface LifecycleHighlight {
  destination: "audience" | "discord" | "dues" | "events";
  filters: {
    demographic?: AnalyticsReport["audience"]["selectedDemographic"];
    eventTag?: string;
  };
  group: LifecycleGroup;
  kind: string;
  message: string;
}

const sections = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "discord", label: "Discord" },
  { id: "audience", label: "Audience" },
  { id: "dues", label: "Dues" },
  { id: "reports", label: "Reports" },
] as const;

const highlightGroups = [
  {
    description: "Track retained profile creation and early event activation.",
    icon: UsersRound,
    id: "membership",
    label: "Grow membership",
  },
  {
    description: "Follow measured return and period-to-period participation.",
    icon: ChartNoAxesCombined,
    id: "engagement",
    label: "Deepen engagement",
  },
  {
    description:
      "Measure conversation breadth and depth with authorized Member drill-downs.",
    icon: MessagesSquare,
    id: "discord",
    label: "Sustain community conversation",
  },
  {
    description: "Separate program volume, turnout, timing, and gateway value.",
    icon: CalendarRange,
    id: "programming",
    label: "Plan programming & turnout",
  },
  {
    description: "Compare attendees with every retained Member profile.",
    icon: UsersRound,
    id: "audience",
    label: "Understand audience",
  },
  {
    description: "Track collection pace and find reached unpaid profiles.",
    icon: CircleDollarSign,
    id: "dues",
    label: "Collect & renew dues",
  },
  {
    description: "See where missing responses or profile data limit analysis.",
    icon: Info,
    id: "measurement",
    label: "Improve measurement",
  },
] satisfies {
  description: string;
  icon: typeof ChartNoAxesCombined;
  id: LifecycleGroup;
  label: string;
}[];

const demographicLabels = {
  age: "Age band",
  gender: "Gender",
  graduation: "Graduation cohort",
  level_of_study: "Level of study",
  major: "Major",
  race_or_ethnicity: "Race / ethnicity",
  school: "School",
  shirt_size: "Shirt size",
} as const;

const COMBINED_UNDERGRADUATE_LABEL = "Undergraduate University";
const UNDERGRADUATE_LEVELS = new Set([
  "Undergraduate University (2 year)",
  "Undergraduate University (2 year - community college or similar)",
  "Undergraduate University (3+ year)",
]);

function isUndergraduateLevel(category: string) {
  return UNDERGRADUATE_LEVELS.has(category);
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function mergeUndergraduateDemographicRows(
  rows: AnalyticsReport["audience"]["demographics"]["level_of_study"]["rows"],
) {
  const undergraduateRows = rows.filter((row) =>
    isUndergraduateLevel(row.category),
  );
  if (undergraduateRows.length === 0) return rows;

  const baseCount = undergraduateRows.reduce(
    (total, row) => total + row.baseCount,
    0,
  );
  const attendeeCount = undergraduateRows.reduce(
    (total, row) => total + row.attendeeCount,
    0,
  );
  const totalBaseCount = rows.reduce((total, row) => total + row.baseCount, 0);
  const totalAttendeeCount = rows.reduce(
    (total, row) => total + row.attendeeCount,
    0,
  );
  const repeatAttendeeCount = undergraduateRows.reduce(
    (total, row) => total + (row.repeatAttendeeRate ?? 0) * row.attendeeCount,
    0,
  );
  const duesPaidCount = undergraduateRows.reduce(
    (total, row) => total + (row.duesPaidRate ?? 0) * row.baseCount,
    0,
  );
  const baseShare = ratio(baseCount, totalBaseCount);
  const audienceShare = ratio(attendeeCount, totalAttendeeCount);
  const merged = {
    attendeeCount,
    audienceShare,
    baseCount,
    baseShare,
    category: COMBINED_UNDERGRADUATE_LABEL,
    duesPaidRate: ratio(duesPaidCount, baseCount),
    participationRate: ratio(attendeeCount, baseCount),
    repeatAttendeeRate: ratio(repeatAttendeeCount, attendeeCount),
    representationGap:
      baseShare === null || audienceShare === null
        ? null
        : audienceShare - baseShare,
  };

  return [
    ...rows.filter((row) => !isUndergraduateLevel(row.category)),
    merged,
  ].sort(
    (left, right) =>
      right.baseCount - left.baseCount ||
      left.category.localeCompare(right.category),
  );
}

function mergeUndergraduateAffinityRows(
  rows: AnalyticsReport["audience"]["affinity"],
) {
  const mergedByLabel = new Map<
    string,
    AnalyticsReport["audience"]["affinity"][number]
  >();
  const unmerged = rows.filter((row) => {
    if (!isUndergraduateLevel(row.category)) return true;
    const current = mergedByLabel.get(row.label);
    mergedByLabel.set(row.label, {
      attendanceCount: (current?.attendanceCount ?? 0) + row.attendanceCount,
      category: COMBINED_UNDERGRADUATE_LABEL,
      eventCount: Math.max(current?.eventCount ?? 0, row.eventCount),
      label: row.label,
      memberCount: (current?.memberCount ?? 0) + row.memberCount,
    });
    return false;
  });

  return [...unmerged, ...mergedByLabel.values()].sort(
    (left, right) =>
      right.attendanceCount - left.attendanceCount ||
      left.category.localeCompare(right.category) ||
      left.label.localeCompare(right.label),
  );
}

const chartConfig = {
  attendanceCount: {
    color: "hsl(var(--chart-1))",
    label: "Attendances",
  },
  attendeeCount: {
    color: "hsl(var(--chart-2))",
    label: "Attendees",
  },
  baseCount: {
    color: "hsl(var(--chart-4))",
    label: "Member profiles",
  },
  eventCount: {
    color: "hsl(var(--chart-3))",
    label: "Events",
  },
} satisfies ChartConfig;

function ShadChart({
  children,
  className,
  config = chartConfig,
}: {
  children: React.ComponentProps<typeof ChartContainer>["children"];
  className: string;
  config?: ChartConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    height: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const bounds = container.getBoundingClientRect();
      const height = Math.floor(bounds.height);
      const width = Math.floor(bounds.width);
      setDimensions((current) => {
        if (height <= 0 || width <= 0) return null;
        return current?.height === height && current.width === width
          ? current
          : { height, width };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={`${className} min-h-0 min-w-0`}
      data-chart-library="shadcn"
      ref={containerRef}
    >
      {dimensions ? (
        <ChartContainer
          className="!aspect-auto h-full min-h-0 w-full min-w-0"
          config={config}
          initialDimension={dimensions}
        >
          {children}
        </ChartContainer>
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-full rounded-md bg-muted/20"
        />
      )}
    </div>
  );
}

function formatNumber(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function formatDecimal(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        style: "percent",
      }).format(value);
}

function formatDate(value: Date | string | null) {
  return formatClubDate(value);
}

function formatDateTime(value: Date | string | null) {
  return formatClubDateTime(value, "Not recorded");
}

function MemberDrilldownName({
  access,
  memberId,
  name,
  onOpen,
}: {
  access: AnalyticsAccess;
  memberId: string;
  name: string;
  onOpen: (memberId: string) => void;
}) {
  if (!access.canOpenMembers) return name;

  return (
    <button
      type="button"
      className="min-h-9 text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpen(memberId)}
    >
      {name}
    </button>
  );
}

function AnalyticsMemberDetail({
  canEdit,
  memberId,
  onChanged,
  onClose,
  onDeleted,
}: {
  canEdit: boolean;
  memberId: string;
  onChanged: () => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const detail = api.member.getAdminMember.useQuery({ memberId });

  if (detail.data) {
    return (
      <MemberDetailDialog
        canEdit={canEdit}
        detail={detail.data}
        onChanged={() => {
          void detail.refetch();
          onChanged();
        }}
        onClose={onClose}
        onDeleted={onDeleted}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/10 bg-card/95">
        <DialogHeader>
          <DialogTitle>
            {detail.error ? "Member could not be opened" : "Loading member"}
          </DialogTitle>
          <DialogDescription>
            {detail.error
              ? detail.error.message
              : "Collecting the latest profile and engagement details."}
          </DialogDescription>
        </DialogHeader>
        {!detail.error ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2
              className="size-6 animate-spin text-primary"
              aria-label="Loading member profile"
            />
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiscordParticipationMetrics({
  report,
}: {
  report: DiscordAnalyticsReport;
}) {
  const humanShare =
    report.mix.find((row) => row.kind === "human")?.share ?? null;
  return (
    <MetricGrid>
      <MetricCard
        definition="Distinct human Discord accounts that authored a current message in the selected period. Bots, webhooks, and system messages are excluded."
        detail={`${formatNumber(report.summary.activeDays)} active days · ${formatNumber(report.summary.activeSurfaceCount)} active surfaces`}
        label="Discord participants"
        value={formatNumber(report.summary.uniqueHumanAuthors)}
      />
      <MetricCard
        definition="Current, non-deleted messages classified as human-authored in the selected period."
        detail={`${formatPercent(humanShare)} of current Discord messages`}
        label="Human messages"
        value={formatNumber(report.summary.humanMessageCount)}
      />
      <MetricCard
        definition="Human-authored messages divided by distinct human Discord authors in the selected period."
        detail={`Median ${formatDecimal(report.summary.medianHumanMessagesPerAuthor)} per participant`}
        label="Messages / participant"
        value={formatDecimal(report.summary.averageHumanMessagesPerAuthor, 1)}
      />
      <MetricCard
        definition="Observed calendar days with at least one current Discord message, divided by all observed days in the selected period."
        detail={`${formatNumber(report.summary.activeDays)} of ${formatNumber(report.summary.calendarDays)} days · ${formatNumber(report.summary.activeSurfaceCount)} active surfaces`}
        label="Active conversation"
        value={formatPercent(report.summary.activeDayRate)}
      />
    </MetricGrid>
  );
}

function buildDiscordLifecycleHighlights(
  report: DiscordAnalyticsReport,
): LifecycleHighlight[] {
  const participation: LifecycleHighlight = {
    destination: "discord",
    filters: {},
    group: "discord",
    kind: "discord_participation_depth",
    message:
      report.summary.uniqueHumanAuthors === 0
        ? "No human Discord participants are represented in the selected period."
        : `${formatNumber(report.summary.uniqueHumanAuthors)} people authored ${formatNumber(report.summary.humanMessageCount)} Discord messages—${formatDecimal(report.summary.averageHumanMessagesPerAuthor)} on average and ${formatDecimal(report.summary.medianHumanMessagesPerAuthor)} at the median.`,
  };
  const activity: LifecycleHighlight = {
    destination: "discord",
    filters: {},
    group: "discord",
    kind: "discord_activity_breadth",
    message: `Discord conversation was active on ${formatNumber(report.summary.activeDays)} of ${formatNumber(report.summary.calendarDays)} observed days (${formatPercent(report.summary.activeDayRate)}) across ${formatNumber(report.summary.activeSurfaceCount)} surfaces (${formatPercent(report.summary.activeSurfaceRate)} of visible surfaces).`,
  };
  return [participation, activity];
}

function Panel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/70 bg-background/60 shadow-inner shadow-black/10">
      <div className="border-b border-border/60 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold tracking-tight sm:text-base">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 p-3 sm:p-5">{children}</div>
    </section>
  );
}

function TableRegion({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="max-w-full overflow-x-auto rounded-md border border-border/60"
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const tablePageSizes = [10, 25, 50] as const;

function PaginatedTableRegion<T>({
  initialPageSize = 10,
  label,
  renderTable,
  rows,
}: {
  initialPageSize?: (typeof tablePageSizes)[number];
  label: string;
  renderTable: (pageRows: readonly T[]) => ReactNode;
  rows: readonly T[];
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, rows.length);

  return (
    <div className="min-w-0">
      <TableRegion label={label}>
        {renderTable(rows.slice(start, end))}
      </TableRegion>
      {rows.length > tablePageSizes[0] ? (
        <nav
          aria-label={`${label} pagination`}
          className="mt-2 flex flex-col gap-2 rounded-md border border-border/50 bg-background/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Showing {start + 1}–{end} of {formatNumber(rows.length)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(0);
              }}
              value={String(pageSize)}
            >
              <SelectTrigger
                aria-label={`Rows per page for ${label}`}
                className="h-11 w-[6.5rem] sm:h-8"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tablePageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="min-w-20 text-center font-mono text-sm tabular-nums text-muted-foreground">
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              aria-label={`Previous page of ${label}`}
              className="size-11 p-0 sm:size-8"
              disabled={currentPage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              aria-label={`Next page of ${label}`}
              className="size-11 p-0 sm:size-8"
              disabled={currentPage >= pageCount - 1}
              onClick={() =>
                setPage((value) => Math.min(pageCount - 1, value + 1))
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function HorizontalBars({
  data,
  label,
}: {
  data: readonly { attendanceCount: number; label: string }[];
  label: string;
}) {
  const shown = data.slice(0, 12);
  if (shown.length === 0)
    return <EmptyInline message="No matching event data." />;
  return (
    <div aria-label={label} role="img">
      <ShadChart className="aspect-auto h-72 w-full">
        <BarChart
          accessibilityLayer
          data={shown}
          layout="vertical"
          margin={{ left: 8, right: 16 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis allowDecimals={false} type="number" />
          <YAxis
            axisLine={false}
            dataKey="label"
            tickFormatter={(value: string) =>
              value.length > 20 ? `${value.slice(0, 19)}…` : value
            }
            tickLine={false}
            type="category"
            width={112}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="attendanceCount"
            fill="var(--color-attendanceCount)"
            isAnimationActive={false}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ShadChart>
      <div className="sr-only">
        {shown.map((row) => (
          <p key={row.label}>
            {row.label}: {row.attendanceCount} attendances
          </p>
        ))}
      </div>
    </div>
  );
}

function AttendanceTrend({ report }: { report: AnalyticsReport }) {
  const rows = report.events.trend.rows;
  if (rows.length === 0)
    return <EmptyInline message="No matching event trend." />;
  return (
    <div aria-label="Attendance over time" role="img">
      <ShadChart className="aspect-auto h-72 w-full">
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{ left: 4, right: 12 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={28}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="attendanceCount"
            dot={false}
            isAnimationActive={false}
            stroke="var(--color-attendanceCount)"
            strokeWidth={2.5}
            type="monotone"
          />
        </LineChart>
      </ShadChart>
      <div className="sr-only">
        {rows.map((row) => (
          <p key={row.label}>
            {row.label}: {row.attendanceCount} attendances across{" "}
            {row.eventCount} events
          </p>
        ))}
      </div>
    </div>
  );
}

function EmptyInline({ message }: { message: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-border/80 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function AnalyticsFilters({
  input,
  report,
}: {
  input: AnalyticsReportInput;
  report: AnalyticsReport;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (next: AnalyticsReportInput) => {
      const params = buildAnalyticsSearchParams(next);
      startTransition(() => {
        router.replace(`/admin/analytics?${params.toString()}`, {
          scroll: false,
        });
      });
    },
    [router],
  );
  const update = useCallback(
    (patch: Partial<AnalyticsReportInput>) => navigate({ ...input, ...patch }),
    [input, navigate],
  );
  const handlePeriod = useCallback(
    (value: string) => {
      if (value === "current_semester") {
        update({
          comparison: "previous_period",
          period: { kind: "current_semester" },
        });
      } else if (value === "current_academic_year") {
        update({
          comparison: "previous_academic_year",
          period: { kind: "current_academic_year" },
        });
      } else if (value === "all_time") {
        update({ comparison: "none", period: { kind: "all_time" } });
      } else if (value === "custom") {
        const to = new Date();
        const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
        update({
          comparison: "previous_period",
          period: { from, kind: "custom", to },
        });
      } else if (value.startsWith("ay:")) {
        update({
          comparison: "previous_academic_year",
          period: {
            kind: "academic_year",
            startYear: Number(value.slice(3)),
          },
        });
      }
    },
    [update],
  );
  const handleComparison = useCallback(
    (value: AnalyticsReportInput["comparison"]) =>
      update({ comparison: value }),
    [update],
  );
  const handleTag = useCallback(
    (value: string) =>
      update({ eventId: null, eventTags: value === "all" ? [] : [value] }),
    [update],
  );
  const handleEvent = useCallback(
    (value: string) => update({ eventId: value === "all" ? null : value }),
    [update],
  );
  const handleDemographic = useCallback(
    (value: AnalyticsReportInput["demographic"]) =>
      update({ demographic: value }),
    [update],
  );
  const handleCustomFrom = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (input.period.kind !== "custom" || !event.target.value) return;
      update({
        period: {
          ...input.period,
          from: new Date(`${event.target.value}T00:00:00.000Z`),
        },
      });
    },
    [input.period, update],
  );
  const handleCustomTo = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (input.period.kind !== "custom" || !event.target.value) return;
      const inclusive = new Date(`${event.target.value}T00:00:00.000Z`);
      inclusive.setUTCDate(inclusive.getUTCDate() + 1);
      update({ period: { ...input.period, to: inclusive } });
    },
    [input.period, update],
  );
  const clearFilters = useCallback(
    () =>
      navigate({
        comparison: "previous_academic_year",
        demographic: "level_of_study",
        eventId: null,
        eventTags: [],
        period: { kind: "current_academic_year" },
        section: input.section,
      }),
    [input.section, navigate],
  );
  const periodValue =
    input.period.kind === "academic_year"
      ? `ay:${input.period.startYear}`
      : input.period.kind;
  const academicYears = report.dues.academicYears.map((year) => year.startYear);
  const customFrom =
    input.period.kind === "custom"
      ? input.period.from.toISOString().slice(0, 10)
      : "";
  const customTo =
    input.period.kind === "custom"
      ? new Date(input.period.to.getTime() - 1).toISOString().slice(0, 10)
      : "";
  const discordOnly = input.section === "discord";

  return (
    <div className="sticky top-16 z-20 rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl shadow-black/15 backdrop-blur">
      <div
        className={
          discordOnly
            ? "grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:max-w-xl"
            : input.section === "audience"
              ? "grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[1.05fr_0.9fr_0.9fr_1.1fr_1fr_auto]"
              : "grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_1.2fr_auto]"
        }
      >
        <Select onValueChange={handlePeriod} value={periodValue}>
          <SelectTrigger aria-label="Reporting period" className="h-11 w-full">
            <SelectValue placeholder="Reporting period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_semester">Current semester</SelectItem>
            <SelectItem value="current_academic_year">
              Current academic year
            </SelectItem>
            {academicYears.map((year) => (
              <SelectItem key={year} value={`ay:${year}`}>
                {year}–{year + 1} academic year
              </SelectItem>
            ))}
            <SelectItem value="all_time">All time</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        {discordOnly ? null : (
          <Select onValueChange={handleComparison} value={input.comparison}>
            <SelectTrigger
              aria-label="Comparison period"
              className="h-11 w-full"
            >
              <SelectValue placeholder="Comparison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_academic_year">
                Previous academic year
              </SelectItem>
              <SelectItem value="previous_period">
                Previous equivalent period
              </SelectItem>
              <SelectItem value="none">No comparison</SelectItem>
            </SelectContent>
          </Select>
        )}
        {discordOnly ? null : (
          <Select onValueChange={handleTag} value={input.eventTags[0] ?? "all"}>
            <SelectTrigger aria-label="Event type" className="h-11 w-full">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {report.filterOptions.tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {discordOnly ? null : (
          <Select onValueChange={handleEvent} value={input.eventId ?? "all"}>
            <SelectTrigger
              aria-label="Individual event"
              className="h-11 w-full"
            >
              <SelectValue placeholder="Individual event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All matching events</SelectItem>
              {report.filterOptions.events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} · {formatDate(event.startAt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {input.section === "audience" ? (
          <Select onValueChange={handleDemographic} value={input.demographic}>
            <SelectTrigger
              aria-label="Audience demographic"
              className="h-11 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(demographicLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          className="h-11 w-full gap-2 xl:w-auto"
          disabled={isPending}
          onClick={clearFilters}
          type="button"
          variant="outline"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw className="size-4" aria-hidden="true" />
          )}
          Reset
        </Button>
      </div>
      {input.period.kind === "custom" ? (
        <div className="mt-2 grid gap-2 border-t border-border/60 pt-2 sm:grid-cols-2 lg:max-w-xl">
          <label className="grid gap-1 text-xs text-muted-foreground">
            From
            <Input
              className="h-11"
              onChange={handleCustomFrom}
              type="date"
              value={customFrom}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Through
            <Input
              className="h-11"
              onChange={handleCustomTo}
              type="date"
              value={customTo}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function SectionNavigation({ input }: { input: AnalyticsReportInput }) {
  return (
    <nav aria-label="Analytics sections" className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1 rounded-lg border border-border/70 bg-background/60 p-1">
        {sections.map((section) => {
          const params = buildAnalyticsSearchParams({
            ...input,
            section: section.id,
          });
          const active = input.section === section.id;
          return (
            <Button
              asChild
              className="h-10 min-w-24"
              key={section.id}
              size="sm"
              variant={active ? "primary" : "ghost"}
            >
              <Link
                aria-current={active ? "page" : undefined}
                href={`/admin/analytics?${params.toString()}`}
                scroll={false}
              >
                {section.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

function OverviewSection({
  discordReport,
  input,
  report,
}: {
  discordReport: DiscordAnalyticsReport;
  input: AnalyticsReportInput;
  report: AnalyticsReport;
}) {
  const summary = report.overview.summary;
  const comparison = report.overview.comparison;
  const lifecycleHighlights: LifecycleHighlight[] = [
    ...report.highlights,
    ...buildDiscordLifecycleHighlights(discordReport),
  ];
  const return30 = report.events.returnCohorts.find(
    (cohort) => cohort.days === 30,
  );
  const changeDetail = (
    change: { absolute: number | null; percent: number | null } | undefined,
  ) => {
    const absolute = change?.absolute;
    if (absolute === undefined || absolute === null) return "No comparison";
    const percent = change?.percent ?? null;
    const positive = absolute >= 0;
    return (
      <span className={positive ? "text-emerald-500" : "text-red-500"}>
        {positive ? (
          <ArrowUpRight className="mr-1 inline size-3.5" />
        ) : (
          <ArrowDownRight className="mr-1 inline size-3.5" />
        )}
        {absolute > 0 ? "+" : ""}
        {formatNumber(absolute)} · {formatPercent(percent)}
      </span>
    );
  };
  return (
    <div className="space-y-4">
      <MetricGrid>
        <MetricCard
          definition="Every retained Member profile, whether or not another account concept is relevant."
          detail={`${formatNumber(report.audience.summary.newProfileCount)} created in the selected period`}
          label="Member profiles"
          value={formatNumber(report.overview.memberProfileCount)}
        />
        <MetricCard
          definition="Current retained Member profiles created in the selected period. Historical deletions are unavailable."
          detail={`${formatPercent(ratio(report.audience.summary.newProfileCount, report.overview.memberProfileCount))} of current profiles`}
          label="New profiles"
          value={formatNumber(report.audience.summary.newProfileCount)}
        />
        <MetricCard
          definition="Non-hackathon Club events whose scheduled start is in the selected period."
          detail={changeDetail(comparison?.events)}
          label="Club events"
          value={formatNumber(summary.eventCount)}
        />
        <MetricCard
          definition="One Member profile at one Club event. Repeat scans count once."
          detail={changeDetail(comparison?.attendance)}
          label="Attendances"
          value={formatNumber(summary.distinctAttendanceCount)}
        />
        <MetricCard
          definition="Member profiles with at least one matching Club event attendance."
          detail={changeDetail(comparison?.attendees)}
          label="Distinct attendees"
          value={formatNumber(summary.distinctAttendeeCount)}
        />
        <MetricCard
          definition="Distinct attendees divided by every current retained Member profile."
          detail={changeDetail(comparison?.reach)}
          label="Member reach"
          value={formatPercent(summary.memberReach)}
        />
        <MetricCard
          definition="Selected-period attendees who attended at least two events, divided by all selected attendees."
          detail={`${formatNumber(report.audience.summary.repeatAttendeeCount)} of ${formatNumber(summary.distinctAttendeeCount)} attendees returned`}
          label="Repeat rate"
          value={formatPercent(summary.repeatAttendeeRate)}
        />
        <MetricCard
          definition="First-time attendees who recorded another Club-event attendance within 30 days, excluding profiles without a complete 30-day observation window."
          detail={`${formatNumber(return30?.returnedCount ?? 0)} of ${formatNumber(return30?.matureCount ?? 0)} mature first-time attendees`}
          label="30-day return"
          value={formatPercent(return30?.rate ?? null)}
        />
        <MetricCard
          definition="The middle distinct attendance count across matching events."
          detail={`Average ${formatDecimal(summary.averageAttendance, 1)} per event`}
          label="Median turnout"
          value={formatDecimal(summary.medianAttendance, 0)}
        />
        <MetricCard
          definition="Average valid 1–5 overall rating. The response count is shown separately."
          detail={`${formatNumber(report.overview.feedback.responseCount)} responses`}
          label="Overall rating"
          value={
            report.overview.feedback.averageOverall === null
              ? "—"
              : `${formatDecimal(report.overview.feedback.averageOverall)} / 5`
          }
        />
        <MetricCard
          definition="Current profiles with an effective active dues credit, divided by every current retained Member profile."
          detail={`${formatNumber(report.dues.summary.unpaidCount)} unpaid`}
          label="Dues paid"
          value={formatPercent(report.dues.summary.paidRate)}
        />
        <MetricCard
          definition="Current retained Member profiles with no effective active dues credit recorded."
          detail={`${formatNumber(report.dues.summary.paidCount)} paid · ${formatPercent(report.dues.summary.paidRate)} coverage`}
          label="Unpaid profiles"
          value={formatNumber(report.dues.summary.unpaidCount)}
        />
      </MetricGrid>
      <DiscordParticipationMetrics report={discordReport} />
      {lifecycleHighlights.length > 0 ? (
        <Panel
          description="A linked brief across profile activation, event return, Discord conversation, programming, audience reach, dues, and measurement. Each card opens the section behind the finding."
          title="Member lifecycle findings"
        >
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {highlightGroups.map((group) => {
              const groupHighlights = lifecycleHighlights.filter(
                (highlight) => highlight.group === group.id,
              );
              if (groupHighlights.length === 0) return null;
              const GroupIcon = group.icon;
              return (
                <section
                  aria-labelledby={`highlight-group-${group.id}`}
                  className="min-w-0 rounded-lg border border-border/70 bg-card/60 p-4"
                  key={group.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <GroupIcon
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <h3
                        className="text-sm font-semibold"
                        id={`highlight-group-${group.id}`}
                      >
                        {group.label}
                      </h3>
                      <span className="ml-auto font-mono text-sm tabular-nums text-muted-foreground">
                        {String(groupHighlights.length).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                  <div className="mt-4 grid min-w-0 gap-3">
                    {groupHighlights.map((highlight) => {
                      const params = buildAnalyticsSearchParams({
                        ...input,
                        demographic:
                          highlight.filters.demographic ?? input.demographic,
                        eventTags: highlight.filters.eventTag
                          ? [highlight.filters.eventTag]
                          : input.eventTags,
                        section: highlight.destination,
                      });
                      return (
                        <Link
                          className="group flex min-h-32 flex-col rounded-lg border border-border/70 bg-background/55 p-4 transition-colors hover:border-primary/35 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          href={`/admin/analytics?${params.toString()}`}
                          key={highlight.kind}
                          scroll={false}
                        >
                          <p className="min-w-0 text-base font-medium leading-6">
                            {highlight.message}
                          </p>
                          <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-medium uppercase tracking-[0.12em] text-primary">
                            Open{" "}
                            {
                              sections.find(
                                (section) =>
                                  section.id === highlight.destination,
                              )?.label
                            }
                            <ArrowUpRight
                              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </Panel>
      ) : null}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          description={`${report.events.trend.grain === "week" ? "Weekly" : "Monthly"} distinct member-event attendance.`}
          title="Turnout trend"
        >
          <AttendanceTrend report={report} />
        </Panel>
        <Panel
          description="The highest-volume event types in this selection."
          title="Program mix"
        >
          <HorizontalBars
            data={report.events.groupings.tag}
            label="Attendance by event type"
          />
        </Panel>
      </div>
    </div>
  );
}

function EventsSection({ report }: { report: AnalyticsReport }) {
  const summary = report.events.summary;
  return (
    <div className="space-y-4">
      <MetricGrid>
        <MetricCard
          definition="Matching non-hackathon Club events."
          detail={`${formatDecimal(summary.averageAttendance, 1)} average turnout`}
          label="Events"
          value={formatNumber(summary.eventCount)}
        />
        <MetricCard
          definition="One Member profile at one matching event."
          detail={`${formatDecimal(summary.averageAttendance, 1)} per matching event`}
          label="Attendances"
          value={formatNumber(summary.distinctAttendanceCount)}
        />
        <MetricCard
          definition="Profiles reached by at least one matching event."
          detail={`${formatNumber(report.audience.summary.repeatAttendeeCount)} attended at least twice`}
          label="Attendees"
          value={formatNumber(summary.distinctAttendeeCount)}
        />
        <MetricCard
          definition="Attendees divided by all current Member profiles."
          detail={`${formatNumber(summary.distinctAttendeeCount)} of ${formatNumber(report.overview.memberProfileCount)} profiles`}
          label="Reach"
          value={formatPercent(summary.memberReach)}
        />
        <MetricCard
          definition="Attendees at two or more matching events divided by all matching attendees."
          detail={`${formatNumber(report.audience.summary.repeatAttendeeCount)} of ${formatNumber(summary.distinctAttendeeCount)} attendees`}
          label="Repeat rate"
          value={formatPercent(summary.repeatAttendeeRate)}
        />
        <MetricCard
          definition="Mean distinct attendance across matching events."
          detail={`Median ${formatDecimal(summary.medianAttendance, 0)} per event`}
          label="Average turnout"
          value={formatDecimal(summary.averageAttendance, 1)}
        />
        <MetricCard
          definition="Average valid overall event rating from linked feedback responses."
          detail={`${report.events.feedback.overallResponseCount} valid responses`}
          label="Overall rating"
          value={
            report.events.feedback.averageOverall === null
              ? "—"
              : `${formatDecimal(report.events.feedback.averageOverall)} / 5`
          }
        />
        <MetricCard
          definition="Average valid fun rating from linked feedback responses."
          detail={`${report.events.feedback.funResponseCount} valid responses`}
          label="Fun rating"
          value={
            report.events.feedback.averageFun === null
              ? "—"
              : `${formatDecimal(report.events.feedback.averageFun)} / 5`
          }
        />
        <MetricCard
          definition="Average valid learning rating from linked feedback responses."
          detail={`${report.events.feedback.learningResponseCount} valid responses`}
          label="Learning rating"
          value={
            report.events.feedback.averageLearning === null
              ? "—"
              : `${formatDecimal(report.events.feedback.averageLearning)} / 5`
          }
        />
        <MetricCard
          definition="Linked feedback responses divided by distinct member-event attendances."
          detail={`${report.events.feedback.responseCount} responses`}
          label="Feedback response"
          value={formatPercent(report.events.feedback.responseRate)}
        />
      </MetricGrid>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Attendance over time">
          <AttendanceTrend report={report} />
        </Panel>
        <Panel
          description="A cohort is shown only after its full return window has matured."
          title="Return cohorts"
        >
          <div className="grid gap-2">
            {report.events.returnCohorts.map((cohort) => (
              <div
                className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-md border border-border/60 p-3"
                key={cohort.days}
              >
                <span className="font-mono text-sm font-semibold">
                  {cohort.days}d
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round((cohort.rate ?? 0) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs tabular-nums">
                  {formatPercent(cohort.rate)} · {cohort.returnedCount}/
                  {cohort.matureCount}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Panel title="Attendance by event type">
          <HorizontalBars
            data={report.events.groupings.tag}
            label="Attendance by event type"
          />
        </Panel>
        <Panel title="Attendance by weekday">
          <HorizontalBars
            data={report.events.groupings.weekday}
            label="Attendance by weekday"
          />
        </Panel>
        <Panel title="Attendance by start time">
          <HorizontalBars
            data={report.events.groupings.startTime}
            label="Attendance by start-time band"
          />
        </Panel>
        <Panel title="Attendance by location">
          <HorizontalBars
            data={report.events.groupings.location}
            label="Attendance by location"
          />
        </Panel>
        <Panel
          description="All current Member profiles are included, including the zero-event band."
          title="Attendance frequency"
        >
          <TableRegion label="Member attendance frequency bands">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matching events</TableHead>
                  <TableHead className="text-right">Profiles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.events.frequency.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRegion>
        </Panel>
        <Panel
          description={`Discovery sources describe ${report.events.feedback.discoveryResponseCount} feedback respondents, not every attendee.`}
          title="How respondents found events"
        >
          <HorizontalBars
            data={report.events.feedback.discovery.map((row) => ({
              attendanceCount: row.count,
              label: row.label,
            }))}
            label="Event discovery sources among feedback respondents"
          />
        </Panel>
      </div>
      <Panel
        description="Ratings remain visible at low response counts; reliable top-rated comparisons require five valid overall responses."
        title="Event detail"
      >
        {report.events.rows.length === 0 ? (
          <EmptyInline message="No Club events match this selection." />
        ) : (
          <PaginatedTableRegion
            label="Complete matching event analytics"
            renderTable={(eventRows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead className="text-right">First / return</TableHead>
                    <TableHead className="text-right">Overall</TableHead>
                    <TableHead className="text-right">Fun</TableHead>
                    <TableHead className="text-right">Learning</TableHead>
                    <TableHead className="text-right">Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventRows.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="min-w-48">
                          <p className="font-medium">{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.location}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(event.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.tag}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {event.attendanceCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {event.firstTimeCount} / {event.returningCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDecimal(event.feedback.averageOverall)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDecimal(event.feedback.averageFun)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDecimal(event.feedback.averageLearning)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPercent(event.feedback.responseRate)}
                        <span className="block text-[11px] text-muted-foreground">
                          {event.feedback.responseCount} responses
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            rows={report.events.rows}
          />
        )}
      </Panel>
    </div>
  );
}

function AudienceSection({
  access,
  discordReport,
  onMemberSelect,
  report,
}: {
  access: AnalyticsAccess;
  discordReport: DiscordAnalyticsReport;
  onMemberSelect: (memberId: string) => void;
  report: AnalyticsReport;
}) {
  const selected =
    report.audience.demographics[report.audience.selectedDemographic];
  const shouldMergeUndergraduate =
    report.audience.selectedDemographic === "level_of_study";
  const selectedRows = shouldMergeUndergraduate
    ? mergeUndergraduateDemographicRows(
        report.audience.demographics.level_of_study.rows,
      )
    : selected.rows;
  const affinityRows = shouldMergeUndergraduate
    ? mergeUndergraduateAffinityRows(report.audience.affinity)
    : report.audience.affinity;
  const memberRows = shouldMergeUndergraduate
    ? report.audience.memberRows.map((row) => ({
        ...row,
        category: isUndergraduateLevel(row.category)
          ? COMBINED_UNDERGRADUATE_LABEL
          : row.category,
      }))
    : report.audience.memberRows;
  const chartRows = selectedRows.slice(0, 12);
  return (
    <div className="space-y-4">
      <MetricGrid>
        <MetricCard
          definition="Every current retained Member profile."
          detail={`${formatNumber(report.audience.summary.newProfileCount)} created in the selected period`}
          label="Profiles"
          value={formatNumber(report.audience.summary.memberProfileCount)}
        />
        <MetricCard
          definition="Profiles created inside the selected period. Deleted profiles cannot be reconstructed."
          detail={`${formatPercent(ratio(report.audience.summary.newProfileCount, report.audience.summary.memberProfileCount))} of current profiles`}
          label="New profiles"
          value={formatNumber(report.audience.summary.newProfileCount)}
        />
        <MetricCard
          definition="Profiles with at least one matching event attendance."
          detail={`${formatPercent(ratio(report.audience.summary.attendeeCount, report.audience.summary.memberProfileCount))} of current profiles`}
          label="Reached"
          value={formatNumber(report.audience.summary.attendeeCount)}
        />
        <MetricCard
          definition="Reached profiles with at least two matching attendances."
          detail={`${formatPercent(ratio(report.audience.summary.repeatAttendeeCount, report.audience.summary.attendeeCount))} of reached profiles`}
          label="Repeat attendees"
          value={formatNumber(report.audience.summary.repeatAttendeeCount)}
        />
      </MetricGrid>
      <DiscordParticipationMetrics report={discordReport} />
      <Panel
        description="Base profiles and matching attendees use the same complete demographic categories."
        title={`${demographicLabels[report.audience.selectedDemographic]} composition`}
      >
        {chartRows.length === 0 ? (
          <EmptyInline message="No retained Member profiles are available." />
        ) : (
          <div
            aria-label="Member base and attendee demographic comparison"
            role="img"
          >
            <ShadChart className="aspect-auto h-80 w-full">
              <BarChart
                accessibilityLayer
                data={chartRows}
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
                  dataKey="baseCount"
                  fill="var(--color-baseCount)"
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="attendeeCount"
                  fill="var(--color-attendeeCount)"
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ShadChart>
            <div className="sr-only">
              {chartRows.map((row) => (
                <p key={row.category}>
                  {row.category}: {row.baseCount} profiles and{" "}
                  {row.attendeeCount} attendees
                </p>
              ))}
            </div>
          </div>
        )}
      </Panel>
      <Panel
        description="Representation gap is attendee share minus Member-base share. Positive and negative values are associations, not explanations."
        title="Complete segment analysis"
      >
        <PaginatedTableRegion
          label="Complete demographic segment analysis"
          renderTable={(segmentRows) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Profiles</TableHead>
                  <TableHead className="text-right">Attendees</TableHead>
                  <TableHead className="text-right">Participation</TableHead>
                  <TableHead className="text-right">Audience share</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Repeat</TableHead>
                  <TableHead className="text-right">Dues paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segmentRows.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="min-w-48 font-medium">
                      {row.category}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.baseCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.attendeeCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(row.participationRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(row.audienceShare)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.representationGap !== null &&
                      row.representationGap > 0
                        ? "+"
                        : ""}
                      {formatPercent(row.representationGap)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(row.repeatAttendeeRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercent(row.duesPaidRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          rows={selectedRows}
        />
      </Panel>
      <div className="grid min-w-0 gap-4">
        <Panel
          description="Distinct selected attendance crossed with the selected demographic and event type."
          title="Program affinity"
        >
          {affinityRows.length === 0 ? (
            <EmptyInline message="No matching affinity data." />
          ) : (
            <PaginatedTableRegion
              label="Demographic and event-type affinity"
              renderTable={(affinityRows) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Event type</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Attendances</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affinityRows.map((row) => (
                      <TableRow key={`${row.category}-${row.label}`}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.memberCount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.attendanceCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              rows={affinityRows}
            />
          )}
        </Panel>
        <Panel
          description="Read-only analytical context. Contact information and editing are intentionally absent."
          title="Member drill-down"
        >
          <PaginatedTableRegion
            label="Named member analytical rows"
            renderTable={(memberRows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                    <TableHead>Last attendance</TableHead>
                    <TableHead>Dues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRows.map((row) => (
                    <TableRow key={row.memberId}>
                      <TableCell className="min-w-40 font-medium">
                        <MemberDrilldownName
                          access={access}
                          memberId={row.memberId}
                          name={row.name}
                          onOpen={onMemberSelect}
                        />
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.attendanceCount}
                      </TableCell>
                      <TableCell className="min-w-48">
                        <span>
                          {row.lastEventName ?? "No matching attendance"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(row.lastEventAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.paid ? "default" : "outline"}>
                          {row.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            rows={memberRows}
          />
        </Panel>
      </div>
    </div>
  );
}

function DuesSection({
  access,
  discordReport,
  onMemberSelect,
  report,
}: {
  access: AnalyticsAccess;
  discordReport: DiscordAnalyticsReport;
  onMemberSelect: (memberId: string) => void;
  report: AnalyticsReport;
}) {
  const summary = report.dues.summary;
  const curveData = useMemo(() => {
    const byDay = new Map<number, Record<string, number>>();
    report.dues.academicYears.slice(0, 4).forEach((year) => {
      year.curve.forEach((point) => {
        const row = byDay.get(point.elapsedDays) ?? {
          elapsedDays: point.elapsedDays,
        };
        row[year.label] = point.recordedCount;
        byDay.set(point.elapsedDays, row);
      });
    });
    return [...byDay.values()].sort(
      (a, b) => (a.elapsedDays ?? 0) - (b.elapsedDays ?? 0),
    );
  }, [report.dues.academicYears]);
  const curveConfig = Object.fromEntries(
    report.dues.academicYears
      .slice(0, 4)
      .map((year, index) => [
        year.label,
        { color: `hsl(var(--chart-${(index % 5) + 1}))`, label: year.label },
      ]),
  ) satisfies ChartConfig;
  return (
    <div className="space-y-4">
      <MetricGrid>
        <MetricCard
          definition="Every current retained Member profile is in the current dues denominator."
          detail={`${formatNumber(summary.paidCount)} paid · ${formatNumber(summary.unpaidCount)} unpaid`}
          label="Expected profiles"
          value={formatNumber(summary.profileCount)}
        />
        <MetricCard
          definition="Profiles with an effective active dues credit under the existing dues-status rules."
          detail={`${formatPercent(summary.paidRate)} of expected profiles`}
          label="Paid"
          value={formatNumber(summary.paidCount)}
        />
        <MetricCard
          definition="Profiles with no effective active dues credit recorded."
          detail={`${formatPercent(ratio(summary.unpaidCount, summary.profileCount))} of expected profiles`}
          label="Unpaid"
          value={formatNumber(summary.unpaidCount)}
        />
        <MetricCard
          definition="Paid profiles divided by every current retained Member profile."
          detail={`${formatNumber(summary.paidCount)} of ${formatNumber(summary.profileCount)} expected profiles`}
          label="Paid coverage"
          value={formatPercent(summary.paidRate)}
        />
      </MetricGrid>
      <DiscordParticipationMetrics report={discordReport} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          description="Recorded Member/year credits by elapsed day from August 1. Active and stale details remain in the year table."
          title="Academic-year collection pace"
        >
          {curveData.length === 0 ? (
            <EmptyInline message="No retained dues credits are available." />
          ) : (
            <div
              aria-label="Cumulative dues credits by academic year"
              role="img"
            >
              <ShadChart
                className="aspect-auto h-72 w-full"
                config={curveConfig}
              >
                <LineChart accessibilityLayer data={curveData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="elapsedDays"
                    label={{
                      value: "Days from Aug 1",
                      position: "insideBottom",
                      offset: -4,
                    }}
                  />
                  <YAxis allowDecimals={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {report.dues.academicYears.slice(0, 4).map((year, index) => (
                    <Line
                      dataKey={year.label}
                      dot={false}
                      isAnimationActive={false}
                      key={year.startYear}
                      stroke={`var(--color-${year.label})`}
                      strokeDasharray={
                        index === 0 ? undefined : `${4 + index * 2} 3`
                      }
                      strokeWidth={index === 0 ? 3 : 2}
                      type="stepAfter"
                    />
                  ))}
                </LineChart>
              </ShadChart>
              <div className="sr-only">
                {report.dues.academicYears.slice(0, 4).map((year) => (
                  <p key={year.startYear}>
                    {year.label}: {year.recordedCount} recorded credits among{" "}
                    {year.denominator} retained profiles by year end.
                  </p>
                ))}
              </div>
            </div>
          )}
        </Panel>
        <Panel
          description="Current paid/unpaid status crossed with matching event attendance."
          title="Dues and engagement"
        >
          <div className="grid gap-3">
            {(["paid", "unpaid"] as const).map((state) => {
              const row = report.dues.engagement[state];
              return (
                <div
                  className="rounded-md border border-border/60 p-4"
                  key={state}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium capitalize">{state}</span>
                    <Badge variant={state === "paid" ? "default" : "outline"}>
                      {row.profileCount} profiles
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Reached</dt>
                      <dd className="mt-1 font-mono">
                        {row.reachedCount} · {formatPercent(row.reachRate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Repeat</dt>
                      <dd className="mt-1 font-mono">
                        {row.repeatCount} · {formatPercent(row.repeatRate)}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Panel
        description="Historical denominators contain current retained profiles created before that academic year's end. Deleted profiles cannot be reconstructed."
        title="Academic-year comparison"
      >
        <TableRegion label="Academic-year dues comparison">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic year</TableHead>
                <TableHead className="text-right">Retained profiles</TableHead>
                <TableHead className="text-right">Recorded</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Stale</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead>25 / 50 / 75 / 90%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.dues.academicYears.map((year) => (
                <TableRow key={year.startYear}>
                  <TableCell className="font-medium">{year.label}</TableCell>
                  <TableCell className="text-right font-mono">
                    {year.denominator}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {year.recordedCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {year.activeCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {year.staleCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercent(year.recordedRate)}
                  </TableCell>
                  <TableCell className="min-w-64 text-xs">
                    {year.milestones
                      .map(
                        (milestone) =>
                          `${Math.round(milestone.threshold * 100)}% ${formatDate(milestone.date)}`,
                      )
                      .join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      </Panel>
      <Panel
        description="Every profile without an effective active dues credit. No contact information or edit control is exposed here."
        title="Unpaid member follow-up"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {summary.unpaidCount} profiles have no active dues credit recorded.
          </p>
          {access.canOpenMembers ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/members?dues=unpaid">Open Member admin</Link>
            </Button>
          ) : null}
        </div>
        <PaginatedTableRegion
          label="Named unpaid member list"
          renderTable={(unpaidRows) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Graduation</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead>Last attendance</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidRows.map((row) => (
                  <TableRow key={row.memberId}>
                    <TableCell className="min-w-40 font-medium">
                      <MemberDrilldownName
                        access={access}
                        memberId={row.memberId}
                        name={row.name}
                        onOpen={onMemberSelect}
                      />
                    </TableCell>
                    <TableCell>{row.graduationYear}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.attendanceCount}
                    </TableCell>
                    <TableCell className="min-w-48">
                      {row.lastEventName ?? "No matching attendance"}
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(row.lastEventAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          rows={report.dues.unpaidMembers}
        />
      </Panel>
    </div>
  );
}

function ExportButton({
  input,
  kind,
}: {
  input: AnalyticsReportInput;
  kind: AnalyticsExportKind;
}) {
  const utils = api.useUtils();
  const [pending, setPending] = useState(false);
  const download = useCallback(async () => {
    setPending(true);
    try {
      const result = await utils.analytics.exportReport.fetch({
        ...input,
        kind,
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
      toast.error("The analytics CSV could not be prepared.");
    } finally {
      setPending(false);
    }
  }, [input, kind, utils.analytics.exportReport]);
  return (
    <Button
      className="h-11 w-full sm:w-auto"
      disabled={pending}
      onClick={download}
      type="button"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      Download CSV
    </Button>
  );
}

function readResumeDownloadSignal() {
  const prefix = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=`;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function clearResumeDownloadSignal() {
  document.cookie = `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function ResumeBundleButton() {
  const [isPreparing, setIsPreparing] = useState(false);
  const pollTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const handleDownload = useCallback(() => {
    if (isPreparing) return;

    clearTimers();
    clearResumeDownloadSignal();
    setIsPreparing(true);

    const token = window.crypto.randomUUID().replaceAll("-", "");
    const readySignal = `${token}.ready`;
    const errorSignal = `${token}.error`;

    pollTimerRef.current = window.setInterval(() => {
      const signal = readResumeDownloadSignal();
      if (signal !== readySignal && signal !== errorSignal) return;

      clearTimers();
      clearResumeDownloadSignal();
      setIsPreparing(false);

      if (signal === readySignal) {
        toast.success("Resume bundle download started.");
      } else {
        toast.error(
          "The resume bundle could not be prepared. Please try again.",
        );
      }
    }, 250);

    timeoutTimerRef.current = window.setTimeout(
      () => {
        clearTimers();
        clearResumeDownloadSignal();
        setIsPreparing(false);
        toast.error(
          "Resume preparation is taking longer than expected. Please try again.",
        );
      },
      5 * 60 * 1000,
    );

    const downloadLink = document.createElement("a");
    downloadLink.href = `/api/admin/resume-bundle?downloadToken=${encodeURIComponent(token)}`;
    downloadLink.download = "";
    downloadLink.hidden = true;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }, [clearTimers, isPreparing]);

  return (
    <div className="grid w-full gap-2 sm:w-auto">
      <Button
        className="h-11 w-full sm:w-auto sm:justify-self-start"
        disabled={isPreparing}
        aria-busy={isPreparing}
        onClick={handleDownload}
        type="button"
      >
        {isPreparing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {isPreparing ? "Preparing ZIP…" : "Download ZIP"}
      </Button>
      <p
        className={
          isPreparing
            ? "max-w-72 text-xs leading-relaxed text-muted-foreground"
            : "sr-only"
        }
        aria-live="polite"
      >
        {isPreparing
          ? "Checking available resumes and building folders. This usually takes about a minute; keep this page open."
          : "Resume bundle preparation is idle."}
      </p>
    </div>
  );
}

function ReportsSection({ input }: { input: AnalyticsReportInput }) {
  const exports = [
    {
      description:
        "Headline reach, turnout, retention, feedback, and comparison measures.",
      icon: ChartNoAxesCombined,
      kind: "overview",
      title: "Overview data",
    },
    {
      description:
        "Named events with turnout, first/returning attendance, ratings, and response coverage.",
      icon: CalendarRange,
      kind: "events",
      title: "Event data",
    },
    {
      description:
        "Message volume, participation depth, matched Member counts, daily activity, and top surfaces.",
      icon: MessagesSquare,
      kind: "discord",
      title: "Discord summary",
    },
    {
      description:
        "Full demographic segments and named analytical Member rows for internal planning.",
      icon: UsersRound,
      kind: "audience",
      title: "Audience data",
    },
    {
      description:
        "Current coverage, academic-year pace, milestones, and named unpaid follow-up rows.",
      icon: CircleDollarSign,
      kind: "dues",
      title: "Dues data",
    },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {exports.map((item) => (
          <section
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-white/10 bg-card/95 p-5 shadow-lg shadow-black/15"
            key={item.kind}
          >
            <div className="flex gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="mt-auto">
              <ExportButton input={input} kind={item.kind} />
            </div>
          </section>
        ))}
        <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-white/10 bg-card/95 p-5 shadow-lg shadow-black/15">
          <div className="flex gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <FileArchive className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold">Member resume bundle</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Every available Member resume, organized by graduation term and
                year, university, and major with a complete All folder.
              </p>
            </div>
          </div>
          <div className="mt-auto shrink-0">
            <ResumeBundleButton />
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-primary/25 bg-card/95 p-5 shadow-xl shadow-black/20">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <FileBarChart className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Sponsor-safe report</h2>
                <Badge variant="outline">
                  <ShieldCheck className="mr-1 size-3" />
                  Privacy reduced
                </Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Aggregate reach, growth, programming, audience composition,
                ratings, and response coverage. Names, IDs, dues, exact ages,
                individual history, affinity cross-tabs, and raw feedback are
                excluded. Sparse and complementary demographic cells under five
                are combined.
              </p>
            </div>
          </div>
          <ExportButton input={input} kind="sponsor" />
        </div>
      </section>
      <div className="rounded-md border border-border/60 bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
        <p className="flex items-start gap-2">
          <CheckCircle2
            className="mt-1 size-4 shrink-0 text-emerald-500"
            aria-hidden="true"
          />
          <span>
            Every analytics CSV includes the reporting period, active filters,
            generation time, and metric-definition version. All internal
            downloads remain sensitive Club data.
          </span>
        </p>
      </div>
    </div>
  );
}

export function AnalyticsDashboard({
  access,
  discordReport,
  input,
  report,
}: {
  access: AnalyticsAccess;
  discordReport: DiscordAnalyticsReport;
  input: AnalyticsReportInput;
  report: AnalyticsReport;
}) {
  const router = useRouter();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const content: Record<AnalyticsSection, ReactNode> = {
    audience: (
      <AudienceSection
        access={access}
        discordReport={discordReport}
        onMemberSelect={setSelectedMemberId}
        report={report}
      />
    ),
    discord: (
      <DiscordAnalyticsSection
        canOpenMembers={access.canOpenMembers}
        onMemberSelect={setSelectedMemberId}
        report={discordReport}
      />
    ),
    dues: (
      <DuesSection
        access={access}
        discordReport={discordReport}
        onMemberSelect={setSelectedMemberId}
        report={report}
      />
    ),
    events: <EventsSection report={report} />,
    overview: (
      <OverviewSection
        discordReport={discordReport}
        input={input}
        report={report}
      />
    ),
    reports: <ReportsSection input={input} />,
  };
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {input.section === "discord" ? (
              <Badge
                className={
                  discordReport.coverage.status === "healthy"
                    ? "border-emerald-500/30 text-emerald-500"
                    : "border-amber-500/30 text-amber-500"
                }
                variant="outline"
              >
                <span
                  className={`mr-1.5 size-1.5 rounded-full ${
                    discordReport.coverage.status === "healthy"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                {discordReport.coverage.status === "healthy"
                  ? "Healthy"
                  : "Needs attention"}
                <span className="text-muted-foreground">
                  · Updated{" "}
                  {formatDateTime(
                    discordReport.coverage.lastGatewayEventAt ??
                      discordReport.coverage.lastReconciledAt,
                  )}
                </span>
              </Badge>
            ) : (
              <>
                <Badge variant="outline">{report.metadata.period.label}</Badge>
                <Badge variant="outline">
                  {report.metadata.comparisonPeriod?.label ?? "No comparison"}
                </Badge>
              </>
            )}
            {input.section === "events" && access.canOpenEvents ? (
              <Button asChild className="h-7 px-2 text-xs" variant="outline">
                <Link href="/admin/events">Open Event admin</Link>
              </Button>
            ) : null}
          </div>
        }
        description={
          input.section === "discord"
            ? "Discord activity, sender mix, channel distribution, and matched Member participation without exposing message bodies."
            : "Turnout, audience, dues, and feedback from retained non-hackathon Club records. Metrics show associations and coverage without inventing causes."
        }
        eyebrow={ADMIN_PAGE_EYEBROWS.analytics}
        icon={ChartNoAxesCombined}
        title="Analytics"
      />
      <AnalyticsFilters input={input} report={report} />
      <SectionNavigation input={input} />
      {content[input.section]}
      {selectedMemberId ? (
        <AnalyticsMemberDetail
          canEdit={access.canEditMembers}
          memberId={selectedMemberId}
          onChanged={() => router.refresh()}
          onClose={() => setSelectedMemberId(null)}
          onDeleted={() => {
            setSelectedMemberId(null);
            router.refresh();
          }}
        />
      ) : null}
    </main>
  );
}

import { Activity, Bot, Hash, UsersRound, Webhook } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

import { formatClubDateTime, formatUtcDate } from "~/lib/dates";
import {
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
} from "./analytics-metric-card";

type DiscordAnalyticsReport = RouterOutputs["analytics"]["getDiscordReport"];

const numberFormatter = new Intl.NumberFormat("en-US");
function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatAverage(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
      }).format(value);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function formatTrendDate(value: string) {
  return formatUtcDate(value, value);
}

function formatDateTime(value: Date | null) {
  return formatClubDateTime(value, "No matching activity");
}

function formatDays(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "day" : "days"}`;
}

const mixIcons = {
  bot: Bot,
  human: UsersRound,
  system: Activity,
  webhook: Webhook,
} as const;

export function DiscordAnalyticsSection({
  canOpenMembers,
  onMemberSelect,
  report,
}: {
  canOpenMembers: boolean;
  onMemberSelect: (memberId: string) => void;
  report: DiscordAnalyticsReport;
}) {
  const peakMessages = Math.max(
    1,
    ...report.trend.rows.map((row) => row.messages),
  );
  const recentTrend = report.trend.rows.slice(-42);
  const channelPeak = Math.max(
    1,
    ...report.channels.map((channel) => channel.count),
  );

  return (
    <div className="space-y-4">
      <section aria-label="Discord activity summary">
        <AnalyticsMetricGrid>
          <AnalyticsMetricCard
            definition="Current non-deleted messages created inside the selected period."
            detail={`${report.summary.activeDays} active days in ${report.summary.calendarDays} observed days`}
            label="Current messages"
            value={formatNumber(report.summary.messageCount)}
          />
          <AnalyticsMetricCard
            definition="Distinct human Discord accounts that authored a current message in the selected period. Bots, webhooks, and system messages are excluded."
            detail={`${formatNumber(report.summary.humanMessageCount)} human-authored messages`}
            label="People posting"
            value={formatNumber(report.summary.uniqueHumanAuthors)}
          />
          <AnalyticsMetricCard
            definition="Discord channels and threads currently visible to the archive bot."
            detail={`${formatPercent(report.summary.activeSurfaceRate)} of ${formatNumber(report.summary.visibleChannels + report.summary.visibleThreads)} visible channels and threads`}
            label="Active surfaces"
            value={formatNumber(report.summary.activeSurfaceCount)}
          />
          <AnalyticsMetricCard
            definition="Human-authored messages divided by distinct human authors in the selected period."
            detail={`Median ${formatAverage(report.summary.medianHumanMessagesPerAuthor)} per person · ${formatNumber(report.summary.tombstonedMessageCount)} tombstones`}
            label="Messages per person"
            value={formatAverage(report.summary.averageHumanMessagesPerAuthor)}
          />
        </AnalyticsMetricGrid>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="min-w-0 rounded-lg border border-border/70 bg-card/95 p-4 shadow-2xl shadow-black/15 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">Message activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily current-message volume for the most recent 42 active days.
              </p>
            </div>
            <Badge variant="outline">
              {report.trend.rows.length} active days measured
            </Badge>
          </div>
          {recentTrend.length === 0 ? (
            <div className="mt-4 grid min-h-56 place-items-center rounded-md border border-dashed border-border/80 bg-muted/10 p-6 text-sm text-muted-foreground">
              No Discord activity matches this period.
            </div>
          ) : (
            <>
              <div
                aria-label="Daily Discord message activity"
                className="mt-5 flex h-56 items-end gap-1 overflow-hidden rounded-md border border-border/60 bg-muted/10 px-3 pb-3 pt-6"
                role="img"
              >
                <TooltipProvider delayDuration={100}>
                  {recentTrend.map((row) => {
                    const date = formatTrendDate(row.date);
                    return (
                      <Tooltip key={row.date}>
                        <TooltipTrigger asChild>
                          <div
                            aria-label={`Discord activity on ${date}`}
                            className="group relative flex h-full min-w-0 flex-1 cursor-default items-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            tabIndex={0}
                          >
                            <div
                              className="w-full min-w-1 rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary group-focus-visible:bg-primary"
                              style={{
                                height: `${Math.max(
                                  2,
                                  (row.messages / peakMessages) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs leading-5">
                          <p className="font-medium">{date}</p>
                          <p>
                            {formatNumber(row.messages)} messages ·{" "}
                            {formatNumber(row.activeChannels)} active surfaces
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{recentTrend[0]?.date}</span>
                <span>{recentTrend.at(-1)?.date}</span>
              </div>
              <div className="sr-only">
                {recentTrend.map((row) => (
                  <p key={row.date}>
                    {row.date}: {row.messages} messages across{" "}
                    {row.activeChannels} active surfaces
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg border border-border/70 bg-card/95 p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-semibold">Sender mix</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Mutually exclusive classification of current messages.
          </p>
          <div className="mt-4 space-y-4">
            {report.mix.map((row) => {
              const Icon = mixIcons[row.kind];
              return (
                <div key={row.kind}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {row.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(row.count)} · {formatPercent(row.share)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(row.share ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="min-w-0 rounded-lg border border-border/70 bg-card/95 p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Most active surfaces</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Current-message distribution across the top 12 channels and threads.
          </p>
          <div className="mt-5 space-y-4">
            {report.channels.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                No channel activity matches this period.
              </p>
            ) : (
              report.channels.map((channel, index) => (
                <div key={`${channel.label}-${channel.type}-${index}`}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {channel.label}
                      {channel.isThread ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          thread
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatNumber(channel.count)} ·{" "}
                      {formatPercent(channel.share)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/75"
                      style={{
                        width: `${(channel.count / channelPeak) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="min-w-0 rounded-lg border border-border/70 bg-card/95 p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Member message drill-down</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Human messages matched to retained Member profiles through stable
            Discord accounts. Unmatched Discord participants remain represented
            only in the aggregate metrics above.
          </p>
          {report.memberRows.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              No Member profiles have matched Discord activity in this period.
            </p>
          ) : (
            <div
              aria-label="Discord messages by member"
              className="mt-4 max-h-96 max-w-full overflow-auto rounded-md border border-border/60"
              role="region"
              tabIndex={0}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Discord</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead className="text-right">Active days</TableHead>
                    <TableHead className="text-right">Surfaces</TableHead>
                    <TableHead className="text-right">Current streak</TableHead>
                    <TableHead className="text-right">Longest streak</TableHead>
                    <TableHead>Last message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.memberRows.map((row) => (
                    <TableRow key={row.memberId}>
                      <TableCell className="min-w-40 font-medium">
                        {canOpenMembers ? (
                          <button
                            type="button"
                            className="min-h-9 text-left text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => onMemberSelect(row.memberId)}
                          >
                            {row.name}
                          </button>
                        ) : (
                          row.name
                        )}
                      </TableCell>
                      <TableCell className="min-w-36">
                        @{row.discordUser}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.messageCount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.activeDays)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.activeChannels)}
                      </TableCell>
                      <TableCell className="min-w-32 text-right font-mono">
                        {formatDays(row.currentStreakDays)}
                      </TableCell>
                      <TableCell className="min-w-32 text-right font-mono">
                        {formatDays(row.longestStreakDays)}
                      </TableCell>
                      <TableCell className="min-w-44">
                        {formatDateTime(row.lastMessageAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

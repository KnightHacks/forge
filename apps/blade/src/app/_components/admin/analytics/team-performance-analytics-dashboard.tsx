"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarCheck2,
  Flame,
  ListChecks,
  Loader2,
  RefreshCcw,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type { TeamPerformanceReportInput } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
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

import type { TeamPerformanceRankField } from "./team-performance-params";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import {
  RouteTransitionLink as Link,
  useNavigationRouter as useRouter,
} from "~/app/_components/shared/route-transition-link";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime } from "~/lib/dates";
import {
  buildPeriodPatch,
  parseCustomRangeEnd,
  parseCustomRangeStart,
  resolvePeriodSelectValue,
  toCustomRangeInputs,
} from "./analytics-filter-period";
import { AnalyticsMemberDetail } from "./analytics-member-detail";
import {
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
} from "./analytics-metric-card";
import { buildTeamPerformanceSearchParams } from "./team-performance-params";

type TeamOptions = RouterOutputs["analytics"]["listTeamPerformanceOptions"];
type TeamReport = NonNullable<
  RouterOutputs["analytics"]["getTeamPerformanceReport"]
>;
type TeamMember = TeamReport["members"][number];

const numberFormatter = new Intl.NumberFormat("en-US");

const rankLabels: Record<TeamPerformanceRankField, string> = {
  "current-streak": "Current Discord streak",
  "longest-streak": "Longest Discord streak",
  events: "Events attended",
  issues: "Issues owned",
  messages: "Discord messages",
};

function metricValue(member: TeamMember, rankBy: TeamPerformanceRankField) {
  switch (rankBy) {
    case "issues":
      return member.issues.assignedCount;
    case "messages":
      return member.discord.messageCount;
    case "current-streak":
      return member.discord.currentStreakDays;
    case "longest-streak":
      return member.discord.longestStreakDays;
    case "events":
      return member.events.distinctEventCount;
  }
}

function mostRecentActivity(member: TeamMember) {
  const values = [member.discord.lastMessageAt, member.events.lastEventAt]
    .filter((value): value is Date => value !== null)
    .map((value) => value.getTime());
  return values.length === 0 ? null : new Date(Math.max(...values));
}

export function TeamPerformanceAnalyticsDashboard({
  access,
  canAccessHackathon,
  input,
  options,
  rankBy,
  report,
}: {
  access: { canEditMembers: boolean; canOpenMembers: boolean };
  canAccessHackathon: boolean;
  input: TeamPerformanceReportInput;
  options: TeamOptions;
  rankBy: TeamPerformanceRankField;
  report: TeamReport;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const customRange = toCustomRangeInputs(input.period);
  const rankedMembers = useMemo(
    () =>
      [...report.members].sort(
        (left, right) =>
          metricValue(right, rankBy) - metricValue(left, rankBy) ||
          right.discord.activeDayCount - left.discord.activeDayCount ||
          right.events.distinctEventCount - left.events.distinctEventCount ||
          left.name.localeCompare(right.name),
      ),
    [rankBy, report.members],
  );

  const navigate = (
    nextInput: TeamPerformanceReportInput,
    nextRankBy = rankBy,
  ) => {
    const params = buildTeamPerformanceSearchParams(nextInput, nextRankBy);
    startTransition(() => {
      router.replace(`/admin/analytics?${params.toString()}`, {
        scroll: false,
      });
    });
  };
  const updatePeriod = (value: string) => {
    const patch = buildPeriodPatch(value);
    if (patch?.period) navigate({ ...input, period: patch.period });
  };
  const updateCustomFrom = (value: string) => {
    if (input.period.kind !== "custom" || !value) return;
    navigate({
      ...input,
      period: {
        ...input.period,
        from: parseCustomRangeStart(value),
      },
    });
  };
  const updateCustomTo = (value: string) => {
    if (input.period.kind !== "custom" || !value) return;
    navigate({
      ...input,
      period: {
        ...input.period,
        to: parseCustomRangeEnd(value),
      },
    });
  };

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        actions={
          <Badge variant="outline">{report.metadata.period.label}</Badge>
        }
        description="Compare issue ownership, Discord participation, and Club event engagement for the people on one team. Rankings use the selected metric—there is no hidden blended score."
        eyebrow={ADMIN_PAGE_EYEBROWS.teamAnalytics}
        icon={UsersRound}
        title="Team performance"
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/analytics?scope=club">Club analytics</Link>
        </Button>
        <Button variant="secondary">Team performance</Button>
        {canAccessHackathon ? (
          <Button asChild variant="outline">
            <Link href="/admin/analytics?scope=hackathon">
              Hackathon analytics
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="sticky top-16 z-20 rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl shadow-black/15 backdrop-blur">
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
          <ResponsiveComboBox
            ariaLabel="Club team"
            buttonPlaceholder="Select team"
            emptyMessage="No teams found."
            getItemLabel={(team) => team.label}
            getItemSearchValue={(team) => `${team.label} ${team.heading}`}
            getItemValue={(team) => team.id}
            inputPlaceholder="Search teams"
            items={options.options}
            onValueChange={(teamSlug) => navigate({ ...input, teamSlug })}
            renderItem={(team) => (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="truncate">{team.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {team.memberCount} members
                </span>
              </div>
            )}
            triggerClassName="h-11"
            value={input.teamSlug}
          />
          <Select
            onValueChange={updatePeriod}
            value={resolvePeriodSelectValue(input.period)}
          >
            <SelectTrigger aria-label="Reporting period" className="h-11">
              <SelectValue placeholder="Reporting period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_semester">Current semester</SelectItem>
              <SelectItem value="current_academic_year">
                Current academic year
              </SelectItem>
              <SelectItem value="all_time">All time</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              navigate(input, value as TeamPerformanceRankField)
            }
            value={rankBy}
          >
            <SelectTrigger aria-label="Rank members by" className="h-11">
              <SelectValue placeholder="Rank members by" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(rankLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  Rank by {label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="h-11 gap-2"
            disabled={isPending}
            onClick={() =>
              navigate(
                {
                  period: { kind: "current_academic_year" },
                  teamSlug: options.defaultTeamSlug ?? input.teamSlug,
                },
                "issues",
              )
            }
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
                onChange={(event) => updateCustomFrom(event.target.value)}
                type="date"
                value={customRange.from}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Through
              <Input
                className="h-11"
                onChange={(event) => updateCustomTo(event.target.value)}
                type="date"
                value={customRange.to}
              />
            </label>
          </div>
        ) : null}
      </section>

      <AnalyticsMetricGrid>
        <AnalyticsMetricCard
          definition="Distinct Blade accounts holding a role that places them on this Club team."
          detail={report.metadata.team.heading}
          label="Team members"
          value={numberFormatter.format(report.summary.memberCount)}
        />
        <AnalyticsMetricCard
          definition="Issues owned by this team and assigned to its members during the selected period."
          detail={`${numberFormatter.format(report.members.reduce((sum, member) => sum + member.issues.finishedCount, 0))} finished`}
          label="Assigned issues"
          value={numberFormatter.format(report.summary.assignedIssueCount)}
        />
        <AnalyticsMetricCard
          definition="Team members with at least one human-authored Discord message in the selected period."
          detail={`${numberFormatter.format(report.members.reduce((sum, member) => sum + member.discord.messageCount, 0))} messages`}
          label="Discord participants"
          value={numberFormatter.format(report.summary.discordParticipantCount)}
        />
        <AnalyticsMetricCard
          definition="Distinct Club event attendances summed across team members in the selected period."
          detail={`${numberFormatter.format(report.members.reduce((sum, member) => sum + member.events.checkInCount, 0))} check-in records`}
          label="Event attendance"
          value={numberFormatter.format(
            report.summary.distinctEventAttendanceCount,
          )}
        />
      </AnalyticsMetricGrid>

      <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/15">
        <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold">{report.metadata.team.label} team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked by {rankLabels[rankBy].toLowerCase()}. Select another rank
              field to compare a different signal.
            </p>
          </div>
          <Badge variant="outline">{rankedMembers.length} people</Badge>
        </div>
        {rankedMembers.length === 0 ? (
          <div className="grid min-h-48 place-items-center p-6 text-center text-sm text-muted-foreground">
            No members currently hold a role assigned to this team.
          </div>
        ) : (
          <div
            aria-label="Team member engagement ranking"
            className="max-h-[42rem] overflow-auto"
            role="region"
            tabIndex={0}
          >
            <Table className="min-w-[74rem]">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Team role</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">Discord</TableHead>
                  <TableHead className="text-right">Streaks</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedMembers.map((member, index) => (
                  <TableRow
                    className={isPending ? "opacity-60" : undefined}
                    key={member.userId}
                  >
                    <TableCell className="font-mono text-lg font-semibold tabular-nums text-primary">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {member.memberId && access.canOpenMembers ? (
                        <button
                          className="text-left font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedMemberId(member.memberId)}
                          type="button"
                        >
                          {member.name}
                        </button>
                      ) : (
                        <span className="font-medium">{member.name}</span>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.discordUser
                          ? `@${member.discordUser}`
                          : "No Member profile"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {member.roles.map((role) => (
                          <Badge key={role.id} variant="outline">
                            {role.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-mono font-semibold tabular-nums">
                        {member.issues.assignedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.issues.openCount} open ·{" "}
                        {member.issues.finishedCount} finished
                        {member.issues.overdueCount > 0
                          ? ` · ${member.issues.overdueCount} overdue`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-mono font-semibold tabular-nums">
                        {numberFormatter.format(member.discord.messageCount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.discord.activeDayCount} days ·{" "}
                        {member.discord.activeChannelCount} surfaces
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-mono font-semibold tabular-nums">
                        {member.discord.currentStreakDays} current
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.discord.longestStreakDays} longest
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-mono font-semibold tabular-nums">
                        {member.events.distinctEventCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.events.checkInCount} check-ins ·{" "}
                        {member.events.pointsAwarded} pts
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatClubDateTime(
                        mostRecentActivity(member),
                        "No activity in period",
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-md border border-white/10 bg-background/60 p-4">
          <ListChecks
            className="mt-0.5 size-4 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Issues count only work owned by the selected team’s roles.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-white/10 bg-background/60 p-4">
          <Flame className="mt-0.5 size-4 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            A current streak may end yesterday because today is still in
            progress.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-white/10 bg-background/60 p-4">
          <CalendarCheck2
            className="mt-0.5 size-4 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Events include Club check-ins only; hackathon attendance is
            excluded.
          </p>
        </div>
      </div>

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

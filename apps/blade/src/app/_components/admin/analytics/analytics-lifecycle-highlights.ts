import type {
  AnalyticsReport,
  DiscordAnalyticsReport,
} from "./analytics-report-types";
import {
  formatDecimal,
  formatNumber,
  formatPercent,
} from "./analytics-formatting";

export type LifecycleGroup =
  | AnalyticsReport["highlights"][number]["group"]
  | "discord";

export interface LifecycleHighlight {
  destination: "audience" | "discord" | "dues" | "events";
  filters: {
    demographic?: AnalyticsReport["audience"]["selectedDemographic"];
    eventTag?: string;
  };
  group: LifecycleGroup;
  kind: string;
  message: string;
}

/**
 * The Club report ships its own highlights from the API. Discord is read
 * separately, so its two findings are composed here in the same shape and
 * appended to the lifecycle brief.
 */
export function buildDiscordLifecycleHighlights(
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

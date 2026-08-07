import type { ReactNode } from "react";

import { SummaryMetric } from "./detail-panel";

const numberFormatter = new Intl.NumberFormat("en-US");

export function DiscordEngagementMetrics({
  activeChannelCount,
  activeDayCount,
  currentStreakDays,
  lastMessage,
  longestStreakDays,
  messageCount,
}: {
  activeChannelCount: number;
  activeDayCount: number;
  currentStreakDays: number;
  lastMessage: ReactNode;
  longestStreakDays: number;
  messageCount: number;
}) {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2 border-b border-border/70 p-3 sm:grid-cols-3 sm:p-4">
      <SummaryMetric
        label="Messages"
        value={numberFormatter.format(messageCount)}
      />
      <SummaryMetric
        label="Active days"
        value={numberFormatter.format(activeDayCount)}
      />
      <SummaryMetric
        label="Active surfaces"
        value={numberFormatter.format(activeChannelCount)}
      />
      <SummaryMetric
        label="Current streak"
        value={`${numberFormatter.format(currentStreakDays)} days`}
      />
      <SummaryMetric
        label="Longest streak"
        value={`${numberFormatter.format(longestStreakDays)} days`}
      />
      <SummaryMetric
        label="Last message"
        value={
          <span className="font-sans text-sm font-medium">{lastMessage}</span>
        }
      />
    </div>
  );
}

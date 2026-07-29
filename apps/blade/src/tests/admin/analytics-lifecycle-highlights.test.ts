import { describe, expect, it } from "vitest";

import type { DiscordAnalyticsReport } from "~/app/_components/admin/analytics/analytics-report-types";
import { buildDiscordLifecycleHighlights } from "~/app/_components/admin/analytics/analytics-lifecycle-highlights";

function discordReport(summary: Record<string, unknown>) {
  return {
    summary: {
      activeDayRate: 0.2,
      activeDays: 2,
      activeSurfaceCount: 4,
      activeSurfaceRate: 4 / 52,
      averageHumanMessagesPerAuthor: 75 / 18,
      calendarDays: 10,
      humanMessageCount: 75,
      medianHumanMessagesPerAuthor: 3,
      uniqueHumanAuthors: 18,
      ...summary,
    },
  } as unknown as DiscordAnalyticsReport;
}

describe("buildDiscordLifecycleHighlights", () => {
  it("routes both findings to the Discord section", () => {
    const highlights = buildDiscordLifecycleHighlights(discordReport({}));

    expect(highlights).toHaveLength(2);
    expect(highlights.map((highlight) => highlight.kind)).toStrictEqual([
      "discord_participation_depth",
      "discord_activity_breadth",
    ]);
    highlights.forEach((highlight) => {
      expect(highlight.destination).toBe("discord");
      expect(highlight.group).toBe("discord");
      expect(highlight.filters).toStrictEqual({});
    });
  });

  it("states participation depth with both the average and the median", () => {
    const [participation] = buildDiscordLifecycleHighlights(discordReport({}));

    expect(participation?.message).toBe(
      "18 people authored 75 Discord messages—4.2 on average and 3.0 at the median.",
    );
  });

  it("says nobody participated rather than reporting rates over no authors", () => {
    const [participation] = buildDiscordLifecycleHighlights(
      discordReport({
        averageHumanMessagesPerAuthor: null,
        humanMessageCount: 0,
        medianHumanMessagesPerAuthor: null,
        uniqueHumanAuthors: 0,
      }),
    );

    expect(participation?.message).toBe(
      "No human Discord participants are represented in the selected period.",
    );
  });

  it("describes activity breadth across days and surfaces", () => {
    const [, activity] = buildDiscordLifecycleHighlights(discordReport({}));

    expect(activity?.message).toBe(
      "Discord conversation was active on 2 of 10 observed days (20%) across 4 surfaces (7.7% of visible surfaces).",
    );
  });

  it("renders unmeasurable activity rates as em dashes", () => {
    const [, activity] = buildDiscordLifecycleHighlights(
      discordReport({
        activeDayRate: null,
        activeSurfaceRate: null,
      }),
    );

    expect(activity?.message).toContain("(—)");
    expect(activity?.message).toContain("(— of visible surfaces)");
  });
});

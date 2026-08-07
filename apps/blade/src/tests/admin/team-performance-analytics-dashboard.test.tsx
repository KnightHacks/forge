import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { teamPerformanceReportInputSchema } from "@forge/validators";

import { TeamPerformanceAnalyticsDashboard } from "~/app/_components/admin/analytics/team-performance-analytics-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const options = {
  defaultTeamSlug: "development",
  options: [
    {
      heading: "Build the systems that run Knight Hacks.",
      id: "development",
      label: "Development",
      memberCount: 2,
    },
  ],
} satisfies RouterOutputs["analytics"]["listTeamPerformanceOptions"];

const report = {
  members: [
    {
      discord: {
        activeChannelCount: 5,
        activeDayCount: 12,
        currentStreakDays: 4,
        lastMessageAt: new Date("2026-08-06T18:00:00.000Z"),
        longestStreakDays: 17,
        messageCount: 143,
      },
      discordUser: "ada",
      events: {
        checkInCount: 8,
        distinctEventCount: 7,
        lastEventAt: new Date("2026-08-05T18:00:00.000Z"),
        pointsAwarded: 350,
      },
      issues: {
        assignedCount: 9,
        finishedCount: 6,
        openCount: 3,
        overdueCount: 1,
      },
      memberId: "10000000-0000-4000-8000-000000000001",
      name: "Ada Lovelace",
      roles: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          label: "Officer",
          name: "Dev Officer",
        },
      ],
      userId: "30000000-0000-4000-8000-000000000001",
    },
  ],
  metadata: {
    generatedAt: new Date("2026-08-07T18:00:00.000Z"),
    metricVersion: "team-performance-v1",
    period: {
      kind: "current_academic_year" as const,
      label: "2026–2027 academic year",
      observationEnd: new Date("2026-08-07T18:00:00.000Z"),
      start: new Date("2026-07-01T00:00:00.000Z"),
    },
    team: {
      heading: "Build the systems that run Knight Hacks.",
      id: "development",
      label: "Development",
    },
  },
  summary: {
    assignedIssueCount: 9,
    discordParticipantCount: 1,
    distinctEventAttendanceCount: 7,
    memberCount: 1,
  },
} satisfies NonNullable<RouterOutputs["analytics"]["getTeamPerformanceReport"]>;

describe("TeamPerformanceAnalyticsDashboard", () => {
  it("renders transparent rankings and both Discord streak values", () => {
    const html = renderToStaticMarkup(
      createElement(TeamPerformanceAnalyticsDashboard, {
        access: { canEditMembers: false, canOpenMembers: true },
        canAccessHackathon: true,
        input: teamPerformanceReportInputSchema.parse({
          teamSlug: "development",
        }),
        options,
        rankBy: "issues",
        report,
      }),
    );

    expect(html).toContain("Team performance");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("9");
    expect(html).toContain("143");
    expect(html).toContain("4 current");
    expect(html).toContain("17 longest");
    expect(html).toContain("there is no hidden blended score");
  });
});

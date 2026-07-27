import { describe, expect, it } from "vitest";

import {
  serializeInternalAnalyticsCsv,
  serializeSponsorAnalyticsCsv,
} from "../../utils/analytics/export";

describe("club analytics CSV", () => {
  it("[TC-019, TC-021] keeps approved internal identity and neutralizes formulas", () => {
    const csv = serializeInternalAnalyticsCsv({
      generatedAt: new Date("2026-07-16T12:00:00.000Z"),
      kind: "audience",
      metadata: {
        comparisonLabel: "None",
        filterLabel: "All event types",
        metricVersion: "club-analytics-v1",
        periodLabel: "2025-2026 academic school year",
      },
      rows: [
        {
          attendanceCount: 3,
          category: "Undergraduate",
          lastEventName: '=HYPERLINK("https://evil.test","Open")',
          memberId: "00000000-0000-4000-8000-000000000101",
          name: "+Alex Analytics",
          paid: true,
        },
      ],
    });

    expect(csv).toContain("club-analytics-v1");
    expect(csv).toContain("00000000-0000-4000-8000-000000000101");
    expect(csv).toContain("'+Alex Analytics");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/(?:^|,)=(?:HYPERLINK|IMPORT)/m);
  });

  it("serializes matched Discord members without raw message or author records", () => {
    const csv = serializeInternalAnalyticsCsv({
      generatedAt: new Date("2026-07-26T12:00:00.000Z"),
      kind: "discord",
      metadata: {
        comparisonLabel: "Not applicable",
        filterLabel: "Discord activity and matched Member counts",
        metricVersion: "discord-analytics-v2",
        periodLabel: "2025-2026 academic school year",
      },
      rows: [
        {
          metric: "Human participants",
          record_subtype: "summary",
          value: 53,
        },
        {
          count: 18,
          date: "2026-07-26",
          record_subtype: "daily_activity",
        },
        {
          member_id: "00000000-0000-4000-8000-000000000101",
          member_name: "Ada Analytics",
          message_count: 12,
          record_subtype: "member",
        },
      ],
    });

    expect(csv).toContain("discord-analytics-v2");
    expect(csv).toContain("Human participants");
    expect(csv).toContain("daily_activity");
    expect(csv).toContain("Ada Analytics");
    expect(csv).toContain("00000000-0000-4000-8000-000000000101");
    for (const forbidden of [
      "authorDiscordUserId",
      "authorLabel",
      "messageId",
      "content",
      "attachments",
      "embeds",
    ]) {
      expect(csv).not.toContain(forbidden);
    }
  });

  it("[TC-020] withholds sparse sponsor demographics and excludes private domains", () => {
    const csv = serializeSponsorAnalyticsCsv({
      audienceRows: [
        {
          attendeeCount: 7,
          category: "Undergraduate",
          demographic: "level_of_study",
          memberCount: 12,
        },
        {
          attendeeCount: 2,
          category: "Graduate",
          demographic: "level_of_study",
          memberCount: 4,
        },
        {
          attendeeCount: 9,
          category: "Other",
          demographic: "level_of_study",
          memberCount: 10,
        },
      ],
      generatedAt: new Date("2026-07-16T12:00:00.000Z"),
      metadata: {
        comparisonLabel: "2024-2025 academic school year",
        filterLabel: "All event types",
        metricVersion: "club-analytics-v1",
        periodLabel: "2025-2026 academic school year",
      },
      metrics: [
        {
          coverage: 0.8,
          denominator: 100,
          metric: "Member reach",
          numerator: 60,
          value: 0.6,
        },
      ],
      suppressionThreshold: 5,
    });

    expect(csv).toContain("Member reach");
    expect(csv).toContain("Undergraduate");
    expect(csv).toContain("level_of_study");
    expect(csv).toContain("Withheld / other");
    expect(csv).not.toContain(",Graduate,");
    expect(csv).not.toContain("audience,audience_composition,2,2,4");
    expect(csv).not.toMatch(/member(?: id| name)|dues|stripe|payment/i);
  });
});

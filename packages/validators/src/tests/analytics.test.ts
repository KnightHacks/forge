import { describe, expect, it } from "vitest";

import {
  analyticsExportInputSchema,
  analyticsReportInputSchema,
} from "../analytics";

describe("club analytics inputs", () => {
  it("[TC-003] applies stable defaults and normalizes event tags", () => {
    expect(analyticsReportInputSchema.parse({})).toEqual({
      audienceView: "composition",
      clubAudienceCohort: "all_profiles",
      comparison: "previous_academic_year",
      demographic: "level_of_study",
      eventId: null,
      eventTags: [],
      period: { kind: "current_academic_year" },
      section: "overview",
    });

    expect(
      analyticsReportInputSchema.parse({
        eventTags: [" Workshop ", "Social", "Workshop"],
        period: { kind: "academic_year", startYear: 2025 },
      }).eventTags,
    ).toEqual(["Workshop", "Social"]);
  });

  it("[TC-003] accepts each approved report and export selection", () => {
    for (const section of [
      "overview",
      "events",
      "discord",
      "audience",
      "dues",
      "reports",
    ] as const) {
      expect(analyticsReportInputSchema.parse({ section }).section).toBe(
        section,
      );
    }

    for (const kind of [
      "overview",
      "events",
      "discord",
      "audience",
      "dues",
      "sponsor",
    ] as const) {
      expect(analyticsExportInputSchema.parse({ kind }).kind).toBe(kind);
    }
  });

  it("[TC-002] defaults comparisons according to the selected period", () => {
    expect(
      analyticsReportInputSchema.parse({
        period: { kind: "current_semester" },
      }).comparison,
    ).toBe("previous_period");
    expect(
      analyticsReportInputSchema.parse({ period: { kind: "all_time" } })
        .comparison,
    ).toBe("none");
  });

  it("[TC-003] rejects malformed custom ranges and excessive scope", () => {
    expect(() =>
      analyticsReportInputSchema.parse({
        period: {
          from: new Date("2026-08-02T00:00:00.000Z"),
          kind: "custom",
          to: new Date("2026-08-01T00:00:00.000Z"),
        },
      }),
    ).toThrow(/after/i);

    expect(() =>
      analyticsReportInputSchema.parse({
        period: {
          from: new Date("2000-01-01T00:00:00.000Z"),
          kind: "custom",
          to: new Date("2020-01-01T00:00:00.000Z"),
        },
      }),
    ).toThrow(/ten years/i);

    expect(() =>
      analyticsReportInputSchema.parse({
        eventTags: Array.from({ length: 21 }, (_, index) => `tag-${index}`),
      }),
    ).toThrow();
    expect(() =>
      analyticsReportInputSchema.parse({ eventTags: [" "] }),
    ).toThrow();
    expect(() =>
      analyticsReportInputSchema.parse({ eventId: "not-a-uuid" }),
    ).toThrow();
  });
});

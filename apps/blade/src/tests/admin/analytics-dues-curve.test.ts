import { describe, expect, it } from "vitest";

import type { AnalyticsReport } from "~/app/_components/admin/analytics/analytics-report-types";
import {
  buildDuesCurveConfig,
  buildDuesCurveRows,
  duesCurveYears,
} from "~/app/_components/admin/analytics/analytics-dues-curve";

type AcademicYears = AnalyticsReport["dues"]["academicYears"];

function academicYear(
  startYear: number,
  curve: { elapsedDays: number; recordedCount: number }[],
) {
  return {
    activeCount: 0,
    curve,
    denominator: 10,
    label: `${startYear}-${startYear + 1}`,
    milestones: [],
    recordedCount: curve.at(-1)?.recordedCount ?? 0,
    recordedRate: null,
    staleCount: 0,
    startYear,
  } as unknown as AcademicYears[number];
}

const years: AcademicYears = [
  academicYear(2025, [
    { elapsedDays: 45, recordedCount: 9 },
    { elapsedDays: 0, recordedCount: 0 },
  ]),
  academicYear(2024, [
    { elapsedDays: 45, recordedCount: 7 },
    { elapsedDays: 100, recordedCount: 11 },
  ]),
  academicYear(2023, [{ elapsedDays: 0, recordedCount: 1 }]),
  academicYear(2022, [{ elapsedDays: 0, recordedCount: 2 }]),
  academicYear(2021, [{ elapsedDays: 0, recordedCount: 3 }]),
];

describe("duesCurveYears", () => {
  it("plots at most four academic years", () => {
    expect(duesCurveYears(years).map((year) => year.startYear)).toStrictEqual([
      2025, 2024, 2023, 2022,
    ]);
    expect(duesCurveYears([])).toStrictEqual([]);
  });
});

describe("buildDuesCurveRows", () => {
  it("pivots each year onto one shared elapsed-day axis, in day order", () => {
    expect(buildDuesCurveRows(years.slice(0, 2))).toStrictEqual([
      { "2025-2026": 0, elapsedDays: 0 },
      { "2024-2025": 7, "2025-2026": 9, elapsedDays: 45 },
      { "2024-2025": 11, elapsedDays: 100 },
    ]);
  });

  it("leaves a year out of a day it never reached rather than charting a zero", () => {
    const rows = buildDuesCurveRows(years.slice(0, 2));

    expect(rows[2]).not.toHaveProperty("2025-2026");
  });

  it("ignores years past the four-line limit", () => {
    const rows = buildDuesCurveRows(years);

    expect(rows[0]).not.toHaveProperty("2021-2022");
    expect(rows[0]).toHaveProperty("2022-2023");
  });

  it("returns nothing when no year has a recorded curve", () => {
    expect(buildDuesCurveRows([])).toStrictEqual([]);
    expect(buildDuesCurveRows([academicYear(2025, [])])).toStrictEqual([]);
  });
});

describe("buildDuesCurveConfig", () => {
  it("gives each plotted year its own themed series", () => {
    expect(buildDuesCurveConfig(years)).toStrictEqual({
      "2022-2023": { color: "hsl(var(--chart-4))", label: "2022-2023" },
      "2023-2024": { color: "hsl(var(--chart-3))", label: "2023-2024" },
      "2024-2025": { color: "hsl(var(--chart-2))", label: "2024-2025" },
      "2025-2026": { color: "hsl(var(--chart-1))", label: "2025-2026" },
    });
  });

  it("configures nothing when there are no academic years", () => {
    expect(buildDuesCurveConfig([])).toStrictEqual({});
  });
});

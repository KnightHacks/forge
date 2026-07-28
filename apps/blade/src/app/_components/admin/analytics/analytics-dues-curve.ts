import type { ChartConfig } from "@forge/ui/chart";

import type { AnalyticsReport } from "./analytics-report-types";

type AcademicYears = AnalyticsReport["dues"]["academicYears"];

/** Older years crowd the collection-pace chart past four lines. */
const CURVE_YEAR_LIMIT = 4;

export function duesCurveYears(academicYears: AcademicYears) {
  return academicYears.slice(0, CURVE_YEAR_LIMIT);
}

/**
 * Pivots one cumulative curve per academic year into the row-per-elapsed-day
 * shape Recharts plots, so each year becomes a series on a shared day axis.
 */
export function buildDuesCurveRows(academicYears: AcademicYears) {
  const byDay = new Map<number, Record<string, number>>();
  duesCurveYears(academicYears).forEach((year) => {
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
}

/** One themed chart series per plotted academic year, cycling the five slots. */
export function buildDuesCurveConfig(
  academicYears: AcademicYears,
): ChartConfig {
  return Object.fromEntries(
    duesCurveYears(academicYears).map((year, index) => [
      year.label,
      { color: `hsl(var(--chart-${(index % 5) + 1}))`, label: year.label },
    ]),
  );
}

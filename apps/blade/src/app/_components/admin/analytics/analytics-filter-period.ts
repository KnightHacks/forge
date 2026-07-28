import type { AnalyticsPeriod, AnalyticsReportInput } from "@forge/validators";

const ACADEMIC_YEAR_VALUE_PREFIX = "ay:";
const CUSTOM_RANGE_DEFAULT_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The `<Select>` value for a period. Academic years collapse into one option
 * per year, so they carry their start year in the value itself.
 */
export function resolvePeriodSelectValue(period: AnalyticsPeriod) {
  return period.kind === "academic_year"
    ? `${ACADEMIC_YEAR_VALUE_PREFIX}${period.startYear}`
    : period.kind;
}

/**
 * The inverse of {@link resolvePeriodSelectValue}: turns a selected option into
 * the filter patch to navigate with, or `null` for a value that maps to no
 * period.
 *
 * Each period carries its own default comparison because the comparisons are
 * not interchangeable — an academic year compares against the previous academic
 * year, a rolling window against the previous equivalent window, and all-time
 * has nothing to compare against.
 */
export function buildPeriodPatch(
  value: string,
  now = new Date(),
): Partial<AnalyticsReportInput> | null {
  if (value === "current_semester") {
    return {
      comparison: "previous_period",
      period: { kind: "current_semester" },
    };
  }
  if (value === "current_academic_year") {
    return {
      comparison: "previous_academic_year",
      period: { kind: "current_academic_year" },
    };
  }
  if (value === "all_time") {
    return { comparison: "none", period: { kind: "all_time" } };
  }
  if (value === "custom") {
    return {
      comparison: "previous_period",
      period: {
        from: new Date(now.getTime() - CUSTOM_RANGE_DEFAULT_MS),
        kind: "custom",
        to: now,
      },
    };
  }
  if (value.startsWith(ACADEMIC_YEAR_VALUE_PREFIX)) {
    return {
      comparison: "previous_academic_year",
      period: {
        kind: "academic_year",
        startYear: Number(value.slice(ACADEMIC_YEAR_VALUE_PREFIX.length)),
      },
    };
  }
  return null;
}

/**
 * `<input type="date">` values for a custom range, or empty strings for any
 * other period.
 *
 * A custom period stores `to` as an exclusive UTC boundary while the field
 * shows the inclusive final day, so the displayed value steps back one
 * millisecond. Formatting the stored boundary directly would show a range one
 * day longer than the one being reported.
 */
export function toCustomRangeInputs(period: AnalyticsPeriod) {
  if (period.kind !== "custom") return { from: "", to: "" };
  return {
    from: period.from.toISOString().slice(0, 10),
    to: new Date(period.to.getTime() - 1).toISOString().slice(0, 10),
  };
}

/** The inclusive start of the day an `<input type="date">` value names. */
export function parseCustomRangeStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * The exclusive end boundary for the day an `<input type="date">` value names,
 * so picking the same day for both fields still reports that whole day.
 */
export function parseCustomRangeEnd(value: string) {
  const exclusive = new Date(`${value}T00:00:00.000Z`);
  exclusive.setUTCDate(exclusive.getUTCDate() + 1);
  return exclusive;
}

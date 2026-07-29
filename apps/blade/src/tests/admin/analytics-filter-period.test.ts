import { describe, expect, it } from "vitest";

import { analyticsPeriodSchema } from "@forge/validators";

import {
  buildPeriodPatch,
  parseCustomRangeEnd,
  parseCustomRangeStart,
  resolvePeriodSelectValue,
  toCustomRangeInputs,
} from "~/app/_components/admin/analytics/analytics-filter-period";

describe("resolvePeriodSelectValue", () => {
  it("uses the period kind for every option that has exactly one entry", () => {
    expect(resolvePeriodSelectValue({ kind: "current_semester" })).toBe(
      "current_semester",
    );
    expect(resolvePeriodSelectValue({ kind: "all_time" })).toBe("all_time");
  });

  it("carries the start year for the per-academic-year options", () => {
    expect(
      resolvePeriodSelectValue({ kind: "academic_year", startYear: 2024 }),
    ).toBe("ay:2024");
  });
});

describe("buildPeriodPatch", () => {
  it("pairs each period with the only comparison that means anything for it", () => {
    expect(buildPeriodPatch("current_semester")).toEqual({
      comparison: "previous_period",
      period: { kind: "current_semester" },
    });
    expect(buildPeriodPatch("current_academic_year")).toEqual({
      comparison: "previous_academic_year",
      period: { kind: "current_academic_year" },
    });
    expect(buildPeriodPatch("all_time")).toEqual({
      comparison: "none",
      period: { kind: "all_time" },
    });
    expect(buildPeriodPatch("ay:2024")).toEqual({
      comparison: "previous_academic_year",
      period: { kind: "academic_year", startYear: 2024 },
    });
  });

  it("seeds a custom range with the trailing thirty days", () => {
    const now = new Date("2026-03-15T09:00:00.000Z");
    const patch = buildPeriodPatch("custom", now);

    expect(patch).toEqual({
      comparison: "previous_period",
      period: {
        from: new Date("2026-02-13T09:00:00.000Z"),
        kind: "custom",
        to: now,
      },
    });
    expect(analyticsPeriodSchema.safeParse(patch?.period).success).toBe(true);
  });

  it("returns no patch for a value that names no period", () => {
    expect(buildPeriodPatch("")).toBeNull();
    expect(buildPeriodPatch("ay")).toBeNull();
    expect(buildPeriodPatch("last_week")).toBeNull();
  });

  it("round-trips every selectable period through the option value", () => {
    for (const period of [
      { kind: "current_semester" },
      { kind: "current_academic_year" },
      { kind: "all_time" },
      { kind: "academic_year", startYear: 2025 },
    ] as const) {
      expect(
        buildPeriodPatch(resolvePeriodSelectValue(period))?.period,
      ).toEqual(period);
    }
  });
});

describe("custom range boundaries", () => {
  it("shows the inclusive final day of an exclusive stored boundary", () => {
    expect(
      toCustomRangeInputs({
        from: new Date("2026-01-01T00:00:00.000Z"),
        kind: "custom",
        to: new Date("2026-02-01T00:00:00.000Z"),
      }),
    ).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  it("has no range to show for any other period", () => {
    expect(toCustomRangeInputs({ kind: "all_time" })).toEqual({
      from: "",
      to: "",
    });
  });

  it("round-trips a stored boundary through the date field and back", () => {
    const to = new Date("2026-02-01T00:00:00.000Z");
    const shown = toCustomRangeInputs({
      from: new Date("2026-01-01T00:00:00.000Z"),
      kind: "custom",
      to,
    });

    expect(parseCustomRangeEnd(shown.to)).toEqual(to);
    expect(parseCustomRangeStart(shown.from)).toEqual(
      new Date("2026-01-01T00:00:00.000Z"),
    );
  });

  it("keeps a single-day range non-empty", () => {
    // `analyticsPeriodSchema` rejects a range whose duration is zero, so an
    // inclusive end date has to resolve to the following midnight.
    const period = {
      from: parseCustomRangeStart("2026-03-05"),
      kind: "custom",
      to: parseCustomRangeEnd("2026-03-05"),
    } as const;

    expect(period.to.getTime() - period.from.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
    expect(analyticsPeriodSchema.safeParse(period).success).toBe(true);
    expect(toCustomRangeInputs(period)).toEqual({
      from: "2026-03-05",
      to: "2026-03-05",
    });
  });

  it("crosses a month boundary without losing the last day", () => {
    expect(parseCustomRangeEnd("2026-01-31")).toEqual(
      new Date("2026-02-01T00:00:00.000Z"),
    );
    expect(parseCustomRangeEnd("2024-02-29")).toEqual(
      new Date("2024-03-01T00:00:00.000Z"),
    );
  });
});

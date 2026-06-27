import { describe, expect, it } from "vitest";

import { CLUB } from "@forge/consts";

import {
  buildDuesAcademicYear,
  formatDuesAmount,
  getDuesAcademicYear,
  getDuesPayableYear,
  isLateDuesPaymentWindow,
} from "../dues";

describe("dues academic-year helpers", () => {
  it("uses August 1 as the academic-year boundary", () => {
    expect(getDuesAcademicYear(new Date("2026-07-31T12:00:00Z"))).toEqual({
      endYear: 2026,
      label: "2025-2026 academic school year",
      shortLabel: "2025-2026",
      startYear: 2025,
    });
    expect(getDuesAcademicYear(new Date("2026-08-01T00:00:00Z"))).toEqual({
      endYear: 2027,
      label: "2026-2027 academic school year",
      shortLabel: "2026-2027",
      startYear: 2026,
    });
    expect(getDuesAcademicYear(new Date("2027-01-15T12:00:00Z"))).toEqual(
      buildDuesAcademicYear(2026),
    );
  });

  it("shows the late-year warning from May 31 through July 31", () => {
    expect(isLateDuesPaymentWindow(new Date("2026-05-30T12:00:00Z"))).toBe(
      false,
    );
    expect(isLateDuesPaymentWindow(new Date("2026-05-31T00:00:00Z"))).toBe(
      true,
    );
    expect(isLateDuesPaymentWindow(new Date("2026-07-31T23:59:59Z"))).toBe(
      true,
    );
    expect(isLateDuesPaymentWindow(new Date("2026-08-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("bumps payable year forward when the current-year dues row is stale", () => {
    expect(
      getDuesPayableYear({
        currentAcademicYearStart: 2026,
        hasStaleCurrentYearDues: false,
      }),
    ).toBe(2026);
    expect(
      getDuesPayableYear({
        currentAcademicYearStart: 2026,
        hasStaleCurrentYearDues: true,
      }),
    ).toBe(2027);
  });

  it("formats dues amounts from cents", () => {
    expect(CLUB.DUES_PAYMENT).toBe(2500);
    expect(formatDuesAmount(2500)).toBe("$25.00");
  });
});

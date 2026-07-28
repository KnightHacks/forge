import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatPercent,
  truncateChartLabel,
} from "~/app/_components/admin/analytics/analytics-formatting";

describe("analytics formatting", () => {
  describe("formatNumber", () => {
    it("renders a missing measure as an em dash rather than zero", () => {
      expect(formatNumber(null)).toBe("—");
      expect(formatNumber(0)).toBe("0");
    });

    it("groups thousands", () => {
      expect(formatNumber(1234)).toBe("1,234");
      expect(formatNumber(1234567)).toBe("1,234,567");
      expect(formatNumber(-2500)).toBe("-2,500");
    });

    it("keeps fractional averages readable", () => {
      expect(formatNumber(4.5)).toBe("4.5");
    });
  });

  describe("formatDecimal", () => {
    it("renders a missing measure as an em dash", () => {
      expect(formatDecimal(null)).toBe("—");
      expect(formatDecimal(null, 0)).toBe("—");
    });

    it("defaults to one digit and pads whole numbers", () => {
      expect(formatDecimal(4)).toBe("4.0");
      expect(formatDecimal(4.6666)).toBe("4.7");
    });

    it("honours an explicit digit count", () => {
      expect(formatDecimal(4.6666, 0)).toBe("5");
      expect(formatDecimal(4.6666, 3)).toBe("4.667");
      expect(formatDecimal(0, 0)).toBe("0");
    });
  });

  describe("formatPercent", () => {
    it("renders a missing rate as an em dash, not 0%", () => {
      expect(formatPercent(null)).toBe("—");
      expect(formatPercent(0)).toBe("0%");
    });

    it("caps at one fraction digit", () => {
      expect(formatPercent(0.4736)).toBe("47.4%");
      expect(formatPercent(0.25)).toBe("25%");
      expect(formatPercent(1)).toBe("100%");
    });

    it("keeps the sign of a negative change", () => {
      expect(formatPercent(-0.125)).toBe("-12.5%");
    });
  });

  describe("formatDate", () => {
    it("renders club-time medium dates and an em dash for nothing", () => {
      expect(formatDate(new Date("2026-07-10T12:00:00.000Z"))).toBe(
        "Jul 10, 2026",
      );
      expect(formatDate(null)).toBe("—");
    });

    it("does not shift a date-only string across a day boundary", () => {
      expect(formatDate("2026-07-10")).toBe("Jul 10, 2026");
    });
  });

  describe("formatDateTime", () => {
    it("says the timestamp was never recorded instead of showing a dash", () => {
      expect(formatDateTime(null)).toBe("Not recorded");
    });

    it("renders club-time date and time", () => {
      expect(formatDateTime(new Date("2026-07-16T16:00:00.000Z"))).toBe(
        "Jul 16, 2026, 12:00 PM",
      );
    });
  });

  describe("truncateChartLabel", () => {
    it("leaves a label that fits alone", () => {
      expect(truncateChartLabel("Social", 20)).toBe("Social");
      expect(truncateChartLabel("", 20)).toBe("");
    });

    it("leaves a label of exactly the maximum length alone", () => {
      expect(truncateChartLabel("12345678901234567890", 20)).toBe(
        "12345678901234567890",
      );
    });

    it("spends the last character on the ellipsis", () => {
      expect(truncateChartLabel("123456789012345678901", 20)).toBe(
        "1234567890123456789…",
      );
      expect(truncateChartLabel("123456789012345678901", 20)).toHaveLength(20);
      expect(truncateChartLabel("Undergraduate University", 14)).toBe(
        "Undergraduate…",
      );
    });
  });
});

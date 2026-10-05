import { describe, expect, it } from "vitest";

import { formatDuration, formatPrintTime, formatReadyAt } from "./print-jobs";

const NOW = new Date("2026-10-01T15:00:00Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("print job copy", () => {
  it("[TC-014] states the print time in plain words", () => {
    expect(formatPrintTime(60)).toBe("about 1 hour");
    expect(formatPrintTime(120)).toBe("about 2 hours");
    expect(formatPrintTime(45)).toBe("about 45 minutes");
  });

  it("[TC-012] gives a clock time and a rough duration", () => {
    expect(formatReadyAt(later(120), NOW, "America/New_York")).toBe(
      "around 1:00 PM, about 2 hr",
    );
    expect(formatReadyAt(later(25), NOW, "America/New_York")).toBe(
      "around 11:25 AM, about 25 min",
    );
    expect(formatReadyAt(later(-3), NOW, "America/New_York")).toBe(
      "any minute now",
    );
    expect(formatDuration(100)).toBe("about 1.5 hr");
  });
});

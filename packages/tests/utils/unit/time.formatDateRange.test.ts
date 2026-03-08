import { describe, expect, it } from "vitest";

import { time } from "@forge/utils";

describe("formatDateRange", () => {
  it("should format a date range in the same month", () => {
    // Use local date to avoid timezone issues
    const start = new Date(2024, 0, 1); // Jan 1, 2024
    const end = new Date(2024, 0, 15); // Jan 15, 2024
    const result = time.formatDateRange(start, end);
    expect(result).toBe("Jan 1 - Jan 15, 2024");
  });

  it("should format a date range spanning multiple months", () => {
    const start = new Date(2024, 0, 25); // Jan 25, 2024
    const end = new Date(2024, 1, 10); // Feb 10, 2024
    const result = time.formatDateRange(start, end);
    expect(result).toBe("Jan 25 - Feb 10, 2024");
  });

  it("should format a date range spanning multiple years", () => {
    const start = new Date(2023, 11, 20); // Dec 20, 2023
    const end = new Date(2024, 0, 5); // Jan 5, 2024
    const result = time.formatDateRange(start, end);
    expect(result).toBe("Dec 20 - Jan 5, 2024");
  });

  it("should format a single day range", () => {
    const start = new Date(2024, 2, 15); // Mar 15, 2024
    const end = new Date(2024, 2, 15); // Mar 15, 2024
    const result = time.formatDateRange(start, end);
    expect(result).toBe("Mar 15 - Mar 15, 2024");
  });
});

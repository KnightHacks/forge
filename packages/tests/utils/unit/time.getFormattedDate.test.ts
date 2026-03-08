import { describe, expect, it } from "vitest";

import { time } from "@forge/utils";

describe("getFormattedDate", () => {
  it("should format a date with +1 day adjustment", () => {
    // Use local date to avoid timezone issues
    const date = new Date(2023, 1, 19); // Feb 19, 2023
    const result = time.getFormattedDate(date);
    // Should be one day ahead: 2/20/2023
    expect(result).toBe("2/20/2023");
  });

  it("should format a date string input with +1 day adjustment", () => {
    // Create date at noon local time to avoid timezone shift
    const dateStr = "2023-02-19T12:00:00";
    const result = time.getFormattedDate(dateStr);
    expect(result).toBe("2/20/2023");
  });

  it("should handle year boundary correctly", () => {
    const date = new Date(2023, 11, 31); // Dec 31, 2023
    const result = time.getFormattedDate(date);
    expect(result).toBe("1/1/2024");
  });

  it("should handle month boundary correctly", () => {
    const date = new Date(2023, 0, 31); // Jan 31, 2023
    const result = time.getFormattedDate(date);
    expect(result).toBe("2/1/2023");
  });
});

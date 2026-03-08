import { describe, expect, it } from "vitest";

import { time } from "@forge/utils";

describe("formatTimeRange", () => {
  it("should format a time range correctly", () => {
    const start = new Date("2023-02-19T09:00:00");
    const end = new Date("2023-02-19T17:00:00");
    const result = time.formatTimeRange(start, end);
    expect(result).toBe("9:00am - 5:00pm");
  });

  it("should format a morning time range", () => {
    const start = new Date("2023-02-19T08:30:00");
    const end = new Date("2023-02-19T11:45:00");
    const result = time.formatTimeRange(start, end);
    expect(result).toBe("8:30am - 11:45am");
  });

  it("should format an afternoon to evening range", () => {
    const start = new Date("2023-02-19T13:15:00");
    const end = new Date("2023-02-19T20:30:00");
    const result = time.formatTimeRange(start, end);
    expect(result).toBe("1:15pm - 8:30pm");
  });

  it("should format a range spanning noon", () => {
    const start = new Date("2023-02-19T11:00:00");
    const end = new Date("2023-02-19T13:00:00");
    const result = time.formatTimeRange(start, end);
    expect(result).toBe("11:00am - 1:00pm");
  });
});

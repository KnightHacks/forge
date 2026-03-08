import { describe, expect, it } from "vitest";

import { time } from "@forge/utils";

describe("formatHourTime", () => {
  it("should format morning time correctly", () => {
    const date = new Date("2023-02-19T09:30:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("9:30am");
  });

  it("should format afternoon time correctly", () => {
    const date = new Date("2023-02-19T14:30:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("2:30pm");
  });

  it("should format noon correctly", () => {
    const date = new Date("2023-02-19T12:00:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("12:00pm");
  });

  it("should format midnight correctly", () => {
    const date = new Date("2023-02-19T00:00:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("12:00am");
  });

  it("should format time with single digit minutes", () => {
    const date = new Date("2023-02-19T10:05:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("10:05am");
  });

  it("should format 11pm correctly", () => {
    const date = new Date("2023-02-19T23:45:00");
    const result = time.formatHourTime(date);
    expect(result).toBe("11:45pm");
  });
});

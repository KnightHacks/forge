import { describe, expect, it } from "vitest";

import { time } from "@forge/utils";

describe("formatDateTime", () => {
  it("should format date-time with timezone adjustment (+1 day)", () => {
    const date = new Date("2023-02-19T14:30:00");
    const result = time.formatDateTime(date);
    // Should be Feb 20 (one day ahead) with time
    expect(result).toMatch(/Feb 20, 2023/);
    expect(result).toMatch(/2:30 PM/);
  });

  it("should format morning date-time correctly", () => {
    const date = new Date("2023-02-19T09:15:00");
    const result = time.formatDateTime(date);
    expect(result).toMatch(/Feb 20, 2023/);
    expect(result).toMatch(/9:15 AM/);
  });

  it("should format midnight date-time correctly", () => {
    const date = new Date("2023-02-19T00:00:00");
    const result = time.formatDateTime(date);
    expect(result).toMatch(/Feb 20, 2023/);
    expect(result).toMatch(/12:00 AM/);
  });
});

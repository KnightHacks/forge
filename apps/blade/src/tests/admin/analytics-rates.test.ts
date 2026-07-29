import { describe, expect, it } from "vitest";

import { formatPercent } from "~/app/_components/admin/analytics/analytics-formatting";
import { ratio } from "~/app/_components/admin/analytics/analytics-rates";

describe("ratio", () => {
  it("divides a measured population", () => {
    expect(ratio(9, 19)).toBeCloseTo(9 / 19, 10);
    expect(ratio(0, 4)).toBe(0);
  });

  it("returns null for an empty denominator instead of NaN or Infinity", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(3, 0)).toBeNull();
  });

  it("renders an unmeasurable share as an em dash", () => {
    expect(formatPercent(ratio(3, 0))).toBe("—");
    expect(formatPercent(ratio(1, 4))).toBe("25%");
  });
});

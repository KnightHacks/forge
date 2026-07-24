import { describe, expect, it } from "vitest";

import {
  getUsCity,
  hasUsCity,
  searchUsCities,
} from "../../utils/career/us-cities";

describe("U.S. Census city catalog", () => {
  it("TC-013 finds a city by name with state and stable Census key", () => {
    const results = searchUsCities("Orlando FL", 10);

    expect(results).toContainEqual(
      expect.objectContaining({
        key: "12-53000",
        name: "Orlando",
        state: "FL",
      }),
    );
  });

  it("keeps repeated city names unambiguous", () => {
    const results = searchUsCities("Kansas City", 25);

    expect(new Set(results.map((city) => city.state)).size).toBeGreaterThan(1);
    expect(results.every((city) => city.label.includes(city.state))).toBe(true);
  });

  it("bounds results and rejects unknown keys", () => {
    expect(searchUsCities("a", 7)).toHaveLength(7);
    expect(hasUsCity("12-53000")).toBe(true);
    expect(hasUsCity("99-99999")).toBe(false);
    expect(getUsCity("99-99999")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { getGlobeCity } from "../../utils/career/globe-cities";

describe("Guild globe cities", () => {
  it("resolves Census cities in every environment", () => {
    expect(getGlobeCity("12-53000")).toMatchObject({
      label: "Orlando, FL",
      latitude: 28.472818,
      longitude: -81.320242,
    });
  });

  it("keeps international preview coordinates development-only", () => {
    expect(
      getGlobeCity("99-00012", { includeDevelopmentPreview: false }),
    ).toBeNull();
    expect(
      getGlobeCity("99-00012", { includeDevelopmentPreview: true }),
    ).toMatchObject({
      label: "Tokyo, Japan",
      latitude: 35.6762,
      longitude: 139.6503,
    });
  });

  it("includes nearby Bay Area cities for semantic-zoom previews", () => {
    expect(
      getGlobeCity("99-00015", { includeDevelopmentPreview: true }),
    ).toMatchObject({
      label: "San Francisco, CA",
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });
});

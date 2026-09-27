import { describe, expect, it } from "vitest";

import { KHIX_PORTAL_CONFIG } from "./portal-config";
import { getHackerLifecycleState } from "./portal-lifecycle";

describe("KH IX Hacker SDK consumer", () => {
  it("keeps yearly navigation on the themed site", () => {
    expect(KHIX_PORTAL_CONFIG.routes.apply).toBe("/apply");
    expect(KHIX_PORTAL_CONFIG.routes.dashboard).toBe("/dashboard");
  });

  it("closes confirmation when the hackathon has started", () => {
    expect(
      getHackerLifecycleState({
        applicationDeadline: new Date("2026-09-01T00:00:00Z"),
        applicationOpen: new Date("2026-08-01T00:00:00Z"),
        confirmationCapacity: null,
        confirmationDeadline: new Date("2026-10-10T00:00:00Z"),
        confirmedCount: 0,
        now: new Date("2026-10-09T12:01:00Z"),
        startDate: new Date("2026-10-09T12:00:00Z"),
        status: "accepted",
      }),
    ).toBe("accepted-confirmation-closed");
  });
});

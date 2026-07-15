import { describe, expect, it } from "vitest";

import {
  minimumEventCreationStartInput,
  validateEventCreationStart,
} from "~/app/_components/admin/events/event-form-validation";

describe("event creation form validation", () => {
  const now = new Date("2026-07-15T16:00:00.000Z");

  it("TC-NEG-003 rejects a start less than 30 minutes ahead", () => {
    expect(
      validateEventCreationStart("2026-07-15T12:29", "-04:00", now),
    ).toMatch(/at least 30 minutes/i);
  });

  it("TC-NEG-003 accepts a start exactly 30 minutes ahead", () => {
    expect(
      validateEventCreationStart("2026-07-15T12:30", "-04:00", now),
    ).toBeNull();
  });

  it("rounds the native minimum up to a complete New York minute", () => {
    expect(
      minimumEventCreationStartInput(new Date("2026-07-15T16:00:30.000Z")),
    ).toBe("2026-07-15T12:31");
  });
});

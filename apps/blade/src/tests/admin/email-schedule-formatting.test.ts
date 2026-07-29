import { describe, expect, it } from "vitest";

import { dateTimeLocalToIso } from "~/app/_components/admin/email/email-schedule-formatting";

describe("dateTimeLocalToIso", () => {
  it("treats an empty input as 'send now'", () => {
    expect(dateTimeLocalToIso("")).toBeNull();
  });

  it("reads the input as a local wall clock and returns that instant in UTC", () => {
    const iso = dateTimeLocalToIso("2026-08-01T15:30");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Asserted through the local zone so the test holds wherever it runs.
    const instant = new Date(iso ?? "");
    expect(instant.getFullYear()).toBe(2026);
    expect(instant.getMonth()).toBe(7);
    expect(instant.getDate()).toBe(1);
    expect(instant.getHours()).toBe(15);
    expect(instant.getMinutes()).toBe(30);
  });

  it("keeps the seconds some browsers append", () => {
    const instant = new Date(dateTimeLocalToIso("2026-08-01T15:30:45") ?? "");
    expect(instant.getSeconds()).toBe(45);
  });
});

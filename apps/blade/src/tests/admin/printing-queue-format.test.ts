import { describe, expect, it } from "vitest";

import {
  deliverySummary,
  formatFileSize,
  formatPrintTime,
  formatReadyIn,
} from "~/app/_components/admin/printing/print-queue-format";

const NOW = new Date("2026-10-01T15:00:00Z");
const minutesFromNow = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60_000);

describe("printing queue formatting", () => {
  it("[TC-NEG-009] names the notice that failed", () => {
    expect(deliverySummary({ discord: "failed", email: "delivered" })).toEqual({
      description:
        "The Discord DM could not be sent. Reach the hacker directly if it matters.",
      ok: false,
    });
    expect(
      deliverySummary({ discord: "delivered", email: "delivered" }),
    ).toEqual({
      description: "The hacker was sent a Discord DM and an email.",
      ok: true,
    });
    expect(deliverySummary({ discord: "skipped", email: "delivered" })).toEqual(
      {
        description: "The hacker was sent an email.",
        ok: true,
      },
    );
  });

  it("[TC-012] rounds ready times for people, not machines", () => {
    expect(formatReadyIn(minutesFromNow(-5), NOW)).toBe("any minute now");
    expect(formatReadyIn(minutesFromNow(25), NOW)).toBe("in about 25 min");
    expect(formatReadyIn(minutesFromNow(120), NOW)).toBe("in about 2 hr");
    expect(formatReadyIn(minutesFromNow(100), NOW)).toBe("in about 1.5 hr");
    expect(formatPrintTime(minutesFromNow(40), "America/New_York")).toBe(
      "11:40 AM",
    );
  });

  it("sizes files in KB and MB", () => {
    expect(formatFileSize(200)).toBe("1 KB");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });
});

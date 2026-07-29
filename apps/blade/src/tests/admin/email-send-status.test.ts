import { describe, expect, it } from "vitest";

import {
  statusClass,
  statusLabel,
} from "~/app/_components/admin/email/email-send-status";

describe("statusLabel", () => {
  it("renders every underscore in a status as a space", () => {
    expect(statusLabel("retryable_failure")).toBe("retryable failure");
    expect(statusLabel("provider_handoff_confirmed")).toBe(
      "provider handoff confirmed",
    );
  });

  it("leaves single-word statuses alone", () => {
    expect(statusLabel("queued")).toBe("queued");
    expect(statusLabel("")).toBe("");
  });
});

describe("statusClass", () => {
  it("gives completed sends the success palette", () => {
    expect(statusClass("completed")).toBe(
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    );
  });

  it("treats running and compiling as the same in-flight state", () => {
    const inFlight = "border-blue-500/30 bg-blue-500/10 text-blue-300";
    expect(statusClass("running")).toBe(inFlight);
    expect(statusClass("compiling")).toBe(inFlight);
  });

  it("gives scheduled sends their own palette", () => {
    expect(statusClass("scheduled")).toBe(
      "border-violet-500/30 bg-violet-500/10 text-violet-300",
    );
  });

  it("matches any status containing 'failure', not just an exact one", () => {
    const destructive =
      "border-destructive/30 bg-destructive/10 text-destructive";
    expect(statusClass("retryable_failure")).toBe(destructive);
    expect(statusClass("permanent_failure")).toBe(destructive);
  });

  it("falls back to the neutral palette for anything else", () => {
    const neutral = "border-white/10 bg-background/60 text-muted-foreground";
    // `failed` deliberately does not contain "failure".
    expect(statusClass("failed")).toBe(neutral);
    expect(statusClass("draft")).toBe(neutral);
    expect(statusClass("queued")).toBe(neutral);
    expect(statusClass("")).toBe(neutral);
  });
});

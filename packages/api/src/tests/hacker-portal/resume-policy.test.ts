import { describe, expect, it } from "vitest";

import {
  canEditResumeAt,
  isStaleResumeUploadCommand,
  resumeUploadPayloadHash,
} from "../../hacker-portal/resume-policy";

describe("hacker resume policy", () => {
  it("locks exactly at the database event-start boundary", () => {
    const startDate = new Date("2026-10-02T16:00:00Z");
    expect(
      canEditResumeAt({
        now: new Date("2026-10-02T15:59:59.999Z"),
        startDate,
        status: "confirmed",
      }),
    ).toBe(true);
    expect(
      canEditResumeAt({ now: startDate, startDate, status: "confirmed" }),
    ).toBe(false);
    expect(
      canEditResumeAt({
        now: new Date("2026-10-01T16:00:00Z"),
        startDate,
        status: "checkedin",
      }),
    ).toBe(true);
  });

  it("binds upload idempotency to bytes and safe metadata", () => {
    const first = {
      bytes: new TextEncoder().encode("%PDF-1.7 first"),
      contentType: "application/pdf",
      fileName: "resume.pdf",
    };
    expect(resumeUploadPayloadHash(first)).toBe(resumeUploadPayloadHash(first));
    expect(resumeUploadPayloadHash(first)).not.toBe(
      resumeUploadPayloadHash({
        ...first,
        bytes: new TextEncoder().encode("%PDF-1.7 second"),
      }),
    );
  });

  it("recovers only stale upload commands", () => {
    const now = new Date("2026-08-06T20:00:00Z");
    expect(
      isStaleResumeUploadCommand(new Date("2026-08-06T19:50:00Z"), now),
    ).toBe(true);
    expect(
      isStaleResumeUploadCommand(new Date("2026-08-06T19:50:00.001Z"), now),
    ).toBe(false);
  });
});

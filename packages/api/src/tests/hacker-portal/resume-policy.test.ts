import { describe, expect, it } from "vitest";

import {
  canEditResumeAt,
  isStaleResumeUploadCommand,
  resumeUploadPayloadHash,
} from "../../hacker-portal/resume-policy";

describe("hacker resume policy", () => {
  it("allows changes during the event and locks exactly at its end", () => {
    const endDate = new Date("2026-10-04T16:00:00Z");
    expect(
      canEditResumeAt({
        now: new Date("2026-10-04T15:59:59.999Z"),
        endDate,
        status: "confirmed",
      }),
    ).toBe(true);
    expect(
      canEditResumeAt({ now: endDate, endDate, status: "confirmed" }),
    ).toBe(false);
    expect(
      canEditResumeAt({
        now: new Date("2026-10-03T16:00:00Z"),
        endDate,
        status: "checkedin",
      }),
    ).toBe(true);
  });

  it.each([null, "denied", "withdrawn", "unknown"])(
    "keeps an ineligible application (%s) locked during the event",
    (status) => {
      expect(
        canEditResumeAt({
          now: new Date("2026-10-03T16:00:00Z"),
          endDate: new Date("2026-10-04T16:00:00Z"),
          status,
        }),
      ).toBe(false);
    },
  );

  it("rejects changes after the event and with an invalid deadline", () => {
    for (const endDate of [
      new Date("2026-10-04T16:00:00Z"),
      new Date("invalid"),
    ]) {
      expect(
        canEditResumeAt({
          now: new Date("2026-10-04T16:00:00.001Z"),
          endDate,
          status: "checkedin",
        }),
      ).toBe(false);
    }
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
